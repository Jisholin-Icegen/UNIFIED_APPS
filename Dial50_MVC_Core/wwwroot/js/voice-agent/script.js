
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

if (document.readyState === "loading") {

    document.addEventListener("DOMContentLoaded", function () {
        initializeAvatarUI();
    });

} else {

    initializeAvatarUI();

}

// =========================================================
// CONFIG
// =========================================================
if (!window.APP_CONFIG) {
    console.warn("window.APP_CONFIG is missing — check that config.js is loaded before script.js.");
}

var CFG = window.APP_CONFIG || {};

var SAMPLE_RATE = 24000;
var MIC_FRAME_SAMPLES = 480;

var BACKEND_HTTP = CFG.BACKEND_HTTP || '';
var BACKEND_WS = CFG.BACKEND_WS || (BACKEND_HTTP ? BACKEND_HTTP.replace(/^http/i, "ws") : '');
var PROFILE_API_URL = CFG.PROFILE_API_URL || '';

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
var elapsedSeconds = 0;

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
    return m + ":" + (s % 60).toString().padStart(2, "0");
}
function renderTimer() {
    if (timerEl) timerEl.textContent = formatTime(elapsedSeconds);
}

async function fetchProfileLanguage(id) {
    if (!id || typeof PROFILE_API_URL === 'undefined') return null;
    try {
        var tenantId = window.BedContext.getTenantId();
        if (!tenantId) {
            console.warn("GetProfileOld failed: No TenantId in BedContext");
            return null;
        }

        var res = await fetch(PROFILE_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Tenant-ID": tenantId
            },
            body: JSON.stringify({ userId: String(id) })
        });

        if (!res.ok) throw new Error("HTTP " + res.status);
        var result = await res.json();
        if (!result.status || !result.data || !result.data.Language) return null;
        return result.data.Language;
    } catch (err) {
        console.warn("GetProfileOld failed:", err.message);
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

var languageReady = loadRegionLanguages().catch(function (err) {
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
    if (currentLanguage) payload.language = currentLanguage.name;
    if (dialect) payload.dialect = dialect;
    if (voice) payload.voice = voice;
    if (speed !== undefined && speed !== null && !isNaN(speed)) payload.speed = speed;

    var res;
    try {
        res = await fetch(BACKEND_HTTP + "/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error("/token unreachable:", err.message);
        throw err;
    }

    if (!res.ok) {
        var tokenError = new Error("/token returned " + res.status);
        tokenError.status = res.status;
        tokenError.retryAfter = res.headers.get("Retry-After");
        console.error(tokenError.message, tokenError.retryAfter ? "Retry-After: " + tokenError.retryAfter : "");
        throw tokenError;
    }

    var data = await res.json();
    if (!data || !data.access_token) throw new Error("/token response did not contain an access token.");
    return data.access_token;
}

// =========================================================
// AUDIO
// =========================================================
var ws = null;
var pendingVoiceMessages = [];
var reconnectTimer = null;
var connectionTimeoutTimer = null;
var statusTransitionTimer = null;
var serverEndTimer = null;
var connectionInProgress = false;
var callSessionActive = false;
var callAccessToken = null;
var tokenRequestAttemptedForSession = false;
var callSessionGeneration = 0;
var reconnectAttempts = 0;
var audioContext = null;
var mediaStream = null;
var micNode = null;
var micSink = null;
var highPassNode = null;
var micMuted = false;
var speakerMuted = false;
var speakerGainNode = null;

var nextPlayTime = 0;
var activeSources = [];
var drainTimer = null;
var stableResetTimer = null;

// =========================================================
// TOKEN REFRESH ON RECONNECT
// The /token access token is a short-lived JWT. Reconnecting forever with the SAME
// token fails once it has expired (or was single-use), which looks like endless
// "Reconnecting...". Fetch a fresh one when it is about to expire, was refused, or
// the last attempt never got as far as an open socket.
// =========================================================
var failedOpenStreak = 0;
var forceTokenRefresh = false;
var lastTokenFetchAt = 0;
var AUTH_CLOSE_CODES = [1008, 4001, 4003, 4401, 4403];

function tokenExpiresInMs(token) {
    try {
        var part = String(token).split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        part += "=".repeat((4 - part.length % 4) % 4);
        var payload = JSON.parse(atob(part));
        return payload && payload.exp ? payload.exp * 1000 - Date.now() : Infinity;
    } catch (e) {
        return Infinity;
    }
}

// =========================================================
// SINGLE CALL OWNER
// Two voice clients for the same bed (a second tab, or an app page loaded inside
// the Home iframe without ?UnifiedAI=1) open a second /voice-assistant socket. Most
// voice backends keep one live session per user, so the two sockets evict each
// other and both "Reconnect" forever. Only ONE window may own the call.
// =========================================================
var callOwnerRelease = null;
var callOwnerPending = false;

function isEmbeddedInUnifiedHost() {
    try { return window.parent !== window && !!window.parent.UnifiedAIHost; } catch (e) { return false; }
}

function claimCallOwnership() {
    if (isEmbeddedInUnifiedHost()) return Promise.resolve(false);   // the Home page owns the call
    if (callOwnerRelease) return Promise.resolve(true);             // already ours
    if (!navigator.locks || !navigator.locks.request) return Promise.resolve(true);   // needs HTTPS/localhost
    return new Promise(function (resolve) {
        navigator.locks.request("dial50-voice-call", { ifAvailable: true }, function (lock) {
            if (!lock) { resolve(false); return; }
            // hold the lock until End Call; the browser frees it automatically if the tab closes
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

// =========================================================
// SILERO NEURAL VAD — browser-side ONNX Runtime Web
// Original 24 kHz PCM16 audio continues to the backend unchanged.
// A separate copy is resampled to 16 kHz only for Silero inference.
// =========================================================
var vadCfg = (CFG && CFG.VAD) || {};

function loadExternalScriptOnce(src) {
    if (window.ort) return Promise.resolve(window.ort);
    if (window.__dial50OrtLoading) return window.__dial50OrtLoading;
    window.__dial50OrtLoading = new Promise(function (resolve, reject) {
        var existing = document.querySelector('script[data-dial50-ort="true"]');
        if (existing) {
            existing.addEventListener("load", function () {
                window.ort ? resolve(window.ort) : reject(new Error("ONNX Runtime loaded but window.ort is unavailable."));
            }, { once: true });
            existing.addEventListener("error", function () { reject(new Error("Could not load ONNX Runtime Web.")); }, { once: true });
            return;
        }
        var script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.dataset.dial50Ort = "true";
        script.onload = function () {
            window.ort ? resolve(window.ort) : reject(new Error("ONNX Runtime script loaded but window.ort is unavailable."));
        };
        script.onerror = function () { reject(new Error("Failed to load ONNX Runtime Web from " + src)); };
        document.head.appendChild(script);
    });
    return window.__dial50OrtLoading;
}

class SileroVoiceActivityDetector {
    constructor(options) {
        options = options || {};
        this.sampleRate = 16000;
        this.frameSize = 512;
        this.contextSize = 64;
        this.threshold = typeof options.threshold === "number" ? options.threshold : 0.50;
        this.negativeThreshold = typeof options.negativeThreshold === "number" ? options.negativeThreshold : 0.35;
        this.bargeInThreshold = typeof options.bargeInThreshold === "number" ? options.bargeInThreshold : 0.65;
        this.silenceDurationMs = typeof options.silenceDurationMs === "number" ? options.silenceDurationMs : 420;
        this.speechStartDurationMs = typeof options.speechStartDurationMs === "number" ? options.speechStartDurationMs : 96;
        this.bargeInStartDurationMs = typeof options.bargeInStartDurationMs === "number" ? options.bargeInStartDurationMs : 220;
        this.modelPath = options.modelPath || "/models/silero-vad.onnx";
        this.ortScriptUrl = options.ortScriptUrl || "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.js";
        this.wasmPaths = options.wasmPaths || "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/";
        this.session = null;
        this.isReady = false;
        this.isLoading = false;
        this.loadPromise = null;
        this.state = new Float32Array(2 * 128);
        this.context = new Float32Array(this.contextSize);
        this.audioFrame = new Float32Array(this.frameSize);
        this.audioFrameCount = 0;
        this.inferenceQueue = [];
        this.inferenceRunning = false;
        this.isSpeaking = false;
        this.speechTimeMs = 0;
        this.silenceTimeMs = 0;
        this.lastProbability = 0;
        this.lastError = null;
        this.generation = 0;
    }

    async load() {
        if (this.isReady) return true;
        if (this.loadPromise) return this.loadPromise;
        this.isLoading = true;
        this.loadPromise = (async () => {
            try {
                var ort = await loadExternalScriptOnce(this.ortScriptUrl);
                if (ort.env && ort.env.wasm) {
                    ort.env.wasm.wasmPaths = this.wasmPaths;
                    ort.env.wasm.numThreads = 1;
                    ort.env.wasm.proxy = false;
                }
                this.session = await ort.InferenceSession.create(this.modelPath, {
                    executionProviders: ["wasm"],
                    graphOptimizationLevel: "all"
                });
                ["input", "state", "sr"].forEach((name) => {
                    if (this.session.inputNames.indexOf(name) === -1) {
                        throw new Error("Silero ONNX model is missing required input: " + name);
                    }
                });
                ["output", "stateN"].forEach((name) => {
                    if (this.session.outputNames.indexOf(name) === -1) {
                        throw new Error("Silero ONNX model is missing required output: " + name);
                    }
                });
                this.isReady = true;
                this.lastError = null;
                console.info("Dial50: Silero Neural VAD loaded successfully", {
                    model: this.modelPath, runtime: "ONNX Runtime Web / WASM",
                    sampleRate: this.sampleRate, frameSize: this.frameSize
                });
                return true;
            } catch (err) {
                this.lastError = err;
                this.isReady = false;
                this.session = null;
                console.error("Dial50: Silero VAD failed to load or initialize. Check the ONNX model URL and model compatibility.", err);
                return false;
            } finally {
                this.isLoading = false;
            }
        })();
        return this.loadPromise;
    }

    resample24kTo16k(samples) {
        var input = samples instanceof Int16Array ? samples : new Int16Array(samples);
        var outputLength = Math.floor(input.length * 2 / 3);
        var output = new Float32Array(outputLength);
        for (var i = 0; i < outputLength; i++) {
            var sourcePosition = i * 1.5;
            var left = Math.floor(sourcePosition);
            var right = Math.min(left + 1, input.length - 1);
            var fraction = sourcePosition - left;
            var a = input[left] / 32768;
            var b = input[right] / 32768;
            output[i] = a + (b - a) * fraction;
        }
        return output;
    }

    enqueueAudio(samples16k, playbackActive) {
        if (!this.isReady || !samples16k || !samples16k.length) return;
        for (var i = 0; i < samples16k.length; i++) {
            this.audioFrame[this.audioFrameCount++] = samples16k[i];
            if (this.audioFrameCount === this.frameSize) {
                this.inferenceQueue.push({
                    frame: this.audioFrame.slice(),
                    playbackActive: !!playbackActive,
                    generation: this.generation
                });
                this.audioFrameCount = 0;
            }
        }
        if (this.inferenceQueue.length > 12) {
            this.inferenceQueue.splice(0, this.inferenceQueue.length - 12);
        }
        this.runInferenceQueue();
    }

    async runInferenceQueue() {
        if (this.inferenceRunning || !this.isReady || !this.session) return;
        this.inferenceRunning = true;
        try {
            while (this.inferenceQueue.length && this.isReady) {
                var item = this.inferenceQueue.shift();
                if (item.generation === this.generation) {
                    await this.inferFrame(item.frame, item.playbackActive, item.generation);
                }
            }
        } catch (err) {
            this.lastError = err;
            console.error("Dial50: Silero inference error:", err);
        } finally {
            this.inferenceRunning = false;
            if (this.inferenceQueue.length && this.isReady) this.runInferenceQueue();
        }
    }

    async inferFrame(frame, playbackActive, generation) {
        var ort = window.ort;
        var inputData = new Float32Array(this.contextSize + this.frameSize);
        inputData.set(this.context, 0);
        inputData.set(frame, this.contextSize);
        var inputTensor = new ort.Tensor("float32", inputData, [1, inputData.length]);
        var stateTensor = new ort.Tensor("float32", this.state, [2, 1, 128]);
        var sampleRateTensor = new ort.Tensor("int64", BigInt64Array.from([16000n]), []);
        var outputs;
        try {
            outputs = await this.session.run({ input: inputTensor, state: stateTensor, sr: sampleRateTensor });
            if (generation !== this.generation) return;
            var probability = Number(outputs.output.data[0]) || 0;
            this.state.set(outputs.stateN.data);
            this.context.set(inputData.subarray(inputData.length - this.contextSize));
            this.lastProbability = probability;
            this.updateSpeechState(probability, playbackActive);
        } finally {
            [inputTensor, stateTensor, sampleRateTensor,
                outputs && outputs.output, outputs && outputs.stateN].forEach(function (tensor) {
                if (tensor && typeof tensor.dispose === "function") tensor.dispose();
            });
        }
    }

    updateSpeechState(probability, playbackActive) {
        var frameDurationMs = this.frameSize / this.sampleRate * 1000;
        var startThreshold = playbackActive ? this.bargeInThreshold : this.threshold;
        var startDuration = playbackActive ? this.bargeInStartDurationMs : this.speechStartDurationMs;
        if (!this.isSpeaking) {
            if (probability >= startThreshold) {
                this.speechTimeMs += frameDurationMs;
                if (this.speechTimeMs >= startDuration) {
                    this.isSpeaking = true;
                    this.speechTimeMs = 0;
                    this.silenceTimeMs = 0;
                    onLocalSpeechStart(probability);
                }
            } else {
                this.speechTimeMs = 0;
            }
            return;
        }
        if (probability >= this.negativeThreshold) {
            this.silenceTimeMs = 0;
        } else {
            this.silenceTimeMs += frameDurationMs;
            if (this.silenceTimeMs >= this.silenceDurationMs) {
                this.isSpeaking = false;
                this.speechTimeMs = 0;
                this.silenceTimeMs = 0;
                onLocalSpeechEnd(probability);
            }
        }
    }

    process(samples, sampleRate, playbackActive) {
        if (!this.isReady || !samples || !samples.length) return;
        if (sampleRate !== 24000) {
            console.warn("Dial50 Silero VAD expects 24 kHz input before resampling; received", sampleRate);
            return;
        }
        this.enqueueAudio(this.resample24kTo16k(samples), playbackActive);
    }

    reset() {
        this.generation++;
        this.state.fill(0);
        this.context.fill(0);
        this.audioFrame.fill(0);
        this.audioFrameCount = 0;
        this.inferenceQueue.length = 0;
        this.isSpeaking = false;
        this.speechTimeMs = 0;
        this.silenceTimeMs = 0;
        this.lastProbability = 0;
    }

    getState() {
        return {
            engine: "silero-neural-vad", modelReady: this.isReady,
            isLoading: this.isLoading, isSpeaking: this.isSpeaking,
            speechProbability: this.lastProbability, threshold: this.threshold,
            negativeThreshold: this.negativeThreshold,
            silenceDurationMs: this.silenceDurationMs,
            queuedFrames: this.inferenceQueue.length,
            error: this.lastError ? this.lastError.message : null
        };
    }
}

var localVad = new SileroVoiceActivityDetector({
    threshold: typeof vadCfg.threshold === "number" ? vadCfg.threshold : 0.50,
    negativeThreshold: typeof vadCfg.negativeThreshold === "number" ? vadCfg.negativeThreshold : 0.35,
    bargeInThreshold: typeof vadCfg.bargeInThreshold === "number" ? vadCfg.bargeInThreshold : 0.65,
    silenceDurationMs: typeof vadCfg.silenceDurationMs === "number" ? vadCfg.silenceDurationMs : 420,
    speechStartDurationMs: typeof vadCfg.speechStartDurationMs === "number" ? vadCfg.speechStartDurationMs : 96,
    bargeInStartDurationMs: typeof vadCfg.bargeInStartDurationMs === "number" ? vadCfg.bargeInStartDurationMs : 220,
    modelPath: vadCfg.modelPath,
    ortScriptUrl: vadCfg.ortScriptUrl,
    wasmPaths: vadCfg.wasmPaths
});
var localBargeIn = vadCfg.localBargeIn !== false;

function processLocalVADFrame(buffer) {
    if (!localVad || micMuted || !buffer) return;
    var samples;
    if (buffer instanceof Int16Array) samples = buffer;
    else if (buffer instanceof ArrayBuffer && buffer.byteLength >= 2) {
        samples = new Int16Array(buffer, 0, Math.floor(buffer.byteLength / 2));
    } else return;
    var playbackActive = !!(audioContext && activeSources.length > 0 && audioContext.currentTime < nextPlayTime);
    localVad.process(samples, SAMPLE_RATE, playbackActive);
}

function onLocalSpeechStart(probability) {
    if (localBargeIn) {
        flushPlayback();
        var layer = document.getElementById("callLayer");
        if (layer) {
            var status = layer.getAttribute("data-status");
            if (status === "speaking" || status === "thinking") setCallStatus("listening");
        }
    }
    console.info("Dial50 Silero: speech started; probability=" + Number(probability).toFixed(3));
}

function onLocalSpeechEnd(probability) {
    console.info("Dial50 Silero: speech ended; probability=" + Number(probability).toFixed(3));
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

    var source = audioContext.createMediaStreamSource(mediaStream);
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
        if (ws && ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(e.data);
            } catch (error) {
                console.warn("Voice audio frame could not be sent:", error && error.message ? error.message : error);
            }
        }
    };

    highPassNode = audioContext.createBiquadFilter();
    highPassNode.type = "highpass";
    highPassNode.frequency.value = 120;
    highPassNode.Q.value = 0.7;

    micSink = audioContext.createGain();
    micSink.gain.value = 0;
    source.connect(highPassNode);
    highPassNode.connect(micNode);
    micNode.connect(micSink);
    micSink.connect(audioContext.destination);
}

function stopMicrophone() {
    if (localVad) localVad.reset();
    if (highPassNode) { highPassNode.disconnect(); highPassNode = null; }
    if (micNode) { micNode.port.onmessage = null; micNode.disconnect(); micNode = null; }
    if (micSink) { micSink.disconnect(); micSink = null; }
    if (mediaStream) { mediaStream.getTracks().forEach(function (t) { t.stop(); }); mediaStream = null; }
    if (audioContext) { audioContext.close().catch(function () { }); audioContext = null; }
}

document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible" || !callSessionActive
        || !audioContext || audioContext.state !== "suspended") return;

    audioContext.resume().catch(function (error) {
        console.warn("Voice audio could not resume after returning to the call tab:", error && error.message ? error.message : error);
    });
});

// =========================================================
// BACKEND CONNECTION
// =========================================================
async function connectToAvatarBackend() {
    if (!body) body = document.body;
    if (!body || !["connecting", "connected"].includes(body.getAttribute("data-state"))
        || connectionInProgress || ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) return;

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
    }
    if (!callSessionActive) {
        callSessionActive = true;
        callSessionGeneration += 1;
        reconnectAttempts = 0;
        elapsedSeconds = 0;
        tokenRequestAttemptedForSession = false;
    }
    var tokenRequestAttempted = false;
    var sessionGeneration = callSessionGeneration;
    var sessionIsCurrent = function () {
        return callSessionActive && sessionGeneration === callSessionGeneration
            && body && ["connecting", "connected"].includes(body.getAttribute("data-state"));
    };
    connectionInProgress = true;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;

    try {
        await languageReady;
        if (!sessionIsCurrent()) return;
        await localVad.load();
        if (!sessionIsCurrent()) return;
        await startMicrophone();
        if (!sessionIsCurrent()) return;
        setCallStatus(reconnectAttempts ? "reconnecting" : "ringing");

        var token = callAccessToken;
        if (token && reconnectAttempts > 0
            && (forceTokenRefresh || failedOpenStreak >= 1 || tokenExpiresInMs(token) < 60000)
            && Date.now() - lastTokenFetchAt > 5000) {
            lastTokenFetchAt = Date.now();
            try {
                var freshToken = await fetchToken();
                if (freshToken) {
                    token = freshToken;
                    callAccessToken = freshToken;
                    forceTokenRefresh = false;
                    failedOpenStreak = 0;
                    console.info("Voice call: reconnecting with a fresh access token.");
                }
            } catch (refreshError) {
                console.warn("Voice call: token refresh failed, trying the previous token.",
                    refreshError && refreshError.message ? refreshError.message : refreshError);
            }
            if (!sessionIsCurrent()) return;
        }
        if (!token) {
            if (tokenRequestAttemptedForSession) {
                connectionInProgress = false;
                setCallStatus("token-unavailable");
                return;
            }
            tokenRequestAttempted = true;
            tokenRequestAttemptedForSession = true;
            token = await fetchToken();
        }
        if (!sessionIsCurrent()) return;
        if (!token) throw new Error("No token — cannot open /voice-assistant.");
        callAccessToken = token;
        saveResumableCall(token);
        var tokenTtlMs = tokenExpiresInMs(token);
        console.info("Voice call token lifetime:", isFinite(tokenTtlMs) ? Math.round(tokenTtlMs / 1000) + " s" : "no expiry in token");

        var socket = new WebSocket(BACKEND_WS + "/voice-assistant?token=" + encodeURIComponent(token));
        socket.binaryType = "arraybuffer";
        ws = socket;
        var openedAt = 0;
        connectionTimeoutTimer = setTimeout(function () {
            if (ws === socket && socket.readyState === WebSocket.CONNECTING) {
                socket.close(4000, "Connection timed out");
            }
        }, 15000);

        socket.onopen = function () {
            if (ws !== socket) return;
            openedAt = Date.now();
            failedOpenStreak = 0;
            clearTimeout(connectionTimeoutTimer);
            connectionTimeoutTimer = null;
            connectionInProgress = false;
            clearTimeout(stableResetTimer);
            stableResetTimer = setTimeout(function () {
                if (ws === socket && socket.readyState === WebSocket.OPEN) reconnectAttempts = 0;
            }, 10000);
            goConnected();
            window.dispatchEvent(new CustomEvent("voice-agent:connection-state", {
                detail: { connected: true, reconnecting: reconnectAttempts > 0 }
            }));
            while (pendingVoiceMessages.length && ws === socket && socket.readyState === WebSocket.OPEN) {
                try {
                    socket.send(JSON.stringify(pendingVoiceMessages.shift()));
                } catch (error) {
                    if (socket.readyState !== WebSocket.OPEN) break;
                    console.error("Could not send queued voice-agent message:", error);
                }
            }
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

                case "transcript_delta":
                case "transcript_done":
                case "session.created":
                case "session.updated":
                case "response.audio_transcript.delta":
                case "response.audio_transcript.done":
                    break;

                case "ping":
                    if (socket.readyState === WebSocket.OPEN) {
                        try {
                            socket.send(JSON.stringify(Object.assign({}, msg, { type: "pong" })));
                        } catch (error) {
                            console.warn("Could not reply to voice WebSocket ping:", error && error.message ? error.message : error);
                        }
                    }
                    break;

                case "pong":
                    break;

                case "call_ended": {
                    clearTimeout(serverEndTimer);
                    var remainingMs = audioContext
                        ? Math.max(0, (nextPlayTime - audioContext.currentTime) * 1000)
                        : 0;
                    serverEndTimer = setTimeout(function () {
                        serverEndTimer = null;
                        if (ws === socket && socket.readyState === WebSocket.OPEN) {
                            setCallStatus("listening");
                        }
                    }, remainingMs + 300);
                    break;
                }

                default:
                    break;
            }
        };

        socket.onclose = function (event) {
            if (ws !== socket) return;
            clearTimeout(stableResetTimer);
            clearTimeout(connectionTimeoutTimer);
            clearTimeout(serverEndTimer);
            connectionTimeoutTimer = null;
            serverEndTimer = null;
            connectionInProgress = false;
            ws = null;
            var aliveMs = openedAt ? Date.now() - openedAt : 0;
            if (!openedAt) failedOpenStreak += 1;                       // never reached an open socket
            if (AUTH_CLOSE_CODES.indexOf(event.code) !== -1) forceTokenRefresh = true;
            console.warn("Voice WebSocket closed:", event.code, event.reason || "No close reason",
                "wasClean:", event.wasClean, "| openForMs:", aliveMs,
                "| tokenLeftMs:", callAccessToken ? Math.round(tokenExpiresInMs(callAccessToken)) : "n/a",
                "| attempts:", reconnectAttempts);
            // paste JSON.stringify(window.__voiceDiag) in the console to share the last drops
            window.__voiceDiag = (window.__voiceDiag || []).slice(-19).concat([{
                at: new Date().toISOString(), code: event.code, reason: event.reason || "",
                wasClean: event.wasClean, openForMs: aliveMs, openedFirst: !!openedAt,
                tokenLeftMs: callAccessToken ? Math.round(tokenExpiresInMs(callAccessToken)) : null,
                attempts: reconnectAttempts
            }]);
            scheduleVoiceReconnect("WebSocket close " + event.code);
        };

        socket.onerror = function () {
            if (ws !== socket) return;
            setCallStatus("reconnecting");
            try {
                if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
                    socket.close(4000, "Connection error");
                }
            } catch (error) {
                console.warn("Could not close the failed voice WebSocket:", error && error.message ? error.message : error);
            }
        };
    } catch (err) {
        if (!sessionIsCurrent()) return;
        connectionInProgress = false;
        console.error("Could not connect the voice call:", err);
        if (err && (err.name === "NotAllowedError" || err.name === "SecurityError")) {
            setCallStatus("microphone-required");
            return;
        }
        if (tokenRequestAttempted && !callAccessToken) {
            setCallStatus(err && err.status === 429 ? "service-busy" : "token-unavailable");
            return;
        }
        if (!callAccessToken) {
            setCallStatus("connection-failed");
            return;
        }
        scheduleVoiceReconnect("connection setup failure");
    }
}

function scheduleVoiceReconnect(reason) {
    if (!callSessionActive || !body) return;
    if (!["connecting", "connected"].includes(body.getAttribute("data-state"))) {
        setState("connecting");
    }
    if (!callAccessToken) {
        setCallStatus(tokenRequestAttemptedForSession ? "token-unavailable" : "connection-failed");
        return;
    }

    reconnectAttempts += 1;
    var delay = Math.min(15000, 1000 * Math.pow(2, Math.min(reconnectAttempts - 1, 4)));
    setCallStatus("reconnecting");
    console.warn("Voice call reconnect scheduled after " + (reason || "connection loss")
        + " in " + delay + "ms; reusing the existing access token.");
    window.dispatchEvent(new CustomEvent("voice-agent:connection-state", {
        detail: { connected: false, reconnecting: true, attempt: reconnectAttempts, retryInMs: delay }
    }));
    reconnectTimer = setTimeout(function () {
        if (callSessionActive) connectToAvatarBackend();
    }, delay);
}

function goConnected() {
    if (!countdownTimer) {
        renderTimer();
        startCountdown();
    }
    setState("connected");
    setCallStatus("connecting");
    clearTimeout(statusTransitionTimer);
    setTimeout(function () {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        setCallStatus("connected");
        statusTransitionTimer = setTimeout(function () {
            if (ws && ws.readyState === WebSocket.OPEN) setCallStatus("listening");
        }, 700);
    }, 700);
}

function startCountdown() {
    clearInterval(countdownTimer);
    countdownTimer = setInterval(function () {
        elapsedSeconds += 1;
        renderTimer();
    }, 1000);
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
    clearTimeout(stableResetTimer);
    clearResumableCall();
    releaseCallOwnership();
    callSessionActive = false;
    callAccessToken = null;
    tokenRequestAttemptedForSession = false;
    callSessionGeneration += 1;
    connectionInProgress = false;
    clearInterval(countdownTimer);
    countdownTimer = null;
    clearTimeout(drainTimer);
    clearTimeout(reconnectTimer);
    clearTimeout(connectionTimeoutTimer);
    clearTimeout(statusTransitionTimer);
    clearTimeout(serverEndTimer);
    reconnectTimer = null;
    connectionTimeoutTimer = null;
    statusTransitionTimer = null;
    serverEndTimer = null;
    reconnectAttempts = 0;
    elapsedSeconds = 0;
    pendingVoiceMessages = [];

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

// =========================================================
// EVENTS
// =========================================================

function initializeAvatarEvents() {

    initializeAvatarElements();

    if (!body) {
        console.error("Dial50: document.body not available.");
        return;
    }

    if (endChatBtn) {
        endChatBtn.addEventListener("click", function () {
            console.log("Dial50: End Chat clicked");
            endChat();
        });
    }

    if (homeBtn) {
        homeBtn.addEventListener("click", function () {
            console.log("Dial50: Home clicked");
            if (callSessionActive) {
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
                micNode.port.postMessage({
                    muted: micMuted
                });
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
            if (body.getAttribute("data-state") === "connecting"
                || body.getAttribute("data-state") === "connected") {
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

    if (idleBtn) {
        idleBtn.addEventListener("click", function () {

            console.log("Dial50: Start Call clicked");

            var state = body.getAttribute("data-state");

            if (state === "connecting" || state === "connected") {
                if (state === "connecting" && callSessionActive && !connectionInProgress
                    && !reconnectTimer && !ws && !tokenRequestAttemptedForSession) {
                    connectToAvatarBackend();
                    return;
                }
                if (window.UnifiedAIHost && typeof window.UnifiedAIHost.showChat === "function") {
                    window.UnifiedAIHost.showChat();
                }
                return;
            }

            callSessionActive = false;
            callAccessToken = null;
            reconnectAttempts = 0;
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

   console.log("Dial50: All avatar events initialized", {
       idleBtn: !!idleBtn,
       micBtn: !!micBtn,
       speakerBtn: !!speakerBtn,
       endChatBtn: !!endChatBtn,
       endedMicBtn: !!endedMicBtn,
       body: !!body
   });
}


// =========================================================
// SAME CALL, SAME TOKEN, UNTIL "END CALL"
// While a call is live its token is kept for this tab. A page refresh resumes the call with that
// same token. Only the End Call button clears it. A heartbeat keeps the entry fresh so an old,
// abandoned entry (closed tab, logout) never auto-starts a call later.
// =========================================================
var RESUME_KEY = "dial50_voice_call";
var RESUME_MAX_AGE_MS = 90000;
var resumeHeartbeat = null;

function saveResumableCall(token) {
    try { sessionStorage.setItem(RESUME_KEY, JSON.stringify({ token: token, at: Date.now() })); } catch (e) { /* ignore */ }
    if (!resumeHeartbeat) {
        resumeHeartbeat = setInterval(function () {
            if (callSessionActive && callAccessToken) saveResumableCall(callAccessToken);
        }, 15000);
    }
}

function clearResumableCall() {
    clearInterval(resumeHeartbeat);
    resumeHeartbeat = null;
    try { sessionStorage.removeItem(RESUME_KEY); } catch (e) { /* ignore */ }
}

(function resumeCallAfterRefresh() {
    if (isEmbeddedInUnifiedHost()) return;
    var saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(RESUME_KEY) || "null"); } catch (e) { /* ignore */ }
    if (!saved || !saved.token || Date.now() - (saved.at || 0) > RESUME_MAX_AGE_MS) return;
    if (!/\/home(?:\/index)?\/?$/i.test(window.location.pathname)) return;   // only the Home shell owns the call
    window.addEventListener("load", function () {
        setTimeout(function () {
            var current = document.body && document.body.getAttribute("data-state");
            if (current && current !== "idle") return;
            // an expired token is useless: let the normal flow request a new one
            callAccessToken = tokenExpiresInMs(saved.token) > 60000 ? saved.token : null;
            setState("connecting");
            setCallStatus("dialing");
            connectToAvatarBackend();
        }, 900);
    });
})();

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
window.sendVoiceAgentMessage = function (message) {
    var socket = ws;
    if (!socket) {
        if (!callSessionActive) return false;
        return queueVoiceAgentMessage(message);
    }

    if (socket.readyState === WebSocket.CONNECTING) {
        if (message && message.type === "app_context") {
            pendingVoiceMessages = pendingVoiceMessages.filter(function (pending) {
                return pending.type !== "app_context";
            });
        }
        return queueVoiceAgentMessage(message);
    }
    if (socket.readyState !== WebSocket.OPEN) {
        if (!callSessionActive) return false;
        return queueVoiceAgentMessage(message);
    }

    try {
        socket.send(JSON.stringify(message));
        return true;
    } catch (error) {
        if (socket.readyState === WebSocket.OPEN) {
            console.error("Voice-agent action result could not be sent:", error);
        }
        return false;
    }
};

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
window.Dial50VAD = {
    Detector: SileroVoiceActivityDetector,
    instance: localVad,
    load: function () { return localVad.load(); },
    processFrame: processLocalVADFrame,
    reset: function () { localVad.reset(); },
    getState: function () { return localVad.getState(); }
};
