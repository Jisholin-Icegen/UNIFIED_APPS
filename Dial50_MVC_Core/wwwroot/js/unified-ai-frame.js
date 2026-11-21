(function () {
    const params = new URLSearchParams(window.location.search);
    let underHome = false;
    try { underHome = window.parent !== window && !!window.parent.UnifiedAIHost; } catch (error) { underHome = false; }
    if (window.parent === window || (!underHome && params.get("UnifiedAI") !== "1" && params.get("Unified") !== "1")) return;

    // The server flags every iframe page as Unified even if the URL lost ?UnifiedAI=1 (script
    // navigation / redirect). Put it back in the address so client-side checks keep working.
    if (params.get("UnifiedAI") !== "1") {
        try {
            const fixedUrl = new URL(window.location.href);
            fixedUrl.searchParams.set("Unified", "1");
            fixedUrl.searchParams.set("UnifiedAI", "1");
            window.history.replaceState(window.history.state, "", fixedUrl.toString());
        } catch (error) { /* ignore */ }
    }

    function respond(action, success, result, error) {
        if (!action || !action.request_id) return;

        window.parent.postMessage({
            type: "unified_ai_action_result",
            request_id: action.request_id,
            success: !!success,
            result: result || null,
            error: error || null
        }, window.location.origin);
    }

    function keepUnifiedRoute(url) {
        const target = new URL(url, window.location.href);
        if (target.protocol !== window.location.protocol || target.hostname !== window.location.hostname) return null;
        if (target.port !== window.location.port) target.port = window.location.port;
        if (target.origin !== window.location.origin) return null;
        if (/^\/FoodDining(?:\/Index)?\/?$/i.test(target.pathname)) {
            target.pathname = "/FoodDining/FoodDining";
        }
        const bedContext = window.BedContext && window.BedContext.get ? window.BedContext.get() : {};
        const bedInfo = target.searchParams.get("BedInfo") || bedContext.bedInfo || sessionStorage.getItem("bedInfo");
        const tenantId = target.searchParams.get("XTenantID") || bedContext.tenantId || sessionStorage.getItem("XTenantID");
        const region = target.searchParams.get("region") || bedContext.region || sessionStorage.getItem("region");
        if (bedInfo) target.searchParams.set("BedInfo", bedInfo);
        if (tenantId) target.searchParams.set("XTenantID", tenantId);
        if (region) target.searchParams.set("region", region);
        target.searchParams.set("Unified", "1");
        target.searchParams.set("UnifiedAI", "1");
        return target;
    }

    function isUnifiedHomePath(pathname) {
        return /\/(?:home(?:\/index)?|ai\/chat)\/?$/i.test(pathname);
    }

    function resolveRequestCategory(categories, input) {
        const stopWords = new Set(["a", "an", "can", "create", "for", "i", "is", "make", "my", "on", "please", "raise", "request", "service", "submit", "the", "want", "would", "you"]);
        const normalize = function (value) {
            return String(value || "")
                .normalize("NFKD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, " ")
                .trim()
                .split(/\s+/)
                .filter(function (word) { return word && !stopWords.has(word); })
                .join(" ");
        };
        const requested = normalize(input);
        if (!requested) return null;

        const matches = (categories || []).filter(function (category) {
            const name = normalize(category.CategoryDescription || category.name || category.title);
            return name && (name === requested || requested.indexOf(" " + name + " ") >= 0
                || (" " + requested + " ").indexOf(" " + name + " ") >= 0);
        });
        return matches.length === 1 ? matches[0] : null;
    }

    function normalizeText(value) {
        return String(value || "").replace(/\s+/g, " ").trim();
    }

    function redactPatientIdentifiers(value) {
        let text = normalizeText(value);
        const context = window.BedContext && window.BedContext.get ? window.BedContext.get() : {};
        ["bedInfo", "bedId", "patientName", "roomNumber", "roomBed", "bedNumber", "uhid", "userId", "ward"]
            .map(function (key) { return String(context[key] || "").trim(); })
            .filter(function (identifier) { return identifier.length >= 3; })
            .forEach(function (identifier) {
                const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                text = text.replace(new RegExp(escaped, "ig"), "[redacted]");
            });
        return text.slice(0, 240);
    }

    function isSafeControl(select) {
        return !/bed|patient|room|uhid|user|token|password|doctor|physician|provider/i.test(
            [select.id, select.name, select.getAttribute("aria-label")].join(" ")
        ) && !select.closest("#headerPatientInfo, .patient-info, .patient-details, [data-patient-info]");
    }

    function isSafeField(field) {
        return !/bed|patient|room|uhid|user|token|password|doctor|physician|provider|name|email|phone|mobile|address|birth|age/i.test(
            [field.id, field.name, field.getAttribute("aria-label"), field.getAttribute("placeholder")].join(" ")
        ) && !field.closest("#headerPatientInfo, .patient-info, .patient-details, [data-patient-info]");
    }

    function isVisible(element) {
        if (!(element instanceof Element) || element.closest("[hidden], [aria-hidden='true']")) return false;
        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden" || !element.getClientRects().length) return false;
        for (let ancestor = element; ancestor && ancestor !== document.documentElement; ancestor = ancestor.parentElement) {
            const rect = ancestor.getBoundingClientRect();
            if (rect.width && (rect.right <= 0 || rect.left >= window.innerWidth)) return false;
        }
        return true;
    }

    function safeRoute(element) {
        if (!element) return "";
        const href = element.getAttribute("href");
        const route = href && href.trim() !== "#" ? href : element.getAttribute("data-route");
        if (!route) return "";
        try {
            const url = new URL(route, window.location.href);
            if (url.origin !== window.location.origin) return "";
            ["BedInfo", "Unified", "UnifiedAI", "token", "patient", "user", "email", "uhid"]
                .forEach(function (name) { url.searchParams.delete(name); });
            return url.pathname + url.search;
        } catch (error) {
            return "";
        }
    }

    function isDisabled(element) {
        return !!element.disabled || element.getAttribute("aria-disabled") === "true"
            || element.closest("[inert]") !== null;
    }

    function interactiveLabel(element) {
        const directLabel = element.getAttribute("aria-label")
            || element.getAttribute("title")
            || element.getAttribute("data-action")
            || element.value
            || element.innerText
            || element.textContent
            || "";
        let label = normalizeText(directLabel);
        const parent = element.closest(".menu-card-v2, .rec-card, .service-card, .food-card, .selection-card, .timing-card, .feedback-question, .order-card");
        if (parent) {
            const parentName = parent.querySelector(".food-title, .rec-title, .service-title, .question-text, h3, h4");
            const name = normalizeText(parentName && parentName.textContent);
            if (name && label && label.length < 20 && !label.toLowerCase().includes(name.toLowerCase())) {
                label += " " + name;
            } else if (name && !label) {
                label = name;
            }
        }
        if (!label) {
            const image = element.querySelector("img[alt]");
            label = normalizeText(image && image.getAttribute("alt"));
        }
        return redactPatientIdentifiers(label).slice(0, 180);
    }

    // Ids describe WHAT a control is (label + target), not WHERE it sits in the list, so an id the
    // AI received a moment ago still points at the same control after the page changes.
    function stableId(prefix, element, label, used) {
        const key = [element.tagName, String(label || ""),
            element.getAttribute("href") || element.getAttribute("data-route") || element.getAttribute("data-action")
            || element.id || element.getAttribute("name") || ""].join("|").toLowerCase();
        let hash = 5381;
        for (let i = 0; i < key.length; i++) hash = ((hash << 5) + hash + key.charCodeAt(i)) | 0;
        const base = prefix + (hash >>> 0).toString(36);
        used[base] = (used[base] || 0) + 1;
        return used[base] > 1 ? base + "-" + used[base] : base;
    }

    function pageContext() {
        const usedIds = {};
        const controls = Array.from(document.querySelectorAll("select"))
            .filter(isVisible)
            .filter(isSafeControl)
            .slice(0, 20)
            .map(function (select) {
                const labels = Array.from(select.labels || []).map(function (label) { return label.textContent; });
                return {
                    id: select.id || "",
                    label: redactPatientIdentifiers(select.getAttribute("aria-label") || labels.join(" ") || select.name || select.id),
                    selected: select.options[select.selectedIndex]
                        ? { value: redactPatientIdentifiers(select.value), label: redactPatientIdentifiers(select.options[select.selectedIndex].textContent) }
                        : null,
                    options: Array.from(select.options).slice(0, 60).map(function (option) {
                        return {
                            value: redactPatientIdentifiers(option.value),
                            label: redactPatientIdentifiers(option.textContent),
                            disabled: option.disabled
                        };
                    })
                };
            });
            const fields = Array.from(document.querySelectorAll(
                "input:not([type='hidden']):not([type='password']):not([type='button']):not([type='submit']):not([type='reset']):not([type='checkbox']):not([type='radio']):not([type='file']), textarea, [contenteditable='true']"
            ))
                .filter(isVisible)
                .filter(isSafeField)
                .slice(0, 50)
                .map(function (field, index) {
                    const labels = Array.from(field.labels || []).map(function (label) { return label.textContent; });
                    const targetId = stableId("unified-field-", field, field.getAttribute("aria-label") || labels.join(" ") || field.getAttribute("placeholder") || field.name || field.id || "", usedIds);
                    if (field.getAttribute("data-unified-ai-field") !== targetId) {
                        field.setAttribute("data-unified-ai-field", targetId);
                    }
                    return {
                        targetId: targetId,
                        type: field.type || (field.isContentEditable ? "contenteditable" : "textarea"),
                        label: redactPatientIdentifiers(field.getAttribute("aria-label") || labels.join(" ")
                            || field.getAttribute("placeholder") || field.name || field.id || "Text field"),
                        placeholder: redactPatientIdentifiers(field.getAttribute("placeholder") || "")
                    };
                });
        const choices = Array.from(document.querySelectorAll(
            "input[type='checkbox'], input[type='radio'], [role='checkbox'], [role='radio']"
        ))
            .map(function (choice, index) {
                const labelElement = choice.labels && choice.labels.length
                    ? choice.labels[0]
                    : choice.closest("label") || Array.from(document.querySelectorAll("label[for]"))
                        .find(function (label) { return choice.id && label.htmlFor === choice.id; });
                const target = isVisible(choice) ? choice : labelElement && isVisible(labelElement) ? labelElement : null;
                if (!target || !isSafeField(choice)) return null;
                const targetId = stableId("unified-choice-", choice, normalizeText(labelElement && labelElement.textContent || choice.getAttribute("aria-label") || choice.value || "") + "|" + (choice.name || "") + "|" + (choice.value || ""), usedIds);
                if (target.getAttribute("data-unified-ai-choice") !== targetId) {
                    target.setAttribute("data-unified-ai-choice", targetId);
                }
                const label = normalizeText(labelElement && labelElement.textContent
                    || choice.getAttribute("aria-label") || choice.value || choice.getAttribute("data-label"));
                return {
                    targetId: targetId,
                    label: redactPatientIdentifiers(label || "Choice"),
                    type: choice.type || choice.getAttribute("role"),
                    name: redactPatientIdentifiers(choice.name || choice.getAttribute("name") || ""),
                    value: redactPatientIdentifiers(choice.value || choice.getAttribute("data-value") || ""),
                    checked: choice.checked === true || choice.getAttribute("aria-checked") === "true",
                    disabled: isDisabled(choice)
                };
            })
            .filter(Boolean)
            .slice(0, 100);
        const itemSelector = ".service-card, .food-card, .menu-card-v2, .rec-card, .meal-select-pill, .meal-tab-box, .selection-card, .timing-card, .feedback-question, .order-card, .card, [data-category-id], [data-food-id], [data-order-type], [data-order-mode]";
        const items = Array.from(document.querySelectorAll(itemSelector))
            .filter(isVisible)
            .filter(function (item) { return !item.closest("#headerPatientInfo, .patient-info, .patient-details, [data-patient-info]"); })
            .slice(0, 100)
            .map(function (item) {
                const nameElement = item.querySelector(".food-title, .rec-title, .service-title, .tab-name, .meal-label-name, .question-text, h3, h4");
                const isMenuItem = item.classList.contains("menu-card-v2") || item.classList.contains("rec-card");
                const row = {
                    label: redactPatientIdentifiers(isMenuItem && nameElement
                        ? nameElement.textContent
                        : item.innerText || item.textContent)
                };
                if (nameElement) row.name = redactPatientIdentifiers(nameElement.textContent);
                row.disabled = !!item.disabled || item.classList.contains("disabled-card")
                    || item.getAttribute("aria-disabled") === "true";
                const categoryId = item.getAttribute("data-category-id");
                const foodId = item.getAttribute("data-food-id");
                const route = item.getAttribute("data-route");
                const voiceRoute = item.getAttribute("data-voice-route");
                if (categoryId) row.categoryId = categoryId;
                if (foodId) row.foodId = foodId;
                const meal = item.getAttribute("data-meal-type") || item.getAttribute("data-mealname");
                if (meal) row.meal = redactPatientIdentifiers(meal);
                if (route && route.startsWith("/")) row.route = route.split("?")[0];
                if (voiceRoute && voiceRoute.startsWith("/")) row.voiceRoute = voiceRoute.split("?")[0];
                const orderType = item.getAttribute("data-order-type");
                if (orderType) row.orderType = orderType;
                const orderMode = item.getAttribute("data-order-mode");
                if (orderMode) row.orderMode = orderMode;
                if (item.classList.contains("order-card")) {
                    row.notificationId = item.getAttribute("data-notification-id") || "";
                    row.orderId = item.getAttribute("data-order-id") || "";
                    row.notificationRead = item.classList.contains("read");
                    row.notificationService = item.getAttribute("data-service") || "";
                    row.status = redactPatientIdentifiers(
                        item.querySelector(".status-badge") && item.querySelector(".status-badge").textContent
                    );
                }
                if (item.classList.contains("feedback-question")) {
                    if (item.dataset.questionId) row.feedbackQuestionId = item.dataset.questionId;
                    if (item.dataset.departmentId) row.feedbackDepartmentId = item.dataset.departmentId;
                    if (item.dataset.type) row.feedbackType = item.dataset.type;
                    row.feedbackChoices = Array.from(item.querySelectorAll(".rating-option"))
                        .map(function (option) { return option.dataset.value; })
                        .filter(Boolean);
                }
                if (foodId) {
                    const cartItem = window.currentCart && window.currentCart[String(foodId) + "_" + String(meal || "")];
                    row.quantity = cartItem ? Number(cartItem.qty) || 0 : 0;
                }
                return row;
            })
            .filter(function (item) { return item.label; });
        const actionElements = Array.from(document.querySelectorAll(
            "button, a[href], [role='button'], [role='tab'], summary, input[type='button'], input[type='submit'], input[type='reset'], [onclick], [data-action], [data-route], .service-card, .order-card, .selection-card, .timing-card, .food-card, .menu-card-v2, .rec-card, .meal-select-pill, .meal-tab-box"
        ))
            .filter(function (element) {
                return !element.closest("#unifiedAiFloatingBar");
            })
            .filter(isVisible)
            .slice(0, 150);
        const actions = actionElements
            .map(function (element, index) {
                const label = interactiveLabel(element);
                const route = safeRoute(element);
                const action = element.getAttribute("data-action");
                if (!label) return null;
                const targetId = stableId("unified-action-", element, label, usedIds);
                if (element.getAttribute("data-unified-ai-target") !== targetId) {
                    element.setAttribute("data-unified-ai-target", targetId);
                }
                return {
                    label: label,
                    disabled: isDisabled(element),
                    targetId: targetId,
                    id: element.id || undefined,
                    action: action || undefined,
                    route: route || undefined
                };
            })
            .filter(Boolean);

        return {
            route: window.location.pathname,
            title: redactPatientIdentifiers(document.title),
            headings: Array.from(document.querySelectorAll("h1, h2, h3"))
                .filter(isVisible)
                .slice(0, 20)
                .map(function (heading) { return redactPatientIdentifiers(heading.innerText || heading.textContent); })
                .filter(Boolean),
            controls: controls,
            fields: fields,
            choices: choices,
            items: items,
            actions: actions
        };
    }

    let lastContextJson = "";
    let contextTimer = null;
    function sendPageContext() {
        contextTimer = null;
        const context = pageContext();
        let encoded = JSON.stringify(context);
        while (encoded.length > 18000 && context.items.length > 10) {
            context.items.pop();
            encoded = JSON.stringify(context);
        }
        if (encoded === lastContextJson) return;
        lastContextJson = encoded;
        window.parent.postMessage({ type: "unified_ai_page_context", context: context }, window.location.origin);
    }

    function schedulePageContext() {
        if (contextTimer) clearTimeout(contextTimer);
        contextTimer = setTimeout(sendPageContext, 250);
    }

    function selectVisibleOption(action) {
        const controlKey = normalizeText(action.controlId || action.control || action.controlName || action.label).toLowerCase();
        const optionWasProvided = action.optionValue !== undefined && action.optionValue !== null
            || action.option !== undefined && action.option !== null
            || action.value !== undefined && action.value !== null;
        const requestedOption = normalizeText(action.optionValue !== undefined ? action.optionValue
            : action.option !== undefined ? action.option
                : action.value).toLowerCase();
        if (!controlKey || !optionWasProvided) {
            respond(action, false, null, "A visible dropdown and option are required.");
            return;
        }

        const selects = Array.from(document.querySelectorAll("select")).filter(isVisible).filter(isSafeControl);
        const matchingSelects = selects.filter(function (select) {
            const labels = Array.from(select.labels || []).map(function (label) { return label.textContent; });
            return [select.id, select.name, select.getAttribute("aria-label")].concat(labels)
                .some(function (value) { return normalizeText(value).toLowerCase() === controlKey; });
        });
        if (matchingSelects.length !== 1) {
            respond(action, false, null, matchingSelects.length ? "Dropdown name is ambiguous." : "Visible dropdown was not found.");
            return;
        }

        const select = matchingSelects[0];
        const matchingOptions = Array.from(select.options).filter(function (option) {
            return !option.disabled && (normalizeText(option.value).toLowerCase() === requestedOption
                || normalizeText(option.textContent).toLowerCase() === requestedOption);
        });
        if (matchingOptions.length !== 1) {
            respond(action, false, {
                options: Array.from(select.options).filter(function (option) { return !option.disabled; })
                    .map(function (option) { return { value: option.value, label: redactPatientIdentifiers(option.textContent) }; })
            }, matchingOptions.length ? "Dropdown option is ambiguous." : "Dropdown option was not found.");
            return;
        }

        select.value = matchingOptions[0].value;
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
        schedulePageContext();
        respond(action, true, {
            controlId: select.id || select.name,
            selected: redactPatientIdentifiers(matchingOptions[0].textContent)
        });
    }

    function findUiTarget(attribute, targetId) {
        return Array.from(document.querySelectorAll("[" + attribute + "]")).find(function (element) {
            return element.getAttribute(attribute) === targetId && isVisible(element);
        });
    }

    // Voice actions can arrive while a page is still loading or re-rendering. Instead of failing
    // at once, look again for up to 3 s, and fall back to the visible label when the id is gone.
    function findByLabel(attribute, label) {
        if (attribute !== "data-unified-ai-target") return null;
        const wanted = normalizeText(label).toLowerCase();
        if (!wanted) return null;
        const matches = Array.from(document.querySelectorAll("[" + attribute + "]")).filter(function (element) {
            return isVisible(element) && normalizeText(interactiveLabel(element)).toLowerCase() === wanted;
        });
        return matches.length === 1 ? matches[0] : null;   // never guess between several
    }

    function resolveTarget(attribute, action, callback) {
        const deadline = Date.now() + 3000;
        (function attempt() {
            pageContext();   // re-tag controls so ids reflect the page as it is right now
            const target = findUiTarget(attribute, action.targetId) || findByLabel(attribute, action.label);
            if (target) { callback(target); return; }
            if (Date.now() < deadline) { window.setTimeout(attempt, 150); return; }
            callback(null);
        })();
    }

    function executeVisibleUIAction(action) {
        if (action.action === "ui.click") {
            resolveTarget("data-unified-ai-target", action, function (target) {
                if (!target || isDisabled(target)) {
                    respond(action, false, null, "The selected visible action is no longer available.");
                    return;
                }
                target.scrollIntoView({ behavior: "smooth", block: "center" });
                window.setTimeout(function () {
                    target.click();
                    sendPageContext();
                    respond(action, true, { clicked: interactiveLabel(target) });
                }, 25);
            });
            return;
        }

        if (action.action === "ui.fill") {
            resolveTarget("data-unified-ai-field", action, function (target) {
                if (!target || target.disabled || target.readOnly) {
                    respond(action, false, null, "The selected visible field is no longer available.");
                    return;
                }
                const value = String(action.value == null ? "" : action.value).slice(0, 2000);
                target.scrollIntoView({ behavior: "smooth", block: "center" });
                target.focus({ preventScroll: true });
                if (target.isContentEditable) target.textContent = value;
                else target.value = value;
                target.dispatchEvent(new Event("input", { bubbles: true }));
                target.dispatchEvent(new Event("change", { bubbles: true }));
                schedulePageContext();
                respond(action, true, { field: action.label || target.getAttribute("aria-label") || target.name || target.id });
            });
        }
    }

    function setVisibleChoice(action) {
        resolveTarget("data-unified-ai-choice", action, function (target) {
            applyVisibleChoice(action, target);
        });
    }

    function applyVisibleChoice(action, target) {
        if (!target || isDisabled(target)) {
            respond(action, false, null, "The selected visible choice is no longer available.");
            return;
        }
        const input = target instanceof HTMLInputElement ? target : target.control;
        if (typeof action.checked !== "boolean" && action.checked !== "true" && action.checked !== "false") {
            respond(action, false, null, "A checked state is required for this choice.");
            return;
        }
        const requested = action.checked === true || action.checked === "true";
        const role = target.getAttribute("role");
        const type = input instanceof HTMLInputElement ? input.type : role;
        if (type === "radio" && !requested) {
            respond(action, false, null, "A radio choice can only be selected, not cleared.");
            return;
        }
        const isChecked = function () {
            return input instanceof HTMLInputElement
                ? input.checked
                : target.getAttribute("aria-checked") === "true";
        };
        if (isChecked() !== requested) target.click();
        if (isChecked() !== requested) {
            respond(action, false, null, "The page did not accept the requested choice.");
            return;
        }
        schedulePageContext();
        respond(action, true, {
            name: input instanceof HTMLInputElement ? input.name || "" : "",
            value: input instanceof HTMLInputElement ? input.value || "" : target.getAttribute("data-value") || "",
            checked: isChecked()
        });
    }

    window.UnifiedAIChild = {
        respond: respond,
        resolveRequestCategory: resolveRequestCategory,
        sendPageContext: schedulePageContext,
        showChat: function () {
            window.parent.postMessage({ type: "unified_ai_show_chat" }, window.location.origin);
        },
        showHome: function () {
            window.parent.postMessage({ type: "unified_ai_show_home" }, window.location.origin);
        },
        navigate: function (url) {
            const target = keepUnifiedRoute(url);
            if (!target) throw new Error("Unified AI navigation must stay on this site.");
            if (isUnifiedHomePath(target.pathname)) {
                window.UnifiedAIChild.showHome();
                return;
            }
            window.location.href = target.toString();
        }
    };

    if (window.BedContext && typeof window.BedContext.go === "function" && typeof window.BedContext.url === "function") {
        window.BedContext.go = function (page, extra) {
            window.UnifiedAIChild.navigate(window.BedContext.url(page, extra));
        };
    }

    document.addEventListener("click", function (event) {
        const element = event.target instanceof Element ? event.target : null;
        const link = element && element.closest("a[href]");
        if (!link || link.hasAttribute("download") || link.target === "_blank") return;
        const target = keepUnifiedRoute(link.href);
        if (!target) return;
        if (isUnifiedHomePath(target.pathname)) {
            event.preventDefault();
            window.UnifiedAIChild.showHome();
            return;
        }
        link.href = target.toString();
    }, true);

    document.addEventListener("submit", function (event) {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) return;
        const target = keepUnifiedRoute(form.action || window.location.href);
        if (!target) return;
        if (form.method.toLowerCase() === "get") {
            form.action = target.toString();
            return;
        }

        ["BedInfo", "UnifiedAI"].forEach(function (name) {
            let input = form.querySelector('input[type="hidden"][name="' + name + '"]');
            const value = target.searchParams.get(name);
            if (!input && !value) return;
            if (!input) {
                input = document.createElement("input");
                input.type = "hidden";
                input.name = name;
                form.appendChild(input);
            }
            if (value) input.value = value;
        });
    }, true);

    window.addEventListener("message", function (event) {
        if (event.source !== window.parent || event.origin !== window.location.origin) return;
        if (!event.data || event.data.type !== "unified_ai_action") return;

        window.dispatchEvent(new CustomEvent("unified-ai:action", {
            detail: event.data.action
        }));
    });

    window.addEventListener("unified-ai:action", function (event) {
        const action = event.detail;
        if (!action) return;
        if (action.action === "ui.select") selectVisibleOption(action);
        else if (action.action === "ui.set_choice") setVisibleChoice(action);
        else if (action.action === "ui.click" || action.action === "ui.fill") executeVisibleUIAction(action);
    });

    document.addEventListener("change", schedulePageContext, true);
    document.addEventListener("input", schedulePageContext, true);
    document.addEventListener("click", schedulePageContext, true);
    new MutationObserver(schedulePageContext).observe(document.body, {
        childList: true,
        attributes: true,
        subtree: true,
        characterData: true
    });

    window.addEventListener("unified-ai:action-result", function (event) {
        const detail = event.detail || {};
        respond(detail.action, detail.success, detail.result, detail.error);
    });

    window.parent.postMessage({ type: "unified_ai_frame_ready" }, window.location.origin);
    schedulePageContext();
})();
