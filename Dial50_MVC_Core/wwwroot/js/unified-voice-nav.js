/*
 * Unified Voice Navigation (NO AI)
 * --------------------------------
 * Speech -> text (browser Web Speech API) -> match against the controls that
 * are visible on screen -> run the SAME host action the "Unified AI action test"
 * panel runs (navigate / ui.click / ui.select / ui.set_choice).
 *
 * Needs: HTTPS (or localhost), Chrome/Edge/Safari. Firefox has no SpeechRecognition,
 * so the button stays hidden there. Chrome and Edge send the audio to the browser
 * vendor's speech service, so internet is required.
 *
 * Rules:
 *  - Plain navigation runs immediately.
 *  - Clicks on risky-looking controls (submit / place order / confirm / pay ...)
 *    need a spoken "yes".  Tune RISKY below.
 *  - A real AI voice call and voice navigation share the microphone, so voice
 *    navigation switches itself off whenever a real AI call is connecting/connected.
 *  - It keeps the Home shell alive (host.startVoiceNavSession), so pages open in
 *    the Home iframe and listening continues across page changes.
 */
(function () {
    "use strict";

    var host = window.UnifiedAIHost;
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!host || typeof host.startVoiceNavSession !== "function" || !SR) return;

    var STORE_KEY = "unifiedVoiceNavOn";
    var LANG_MAP = {
        en: "en-IN", ta: "ta-IN", hi: "hi-IN", te: "te-IN", ml: "ml-IN",
        kn: "kn-IN", bn: "bn-IN", mr: "mr-IN", gu: "gu-IN", pa: "pa-IN"
    };

    // Words people say that carry no meaning for matching.
    var STOP = {};
    ("open click go to the show me please select tap press my a an for on in of and page screen menu " +
        "take i want need can you would like now just choose")
        .split(" ").forEach(function (w) { STOP[w] = 1; });

    // Controls whose label looks like this need a spoken "yes" before they are clicked.
    var RISKY = /\b(submit|place order|confirm|pay|payment|send|cancel|delete|remove|log ?out|sign ?out|end call|checkout|check out|done)\b/i;

    var YES = /^(yes|yeah|yep|ok|okay|confirm|sure|do it|haan|han|ஆம்|ஆமாம்|हाँ|हां)$/i;
    var NO = /^(no|nope|cancel|stop|don'?t|nahi|இல்லை|नहीं)$/i;
    var ORDINALS = { one: 0, first: 0, "1": 0, two: 1, second: 1, "2": 1, three: 2, third: 2, "3": 2 };

    var rec = null;
    var wantListening = false;
    var pending = null;          // {cand, timer} waiting for "yes"
    var lastChoices = [];        // disambiguation list
    var restartStamps = [];
    var restartTimer = null;
    var seq = 0;
    var endedByHost = false;
    var linkDown = false;        // true while the AI socket is down (reconnecting / failed)
    var fallback = false;        // local voice commands running because the AI link is down
    var DOWN_STATUSES = ["reconnecting", "connection-failed", "token-unavailable", "service-busy"];

    // ---------- UI ----------
    var css = document.createElement("style");
    css.textContent =
        "#unifiedVoiceNav{position:fixed;left:16px;bottom:16px;z-index:2147483000;font-family:inherit}" +
        "#unifiedVoiceNavButton{display:flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:12px 16px;" +
        "background:#2563eb;color:#fff;font-weight:600;font-size:15px;box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer;min-height:48px}" +
        "#unifiedVoiceNavButton[aria-pressed=true]{background:#dc2626}" +
        "#unifiedVoiceNavButton[aria-pressed=true] i{animation:uvnPulse 1.2s infinite}" +
        "@keyframes uvnPulse{0%,100%{opacity:1}50%{opacity:.35}}" +
        "#unifiedVoiceNavPanel{margin-bottom:10px;max-width:min(92vw,360px);background:#fff;color:#111827;border-radius:14px;" +
        "padding:12px 14px;box-shadow:0 8px 28px rgba(0,0,0,.28);font-size:14px}" +
        "#unifiedVoiceNavPanel[hidden]{display:none}" +
        "#unifiedVoiceNavHeard{color:#6b7280;margin-top:4px;min-height:1.2em;word-break:break-word}" +
        "#unifiedVoiceNavChoices{display:flex;flex-direction:column;gap:6px;margin-top:8px}" +
        "#unifiedVoiceNavChoices button{border:1px solid #d1d5db;background:#f9fafb;border-radius:10px;padding:8px 10px;" +
        "text-align:left;font-size:14px;cursor:pointer}";
    document.head.appendChild(css);

    var root = document.createElement("div");
    root.id = "unifiedVoiceNav";
    root.innerHTML =
        '<div id="unifiedVoiceNavPanel" hidden aria-live="polite">' +
        '<div id="unifiedVoiceNavStatus"><strong>Voice navigation</strong></div>' +
        '<div id="unifiedVoiceNavHeard"></div>' +
        '<div id="unifiedVoiceNavChoices"></div>' +
        "</div>" +
        '<button type="button" id="unifiedVoiceNavButton" aria-pressed="false" aria-label="Start voice navigation">' +
        '<i class="fa-solid fa-microphone" aria-hidden="true"></i><span>Voice</span></button>';
    document.body.appendChild(root);

    var button = root.querySelector("#unifiedVoiceNavButton");
    var panel = root.querySelector("#unifiedVoiceNavPanel");
    var statusEl = root.querySelector("#unifiedVoiceNavStatus");
    var heardEl = root.querySelector("#unifiedVoiceNavHeard");
    var choicesEl = root.querySelector("#unifiedVoiceNavChoices");

    function setStatus(text) { statusEl.innerHTML = "<strong>Voice navigation</strong> - " + escapeHtml(text); }
    function setHeard(text) { heardEl.textContent = text ? "Heard: " + text : ""; }
    function escapeHtml(s) {
        return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
    }
    function setUi(on) {
        button.setAttribute("aria-pressed", String(on));
        button.setAttribute("aria-label", on ? "Stop voice navigation" : "Start voice navigation");
        button.querySelector("span").textContent = on ? "Listening" : "Voice";
        panel.hidden = !on;
        if (!on) { choicesEl.replaceChildren(); setHeard(""); }
    }
    function callOpen() {
        var s = document.body.getAttribute("data-state");
        return s === "connecting" || s === "connected";
    }
    // "The AI is handling voice": a call is open AND its socket is not down.
    function realCallActive() {
        return callOpen() && !linkDown;
    }
    function showChoices(list) {
        lastChoices = list.slice(0, 3);
        choicesEl.replaceChildren();
        lastChoices.forEach(function (c, i) {
            var b = document.createElement("button");
            b.type = "button";
            b.textContent = (i + 1) + ". " + c.label;
            b.addEventListener("click", function () { choose(c); });
            choicesEl.appendChild(b);
        });
    }

    // ---------- Matching ----------
    function clean(s) { return String(s || "").replace(/\s+/g, " ").trim(); }

    function tokens(s) {
        return String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
            .replace(/[^\p{L}\p{N}\p{M}]+/gu, " ").split(" ")
            .filter(function (w) { return w && !STOP[w]; });
    }

    function lev(a, b) {
        var d = [], i, j;
        for (i = 0; i <= a.length; i++) { d[i] = [i]; }
        for (j = 1; j <= b.length; j++) { d[0][j] = j; }
        for (i = 1; i <= a.length; i++) {
            for (j = 1; j <= b.length; j++) {
                d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
            }
        }
        return d[a.length][b.length];
    }

    function tokMatch(a, b) {
        if (a === b) return true;
        if (a.length >= 4 && b.length >= 4 && (b.indexOf(a) === 0 || a.indexOf(b) === 0)) return true;
        return a.length >= 5 && b.length >= 5 && lev(a, b) <= 1;
    }

    function score(spoken, label) {
        var s = tokens(spoken), l = tokens(label);
        if (!s.length || !l.length) return 0;
        var hit = 0;
        s.forEach(function (w) {
            if (l.indexOf(w) !== -1) hit += 1;                                   // exact word
            else if (l.some(function (x) { return tokMatch(w, x); })) hit += 0.7; // prefix / near match
        });
        var ratio = hit / s.length;
        var coverage = Math.min(1, hit / Math.min(l.length, 6));
        return ratio * 0.8 + coverage * 0.2 - (l.length > 8 ? 0.05 : 0);
    }

    // Same sources the test panel uses, minus anything that writes data.
    function getCandidates() {
        var ctx = host.getCurrentContext && host.getCurrentContext();
        var out = [];
        if (!ctx) return out;
        (ctx.actions || []).forEach(function (item) {
            var label = clean(item.label || item.name);
            if (item.disabled || !label) return;
            if (item.route) {
                out.push({ label: label, risky: false, action: { action: "navigate", path: item.route } });
            } else if (item.targetId) {
                out.push({ label: label, risky: RISKY.test(label),
                    action: { action: "ui.click", targetId: item.targetId, label: item.label } });
            }
        });
        (ctx.controls || []).forEach(function (control) {
            var current = control.selected && control.selected.value;
            (control.options || []).forEach(function (o) {
                if (o.disabled || String(o.value) === String(current || "")) return;
                out.push({ label: clean(o.label) + " " + clean(control.label || control.id), risky: false,
                    action: { action: "ui.select", controlId: control.id || control.label, optionValue: o.value } });
            });
        });
        (ctx.choices || []).forEach(function (choice) {
            var label = clean(choice.label || choice.value);
            if (choice.disabled || !choice.targetId || !label) return;
            out.push({ label: label, risky: RISKY.test(label),
                action: { action: "ui.set_choice", targetId: choice.targetId, checked: true } });
        });
        return out;
    }

    // ---------- Commands ----------
    function frameWindow() {
        var f = document.getElementById("unifiedAiModuleFrame");
        var layer = document.getElementById("unifiedAiModuleLayer");
        return f && layer && layer.classList.contains("is-open") && f.contentWindow ? f.contentWindow : window;
    }

    function builtIn(text) {
        var t = text.toLowerCase().trim();
        if (/^(go )?home$|^(go )?(to )?(the )?home( page| screen)?$|^main menu$/.test(t)) {
            run({ label: "Home", risky: false, action: { action: "navigate", path: "/Home/Index" } });
            return true;
        }
        if (/^(go )?back$/.test(t)) {
            try { frameWindow().history.back(); setStatus("Going back"); } catch (e) { /* ignore */ }
            return true;
        }
        if (/^scroll down$|^page down$|^down$/.test(t)) {
            try { frameWindow().scrollBy({ top: Math.round(window.innerHeight * 0.7), behavior: "smooth" }); } catch (e) { /* ignore */ }
            return true;
        }
        if (/^scroll up$|^page up$|^up$/.test(t)) {
            try { frameWindow().scrollBy({ top: -Math.round(window.innerHeight * 0.7), behavior: "smooth" }); } catch (e) { /* ignore */ }
            return true;
        }
        if (/^(stop|end|exit)( listening| voice( navigation)?)?$|^voice off$/.test(t)) {
            stop();
            return true;
        }
        return false;
    }

    function run(cand) {
        clearPending();
        choicesEl.replaceChildren();
        lastChoices = [];
        var action = Object.assign({}, cand.action, { request_id: "voice-nav-" + Date.now() + "-" + (++seq) });
        setStatus("Running: " + cand.label);
        host.handleAction(action);
    }

    function choose(cand) {
        if (cand.risky) askConfirm(cand); else run(cand);
    }

    function askConfirm(cand) {
        clearPending();
        setStatus('Say "yes" to confirm: ' + cand.label);
        pending = { cand: cand, timer: setTimeout(function () { clearPending(); setStatus("Confirmation timed out"); }, 8000) };
    }

    function clearPending() {
        if (pending) { clearTimeout(pending.timer); pending = null; }
    }

    function handleSpeech(alternatives) {
        var main = clean(alternatives[0]);
        if (!main) return;
        setHeard(main);

        // confirmation answers
        if (pending) {
            if (YES.test(main)) { var c = pending.cand; clearPending(); run(c); return; }
            if (NO.test(main)) { clearPending(); setStatus("Cancelled"); return; }
        }
        // "one / two / three" after a disambiguation
        if (lastChoices.length) {
            var ord = ORDINALS[main.toLowerCase().replace(/^(number|option)\s+/, "")];
            if (ord !== undefined && lastChoices[ord]) { choose(lastChoices[ord]); return; }
        }
        if (builtIn(main)) return;

        var candidates = getCandidates();
        var ranked = [];
        candidates.forEach(function (c) {
            var best = 0;
            alternatives.forEach(function (alt) { best = Math.max(best, score(alt, c.label)); });
            if (best >= 0.4) ranked.push({ c: c, s: best });
        });
        ranked.sort(function (a, b) { return b.s - a.s || a.c.label.length - b.c.label.length; });

        if (!ranked.length) { setStatus("Not understood. Try the name on screen."); return; }
        var top = ranked[0], next = ranked[1];
        var sameTarget = next && JSON.stringify(next.c.action) === JSON.stringify(top.c.action);
        if (top.s >= 0.7 && (!next || sameTarget || top.s - next.s >= 0.1)) {
            choose(top.c);
        } else {
            setStatus("Did you mean:  (say one, two or three)");
            showChoices(ranked.map(function (r) { return r.c; }));
        }
    }

    // ---------- Recognition lifecycle ----------
    function currentLang() {
        var stored = "";
        try { stored = sessionStorage.getItem("__culture") || ""; } catch (e) { /* ignore */ }
        var short = (stored || document.documentElement.lang || "en").toLowerCase().split(/[-_]/)[0];
        return LANG_MAP[short] || "en-IN";
    }

    function ensureRecognition() {
        if (rec) return rec;
        rec = new SR();
        rec.continuous = true;
        rec.interimResults = false;
        rec.maxAlternatives = 4;

        rec.onresult = function (event) {
            var res = event.results[event.results.length - 1];
            if (!res || !res.isFinal) return;
            var alts = [];
            for (var i = 0; i < res.length; i++) alts.push(res[i].transcript);
            handleSpeech(alts);
        };
        rec.onerror = function (event) {
            if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                setStatus("Microphone permission is blocked. Allow it in the browser and try again.");
                stop(true);
            } else if (event.error === "audio-capture") {
                setStatus("No microphone found.");
                stop(true);
            } else if (event.error === "network") {
                setStatus("Speech service unreachable. Check the internet. Retrying...");
            }
            // "no-speech" / "aborted" are normal; onend restarts below
        };
        rec.onend = function () {
            if (!wantListening || realCallActive()) return;
            var now = Date.now();
            restartStamps = restartStamps.filter(function (t) { return now - t < 20000; });
            restartStamps.push(now);
            var delay = restartStamps.length > 8 ? 4000 : 250;   // avoid a tight restart loop
            clearTimeout(restartTimer);
            restartTimer = setTimeout(startRecognition, delay);
        };
        return rec;
    }

    function startRecognition() {
        if (!wantListening || realCallActive()) return;
        ensureRecognition();
        rec.lang = currentLang();
        try { rec.start(); setStatus("Listening - say a name on screen, e.g. \u201CFood and Dining\u201D"); }
        catch (e) { /* already started */ }
    }

    function start() {
        if (realCallActive()) { setStatus("An AI voice call is active"); return false; }
        if (!host.startVoiceNavSession()) return false;
        wantListening = true;
        endedByHost = false;
        try { sessionStorage.setItem(STORE_KEY, "1"); } catch (e) { /* ignore */ }
        setUi(true);
        startRecognition();
        return true;
    }

    // ---------- Fallback: keep voice clicks working while the AI socket is down ----------
    function startFallback() {
        if (wantListening) return;
        wantListening = true;
        fallback = true;
        endedByHost = false;
        setUi(true);
        startRecognition();
        setStatus("AI voice is reconnecting - voice commands still work");
    }

    function stopFallback() {
        if (!fallback) return;
        fallback = false;
        wantListening = false;
        clearPending();
        clearTimeout(restartTimer);
        try { if (rec) rec.stop(); } catch (e) { /* ignore */ }
        setUi(false);
    }

    function setLinkDown(down) {
        if (linkDown === down) return;
        linkDown = down;
        if (down) { if (callOpen()) startFallback(); } else { stopFallback(); }
    }

    window.addEventListener("voice-agent:connection-state", function (event) {
        var d = event.detail || {};
        if (d.connected) setLinkDown(false);
        else if (d.reconnecting) setLinkDown(true);
        else { linkDown = false; stopFallback(); }          // call ended
    });

    var callLayer = document.getElementById("callLayer");
    if (callLayer) {
        new MutationObserver(function () {
            setLinkDown(DOWN_STATUSES.indexOf(callLayer.getAttribute("data-status")) !== -1);
        }).observe(callLayer, { attributes: true, attributeFilter: ["data-status"] });
    }

    function stop(keepMessage) {
        fallback = false;
        wantListening = false;
        clearPending();
        clearTimeout(restartTimer);
        try { sessionStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
        try { if (rec) rec.stop(); } catch (e) { /* ignore */ }
        if (!endedByHost && typeof host.endVoiceNavSession === "function" && host.isVoiceNavActive()) {
            endedByHost = true;
            host.endVoiceNavSession();
        }
        var msg = keepMessage ? statusEl.textContent : "";
        setUi(false);
        if (keepMessage && msg) { panel.hidden = false; statusEl.textContent = msg; }
    }

    button.addEventListener("click", function () {
        if (wantListening) stop();
        else if (callOpen() && linkDown) startFallback();
        else start();
    });

    // host's floating-bar End button ends the session
    window.addEventListener("unified-ai:voice-nav-ended", function () {
        if (!wantListening) return;
        endedByHost = true;
        stop();
    });

    window.addEventListener("unified-ai:action-result", function (event) {
        var r = event.detail || {};
        if (!wantListening || String(r.request_id || "").indexOf("voice-nav-") !== 0) return;
        setStatus(r.success ? "Done" : "Could not do that" + (r.error ? ": " + r.error : ""));
    });

    // A real AI call owns the microphone: step aside.
    new MutationObserver(function () {
        if (realCallActive() && wantListening) { endedByHost = false; stop(); }
    }).observe(document.body, { attributes: true, attributeFilter: ["data-state"] });

    // Chrome pauses recognition in a hidden tab; resume when the tab is visible again.
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible" && wantListening) startRecognition();
    });

    window.UnifiedVoiceNav = { start: start, stop: stop, isListening: function () { return wantListening; }, handleText: function (t) { handleSpeech([t]); } };

    // Resume after a full Home reload if it was on (works once mic permission was granted).
    try { if (sessionStorage.getItem(STORE_KEY) === "1") setTimeout(start, 600); } catch (e) { /* ignore */ }
})();
