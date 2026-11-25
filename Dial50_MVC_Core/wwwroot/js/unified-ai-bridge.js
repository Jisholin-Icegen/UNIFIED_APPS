(function () {
    "use strict";

    var host = window.UnifiedAIHost;
    if (!host || typeof host.handleAction !== "function" || window.UnifiedAIBridge) return;

    var API = "/api/ai-bridge/sessions/";
    var SESSION_KEY = "dial50_ai_bridge_session";
    var DEVICE_KEY = "dial50_ai_device_id";

    var MAX_RECONNECTS = 0;
    var RECONNECT_DELAY_MS = 1500;
    var CONNECT_TIMEOUT_MS = 15000;

    function uuid() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID();
        }
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0;
            return (c === "x" ? r : (r & 3 | 8)).toString(16);
        });
    }

    function stored(storage, key) {
        try {
            var value = storage.getItem(key);
            if (!value) {
                value = uuid();
                storage.setItem(key, value);
            }
            return value;
        } catch (error) {
            return uuid();
        }
    }

    var sessionId = stored(window.localStorage, SESSION_KEY);
    var deviceId = stored(window.localStorage, DEVICE_KEY);
    var base = API + encodeURIComponent(sessionId);

    function bedId() {
        try {
            return typeof window.getWidgetUserId === "function"
                ? String(window.getWidgetUserId() || "")
                : "";
        } catch (error) {
            return "";
        }
    }

    function callActive() {
        try {
            return !!(host.isRealCallActive && host.isRealCallActive());
        } catch (error) {
            return false;
        }
    }

    var ws = null;
    var connected = false;
    var shouldBeConnected = false;
    var manualDisconnect = false;

    var attempted = false;
    var reconnectCount = 0;

    var reconnectTimer = null;
    var connectTimer = null;
    var pingTimer = null;
    var pushTimer = null;

    var outboundQueue = [];
    var lastSignature = "";

    var seenRequests = [];
    var actionNames = {};

    var lastActionAt = 0;
    var routeAtAction = "";
    var pendingList = null;
    var pendingTimer = null;

    var tray = null;
    var trayTimer = null;
    var trayRoute = "";

    function wantsConnection() {
        return shouldBeConnected || (!manualDisconnect && callActive());
    }

    function wsUrl() {
        var url = new URL(base + "/ws", window.location.origin);
        url.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        url.searchParams.set("bed_id", bedId());
        url.searchParams.set("device_id", deviceId);

        var pageParams = new URLSearchParams(window.location.search);
        var tenantId = pageParams.get("XTenantID");
        var region = pageParams.get("region");

        if (tenantId) {
            url.searchParams.set("XTenantID", tenantId);
        }
        if (region) {
            url.searchParams.set("region", region);
        }

        return url.toString();
    }


    function clearReconnectTimer() {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
    }

    function clearConnectTimer() {
        if (connectTimer) {
            clearTimeout(connectTimer);
            connectTimer = null;
        }
    }

    function scheduleReconnect() {
        if (MAX_RECONNECTS <= 0) return;
        if (!wantsConnection() || reconnectTimer || reconnectCount >= MAX_RECONNECTS) return;
        reconnectCount += 1;
        console.warn("[UnifiedAIBridge] Reconnect " + reconnectCount + "/" + MAX_RECONNECTS + " in " + RECONNECT_DELAY_MS + "ms");
        reconnectTimer = setTimeout(function () {
            reconnectTimer = null;
            attempted = false;
            openSocket();
        }, RECONNECT_DELAY_MS);
    }

    function transmit(text) {
        if (!ws || ws.readyState !== WebSocket.OPEN) return false;
        try {
            ws.send(text);
            return true;
        } catch (error) {
            return false;
        }
    }

    function sendWs(payload) {
        if (!wantsConnection()) return false;
        var text;
        try {
            text = typeof payload === "string" ? payload : JSON.stringify(payload);
        } catch (error) {
            return false;
        }

        if (ws && ws.readyState === WebSocket.OPEN) {
            return transmit(text);
        }

        if (ws && ws.readyState === WebSocket.CONNECTING) {
            outboundQueue.push(text);
            if (outboundQueue.length > 30) outboundQueue.shift();
        }
        return false;
    }

    function flushQueue() {
        while (ws && ws.readyState === WebSocket.OPEN && outboundQueue.length) {
            var text = outboundQueue[0];
            if (!transmit(text)) return;
            outboundQueue.shift();
        }
    }

    function pushScreen(force) {
        if (pushTimer) {
            clearTimeout(pushTimer);
            pushTimer = null;
        }
        if (!wantsConnection()) return;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;

        var context;
        try {
            context = host.getCurrentContext && host.getCurrentContext();
        } catch (error) {
            return;
        }
        if (!context) return;

        var active = callActive();
        var signature;
        try {
            signature = JSON.stringify(context) + "|" + (active ? "1" : "0");
        } catch (error) {
            return;
        }

        if (!force && signature === lastSignature) return;
        lastSignature = signature;

        sendWs({
            type: "screen",
            bed_id: bedId(),
            device_id: deviceId,
            call_active: active,
            screen: context
        });
    }

    function schedulePush(delay) {
        if (!wantsConnection() || pushTimer) return;
        pushTimer = setTimeout(function () {
            pushTimer = null;
            pushScreen(false);
        }, typeof delay === "number" ? delay : 20);
    }

    function alreadyHandled(id) {
        if (!id) return false;
        if (seenRequests.indexOf(id) !== -1) return true;
        seenRequests.push(id);
        if (seenRequests.length > 200) {
            seenRequests.shift();
        }
        return false;
    }

    function currentRoute() {
        try {
            var context = host.getCurrentContext && host.getCurrentContext();
            return context && context.route ? String(context.route) : "";
        } catch (error) {
            return "";
        }
    }

    function reportActionFailure(action, error) {
        if (!action || !action.request_id) return;
        sendWs({
            type: "result",
            request_id: action.request_id,
            action: action.action || "",
            success: false,
            error: error && error.message ? error.message : String(error || "Action failed"),
            result: null
        });
        schedulePush(25);
    }

    function handleIncoming(msg) {
        if (!msg || typeof msg.type !== "string") return;

        if (msg.type === "action") {
            var action = msg.data;
            if (!action || typeof action.action !== "string") return;
            if (alreadyHandled(action.request_id)) return;

            if (action.request_id) {
                actionNames[action.request_id] = action.action;
            }

            lastActionAt = Date.now();
            routeAtAction = currentRoute();

            try {
                var result = host.handleAction(action);
                if (result && typeof result.then === "function") {
                    result.catch(function (error) {
                        reportActionFailure(action, error);
                    });
                }
            } catch (error) {
                reportActionFailure(action, error);
            }
        } else if (msg.type === "suggestions") {
            var list = msg.data && msg.data.suggestions;
            if (!Array.isArray(list) || !list.length) return;

            if (Date.now() - lastActionAt < 4000) {
                pendingList = list;
                clearTimeout(pendingTimer);
                pendingTimer = setTimeout(flushPending, 1800);
                return;
            }
            showSuggestions(list);
        }
    }

    function openSocket() {
        if (!wantsConnection()) return;
        if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) return;
        if (attempted) return;
        attempted = true;

        clearReconnectTimer();

        var targetUrl = wsUrl();
        console.log("[UnifiedAIBridge] Connecting WebSocket:", targetUrl);

        var socket;
        try {
            socket = new WebSocket(targetUrl);
        } catch (error) {
            console.error("[UnifiedAIBridge] WebSocket constructor error:", error);
            scheduleReconnect();
            return;
        }

        ws = socket;

        clearConnectTimer();
        connectTimer = setTimeout(function () {
            if (ws === socket && socket.readyState === WebSocket.CONNECTING) {
                try { socket.close(); } catch (e) { }
            }
        }, CONNECT_TIMEOUT_MS);

        socket.onopen = function () {
            if (ws !== socket) return;
            clearConnectTimer();
            console.log("[UnifiedAIBridge] WebSocket connected (session_id=" + sessionId + ", bed_id=" + bedId() + ")");
            connected = true;
            reconnectCount = 0;

            flushQueue();
            lastSignature = "";
            pushScreen(true);

            clearInterval(pingTimer);
            pingTimer = setInterval(function () {
                if (ws === socket && socket.readyState === WebSocket.OPEN) {
                    transmit(JSON.stringify({ type: "ping", timestamp: Date.now() }));
                }
            }, 15000);
        };

        socket.onmessage = function (event) {
            if (ws !== socket) return;
            try {
                var msg = JSON.parse(event.data);
                if (msg && msg.type === "pong") return;
                handleIncoming(msg);
            } catch (error) {
                console.warn("[UnifiedAIBridge] Invalid JSON from server:", event.data);
            }
        };

        socket.onerror = function (err) {
            if (ws !== socket) return;
            console.error("[UnifiedAIBridge] WebSocket error", {
                url: targetUrl,
                readyState: socket.readyState,
                protocol: window.location.protocol,
                online: navigator.onLine,
                event: err
            });
        };

        socket.onclose = function (event) {
            clearConnectTimer();
            console.warn("[UnifiedAIBridge] WebSocket closed", {
                code: event.code,
                reason: event.reason || "(none)",
                wasClean: event.wasClean,
                url: targetUrl
            });
            if (event.code === 1006) {
                fetch(targetUrl.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:"), { redirect: "manual" })
                    .then(function (res) {
                        console.warn("[UnifiedAIBridge] Handshake HTTP probe:", res.status, res.type, res.headers.get("location"));
                    })
                    .catch(function (probeErr) {
                        console.error("[UnifiedAIBridge] Handshake HTTP probe failed (TLS/Network):", probeErr);
                    });
            }
            if (ws === socket) {
                ws = null;
                connected = false;
            }
            clearInterval(pingTimer);
            pingTimer = null;
            outboundQueue = [];

            if (wantsConnection()) {
                scheduleReconnect();
            }
        };
    }

    function closeSocket() {
        manualDisconnect = true;
        shouldBeConnected = false;
        attempted = false;
        reconnectCount = 0;

        clearReconnectTimer();
        clearConnectTimer();
        if (pushTimer) {
            clearTimeout(pushTimer);
            pushTimer = null;
        }
        clearInterval(pingTimer);
        pingTimer = null;
        clearTimeout(pendingTimer);

        pendingList = null;
        outboundQueue = [];
        lastSignature = "";
        connected = false;

        if (ws) {
            var oldSocket = ws;
            ws = null;
            try { oldSocket.close(1000, "Call ended"); } catch (error) { }
        }

        hideSuggestions();
    }

    function flushPending() {
        clearTimeout(pendingTimer);
        var list = pendingList;
        pendingList = null;
        if (list) showSuggestions(list);
    }

    function hideSuggestions() {
        clearTimeout(trayTimer);
        if (tray) tray.hidden = true;
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
            if (
                !item ||
                typeof item.label !== "string" ||
                !item.label.trim() ||
                !item.action ||
                typeof item.action !== "object" ||
                Array.isArray(item.action) ||
                typeof item.action.action !== "string"
            ) {
                return;
            }

            var button = document.createElement("button");
            button.type = "button";
            button.textContent = item.label;

            button.addEventListener("click", function () {
                hideSuggestions();
                var action = Object.assign({}, item.action, { request_id: "suggestion-" + uuid() });
                try {
                    var result = host.handleAction(action);
                    if (result && typeof result.then === "function") {
                        result.catch(function (error) { reportActionFailure(action, error); });
                    }
                } catch (error) {
                    reportActionFailure(action, error);
                }
            });

            tray.appendChild(button);
        });

        if (!tray.childElementCount) {
            tray.hidden = true;
            return;
        }

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

    var style = document.createElement("style");
    style.textContent =
        "#unifiedAiSuggestions{position:fixed;left:50%;bottom:112px;transform:translateX(-50%);z-index:100004;display:flex;" +
        "flex-wrap:wrap;gap:8px;justify-content:center;align-items:center;max-width:min(640px,94vw);padding:6px;" +
        "animation:uaiChipsIn .28s cubic-bezier(.22,1,.36,1) both}" +
        "#unifiedAiSuggestions[hidden]{display:none}" +
        "#unifiedAiSuggestions button{border:1px solid #d1d5db;background:#fff;color:#111827;border-radius:999px;padding:10px 16px;" +
        "font-family:inherit;font-size:15px;font-weight:600;line-height:1.2;box-shadow:0 4px 14px rgba(0,0,0,.18);" +
        "cursor:pointer;min-height:44px}" +
        "#unifiedAiSuggestions button:active{transform:scale(.97)}" +
        "#unifiedAiSuggestions .uai-chip-close{background:#111827;color:#fff;border-color:#111827;padding:10px 14px}" +
        "@keyframes uaiChipsIn{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}" +
        "@media (prefers-reduced-motion:reduce){#unifiedAiSuggestions{animation:none}}";
    document.head.appendChild(style);

    window.addEventListener("voice-agent:connection-state", function (event) {
        var detail = event.detail || {};
        if (detail.connected) {
            manualDisconnect = false;
            shouldBeConnected = true;
            openSocket();
        } else if (detail.reconnecting) {
            return;
        } else {
            closeSocket();
        }
    });

    window.addEventListener("unified-ai:context-changed", function () {
        if (!wantsConnection()) return;
        pushScreen(false);
        if (pendingList && currentRoute() !== routeAtAction) {
            flushPending();
            return;
        }
        if (tray && !tray.hidden && currentRoute() !== trayRoute) {
            hideSuggestions();
        }
    });

    window.addEventListener("unified-ai:cart-changed", function () {
        if (wantsConnection()) pushScreen(true);
    });

    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState !== "visible" || !wantsConnection()) return;
        pushScreen(false);
    });

    window.addEventListener("unified-ai:action-result", function (event) {
        var detail = event.detail || {};
        if (!detail.request_id) return;

        sendWs({
            type: "result",
            request_id: detail.request_id,
            action: detail.action || actionNames[detail.request_id] || "",
            success: !!detail.success,
            error: detail.error || "",
            result: detail.result === undefined ? null : detail.result
        });

        delete actionNames[detail.request_id];
        schedulePush(25);
    });

    var lastConfirmKey = "";
    var lastConfirmAt = 0;

    window.addEventListener("unified-ai:order-confirmed", function (event) {
        var detail = event.detail || {};
        var key = [detail.source || "", detail.path || "", detail.order_id || detail.orderId || ""].join("|");
        if (key === lastConfirmKey && Date.now() - lastConfirmAt < 1500) return;
        lastConfirmKey = key;
        lastConfirmAt = Date.now();

        sendWs({
            type: "confirmation",
            source: detail.source || "page",
            path: detail.path || "",
            status: detail.status || "",
            order_id: String(detail.order_id || detail.orderId || ""),
            message: detail.message || "",
            detail: detail.detail === undefined ? null : detail.detail
        });

        pushScreen(true);
    });

    window.UnifiedAIBridge = {
        sessionId: sessionId,
        deviceId: deviceId,
        connect: function () {
            manualDisconnect = false;
            shouldBeConnected = true;
            attempted = false;
            openSocket();
        },

        disconnect: function () {
            closeSocket();
        },
        isConnected: function () {
            return connected && !!ws && ws.readyState === WebSocket.OPEN;
        },
        pushNow: function () {
            pushScreen(true);
        },
        confirm: function (detail) {
            window.dispatchEvent(new CustomEvent("unified-ai:order-confirmed", { detail: detail || {} }));
        }
    };

    if (callActive()) {
        manualDisconnect = false;
        shouldBeConnected = true;
        openSocket();
    }
})();