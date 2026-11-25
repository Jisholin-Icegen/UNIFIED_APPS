(function () {
    const params = new URLSearchParams(window.location.search);
    let underHome = false;
    try { underHome = window.parent !== window && !!window.parent.UnifiedAIHost; } catch (error) { underHome = false; }
    if (window.parent === window && !underHome && params.get("UnifiedAI") !== "1" && params.get("Unified") !== "1") return;

    let isUnloading = false;
    window.addEventListener("beforeunload", function () { isUnloading = true; });
    window.addEventListener("pagehide", function () { isUnloading = true; });

    function keepUnifiedRoute(url) {
        const target = new URL(url, window.location.href);
        if (target.protocol !== window.location.protocol || target.hostname !== window.location.hostname) return null;
        if (target.port !== window.location.port) target.port = window.location.port;
        if (target.origin !== window.location.origin) return null;
        if (/^\/FoodDining(?:\/Index)?\/?$/i.test(target.pathname)) {
            target.pathname = "/FoodDining/FoodDining";
        }
        const bedContext = window.BedContext && window.BedContext.get ? window.BedContext.get() : {};
        const currentParams = new URLSearchParams(window.location.search);
        const bedInfo = target.searchParams.get("BedInfo") || currentParams.get("BedInfo") || bedContext.bedInfo || sessionStorage.getItem("bedInfo");
        const tenantId = target.searchParams.get("XTenantID") || currentParams.get("XTenantID") || bedContext.tenantId || sessionStorage.getItem("XTenantID");
        const region = target.searchParams.get("region") || currentParams.get("region") || bedContext.region || sessionStorage.getItem("region");
        if (bedInfo) {
            target.searchParams.set("BedInfo", bedInfo);
            try { sessionStorage.setItem("bedInfo", bedInfo); } catch (e) { }
        }
        if (tenantId) {
            target.searchParams.set("XTenantID", tenantId);
            try { sessionStorage.setItem("XTenantID", tenantId); } catch (e) { }
        }
        if (region) {
            target.searchParams.set("region", region);
            try { sessionStorage.setItem("region", region); } catch (e) { }
        }
        target.searchParams.set("Unified", "1");
        target.searchParams.set("UnifiedAI", "1");
        return target;
    }

    if (params.get("UnifiedAI") !== "1" || !params.get("BedInfo")) {
        try {
            const fixedUrl = keepUnifiedRoute(window.location.href);
            if (fixedUrl) window.history.replaceState(window.history.state, "", fixedUrl.toString());
        } catch (error) { }
    }

    if (isUnifiedHomePath(window.location.pathname)) {
        window.parent.postMessage({ type: "unified_ai_show_home" }, window.location.origin);
        return;
    }

    (function contentEntrance() {
        const started = Date.now();
        function watch(element) {
            if (!element || element.__uaiWatched || element.childElementCount > 0) return;
            element.__uaiWatched = true;
            const observer = new MutationObserver(function () {
                if (element.childElementCount === 0) return;
                observer.disconnect();
                if (Date.now() - started < 900) return;
                element.classList.add("uai-replay");
                window.setTimeout(function () { element.classList.remove("uai-replay"); }, 650);
            });
            observer.observe(element, { childList: true });
        }
        function init() {
            document.querySelectorAll(".app-wrapper > .content, .app-wrapper > #servicesContainer, #pageContent").forEach(watch);
        }
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
        else init();
    })();

    const BLOCKED_LABEL_REGEX = /\b(log\s*out|logout|log\s*off|sign\s*out|signout|sign\s*off|end\s*(the\s*)?(call|session)|hang\s*up|disconnect\s*call|delete\s*account|exit\s*app)\b/i;
    const BLOCKED_ROUTE_REGEX = /^\/(?:account\/)?(?:log-?out|log-?off|sign-?out|log-?in|prelanding)(?:\/|\?|$)/i;
    const BLOCKED_HINT_REGEX = /log-?out|sign-?out|log-?off|end-?call|hang-?up/i;
    const ORDER_URL_REGEX = /\/(?:[a-z]*order[a-z]*|place[a-z]*|submit[a-z]*|raise[a-z]*|request[a-z]*|checkout|[a-z]*feedback[a-z]*)(?:[\/?]|$)/i;
    const ORDER_URL_EXCLUDE_REGEX = /cancel|delete|remove|clear|update|cart|getorder|list|search|load|fetch|status|history|myorders/i;

    let registry = {};
    let registryCount = 0;
    let activeRequestId = "";

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

    function neutralText(value) {
        return normalizeText(value).toLowerCase().replace(/[0-9\u20B9$\u20AC\u00A3.,:%]+/g, " ").replace(/\s+/g, " ").trim();
    }

    function slugify(value, maxLen) {
        return normalizeText(value)
            .toLowerCase()
            .replace(/^\+/, "plus-")
            .replace(/^[-−–]/, "minus-")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, maxLen || 32);
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

    function buildMeaningfulSlug(element, label, extra) {
        const route = safeRoute(element);
        if (route) {
            const routeSlug = slugify(route.replace(/^\//, "").replace(/\//g, "-"), 36);
            if (routeSlug) return "nav-" + routeSlug;
        }

        const food = element.closest("[data-food-id]");
        if (food) {
            const fId = slugify(food.getAttribute("data-food-id") || "", 16);
            const titleEl = food.querySelector(".food-title, .rec-title, h3, h4");
            const fName = slugify(titleEl ? titleEl.textContent : "", 20);
            const rawBtn = normalizeText(element.getAttribute("aria-label") || element.innerText || element.textContent || "");
            let op = "item";
            if (/^\+/.test(rawBtn)) op = "plus";
            else if (/^[-−–]/.test(rawBtn)) op = "minus";
            else if (/info|detail|nutrition|calor/i.test(rawBtn)) op = "info";
            else if (rawBtn) op = slugify(rawBtn, 16) || "select";
            const mealEl = element.closest("[data-meal-type], [data-mealname]") || food;
            const meal = slugify(mealEl.getAttribute("data-meal-type") || mealEl.getAttribute("data-mealname") || "", 12);
            return ["food", fName || fId, op, meal].filter(Boolean).join("-");
        }

        const cat = element.closest("[data-category-id]");
        if (cat) {
            const cName = slugify(label || cat.getAttribute("data-category-id") || "", 28);
            if (cName) return "cat-" + cName;
        }

        const order = element.closest("[data-order-id], [data-notification-id]");
        if (order) {
            const oId = slugify(order.getAttribute("data-order-id") || order.getAttribute("data-notification-id") || "", 16);
            const oAct = slugify(label, 20);
            return ["order", oId, oAct].filter(Boolean).join("-");
        }

        const explicit = slugify(
            element.getAttribute("data-action") ||
            element.getAttribute("data-order-mode") ||
            element.getAttribute("data-order-type") ||
            element.id ||
            element.getAttribute("name") ||
            "",
            32
        );
        if (explicit && !/^[a-f0-9-]{16,}$/i.test(explicit)) {
            const extraSlug = slugify(extra || "", 16);
            return extraSlug ? explicit + "-" + extraSlug : explicit;
        }

        const headingEl = element.querySelector("h1, h2, h3, h4, .service-title, .selection-title, .timing-title, .card-title");
        const primaryText = headingEl ? headingEl.textContent : label;
        const labelSlug = slugify(primaryText, 32);
        const extraSlug = slugify(extra || "", 16);
        if (labelSlug) return extraSlug ? labelSlug + "-" + extraSlug : labelSlug;

        return "control";
    }

    function makeId(prefix, element, label, used, extra) {
        const pageSlug = slugify(window.location.pathname.split("/").filter(Boolean).pop() || "page", 18);
        const meaningful = buildMeaningfulSlug(element, label, extra);
        const key = pageSlug + "-" + meaningful;
        const base = prefix + key;
        used[base] = (used[base] || 0) + 1;
        return { id: used[base] > 1 ? base + "-" + used[base] : base, key: key };
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

    function cardName(element) {
        const parent = element.closest(".menu-card-v2, .rec-card, .service-card, .food-card, .selection-card, .timing-card, .feedback-question, .order-card");
        const nameElement = parent && parent.querySelector(".food-title, .rec-title, .service-title, .question-text, h3, h4");
        return redactPatientIdentifiers(normalizeText(nameElement && nameElement.textContent)).slice(0, 60);
    }

    function foodScope(element) {
        const food = element.closest("[data-food-id]");
        if (!food) return null;
        const mealElement = element.closest("[data-meal-type], [data-mealname]") || food;
        return {
            foodId: food.getAttribute("data-food-id") || "",
            meal: redactPatientIdentifiers(mealElement.getAttribute("data-meal-type") || mealElement.getAttribute("data-mealname") || "")
        };
    }

    function cartContext() {
        const cart = window.currentCart;
        const lines = [];
        let count = 0;
        const hasCartObject = !!cart && typeof cart === "object";
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
                    name: redactPatientIdentifiers(entry.name || entry.foodName || entry.title || "").slice(0, 60)
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
            .map(function (field) {
                const labels = Array.from(field.labels || []).map(function (label) { return label.textContent; });
                const fieldLabel = redactPatientIdentifiers(field.getAttribute("aria-label") || labels.join(" ")
                    || field.getAttribute("placeholder") || field.name || field.id || "Text field");
                const ids = makeId("field-", field, fieldLabel, usedIds, "");
                tag(field, "data-unified-ai-field", ids);
                return {
                    targetId: ids.id,
                    type: field.type || (field.isContentEditable ? "contenteditable" : "textarea"),
                    label: fieldLabel,
                    placeholder: redactPatientIdentifiers(field.getAttribute("placeholder") || "")
                };
            });

        const choices = Array.from(document.querySelectorAll(
            "input[type='checkbox'], input[type='radio'], [role='checkbox'], [role='radio']"
        ))
            .map(function (choice) {
                const labelElement = choice.labels && choice.labels.length
                    ? choice.labels[0]
                    : choice.closest("label") || Array.from(document.querySelectorAll("label[for]"))
                        .find(function (label) { return choice.id && label.htmlFor === choice.id; });
                const target = isVisible(choice) ? choice : labelElement && isVisible(labelElement) ? labelElement : null;
                if (!target || !isSafeField(choice)) return null;
                const label = redactPatientIdentifiers(normalizeText(labelElement && labelElement.textContent
                    || choice.getAttribute("aria-label") || choice.value || choice.getAttribute("data-label")) || "Choice");
                if (isBlockedElement(choice, label, "")) return null;
                const ids = makeId("choice-", choice, label, usedIds, (choice.name || "") + "-" + (choice.value || ""));
                tag(target, "data-unified-ai-choice", ids);
                return {
                    targetId: ids.id,
                    label: label,
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
            .slice(0, 60)
            .map(function (item) {
                const nameElement = item.querySelector(".food-title, .rec-title, .service-title, .tab-name, .meal-label-name, .question-text, h3, h4");
                const isMenuItem = item.classList.contains("menu-card-v2") || item.classList.contains("rec-card");
                const row = {
                    label: redactPatientIdentifiers(isMenuItem && nameElement
                        ? nameElement.textContent
                        : item.innerText || item.textContent).slice(0, 120)
                };
                if (nameElement) row.name = redactPatientIdentifiers(nameElement.textContent).slice(0, 80);
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
                if (isBlockedElement(item, row.label, row.route)) return null;
                return row;
            })
            .filter(function (item) { return item && item.label; });

        const actionElements = Array.from(document.querySelectorAll(
            "button, a[href], [role='button'], [role='tab'], summary, input[type='button'], input[type='submit'], input[type='reset'], [onclick], [data-action], [data-route], .service-card, .order-card, .selection-card, .timing-card, .food-card, .menu-card-v2, .rec-card, .meal-select-pill, .meal-tab-box"
        ))
            .filter(function (element) {
                return !element.closest("#unifiedAiFloatingBar")
                    && element.id !== "mobileNotificationTrigger";
            })
            .filter(isVisible)
            .slice(0, 150);

        const actions = actionElements
            .map(function (element) {
                const label = interactiveLabel(element);
                if (!label) return null;
                const route = safeRoute(element);
                if (isBlockedElement(element, label, route)) return null;
                const dataAction = element.getAttribute("data-action");
                const ids = makeId("btn-", element, label, usedIds, "");
                tag(element, "data-unified-ai-target", ids);
                const entry = {
                    label: label.slice(0, 120),
                    disabled: isDisabled(element),
                    targetId: ids.id,
                    id: element.id || undefined,
                    action: dataAction || undefined,
                    route: route || undefined
                };
                const group = cardName(element);
                if (group) entry.group = group;
                const scope = foodScope(element);
                if (scope && scope.foodId) {
                    entry.foodId = scope.foodId;
                    if (scope.meal) entry.meal = scope.meal;
                }
                return entry;
            })
            .filter(Boolean);

        const context = {
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

        const cart = cartContext();
        if (cart) context.cart = cart;
        return context;
    }

    let lastContextJson = "";
    let contextTimer = null;
    function sendPageContext(force) {
        if (isUnloading) return;
        if (contextTimer) {
            clearTimeout(contextTimer);
            contextTimer = null;
        }
        const context = pageContext();
        if (!context || (!context.actions.length && !context.headings.length && !context.items.length)) return;
        let encoded = JSON.stringify(context);
        while (encoded.length > 14000 && context.items.length > 10) {
            context.items.pop();
            encoded = JSON.stringify(context);
        }
        if (!force && encoded === lastContextJson) return;
        lastContextJson = encoded;
        window.parent.postMessage({ type: "unified_ai_page_context", context: context }, window.location.origin);
    }

    function schedulePageContext(delay) {
        if (isUnloading) return;
        if (contextTimer) clearTimeout(contextTimer);
        contextTimer = setTimeout(function () { sendPageContext(false); }, typeof delay === "number" ? delay : 20);
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
        sendPageContext(true);
        respond(action, true, {
            controlId: select.id || select.name,
            selected: redactPatientIdentifiers(matchingOptions[0].textContent)
        });
    }

    function findUiTarget(attribute, targetId) {
        if (!targetId) return null;
        return Array.from(document.querySelectorAll("[" + attribute + "]")).find(function (element) {
            return element.getAttribute(attribute) === targetId && isVisible(element);
        }) || null;
    }

    function findByKey(attribute, keyHash) {
        if (!keyHash) return null;
        const matches = Array.from(document.querySelectorAll("[" + attribute + "][data-uai-key='" + keyHash + "']")).filter(isVisible);
        return matches.length === 1 ? matches[0] : null;
    }

    function findByLabel(attribute, label) {
        if (attribute !== "data-unified-ai-target") return null;
        const wanted = normalizeText(label).toLowerCase();
        if (!wanted) return null;
        const candidates = Array.from(document.querySelectorAll("[" + attribute + "]")).filter(isVisible);
        const exact = candidates.filter(function (element) {
            return normalizeText(interactiveLabel(element)).toLowerCase() === wanted;
        });
        if (exact.length === 1) return exact[0];
        if (exact.length > 1) return null;
        const loose = neutralText(wanted);
        if (!loose) return null;
        const approximate = candidates.filter(function (element) {
            return neutralText(interactiveLabel(element)) === loose;
        });
        if (approximate.length === 1) return approximate[0];
        const prefix = candidates.filter(function (element) {
            const candidateLabel = normalizeText(interactiveLabel(element)).toLowerCase();
            return candidateLabel.indexOf(wanted) === 0 || wanted.indexOf(candidateLabel) === 0;
        });
        return prefix.length === 1 ? prefix[0] : null;
    }

    function resolveTarget(attribute, action, callback) {
        if (!action.targetId && !action.label) { callback(null); return; }
        const deadline = Date.now() + 1200;
        const strippedKey = action.targetId ? action.targetId.replace(/^(btn|field|choice|unified-action|unified-field|unified-choice)-/, "") : "";
        const previousKey = registry[action.targetId] || strippedKey;
        (function attempt() {
            pageContext();
            const target = findUiTarget(attribute, action.targetId)
                || findByKey(attribute, previousKey)
                || findByLabel(attribute, action.label);
            if (target) { callback(target); return; }
            if (Date.now() < deadline) { window.setTimeout(attempt, 80); return; }
            callback(null);
        })();
    }

    function executeVisibleUIAction(action) {
        if (action.request_id && action.request_id === activeRequestId) return;
        if (action.action === "ui.click") {
            if (!action.targetId && !action.label) {
                respond(action, false, null, "ui.click needs a targetId or a label.");
                return;
            }
            resolveTarget("data-unified-ai-target", action, function (target) {
                if (!target || isDisabled(target)) {
                    respond(action, false, null, "The selected visible action is no longer available.");
                    return;
                }
                const targetLabel = interactiveLabel(target);
                if (isBlockedElement(target, targetLabel, safeRoute(target))) {
                    respond(action, false, null, "This action is blocked for patient session safety.");
                    return;
                }
                if (action.request_id) activeRequestId = action.request_id;
                const link = target.closest("a[href]") || (target.tagName === "A" ? target : null);
                if (link && link.getAttribute("href") && link.getAttribute("href") !== "#") {
                    const unified = keepUnifiedRoute(link.href);
                    if (unified) link.href = unified.toString();
                }
                target.scrollIntoView({ behavior: "instant", block: "center" });
                respond(action, true, { clicked: targetLabel });
                target.click();
                setTimeout(function () { if (!isUnloading) sendPageContext(true); }, 40);
            });
            return;
        }

        if (action.action === "ui.fill") {
            resolveTarget("data-unified-ai-field", action, function (target) {
                if (!target || target.disabled || target.readOnly) {
                    respond(action, false, null, "The selected visible field is no longer available.");
                    return;
                }
                if (action.request_id) activeRequestId = action.request_id;
                const value = String(action.value == null ? "" : action.value).slice(0, 2000);
                target.scrollIntoView({ behavior: "instant", block: "center" });
                target.focus({ preventScroll: true });
                if (target.isContentEditable) target.textContent = value;
                else target.value = value;
                target.dispatchEvent(new Event("input", { bubbles: true }));
                target.dispatchEvent(new Event("change", { bubbles: true }));
                sendPageContext(true);
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
        sendPageContext(true);
        respond(action, true, {
            name: input instanceof HTMLInputElement ? input.name || "" : "",
            value: input instanceof HTMLInputElement ? input.value || "" : target.getAttribute("data-value") || "",
            checked: isChecked()
        });
    }

    function emitConfirmation(detail) {
        try {
            const parentWindow = window.parent;
            parentWindow.dispatchEvent(new parentWindow.CustomEvent("unified-ai:order-confirmed", { detail: detail }));
        } catch (error) { }
    }

    function isOrderUrl(url) {
        try {
            const path = new URL(String(url || ""), window.location.href).pathname;
            return ORDER_URL_REGEX.test(path) && !ORDER_URL_EXCLUDE_REGEX.test(path);
        } catch (error) {
            return false;
        }
    }

    function handleOrderResponse(url, status, data) {
        if (data && typeof data === "object") {
            const failed = [data.success, data.Success, data.isSuccess, data.IsSuccess, data.ok].some(function (flag) { return flag === false; })
                || !!data.error || !!data.Error;
            if (failed) return;
        }
        let path = "";
        try { path = new URL(String(url || ""), window.location.href).pathname; } catch (error) { }
        const orderId = data && typeof data === "object"
            ? data.orderId || data.OrderId || data.requestId || data.RequestId || data.id || data.Id || ""
            : "";
        emitConfirmation({ source: "network", path: path, status: String(status || ""), order_id: String(orderId || "") });
        sendPageContext(true);
    }

    if (typeof window.fetch === "function") {
        const originalFetch = window.fetch.bind(window);
        window.fetch = function (input, init) {
            const promise = originalFetch(input, init);
            try {
                const method = String((init && init.method) || (input && input.method) || "GET").toUpperCase();
                const url = typeof input === "string" ? input : (input && input.url) || "";
                if (method === "POST" && isOrderUrl(url)) {
                    promise.then(function (response) {
                        if (!response.ok) return;
                        response.clone().json().then(
                            function (data) { handleOrderResponse(url, response.status, data); },
                            function () { handleOrderResponse(url, response.status, null); }
                        );
                    }, function () { });
                }
            } catch (error) { }
            return promise;
        };
    }

    if (window.XMLHttpRequest) {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function (method, url) {
            this.__uaiMethod = String(method || "GET").toUpperCase();
            this.__uaiUrl = url;
            return originalOpen.apply(this, arguments);
        };
        XMLHttpRequest.prototype.send = function () {
            const xhr = this;
            if (xhr.__uaiMethod === "POST" && isOrderUrl(xhr.__uaiUrl)) {
                xhr.addEventListener("load", function () {
                    if (xhr.status < 200 || xhr.status >= 300) return;
                    let data = null;
                    try { data = JSON.parse(xhr.responseText); } catch (error) { }
                    handleOrderResponse(xhr.__uaiUrl, xhr.status, data);
                });
            }
            return originalSend.apply(this, arguments);
        };
    }

    window.UnifiedAIChild = {
        respond: respond,
        resolveRequestCategory: resolveRequestCategory,
        sendPageContext: function () { sendPageContext(true); },
        confirm: function (detail) {
            emitConfirmation(Object.assign({ source: "page" }, detail || {}));
            sendPageContext(true);
        },
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
        if (link.target === "_top" || link.target === "_parent") link.target = "_self";
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
        if (form.target === "_top" || form.target === "_parent") form.target = "_self";
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

    document.addEventListener("change", function () { sendPageContext(false); }, true);
    document.addEventListener("input", function () { schedulePageContext(20); }, true);
    document.addEventListener("click", function () { sendPageContext(false); }, true);
    new MutationObserver(function () { schedulePageContext(20); }).observe(document.body, {
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
    sendPageContext(true);
})();