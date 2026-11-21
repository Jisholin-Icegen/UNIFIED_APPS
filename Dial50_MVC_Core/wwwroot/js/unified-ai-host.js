(function () {
    const frameLayer = document.getElementById("unifiedAiModuleLayer");
    const frame = document.getElementById("unifiedAiModuleFrame");
    const floatingBar = document.getElementById("unifiedAiFloatingBar");
    const returnButton = document.getElementById("unifiedAiReturnButton");
    const barMicButton = document.getElementById("unifiedAiBarMicButton");
    const barChatButton = document.getElementById("unifiedAiBarChatButton");
    const barEndButton = document.getElementById("unifiedAiBarEndButton");
    const testPanel = document.getElementById("unifiedAiTestPanel");
    const callLayer = document.getElementById("callLayer");
    if (!frameLayer || !frame) return;

    const pageParams = new URLSearchParams(window.location.search);
    const isLocalTestMode = pageParams.get("UnifiedAITest") === "1"
        && ["localhost", "127.0.0.1", "::1", "[::1]"].includes(window.location.hostname);

    const routes = {
        room_comfort: "/RoomComfort/Index",
        logistics: "/Logisitics/Index",
        video_request: "/MyDailyCare/Index",
        my_daily_care: "/MyDailyCare/Index",
        medications: "/Medication/Index",
        appointments: "/Appointments/Index",
        my_library: "/MyLibrary/Index",
        discharge: "/Discharge/Index",
        food_explore: "/FoodDining/FoodDining",
        food_other_services: "/FoodDining/OtherServices",
        food_order: "/FoodDining/FoodOrdering",
        feedback: "/OverAllFeedback/Index"
    };

    let frameReady = false;
    let pendingActions = [];
    let activeTarget = null;
    let latestFrameContext = null;
    let lastSentContext = "";
    let lastContextSentAt = 0;
    let contextRetryTimer = null;
    let lastContextRoute = "";
    const CONTEXT_MIN_GAP_MS = 2500;   // never send app_context more often than this
    let simulatedSession = false;
    let voiceNavSession = false;
    let screenWakeLock = null;
    let wakeLockRequestPending = false;
    let suppressReturnClickUntil = 0;
    let dragState = null;
    let callPresentation = "full";
    const originalCallLayerDisplay = callLayer ? callLayer.style.getPropertyValue("display") : "";
    const originalCallLayerDisplayPriority = callLayer ? callLayer.style.getPropertyPriority("display") : "";

    function isCallActive() {
        const state = document.body.getAttribute("data-state");
        return simulatedSession || voiceNavSession || state === "connecting" || state === "connected";
    }

    function isRealCallActive() {
        const state = document.body.getAttribute("data-state");
        return state === "connecting" || state === "connected";
    }

    function setCallPresentation(presentation) {
        if (presentation !== "full" && presentation !== "minimized") return;
        if (presentation === "minimized" && !isRealCallActive()) return;

        callPresentation = presentation;
        if (presentation === "minimized") {
            document.body.setAttribute("data-call-presentation", "minimized");
            if (callLayer) callLayer.style.setProperty("display", "none", "important");
        } else {
            document.body.removeAttribute("data-call-presentation");
            if (callLayer) {
                if (originalCallLayerDisplay) {
                    callLayer.style.setProperty("display", originalCallLayerDisplay, originalCallLayerDisplayPriority);
                } else {
                    callLayer.style.removeProperty("display");
                }
            }
        }
    }

    function minimizeCall() {
        if (!isRealCallActive()) return false;
        setCallPresentation("minimized");
        updateFloatingBar();
        return true;
    }

    function currentPageContext() {
        return frameLayer.classList.contains("is-open") ? latestFrameContext : homePageContext();
    }

    function notifyTestContextChanged() {
        if (isLocalTestMode) {
            window.dispatchEvent(new CustomEvent("unified-ai:test-context-changed"));
        }
    }

    function homePageContext() {
        const bedContext = window.BedContext && window.BedContext.get ? window.BedContext.get() : {};
        const text = function (element) {
            let value = String(typeof element === "string" ? element : element && (
                element.getAttribute("aria-label") || element.getAttribute("title")
                || element.value || element.innerText || element.textContent) || "")
                .replace(/\s+/g, " ").trim();
            ["bedInfo", "bedId", "patientName", "roomNumber", "roomBed", "bedNumber", "uhid", "userId", "ward"]
                .map(function (key) { return String(bedContext[key] || "").trim(); })
                .filter(function (identifier) { return identifier.length >= 3; })
                .forEach(function (identifier) {
                    const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                    value = value.replace(new RegExp(escaped, "ig"), "[redacted]");
                });
            return value.slice(0, 180);
        };
        const isVisible = function (element) {
            if (element.closest("[hidden], [aria-hidden='true'], #unifiedAiFloatingBar, #unifiedAiTestPanel, #unifiedAiTestLauncher, #callLayer")) return false;
            const style = window.getComputedStyle(element);
            if (style.display === "none" || style.visibility === "hidden" || !element.getClientRects().length) return false;
            for (let ancestor = element; ancestor && ancestor !== document.documentElement; ancestor = ancestor.parentElement) {
                const rect = ancestor.getBoundingClientRect();
                if (rect.width && (rect.right <= 0 || rect.left >= window.innerWidth)) return false;
            }
            return true;
        };
        const actionElements = Array.from(document.querySelectorAll(
            "button, a[href], [role='button'], [role='tab'], summary, input[type='button'], input[type='submit'], input[type='reset'], [onclick], [data-action], [data-route], .navBtn, .service-card, .food-card, .order-card, .selection-card, .timing-card"
        ))
            .filter(isVisible)
            .slice(0, 180);
        const actions = actionElements
            .map(function (element, index) {
                let label = text(element);
                const parent = element.closest(".card, .service-card, .food-card, .order-card, .selection-card, .timing-card");
                const parentName = parent && parent.querySelector("h3, h4, .service-title, .food-title");
                const name = parentName && text(parentName);
                if (name && label.length < 20 && !label.toLowerCase().includes(name.toLowerCase())) label += " " + name;
                if (!label) {
                    const image = element.querySelector("img[alt]");
                    label = image ? text(image) : "";
                }
                if (!label) return null;

                const targetId = "home-action-" + index;
                if (element.getAttribute("data-unified-ai-target") !== targetId) {
                    element.setAttribute("data-unified-ai-target", targetId);
                }
                const action = {
                    label: label,
                    disabled: !!element.disabled || element.getAttribute("aria-disabled") === "true",
                    targetId: targetId
                };
                const routeValue = element.getAttribute("href") || element.getAttribute("data-route")
                    || (element.dataset && element.dataset.page ? "/" + element.dataset.page : "");
                if (routeValue && routeValue.trim() !== "#") {
                    try {
                        const url = new URL(routeValue, window.location.href);
                        if (url.origin === window.location.origin) {
                            ["BedInfo", "Unified", "UnifiedAI", "token", "patient", "user", "email", "uhid"]
                                .forEach(function (name) { url.searchParams.delete(name); });
                            action.route = text(url.pathname + url.search);
                        }
                    } catch (error) { }
                }
                return action;
            })
            .filter(Boolean);
        const fields = Array.from(document.querySelectorAll(
            "input:not([type='hidden']):not([type='password']):not([type='button']):not([type='submit']):not([type='reset']):not([type='checkbox']):not([type='radio']):not([type='file']), textarea, [contenteditable='true']"
        ))
            .filter(function (element) {
                const identity = [element.id, element.name, element.getAttribute("aria-label"), element.getAttribute("placeholder")].join(" ");
                return isVisible(element)
                    && !/bed|patient|room|uhid|user|token|password|doctor|physician|provider|name|email|phone|mobile|address|birth|age/i.test(identity)
                    && !element.closest(".patient-info, .patient-details, [data-patient-info]");
            })
            .slice(0, 50)
            .map(function (field, index) {
                const labels = Array.from(field.labels || []).map(function (label) { return label.textContent; });
                const targetId = "home-field-" + index;
                if (field.getAttribute("data-unified-ai-field") !== targetId) {
                    field.setAttribute("data-unified-ai-field", targetId);
                }
                return {
                    targetId: targetId,
                    label: text(field.getAttribute("aria-label") || labels.join(" ")
                        || field.getAttribute("placeholder") || field.name || field.id || "Text field"),
                    placeholder: text(field.getAttribute("placeholder") || "")
                };
            });
        return {
            route: "/Home/Index",
            title: document.title,
            headings: Array.from(document.querySelectorAll("#pageContent h1, #pageContent h2, #pageContent h3"))
                .map(text).filter(Boolean).slice(0, 20),
            controls: Array.from(document.querySelectorAll("select"))
                .filter(isVisible)
                .filter(function (select) {
                    return !/bed|patient|room|uhid|user|token|password|doctor|physician|provider/i.test(
                        [select.id, select.name, select.getAttribute("aria-label")].join(" ")
                    );
                })
                .slice(0, 20)
                .map(function (select) {
                    const labels = Array.from(select.labels || []).map(function (label) { return label.textContent; });
                    return {
                        id: select.id || "",
                        label: text(select.getAttribute("aria-label") || labels.join(" ") || select.name || select.id),
                        selected: select.options[select.selectedIndex]
                            ? { value: text(select.value), label: text(select.options[select.selectedIndex].textContent) }
                            : null,
                        options: Array.from(select.options).slice(0, 60).map(function (option) {
                            return { value: text(option.value), label: text(option.textContent), disabled: option.disabled };
                        })
                    };
                }),
            fields: fields,
            items: Array.from(document.querySelectorAll("#pageContent .card, #pageContent [data-route], #pageContent [data-page]"))
                .filter(isVisible)
                .slice(0, 100)
                .map(function (item) {
                    const name = text(item.querySelector("h1, h2, h3, h4, .card-title") || item);
                    const route = item.getAttribute("data-route")
                        || (item.dataset && item.dataset.page ? "/" + item.dataset.page : "");
                    const result = { name: name, label: name, disabled: !!item.disabled };
                    if (route) {
                        try {
                            const url = new URL(route, window.location.href);
                            if (url.origin === window.location.origin) result.route = text(url.pathname);
                        } catch (error) { }
                    }
                    return result;
                })
                .filter(function (item) { return item.label; }),
            actions: actions
        };
    }

    function sendCurrentPageContext() {
        if (simulatedSession || document.body.getAttribute("data-state") !== "connected"
            || typeof window.sendVoiceAgentMessage !== "function") return;
        const context = frameLayer.classList.contains("is-open") ? latestFrameContext : homePageContext();
        if (frameLayer.classList.contains("is-open") && context && frame.contentWindow) {
            try {
                if (context.route !== frame.contentWindow.location.pathname) return;
            } catch (error) {
                return;
            }
        }
        if (!context) return;
        const signature = JSON.stringify(context);
        if (signature === lastSentContext) return;
        // Rate limit: the clock, call countdown, badges etc. change the DOM constantly.
        // Send the LATEST context once the gap has passed instead of one message per change.
        // A NEW page must reach the AI at once; only repeat updates of the same page are rate limited.
        const routeChanged = String(context.route || "") !== lastContextRoute;
        const wait = routeChanged ? 0 : CONTEXT_MIN_GAP_MS - (Date.now() - lastContextSentAt);
        if (wait > 0) {
            if (!contextRetryTimer) {
                contextRetryTimer = setTimeout(function () {
                    contextRetryTimer = null;
                    sendCurrentPageContext();
                }, wait);
            }
            return;
        }
        if (window.sendVoiceAgentMessage({ type: "app_context", context: context })) {
            lastSentContext = signature;
            lastContextSentAt = Date.now();
            lastContextRoute = String(context.route || "");
        }
    }

    async function acquireScreenWakeLock() {
        if (!navigator.wakeLock || document.visibilityState !== "visible"
            || wakeLockRequestPending || screenWakeLock && !screenWakeLock.released) return;
        wakeLockRequestPending = true;
        try {
            screenWakeLock = await navigator.wakeLock.request("screen");
            screenWakeLock.addEventListener("release", function () {
                screenWakeLock = null;
            }, { once: true });
        } catch (error) {
            console.info("Screen wake lock is unavailable:", error && error.message ? error.message : error);
        } finally {
            wakeLockRequestPending = false;
        }
    }

    function syncScreenWakeLock(active) {
        if (active) {
            acquireScreenWakeLock();
            return;
        }
        const lock = screenWakeLock;
        screenWakeLock = null;
        if (lock && !lock.released) lock.release().catch(function (error) {
            console.info("Could not release screen wake lock:", error && error.message ? error.message : error);
        });
    }

    function updateFloatingBar() {
        const state = document.body.getAttribute("data-state");
        const realCall = state === "connecting" || state === "connected";
        const activeCall = simulatedSession || voiceNavSession || realCall;
        syncScreenWakeLock(realCall);
        if (!activeCall) lastSentContext = "";
        if (floatingBar) {
            floatingBar.hidden = !activeCall || realCall && callPresentation !== "minimized";
            const callStatus = document.getElementById("callStatus");
            const micButton = document.getElementById("micBtn");
            const statusText = document.getElementById("unifiedAiBarStatus");
            if (statusText) {
                statusText.textContent = simulatedSession
                    ? "Test simulation"
                    : voiceNavSession
                    ? "Voice navigation"
                    : callStatus && callStatus.textContent.trim()
                    || (state === "connecting" ? "Connecting..." : "Listening...");
            }
            if (barMicButton) {
                const muted = !!(micButton && micButton.classList.contains("muted"));
                barMicButton.classList.toggle("is-muted", muted);
                barMicButton.innerHTML = muted
                    ? '<i class="fa-solid fa-microphone-slash" aria-hidden="true"></i>'
                    : '<i class="fa-solid fa-microphone" aria-hidden="true"></i>';
                barMicButton.setAttribute("aria-label", muted ? "Unmute microphone" : "Mute microphone");
                barMicButton.disabled = simulatedSession || voiceNavSession || state !== "connected";
            }
        }
        if (state === "connected" && !simulatedSession) sendCurrentPageContext();
    }

    function showChat() {
        frameLayer.classList.remove("is-open");
        frameLayer.setAttribute("aria-hidden", "true");
        setCallPresentation("full");
        updateFloatingBar();
    }

    function showHomePreservingCall() {
        frameLayer.classList.remove("is-open");
        frameLayer.setAttribute("aria-hidden", "true");
        setCallPresentation(isRealCallActive() ? "minimized" : "full");
        updateFloatingBar();
    }

    function reportResult(action, success, result, error) {
        if (!action || !action.request_id) return;
        const response = {
            request_id: action.request_id,
            success: !!success,
            result: result || null,
            error: error || null
        };
        window.dispatchEvent(new CustomEvent("unified-ai:action-result", { detail: response }));
        if (simulatedSession || document.body.getAttribute("data-state") !== "connected"
            || typeof window.sendVoiceAgentMessage !== "function") return;

        window.sendVoiceAgentMessage(Object.assign({ type: "app_action_result" }, response));
    }

    function loadFrameUrl(targetUrl, target, action) {
        latestFrameContext = null;
        lastSentContext = "";
        activeTarget = target;
        frameLayer.classList.add("is-open");
        frameLayer.setAttribute("aria-hidden", "false");
        if (isRealCallActive()) setCallPresentation("minimized");

        pendingActions.forEach(function (pendingAction) {
            reportResult(pendingAction, false, null, "The module changed before this action could run.");
        });
        pendingActions = [];

        if (action && action.action !== "navigate") pendingActions.push(action);

        frameReady = false;
        updateFloatingBar();
        if (simulatedSession && testPanel) testPanel.hidden = false;
        frame.src = targetUrl.toString();
        notifyTestContextChanged();
        return true;
    }

    function openModule(target, action) {
        const route = routes[target];
        if (!route) {
            reportResult(action, false, null, "Unsupported module.");
            return false;
        }

        const targetUrl = new URL(route, window.location.origin);
        const bedContext = window.BedContext && window.BedContext.get
            ? window.BedContext.get()
            : {};
        const bedInfo = bedContext.bedInfo || new URLSearchParams(window.location.search).get("BedInfo");
        if (bedInfo) targetUrl.searchParams.set("BedInfo", bedInfo);
        const tenantId = bedContext.tenantId || pageParams.get("XTenantID") || sessionStorage.getItem("XTenantID");
        const region = bedContext.region || pageParams.get("region") || sessionStorage.getItem("region");
        if (tenantId) targetUrl.searchParams.set("XTenantID", tenantId);
        if (region) targetUrl.searchParams.set("region", region);
        targetUrl.searchParams.set("Unified", "1");
        targetUrl.searchParams.set("UnifiedAI", "1");

        return loadFrameUrl(targetUrl, target, action);
    }

    function openAppPage(page, extra) {
        const url = new URL(window.BedContext.url(page, extra), window.location.origin);
        if (!normalizeAppOrigin(url)) return false;
        if (/^\/(?:home(?:\/index)?|ai\/chat)\/?$/i.test(url.pathname)) {
            showHomePreservingCall();
            return true;
        }
        if (/^\/FoodDining(?:\/Index)?\/?$/i.test(url.pathname)) {
            url.pathname = "/FoodDining/FoodDining";
        }
        const bedContext = window.BedContext.get ? window.BedContext.get() : {};
        const bedInfo = bedContext.bedInfo || pageParams.get("BedInfo");
        if (bedInfo) url.searchParams.set("BedInfo", bedInfo);
        const tenantId = bedContext.tenantId || pageParams.get("XTenantID") || sessionStorage.getItem("XTenantID");
        const region = bedContext.region || pageParams.get("region") || sessionStorage.getItem("region");
        if (tenantId) url.searchParams.set("XTenantID", tenantId);
        if (region) url.searchParams.set("region", region);
        url.searchParams.set("Unified", "1");
        url.searchParams.set("UnifiedAI", "1");
        return loadFrameUrl(url, routeTargetForPath(url.pathname), null);
    }

    function openAppUrl(value) {
        const path = String(value || "").trim();
        if (!path) return null;
        let targetUrl;
        try {
            targetUrl = new URL(path, window.location.origin);
        } catch (error) {
            return null;
        }
        if (!normalizeAppOrigin(targetUrl) || !targetUrl.pathname.startsWith("/")) return null;
        if (/^\/FoodDining(?:\/Index)?\/?$/i.test(targetUrl.pathname)) {
            targetUrl.pathname = "/FoodDining/FoodDining";
        }
        if (/\/(?:home(?:\/index)?|ai\/chat)\/?$/i.test(targetUrl.pathname)) {
            showHomePreservingCall();
            return { target: "home" };
        }

        const bedContext = window.BedContext && window.BedContext.get ? window.BedContext.get() : {};
        const bedInfo = bedContext.bedInfo || pageParams.get("BedInfo");
        targetUrl.searchParams.delete("BedInfo");
        if (bedInfo) targetUrl.searchParams.set("BedInfo", bedInfo);
        const tenantId = bedContext.tenantId || pageParams.get("XTenantID") || sessionStorage.getItem("XTenantID");
        const region = bedContext.region || pageParams.get("region") || sessionStorage.getItem("region");
        if (tenantId) targetUrl.searchParams.set("XTenantID", tenantId);
        if (region) targetUrl.searchParams.set("region", region);
        targetUrl.searchParams.set("Unified", "1");
        targetUrl.searchParams.set("UnifiedAI", "1");
        loadFrameUrl(targetUrl, routeTargetForPath(targetUrl.pathname), null);
        return { path: targetUrl.pathname };
    }

    function routeTargetForPath(path) {
        const normalized = String(path || "").replace(/^\/+|\/+$/g, "").toLowerCase();
        const routeTargets = {
            "roomcomfort": "room_comfort",
            "roomcomfort/index": "room_comfort",
            "logisitics": "logistics",
            "logisitics/index": "logistics",
            "mydailycare": "video_request",
            "mydailycare/index": "video_request",
            "medication": "medications",
            "medication/index": "medications",
            "appointments": "appointments",
            "appointments/index": "appointments",
            "mylibrary": "my_library",
            "mylibrary/index": "my_library",
            "discharge": "discharge",
            "discharge/index": "discharge",
            "fooddining": "food_explore",
            "fooddining/fooddining": "food_explore",
            "fooddining/otherservices": "food_other_services",
            "fooddining/foodordering": "food_order",
            "fooddining/patientordermode": "food_order",
            "fooddining/menuitems": "food_order",
            "fooddining/revieworder": "food_order",
            "fooddining/myorders": "food_order",
            "overallfeedback": "feedback",
            "overallfeedback/index": "feedback"
        };
        return routeTargets[normalized] || ("page:" + normalized);
    }

    function normalizeAppOrigin(url) {
        if (url.protocol !== window.location.protocol || url.hostname !== window.location.hostname) return false;
        if (url.port !== window.location.port) url.port = window.location.port;
        return url.origin === window.location.origin;
    }

    function dispatchToModule(target, action) {
        if (frameLayer.classList.contains("is-open") && activeTarget === target) {
            sendActionToFrame(action);
        } else {
            openModule(target, action);
        }
    }

    function findUiTarget(attribute, targetId) {
        return Array.from(document.querySelectorAll("[" + attribute + "]")).find(function (element) {
            if (element.getAttribute(attribute) !== targetId || element.closest("#unifiedAiModuleLayer")) return false;
            const style = window.getComputedStyle(element);
            return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
        });
    }

    function executeHostUIAction(action) {
        if (action.action === "ui.click") {
            const target = findUiTarget("data-unified-ai-target", action.targetId);
            if (!target || target.disabled || target.getAttribute("aria-disabled") === "true") {
                reportResult(action, false, null, "The selected visible action is no longer available.");
                return;
            }
            target.scrollIntoView({ behavior: "smooth", block: "center" });
            target.click();
            reportResult(action, true, { clicked: target.getAttribute("aria-label") || target.innerText || target.textContent });
            return;
        }

        if (action.action === "ui.fill") {
            const target = findUiTarget("data-unified-ai-field", action.targetId);
            if (!target || target.disabled || target.readOnly) {
                reportResult(action, false, null, "The selected visible field is no longer available.");
                return;
            }
            const value = String(action.value == null ? "" : action.value).slice(0, 2000);
            target.scrollIntoView({ behavior: "smooth", block: "center" });
            target.focus({ preventScroll: true });
            if (target.isContentEditable) target.textContent = value;
            else target.value = value;
            target.dispatchEvent(new Event("input", { bubbles: true }));
            target.dispatchEvent(new Event("change", { bubbles: true }));
            reportResult(action, true, { filled: action.label || target.getAttribute("aria-label") || target.name || target.id });
        }
    }

    function executeHostChoiceAction(action) {
        const target = findUiTarget("data-unified-ai-choice", action.targetId);
        const input = target instanceof HTMLInputElement ? target : target && target.control;
        if (!target || target.disabled || target.getAttribute("aria-disabled") === "true") {
            reportResult(action, false, null, "The selected visible choice is no longer available.");
            return;
        }
        if (!(input instanceof HTMLInputElement)) {
            reportResult(action, false, null, "The selected choice is not a supported checkbox or radio control.");
            return;
        }
        if (typeof action.checked !== "boolean" && action.checked !== "true" && action.checked !== "false") {
            reportResult(action, false, null, "A checked state is required for this choice.");
            return;
        }
        const requested = action.checked === true || action.checked === "true";
        if (input.type === "radio" && !requested) {
            reportResult(action, false, null, "A radio choice can only be selected, not cleared.");
            return;
        }
        if (input.checked !== requested) target.click();
        if (input.checked !== requested) {
            reportResult(action, false, null, "The page did not accept the requested choice.");
            return;
        }
        reportResult(action, true, { name: input.name || "", value: input.value || "", checked: input.checked });
    }

    function selectHostOption(action) {
        const key = String(action.controlId || action.control || action.controlName || "").trim().toLowerCase();
        const requested = String(action.optionValue !== undefined ? action.optionValue
            : action.option !== undefined ? action.option : action.value == null ? "" : action.value).trim().toLowerCase();
        if (!key || !requested) {
            reportResult(action, false, null, "A visible dropdown and option are required.");
            return;
        }
        const matches = Array.from(document.querySelectorAll("select")).filter(function (select) {
            const style = window.getComputedStyle(select);
            if (style.display === "none" || style.visibility === "hidden" || !select.getClientRects().length
                || /bed|patient|room|uhid|user|token|password|doctor|physician|provider/i.test(
                    [select.id, select.name, select.getAttribute("aria-label")].join(" ")
                )) return false;
            const labels = Array.from(select.labels || []).map(function (label) { return label.textContent; });
            return [select.id, select.name, select.getAttribute("aria-label")].concat(labels)
                .some(function (label) { return String(label || "").trim().toLowerCase() === key; });
        });
        if (matches.length !== 1) {
            reportResult(action, false, null, matches.length ? "Dropdown name is ambiguous." : "Visible dropdown was not found.");
            return;
        }
        const select = matches[0];
        const options = Array.from(select.options).filter(function (option) {
            return !option.disabled && (String(option.value).trim().toLowerCase() === requested
                || String(option.textContent).trim().toLowerCase() === requested);
        });
        if (options.length !== 1) {
            reportResult(action, false, { options: Array.from(select.options).filter(function (option) {
                return !option.disabled;
            }).map(function (option) { return { value: option.value, label: option.textContent.trim() }; }) },
                options.length ? "Dropdown option is ambiguous." : "Dropdown option was not found.");
            return;
        }
        select.value = options[0].value;
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
        reportResult(action, true, { controlId: select.id || select.name, selected: options[0].textContent.trim() });
    }

    function sendActionToFrame(action) {
        if (!frame.contentWindow || !frameReady) {
            pendingActions.push(action);
            // never leave the AI waiting forever for a page that did not finish loading
            setTimeout(function () {
                const index = pendingActions.indexOf(action);
                if (index === -1) return;
                pendingActions.splice(index, 1);
                reportResult(action, false, null, "The page did not finish loading in time.");
            }, 10000);
            return;
        }

        frame.contentWindow.postMessage({
            type: "unified_ai_action",
            action: action
        }, window.location.origin);
    }

    function handleAction(action) {
        if (!action || typeof action !== "object" || typeof action.action !== "string") return;

        if (action.action === "video.play" || action.action === "video.stop") {
            dispatchToModule("video_request", action);
            return;
        }

        if (action.action === "food.intent") {
            const target = action.intent === "explore"
                ? "food_explore"
                : action.intent === "order"
                    ? "food_order"
                    : null;
            if (!target) {
                reportResult(action, false, null, "Food intent must be 'explore' or 'order'.");
                return;
            }
            const opened = openModule(target);
            if (opened) reportResult(action, true, { target: target });
            return;
        }

        if (action.action === "navigate") {
            let opened = false;
            if (routes[action.target]) {
                opened = openModule(action.target);
            } else {
                const destination = action.path || action.url || action.target;
                const result = openAppUrl(destination);
                if (result) {
                    opened = true;
                    reportResult(action, true, result);
                } else {
                    reportResult(action, false, null, "The requested page is not a valid same-site route.");
                }
            }
            if (opened && routes[action.target]) reportResult(action, true, { target: action.target });
            return;
        }

        if (action.action === "ui.select") {
            if (!frameLayer.classList.contains("is-open")) {
                selectHostOption(action);
                return;
            }
            sendActionToFrame(action);
            return;
        }

        if (action.action === "ui.click" || action.action === "ui.fill" || action.action === "ui.set_choice") {
            if (frameLayer.classList.contains("is-open")) sendActionToFrame(action);
            else if (action.action === "ui.set_choice") executeHostChoiceAction(action);
            else executeHostUIAction(action);
            return;
        }

        if (action.action === "request.options" || action.action === "request.create") {
            const requestTargets = {
                room_comfort: "room_comfort",
                logistics: "logistics",
                food_other_services: "food_other_services"
            };
            const target = requestTargets[action.module];
            if (!target) {
                reportResult(action, false, null, "Request module is not supported on this page.");
                return;
            }
            dispatchToModule(target, action);
            return;
        }

        if (action.action.indexOf("notification.") === 0) {
            if (frameLayer.classList.contains("is-open")) {
                sendActionToFrame(action);
            } else if (window.UnifiedNotifications && window.UnifiedNotifications.handleAction) {
                window.UnifiedNotifications.handleAction(action, function (success, result, error) {
                    reportResult(action, success, result, error);
                });
            } else {
                reportResult(action, false, null, "The notification service is not available on this page.");
            }
            return;
        }

        if (action.action === "feedback.start") {
            dispatchToModule("feedback", action);
            return;
        }

        if (action.action.indexOf("feedback.") === 0) {
            dispatchToModule("feedback", action);
            return;
        }

        if (action.action.indexOf("food.") === 0) {
            const currentRoute = String(latestFrameContext && latestFrameContext.route || "");
            const foodActionRoutes = {
                "food.other_service": "/FoodDining/OtherServices",
                "food.select_order_type": "/FoodDining/FoodOrdering",
                "food.select_mode": "/FoodDining/PatientOrderMode",
                "food.select_meal": "/FoodDining/MenuItems",
                "food.select_vendor": "/FoodDining/MenuItems",
                "food.select_diet": "/FoodDining/MenuItems",
                "food.select_language": "/FoodDining/MenuItems",
                "food.list_menu": "/FoodDining/MenuItems",
                "food.add_item": "/FoodDining/MenuItems",
                "food.set_quantity": "/FoodDining/MenuItems",
                "food.remove_item": "/FoodDining/MenuItems",
                "food.review_order": "/FoodDining/MenuItems",
                "food.submit_order": "/FoodDining/MenuItems"
            };
            const targetPath = action.action === "food.submit_order" && /\/FoodDining\/ReviewOrder\/?$/i.test(currentRoute)
                ? "/FoodDining/ReviewOrder"
                : foodActionRoutes[action.action];
            if (!targetPath) {
                reportResult(action, false, null, "Unsupported food action.");
                return;
            }
            if (frameLayer.classList.contains("is-open")
                && currentRoute.toLowerCase() === targetPath.toLowerCase()) {
                sendActionToFrame(action);
            } else {
                const targetUrl = new URL(targetPath, window.location.origin);
                const bedContext = window.BedContext && window.BedContext.get ? window.BedContext.get() : {};
                const bedInfo = bedContext.bedInfo || pageParams.get("BedInfo");
                const tenantId = bedContext.tenantId || pageParams.get("XTenantID") || sessionStorage.getItem("XTenantID");
                const region = bedContext.region || pageParams.get("region") || sessionStorage.getItem("region");
                if (bedInfo) targetUrl.searchParams.set("BedInfo", bedInfo);
                if (tenantId) targetUrl.searchParams.set("XTenantID", tenantId);
                if (region) targetUrl.searchParams.set("region", region);
                targetUrl.searchParams.set("Unified", "1");
                targetUrl.searchParams.set("UnifiedAI", "1");
                loadFrameUrl(targetUrl, routeTargetForPath(targetPath), action);
            }
            return;
        }

        reportResult(action, false, null, "Unsupported app action.");
    }

    frame.addEventListener("load", function () {
        frameReady = true;
        while (pendingActions.length) {
            frame.contentWindow.postMessage({
                type: "unified_ai_action",
                action: pendingActions.shift()
            }, window.location.origin);
        }
        updateFloatingBar();
        notifyTestContextChanged();
    });

    window.addEventListener("voice-agent:app-action", function (event) {
        handleAction(event.detail);
    });
    window.addEventListener("voice-agent:connection-state", function (event) {
        const detail = event.detail || {};
        if (!detail.connected) { lastSentContext = ""; lastContextRoute = ""; }
        updateFloatingBar();
        if (detail.connected) sendCurrentPageContext();
    });

    window.addEventListener("message", function (event) {
        if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
        if (!event.data || typeof event.data !== "object") return;

        if (event.data.type === "unified_ai_action_result") {
            reportResult(event.data, event.data.success, event.data.result, event.data.error);
        } else if (event.data.type === "unified_ai_page_context") {
            latestFrameContext = event.data.context;
            if (latestFrameContext && latestFrameContext.route) {
                activeTarget = routeTargetForPath(latestFrameContext.route);
            }
            sendCurrentPageContext();
            notifyTestContextChanged();
        } else if (event.data.type === "unified_ai_show_chat") {
            showChat();
        } else if (event.data.type === "unified_ai_show_home") {
            showHomePreservingCall();
        }
    });

    if (barEndButton) {
        barEndButton.addEventListener("click", function () {
            if (simulatedSession) {
                simulatedSession = false;
                updateFloatingBar();
                notifyTestContextChanged();
                return;
            }
            if (voiceNavSession) {
                endVoiceNavSession();
                return;
            }
            if (typeof window.endChat === "function") window.endChat();
            updateFloatingBar();
        });
    }

    if (barChatButton) barChatButton.addEventListener("click", showChat);
    if (returnButton) returnButton.addEventListener("click", function () {
        if (Date.now() < suppressReturnClickUntil) return;
        showChat();
    });
    if (barMicButton) {
        barMicButton.addEventListener("click", function (event) {
            event.stopPropagation();
            const micButton = document.getElementById("micBtn");
            if (!simulatedSession && !voiceNavSession && isCallActive() && micButton) micButton.click();
            updateFloatingBar();
        });
    }

    if (floatingBar && returnButton) {
        returnButton.addEventListener("pointerdown", function (event) {
            if (!event.isPrimary || event.button !== 0) return;
            const rect = floatingBar.getBoundingClientRect();
            dragState = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                left: rect.left,
                top: rect.top,
                moved: false
            };
            returnButton.setPointerCapture(event.pointerId);
        });
        returnButton.addEventListener("pointermove", function (event) {
            if (!dragState || dragState.pointerId !== event.pointerId) return;
            const dx = event.clientX - dragState.startX;
            const dy = event.clientY - dragState.startY;
            if (!dragState.moved && Math.abs(dx) + Math.abs(dy) < 8) return;
            dragState.moved = true;
            const maxLeft = Math.max(0, window.innerWidth - floatingBar.offsetWidth);
            const maxTop = Math.max(0, window.innerHeight - floatingBar.offsetHeight);
            floatingBar.style.left = Math.max(0, Math.min(maxLeft, dragState.left + dx)) + "px";
            floatingBar.style.top = Math.max(0, Math.min(maxTop, dragState.top + dy)) + "px";
            floatingBar.style.right = "auto";
            floatingBar.style.bottom = "auto";
            floatingBar.style.transform = "none";
        });
        const finishDrag = function (event) {
            if (!dragState || dragState.pointerId !== event.pointerId) return;
            if (dragState.moved) suppressReturnClickUntil = Date.now() + 350;
            dragState = null;
        };
        returnButton.addEventListener("pointerup", finishDrag);
        returnButton.addEventListener("pointercancel", finishDrag);
    }

    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden" && isRealCallActive()) {
            setCallPresentation("minimized");
        } else if (document.visibilityState === "visible" && isRealCallActive()
            && !frameLayer.classList.contains("is-open")) {
            setCallPresentation("full");
        }
        updateFloatingBar();
    });

    let homeContextTimer = null;
    const homeContextObserver = new MutationObserver(function (records) {
        if (frameLayer.classList.contains("is-open")) return;
        const relevantChanges = records.some(function (record) {
            const target = record.target instanceof Element ? record.target : record.target.parentElement;
            if (target && target.closest("#unifiedAiFloatingBar, #unifiedAiTestPanel, #unifiedAiTestLauncher")) return false;
            return record.type !== "attributes"
                || !["data-unified-ai-target", "data-unified-ai-field"].includes(record.attributeName);
        });
        if (!relevantChanges) return;
        if (homeContextTimer) clearTimeout(homeContextTimer);
        homeContextTimer = setTimeout(function () {
            // Do NOT clear lastSentContext here. The signature check is what stops an
            // unchanged page (clock tick, countdown, badge) from re-sending the full
            // context to the voice server over and over, which could drop the call.
            sendCurrentPageContext();
            notifyTestContextChanged();
        }, 700);
    });
    homeContextObserver.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });

    document.addEventListener("click", function (event) {
        if (!isCallActive()) return;
        const element = event.target instanceof Element ? event.target : null;
        const navButton = element && element.closest(".navBtn[data-page]");
        if (navButton) {
            event.preventDefault();
            event.stopImmediatePropagation();
            openAppPage(navButton.getAttribute("data-page"));
            return;
        }
        const link = element && element.closest("a[href]");
        if (!link || link.hasAttribute("download") || link.target === "_blank") return;

        const targetUrl = new URL(link.href, window.location.href);
        if (!normalizeAppOrigin(targetUrl)
            || targetUrl.hash && targetUrl.pathname === window.location.pathname) return;
        if (/\/(?:home(?:\/index)?|ai\/chat)\/?$/i.test(targetUrl.pathname)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            showHomePreservingCall();
            return;
        }

        const bedContext = window.BedContext && window.BedContext.get ? window.BedContext.get() : {};
        const bedInfo = bedContext.bedInfo || pageParams.get("BedInfo");
        if (bedInfo && !targetUrl.searchParams.has("BedInfo")) targetUrl.searchParams.set("BedInfo", bedInfo);
        targetUrl.searchParams.set("Unified", "1");
        targetUrl.searchParams.set("UnifiedAI", "1");
        event.preventDefault();
        event.stopImmediatePropagation();
        loadFrameUrl(targetUrl, routeTargetForPath(targetUrl.pathname), null);
    }, true);

    // ---- Voice navigation session (no AI): keeps the Home shell alive so pages open in the iframe ----
    function endVoiceNavSession() {
        if (!voiceNavSession) return false;
        voiceNavSession = false;
        showChat();
        updateFloatingBar();
        notifyTestContextChanged();
        window.dispatchEvent(new CustomEvent("unified-ai:voice-nav-ended"));
        return true;
    }

    // ---- Notification tap while Home is open: route inside the shell, never reload Home ----
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.addEventListener("message", function (event) {
            const data = event.data || {};
            if (data.type !== "push-open" || !data.url) return;
            if (isCallActive()) {
                if (!openAppUrl(data.url)) console.warn("Notification target is not a valid same-site route:", data.url);
            } else {
                window.location.href = data.url;
            }
        });
    }

    // ---- A live call must never be unloaded by a top-level navigation ----
    // A script doing location.href = "/SomePage" on the Home shell would drop the call, the microphone
    // and the WebSocket. While a call is live, open that page inside the shell instead.
    if (window.navigation && typeof window.navigation.addEventListener === "function") {
        window.navigation.addEventListener("navigate", function (event) {
            if (!isRealCallActive() || !event.cancelable || event.hashChange || event.formData) return;
            if (event.downloadRequest !== null && event.downloadRequest !== undefined) return;
            if (event.navigationType !== "push" && event.navigationType !== "replace") return;
            if (event.destination.sameDocument) return;
            let destination;
            try { destination = new URL(event.destination.url); } catch (error) { return; }
            if (destination.origin !== window.location.origin) return;
            if (/\/(?:log-?out|log-?in|prelanding)\b/i.test(destination.pathname)) return;   // leaving the app on purpose
            if (openAppUrl(destination.toString())) event.preventDefault();
        });
    }

    // Refresh / closing the tab would end the call: ask first.
    window.addEventListener("beforeunload", function (event) {
        if (!isRealCallActive()) return;
        event.preventDefault();
        event.returnValue = "";
    });

    window.UnifiedAIHost = {
        startVoiceNavSession: function () {
            if (isRealCallActive() || simulatedSession) return false;
            voiceNavSession = true;
            updateFloatingBar();
            notifyTestContextChanged();
            return true;
        },
        endVoiceNavSession: endVoiceNavSession,
        isVoiceNavActive: function () { return voiceNavSession; },
        isRealCallActive: isRealCallActive,
        isCallActive: isCallActive,
        openModule: openModule,
        showChat: showChat,
        minimizeCall: minimizeCall,
        handleAction: handleAction,
        getCurrentContext: currentPageContext,
        startLocalTestSession: function () {
            if (!isLocalTestMode || document.body.getAttribute("data-state") === "connecting"
                || document.body.getAttribute("data-state") === "connected") return false;
            simulatedSession = true;
            updateFloatingBar();
            notifyTestContextChanged();
            return true;
        },
        endLocalTestSession: function () {
            if (!isLocalTestMode) return false;
            simulatedSession = false;
            showChat();
            updateFloatingBar();
            notifyTestContextChanged();
            return true;
        },
        isLocalTestSessionActive: function () {
            return simulatedSession;
        },
        isLocalTestMode: isLocalTestMode
    };

    let endedStateTimer = null;
    const bodyObserver = new MutationObserver(function () {
        const state = document.body.getAttribute("data-state");
        if (state === "connecting" || state === "connected") {
            simulatedSession = false;
            if (voiceNavSession) endVoiceNavSession();
            clearTimeout(endedStateTimer);
            endedStateTimer = null;
        } else {
            if (state === "ended") {
                clearTimeout(endedStateTimer);
                endedStateTimer = setTimeout(function () {
                    endedStateTimer = null;
                    if (document.body.getAttribute("data-state") === "ended") {
                        document.body.setAttribute("data-state", "idle");
                    }
                }, 1800);
            } else {
                clearTimeout(endedStateTimer);
                endedStateTimer = null;
                if (state === "idle" && callPresentation === "minimized"
                    && !frameLayer.classList.contains("is-open")) {
                    setCallPresentation("full");
                }
            }
        }
        updateFloatingBar();
        notifyTestContextChanged();
    });
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["data-state"] });
    const statusElement = document.getElementById("callStatus");
    if (statusElement) {
        new MutationObserver(updateFloatingBar).observe(statusElement, {
            characterData: true,
            childList: true,
            subtree: true
        });
    }
    const micElement = document.getElementById("micBtn");
    if (micElement) {
        new MutationObserver(updateFloatingBar).observe(micElement, {
            attributes: true,
            attributeFilter: ["class"]
        });
    }
    updateFloatingBar();

    if (window.BedContext && typeof window.BedContext.go === "function") {
        const originalGo = window.BedContext.go.bind(window.BedContext);
        window.BedContext.go = function (page, extra) {
            const normalized = String(page || "").replace(/^\/+/, "").toLowerCase();
            if (isCallActive()) {
                if (normalized === "home" || normalized === "home/index" || normalized === "ai" || normalized === "ai/chat") {
                    showHomePreservingCall();
                    return;
                }
                openAppPage(page, extra);
                return;
            }
            originalGo(page, extra);
        };
    }
})();
