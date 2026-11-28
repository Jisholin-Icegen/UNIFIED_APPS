var PORTER_FALLBACK_IMG = '/images/porter.png';

function isPorterPendingStatus(status, statusId) {
    var s = (status || '').toString().toUpperCase();
    var id = parseInt(statusId, 10);
    if (s === 'PENDING' || s === 'CANCELLED' || s === 'CANCELED' || s === 'ON HOLD' || s === 'ONHOLD') {
        return true;
    }
    return id === 1 || id === 2 || id === 7 || id === 8;
}

function hasRealPorter(porterName) {
    if (porterName === null || porterName === undefined) return false;
    var v = String(porterName).trim();
    return v !== '' && v !== '-' && v.toLowerCase() !== 'null' && v.toLowerCase() !== 'undefined';
}

function updatePorterImages(trackData, status, statusId) {
    var infoWrapper = document.getElementById('porterImageWrapper');
    var infoImg = document.getElementById('porterImage');
    var trackWrap = document.getElementById('trackingPorterWrapper');
    var trackImg = document.getElementById('trackingPorterImage');
    var check = trackWrap ? trackWrap.querySelector('.porter-check') : null;

    if (isPorterPendingStatus(status, statusId)) {
        if (infoWrapper) infoWrapper.style.display = 'none';
        if (trackWrap) trackWrap.style.display = 'none';
        if (check) check.style.display = 'none';
        return;
    }

    var porterName = (trackData && (trackData.porterName || trackData.PorterName)) || '';
    var porterImgIn = (trackData && (trackData.porterImage || trackData.PorterImage)) || '';

    var hasPorter = hasRealPorter(porterName);
    var hasImageUrl = !!(porterImgIn && String(porterImgIn).trim());

    var finalSrc = (hasPorter && hasImageUrl) ? porterImgIn : PORTER_FALLBACK_IMG;

    if (infoWrapper) infoWrapper.style.display = '';
    if (trackWrap) trackWrap.style.display = '';

    if (infoImg) {
        infoImg.onerror = function () {
            this.onerror = null;
            this.src = PORTER_FALLBACK_IMG;
        };
        if (infoImg.src !== finalSrc) infoImg.src = finalSrc;
    }

    if (trackImg) {
        trackImg.onerror = function () {
            this.onerror = null;
            this.src = PORTER_FALLBACK_IMG;
        };
        if (trackImg.src !== finalSrc) trackImg.src = finalSrc;
    }

    if (check) check.style.display = hasPorter ? '' : 'none';
}

function applyHeaderFromTrackData(trackData) {
    if (!trackData || typeof trackData !== 'object') return;
    window.trackData = trackData;

    var title = trackData.headerTitle || trackData.HeaderTitle
        || trackData.categoryName || trackData.CategoryName
        || trackData.ordertype || trackData.ORDERTYPE
        || trackData.mealtype || trackData.MealType || '';
    var subtitle = trackData.headerSubtitle || trackData.HeaderSubtitle
        || trackData.requestStatus || trackData.RequestStatus || trackData.status || '';
    var reqNo = trackData.requestNo || trackData.RequestNo || '';

    if (title) {
        safeText('pageTitle', title);
        safeText('headerTitle', title);
    }
    if (subtitle) {
        safeText('pageSubtitle', subtitle);
        safeText('headerSubtitle', subtitle);
    }
    if (reqNo) {
        safeText('headerRequestNo', '#' + reqNo);
    }
}

function safeCallMapImage(floorName) {
    if (typeof window.applyMapImage === 'function') {
        window.applyMapImage(floorName);
    }
}

function safeCallPushPin(trackData) {
    if (typeof window.pushTrackDataToPin === 'function') {
        window.pushTrackDataToPin(trackData);
    }
}

function safeCallFeedbackPrompt(isCompleted) {
    if (typeof window.showFeedbackPrompt === 'function') {
        window.showFeedbackPrompt(isCompleted);
    }
}

function goBack() {
    BedContext.go('Home');
}

let movementInterval = null;
let currentX = 15;
let currentY = 70;

function movePin(x, y) {
    var pin = document.getElementById("pin");
    if (!pin) {
        console.warn("Tracking: #pin element not found.");
        return;
    }
    pin.style.transition = "left 1.2s ease, top 1.2s ease";
    pin.style.left = x + "%";
    pin.style.top = y + "%";
    currentX = x;
    currentY = y;
}

function startMovement() {
    var pin = document.getElementById("pin");
    if (!pin) {
        console.warn("[pin] #pin element not found.");
        return;
    }

    var xPct = 15;
    var yPct = 70;

    if (window.trackData) {
        var rx = parseFloat(window.trackData.xaxis);
        var ry = parseFloat(window.trackData.yaxis);

        if (!isNaN(rx) && !isNaN(ry) && (rx > 0 || ry > 0)) {
            var mapImg = (pin.parentElement && pin.parentElement.querySelector("img"))
                || document.querySelector('img[src*="FLOOR"]')
                || document.querySelector('img[src*="4TH_FLOOR"]')
                || document.querySelector('.floor-plan img')
                || document.querySelector('.map-card img');

            var imgW = mapImg ? (mapImg.naturalWidth || mapImg.clientWidth) : 0;
            var imgH = mapImg ? (mapImg.naturalHeight || mapImg.clientHeight) : 0;

            var REF_W = 1496;
            var REF_H = 1036;

            if (imgW > 0 && imgH > 0) {
                var imgX = rx * (imgW / REF_W);
                var imgY = ry * (imgH / REF_H);

                xPct = (imgX / imgW) * 100;
                yPct = (imgY / imgH) * 100;
            } else {
                console.warn("[pin] map image not found or has no size");
            }
        }
    }

    pin.style.position = "absolute";
    pin.style.left = xPct + "%";
    pin.style.top = yPct + "%";
    pin.style.width = "24px";
    pin.style.height = "24px";
    pin.style.background = "transparent";
    pin.style.border = "3px solid #ffffff";
    pin.style.borderRadius = "50%";
    pin.style.zIndex = "10";
    pin.style.transform = "translate(-50%, -50%)";
    pin.style.display = "block";
    pin.style.visibility = "visible";
    pin.style.opacity = "1";
}

function stopMovement() {
    if (movementInterval) {
        clearInterval(movementInterval);
        movementInterval = null;
    }
}

function refreshTrackingData() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderIds = urlParams.get('orderIds') || '';
    const requestId = urlParams.get('requestId') || urlParams.get('RequestID') || '';

    const bed = BedContext.get();
    const roomNo = bed.roomBed || bed.roomNumber || '';

    if (orderIds) {
        if (typeof getTrackingInfoByOrderIds === 'function') {
            getTrackingInfoByOrderIds();
        }
    } else if (requestId || roomNo) {
        if (typeof getTrackingInfo === 'function') {
            getTrackingInfo();
        }
    }
}

function updateTime() {
    const el = document.getElementById("dynamic-time");
    if (!el) return;

    function refresh() {
        el.innerText = getFormattedDateTime();
    }
    refresh();
    setInterval(refresh, 60000);
}

function getFormattedDateTime(date = new Date()) {
    const optionsDate = { weekday: "long", month: "long", day: "numeric" };
    const optionsTime = { hour: "2-digit", minute: "2-digit", hour12: true };
    return date.toLocaleDateString("en-US", optionsDate) + " " +
        date.toLocaleTimeString("en-US", optionsTime);
}

function setStarRating(ratingValue, ClassName) {
    $(ClassName).removeClass("active");
    $(ClassName).each(function () {
        if ($(this).data("value") <= ratingValue) {
            $(this).addClass("active");
        }
    });
}

function safeText(id, value) {
    var el = document.getElementById(id);
    if (!el) return;
    var strVal = (value === null || value === undefined || value === '') ? '-' : String(value);
    if (el.textContent !== strVal) {
        el.textContent = strVal;
    }
}

function safeHtml(id, html) {
    var el = document.getElementById(id);
    if (!el) return;
    if (el.innerHTML !== html) {
        el.innerHTML = html;
    }
}

function updateTrackingProgress(statusId, porterNameParam) {
    statusId = parseInt(statusId, 10);
    var porterName = porterNameParam || "-";

    safeText("porter", porterName);
    safeText("porterName", porterName);

    var trackingMessage = document.getElementById("trackingMessage");
    if (trackingMessage) {
        var msg = (porterName !== "-" && porterName !== "null" && porterName !== null && porterName !== "")
            ? " is on the way" : " is not assigned yet";
        if (trackingMessage.textContent !== msg) {
            trackingMessage.textContent = msg;
        }
    }

    var trackingCard = document.getElementById("trackingCard");
    var feedbackPrompt = document.getElementById("feedbackPrompt");
    var progressBar = document.getElementById("trackingProgress");
    var steps = document.querySelectorAll(".tracking-steps span");
    var trackingTitle = document.getElementById("trackingTitle");

    if (!trackingCard || !progressBar) return;

    var currentStep = 1;
    var progress = 0;
    var titleText = "Need assistance";

    switch (statusId) {
        case 1:
        case 2: currentStep = 1; progress = 0; titleText = "Request Placed"; break;
        case 3:
        case 4:
        case 5: currentStep = 2; progress = 33.33; titleText = "Porter Assigned"; break;
        case 6:
        case 7: currentStep = 3; progress = 66.66; titleText = "On the way"; break;
        case 8: currentStep = 4; progress = 100; titleText = "Completed"; break;
        default: currentStep = 1; progress = 0; titleText = "Need assistance"; break;
    }

    safeText("trackingTitle", titleText);

    var newWidth = progress + "%";
    if (progressBar.style.width !== newWidth) {
        progressBar.style.width = newWidth;
    }

    steps.forEach(function (s) {
        var stepNumber = parseInt(s.getAttribute("data-step"), 10);
        var shouldBeCompleted = stepNumber < currentStep;
        var shouldBeActive = stepNumber === currentStep;

        if (s.classList.contains("completed") !== shouldBeCompleted) {
            s.classList.toggle("completed", shouldBeCompleted);
        }
        if (s.classList.contains("active") !== shouldBeActive) {
            s.classList.toggle("active", shouldBeActive);
        }
    });

    if (trackingCard.style.display !== "block") trackingCard.style.display = "block";

    if (feedbackPrompt) {
        var display = statusId === 8 ? "block" : "none";
        if (feedbackPrompt.style.display !== display) feedbackPrompt.style.display = display;
    }
}

function updateTrackingProgressForRequest(statusId, porterNameParam) {
    statusId = parseInt(statusId, 10);
    var porterName = porterNameParam || "-";

    safeText("porter", porterName);
    safeText("porterName", porterName);

    var trackingMessage = document.getElementById("trackingMessage");
    if (trackingMessage) {
        var msg = (porterName !== "-" && porterName !== "null" && porterName !== null && porterName !== "")
            ? " is on the way" : " is not assigned yet";
        if (trackingMessage.textContent !== msg) {
            trackingMessage.textContent = msg;
        }
    }

    var trackingCard = document.getElementById("trackingCard");
    var feedbackPrompt = document.getElementById("feedbackPrompt");
    var progressBar = document.getElementById("trackingProgress");
    var steps = document.querySelectorAll(".tracking-steps span");
    var trackingTitle = document.getElementById("trackingTitle");

    if (!trackingCard || !progressBar) return;

    var stepLabels = {
        1: ['PENDING', 'ACCEPTED', 'IN PROGRESS', 'COMPLETED'],
        2: ['PENDING', 'ACCEPTED', 'IN PROGRESS', 'COMPLETED'],
        3: ['PENDING', 'ASSIGNED', 'IN PROGRESS', 'COMPLETED'],
        4: ['PENDING', 'ASSIGNED', 'IN PROGRESS', 'COMPLETED'],
        5: ['PENDING', 'ASSIGNED', 'EXECUTED', 'COMPLETED'],
        6: ['PENDING', 'ASSIGNED', 'IN PROGRESS', 'COMPLETED'],
        7: ['CANCELLED', '', '', ''],
        8: ['ON HOLD', '', '', '']
    };

    var labels = stepLabels[statusId] || ['PENDING', 'ASSIGNED', 'IN PROGRESS', 'COMPLETED'];

    steps.forEach(function (s, index) {
        if (index < labels.length && labels[index]) {
            if (s.textContent !== labels[index]) {
                s.textContent = labels[index];
            }
        }
    });

    var currentStep = 1;
    var progress = 0;
    var titleText = "Need assistance";

    switch (statusId) {
        case 1: currentStep = 1; progress = 0; titleText = "Request Placed"; break;
        case 2: currentStep = 2; progress = 33.33; titleText = "Request Accepted"; break;
        case 3: currentStep = 2; progress = 50; titleText = "Porter Assigned"; break;
        case 4: currentStep = 3; progress = 75; titleText = "In Progress"; break;
        case 5: currentStep = 3; progress = 90; titleText = "Executed"; break;
        case 6: currentStep = 4; progress = 100; titleText = "Completed"; break;
        case 7: currentStep = 1; progress = 0; titleText = "Cancelled"; break;
        case 8: currentStep = 1; progress = 0; titleText = "On Hold"; break;
        default: currentStep = 1; progress = 0; titleText = "Need assistance"; break;
    }

    safeText("trackingTitle", titleText);

    var newWidth = progress + "%";
    if (progressBar.style.width !== newWidth) {
        progressBar.style.width = newWidth;
    }

    steps.forEach(function (s) {
        var stepNumber = parseInt(s.getAttribute("data-step"), 10);
        var shouldBeCompleted = stepNumber < currentStep;
        var shouldBeActive = stepNumber === currentStep;

        if (s.classList.contains("completed") !== shouldBeCompleted) {
            s.classList.toggle("completed", shouldBeCompleted);
        }
        if (s.classList.contains("active") !== shouldBeActive) {
            s.classList.toggle("active", shouldBeActive);
        }
    });

    if (trackingCard.style.display !== "block") trackingCard.style.display = "block";

    if (feedbackPrompt) {
        var display = statusId === 6 ? "block" : "none";
        if (feedbackPrompt.style.display !== display) feedbackPrompt.style.display = display;
    }
}

function loadData(data) {
    var trackData = (data && !Array.isArray(data)) ? data
        : (Array.isArray(data) && data.length > 0 ? data[0] : null);
    if (!trackData) return;

    var bed = BedContext.get();
    var roomNo = bed.roomBed || bed.roomNumber || "-";

    safeText("requestStaus", trackData.requestStatus || trackData.RequestStatus || trackData.status);
    safeText("roomNumber", roomNo);
    safeText("requestId", trackData.requestNo || trackData.RequestNo);

    safeCallMapImage(trackData.floorName || trackData.FloorName);

    safeText("arrival",
        trackData.etA_Display || trackData.ETA_Display ||
        trackData.eta || trackData.Eta ||
        trackData.estimateD_TIME || trackData.ESTIMATED_TIME);
    safeText("floor", trackData.floorName || trackData.FloorName);
    safeText("zone", trackData.location || trackData.Location || trackData.from || trackData.FROM);
    safeText("task", trackData.categoryName || trackData.CategoryName || trackData.ordertype || trackData.ORDERTYPE);
    safeText("porter", trackData.porterName || trackData.PorterName);
    safeText("patientName", trackData.orderby || trackData.ORDERBY || trackData.customeR_NAME || trackData.CUSTOMER_NAME);
    safeText("itemName", trackData.itemname || trackData.ITEMNAME);
    safeText("quantity", trackData.quantity || trackData.QUANTITY);

    var mealEl = document.getElementById("mealType");
    var mealRow = mealEl ? mealEl.closest('.info-row') : null;
    if (mealRow) mealRow.style.display = 'none';
    safeText("specialInstruction", trackData.specialinstruction || trackData.SPECIALINSTRUCTION);

    var status = trackData.requestStatus || trackData.RequestStatus || trackData.status || "";
    var statusId = trackData.requestStatusId || trackData.RequestStatusId || "";

    updatePorterImages(trackData, status, statusId);
    applyHeaderFromTrackData(trackData);
    safeCallPushPin(trackData);

    var isCompleted = statusId === "6" || status === "Completed" || status === "COMPLETED";
    safeCallFeedbackPrompt(isCompleted);

    var ratingValue = trackData.rating || trackData.Rating;
    if (ratingValue && ratingValue != '0' && ratingValue != 0) {
        setStarRating(parseInt(ratingValue), ".star");
        setStarRating(parseInt(ratingValue), ".trigger-star");
    }

    if (statusId) {
        updateTrackingProgressForRequest(parseInt(statusId), trackData.porterName);
    } else {
        var upper = status.toUpperCase();
        if (upper === "COMPLETED") updateTrackingProgressForRequest(6, trackData.porterName);
        else if (upper === "IN PROGRESS") updateTrackingProgressForRequest(4, trackData.porterName);
        else if (upper === "ASSIGNED") updateTrackingProgressForRequest(3, trackData.porterName);
        else if (upper === "ACCEPTED") updateTrackingProgressForRequest(2, trackData.porterName);
        else if (upper === "PENDING") updateTrackingProgressForRequest(1, trackData.porterName);
        else if (upper === "CANCELLED") updateTrackingProgressForRequest(7, trackData.porterName);
        else if (upper === "ONHOLD") updateTrackingProgressForRequest(8, trackData.porterName);
    }
}

function loadDataForOrderIds(data) {
    var trackData = (data && Array.isArray(data) && data.length > 0) ? data[0] : null;
    if (!trackData) return;

    safeText("requestStaus", trackData.requestStatus);
    safeText("roomNumber", trackData.from);
    safeText("requestId", trackData.requestNo);

    safeCallMapImage(trackData.floorName);
    safeText("arrival", trackData.etA_Display || trackData.eta);
    safeText("floor", trackData.floorName);
    safeText("zone", trackData.location || trackData.from);
    safeText("task", trackData.categoryName || trackData.mealtype);
    safeText("porter", trackData.porterName);
    safeText("patientName", trackData.orderby || trackData.customeR_NAME);
    safeText("itemName", trackData.itemname);
    safeText("quantity", trackData.quantity);

    var mealEl = document.getElementById("mealType");
    var mealRow = mealEl ? mealEl.closest('.info-row') : null;
    if (mealRow) mealRow.style.display = 'flex';
    safeText("mealType", trackData.mealtype);
    safeText("specialInstruction", trackData.specialinstruction);

    var statusForImg = trackData.requestStatus || "";
    var statusIdForImg = trackData.requestStatusId || "";
    updatePorterImages(trackData, statusForImg, statusIdForImg);
    applyHeaderFromTrackData(trackData);
    safeCallPushPin(trackData);

    var isCompleted = statusForImg === "DELIVERED" || statusForImg === "Delivered" || statusIdForImg === "8";
    safeCallFeedbackPrompt(isCompleted);

    var ratingValue = trackData.rating;
    if (ratingValue && ratingValue != '0' && ratingValue != 0) {
        setStarRating(parseInt(ratingValue), ".star");
        setStarRating(parseInt(ratingValue), ".trigger-star");
    }

    var porterName = trackData.porterName || "-";
    if (statusIdForImg) {
        updateTrackingProgress(parseInt(statusIdForImg), porterName);
    } else if (statusForImg === "In-Transit" || statusForImg === "In Transit") {
        updateTrackingProgress(7, porterName);
    } else if (statusForImg === "Delivered") {
        updateTrackingProgress(8, porterName);
    } else if (statusForImg === "Ready for Pickup") {
        updateTrackingProgress(6, porterName);
    } else if (statusForImg === "Preparing") {
        updateTrackingProgress(3, porterName);
    } else if (statusForImg === "Placed") {
        updateTrackingProgress(1, porterName);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    startMovement();
    updateTime();

    var tries = 0;
    var wait = setInterval(function () {
        tries++;
        if (window.trackData) {
            clearInterval(wait);
            startMovement();
        }
        if (tries > 60) clearInterval(wait);
    }, 250);
});

setInterval(function () {
    var urlParams = new URLSearchParams(window.location.search);
    var orderIds = urlParams.get('orderIds');
    var requestId = urlParams.get('requestId') || urlParams.get('RequestID');
    var bed = BedContext.get();
    var roomNo = bed.roomBed || bed.roomNumber;

    if (orderIds) {
        if (typeof getTrackingInfoByOrderIds === 'function') getTrackingInfoByOrderIds();
    } else if (roomNo || requestId) {
        if (typeof getTrackingInfo === 'function') getTrackingInfo();
    }
}, 5000);