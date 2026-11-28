var avatarParam = window.avatarParam ||
    new URLSearchParams(window.location.search).get("avatar");

window.avatarParam = avatarParam;

var REAL_AVATAR_MODE =
    window.REAL_AVATAR_MODE ||
    (avatarParam === "1");

window.REAL_AVATAR_MODE = REAL_AVATAR_MODE;

var AVATAR_IMAGE_SRC =
    window.AVATAR_IMAGE_SRC ||
    (REAL_AVATAR_MODE
        ? "assets/images/real-avatar-placeholder.jpg"
        : "/images/voice-agent/grace-avatar.jpg");

window.AVATAR_IMAGE_SRC = AVATAR_IMAGE_SRC;

function isEmbeddedInUnifiedHost() {
    try { return window.parent !== window && !!window.parent.UnifiedAIHost; } catch (e) { return false; }
}

function initializeAvatarUI() {
    if (document.body) {
        document.body.setAttribute(
            "data-avatar-mode",
            REAL_AVATAR_MODE ? "real" : "static"
        );
    }

    document.querySelectorAll(".avatar-img").forEach(function (img) {
        img.src = AVATAR_IMAGE_SRC;
    });
}

if (!isEmbeddedInUnifiedHost()) {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            initializeAvatarUI();
        });
    } else {
        initializeAvatarUI();
    }
}

if (!window.APP_CONFIG) {
    console.warn("window.APP_CONFIG is missing — check that config.js is loaded before script.js.");
}

var CFG = window.APP_CONFIG || {};

var SESSION_SECONDS = Number(CFG.SESSION_SECONDS) || 180;
var SAMPLE_RATE = 24000;
var MIC_FRAME_SAMPLES = 480;

var BACKEND_HTTP = CFG.BACKEND_HTTP || '';
var BACKEND_WS = CFG.BACKEND_WS || (BACKEND_HTTP ? BACKEND_HTTP.replace(/^http/i, "ws") : '');
var PROFILE_API_URL = CFG.PROFILE_API_URL || '';

var MAX_APP_MESSAGE_CHARS = Number(CFG.MAX_APP_MESSAGE_CHARS) || 16000;

var APP_MESSAGE_DELAY_MS = CFG.APP_MESSAGE_DELAY_MS !== undefined ? Number(CFG.APP_MESSAGE_DELAY_MS) : 800;

var MAX_WS_BUFFERED_BYTES = 256 * 1024;

var CLIENT_HEARTBEAT_MS = Number(CFG.CLIENT_HEARTBEAT_MS) || 0;

if (!BACKEND_HTTP || !BACKEND_WS) {
    console.error("APP_CONFIG.BACKEND_HTTP / BACKEND_WS are not set — calls will fail.");
}

var REGION_DIALECT = {
    US: "United States",
    GB: "United Kingdom",
    IN: "India",
    SA: "Saudi Arabia",
    AE: "UAE"
};

var widgetParams = new URLSearchParams(window.location.search);

function getWidgetUserId() {
    if (window.BedContext) {
        var b = window.BedContext.get();
        if (b && b.bedId) return b.bedId;
    }
    return sessionStorage.getItem('realBedId')
        || sessionStorage.getItem('RoomBed')
        || widgetParams.get("userId");
}

var body = null;
var countdownTimer = null;
var timeLeft = SESSION_SECONDS;

var idleBtn = null;
var endChatBtn = null;
var micBtn = null;
var speakerBtn = null;
var timerEl = null;
var homeBtn = null;
var assistantBackBtn = null;
var endedMicBtn = null;

function initializeAvatarElements() {
    body = document.body;

    idleBtn = document.getElementById("idleBtn");
    endChatBtn = document.getElementById("endChatBtn");
    micBtn = document.getElementById("micBtn");
    speakerBtn = document.getElementById("speakerBtn");
    timerEl = document.getElementById("sessionTimer");
    homeBtn = document.getElementById("homeBtn");
    assistantBackBtn = document.getElementById("assistantBackBtn");
    endedMicBtn = document.getElementById("endedMicBtn");
    resetCallTimer();
}

function setState(state) {
    if (!body) {
        body = document.body;
    }

    if (!body) {
        console.error("Dial50: document.body is not available.");
        return;
    }

    body.setAttribute("data-state", state);
}

function formatTime(s) {
    var m = Math.floor(s / 60);
    return String(m).padStart(2, "0") + ":" + (s % 60).toString().padStart(2, "0");
}

var elapsedSeconds = 0;

function setSessionTimerVisibility(visible) {
    if (!timerEl) timerEl = document.getElementById("sessionTimer");
    if (!timerEl) return;
    timerEl.hidden = !visible;
    timerEl.style.display = visible ? "" : "none";
}

function resetCallTimer() {
    clearInterval(countdownTimer);
    countdownTimer = null;
    elapsedSeconds = 0;
    timeLeft = SESSION_SECONDS;
    if (timerEl) timerEl.textContent = "";
    setSessionTimerVisibility(false);
}

function renderTimer() {
    if (!timerEl) timerEl = document.getElementById("sessionTimer");
    if (!timerEl) return;
    var isConnected = !body || body.getAttribute("data-state") === "connected";
    if (!isConnected || elapsedSeconds < 1) {
        timerEl.textContent = "";
        setSessionTimerVisibility(false);
        return;
    }
    setSessionTimerVisibility(true);
    timerEl.textContent = formatTime(elapsedSeconds);
}

function goConnected() {
    resetCallTimer();
    setState("connected");
    setCallStatus("connecting");
    clearTimeout(statusTransitionTimer);
    statusTransitionTimer = setTimeout(function () {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        setCallStatus("connected");
        if (!countdownTimer) startCountdown();
        statusTransitionTimer = setTimeout(function () {
            if (ws && ws.readyState === WebSocket.OPEN) setCallStatus("listening");
        }, 700);
    }, 700);
}

function startCountdown() {
    clearInterval(countdownTimer);
    renderTimer();
    countdownTimer = setInterval(function () {
        if (body && body.getAttribute("data-state") !== "connected") {
            renderTimer();
            return;
        }
        elapsedSeconds += 1;
        renderTimer();
    }, 1000);
}

async function fetchProfileLanguage(id) {
    if (!id || !PROFILE_API_URL) return null;
    try {
        var headers = { "Content-Type": "application/json" };
        var tenantId = window.BedContext && typeof window.BedContext.getTenantId === "function"
            ? window.BedContext.getTenantId()
            : null;
        if (tenantId) headers["X-Tenant-ID"] = tenantId;

        var res = await fetch(PROFILE_API_URL, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ userId: String(id), Status: "GET" })
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        var result = await res.json();
        if (!result.status || !result.data || !result.data.Language) return null;
        return result.data.Language;
    } catch (err) {
        console.warn("GetProfileOld failed — using region default language:", err.message);
        return null;
    }
}

var REGION_LANGUAGE_URL = "/data/region-language.json";
var FALLBACK_COUNTRY_CODE = "IN";

var currentLanguage = null;
var currentRegionCode = null;

function selectLanguage(lang) {
    if (lang) currentLanguage = lang;
}

async function loadRegionLanguages() {
    var data;
    try {
        var res = await fetch(REGION_LANGUAGE_URL);
        if (!res.ok) throw new Error("HTTP " + res.status);
        data = await res.json();
    } catch (err) {
        console.warn("Could not load " + REGION_LANGUAGE_URL + " — defaulting to English only:", err.message);
        data = {
            regions: [{
                countryCode: "US",
                defaultLanguage: "en-US",
                languages: [{ code: "en-US", name: "English" }]
            }]
        };
    }

    var regionParam = (widgetParams.get("region") || "").toUpperCase();
    var region =
        data.regions.find(function (r) { return r.countryCode === regionParam; }) ||
        data.regions.find(function (r) { return r.countryCode === FALLBACK_COUNTRY_CODE; }) ||
        data.regions[0];

    currentRegionCode = region.countryCode;

    var preferredLanguageName = await fetchProfileLanguage(getWidgetUserId());

    var defaultLang = null;
    if (preferredLanguageName) {
        defaultLang = region.languages.find(function (l) {
            return l.name.toUpperCase() === preferredLanguageName.toUpperCase();
        });
    }
    if (!defaultLang) {
        defaultLang =
            region.languages.find(function (l) { return l.code === region.defaultLanguage; }) ||
            region.languages[0];
    }
    selectLanguage(defaultLang);
}

var languageReady = isEmbeddedInUnifiedHost()
    ? Promise.resolve()
    : loadRegionLanguages().catch(function (err) {
        console.warn("Language setup failed:", err);
    });

async function fetchToken() {
    var widgetUserId = getWidgetUserId();
    if (!widgetUserId) {
        console.error("No bed id available — cannot start a call.");
        return null;
    }
    if (!BACKEND_HTTP) return null;

    var voice = widgetParams.get("voice") || CFG.VOICE;
    var speedParam = widgetParams.get("speed");
    var speed = speedParam !== null ? parseFloat(speedParam) : CFG.SPEED;
    var dialect = widgetParams.get("dialect") || CFG.DIALECT || REGION_DIALECT[currentRegionCode];

    var payload = { user_id: widgetUserId };
    if (CFG.SEND_SESSION_ID && window.UnifiedAIBridge) {
        payload.session_id = window.UnifiedAIBridge.sessionId;
        payload.device_id = window.UnifiedAIBridge.deviceId;
    }
    if (currentLanguage) payload.language = currentLanguage.name;
    if (dialect) payload.dialect = dialect;
    if (voice) payload.voice = voice;
    if (speed !== undefined && speed !== null && !isNaN(speed)) payload.speed = speed;

    try {
        var res = await fetch(BACKEND_HTTP + "/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            console.error("/token returned " + res.status);
            return null;
        }
        var data = await res.json();
        return data.access_token || null;
    } catch (err) {
        console.error("/token unreachable:", err.message);
        return null;
    }
}

var ws = null;
var pendingVoiceMessages = [];
var audioContext = null;
var mediaStream = null;
var micSource = null;
var micNode = null;
var micSink = null;
var highPassNode = null;
var micMuted = false;
var speakerMuted = false;
var speakerGainNode = null;
var serverEnding = false;
var userEndedCall = false;
var callSessionActive = false;
var callSessionGeneration = 0;
var connectionInProgress = false;
var AUTH_CLOSE_CODES = [1008, 4001, 4003, 4401, 4403];
var callHasConnected = false;
var lastEndClickAt = 0;
var END_CLICK_WINDOW_MS = 1500;
var END_CONTROL_SELECTOR = "#endChatBtn, #unifiedAiBarEndButton, #unifiedAiBarChatButton, #assistantBackBtn";
var AUTOMATIC_END_STATUSES = ["microphone-required", "connection-failed", "token-unavailable", "disconnected", "remote-ended"];
var FAREWELL_WINDOW_MS = 60000;
var FAREWELL_REGEX = /(^|[^\p{L}\p{M}])(bye|byee|bye-bye|goodbye|good\s+bye|alvida|अलविदा|बाय|பை\s+பை|பாய்|مع السلامة|وداعا)($|[^\p{L}\p{M}])/iu;
var FAREWELL_REASON_REGEX = /bye|farewell|user[\s_-]*(ended|requested|hang)/i;
var farewellHeardAt = { user: 0, assistant: 0 };
var spokenText = { user: "", assistant: "" };

function resetFarewell() {
    farewellHeardAt = { user: 0, assistant: 0 };
    spokenText = { user: "", assistant: "" };
}

function trackFarewell(msg, kind) {
    var text = [msg.text, msg.transcript, msg.delta, msg.content].find(function (value) {
        return typeof value === "string";
    }) || "";
    var role = String(msg.role || msg.speaker || msg.source || "").toLowerCase();
    if (role === "agent" || role === "ai" || role === "bot" || role === "model") role = "assistant";
    if (role !== "user" && role !== "assistant") role = kind === "full" ? "user" : "assistant";

    if (kind === "delta") {
        spokenText[role] = (spokenText[role] + text).slice(-200);
        text = spokenText[role];
    } else {
        text = text || spokenText[role];
        spokenText[role] = "";
    }
    if (!text.trim()) return;

    if (FAREWELL_REGEX.test(text)) {
        farewellHeardAt[role] = Date.now();
    } else if (kind !== "delta") {
        farewellHeardAt[role] = 0;
        if (role === "user") farewellHeardAt.assistant = 0;
    }
}

function isGoodbyeEnding(reason) {
    var now = Date.now();
    return FAREWELL_REASON_REGEX.test(String(reason || ""))
        || Object.keys(farewellHeardAt).some(function (role) {
            return farewellHeardAt[role] > 0 && now - farewellHeardAt[role] < FAREWELL_WINDOW_MS;
        });
}

window.addEventListener("click", function (event) {
    if (event.isTrusted && event.target instanceof Element && event.target.closest(END_CONTROL_SELECTOR)) {
        lastEndClickAt = Date.now();
    }
}, true);

var connectionTimeoutTimer = null;
var statusTransitionTimer = null;
var serverEndTimer = null;
var queueFlushTimer = null;
var heartbeatTimer = null;

var nextPlayTime = 0;
var activeSources = [];
var drainTimer = null;

var callOwnerRelease = null;
var callOwnerPending = false;

function claimCallOwnership() {
    if (isEmbeddedInUnifiedHost()) return Promise.resolve(false);
    if (callOwnerRelease) return Promise.resolve(true);
    if (!navigator.locks || !navigator.locks.request) return Promise.resolve(true);
    return new Promise(function (resolve) {
        navigator.locks.request("dial50-voice-call", { ifAvailable: true }, function (lock) {
            if (!lock) { resolve(false); return; }
            return new Promise(function (release) { callOwnerRelease = release; resolve(true); });
        }).catch(function () { resolve(true); });
    });
}

function releaseCallOwnership() {
    if (!callOwnerRelease) return;
    var release = callOwnerRelease;
    callOwnerRelease = null;
    release();
}

var vadCfg = (CFG && CFG.VAD) || {};

class LocalVoiceActivityDetector {
    constructor(options) {
        options = options || {};
        this.sampleRate = options.sampleRate || 24000;
        this.energyThreshold = typeof options.threshold === "number" ? options.threshold : 0.01;
        this.endThreshold = typeof options.speechEndThreshold === "number" ? options.speechEndThreshold : 0.0072;
        this.duckingThreshold = typeof options.duckingThreshold === "number" ? options.duckingThreshold : 0.065;
        this.duckingEndThreshold = this.duckingThreshold * 0.72;
        this.silenceDurationMs = typeof options.silenceDurationMs === "number" ? options.silenceDurationMs : 600;
        this.speechStartDurationMs = typeof options.speechStartDurationMs === "number" ? options.speechStartDurationMs : 180;
        this.bargeInStartDurationMs = typeof options.bargeInStartDurationMs === "number" ? options.bargeInStartDurationMs : 220;
        this.isSpeaking = false;
        this.silenceTimeMs = 0;
        this.speechTimeMs = 0;
        this.lastRms = 0;
    }

    calculateRMS(samples) {
        if (!samples || !samples.length) return 0;
        var sumSquares = 0;
        var count = 0;
        for (var i = 0; i < samples.length; i += 2) {
            var sample = samples[i];
            sumSquares += sample * sample;
            count++;
        }
        if (!count) return 0;
        var rms = Math.sqrt(sumSquares / count);
        return samples instanceof Int16Array ? rms / 32768 : rms;
    }

    process(samples, sampleRate, onSpeechStart, onSpeechEnd, playbackActive) {
        if (!samples || !samples.length) return;
        var rms = this.calculateRMS(samples);
        this.lastRms = rms;
        var durationMs = samples.length / (sampleRate || this.sampleRate) * 1000;
        var onset = playbackActive ? this.duckingThreshold : this.energyThreshold;
        var sustain = playbackActive ? this.duckingEndThreshold : this.endThreshold;
        var debounce = playbackActive ? this.bargeInStartDurationMs : this.speechStartDurationMs;
        var voiceEnergy = rms > (this.isSpeaking ? sustain : onset);

        if (voiceEnergy) {
            this.silenceTimeMs = 0;
            if (!this.isSpeaking) {
                this.speechTimeMs += durationMs;
                if (this.speechTimeMs >= debounce) {
                    this.isSpeaking = true;
                    this.speechTimeMs = 0;
                    if (typeof onSpeechStart === "function") onSpeechStart(rms);
                }
            }
        } else if (!this.isSpeaking) {
            this.speechTimeMs = Math.max(0, this.speechTimeMs - durationMs);
        } else {
            this.silenceTimeMs += durationMs;
            if (this.silenceTimeMs >= this.silenceDurationMs) {
                this.isSpeaking = false;
                this.silenceTimeMs = 0;
                this.speechTimeMs = 0;
                if (typeof onSpeechEnd === "function") onSpeechEnd(rms);
            }
        }
    }

    reset() {
        this.isSpeaking = false;
        this.silenceTimeMs = 0;
        this.speechTimeMs = 0;
        this.lastRms = 0;
    }
}

var localVad = new LocalVoiceActivityDetector({
    sampleRate: SAMPLE_RATE,
    threshold: typeof vadCfg.threshold === "number" ? vadCfg.threshold : 0.01,
    speechEndThreshold: typeof vadCfg.speechEndThreshold === "number" ? vadCfg.speechEndThreshold : 0.0072,
    duckingThreshold: typeof vadCfg.duckingThreshold === "number" ? vadCfg.duckingThreshold : 0.065,
    silenceDurationMs: typeof vadCfg.silenceDurationMs === "number" ? vadCfg.silenceDurationMs : 600,
    speechStartDurationMs: typeof vadCfg.speechStartDurationMs === "number" ? vadCfg.speechStartDurationMs : 180,
    bargeInStartDurationMs: typeof vadCfg.bargeInStartDurationMs === "number" ? vadCfg.bargeInStartDurationMs : 220
});
var localBargeIn = vadCfg.localBargeIn === true;

function processLocalVADFrame(buffer) {
    if (!localVad || micMuted || !buffer) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    var samples;
    if (buffer instanceof Int16Array) samples = buffer;
    else if (buffer instanceof ArrayBuffer && buffer.byteLength >= 2) {
        samples = new Int16Array(buffer, 0, Math.floor(buffer.byteLength / 2));
    } else return;

    var playbackActive = !!(audioContext && activeSources.length > 0 && audioContext.currentTime < nextPlayTime);
    localVad.process(samples, SAMPLE_RATE, onLocalSpeechStart, onLocalSpeechEnd, playbackActive);
}

function onLocalSpeechStart(rms) {
    if (localBargeIn) flushPlayback();
    var layer = document.getElementById("callLayer");
    if (layer) {
        var status = layer.getAttribute("data-status");
        if (status === "speaking" || status === "thinking") setCallStatus("listening");
    }
}

function onLocalSpeechEnd() {
    var layer = document.getElementById("callLayer");
    if (layer && layer.getAttribute("data-status") === "listening") setCallStatus("thinking");
}

var MIC_WORKLET_SOURCE = `
class MicProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        const o = options.processorOptions;
        this.ratio = o.inputRate / o.targetRate;
        this.frameSize = o.frameSize;
        this.buf = new Int16Array(this.frameSize);
        this.n = 0;
        this.pos = 0;
        this.prev = 0;
        this.muted = false;
        this.port.onmessage = (e) => {
            if (e.data && "muted" in e.data) this.muted = e.data.muted;
        };
    }
    push(x) {
        let v = 0;
        if (!this.muted) {
            const s = Math.max(-1, Math.min(1, x));
            v = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        this.buf[this.n++] = v;
        if (this.n === this.frameSize) {
            const out = this.buf.buffer;
            this.port.postMessage(out, [out]);
            this.buf = new Int16Array(this.frameSize);
            this.n = 0;
        }
    }
    process(inputs) {
        const ch = inputs[0] && inputs[0][0];
        if (!ch || ch.length === 0) return true;
        let pos = this.pos;
        while (pos < ch.length - 1) {
            const i = Math.floor(pos);
            const frac = pos - i;
            const a = i < 0 ? this.prev : ch[i];
            const b = ch[i + 1];
            this.push(a + (b - a) * frac);
            pos += this.ratio;
        }
        this.pos = pos - ch.length;
        this.prev = ch[ch.length - 1];
        return true;
    }
}
registerProcessor("mic-processor", MicProcessor);
`;

function playPCM16(buffer) {
    if (!audioContext) return;
    var int16Array = new Int16Array(buffer);
    var float32Array = new Float32Array(int16Array.length);
    for (var i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
    }
    var audioBuffer = audioContext.createBuffer(1, float32Array.length, SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(float32Array);

    var source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(speakerGainNode);

    var currentTime = audioContext.currentTime;
    if (nextPlayTime < currentTime) nextPlayTime = currentTime;
    source.start(nextPlayTime);
    nextPlayTime += audioBuffer.duration;

    activeSources.push(source);
    source.onended = function () {
        activeSources = activeSources.filter(function (s) { return s !== source; });
        scheduleDrainCheck();
    };
}

function scheduleDrainCheck() {
    clearTimeout(drainTimer);
    drainTimer = setTimeout(function () {
        if (activeSources.length === 0 && audioContext &&
            audioContext.currentTime >= nextPlayTime - 0.02) {
            setCallStatus("listening");
        }
    }, 200);
}

function toggleSpeaker() {
    speakerMuted = !speakerMuted;
    if (speakerGainNode) speakerGainNode.gain.value = speakerMuted ? 0 : 1;
    if (speakerBtn) {
        speakerBtn.classList.toggle("muted", speakerMuted);
        speakerBtn.setAttribute("aria-label", speakerMuted ? "Turn speaker on" : "Mute speaker");
    }
}

function flushPlayback() {
    clearTimeout(drainTimer);
    activeSources.forEach(function (s) { try { s.stop(); } catch (e) { } });
    activeSources = [];
    nextPlayTime = audioContext ? audioContext.currentTime : 0;
}

async function startMicrophone() {
    var hasLiveMicrophone = mediaStream && mediaStream.getAudioTracks().some(function (track) {
        return track.readyState === "live" && track.enabled;
    });
    if (audioContext && audioContext.state !== "closed" && hasLiveMicrophone && micNode) {
        if (audioContext.state === "suspended") await audioContext.resume();
        return;
    }

    stopMicrophone();
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    if (audioContext.state === "suspended") await audioContext.resume();

    var ctxRef = audioContext;
    ctxRef.onstatechange = function () {
        if (ctxRef !== audioContext || !callSessionActive) return;
        if (ctxRef.state === "suspended" || ctxRef.state === "interrupted") {
            ctxRef.resume().catch(function () { });
        }
    };

    speakerGainNode = audioContext.createGain();
    speakerGainNode.gain.value = speakerMuted ? 0 : 1;
    speakerGainNode.connect(audioContext.destination);
    nextPlayTime = audioContext.currentTime;

    mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
            channelCount: 1,
            sampleRate: SAMPLE_RATE,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        }
    });

    if (audioContext.sampleRate !== SAMPLE_RATE) {
        console.warn("AudioContext runs at " + audioContext.sampleRate + " Hz — resampling mic to " + SAMPLE_RATE + " Hz.");
    }

    var blobUrl = URL.createObjectURL(new Blob([MIC_WORKLET_SOURCE], { type: "application/javascript" }));
    try {
        await audioContext.audioWorklet.addModule(blobUrl);
    } finally {
        URL.revokeObjectURL(blobUrl);
    }

    micSource = audioContext.createMediaStreamSource(mediaStream);
    micNode = new AudioWorkletNode(audioContext, "mic-processor", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: {
            inputRate: audioContext.sampleRate,
            targetRate: SAMPLE_RATE,
            frameSize: MIC_FRAME_SAMPLES
        }
    });
    micNode.port.postMessage({ muted: micMuted });
    micNode.port.onmessage = function (e) {
        processLocalVADFrame(e.data);

        if (ws && ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 1024 * 1024) {
            try { ws.send(e.data); } catch (err) { }
        }
    };

    highPassNode = audioContext.createBiquadFilter();
    highPassNode.type = "highpass";
    highPassNode.frequency.value = 120;
    highPassNode.Q.value = 0.7;

    micSink = audioContext.createGain();
    micSink.gain.value = 0;
    micSource.connect(highPassNode);
    highPassNode.connect(micNode);
    micNode.connect(micSink);
    micSink.connect(audioContext.destination);
}

function stopMicrophone() {
    if (localVad) localVad.reset();
    if (micSource) { micSource.disconnect(); micSource = null; }
    if (highPassNode) { highPassNode.disconnect(); highPassNode = null; }
    if (micNode) { micNode.port.onmessage = null; micNode.disconnect(); micNode = null; }
    if (micSink) { micSink.disconnect(); micSink = null; }
    if (mediaStream) { mediaStream.getTracks().forEach(function (t) { t.stop(); }); mediaStream = null; }
    if (audioContext) {
        audioContext.onstatechange = null;
        audioContext.close().catch(function () { });
        audioContext = null;
    }
}

document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible" || !callSessionActive
        || !audioContext || audioContext.state !== "suspended") return;

    audioContext.resume().catch(function (error) {
        console.warn("Voice audio could not resume after returning to the call tab:", error && error.message ? error.message : error);
    });
});

function emitTranscript(msg, kind) {
    try {
        var text = typeof msg.text === "string" ? msg.text
            : typeof msg.transcript === "string" ? msg.transcript
                : typeof msg.delta === "string" ? msg.delta
                    : typeof msg.content === "string" ? msg.content : "";
        var role = String(msg.role || msg.speaker || msg.source || "").toLowerCase();
        if (role === "agent" || role === "ai" || role === "bot" || role === "model") role = "assistant";

        if (role !== "user" && role !== "assistant") role = kind === "full" ? "user" : "assistant";
        window.dispatchEvent(new CustomEvent("voice-agent:transcript", {
            detail: { role: role, text: text, final: kind !== "delta", kind: kind }
        }));
    } catch (e) { }
}

var voiceTrace = [];

function traceVoice(direction, type, size) {
    voiceTrace.push({ t: new Date().toISOString().slice(11, 23), d: direction, type: type || "?", n: size || 0 });
    if (voiceTrace.length > 25) voiceTrace.shift();
}

var VOICE_DEBUG_KEY = "dial50_voice_debug";

function persistVoiceDebug(event, data) {
    try {
        var list = JSON.parse(localStorage.getItem(VOICE_DEBUG_KEY) || "[]");
        list.push({ at: new Date().toISOString(), page: location.pathname, event: event, data: data || null });
        while (list.length > 30) list.shift();
        localStorage.setItem(VOICE_DEBUG_KEY, JSON.stringify(list));
    } catch (e) { }
}

window.showVoiceDebug = function () {
    try {
        var list = JSON.parse(localStorage.getItem(VOICE_DEBUG_KEY) || "[]");
        console.table(list.map(function (item) {
            return { at: item.at, page: item.page, event: item.event, data: JSON.stringify(item.data) };
        }));
        return list;
    } catch (e) { return []; }
};

window.clearVoiceDebug = function () {
    try { localStorage.removeItem(VOICE_DEBUG_KEY); } catch (e) { }
};

window.addEventListener("pagehide", function () {
    persistVoiceDebug("page-unload", { callSessionActive: callSessionActive, state: document.body ? document.body.getAttribute("data-state") : null });
});

(function () {
    try {
        var previous = JSON.parse(localStorage.getItem(VOICE_DEBUG_KEY) || "[]");
        if (previous.length) console.warn("[voice-debug] events saved from earlier page loads (run showVoiceDebug() for a table):", previous.slice(-8));
    } catch (e) { }
})();

function stopHeartbeat() {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
}

function startHeartbeat(socket) {
    stopHeartbeat();
    if (!CLIENT_HEARTBEAT_MS) return;
    heartbeatTimer = setInterval(function () {
        if (ws !== socket || socket.readyState !== WebSocket.OPEN) return;
        try { socket.send(JSON.stringify({ type: "ping", timestamp: Date.now() })); } catch (e) { }
    }, CLIENT_HEARTBEAT_MS);
}

function sendTextSafely(socket, message) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    var encoded;
    try { encoded = JSON.stringify(message); } catch (e) { return true; }

    if (encoded.length > MAX_APP_MESSAGE_CHARS) {
        if (message && message.type === "app_context" && message.context) {
            var slim = Object.assign({}, message.context);
            ["items", "actions", "choices", "fields", "controls", "headings"].some(function (key) {
                if (!Array.isArray(slim[key])) return false;
                while (slim[key].length > 5 && JSON.stringify({ type: "app_context", context: slim }).length > MAX_APP_MESSAGE_CHARS) {
                    slim[key] = slim[key].slice(0, Math.floor(slim[key].length * 0.7));
                }
                return JSON.stringify({ type: "app_context", context: slim }).length <= MAX_APP_MESSAGE_CHARS;
            });
            encoded = JSON.stringify({ type: "app_context", context: slim });
        }
        if (encoded.length > MAX_APP_MESSAGE_CHARS) {
            console.warn("Voice message dropped: still " + encoded.length + " chars after trimming.");
            return true;
        }
    }

    if (socket.bufferedAmount > MAX_WS_BUFFERED_BYTES) {
        if (message && message.type === "app_context") return true;
        return false;
    }

    try {
        socket.send(encoded);
        traceVoice("out", message && message.type, encoded.length);
        return true;
    } catch (error) {
        if (socket.readyState !== WebSocket.OPEN) return false;
        console.error("Could not send voice-agent message:", error);
        return true;
    }
}

function flushPendingVoiceMessages(socket) {
    clearTimeout(queueFlushTimer);
    queueFlushTimer = null;
    while (pendingVoiceMessages.length && ws === socket && socket.readyState === WebSocket.OPEN) {
        if (!sendTextSafely(socket, pendingVoiceMessages[0])) break;
        pendingVoiceMessages.shift();
    }
    if (pendingVoiceMessages.length && ws === socket && socket.readyState === WebSocket.OPEN) {
        queueFlushTimer = setTimeout(function () { flushPendingVoiceMessages(socket); }, 250);
    }
}

async function connectToAvatarBackend() {
    if (!body) body = document.body;
    if (!body || !["connecting", "connected"].includes(body.getAttribute("data-state"))
        || connectionInProgress || (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN))) {
        return;
    }

    if (!callSessionActive) {
        if (callOwnerPending) return;
        callOwnerPending = true;
        var ownsCall = false;
        try { ownsCall = await claimCallOwnership(); } finally { callOwnerPending = false; }
        if (!ownsCall) {
            console.warn("Voice call not started: another window already owns the call.");
            setState("idle");
            setCallStatus("call-in-other-window");
            return;
        }
        if (!body || !["connecting", "connected"].includes(body.getAttribute("data-state"))) {
            releaseCallOwnership();
            return;
        }

        callSessionActive = true;
        callHasConnected = false;
        resetFarewell();
        callSessionGeneration += 1;
        timeLeft = SESSION_SECONDS;
        resetCallTimer();
        userEndedCall = false;
        serverEnding = false;

        if (window.UnifiedAIBridge && typeof window.UnifiedAIBridge.connect === "function") {
            window.UnifiedAIBridge.connect();
        }
    }

    var sessionGeneration = callSessionGeneration;
    var sessionIsCurrent = function () {
        return callSessionActive && sessionGeneration === callSessionGeneration
            && body && ["connecting", "connected"].includes(body.getAttribute("data-state"));
    };

    connectionInProgress = true;
    serverEnding = false;

    try {
        await languageReady;
        if (!sessionIsCurrent()) return;
        await startMicrophone();
        if (!sessionIsCurrent()) return;
        setCallStatus("ringing");

        var token = await fetchToken();
        if (!sessionIsCurrent()) return;
        if (!token) throw new Error("No token — cannot open /voice-assistant.");

        var wsUrl = BACKEND_WS + "/voice-assistant?token=" + encodeURIComponent(token);

        var bridgeSession = CFG.SEND_SESSION_IN_WS === true && window.UnifiedAIBridge;
        if (bridgeSession && bridgeSession.sessionId) {
            wsUrl += "&session_id=" + encodeURIComponent(bridgeSession.sessionId)
                + "&device_id=" + encodeURIComponent(bridgeSession.deviceId || "");
        }

        var socket = new WebSocket(wsUrl);
        socket.binaryType = "arraybuffer";
        ws = socket;
        var openedAt = 0;
        var serverEndReason = "";

        clearTimeout(connectionTimeoutTimer);
        connectionTimeoutTimer = setTimeout(function () {
            if (ws === socket && socket.readyState === WebSocket.CONNECTING) {
                socket.close(4000, "Connection timed out");
            }
        }, 45000);

        socket.onopen = function () {
            if (ws !== socket) return;
            openedAt = Date.now();
            callHasConnected = true;
            clearTimeout(connectionTimeoutTimer);
            connectionTimeoutTimer = null;
            connectionInProgress = false;

            goConnected();
            startHeartbeat(socket);
            window.dispatchEvent(new CustomEvent("voice-agent:connection-state", {
                detail: { connected: true, reconnecting: false }
            }));

            clearTimeout(queueFlushTimer);
            queueFlushTimer = setTimeout(function () { flushPendingVoiceMessages(socket); }, APP_MESSAGE_DELAY_MS);
        };

        socket.onmessage = function (event) {
            if (ws !== socket) return;

            if (event.data instanceof ArrayBuffer) {
                setCallStatus("speaking");
                playPCM16(event.data);
                return;
            }

            var msg;
            try { msg = JSON.parse(event.data); } catch (e) { return; }
            if (!msg || typeof msg !== "object") return;
            traceVoice("in", msg.type, String(event.data).length);

            switch (msg.type) {
                case "interrupt":
                case "speech_started":
                case "input_audio_buffer.speech_started":
                    flushPlayback();
                    setCallStatus("listening");
                    break;

                case "user_speaking":
                    if (msg.speaking) setCallStatus("listening");
                    break;

                case "agent_speaking":
                    if (msg.speaking) setCallStatus("speaking");
                    break;

                case "transcript":
                    trackFarewell(msg, "full");
                    emitTranscript(msg, "full");
                    var cl = document.getElementById("callLayer");
                    if (cl && cl.getAttribute("data-status") !== "speaking") {
                        setCallStatus("thinking");
                    }
                    break;

                case "app_action":
                    window.dispatchEvent(new CustomEvent("voice-agent:app-action", { detail: msg }));
                    break;

                case "video.play":
                case "video.stop":
                    window.dispatchEvent(new CustomEvent("voice-agent:app-action", {
                        detail: Object.assign({}, msg, { action: msg.type })
                    }));
                    break;

                case "ping":
                    if (CFG.REPLY_TO_PING === true && socket.readyState === WebSocket.OPEN) {
                        try {
                            var pongMessage = { type: "pong" };
                            if (msg.id !== undefined) pongMessage.id = msg.id;
                            if (msg.timestamp !== undefined) pongMessage.timestamp = msg.timestamp;
                            socket.send(JSON.stringify(pongMessage));
                        } catch (error) { }
                    }
                    break;

                case "transcript_delta":
                case "response.audio_transcript.delta":
                    trackFarewell(msg, "delta");
                    emitTranscript(msg, "delta");
                    break;

                case "transcript_done":
                case "response.audio_transcript.done":
                    trackFarewell(msg, "done");
                    emitTranscript(msg, "done");
                    break;

                case "pong":
                case "session.created":
                case "session.updated":
                case "session_started":
                    break;

                case "call_ended": {
                    serverEndReason = String(msg.reason || "");
                    console.warn("[voice] server sent call_ended" + (serverEndReason ? ": " + serverEndReason : ""));
                    var remainingMs = audioContext
                        ? Math.max(0, (nextPlayTime - audioContext.currentTime) * 1000)
                        : 0;
                    clearTimeout(serverEndTimer);
                    serverEndTimer = setTimeout(function () {
                        if (ws !== socket || !callSessionActive) return;
                        endChat(isGoodbyeEnding(serverEndReason) ? "remote-ended" : "disconnected");
                    }, remainingMs + 300);
                    break;
                }

                default:
                    console.warn("[voice] unhandled server message:", String(event.data).slice(0, 500));
                    break;
            }
        };

        socket.onclose = function (event) {
            if (ws !== socket) return;

            var aliveMs = openedAt ? Date.now() - openedAt : 0;
            console.warn("Voice socket closed — code " + event.code
                + (event.reason ? ", reason: " + event.reason : "")
                + ", clean: " + event.wasClean + ", alive " + Math.round(aliveMs / 1000) + " s");

            console.warn("[voice] last messages before close:", JSON.stringify(voiceTrace.slice(-12)));
            window.lastVoiceClose = {
                code: event.code,
                reason: event.reason,
                clean: event.wasClean,
                aliveSeconds: Math.round(aliveMs / 1000),
                serverEndReason: serverEndReason,
                trace: voiceTrace.slice()
            };
            persistVoiceDebug("socket-close", window.lastVoiceClose);

            clearTimeout(connectionTimeoutTimer);
            clearTimeout(statusTransitionTimer);
            clearTimeout(queueFlushTimer);
            stopHeartbeat();
            connectionTimeoutTimer = null;
            statusTransitionTimer = null;
            queueFlushTimer = null;
            connectionInProgress = false;
            ws = null;

            if (serverEnding || userEndedCall || !callSessionActive) return;

            if (isGoodbyeEnding(serverEndReason || event.reason)) {
                endChat("remote-ended");
                return;
            }

            var reasonStatus = AUTH_CLOSE_CODES.indexOf(event.code) !== -1
                ? "token-unavailable"
                : (!openedAt ? "connection-failed" : "disconnected");
            endChat(reasonStatus);

            var closeStatusEl = document.getElementById("callStatus");
            if (closeStatusEl) {
                closeStatusEl.textContent += " (code " + event.code + ", " + Math.round(aliveMs / 1000) + "s)";
            }
        };

        socket.onerror = function () {
            if (ws !== socket) return;
            try {
                if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
                    socket.close(4000, "Connection error");
                }
            } catch (e) { }
        };
    } catch (err) {
        if (!sessionIsCurrent()) return;
        connectionInProgress = false;
        console.error("Could not start call:", err);
        if (err && (err.name === "NotAllowedError" || err.name === "SecurityError")) {
            endChat("microphone-required");
            return;
        }
        endChat("connection-failed");
    }
}

function scheduleVoiceReconnect(reason) {
    console.warn("Voice call dropped, not reconnecting:", reason || "");
    if (callSessionActive) endChat("disconnected");
}

function setCallStatus(status) {
    var callLayer = document.getElementById("callLayer");
    var callStatus = document.getElementById("callStatus");
    var callTitle = document.getElementById("callTitle");

    if (!callLayer || !callStatus) return;
    callLayer.setAttribute("data-status", status);

    var labels = {
        dialing: "Connecting voice / audio...",
        ringing: "Connecting...",
        connecting: "Connecting...",
        reconnecting: "Reconnecting...",
        "connection-lost": "Connection lost. Reconnecting...",
        "service-busy": "Voice service busy. Please try again later.",
        "token-unavailable": "Could not start the voice call. Please try again.",
        "connection-failed": "Voice connection failed. Please try again.",
        connected: "Connected...",
        listening: "Listening...",
        thinking: "Thinking...",
        speaking: "Speaking...",
        ended: "Call ended.",
        "remote-ended": "Voice service ended the call.",
        disconnected: "Connection lost. Please restart.",
        "microphone-required": "Allow microphone access to start.",
        "call-in-other-window": "A voice call is already active in another window."
    };
    callStatus.textContent = labels[status] || "Listening...";

    if (callTitle) {
        callTitle.textContent = (status === "dialing" || status === "ringing")
            ? "Dial50 Room Assistant"
            : "Dial50 Demo Hospital";
    }
}

function endChat(finalStatus) {
    if (callSessionActive && AUTOMATIC_END_STATUSES.indexOf(finalStatus) === -1
        && Date.now() - lastEndClickAt > END_CLICK_WINDOW_MS) {
        console.warn("[voice] blocked a request to end the call without an End button click", new Error().stack);
        return;
    }
    lastEndClickAt = 0;
    persistVoiceDebug("endChat", { status: finalStatus || "ended", stack: String(new Error().stack || "").split("\n").slice(1, 7) });

    userEndedCall = true;
    serverEnding = false;
    callSessionActive = false;
    callSessionGeneration += 1;
    connectionInProgress = false;

    if (window.UnifiedAIBridge && typeof window.UnifiedAIBridge.disconnect === "function") {
        window.UnifiedAIBridge.disconnect();
    }

    pendingVoiceMessages = [];

    releaseCallOwnership();
    stopHeartbeat();

    clearInterval(countdownTimer);
    countdownTimer = null;
    resetCallTimer();
    clearTimeout(drainTimer);
    clearTimeout(connectionTimeoutTimer);
    clearTimeout(statusTransitionTimer);
    clearTimeout(serverEndTimer);
    clearTimeout(queueFlushTimer);
    connectionTimeoutTimer = null;
    statusTransitionTimer = null;
    serverEndTimer = null;
    queueFlushTimer = null;

    micMuted = false;
    speakerMuted = false;
    if (micBtn) micBtn.classList.remove("muted");
    if (speakerBtn) speakerBtn.classList.remove("muted");
    if (speakerGainNode) speakerGainNode.gain.value = 1;

    flushPlayback();
    stopMicrophone();

    if (ws) {
        var old = ws;
        ws = null;
        try {
            if (CFG.SEND_END_CALL === true && old.readyState === WebSocket.OPEN) {
                old.send(JSON.stringify({ type: "end_call" }));
            }
        } catch (e) { }
        try { old.close(); } catch (e) { }
    }

    setState("ended");
    setCallStatus(finalStatus || "ended");
    window.dispatchEvent(new CustomEvent("voice-agent:connection-state", {
        detail: { connected: false, reconnecting: false }
    }));

    if (typeof window.flushPendingPopups === "function") {
        try { window.flushPendingPopups(); } catch (e) { }
    }
}

function initializeAvatarEvents() {
    initializeAvatarElements();

    if (!body) {
        console.error("Dial50: document.body not available.");
        return;
    }

    if (endChatBtn) {
        endChatBtn.addEventListener("click", function () {
            console.log("Dial50: End Chat clicked");
            endChat("ended");
        });
    }

    if (homeBtn) {
        homeBtn.addEventListener("click", function () {
            console.log("Dial50: Home clicked");
            var state = body.getAttribute("data-state");
            if (callSessionActive || state === "connecting" || state === "connected") {
                if (window.UnifiedAIHost && typeof window.UnifiedAIHost.minimizeCall === "function") {
                    window.UnifiedAIHost.minimizeCall();
                } else {
                    console.warn("Unified AI in-page assistant bar is unavailable; the active call will continue.");
                }
                return;
            }
            setState("idle");
        });
    }

    if (micBtn) {
        micBtn.addEventListener("click", function () {
            console.log("Dial50: Mic clicked");
            micMuted = !micMuted;
            micBtn.classList.toggle("muted", micMuted);
            if (micNode) {
                micNode.port.postMessage({ muted: micMuted });
            }
        });
    }

    if (speakerBtn) {
        speakerBtn.addEventListener("click", function () {
            console.log("Dial50: Speaker clicked");
            toggleSpeaker();
        });
    }

    if (assistantBackBtn) {
        assistantBackBtn.addEventListener("click", function () {
            console.log("Dial50: Assistant Back clicked");
            var state = body.getAttribute("data-state");
            if (callSessionActive || state === "connecting" || state === "connected") {
                if (window.UnifiedAIHost && typeof window.UnifiedAIHost.minimizeCall === "function") {
                    window.UnifiedAIHost.minimizeCall();
                } else {
                    endChat("ended");
                    setState("idle");
                }
                return;
            }
            setState("idle");
        });
    }

    if (idleBtn) {
        idleBtn.addEventListener("click", function () {
            console.log("Dial50: Start Call clicked");
            var state = body.getAttribute("data-state");

            if (state === "connecting" || state === "connected") {
                if (window.UnifiedAIHost && typeof window.UnifiedAIHost.showChat === "function") {
                    window.UnifiedAIHost.showChat();
                }
                return;
            }

            callSessionActive = false;
            if (window.UnifiedAIHost && typeof window.UnifiedAIHost.showChat === "function") {
                window.UnifiedAIHost.showChat();
            }
            setState("connecting");
            setCallStatus("dialing");
            connectToAvatarBackend();
        });
    }

    if (endedMicBtn) {
        endedMicBtn.addEventListener("click", function () {
            console.log("Dial50: Ended Mic / Start Again clicked");
            if (idleBtn) {
                idleBtn.click();
            }
        });
    }
}

if (isEmbeddedInUnifiedHost()) {
    console.warn("Voice client not started inside the Unified AI frame; the Home page owns the call.");
} else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
        initializeAvatarUI();
        initializeAvatarEvents();
    });
} else {
    initializeAvatarUI();
    initializeAvatarEvents();
}

window.setState = setState;
window.setCallStatus = setCallStatus;
window.connectToAvatarBackend = connectToAvatarBackend;
window.endChat = endChat;
window.getWidgetUserId = getWidgetUserId;

function queueVoiceAgentMessage(message) {
    if (!message || typeof message !== "object" || !callSessionActive) return false;
    if (message.type === "app_context") {
        pendingVoiceMessages = pendingVoiceMessages.filter(function (pending) {
            return pending.type !== "app_context";
        });
    }
    if (pendingVoiceMessages.length >= 100) {
        console.error("Voice message queue is full; refusing to discard a pending action result.");
        return false;
    }
    pendingVoiceMessages.push(message);
    return true;
}

window.sendVoiceAgentMessage = function (message) {
    if (message && message.type === "app_order_confirmed" && CFG.SEND_ORDER_CONFIRMED !== true) {
        return false;
    }
    if (!CFG.SEND_APP_MESSAGES && message
        && (message.type === "app_context" || message.type === "app_action_result")) {
        return false;
    }
    var socket = ws;
    if (!socket) {
        if (!callSessionActive) return false;
        return queueVoiceAgentMessage(message);
    }

    if (socket.readyState === WebSocket.CONNECTING) {
        return queueVoiceAgentMessage(message);
    }
    if (socket.readyState !== WebSocket.OPEN) {
        if (!callSessionActive) return false;
        return queueVoiceAgentMessage(message);
    }

    if (queueFlushTimer || pendingVoiceMessages.length) {
        var queued = queueVoiceAgentMessage(message);
        if (queued && !queueFlushTimer) {
            queueFlushTimer = setTimeout(function () { flushPendingVoiceMessages(socket); }, 50);
        }
        return queued;
    }

    if (sendTextSafely(socket, message)) return true;
    return queueVoiceAgentMessage(message);
};

window.Dial50VAD = {
    Detector: LocalVoiceActivityDetector,
    instance: localVad,
    processFrame: processLocalVADFrame,
    reset: function () { localVad.reset(); },
    getState: function () { return { isSpeaking: localVad.isSpeaking, lastRms: localVad.lastRms, threshold: localVad.energyThreshold }; }
};