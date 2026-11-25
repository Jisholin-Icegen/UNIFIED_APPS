

const CLIENT_CONFIG = window.CLIENT_CONFIG || {
    backendUrl: "https://dial50-voice-agent-dev.bravemoss-bf12527e.centralindia.azurecontainerapps.io",
    defaultUserId: "9330",
    defaultLanguage: "English",
    defaultDialect: "United States",
    // defaultVoice: "en-US-Jenny:DragonHDLatestNeural",
    // defaultVoiceSpeed: "1.03"
};

if (!CLIENT_CONFIG.backendUrl) {
    throw new Error("[Grace] CLIENT_CONFIG.backendUrl is not configured.");
}

const VOICE_AGENT_WS_BASE =
    CLIENT_CONFIG.backendUrl
        .replace(/^http:/i, "ws:")
        .replace(/^https:/i, "wss:")
        .replace(/\/$/, "");

let latestFeedbackId = null;
let latestFeedbackData = null;
let screenWakeLock = null;


const DEBUG_LANG_SWITCH = true;

function logLangDebug(...args) {
    if (DEBUG_LANG_SWITCH) {
        console.log("[Grace][LangSwitch]", ...args);
    }
}


let activeLanguageConfig = {
    language: CLIENT_CONFIG.defaultLanguage,
    dialect: CLIENT_CONFIG.defaultDialect,
    voice: CLIENT_CONFIG.defaultVoice
};


let isSwitchingLanguage = false;


let userTranscriptBuffer = "";

let isCCEnabled = false; 

window.toggleCC = function () {
    isCCEnabled = !isCCEnabled;
    const ccBtn = document.getElementById('ccToggleBtn');
    const caption = document.getElementById('captionText');

    if (ccBtn) ccBtn.classList.toggle('active', isCCEnabled);

    if (caption) caption.classList.toggle('gf-caption-hidden', !isCCEnabled);
};

const LANGUAGE_SCRIPT_MAP = [
    { test: /[\u0B80-\u0BFF]/, language: "Tamil", dialect: "India", voice: "ta-IN-PallaviNeural" },
    { test: /[\u0900-\u097F]/, language: "Hindi", dialect: "India", voice: "hi-IN-SwaraNeural" },
    { test: /[\u0C00-\u0C7F]/, language: "Telugu", dialect: "India", voice: "te-IN-ShrutiNeural" },
    { test: /[\u0A80-\u0AFF]/, language: "Gujarati", dialect: "India", voice: "gu-IN-DhwaniNeural" }
];


function detectLanguageFromTranscript(text) {

    if (!text) {
        return null;
    }

    for (const entry of LANGUAGE_SCRIPT_MAP) {

        const matches =
            text.match(new RegExp(entry.test.source, "g"));

        if (matches && matches.length >= 4) {
            return entry;
        }
    }

    return null;
}


async function switchLanguageMidCall(newConfig) {

    isSwitchingLanguage = true;

    if (captionEl) {
        captionEl.textContent =
            `One moment — switching to ${newConfig.language}...`;
    }

    voiceClient?.endCall();
}




const screenIntro =
    document.getElementById("screenIntro");

const screenThanks =
    document.getElementById("screenThanks");

const talkToGraceBtn =
    document.getElementById("talkToGraceBtn");

const callOverlay =
    document.getElementById("callOverlay");

const liveTimerEl =
    document.getElementById("liveTimer");

const captionEl =
    document.getElementById("captionText");

const micToggleBtn =
    document.getElementById("micToggleBtn");

const endCallBtn =
    document.getElementById("endCallBtn");

const summaryOverlay =
    document.getElementById("summaryOverlay");

const summaryCloseBtn =
    document.getElementById("summaryCloseBtn");

const submitFeedbackBtn =
    document.getElementById("submitFeedbackBtn");

const talkAgainBtn =
    document.getElementById("talkAgainBtn");

const doneBtn =
    document.getElementById("doneBtn");


// =========================================================
// STATE
// =========================================================

let liveSeconds = 0;
let timerHandle = null;

let micOn = true;

let currentCallId = null;

let voiceClient = null;


// =========================================================
// CLASSIC FORM MODAL
// =========================================================

const classicOverlay =
    document.getElementById("classicOverlay");

const classicCloseBtn =
    document.getElementById("classicCloseBtn");

const classicSubmitBtn =
    document.getElementById("classicSubmitBtn");

const classicComments =
    document.getElementById("classicComments");

const moodBtns =
    document.querySelectorAll(".gf-mood-btn");

let selectedMood = null;



async function acquireScreenWakeLock() {

    if (!("wakeLock" in navigator)) {
        console.warn(
            "[Grace] Screen Wake Lock API is not supported by this browser."
        );
        return;
    }

    try {

        screenWakeLock =
            await navigator.wakeLock.request("screen");

        console.debug(
            "[Grace] Screen wake lock acquired."
        );

        screenWakeLock.addEventListener(
            "release",
            () => {
                console.debug(
                    "[Grace] Screen wake lock released."
                );
                screenWakeLock = null;
            }
        );

    }
    catch (error) {

        console.warn(
            "[Grace] Unable to acquire screen wake lock:",
            error
        );

        screenWakeLock = null;
    }
}


async function releaseScreenWakeLock() {

    if (!screenWakeLock) {
        return;
    }

    try {
        await screenWakeLock.release();

        console.debug(
            "[Grace] Screen wake lock manually released."
        );
    }
    catch (error) {

        console.warn(
            "[Grace] Failed to release screen wake lock:",
            error
        );
    }

    screenWakeLock = null;
}


// Re-acquire if the tab regains visibility mid-call (OS can drop
// the lock when the page is hidden).
document.addEventListener(
    "visibilitychange",
    async () => {

        if (
            document.visibilityState === "visible" &&
            voiceClient &&
            voiceClient.ws &&
            voiceClient.ws.readyState === WebSocket.OPEN &&
            callOverlay &&
            !callOverlay.classList.contains("gf-hidden")
        ) {
            await acquireScreenWakeLock();
        }
    }
);


// =========================================================
// HELPER FUNCTIONS
// =========================================================

function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;
}


// =========================================================
// AUDIO RESAMPLING
//
// Linear-interpolation resampler used to guarantee the audio we
// send over the WebSocket is always 24000Hz PCM, regardless of what
// sample rate the browser actually gave the AudioContext. This is
// the fix for "not correctly receiving the user's speech" — see the
// header comment above for the full explanation.
// =========================================================

function resampleTo24k(inputFloats, inputSampleRate) {

    if (inputSampleRate === 24000) {
        return inputFloats;
    }

    const ratio =
        inputSampleRate / 24000;

    const newLength =
        Math.round(inputFloats.length / ratio);

    const result =
        new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {

        const srcIndex =
            i * ratio;

        const srcIndexFloor =
            Math.floor(srcIndex);

        const srcIndexCeil =
            Math.min(srcIndexFloor + 1, inputFloats.length - 1);

        const frac =
            srcIndex - srcIndexFloor;

        result[i] =
            inputFloats[srcIndexFloor] * (1 - frac) +
            inputFloats[srcIndexCeil] * frac;
    }

    return result;
}


// =========================================================
// CATEGORY LABEL
//
// The backend already sends human-readable text — DepartmentName
// for department-type questions ("Food and Beverages", "House
// Keeping"), Question for static/comment-type questions ("Overall
// hospital experience"). DepartmentKey is an internal grouping key
// only (not unique per label — e.g. "House Keeping" and
// "Maintenance" both use DepartmentKey "RoomComfort"), so it must
// never be used for display.
// =========================================================

function getCategoryName(question) {
    return question.Question || "Feedback";
}
function getEffectiveAnswerAndRemarks(question) {

    const patientSummary =
        question.PatientFeedbackSummary && question.PatientFeedbackSummary.trim()
            ? question.PatientFeedbackSummary.trim()
            : "";

    const remarks =
        question.Remarks && question.Remarks.trim()
            ? question.Remarks.trim()
            : "";

    const answer =
        question.Answer && question.Answer.trim()
            ? question.Answer.trim()
            : "";

    return { remarks: patientSummary || remarks, answer };
}


// =========================================================
// THANK-YOU SCREEN — per-category icon
//
// Matches keywords in the category title against the icon set
// in ~/images/voice-agent/. First matching row wins. Falls back
// to others.png when nothing matches. stethescope.png is not
// currently mapped to any category — add a row for it here if a
// category should use it.
// =========================================================

const CATEGORY_ICON_MAP = [
    { keywords: ["nutrition", "diet"], icon: "nutritionist.png" },
    { keywords: ["food", "dining", "breakfast", "meal"], icon: "restaurant.png" },
    { keywords: ["coffee", "beverage"], icon: "coffee.png" },
    { keywords: ["intercom"], icon: "intercom.png" },
    { keywords: ["television", " tv", "tv/", "/tv"], icon: "tv.png" },
    { keywords: ["room", "comfort", "bed"], icon: "bed.png" },
    { keywords: ["doctor", "physician", "consultation"], icon: "doctor-consultation.png" },
    { keywords: ["nursing", "nurse"], icon: "healthcare.png" },
    { keywords: ["bio medical", "biomedical"], icon: "bio.png" },
    { keywords: ["medical", "medicine", "pharmacy"], icon: "medical.png" },
    { keywords: ["housekeeping", "house keeping", "cleaning", "maintenance", "vacuum"], icon: "vacuum.png" },
    { keywords: ["technical", "wifi", "internet", "support"], icon: "technical-support.png" },
    { keywords: ["admission", "recommend", "comment", "additional", "improve", "well"], icon: "letter.png" }
];

function getCategoryIcon(title) {

    const lower = (title || "").toLowerCase();

    for (const entry of CATEGORY_ICON_MAP) {
        if (entry.keywords.some(k => lower.includes(k))) {
            return "/images/voice-agent/" + entry.icon;
        }
    }

    return "/images/voice-agent/others.png";
}


function goToFeedback() {
    BedContext.go('OverAllFeedback/Index');
}


function openClassicForm() {

    if (classicOverlay) {
        classicOverlay.classList.remove(
            "gf-hidden"
        );
    }
}


function closeClassicForm() {

    if (classicOverlay) {

        classicOverlay.classList.add(
            "gf-hidden"
        );
    }

    moodBtns.forEach(btn => {

        btn.classList.remove(
            "gf-mood-selected"
        );

    });

    selectedMood = null;

    if (classicComments) {
        classicComments.value = "";
    }
}


moodBtns.forEach(btn => {

    btn.addEventListener("click", () => {

        moodBtns.forEach(b => {

            b.classList.remove(
                "gf-mood-selected"
            );

        });

        btn.classList.add(
            "gf-mood-selected"
        );

        selectedMood =
            btn.dataset.mood;
    });

});


if (classicCloseBtn) {

    classicCloseBtn.addEventListener(
        "click",
        closeClassicForm
    );
}


if (classicSubmitBtn) {

    classicSubmitBtn.addEventListener(
        "click",
        async () => {

            try {

                await fetch(
                    "/api/Feedback/Submit",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            BedID:
                                GF_BED_ID,

                            Sentiment:
                                selectedMood,

                            Comments:
                                classicComments
                                    ? classicComments.value
                                    : ""
                        })
                    }
                );

            }
            catch (err) {

                console.error(
                    "Classic feedback submit failed:",
                    err
                );
            }

            closeClassicForm();

            renderThanksAckList([
                {
                    DepartmentName: "Overall Stay",
                    Answer: selectedMood,
                    Remarks: classicComments ? classicComments.value : ""
                }
            ]);

            screenIntro.classList.add(
                "gf-hidden"
            );

            screenThanks.classList.remove(
                "gf-hidden"
            );

            const pageContent =
                document.getElementById(
                    "pageContent"
                );

            if (pageContent) {
                pageContent.scrollTop = 0;
            }

        }
    );
}


// =========================================================
// TIMER
// =========================================================

function pad(n) {

    return n
        .toString()
        .padStart(2, "0");
}


function formatTime(totalSeconds) {

    const m =
        Math.floor(
            totalSeconds / 60
        );

    const s =
        totalSeconds % 60;

    return `${pad(m)}:${pad(s)}`;
}


function startLiveTimer() {

    liveSeconds = 0;

    if (liveTimerEl) {

        liveTimerEl.textContent =
            formatTime(liveSeconds);
    }

    timerHandle =
        setInterval(() => {

            liveSeconds += 1;

            if (liveTimerEl) {

                liveTimerEl.textContent =
                    formatTime(liveSeconds);
            }

        }, 1000);
}


function stopLiveTimer() {

    if (timerHandle) {

        clearInterval(timerHandle);

        timerHandle = null;
    }
}


// =========================================================
// SUMMARY
// =========================================================

function getAnswerDetails(answer) {

    const value =
        (answer || "")
            .trim()
            .toLowerCase();

    if (value === "") {

        return {

            className:
                "gf-empty-answer",

            image: "",

            text: "-"
        };
    }


    if (value === "satisfied") {

        return {

            className:
                "gf-satisfied",

            image:
                "/images/voice-agent/satisfaction.png",

            text:
                "Satisfied"
        };
    }


    if (value === "unsatisfied") {

        return {

            className:
                "gf-unsatisfied",

            image:
                "/images/voice-agent/Dissapointment.png",

            text:
                "Unsatisfied"
        };
    }


    if (value === "neutral") {

        return {

            className:
                "gf-neutral",

            image:
                "/images/voice-agent/neutral.png",

            text:
                "Neutral"
        };
    }


    return {

        className:
            "gf-empty-answer",

        image: "",

        text: "-"
    };
}


function renderSummary(questions) {

    const container =
        document.getElementById(
            "summaryItems"
        );

    if (
        !container ||
        !Array.isArray(questions)
    ) {
        return;
    }

    container.innerHTML = "";


    questions.forEach(question => {
        const header =
            getCategoryName(question);

        const { remarks: rawRemarks, answer } =
            getEffectiveAnswerAndRemarks(question);

        const remarks =
            rawRemarks ? rawRemarks : "-";


        const answerDetails =
            getAnswerDetails(answer);


        const item =
            document.createElement(
                "div"
            );


        item.className =
            "gf-summary-item dynamic-item";


        const remarkDisplay =
            remarks === "-"
                ? "-"
                : `"${remarks}"`;


        const answerIcon =
            answerDetails.image
                ? `
                    <img
                        src="${answerDetails.image}"
                        alt="${escapeHtml(
                    answerDetails.text
                )}"
                        class="gf-satisfaction-icon">
                  `
                : "";


        item.innerHTML = `

            <div class="gf-summary-item-header">

                <strong class="gf-summary-question">
                    ${escapeHtml(header)}
                </strong>

                <span
                    class="${answerDetails.className}
                    gf-summary-answer">

                    ${answerIcon}

                    <span>
                        ${escapeHtml(
            answerDetails.text
        )}
                    </span>

                </span>

            </div>


            <div class="gf-summary-quote">

                ${escapeHtml(
            remarkDisplay
        )}

            </div>

        `;


        container.appendChild(item);

    });
}

// =========================================================
// THANK-YOU SCREEN — dynamic ack list
// =========================================================

function getAckVisuals(answer) {

    const value =
        (answer || "").trim().toLowerCase();

    if (value === "unsatisfied") {
        return {
            colorClass: "gf-ack-icon--amber",
            defaultNote: "Flagged for the team to look into."
        };
    }

    if (value === "neutral") {
        return {
            colorClass: "gf-ack-icon--gray",
            defaultNote: "Noted — thank you for sharing."
        };
    }

    return {
        colorClass: "gf-ack-icon--green",
        defaultNote: "Your feedback has been shared with the team."
    };
}

function renderThanksAckList(questions) {

    const container =
        document.getElementById("thanksAckList");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (!Array.isArray(questions) || questions.length === 0) {

        container.innerHTML = `
            <li class="gf-ack-item">
                <div class="gf-ack-text">
                    <div class="gf-ack-title">Thank you</div>
                    <div class="gf-ack-sub">Your feedback has been received.</div>
                </div>
            </li>
        `;

        return;
    }

    questions.forEach(question => {

        const title =
            getCategoryName(question);

        const { remarks, answer } =
            getEffectiveAnswerAndRemarks(question);

        const visuals =
            getAckVisuals(answer);

        const icon =
            getCategoryIcon(title);

        const sub =
            remarks ? remarks : visuals.defaultNote;

        const item =
            document.createElement("li");

        item.className = "gf-ack-item";

        item.innerHTML = `
            <span class="gf-ack-icon ${visuals.colorClass}">
                <img src="${icon}" alt="" width="18" height="18" />
            </span>
            <div class="gf-ack-text">
                <div class="gf-ack-title">${escapeHtml(title)}</div>
                <div class="gf-ack-sub">${escapeHtml(sub)}</div>
            </div>
            <span class="gf-ack-tick">
                <img src="/images/voice-agent/tick.png" alt="" width="18" height="18" />
            </span>
        `;

        container.appendChild(item);
    });
}
// =========================================================
// LOAD LATEST FEEDBACK
// =========================================================

async function loadLatestFeedback() {

    const maxAttempts = 10;
    const delayMs = 1000;

    for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
    ) {

        try {



            const response =
                await fetch(
                    "/AIFeedback/GetLatestFeedback?bedNo=" +
                    encodeURIComponent(
                        GF_BED_ID
                    )
                );

            const result =
                await response.json();


            if (
                result.success &&
                result.data &&
                result.data.length > 0
            ) {

                latestFeedbackData =
                    result.data[0];

                sessionStorage.setItem(
                    "AI_FeedbackId",
                    latestFeedbackData.feedbackId
                );

                const feedbackJson =
                    JSON.parse(
                        latestFeedbackData.feedbackData
                    );

                latestFeedbackData.questions =
                    feedbackJson.questions ||
                    [];

                latestFeedbackData.additionalComments =
                    feedbackJson.additionalComments ||
                    "";

                renderSummary(
                    latestFeedbackData.questions
                );


                return true;
            }

            console.warn(
                `No feedback yet - attempt ${attempt}/${maxAttempts}`
            );

        }
        catch (error) {

            console.error(
                `Error loading feedback - attempt ${attempt}:`,
                error
            );
        }

        if (attempt < maxAttempts) {

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        delayMs
                    )
            );
        }
    }

    console.error(
        "Unable to load feedback after all attempts."
    );

    return false;
}

// =========================================================
// SUBMIT FEEDBACK
// =========================================================

async function submitFeedback() {

    try {

        const feedbackId =
            sessionStorage.getItem(
                "AI_FeedbackId"
            );


        if (!feedbackId) {

            alert(
                "Feedback ID is missing."
            );

            return;
        }


        const response =
            await fetch(
                "/AIFeedback/SubmitAIFeedback?feedbackId=" +
                encodeURIComponent(
                    feedbackId
                ),
                {
                    method: "POST"
                }
            );


        const responseText =
            await response.text();


        if (!response.ok) {

            alert(
                "Submit failed.\n\n" +
                "HTTP Status: " +
                response.status +
                "\n\n" +
                responseText.substring(
                    0,
                    500
                )
            );

            return;
        }


        let result;


        try {

            result =
                JSON.parse(
                    responseText
                );

        }
        catch (error) {

            alert(
                "Invalid server response.\n\n" +
                responseText.substring(
                    0,
                    500
                )
            );

            return;
        }


        if (!result.success) {

            alert(
                result.message ||
                "Unable to submit feedback."
            );

            return;
        }


        sessionStorage.removeItem(
            "AI_FeedbackId"
        );


        summaryOverlay.classList.add(
            "gf-hidden"
        );

        renderThanksAckList(
            latestFeedbackData
                ? latestFeedbackData.questions
                : []
        );

        screenIntro.classList.add(
            "gf-hidden"
        );


        screenThanks.classList.remove(
            "gf-hidden"
        );


        const pageContent =
            document.getElementById(
                "pageContent"
            );


        if (pageContent) {

            pageContent.scrollTop = 0;
        }

    }
    catch (error) {

        console.error(
            "AI feedback submit error:",
            error
        );


        alert(
            "Request failed.\n\n" +
            error.message
        );
    }
}


// =========================================================
// TALK AGAIN
// =========================================================

async function talkToGraceAgain() {

    const feedbackId =
        sessionStorage.getItem(
            "AI_FeedbackId"
        );


    if (!feedbackId) {

        summaryOverlay.classList.add(
            "gf-hidden"
        );

        await openCall();

        return;
    }


    try {

        const response =
            await fetch(
                "/AIFeedback/CancelAIFeedback?feedbackId=" +
                encodeURIComponent(
                    feedbackId
                ),
                {
                    method: "POST"
                }
            );


        const result =
            await response.json();


        if (!result.success) {

            alert(
                result.message ||
                "Unable to cancel previous feedback."
            );

            return;
        }


        sessionStorage.removeItem(
            "AI_FeedbackId"
        );


        summaryOverlay.classList.add(
            "gf-hidden"
        );


        await openCall();

    }
    catch (error) {

        console.error(
            "AI feedback cancel error:",
            error
        );


        alert(
            "Unable to cancel previous feedback."
        );
    }
}

const feedbackVadConfig = (CLIENT_CONFIG && CLIENT_CONFIG.VAD) || {};
const feedbackLocalBargeIn = feedbackVadConfig.localBargeIn !== false;

class FeedbackSileroVoiceActivityDetector {
    constructor(options = {}) {
        this.modelPath = options.modelPath || feedbackVadConfig.modelPath || "/models/silero-vad.onnx";
        this.inputSampleRate = 16000;
        this.sourceSampleRate = options.sourceSampleRate || 24000;
        this.frameSize = 512;
        this.contextSize = 64;
        this.threshold = typeof options.threshold === "number" ? options.threshold : 0.5;
        this.speechStartDurationMs = typeof options.speechStartDurationMs === "number" ? options.speechStartDurationMs : 180;
        this.bargeInStartDurationMs = typeof options.bargeInStartDurationMs === "number" ? options.bargeInStartDurationMs : 220;
        this.silenceDurationMs = typeof options.silenceDurationMs === "number" ? options.silenceDurationMs : 600;
        this.isReady = false;
        this.isSpeaking = false;
        this.session = null;
        this.state = new Float32Array(2 * 128);
        this.context = new Float32Array(this.contextSize);
        this.sampleBuffer = [];
        this.speechTimeMs = 0;
        this.silenceTimeMs = 0;
        this.inferenceQueue = Promise.resolve();
        this.lastProbability = 0;
    }

    async loadRuntime() {
        if (window.ort) return window.ort;
        const existing = document.querySelector('script[data-feedback-onnx-runtime="true"]');
        if (existing) {
            await new Promise((resolve, reject) => {
                if (window.ort) return resolve();
                existing.addEventListener("load", resolve, { once: true });
                existing.addEventListener("error", reject, { once: true });
            });
            if (window.ort) return window.ort;
        }
        await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.js";
            script.async = true;
            script.dataset.feedbackOnnxRuntime = "true";
            script.onload = resolve;
            script.onerror = () => reject(new Error("Unable to load ONNX Runtime Web from jsDelivr."));
            document.head.appendChild(script);
        });
        if (!window.ort) throw new Error("ONNX Runtime script loaded, but window.ort is unavailable.");
        return window.ort;
    }

    async load() {
        try {
            const ort = await this.loadRuntime();
            if (ort.env && ort.env.wasm) {
                ort.env.wasm.numThreads = 1;
            }
            this.session = await ort.InferenceSession.create(this.modelPath, {
                executionProviders: ["wasm"],
                graphOptimizationLevel: "all"
            });

            const inputs = this.session.inputNames || [];
            const outputs = this.session.outputNames || [];
            if (!inputs.includes("input") || !inputs.includes("state") || !inputs.includes("sr")) {
                throw new Error(`Unexpected Silero model inputs: ${inputs.join(", ")}`);
            }
            if (!outputs.includes("output") || !outputs.includes("stateN")) {
                throw new Error(`Unexpected Silero model outputs: ${outputs.join(", ")}`);
            }

            this.isReady = true;
            console.info("[Feedback VAD] Silero Neural VAD loaded successfully", {
                model: this.modelPath,
                runtime: "ONNX Runtime Web / WASM",
                sourceSampleRate: this.sourceSampleRate,
                inferenceSampleRate: this.inputSampleRate,
                frameSize: this.frameSize
            });
            return true;
        } catch (error) {
            this.isReady = false;
            console.error("[Feedback VAD] Silero failed to load or initialize. Check model URL, model file and ONNX compatibility.", error);
            return false;
        }
    }

    resampleTo16k(samples, sourceRate) {
        if (sourceRate === 16000) return samples;
        const ratio = sourceRate / 16000;
        const outputLength = Math.floor(samples.length / ratio);
        const output = new Float32Array(outputLength);
        for (let i = 0; i < outputLength; i++) {
            const sourceIndex = i * ratio;
            const left = Math.floor(sourceIndex);
            const right = Math.min(left + 1, samples.length - 1);
            const fraction = sourceIndex - left;
            output[i] = samples[left] * (1 - fraction) + samples[right] * fraction;
        }
        return output;
    }

    process(pcm16, sourceRate, callbacks = {}, playbackActive = false) {
        if (!this.isReady || !pcm16 || !pcm16.length) return;
        const floatSamples = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
            floatSamples[i] = pcm16[i] / 32768;
        }
        const resampled = this.resampleTo16k(floatSamples, sourceRate || this.sourceSampleRate);
        for (let i = 0; i < resampled.length; i++) this.sampleBuffer.push(resampled[i]);

        while (this.sampleBuffer.length >= this.frameSize) {
            const frame = new Float32Array(this.frameSize);
            for (let i = 0; i < this.frameSize; i++) frame[i] = this.sampleBuffer[i];
            this.sampleBuffer.splice(0, this.frameSize);
            this.inferenceQueue = this.inferenceQueue
                .then(() => this.inferFrame(frame, callbacks, playbackActive))
                .catch(error => console.error("[Feedback VAD] Silero inference failed:", error));
        }
    }

    async inferFrame(frame, callbacks, playbackActive) {
        if (!this.isReady || !this.session) return;
        const ort = window.ort;
        const input = new Float32Array(this.contextSize + this.frameSize);
        input.set(this.context, 0);
        input.set(frame, this.contextSize);

        const feeds = {
            input: new ort.Tensor("float32", input, [1, input.length]),
            state: new ort.Tensor("float32", this.state, [2, 1, 128]),
            sr: new ort.Tensor("int64", new BigInt64Array([16000n]), [])
        };
        const results = await this.session.run(feeds);
        const probability = results.output.data[0];
        this.state = new Float32Array(results.stateN.data);
        this.context.set(frame.subarray(frame.length - this.contextSize));
        this.lastProbability = probability;

        const frameDurationMs = this.frameSize / this.inputSampleRate * 1000;
        const speechDetected = probability >= this.threshold;
        if (speechDetected) {
            this.silenceTimeMs = 0;
            if (!this.isSpeaking) {
                this.speechTimeMs += frameDurationMs;
                const requiredDuration = playbackActive ? this.bargeInStartDurationMs : this.speechStartDurationMs;
                if (this.speechTimeMs >= requiredDuration) {
                    this.isSpeaking = true;
                    this.speechTimeMs = 0;
                    console.debug("[Feedback VAD] Silero speech detected", { probability });
                    callbacks.onSpeechStart?.(probability);
                }
            }
        } else if (!this.isSpeaking) {
            this.speechTimeMs = Math.max(0, this.speechTimeMs - frameDurationMs);
        } else {
            this.silenceTimeMs += frameDurationMs;
            if (this.silenceTimeMs >= this.silenceDurationMs) {
                this.isSpeaking = false;
                this.silenceTimeMs = 0;
                this.speechTimeMs = 0;
                console.debug("[Feedback VAD] Silero speech ended", { probability });
                callbacks.onSpeechEnd?.(probability);
            }
        }
    }

    reset() {
        this.isSpeaking = false;
        this.state = new Float32Array(2 * 128);
        this.context = new Float32Array(this.contextSize);
        this.sampleBuffer = [];
        this.speechTimeMs = 0;
        this.silenceTimeMs = 0;
        this.lastProbability = 0;
        this.inferenceQueue = Promise.resolve();
    }
}


// =========================================================
// FEEDBACK VOICE CLIENT
// =========================================================

// AudioWorklet keeps capture/resampling off the UI thread and sends compact
// transferable 20 ms PCM16 frames, matching the working Voice Assistant path.
const FEEDBACK_MIC_WORKLET_SOURCE = `
class FeedbackMicProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        const o = options.processorOptions || {};
        this.frameSize = o.frameSize || 480;
        this.ratio = (o.inputRate || sampleRate) / (o.targetRate || 24000);
        if (!Number.isFinite(this.ratio) || this.ratio <= 0) this.ratio = 1;
        this.buf = new Int16Array(this.frameSize);
        this.n = 0;
        this.pos = 0;
        this.prev = 0;
        this.muted = false;
        this.port.onmessage = (e) => {
            if (e.data && Object.prototype.hasOwnProperty.call(e.data, 'muted')) this.muted = !!e.data.muted;
        };
    }
    push(x) {
        const s = this.muted ? 0 : Math.max(-1, Math.min(1, x));
        this.buf[this.n++] = s < 0 ? s * 0x8000 : s * 0x7fff;
        if (this.n >= this.frameSize) {
            const out = this.buf.buffer;
            this.port.postMessage(out, [out]);
            this.buf = new Int16Array(this.frameSize);
            this.n = 0;
        }
    }
    process(inputs) {
        const ch = inputs[0] && inputs[0][0];
        if (!ch || !ch.length) return true;
        let pos = this.pos;
        let guard = 0;
        const maxIterations = ch.length * 4 + 16;
        while (pos < ch.length - 1 && guard++ < maxIterations) {
            const i = Math.floor(pos);
            const frac = pos - i;
            const a = i < 0 ? this.prev : ch[i];
            const b = ch[i + 1];
            this.push(a + (b - a) * frac);
            pos += this.ratio;
        }
        this.pos = Math.max(0, pos - ch.length);
        this.prev = ch[ch.length - 1];
        return true;
    }
}
registerProcessor('feedback-mic-processor', FeedbackMicProcessor);
`;

class FeedbackVoiceClient {

    constructor(wsBase) {

        this.wsBase =
            wsBase;

        this.ws =
            null;


        this.audioContext =
            null;


        this.mediaStream =
            null;


        this.sourceNode =
            null;


        // NEW: 120Hz high-pass filter inserted between the mic
        // source and the ScriptProcessor. See header note (3c).
        this.highPassNode =
            null;


        this.processorNode =
            null;

        this.micSink =
            null;


        this.nextPlayTime =
            0;


        this.micEnabled =
            true;


        this.callbacks =
            {};


        // The actual sample rate the browser gave us for
        // capture, discovered after the AudioContext is created.
        // `{ sampleRate: 24000 }` in the constructor is only a
        // *hint* — Chrome on Windows in particular will often
        // hand back 48000 anyway. Everything downstream of the
        // mic now resamples to 24000 using this value, instead
        // of assuming the hint was honored.
        this.captureSampleRate =
            24000;


        /*
         * =====================================================
         * Silero VAD CONFIG
         *
         * The detector calibrates ambient RMS before applying
         * an adaptive speech threshold.
         * =====================================================
         */

        this.vad = new FeedbackSileroVoiceActivityDetector({
            sourceSampleRate: 24000,
            threshold: typeof feedbackVadConfig.threshold === "number" ? feedbackVadConfig.threshold : 0.5,
            silenceDurationMs: typeof feedbackVadConfig.silenceDurationMs === "number" ? feedbackVadConfig.silenceDurationMs : 600,
            speechStartDurationMs: typeof feedbackVadConfig.speechStartDurationMs === "number" ? feedbackVadConfig.speechStartDurationMs : 180,
            bargeInStartDurationMs: typeof feedbackVadConfig.bargeInStartDurationMs === "number" ? feedbackVadConfig.bargeInStartDurationMs : 220
        });


        /*
         * Keep references to every currently playing
         * assistant audio source.
         *
         * This allows immediate browser-side
         * barge-in when Silero VAD detects speech.
         */

        this.playbackSources =
            new Set();
    }


    // =========================================================
    // FETCH TOKEN
    //
    // Accepts an optional langOverride ({ language, dialect, voice })
    // so callers (e.g. the auto language-switch flow in openCall())
    // can request a session in a different language than
    // CLIENT_CONFIG's defaults, without touching the backend.
    // =========================================================

    async fetchToken(bedNo, langOverride = null) {

        const config = window.CLIENT_CONFIG;

        if (!config) {
            throw new Error(
                "CLIENT_CONFIG is not loaded. Make sure scripts/config.js is loaded before this file."
            );
        }

        const effectiveBedNo = bedNo;
        if (!effectiveBedNo) {
            throw new Error("No bed id available. Open this page with ?BedInfo=<token>.");
        }

        const lang =
            langOverride || activeLanguageConfig || {};

        const queryParams =
            new URLSearchParams({
                bedNo: effectiveBedNo,
                language: lang.language || config.defaultLanguage || "English",
                dialect: lang.dialect || config.defaultDialect || "United States",
                voice: lang.voice || config.defaultVoice || "",
                speed: config.defaultVoiceSpeed || ""
            });

        console.log("[Grace] Starting call with frontend voice configuration:", {
            userId: effectiveBedNo,
            language: lang.language || config.defaultLanguage || "English",
            dialect: lang.dialect || config.defaultDialect || "United States",
            voice: lang.voice || config.defaultVoice || "(backend default)",
            speed: config.defaultVoiceSpeed || "(backend default)"
        });

        const response =
            await fetch(
                "/AIFeedback/StartCall?BedInfo=" + encodeURIComponent(BedContext.get().bedInfo) + "&" + queryParams.toString(),
                {
                    method: "POST"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Token request failed: ${response.status} ${response.statusText}`
            );
        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to start AI call"
            );
        }


        return {

            accessToken:
                data.accessToken,

            sessionId:
                data.callId
        };
    }


    // =========================================================
    // START CALL
    // =========================================================

    async startCall(
        token,
        callbacks = {}
    ) {

        this.callbacks =
            callbacks;


        const wsUrl =
            `${this.wsBase}/feedback-assistant?token=${encodeURIComponent(token)}`;


        this.ws =
            new WebSocket(
                wsUrl
            );


        this.ws.binaryType =
            "arraybuffer";


        return new Promise(
            (resolve, reject) => {

                this.ws.onopen =
                    async () => {

                        try {

                            await this.startMicrophone();


                            callbacks.onStateChange?.(
                                "connected"
                            );


                            resolve();

                        }
                        catch (err) {

                            console.error(
                                "Microphone startup failed:",
                                err
                            );


                            reject(err);
                        }
                    };


                this.ws.onmessage =
                    (event) => {

                        /*
                         * Binary data = assistant
                         * audio from Azure.
                         */

                        if (
                            event.data instanceof
                            ArrayBuffer
                        ) {

                            this.enqueueAudioChunk(
                                event.data
                            );

                            return;
                        }


                        try {

                            const msg =
                                JSON.parse(
                                    event.data
                                );


                            /*
                             * ALWAYS-ON DIAGNOSTIC: dump every
                             * parsed WS message exactly as it
                             * arrived, before any of our logic
                             * assumes field names like `role` /
                             * `text` are correct. If language
                             * switching never fires, check this
                             * log first — it tells you the REAL
                             * shape of what the backend is
                             * sending.
                             */

                            if (
                                typeof DEBUG_LANG_SWITCH !==
                                "undefined" &&
                                DEBUG_LANG_SWITCH
                            ) {

                                console.log(
                                    "[Grace][RAW WS MSG]",
                                    msg
                                );
                            }


                            if (
                                msg.type ===
                                "transcript"
                            ) {

                                callbacks.onTranscript?.(
                                    msg.role,
                                    msg.text
                                );

                            }


                            else if (
                                msg.type ===
                                "user_speaking"
                            ) {

                                callbacks.onStateChange?.(

                                    msg.speaking
                                        ? "user_speaking"
                                        : "listening"
                                );

                            }


                            else if (
                                msg.type ===
                                "agent_speaking"
                            ) {

                                callbacks.onStateChange?.(

                                    msg.speaking
                                        ? "agent_speaking"
                                        : "listening"
                                );
                            }


                            /*
                             * Backend/Azure can also explicitly
                             * tell the browser to interrupt.
                             */

                            else if (
                                msg.type ===
                                "interrupt"
                            ) {

                                console.debug(
                                    "[Azure] Interrupt received"
                                );


                                this.stopPlayback();


                                callbacks.onStateChange?.(
                                    "user_speaking"
                                );
                            }


                            /*
                             * Azure VAD speech-start event
                             * forwarded by backend.
                             */

                            else if (
                                msg.type ===
                                "speech_started" ||
                                msg.type ===
                                "input_audio_buffer.speech_started"
                            ) {

                                this.stopPlayback();


                                callbacks.onStateChange?.(
                                    "user_speaking"
                                );
                            }


                            /*
                             * Azure VAD speech-stop event.
                             */

                            else if (
                                msg.type ===
                                "speech_stopped" ||
                                msg.type ===
                                "input_audio_buffer.speech_stopped"
                            ) {

                                callbacks.onStateChange?.(
                                    "listening"
                                );
                            }

                        }
                        catch (err) {

                            console.error(
                                "Failed to parse WS text message:",
                                err
                            );
                        }
                    };


                this.ws.onclose =
                    (event) => {

                        this.cleanup();


                        callbacks.onEnd?.(
                            event.code,
                            event.reason
                        );
                    };


                this.ws.onerror =
                    (error) => {

                        callbacks.onError?.(
                            error
                        );


                        reject(error);
                    };

            }
        );
    }


    // =========================================================
    // START MICROPHONE
    // =========================================================

    async startMicrophone() {

        try {
            // Silero inference uses a 16 kHz copy of the 24 kHz mic stream.
            // The original 24 kHz PCM continues to the backend unchanged.
            await this.vad.load();

            this.audioContext =
                new (
                    window.AudioContext ||
                    window.webkitAudioContext
                )({
                    sampleRate: 24000
                });


            await this.audioContext.resume();


            // Don't trust the constructor hint — read back
            // whatever sample rate the browser actually gave us.
            this.captureSampleRate =
                this.audioContext.sampleRate;


            if (this.captureSampleRate !== 24000) {

                console.warn(
                    "[Grace] AudioContext ignored the 24000Hz " +
                    "hint and is actually running at " +
                    this.captureSampleRate +
                    "Hz. Resampling every captured chunk to " +
                    "24000Hz before sending."
                );
            }


            // =================================================
            // TIGHTENED getUserMedia CONSTRAINTS
            //
            // See header note (3a). Explicitly enable the OS /
            // browser DSP paths, and avoid duplicate keys.
            // =================================================

            this.mediaStream =
                await navigator.mediaDevices
                    .getUserMedia({

                        audio: {

                            channelCount: { exact: 1 },

                            sampleRate: 24000,

                            sampleSize: 16,

                            echoCancellation: { exact: true },

                            noiseSuppression: { exact: true },

                            autoGainControl: { ideal: true },

                            latency: 0.01
                        }
                    });


            if (!this.audioContext) {

                throw new Error(
                    "AudioContext became null before creating microphone source."
                );
            }


            this.sourceNode =
                this.audioContext
                    .createMediaStreamSource(
                        this.mediaStream
                    );


            // =================================================
            // HIGH-PASS FILTER (noise fix — see header note 3c)
            //
            // Cuts everything below ~120Hz, which removes HVAC
            // rumble, desk thumps, and low-frequency room noise
            // — without touching speech intelligibility.
            //
            // Signal chain:
            //   sourceNode -> highPassNode -> processorNode
            // =================================================

            this.highPassNode =
                this.audioContext.createBiquadFilter();

            this.highPassNode.type =
                "highpass";

            this.highPassNode.frequency.value =
                120;   // Hz

            this.highPassNode.Q.value =
                0.7;   // gentle slope (no resonance)


            const moduleUrl = URL.createObjectURL(
                new Blob([FEEDBACK_MIC_WORKLET_SOURCE], { type: "application/javascript" })
            );
            try {
                await this.audioContext.audioWorklet.addModule(moduleUrl);
            } finally {
                URL.revokeObjectURL(moduleUrl);
            }

            this.processorNode = new AudioWorkletNode(
                this.audioContext,
                "feedback-mic-processor",
                {
                    numberOfInputs: 1,
                    numberOfOutputs: 1,
                    outputChannelCount: [1],
                    processorOptions: {
                        inputRate: this.captureSampleRate,
                        targetRate: 24000,
                        frameSize: 480
                    }
                }
            );
            this.processorNode.port.postMessage({ muted: !this.micEnabled });
            this.processorNode.port.onmessage = (event) => {
                if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.micEnabled) return;
                if (!(event.data instanceof ArrayBuffer) || event.data.byteLength < 2) return;
                if (this.ws.bufferedAmount >= 65536) return;

                const pcm16 = new Int16Array(event.data);
                const playbackActive = !!(
                    this.audioContext &&
                    this.playbackSources.size > 0 &&
                    this.audioContext.currentTime < this.nextPlayTime
                );
                this.vad.process(pcm16, 24000, {
                    onSpeechStart: (probability) => {
                        if (feedbackLocalBargeIn && playbackActive) this.stopPlayback();
                        const state = callOverlay?.dataset?.callState || null;
                        if (feedbackLocalBargeIn && (state === "speaking" || state === "agent_speaking" || state === "thinking")) {
                            this.callbacks?.onStateChange?.("listening");
                        }
                        this.callbacks?.onUserSpeechStart?.(probability);
                    },
                    onSpeechEnd: (probability) => {
                        const state = callOverlay?.dataset?.callState || null;
                        if (feedbackLocalBargeIn && state === "listening") this.callbacks?.onStateChange?.("thinking");
                        this.callbacks?.onUserSpeechEnd?.(probability);
                    }
                }, playbackActive);
                this.ws.send(event.data);
            };

            this.micSink = this.audioContext.createGain();
            this.micSink.gain.value = 0;
            this.sourceNode.connect(this.highPassNode);
            this.highPassNode.connect(this.processorNode);
            this.processorNode.connect(this.micSink);
            this.micSink.connect(this.audioContext.destination);

        }
        catch (error) {

            console.error(
                "startMicrophone ERROR:",
                error
            );


            this.cleanup();


            throw error;
        }
    }

    setMicEnabled(enabled) {

        this.micEnabled =
            enabled;


        if (this.processorNode && this.processorNode.port) {
            this.processorNode.port.postMessage({ muted: !enabled });
        }

        if (this.mediaStream) {

            this.mediaStream
                .getAudioTracks()
                .forEach(track => {

                    track.enabled =
                        enabled;

                });
        }

        if (!enabled) {

            this.vad.reset();
        }
    }




    enqueueAudioChunk(
        arrayBuffer
    ) {

        if (!this.audioContext) {

            return;
        }


        const pcm16 =
            new Int16Array(
                arrayBuffer
            );


        const float32 =
            new Float32Array(
                pcm16.length
            );


        for (
            let i = 0;
            i < pcm16.length;
            i++
        ) {

            float32[i] =
                pcm16[i] /
                32768.0;
        }


        const audioBuffer =
            this.audioContext
                .createBuffer(
                    1,
                    float32.length,
                    24000
                );


        audioBuffer.copyToChannel(
            float32,
            0
        );


        const source =
            this.audioContext
                .createBufferSource();


        source.buffer =
            audioBuffer;


        source.connect(
            this.audioContext.destination
        );

        this.playbackSources.add(
            source
        );


        source.onended =
            () => {

                this.playbackSources.delete(
                    source
                );
            };


        const now =
            this.audioContext
                .currentTime;


        const startTime =
            Math.max(
                now,
                this.nextPlayTime
            );


        source.start(
            startTime
        );


        this.nextPlayTime =
            startTime +
            audioBuffer.duration;
    }

    stopPlayback() {

        for (
            const source of
            this.playbackSources
        ) {

            try {

                source.stop();

            }
            catch (_) {

                /*
                 * Source may already have ended.
                 */
            }


            try {

                source.disconnect();

            }
            catch (_) {

                /*
                 * Ignore already disconnected source.
                 */
            }
        }


        this.playbackSources.clear();


        this.nextPlayTime =
            this.audioContext
                ? this.audioContext.currentTime
                : 0;
    }



    endCall() {

        if (
            this.ws &&
            this.ws.readyState ===
            WebSocket.OPEN
        ) {

            this.ws.close(
                1000,
                "User ended call"
            );

        }
        else {

            this.cleanup();
        }
    }

    forceEndCall() {
        this.cleanup();

        if (this.ws) {
            this.ws.onclose = null; 
            this.ws.onerror = null;
            this.ws.onmessage = null;

            try {
                this.ws.close();
            } catch (e) {
                console.warn("WebSocket close error:", e);
            }
            this.ws = null;
        }

        if (summaryOverlay) summaryOverlay.classList.remove("gf-hidden");
        if (submitFeedbackBtn) submitFeedbackBtn.disabled = true;

        loadLatestFeedback().then((success) => {
            if (submitFeedbackBtn) {
                submitFeedbackBtn.disabled = !success;
            }
        });
    }

    cleanup() {

        this.stopPlayback();


        this.vad.reset();


        if (this.processorNode) {
            this.processorNode.port.onmessage = null;
            this.processorNode.disconnect();
            this.processorNode = null;
        }

        if (this.micSink) {
            this.micSink.disconnect();
            this.micSink = null;
        }



        if (this.highPassNode) {

            this.highPassNode.disconnect();

            this.highPassNode =
                null;
        }



        if (this.sourceNode) {

            this.sourceNode.disconnect();

            this.sourceNode =
                null;
        }



        if (this.mediaStream) {

            this.mediaStream
                .getTracks()
                .forEach(
                    track => track.stop()
                );


            this.mediaStream =
                null;
        }



        if (
            this.audioContext &&
            this.audioContext.state !==
            "closed"
        ) {

            this.audioContext.close();

            this.audioContext =
                null;
        }


        this.nextPlayTime =
            0;

        releaseScreenWakeLock();
    }
}

async function openCall(langOverride = null) {
    try {
        if (callOverlay) callOverlay.classList.remove("gf-hidden");

        const spinner = document.getElementById("connectingSpinner");
        const waveBars = document.getElementById("waveBars");

        if (spinner) spinner.classList.remove("gf-hidden");
        if (waveBars) waveBars.classList.add("gf-hidden");

        if (captionEl) {
            captionEl.textContent = "Connecting...";
            captionEl.style.color = "#94a3b8";
        }

        startLiveTimer();
        await acquireScreenWakeLock();

        voiceClient = new FeedbackVoiceClient(VOICE_AGENT_WS_BASE);

        const { accessToken, sessionId } = await voiceClient.fetchToken(GF_BED_ID, langOverride);

        currentCallId = sessionId;
        micOn = true;

        if (micToggleBtn) {
            micToggleBtn.classList.remove("gf-muted");
        }

        userTranscriptBuffer = "";

        await voiceClient.startCall(accessToken, {
            onTranscript: (role, text) => {
                if (captionEl) {

                    if (isCCEnabled) {
                        captionEl.textContent = text;
                        captionEl.style.color = "#ffffff";
                    }
                    captionEl.dataset.role = role;
                }

                logLangDebug(
                    "transcript event | role:",
                    JSON.stringify(role),
                    "| text:",
                    JSON.stringify(text)
                );

                if (isSwitchingLanguage) {
                    logLangDebug("skipped: a switch is already in progress");
                    return;
                }

                const normalizedRole = (role ?? "").toString().trim().toLowerCase();
                const KNOWN_USER_ROLES = ["user", "customer", "caller", "patient", "human"];

                if (!KNOWN_USER_ROLES.includes(normalizedRole)) {
                    logLangDebug(
                        "skipped: role",
                        JSON.stringify(role),
                        "is not a recognized user role. " +
                        "If this transcript IS the patient speaking, " +
                        "this role string needs to be added to KNOWN_USER_ROLES."
                    );
                    return;
                }

                userTranscriptBuffer = (userTranscriptBuffer + " " + (text || "")).slice(-300);
                const detected = detectLanguageFromTranscript(userTranscriptBuffer);

                logLangDebug(
                    "buffer:",
                    JSON.stringify(userTranscriptBuffer),
                    "| detected:",
                    detected ? detected.language : null,
                    "| active:",
                    activeLanguageConfig.language
                );

                if (detected && detected.language !== activeLanguageConfig.language) {
                    console.log(
                        `[Grace] Detected language switch: ` +
                        `${activeLanguageConfig.language} -> ${detected.language}`
                    );

                    userTranscriptBuffer = "";
                    activeLanguageConfig = detected;
                    switchLanguageMidCall(detected);
                }
            },

            onStateChange: (state) => {
                if (callOverlay) {
                    callOverlay.dataset.callState = state;

                    if (state === "connected" || state === "listening" || state === "agent_speaking") {
                        if (spinner) spinner.classList.add("gf-hidden");
                        if (waveBars) waveBars.classList.remove("gf-hidden");

                        if (captionEl && captionEl.textContent === "Connecting...") {
                            captionEl.textContent = "Hi, congratulations on going home today! Before you leave, I'd love to hear about your stay.";
                            captionEl.style.color = "#ffffff";
                        }
                    }
                }
            },

            onUserSpeechStart: (rms) => {
                if (callOverlay) callOverlay.dataset.vad = "speech";
                console.debug(`[Feedback VAD] User speaking | Silero probability=${rms.toFixed(4)}`);
            },

            onUserSpeechEnd: (rms) => {
                if (callOverlay) callOverlay.dataset.vad = "silence";
                console.debug(`[Feedback VAD] User stopped speaking | Silero probability=${rms.toFixed(4)}`);
            },

            onError: (err) => {
                console.error("Grace voice session error:", err);
            },

            onEnd: async (code, reason) => {
                stopLiveTimer();
                await releaseScreenWakeLock();

                if (callOverlay) callOverlay.classList.add("gf-hidden");

                if (isSwitchingLanguage) {
                    isSwitchingLanguage = false;
                    await openCall(activeLanguageConfig);
                    return;
                }

                if (code === 1008) {
                    alert("Your session expired. Please try again.");
                    if (screenIntro) screenIntro.classList.remove("gf-hidden");
                    return;
                }

                if (code === 1011) {
                    alert("Grace ran into a problem. Please try again.");
                    if (screenIntro) screenIntro.classList.remove("gf-hidden");
                    return;
                }

                if (code !== 1000) {
                    alert("The connection to Grace was interrupted. Please try again.");
                    if (screenIntro) screenIntro.classList.remove("gf-hidden");
                    return;
                }

                if (summaryOverlay) summaryOverlay.classList.remove("gf-hidden");

                if (submitFeedbackBtn) submitFeedbackBtn.disabled = true;

                loadLatestFeedback().then((success) => {
                    if (submitFeedbackBtn) {
                        submitFeedbackBtn.disabled = !success;
                    }
                });
            }
        });

    } catch (error) {
        console.error("Grace call error:", error);

        stopLiveTimer();
        await releaseScreenWakeLock();

        if (captionEl) {
            captionEl.textContent = "Failed to connect. Please try again.";
            captionEl.style.color = "#ef4444";
        }

        const spinner = document.getElementById("connectingSpinner");
        if (spinner) spinner.classList.add("gf-hidden");

        setTimeout(() => {
            if (callOverlay) callOverlay.classList.add("gf-hidden");
        }, 3000);
    }
}


function endCall() {
    if (callOverlay) {
        callOverlay.classList.add("gf-hidden");
    }

    stopLiveTimer();

    if (voiceClient) {
        voiceClient.forceEndCall();
    }
}




// Bind the primary Talk to AI action explicitly and expose a safe global
// entry point for the Razor button. This also makes failures visible in DevTools.
window.startFeedbackCall = function () {
    console.info("[Feedback Assistant] Talk to AI clicked.");
    return openCall();
};

if (talkToGraceBtn) {
    talkToGraceBtn.onclick = function (event) {
        event.preventDefault();
        window.startFeedbackCall();
    };
} else {
    console.error("[Feedback Assistant] #talkToGraceBtn was not found; button handler was not attached.");
}


if (endCallBtn) {

    endCallBtn.addEventListener(
        "click",
        endCall
    );
}


if (micToggleBtn) {

    micToggleBtn.addEventListener(
        "click",
        () => {

            micOn =
                !micOn;


            micToggleBtn.classList.toggle(
                "gf-muted",
                !micOn
            );


            voiceClient?.setMicEnabled(
                micOn
            );
        }
    );
}


if (summaryCloseBtn) {

    summaryCloseBtn.addEventListener(
        "click",
        () => {

            summaryOverlay.classList.add(
                "gf-hidden"
            );
        }
    );
}


if (submitFeedbackBtn) {

    submitFeedbackBtn.addEventListener(
        "click",
        submitFeedback
    );
}


if (talkAgainBtn) {

    talkAgainBtn.addEventListener(
        "click",
        talkToGraceAgain
    );
}


if (doneBtn) {

    doneBtn.addEventListener(
        "click",
        () => {

            screenThanks.classList.add(
                "gf-hidden"
            );


            screenIntro.classList.remove(
                "gf-hidden"
            );


            const pageContent =
                document.getElementById(
                    "pageContent"
                );


            if (pageContent) {

                pageContent.scrollTop =
                    0;
            }
        }
    );
}



document.addEventListener(
    "DOMContentLoaded",
    function () {

        const pageContent =
            document.getElementById(
                "pageContent"
            );


        if (pageContent) {

            pageContent.scrollTop =
                0;
        }
    }
);


window.addEventListener(
    "load",
    function () {

        const pageContent =
            document.getElementById(
                "pageContent"
            );


        if (pageContent) {

            pageContent.scrollTop =
                0;
        }
    }
);


