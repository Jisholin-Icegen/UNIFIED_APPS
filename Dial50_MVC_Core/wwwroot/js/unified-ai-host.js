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

    const BLOCKED_LABEL_REGEX = /\b(log\s*out|logout|log\s*off|sign\s*out|signout|sign\s*off|end\s*(the\s*)?(call|session)|hang\s*up|disconnect\s*call|delete\s*account|exit\s*app)\b/i;
    const BLOCKED_ROUTE_REGEX = /^\/(?:account\/)?(?:log-?out|log-?off|sign-?out|log-?in|prelanding)(?:\/|\?|$)/i;
    const BLOCKED_HINT_REGEX = /log-?out|sign-?out|log-?off|end-?call|hang-?up/i;
    const CARD_SELECTOR = ".card, .service-card, .food-card, .bottom-card, .patient-status-card, .patfeedback-card, .order-card, .selection-card, .timing-card";
    const SCOPE_ATTRIBUTES = ["data-food-id", "data-category-id", "data-order-id", "data-notification-id", "data-question-id", "data-meal-type"];
    const CONTEXT_MIN_GAP_MS = 500;
    const NAVIGATION_TIMEOUT_MS = 8000;

    let frameReady = false;
    let pendingActions = [];
    let pendingNavigation = null;
    let activeTarget = null;
    let latestFrameContext = null;
    let lastSentContext = "";
    let lastContextSentAt = 0;
    let contextRetryTimer = null;
    let lastContextRoute = "";
    let simulatedSession = false;
    let voiceNavSession = false;
    let screenWakeLock = null;
    let wakeLockRequestPending = false;
    let suppressReturnClickUntil = 0;
    let dragState = null;
    let callPresentation = "full";
    let suppressEndedUntil = 0;
    let registry = {};
    let registryCount = 0;
    const originalCallLayerDisplay = callLayer ? callLayer.style.getPropertyValue("display") : "";
    const originalCallLayerDisplayPriority = callLayer ? callLayer.style.getPropertyPriority("display") : "";

    function normalizeText(value) {
        return String(value || "").replace(/\s+/g, " ").trim();
    }

    function neutralText(value) {
        return normalizeText(value).toLowerCase().replace(/[0-9\u20B9$\u20AC\u00A3.,:%]+/g, " ").replace(/\s+/g, " ").trim();
    }

    function fnv1aHash(value) {
        let hash = 2166136261;
        const input = String(value || "");
        for (let i = 0; i < input.length; i++) {
            hash ^= input.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(36);
    }

    function stripPath(path) {
        return String(path || "").split("?")[0].replace(/^\/+|\/+$/g, "").toLowerCase();
    }

    function isBlockedElement(element, label, route) {
        if (BLOCKED_LABEL_REGEX.test(label || "") || BLOCKED_ROUTE_REGEX.test(String(route || "").trim())) return true;
        if (!element || !element.getAttribute) return false;
        const hints = [
            element.id,
            element.getAttribute("data-action"),
            element.getAttribute("href"),
            element.getAttribute("data-route"),
            element.getAttribute("onclick"),
            element.getAttribute("aria-label"),
            element.getAttribute("title"),
            typeof element.className === "string" ? element.className : ""
        ].join(" ");
        return BLOCKED_HINT_REGEX.test(hints);
    }

    function isCallActive() {
        const state = document.body.getAttribute("data-state");
        return simulatedSession || voiceNavSession || state === "connecting" || state === "connected";
    }

    function isRealCallActive() {
        const state = document.body.getAttribute("data-state");
        return state === "connecting" || state === "connected";
    }

    function isVoiceConnected() {
        return !simulatedSession && document.body.getAttribute("data-state") === "connected"
            && typeof window.sendVoiceAgentMessage === "function";
    }

    function isHiddenOnlyByCallOverlay(element) {
        if (!isRealCallActive() || callPresentation === "minimized") return false;
        if (element.closest("[hidden], [aria-hidden='true'], #interactiveCard, .idle-layer, #callLayer, #endedLayer, .modal-overlay, .rs-modal-overlay, .video-overlay, #autoStartLoader")) return false;
        if (element.style && element.style.display === "none") return false;
        return !!element.closest("#pageNav, .nav, .nav-bar, .bottom-nav, .top-nav, .app-nav, .patfeedback-card, .patient-status-card, .bottom-card");
    }

    function isBlankFrame() {
        try {
            return !frame.contentWindow || frame.contentWindow.location.href === "about:blank";
        } catch (error) {
            return false;
        }
    }

    function currentFramePath() {
        try { return frame.contentWindow ? frame.contentWindow.location.pathname : ""; }
        catch (error) { return ""; }
    }

    function discoveredRoutes() {
        const found = {};
        document.querySelectorAll("#pageNav [data-page], .navBtn[data-page]").forEach(function (element) {
            const page = String(element.getAttribute("data-page") || "").trim();
            if (!page) return;
            const route = "/" + page.replace(/^\/+/, "");
            if (BLOCKED_ROUTE_REGEX.test(route)) return;
            const key = stripPath(page).split("/")[0].replace(/[^a-z0-9]/g, "");
            if (key && !found[key]) found[key] = route;
        });
        return found;
    }

    function resolveRoute(target) {
        if (!target) return null;
        if (Object.prototype.hasOwnProperty.call(routes, target)) return routes[target];
        const wanted = String(target).toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!wanted) return null;
        const known = Object.keys(routes).find(function (key) { return key.replace(/[^a-z0-9]/g, "") === wanted; });
        if (known) return routes[known];
        return discoveredRoutes()[wanted] || null;
    }

    function routeTargetForPath(path) {
        const normalized = stripPath(path);
        const withoutIndex = normalized.replace(/\/index$/, "");
        const entries = Object.keys(routes).map(function (key) { return [key, stripPath(routes[key])]; });
        const exact = entries.find(function (entry) {
            return entry[1] === normalized || entry[1].replace(/\/index$/, "") === withoutIndex;
        });
        if (exact) return exact[0];
        const controller = normalized.split("/")[0];
        if (controller === "fooddining") {
            if (normalized === "fooddining/otherservices") return "food_other_services";
            if (normalized === "fooddining/fooddining" || normalized === "fooddining") return "food_explore";
            return "food_order";
        }
        const sameController = entries.find(function (entry) { return entry[1].split("/")[0] === controller; });
        return sameController ? sameController[0] : "page:" + normalized;
    }

    function normalizeAppOrigin(url) {
        if (url.protocol !== window.location.protocol || url.hostname !== window.location.hostname) return false;
        if (url.port !== window.location.port) url.port = window.location.port;
        return url.origin === window.location.origin;
    }

    function withContext(url) {
        const bedContext = window.BedContext && window.BedContext.get ? window.BedContext.get() : {};
        const bedInfo = bedContext.bedInfo || pageParams.get("BedInfo");
        const tenantId = bedContext.tenantId || pageParams.get("XTenantID") || sessionStorage.getItem("XTenantID");
        const region = bedContext.region || pageParams.get("region") || sessionStorage.getItem("region");
        if (bedInfo) url.searchParams.set("BedInfo", bedInfo);
        if (tenantId) url.searchParams.set("XTenantID", tenantId);
        if (region) url.searchParams.set("region", region);
        url.searchParams.set("Unified", "1");
        url.searchParams.set("UnifiedAI", "1");
        return url;
    }

    function alreadyOnPath(url) {
        if (!frameLayer.classList.contains("is-open") || !frameReady) return false;
        const current = currentFramePath();
        return !!current && current.toLowerCase() === url.pathname.toLowerCase();
    }

    function clearPendingNavigation(success, result, error) {
        if (!pendingNavigation) return;
        const nav = pendingNavigation;
        pendingNavigation = null;
        clearTimeout(nav.fallbackTimer);
        clearTimeout(nav.timeoutTimer);
        reportResult(nav.action, success, result, error);
    }

    function resolvePendingNavigation() {
        if (!pendingNavigation || !latestFrameContext || !latestFrameContext.route) return;
        const actual = currentFramePath();
        if (actual && String(latestFrameContext.route).toLowerCase() !== actual.toLowerCase()) return;
        clearPendingNavigation(true, { target: pendingNavigation.result.target, path: actual || pendingNavigation.result.path });
    }

    function resetModuleFrame() {
        clearPendingNavigation(false, null, "The module closed before navigation finished.");
        frameReady = false;
        latestFrameContext = null;
        activeTarget = null;
        frame.style.visibility = "hidden";
        const currentSrc = frame.getAttribute("src");
        if (currentSrc && currentSrc !== "about:blank") {
            frame.src = "about:blank";
        }
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
        window.dispatchEvent(new CustomEvent("unified-ai:context-changed"));
        if (isLocalTestMode) {
            window.dispatchEvent(new CustomEvent("unified-ai:test-context-changed"));
        }
    }

    function scopeKey(element) {
        const scope = element.closest("[" + SCOPE_ATTRIBUTES.join("],[") + "]");
        const attrs = scope ? SCOPE_ATTRIBUTES.map(function (name) { return scope.getAttribute(name) || ""; }).join(".") : "";
        const card = element.closest(CARD_SELECTOR);
        const heading = card && card !== element ? card.querySelector("h1, h2, h3, h4, .card-title, .service-title, .food-title") : null;
        return attrs + "/" + (heading ? neutralText(heading.textContent).slice(0, 60) : "");
    }

    function makeId(prefix, element, label, used, extra, route) {
        const strong = [
            element.id || "",
            element.getAttribute("data-action") || "",
            route || "",
            element.getAttribute("name") || ""
        ].join("~");
        const hasStrong = strong.replace(/~/g, "") !== "";
        const key = [
            element.tagName,
            strong,
            hasStrong ? "" : neutralText(label),
            scopeKey(element),
            extra || ""
        ].join("|").toLowerCase();
        const keyHash = fnv1aHash(key);
        const base = prefix + keyHash;
        used[base] = (used[base] || 0) + 1;
        return { id: used[base] > 1 ? base + "-" + used[base] : base, key: keyHash };
    }

    function tag(target, attribute, ids) {
        if (target.getAttribute(attribute) !== ids.id) target.setAttribute(attribute, ids.id);
        if (target.getAttribute("data-uai-key") !== ids.key) target.setAttribute("data-uai-key", ids.key);
        if (!registry[ids.id]) {
            if (registryCount > 800) { registry = {}; registryCount = 0; }
            registryCount++;
        }
        registry[ids.id] = ids.key;
    }

    function elementRoute(element) {
        let routeValue = element.getAttribute("href") || element.getAttribute("data-route")
            || (element.dataset && element.dataset.page ? "/" + element.dataset.page : "");
        if (!routeValue) {
            const onclickAttr = element.getAttribute("onclick") || "";
            const goMatch = onclickAttr.match(/BedContext\.go\(\s*['"]([^'"]+)['"]/i);
            if (goMatch) routeValue = "/" + goMatch[1].replace(/^\/+/, "");
        }
        if (!routeValue || routeValue.trim() === "#") return "";
        try {
            const url = new URL(routeValue, window.location.href);
            if (url.origin !== window.location.origin) return "";
            ["BedInfo", "Unified", "UnifiedAI", "token", "patient", "user", "email", "uhid"]
                .forEach(function (param) { url.searchParams.delete(param); });
            return (url.pathname + url.search).slice(0, 120);
        } catch (error) {
            return "";
        }
    }

    function cartContext() {
        const cart = window.currentCart;
        const hasCartObject = !!cart && typeof cart === "object";
        const lines = [];
        let count = 0;
        if (hasCartObject) {
            Object.keys(cart).slice(0, 60).forEach(function (key) {
                const entry = cart[key];
                const qty = entry ? Number(entry.qty) || 0 : 0;
                if (qty <= 0) return;
                count += qty;
                const parts = key.split("_");
                lines.push({
                    foodId: parts[0],
                    meal: parts.slice(1).join("_"),
                    qty: qty,
                    name: normalizeText(entry.name || entry.foodName || entry.title || "").slice(0, 60)
                });
            });
        }
        const countEl = document.querySelector("#cartCount, .cart-count, [data-cart-count]");
        const totalEl = document.querySelector("#cartTotal, .cart-total, [data-cart-total]");
        if (!hasCartObject && !countEl && !totalEl) return null;
        const summary = { count: count, lines: lines };
        if (!count && countEl) summary.count = parseInt(String(countEl.textContent || "").replace(/[^0-9]/g, ""), 10) || 0;
        if (totalEl) summary.total = normalizeText(totalEl.textContent).slice(0, 30);
        return summary;
    }

    function homePageContext() {
        const bedContext = window.BedContext && window.BedContext.get ? window.BedContext.get() : {};
        const text = function (element, maxLen) {
            const limit = maxLen || 100;
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
            return value.slice(0, limit);
        };
        const isVisible = function (element) {
            if (element.closest("[hidden], [aria-hidden='true'], #unifiedAiFloatingBar, #unifiedAiTestPanel, #unifiedAiTestLauncher, #callLayer, #endedLayer, .idle-layer, .modal-overlay, .rs-modal-overlay, .video-overlay, #autoStartLoader")) return false;
            const style = window.getComputedStyle(element);
            if (style.visibility === "hidden") return false;
            if (isHiddenOnlyByCallOverlay(element)) return true;
            if (style.display === "none" || !element.getClientRects().length) return false;
            for (let ancestor = element; ancestor && ancestor !== document.documentElement; ancestor = ancestor.parentElement) {
                const rect = ancestor.getBoundingClientRect();
                if (rect.width && (rect.right <= 0 || rect.left >= window.innerWidth)) return false;
            }
            return true;
        };

        const usedActionIds = {};
        const usedFieldIds = {};
        const usedChoiceIds = {};
        const seenRoutes = new Set();

        const actionElements = Array.from(document.querySelectorAll(
            "button, a[href], [role='button'], [role='tab'], summary, input[type='button'], input[type='submit'], input[type='reset'], [onclick], [data-action], [data-route], .navBtn, .service-card, .food-card, .bottom-card, .patient-status-card, .patfeedback-card, .order-card, .selection-card, .timing-card"
        ))
            .filter(function (element) { return element.id !== "mobileNotificationTrigger"; })
            .filter(isVisible)
            .slice(0, 150);

        const actions = actionElements
            .map(function (element) {
                const headingEl = element.querySelector("h1, h2, h3, h4, .card-title, .service-title, .food-title");
                let label = headingEl ? text(headingEl, 80) : text(element, 90);
                const parent = element.closest(CARD_SELECTOR);
                const parentName = parent && parent.querySelector("h3, h4, .service-title, .food-title");
                const name = parentName && text(parentName, 60);
                if (name && label.length < 20 && !label.toLowerCase().includes(name.toLowerCase())) label += " " + name;
                if (!label) {
                    const image = element.querySelector("img[alt]");
                    label = image ? text(image, 80) : "";
                }
                if (!label) return null;

                const resolvedRoute = text(elementRoute(element), 120);
                if (isBlockedElement(element, label, resolvedRoute)) return null;

                if (resolvedRoute) {
                    const routeKey = resolvedRoute.replace(/\/+$/, "").toLowerCase();
                    if (seenRoutes.has(routeKey)) return null;
                    seenRoutes.add(routeKey);
                }

                const ids = makeId("home-action-", element, label, usedActionIds, "", resolvedRoute);
                tag(element, "data-unified-ai-target", ids);

                const action = {
                    label: label,
                    disabled: !!element.disabled || element.getAttribute("aria-disabled") === "true",
                    targetId: ids.id
                };
                if (name && name.toLowerCase() !== label.toLowerCase()) action.group = name;
                if (resolvedRoute) action.route = resolvedRoute;
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
            .map(function (field) {
                const labels = Array.from(field.labels || []).map(function (label) { return label.textContent; });
                const fieldLabel = text(field.getAttribute("aria-label") || labels.join(" ")
                    || field.getAttribute("placeholder") || field.name || field.id || "Text field", 80);
                const ids = makeId("home-field-", field, fieldLabel, usedFieldIds, "", "");
                tag(field, "data-unified-ai-field", ids);
                return {
                    targetId: ids.id,
                    label: fieldLabel,
                    placeholder: text(field.getAttribute("placeholder") || "", 60)
                };
            });

        const choices = Array.from(document.querySelectorAll("input[type='checkbox'], input[type='radio']"))
            .filter(isVisible)
            .slice(0, 60)
            .map(function (input) {
                const labels = Array.from(input.labels || []).map(function (label) { return label.textContent; });
                const choiceLabel = text(input.getAttribute("aria-label") || labels.join(" ") || input.value || input.name || input.id, 80);
                if (!choiceLabel || isBlockedElement(input, choiceLabel, "")) return null;
                const ids = makeId("home-choice-", input, choiceLabel, usedChoiceIds, (input.name || "") + "|" + (input.value || ""), "");
                tag(input, "data-unified-ai-choice", ids);
                return {
                    targetId: ids.id,
                    label: choiceLabel,
                    checked: !!input.checked,
                    disabled: !!input.disabled || input.getAttribute("aria-disabled") === "true"
                };
            })
            .filter(Boolean);

        const context = {
            route: "/Home/Index",
            title: document.title,
            headings: Array.from(document.querySelectorAll("#pageContent h1, #pageContent h2, #pageContent h3"))
                .filter(function (heading) {
                    return !heading.closest(".modal-overlay, .rs-modal-overlay, .video-overlay, #endedLayer, .idle-layer");
                })
                .map(function (el) { return text(el, 80); })
                .filter(Boolean)
                .slice(0, 20),
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
                        label: text(select.getAttribute("aria-label") || labels.join(" ") || select.name || select.id, 60),
                        selected: select.options[select.selectedIndex]
                            ? { value: text(select.value, 60), label: text(select.options[select.selectedIndex].textContent, 60) }
                            : null,
                        options: Array.from(select.options).slice(0, 60).map(function (option) {
                            return { value: text(option.value, 60), label: text(option.textContent, 60), disabled: option.disabled };
                        })
                    };
                }),
            choices: choices,
            fields: fields,
            items: Array.from(document.querySelectorAll("#pageNav .navBtn, #pageNav [data-route], #pageNav [data-page], #pageContent .card, #pageContent .food-card, #pageContent .bottom-card, #pageContent .service-card, #pageContent [data-route], #pageContent [data-page]"))
                .filter(isVisible)
                .slice(0, 60)
                .map(function (item) {
                    const name = text(item.querySelector("h1, h2, h3, h4, .card-title") || item, 70);
                    const route = text(elementRoute(item), 120);
                    const result = { name: name, label: name, disabled: !!item.disabled };
                    if (route) result.route = route.split("?")[0];
                    if (isBlockedElement(item, result.label, result.route)) return null;
                    return result;
                })
                .filter(function (item) { return item && item.label; }),
            actions: actions
        };

        const cart = cartContext();
        if (cart) context.cart = cart;
        return context;
    }

    function sendCurrentPageContext(forceImmediate) {
        if (!isVoiceConnected()) return;
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
        const routeChanged = String(context.route || "") !== lastContextRoute;
        const wait = (forceImmediate || routeChanged) ? 0 : CONTEXT_MIN_GAP_MS - (Date.now() - lastContextSentAt);
        if (wait > 0) {
            if (!contextRetryTimer) {
                contextRetryTimer = setTimeout(function () {
                    contextRetryTimer = null;
                    sendCurrentPageContext(false);
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
        if (state === "connected" && !simulatedSession) sendCurrentPageContext(false);
    }

    function showChat() {
        frameLayer.classList.remove("is-open");
        frameLayer.setAttribute("aria-hidden", "true");
        resetModuleFrame();
        setCallPresentation("full");
        updateFloatingBar();
        notifyTestContextChanged();
    }

    function showHomePreservingCall() {
        frameLayer.classList.remove("is-open");
        frameLayer.setAttribute("aria-hidden", "true");
        resetModuleFrame();
        setCallPresentation(isRealCallActive() ? "minimized" : "full");
        updateFloatingBar();
        notifyTestContextChanged();
    }

    const recentRequests = new Map();

    function isDuplicateRequest(action) {
        const id = action && action.request_id;
        if (!id) return false;
        const now = Date.now();
        recentRequests.forEach(function (entry, key) { if (now - entry.time > 60000) recentRequests.delete(key); });
        if (recentRequests.has(id)) return true;
        recentRequests.set(id, { time: now, name: action.action });
        return false;
    }

    function reportResult(action, success, result, error) {
        if (!action || !action.request_id) return;
        const known = recentRequests.get(action.request_id);
        const response = {
            request_id: action.request_id,
            action: action.action || (known && known.name) || "",
            success: !!success,
            result: result || null,
            error: error || null
        };
        sendCurrentPageContext(true);
        notifyTestContextChanged();
        window.dispatchEvent(new CustomEvent("unified-ai:action-result", { detail: response }));
        if (!isVoiceConnected()) return;

        window.sendVoiceAgentMessage(Object.assign({ type: "app_action_result" }, response));
    }

    function loadFrameUrl(targetUrl, target, action) {
        clearPendingNavigation(false, null, "Replaced by a newer navigation.");
        latestFrameContext = null;
        lastSentContext = "";
        activeTarget = target;
        frame.style.visibility = "hidden";
        frameLayer.classList.add("is-open");
        frameLayer.setAttribute("aria-hidden", "false");
        if (isRealCallActive()) setCallPresentation("minimized");

        pendingActions.forEach(function (pendingAction) {
            reportResult(pendingAction, false, null, "The module changed before this action could run.");
        });
        pendingActions = [];

        if (action) {
            if (action.action === "navigate" || action.action === "food.intent") {
                pendingNavigation = {
                    action: action,
                    result: { target: target, path: targetUrl.pathname },
                    fallbackTimer: null,
                    timeoutTimer: setTimeout(function () {
                        clearPendingNavigation(false, null, "The destination page took too long to load.");
                    }, NAVIGATION_TIMEOUT_MS)
                };
            } else {
                pendingActions.push(action);
            }
        }

        frameReady = false;
        updateFloatingBar();
        if (simulatedSession && testPanel) testPanel.hidden = false;
        frame.src = targetUrl.toString();
        notifyTestContextChanged();
        return true;
    }

    function openModule(target, action) {
        const route = resolveRoute(target);
        if (!route) {
            reportResult(action, false, null, "Unsupported module.");
            return false;
        }
        const targetUrl = withContext(new URL(route, window.location.origin));
        if (action && (action.action === "navigate" || action.action === "food.intent") && alreadyOnPath(targetUrl)) {
            reportResult(action, true, { target: target, path: targetUrl.pathname, already: true });
            return true;
        }
        return loadFrameUrl(targetUrl, routeTargetForPath(route), action || null);
    }

    function openAppPage(page, extra) {
        const url = new URL(window.BedContext.url(page, extra), window.location.origin);
        if (!normalizeAppOrigin(url) || BLOCKED_ROUTE_REGEX.test(url.pathname)) return false;
        if (/^\/(?:home(?:\/index)?|ai\/chat)\/?$/i.test(url.pathname)) {
            showHomePreservingCall();
            return true;
        }
        if (/^\/FoodDining(?:\/Index)?\/?$/i.test(url.pathname)) {
            url.pathname = "/FoodDining/FoodDining";
        }
        withContext(url);
        return loadFrameUrl(url, routeTargetForPath(url.pathname), null);
    }

    function openAppUrl(value, navAction) {
        const path = String(value || "").trim();
        if (!path) return null;
        let targetUrl;
        try {
            targetUrl = new URL(path, window.location.origin);
        } catch (error) {
            return null;
        }
        if (!normalizeAppOrigin(targetUrl) || !targetUrl.pathname.startsWith("/")) return null;
        if (BLOCKED_ROUTE_REGEX.test(targetUrl.pathname)) return null;

        if (/^\/FoodDining(?:\/Index)?\/?$/i.test(targetUrl.pathname)) {
            targetUrl.pathname = "/FoodDining/FoodDining";
        }
        if (/\/(?:home(?:\/index)?|ai\/chat)\/?$/i.test(targetUrl.pathname)) {
            showHomePreservingCall();
            if (navAction) reportResult(navAction, true, { target: "home", path: "/Home/Index" });
            return { target: "home", deferred: true };
        }

        targetUrl.searchParams.delete("BedInfo");
        withContext(targetUrl);
        if (navAction && alreadyOnPath(targetUrl)) {
            reportResult(navAction, true, { target: routeTargetForPath(targetUrl.pathname), path: targetUrl.pathname, already: true });
            return { path: targetUrl.pathname, deferred: true };
        }
        loadFrameUrl(targetUrl, routeTargetForPath(targetUrl.pathname), navAction || null);
        return { path: targetUrl.pathname, deferred: !!navAction };
    }

    function dispatchToModule(target, action) {
        if (frameLayer.classList.contains("is-open") && activeTarget === target) {
            sendActionToFrame(action);
        } else {
            openModule(target, action);
        }
    }

    function isElementInteractable(element) {
        if (!element || element.closest("#unifiedAiModuleLayer")) return false;
        const style = window.getComputedStyle(element);
        if (style.visibility === "hidden") return false;
        if (isHiddenOnlyByCallOverlay(element)) return true;
        return style.display !== "none" && element.getClientRects().length > 0;
    }

    function findUiTarget(attribute, targetId) {
        if (!targetId) return null;
        return Array.from(document.querySelectorAll("[" + attribute + "]")).find(function (element) {
            return element.getAttribute(attribute) === targetId && isElementInteractable(element);
        }) || null;
    }

    function findByKey(attribute, keyHash) {
        if (!keyHash) return null;
        const matches = Array.from(document.querySelectorAll("[" + attribute + "][data-uai-key='" + keyHash + "']")).filter(isElementInteractable);
        return matches.length === 1 ? matches[0] : null;
    }

    function findTargetByLabelFallback(action, contextKey, attribute) {
        const expected = normalizeText(action.label).toLowerCase();
        if (!expected) return null;
        const loose = neutralText(expected);
        const context = homePageContext();
        const list = (context && context[contextKey] ? context[contextKey] : []).filter(function (item) { return !item.disabled; });
        let matches = list.filter(function (item) { return normalizeText(item.label).toLowerCase() === expected; });
        if (matches.length !== 1 && loose) {
            matches = list.filter(function (item) { return neutralText(item.label) === loose; });
        }
        if (matches.length !== 1) return null;
        return findUiTarget(attribute, matches[0].targetId);
    }

    function resolveHostTarget(attribute, action, contextKey, callback) {
        const previousKey = registry[action.targetId];
        const deadline = Date.now() + 1500;
        (function attempt() {
            let target = findUiTarget(attribute, action.targetId);
            if (!target) {
                homePageContext();
                target = findUiTarget(attribute, action.targetId)
                    || findByKey(attribute, previousKey)
                    || findTargetByLabelFallback(action, contextKey, attribute);
            }
            if (target) { callback(target); return; }
            if (Date.now() < deadline) { setTimeout(attempt, 150); return; }
            callback(null);
        })();
    }

    function executeHostUIAction(action) {
        if (action.action === "ui.click") {
            resolveHostTarget("data-unified-ai-target", action, "actions", function (target) {
                if (!target || target.disabled || target.getAttribute("aria-disabled") === "true") {
                    reportResult(action, false, null, "The selected visible action is no longer available.");
                    return;
                }
                const targetLabel = String(target.getAttribute("aria-label") || target.innerText || target.textContent || "").trim();
                if (isBlockedElement(target, targetLabel, elementRoute(target))) {
                    reportResult(action, false, null, "This action is blocked for patient session safety.");
                    return;
                }
                if (isHiddenOnlyByCallOverlay(target)
                    && !target.closest(".navBtn[data-page], a[href]")
                    && !/BedContext\.go\(/i.test(target.getAttribute("onclick") || "")) {
                    minimizeCall();
                } else if (!isHiddenOnlyByCallOverlay(target)) {
                    target.scrollIntoView({ behavior: "smooth", block: "center" });
                }
                target.click();
                reportResult(action, true, { clicked: targetLabel.slice(0, 90) });
            });
            return;
        }

        if (action.action === "ui.fill") {
            resolveHostTarget("data-unified-ai-field", action, "fields", function (target) {
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
            });
        }
    }

    function executeHostChoiceAction(action) {
        resolveHostTarget("data-unified-ai-choice", action, "choices", function (target) {
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
        });
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
            reportResult(action, false, {
                options: Array.from(select.options).filter(function (option) {
                    return !option.disabled;
                }).map(function (option) { return { value: option.value, label: option.textContent.trim() }; })
            },
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

    function foodActionPath(action, currentRoute) {
        const map = {
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
        if (action.action === "food.submit_order" && /\/FoodDining\/ReviewOrder\/?$/i.test(currentRoute)) {
            return "/FoodDining/ReviewOrder";
        }
        return map[action.action] || "";
    }

    function handleAction(action) {
        if (!action || typeof action !== "object" || typeof action.action !== "string") return;
        if (isDuplicateRequest(action)) return;

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
            openModule(target, action);
            return;
        }

        if (action.action === "navigate") {
            if (action.target && resolveRoute(action.target)) {
                openModule(action.target, action);
                return;
            }
            const destination = action.path || action.url || action.target;
            if (!openAppUrl(destination, action)) {
                reportResult(action, false, null, "The requested page is not a valid same-site route.");
            }
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
            const target = requestTargets[action.module] || (resolveRoute(action.module) ? action.module : null);
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

        if (action.action.indexOf("feedback.") === 0) {
            dispatchToModule("feedback", action);
            return;
        }

        if (action.action.indexOf("food.") === 0) {
            const currentRoute = String(latestFrameContext && latestFrameContext.route || "");
            const targetPath = foodActionPath(action, currentRoute);
            if (!targetPath) {
                reportResult(action, false, null, "Unsupported food action.");
                return;
            }
            if (frameLayer.classList.contains("is-open")
                && currentRoute.toLowerCase() === targetPath.toLowerCase()) {
                sendActionToFrame(action);
            } else {
                const targetUrl = withContext(new URL(targetPath, window.location.origin));
                loadFrameUrl(targetUrl, routeTargetForPath(targetPath), action);
            }
            return;
        }

        reportResult(action, false, null, "Unsupported app action.");
    }

    frame.addEventListener("load", function () {
        if (!frameLayer.classList.contains("is-open") || isBlankFrame()) return;
        frameReady = true;
        frame.style.visibility = "visible";
        while (pendingActions.length) {
            frame.contentWindow.postMessage({
                type: "unified_ai_action",
                action: pendingActions.shift()
            }, window.location.origin);
        }
        if (pendingNavigation) {
            clearTimeout(pendingNavigation.fallbackTimer);
            pendingNavigation.fallbackTimer = setTimeout(function () {
                if (!pendingNavigation) return;
                clearPendingNavigation(true, { target: pendingNavigation.result.target, path: currentFramePath() || pendingNavigation.result.path });
            }, 900);
        }
        updateFloatingBar();
        notifyTestContextChanged();
    });

    frame.addEventListener("error", function () {
        if (!frameLayer.classList.contains("is-open") || isBlankFrame()) return;
        frame.style.visibility = "visible";
    });

    window.addEventListener("voice-agent:app-action", function (event) {
        handleAction(event.detail);
    });
    window.addEventListener("voice-agent:connection-state", function (event) {
        const detail = event.detail || {};
        if (!detail.connected) { lastSentContext = ""; lastContextRoute = ""; }
        updateFloatingBar();
        if (detail.connected) sendCurrentPageContext(true);
    });

    window.addEventListener("unified-ai:order-confirmed", function (event) {
        if (!isVoiceConnected()) return;
        window.sendVoiceAgentMessage({ type: "app_order_confirmed", confirmation: event.detail || {} });
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
            resolvePendingNavigation();
            sendCurrentPageContext(false);
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
            suppressEndedUntil = Date.now() + 4000;
            if (typeof window.endChat === "function") window.endChat();
            if (typeof window.setState === "function") {
                window.setState("idle");
            } else {
                document.body.setAttribute("data-state", "idle");
            }
            showChat();
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

    const IGNORED_ATTRIBUTES = ["data-unified-ai-target", "data-unified-ai-field", "data-unified-ai-choice", "data-uai-key"];
    let homeContextTimer = null;
    const homeContextObserver = new MutationObserver(function (records) {
        if (frameLayer.classList.contains("is-open")) return;
        const relevantChanges = records.some(function (record) {
            const target = record.target instanceof Element ? record.target : record.target.parentElement;
            if (target && target.closest("#unifiedAiFloatingBar, #unifiedAiTestPanel, #unifiedAiTestLauncher")) return false;
            return record.type !== "attributes" || !IGNORED_ATTRIBUTES.includes(record.attributeName);
        });
        if (!relevantChanges) return;
        if (homeContextTimer) clearTimeout(homeContextTimer);
        homeContextTimer = setTimeout(function () {
            sendCurrentPageContext(false);
            notifyTestContextChanged();
        }, 300);
    });
    homeContextObserver.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });

    document.addEventListener("click", function (event) {
        if (!isCallActive()) return;
        const element = event.target instanceof Element ? event.target : null;
        const navButton = element && element.closest(".navBtn[data-page]");
        if (navButton) {
            const page = navButton.getAttribute("data-page");
            if (BLOCKED_ROUTE_REGEX.test("/" + String(page || "").replace(/^\/+/, ""))
                || isBlockedElement(navButton, navButton.innerText || navButton.textContent, "")) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            openAppPage(page);
            return;
        }
        const link = element && element.closest("a[href]");
        if (!link || link.hasAttribute("download") || link.target === "_blank") return;

        const targetUrl = new URL(link.href, window.location.href);
        if (!normalizeAppOrigin(targetUrl)
            || targetUrl.hash && targetUrl.pathname === window.location.pathname) return;
        if (BLOCKED_ROUTE_REGEX.test(targetUrl.pathname)) return;
        if (/\/(?:home(?:\/index)?|ai\/chat)\/?$/i.test(targetUrl.pathname)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            showHomePreservingCall();
            return;
        }

        withContext(targetUrl);
        event.preventDefault();
        event.stopImmediatePropagation();
        loadFrameUrl(targetUrl, routeTargetForPath(targetUrl.pathname), null);
    }, true);

    function endVoiceNavSession() {
        if (!voiceNavSession) return false;
        voiceNavSession = false;
        showChat();
        updateFloatingBar();
        notifyTestContextChanged();
        window.dispatchEvent(new CustomEvent("unified-ai:voice-nav-ended"));
        return true;
    }

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.addEventListener("message", function (event) {
            const data = event.data || {};
            if (data.type !== "push-open" || !data.url) return;
            if (isCallActive()) {
                if (!openAppUrl(data.url, null)) console.warn("Notification target is not a valid same-site route:", data.url);
            } else {
                window.location.href = data.url;
            }
        });
    }

    if (window.navigation && typeof window.navigation.addEventListener === "function") {
        window.navigation.addEventListener("navigate", function (event) {
            if (!isRealCallActive() || !event.cancelable || event.hashChange || event.formData) return;
            if (event.downloadRequest !== null && event.downloadRequest !== undefined) return;
            if (event.navigationType !== "push" && event.navigationType !== "replace") return;
            if (event.destination.sameDocument) return;
            let destination;
            try { destination = new URL(event.destination.url); } catch (error) { return; }
            if (destination.origin !== window.location.origin) return;
            if (BLOCKED_ROUTE_REGEX.test(destination.pathname)) return;
            if (openAppUrl(destination.toString(), null)) event.preventDefault();
        });
    }

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
        confirmOrder: function (detail) {
            window.dispatchEvent(new CustomEvent("unified-ai:order-confirmed", { detail: Object.assign({ source: "page" }, detail || {}) }));
        },
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

    const bodyObserver = new MutationObserver(function () {
        const state = document.body.getAttribute("data-state");
        if (state === "connecting" || state === "connected") {
            simulatedSession = false;
            suppressEndedUntil = 0;
            if (voiceNavSession) endVoiceNavSession();
        } else if (state === "ended") {
            if (Date.now() < suppressEndedUntil
                || callPresentation === "minimized"
                || frameLayer.classList.contains("is-open")) {
                suppressEndedUntil = Date.now() + 4000;
                if (typeof window.setState === "function") {
                    window.setState("idle");
                } else {
                    document.body.setAttribute("data-state", "idle");
                }
                showChat();
                return;
            }
        } else if (state === "idle") {
            if (callPresentation === "minimized" && !frameLayer.classList.contains("is-open")) {
                setCallPresentation("full");
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
                if (BLOCKED_ROUTE_REGEX.test("/" + normalized)) {
                    originalGo(page, extra);
                    return;
                }
                openAppPage(page, extra);
                return;
            }
            originalGo(page, extra);
        };
    }
})();