(function () {
    "use strict";

    var host = window.UnifiedAIHost;
    if (!host || typeof host.handleAction !== "function" || window.UnifiedAIBridge) return;

    var API = "/api/ai-bridge/sessions/";
    var SESSION_KEY = "dial50_ai_bridge_session";
    var DEVICE_KEY = "dial50_ai_device_id";

    function uuid() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0;
            return (c === "x" ? r : (r & 3 | 8)).toString(16);
        });
    }

    function stored(storage, key) {
        try {
            var value = storage.getItem(key);
            if (!value) { value = uuid(); storage.setItem(key, value); }
            return value;
        } catch (error) {
            return uuid();
        }
    }

    var sessionId = stored(window.localStorage, SESSION_KEY);
    var deviceId = stored(window.localStorage, DEVICE_KEY);
    var base = API + encodeURIComponent(sessionId);

    function bedId() {
        try { return typeof window.getWidgetUserId === "function" ? String(window.getWidgetUserId() || "") : ""; }
        catch (error) { return ""; }
    }

    function callActive() {
        try { return !!(host.isRealCallActive && host.isRealCallActive()); }
        catch (error) { return false; }
    }

    var lastSignature = "";
    var lastPushAt = 0;
    var pushTimer = null;

    function pushScreen(force) {
        if (pushTimer) {
            clearTimeout(pushTimer);
            pushTimer = null;
        }
        var context = host.getCurrentContext && host.getCurrentContext();
        if (!context) return;
        var active = callActive();
        var signature;
        try { signature = JSON.stringify(context) + "|" + (active ? "1" : "0"); } catch (error) { return; }
        if (!force && signature === lastSignature) return;

        var body = JSON.stringify({
            bed_id: bedId(),
            device_id: deviceId,
            call_active: active,
            screen: context
        });
        lastSignature = signature;
        lastPushAt = Date.now();
        fetch(base + "/screen", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: body,
            credentials: "same-origin",
            keepalive: body.length < 60000
        }).catch(function () { lastSignature = ""; });
    }

    function schedulePush(delay) {
        if (pushTimer) return;
        var wait = Math.max(delay || 0, 80 - (Date.now() - lastPushAt), 0);
        pushTimer = setTimeout(function () { pushScreen(false); }, wait);
    }

    window.addEventListener("unified-ai:context-changed", function () { pushScreen(false); });
    window.addEventListener("unified-ai:cart-changed", function () { pushScreen(true); });
    setInterval(function () { if (document.visibilityState === "visible") pushScreen(false); }, 25000);
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState !== "visible") return;
        openStream();
        pushScreen(false);
    });
    window.addEventListener("online", function () { openStream(); });

    var seenRequests = [];
    var actionNames = {};
    function alreadyHandled(id) {
        if (!id) return false;
        if (seenRequests.indexOf(id) !== -1) return true;
        seenRequests.push(id);
        if (seenRequests.length > 200) seenRequests.shift();
        return false;
    }

    var source = null;
    var connected = false;

    function onAction(event) {
        var action;
        try { action = JSON.parse(event.data); } catch (error) { return; }
        if (!action || typeof action.action !== "string" || alreadyHandled(action.request_id)) return;
        if (action.request_id) actionNames[action.request_id] = action.action;
        lastActionAt = Date.now();
        routeAtAction = currentRoute();
        host.handleAction(action);
    }

    var lastActionAt = 0;
    var routeAtAction = "";
    var pendingList = null;
    var pendingTimer = null;

    function flushPending() {
        clearTimeout(pendingTimer);
        var list = pendingList;
        pendingList = null;
        if (list) showSuggestions(list);
    }

    function onSuggestions(event) {
        var payload;
        try { payload = JSON.parse(event.data); } catch (error) { return; }
        var list = payload && payload.suggestions;
        if (!Array.isArray(list) || !list.length) return;
        if (Date.now() - lastActionAt < 4000) {
            pendingList = list;
            clearTimeout(pendingTimer);
            pendingTimer = setTimeout(flushPending, 1800);
            return;
        }
        showSuggestions(list);
    }

    function openStream() {
        if (source && source.readyState !== 2) return;
        if (source) { try { source.close(); } catch (error) { } source = null; }
        source = new EventSource(base + "/events");
        source.addEventListener("action", onAction);
        source.addEventListener("suggestions", onSuggestions);
        source.onopen = function () {
            connected = true;
            if (Date.now() - lastPushAt > 500) {
                lastSignature = "";
                pushScreen(true);
            }
        };
        source.onerror = function () {
            connected = false;
            if (source && source.readyState === 2) {
                source.close();
                source = null;
                setTimeout(openStream, 2000);
            }
        };
    }

    var tray = null;
    var trayTimer = null;
    var trayRoute = "";

    var style = document.createElement("style");
    style.textContent =
        "#unifiedAiSuggestions{position:fixed;left:50%;bottom:112px;transform:translateX(-50%);z-index:100004;display:flex;" +
        "flex-wrap:wrap;gap:8px;justify-content:center;align-items:center;max-width:min(640px,94vw);padding:6px;" +
        "animation:uaiChipsIn .28s cubic-bezier(.22,1,.36,1) both}" +
        "#unifiedAiSuggestions[hidden]{display:none}" +
        "#unifiedAiSuggestions button{border:1px solid #d1d5db;background:#fff;color:#111827;border-radius:999px;padding:10px 16px;" +
        "font:600 15px/1.2 inherit;box-shadow:0 4px 14px rgba(0,0,0,.18);cursor:pointer;min-height:44px}" +
        "#unifiedAiSuggestions button:active{transform:scale(.97)}" +
        "#unifiedAiSuggestions .uai-chip-close{background:#111827;color:#fff;border-color:#111827;padding:10px 14px}" +
        "@keyframes uaiChipsIn{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}" +
        "@media (prefers-reduced-motion:reduce){#unifiedAiSuggestions{animation:none}}";
    document.head.appendChild(style);

    function hideSuggestions() {
        clearTimeout(trayTimer);
        if (tray) tray.hidden = true;
    }

    function currentRoute() {
        var context = host.getCurrentContext && host.getCurrentContext();
        return context && context.route ? String(context.route) : "";
    }

    function showSuggestions(list) {
        if (!Array.isArray(list) || !list.length) return;
        if (!tray) {
            tray = document.createElement("div");
            tray.id = "unifiedAiSuggestions";
            tray.setAttribute("role", "group");
            tray.setAttribute("aria-label", "Suggestions");
            document.body.appendChild(tray);
        }
        tray.replaceChildren();
        list.slice(0, 8).forEach(function (item) {
            if (!item || !item.label || !item.action) return;
            var button = document.createElement("button");
            button.type = "button";
            button.textContent = item.label;
            button.addEventListener("click", function () {
                hideSuggestions();
                var action = Object.assign({}, item.action, { request_id: "suggestion-" + Date.now() });
                host.handleAction(action);
            });
            tray.appendChild(button);
        });
        var close = document.createElement("button");
        close.type = "button";
        close.className = "uai-chip-close";
        close.setAttribute("aria-label", "Hide suggestions");
        close.textContent = "\u00D7";
        close.addEventListener("click", hideSuggestions);
        tray.appendChild(close);

        trayRoute = currentRoute();
        tray.hidden = false;
        clearTimeout(trayTimer);
        trayTimer = setTimeout(hideSuggestions, 30000);
    }

    window.addEventListener("unified-ai:context-changed", function () {
        if (pendingList && currentRoute() !== routeAtAction) { flushPending(); return; }
        if (tray && !tray.hidden && currentRoute() !== trayRoute) hideSuggestions();
    });

    function postJson(path, payload, retry) {
        fetch(base + path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            keepalive: true,
            body: JSON.stringify(payload)
        }).then(function (response) {
            if (!response.ok && retry) setTimeout(function () { postJson(path, payload, false); }, 400);
        }).catch(function () {
            if (retry) setTimeout(function () { postJson(path, payload, false); }, 400);
        });
    }

    window.addEventListener("unified-ai:action-result", function (event) {
        var detail = event.detail || {};
        if (!detail.request_id) return;
        postJson("/results", {
            request_id: detail.request_id,
            action: detail.action || actionNames[detail.request_id] || "",
            success: !!detail.success,
            error: detail.error || "",
            result: detail.result === undefined ? null : detail.result
        }, true);
        schedulePush(60);
    });

    var lastConfirmKey = "";
    var lastConfirmAt = 0;

    window.addEventListener("unified-ai:order-confirmed", function (event) {
        var detail = event.detail || {};
        var key = [detail.source || "", detail.path || "", detail.order_id || detail.orderId || ""].join("|");
        if (key === lastConfirmKey && Date.now() - lastConfirmAt < 1500) return;
        lastConfirmKey = key;
        lastConfirmAt = Date.now();
        postJson("/confirmations", {
            source: detail.source || "page",
            path: detail.path || "",
            status: detail.status || "",
            order_id: String(detail.order_id || detail.orderId || ""),
            message: detail.message || "",
            detail: detail.detail === undefined ? null : detail.detail
        }, true);
        pushScreen(true);
    });

    window.UnifiedAIBridge = {
        sessionId: sessionId,
        deviceId: deviceId,
        isConnected: function () { return connected; },
        pushNow: function () { pushScreen(true); },
        confirm: function (detail) {
            window.dispatchEvent(new CustomEvent("unified-ai:order-confirmed", { detail: detail || {} }));
        }
    };

    pushScreen(true);
    openStream();
})();