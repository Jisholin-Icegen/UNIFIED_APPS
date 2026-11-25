let servicesData = [];
let selectedTaskId = 0;
let rating = 0;

var PAGE_LIMIT = 10;

var TASK_TYPES_CACHE_KEY = 'taskTypesCache';
var TASK_TYPES_CACHE_TS = 'taskTypesCacheTs';
var TASK_TYPES_TTL_MS = 10 * 60 * 1000;

function GetTaskTypes() {
    try {
        var cached = sessionStorage.getItem(TASK_TYPES_CACHE_KEY);
        var ts = parseInt(sessionStorage.getItem(TASK_TYPES_CACHE_TS) || '0', 10);

        if (cached && ts && (Date.now() - ts) < TASK_TYPES_TTL_MS) {
            return $.Deferred().resolve(JSON.parse(cached)).promise();
        }
    } catch (e) { }

    if (window.__taskTypesRequest) {
        var deferred = $.Deferred();
        window.__taskTypesRequest.then(function (data) {
            try {
                sessionStorage.setItem(TASK_TYPES_CACHE_KEY, JSON.stringify(data));
                sessionStorage.setItem(TASK_TYPES_CACHE_TS, String(Date.now()));
            } catch (e) { }
            deferred.resolve(data);
        });
        return deferred.promise();
    }

    return $.ajax({
        url: '/RoomComfort/GetTaskTypes',
        type: 'GET'
    }).done(function (data) {
        try {
            sessionStorage.setItem(TASK_TYPES_CACHE_KEY, JSON.stringify(data));
            sessionStorage.setItem(TASK_TYPES_CACHE_TS, String(Date.now()));
        } catch (e) { }
    });
}

var taskTypesPromise = GetTaskTypes();

function renderServiceCards(container, data) {
    servicesData = (data || []).filter(function (service) {
        return service.CategoryDescription &&
            service.CategoryDescription.trim() !== '' &&
            service.CategoryDescription !== 'null';
    });

    var frag = document.createDocumentFragment();

    servicesData.forEach(function (service) {
        var card = document.createElement("div");
        card.className = "service-card";
        card.dataset.categoryId = service.CategoryId;
        card.innerHTML =
            '<div class="icon-box">' +
            '<img src="/' + service.CategoryImage + '" alt="" loading="lazy" decoding="async">' +
            '</div>' +
            '<div class="service-title">' + service.CategoryDescription + '</div>';

        card.addEventListener("click", function () { openModal(service.CategoryId); });
        frag.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(frag);
}

document.addEventListener("DOMContentLoaded", function () {
    const container = document.getElementById("servicesContainer");
    const modal = document.getElementById("modalOverlay");
    const modalTitle = document.getElementById("modalTitle");
    const modalIcon = document.getElementById("modalIcon");
    const modalSubmit = document.getElementById("modalSubmit");

    if (container) {
        taskTypesPromise.done(function (data) {
            renderServiceCards(container, data);
        });
    }

    function openModal(id) {
        const service = servicesData.find(s => String(s.CategoryId) === String(id));
        if (!service) return;

        if (modalTitle) modalTitle.textContent = service.CategoryDescription;
        if (modalIcon) modalIcon.src = "/" + service.CategoryImage;
        $("#hdnTaskTypeId").val(service.CategoryId);

        if (modal) modal.style.display = "flex";
    }

    function closeModal() {
        if (modal) modal.style.display = "none";
    }

    if (modal) {
        modal.addEventListener("click", function (e) {
            if (e.target === modal) closeModal();
        });
    }

    if (modalSubmit) {
        const freshBtn = modalSubmit.cloneNode(true);
        modalSubmit.parentNode.replaceChild(freshBtn, modalSubmit);

        freshBtn.addEventListener("click", function () {

            const categoryId = $("#hdnTaskTypeId").val();
            const quantity = $("#txtQuantity").val() || "1";
            const remarks = $("#modalRemarks").val() || "";

            const patientName = (BedContext.get().patientName) || "";
            const bedNo = (BedContext.get().bedId) || "";

            if (!categoryId) {
                alert("Please select a service.");
                return;
            }

            if (!bedNo) {
                alert("Room information is missing. Please scan the QR code again.");
                return;
            }

            freshBtn.disabled = true;
            showRequestLoading();

            $.ajax({
                url: "/RoomComfort/CreateRequest",
                type: "POST",
                contentType: "application/json",
                dataType: "json",
                data: JSON.stringify({
                    BedNo: bedNo,
                    PatientName: patientName,
                    CategoryId: categoryId,
                    Quantity: quantity,
                    Remarks: remarks
                })
            })
                .done(function (res) {

                    if (!res || !res.success) {
                        hideRequestLoading();
                        if (window.__unifiedAIRequestAction && window.UnifiedAIChild) {
                            window.UnifiedAIChild.respond(window.__unifiedAIRequestAction, false, null, (res && res.message) || "Request failed.");
                            window.__unifiedAIRequestAction = null;
                        }
                        alert("Failed: " + ((res && res.message) || "Unknown error"));
                        return;
                    }

                    if (window.__unifiedAIRequestAction && window.UnifiedAIChild) {
                        window.UnifiedAIChild.respond(window.__unifiedAIRequestAction, true, { requestNo: res.requestNo || null });
                        window.__unifiedAIRequestAction = null;
                    }

                    closeModal();

                    fetchTasks().then(function (rows) {

                        successRequests = groupAllByRequestId(rows);

                        successIndex = 0;

                        if (res.requestNo) {
                            var index = successRequests.findIndex(function (request) {
                                return String(request.RequestId) === String(res.requestNo);
                            });

                            if (index >= 0) {
                                successIndex = index;
                            }
                        }

                        if (!successRequests.length) {
                            successRequests = [{
                                RequestId: res.requestNo || "",
                                TaskName: "",
                                PorterName: "",
                                Status: "PENDING",
                                Eta: "-"
                            }];
                            successIndex = 0;
                        }

                        paintRequest();

                        loadTasks();

                        hideRequestLoading();

                        var successOverlay = document.getElementById("requestSuccessScreen");

                        if (successOverlay) {
                            successOverlay.classList.add("show");
                            document.body.style.overflow = "hidden";
                        }

                    }).catch(function (error) {

                        hideRequestLoading();

                        console.error("Error loading latest request data:", error);

                        showSuccessModal(res.requestNo);
                    });
                })
                .fail(function (xhr) {

                    hideRequestLoading();
                    if (window.__unifiedAIRequestAction && window.UnifiedAIChild) {
                        window.UnifiedAIChild.respond(window.__unifiedAIRequestAction, false, null, "Request failed with HTTP " + xhr.status + ".");
                        window.__unifiedAIRequestAction = null;
                    }

                    alert("Error: " + xhr.status + " " + xhr.statusText);
                })
                .always(function () {
                    freshBtn.disabled = false;
                });
        });
    }

    window.closeModal = closeModal;
    window.openModal = openModal;

    document.querySelectorAll(".star").forEach(star => {
        star.onclick = function () {
            rating = this.getAttribute("data");
            document.querySelectorAll(".star").forEach(s => s.classList.remove("active"));
            for (let i = 0; i < rating; i++) {
                document.querySelectorAll(".star")[i].classList.add("active");
            }
        };
    });
});

function renderTasks(data) {
    if (!Array.isArray(data)) data = [];

    data.sort((a, b) => {
        let aId = Number(a.taskId ?? a.TaskId ?? a.RequestNo ?? 0) || 0;
        let bId = Number(b.taskId ?? b.TaskId ?? b.RequestNo ?? 0) || 0;
        return bId - aId;
    });

    let activeHTML = "";
    let completedHTML = "";
    let activeCount = 0;
    let completedCount = 0;

    data.forEach(t => {
        if (!t) return;

        let rawStatus = String(
            t.status ?? t.Status ??
            t.requestStatus ?? t.RequestStatus ??
            t.REQUESTSTATUS ?? ""
        ).trim();

        let status = rawStatus.toLowerCase();

        let taskId = t.taskId ?? t.TaskId ?? t.RequestNo ?? t.requestId ?? "";
        let categoryName = t.taskName ?? t.TaskName ?? t.CategoryName ?? "";
        let porterName = t.porterName ?? t.PorterName ?? "";
        let fromRoom = t.fromRoom ?? t.FromRoom ?? t.FROM ?? "";
        let requestDate = t.requestDate ?? t.RequestDate ?? "";
        let serviceType = t.service ?? t.Service ?? "";

        let displayDate = "";
        if (requestDate) {
            let d = new Date(requestDate);
            if (!isNaN(d)) {
                displayDate = d.toLocaleDateString("en-GB", {
                    day: "2-digit", month: "short", year: "numeric"
                }) + " " + d.toLocaleTimeString("en-GB", {
                    hour: "2-digit", minute: "2-digit"
                });
            }
        }

        let displayStatus = "PENDING";
        let pillClass = "pill-pending";

        switch (status) {
            case "pending":
            case "placed":
                displayStatus = "PENDING";
                pillClass = "pill-pending";
                break;
            case "accepted":
                displayStatus = "PENDING";
                pillClass = "pill-assigned";
                break;
            case "ready":
                displayStatus = "READY";
                pillClass = "pill-assigned";
                break;
            case "assigned":
                displayStatus = "ASSIGNED";
                pillClass = "pill-assigned";
                break;
            case "in-progress":
            case "inprogress":
            case "in progress":
                displayStatus = "IN-PROGRESS";
                pillClass = "pill-inprogress";
                break;
            case "executed":
                displayStatus = "EXECUTED";
                pillClass = "pill-inprogress";
                break;
            case "completed":
                displayStatus = "COMPLETED";
                pillClass = "pill-completed";
                break;
            case "delivered":
                displayStatus = "DELIVERED";
                pillClass = "pill-completed";
                break;
            case "cancelled":
            case "canceled":
                displayStatus = "CANCELLED";
                pillClass = "pill-cancelled";
                break;
            case "onhold":
            case "on hold":
                displayStatus = "ONHOLD";
                pillClass = "pill-assigned";
                break;
            default:
                displayStatus = rawStatus ? rawStatus.toUpperCase() : "PENDING";
                pillClass = "pill-pending";
        }

        let porterDisplay = porterName && porterName.trim() !== ""
            ? porterName
            : "Not assigned";

        let porterClass = porterName && porterName.trim() !== "" ? "" : "muted";
        let hasPorter = porterName && porterName.trim() !== "" ? "1" : "0";

        let card = `
        <div class="task-card"
             onclick="handleActive('${status}','${taskId}','${hasPorter}','${serviceType}')">

            <div class="task-card__head">
                <div class="task-card__title">${categoryName}</div>
                <span class="status-pill ${pillClass}">${displayStatus}</span>
            </div>

            <div class="task-card__row">
                <span class="task-card__label">From Room</span>
                <span class="task-card__value">${fromRoom}</span>
            </div>

            <div class="task-card__row">
                <span class="task-card__label">Porter</span>
                <span class="task-card__value ${porterClass}">${porterDisplay}</span>
            </div>

            <div class="task-card__foot">
                <span class="task-card__id">REQ-${taskId}</span>
                <span class="task-card__date">${displayDate}</span>
            </div>
        </div>`;

        let isCompleted = (status === "completed"
            || status === "delivered"
            || status === "cancelled"
            || status === "canceled");

        if (isCompleted) {
            completedCount++;
            if (completedCount <= PAGE_LIMIT) {
                completedHTML += card;
            }
        } else {
            activeCount++;
            if (activeCount <= PAGE_LIMIT) {
                activeHTML += card;
            }
        }
    });

    let activeMore = activeCount > PAGE_LIMIT
        ? '+' + (activeCount - PAGE_LIMIT) + ' more'
        : '';
    let completedMore = completedCount > PAGE_LIMIT
        ? '+' + (completedCount - PAGE_LIMIT) + ' more'
        : '';

    var activeEl = document.getElementById("activeList");
    var completedEl = document.getElementById("completedList");
    var activeMoreEl = document.getElementById("activeMore");
    var completedMoreEl = document.getElementById("completedMore");

    if (activeEl) activeEl.innerHTML = activeHTML;
    if (completedEl) completedEl.innerHTML = completedHTML;
    if (activeMoreEl) activeMoreEl.textContent = activeMore;
    if (completedMoreEl) completedMoreEl.textContent = completedMore;
}

function handleActive(status, id, hasPorter, serviceType) {
    if (hasPorter !== "1") {
        if (typeof window.showToast === "function") {
            window.showToast("Porter not assigned yet");
        }
        return;
    }

    var bedId = BedContext.get().bedId;
    if (!bedId) {
        if (typeof window.showToast === "function") {
            window.showToast("Session expired. Please scan the QR again.");
        }
        return;
    }

    var orderId = id;
    var svc = String(serviceType || '').toUpperCase().trim();

    if (svc.indexOf('FOOD') !== -1) {
        BedContext.go('FoodDining/OrderSuccess', { orderIds: orderId });
    } else {
        BedContext.go('Tracking', { RequestID: orderId });
    }
}
function toggleCompleted(id) {
    let el = document.getElementById("detail_" + id);
    if (!el) return;
    el.style.display = el.style.display === "block" ? "none" : "block";
}

function openFeedback(id) {
    selectedTaskId = id;
    document.getElementById("feedbackModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("feedbackModal").style.display = "none";
}

function submitFeedback() {
    let remarks = document.getElementById("remarks").value;

    fetch('/MyRequests/SubmitRating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            RequestNo: selectedTaskId,
            Rating: rating,
            Remarks: remarks
        })
    })
        .then(() => {
            if (typeof window.showToast === "function") {
                window.showToast("Thanks for your valuable feedback");
            }
            closeModal();
            loadTasks();
        });
}

    function loadTasks() {
        var bedId = encodeURIComponent(BedContext.get().bedId || "");
        var bedNumber = encodeURIComponent(BedContext.get().roomBed || "");

        return fetch("/MyRequests/GetTasks?BedId=" + bedId + "&BedNumber=" + bedNumber)

        .then(function (res) {
            if (!res.ok) {
                throw new Error("Failed to load tasks: " + res.status);
            }
            return res.json();
        })
        .then(function (data) {
            if (!Array.isArray(data)) data = [];

            window.allTasks = data;
            renderTasks(data);

            if (typeof updateSectionVisibility === "function") {
                updateSectionVisibility();
            }

            return data;
        });
}

var successRequests = [];
var successIndex = 0;

    function getBedId() {
        return BedContext.get().bedId || '';
    }

    function getBedNumber() {
        return BedContext.get().roomBed || '';
    }

function getField(obj, camel, pascal) {
    if (!obj) return '';
    if (obj[camel] !== undefined && obj[camel] !== null) return obj[camel];
    if (obj[pascal] !== undefined && obj[pascal] !== null) return obj[pascal];
    return '';
}

function getTaskId(r) {
    return String(
        getField(r, 'taskId', 'TaskId') ||
        getField(r, 'requestId', 'RequestId') ||
        ''
    ).trim();
}

function getTaskName(r) {
    return String(getField(r, 'taskName', 'TaskName') || '').trim();
}

function getPorterName(r) {
    return String(getField(r, 'porterName', 'PorterName') || '').trim();
}

function getStatus(r) {
    return String(getField(r, 'status', 'Status') || '').trim().toUpperCase();
}

function getEta(r) {
    return String(
        getField(r, 'eta', 'Eta') ||
        getField(r, 'ETA', 'ETA') ||
        ''
    ).trim();
}

function statusColorFor(status) {
    switch ((status || '').toUpperCase()) {
        case 'READY':
        case 'ACCEPTED':
        case 'ASSIGNED':
            return '#3b82f6';
        case 'IN-PROGRESS':
        case 'INPROGRESS':
        case 'EXECUTED':
            return '#3b82f6';
        case 'COMPLETED':
        case 'DELIVERED':
            return '#10b981';
        case 'CANCELLED':
        case 'CANCELED':
            return '#ef4444';
        case 'ONHOLD':
            return '#f59e0b';
        default:
            return '#00a86b';
    }
}

function resolveEta(rawEta, porterName) {
    var eta = String(rawEta || '').trim();

    if (eta && eta !== '-') return eta;

    var hasPorter = porterName && porterName.trim() !== '';
    if (hasPorter) return '5 Mins';

    return '-';
}

function fetchTasks() {
    var bedId = encodeURIComponent(getBedId());
    var bedNumber = encodeURIComponent(getBedNumber());
    var url = '/RoomComfort/GetTasks?BedId=' + bedId + '&BedNumber=' + bedNumber;

    return $.ajax({
        url: url,
        type: 'GET',
        dataType: 'json'
    })
        .then(function (data) {
            return Array.isArray(data) ? data : [];
        })
        .catch(function () {
            return [];
        });
}

function groupAllByRequestId(rows) {
    var map = {};
    var order = [];

    rows.forEach(function (r) {
        var id = getTaskId(r);
        if (!id) return;

        if (!map[id]) {
            map[id] = {
                RequestId: id,
                TaskNames: [],
                PorterName: '',
                Status: 'PENDING',
                Eta: '',
                FromRoom: getField(r, 'fromRoom', 'FromRoom'),
                Service: getField(r, 'service', 'Service'),
                RequestDate: getField(r, 'requestDate', 'RequestDate')
            };
            order.push(id);
        }

        var taskName = getTaskName(r);
        if (taskName && map[id].TaskNames.indexOf(taskName) === -1) {
            map[id].TaskNames.push(taskName);
        }

        var porter = getPorterName(r);
        if (!map[id].PorterName && porter !== '') {
            map[id].PorterName = porter;
        }

        var rowStatus = getStatus(r);
        var curStatus = String(map[id].Status || '').toUpperCase();

        var priority = {
            'PENDING': 1,
            'READY': 2,
            'ACCEPTED': 2,
            'ASSIGNED': 3,
            'IN-PROGRESS': 4,
            'INPROGRESS': 4,
            'EXECUTED': 5,
            'DELIVERED': 5,
            'COMPLETED': 6,
            'CANCELLED': 7,
            'CANCELED': 7,
            'ONHOLD': 8
        };

        if ((priority[rowStatus] || 1) > (priority[curStatus] || 1)) {
            map[id].Status = rowStatus;
        }

        var eta = getEta(r);
        if (eta && (!map[id].Eta || map[id].Eta === '' || map[id].Eta === '-')) {
            map[id].Eta = eta;
        }
    });

    return order.map(function (id) {
        var g = map[id];
        g.TaskName = g.TaskNames.join(', ');
        delete g.TaskNames;
        g.Eta = resolveEta(g.Eta, g.PorterName);
        return g;
    });
}

function paintRequest() {
    if (!successRequests.length) {
        successRequests = [{
            RequestId: '',
            TaskName: '',
            PorterName: '',
            Status: 'PENDING',
            Eta: '-'
        }];
        successIndex = 0;
    }

    if (successIndex < 0) successIndex = 0;
    if (successIndex > successRequests.length - 1) successIndex = successRequests.length - 1;

    var req = successRequests[successIndex];
    var porter = (req.PorterName || '').trim();

    var reqIdEl = document.getElementById('successReqId');
    var staffEl = document.getElementById('successStaffName');
    var taskEl = document.getElementById('successTaskName');
    var etaEl = document.getElementById('successEta');
    var statEl = document.getElementById('successStatus');

    if (reqIdEl) reqIdEl.textContent = req.RequestId ? '#' + req.RequestId : '#-';
    if (staffEl) staffEl.textContent = porter ? porter.toUpperCase() : 'will be';
    if (taskEl) taskEl.textContent = req.TaskName || '-';
    if (etaEl) etaEl.textContent = req.Eta || '-';

    if (statEl) {
        statEl.textContent = (req.Status || 'PENDING').toUpperCase();
        statEl.style.color = statusColorFor(req.Status);
    }

    var dotsEl = document.getElementById('dotsContainer');
    if (dotsEl) {
        var total = successRequests.length;
        var maxDots = 7;

        if (total <= maxDots) {
            dotsEl.innerHTML = successRequests.map(function (r, i) {
                return '<span class="dot' + (i === successIndex ? ' active' : '') +
                    '" onclick="goToRequestIndex(' + i + ')"></span>';
            }).join('');
        } else {
            var half = Math.floor(maxDots / 2);
            var start = successIndex - half;
            var end = successIndex + half;

            if (start < 0) { start = 0; end = maxDots - 1; }
            if (end > total - 1) { end = total - 1; start = total - maxDots; }

            var html = '';

            if (start > 0) {
                html += '<span class="dot" onclick="goToRequestIndex(0)"></span>';
                if (start > 1) html += '<span class="dot-gap">…</span>';
            }

            for (var i = start; i <= end; i++) {
                html += '<span class="dot' + (i === successIndex ? ' active' : '') +
                    '" onclick="goToRequestIndex(' + i + ')"></span>';
            }

            if (end < total - 1) {
                if (end < total - 2) html += '<span class="dot-gap">…</span>';
                html += '<span class="dot" onclick="goToRequestIndex(' + (total - 1) + ')"></span>';
            }

            dotsEl.innerHTML = html;
        }
    }

    var prevEl = document.getElementById('btnPrevRequest');
    var nextEl = document.getElementById('btnNextRequest');

    if (prevEl) {
        if (successIndex === 0) {
            prevEl.classList.add('disabled');
        } else {
            prevEl.classList.remove('disabled');
        }
    }

    if (nextEl) {
        if (successIndex === successRequests.length - 1) {
            nextEl.classList.add('disabled');
        } else {
            nextEl.classList.remove('disabled');
        }
    }
}

function goToRequestIndex(i) {
    if (i < 0 || i > successRequests.length - 1) return;
    successIndex = i;
    paintRequest();
}

function prevRequest() {
    if (successIndex <= 0) return;
    successIndex--;
    paintRequest();
}

function nextRequest() {
    if (successIndex >= successRequests.length - 1) return;
    successIndex++;
    paintRequest();
}

function showSuccessModal(requestNo) {
    var overlay = document.getElementById('requestSuccessScreen');
    if (!overlay) return;

    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';

    fetchTasks().then(function (rows) {
        successRequests = groupAllByRequestId(rows);

        if (!successRequests.length) {
            successRequests = [{
                RequestId: requestNo || '',
                TaskName: '',
                PorterName: '',
                Status: 'PENDING',
                Eta: '-'
            }];
            successIndex = 0;
        } else {
            successIndex = 0;
            if (requestNo) {
                for (var i = 0; i < successRequests.length; i++) {
                    if (String(successRequests[i].RequestId) === String(requestNo)) {
                        successIndex = i;
                        break;
                    }
                }
            }
        }

        paintRequest();
    });
}

function showRequestLoading() {
    var loadingScreen = document.getElementById("requestLoadingScreen");

    if (loadingScreen) {
        loadingScreen.classList.add("show");
        document.body.style.overflow = "hidden";
    }
}

function hideRequestLoading() {
    var loadingScreen = document.getElementById("requestLoadingScreen");

    if (loadingScreen) {
        loadingScreen.classList.remove("show");
        document.body.style.overflow = "";
    }
}

function closeSuccessModal() {
    var overlay = document.getElementById('requestSuccessScreen');
    if (overlay) {
        overlay.classList.remove('show');
        document.body.style.overflow = '';
    }
}

    function goToTracking() {
        var req = successRequests[successIndex] || {};
        if (!req.RequestId) return;
        BedContext.go('Tracking', { RequestID: req.RequestId });
    }

window.showSuccessModal = showSuccessModal;
window.closeSuccessModal = closeSuccessModal;
window.goToTracking = goToTracking;
window.prevRequest = prevRequest;
window.nextRequest = nextRequest;
window.goToRequestIndex = goToRequestIndex;

function DailCareRedirect(RedirectURL) {
    if (window.UnifiedAIChild) {
        window.UnifiedAIChild.navigate(RedirectURL);
    } else {
        window.location.href = RedirectURL;
    }
}

document.addEventListener("DOMContentLoaded", function () {
    loadTasks();
});

window.addEventListener("unified-ai:action", function (event) {
    var action = event.detail;
    if (!action || (action.action !== "request.options" && action.action !== "request.create") || action.module !== "room_comfort") return;

    taskTypesPromise.done(function (data) {
        var container = document.getElementById("servicesContainer");
        if (!servicesData.length && container) renderServiceCards(container, data);

        var availableServices = (data || []).filter(function (service) {
            return service.CategoryDescription
                && service.CategoryDescription.trim()
                && service.CategoryDescription.toUpperCase() !== "PREPARE GUEST PASS";
        });

        if (action.action === "request.options") {
            if (window.UnifiedAIChild) {
                window.UnifiedAIChild.respond(action, true, {
                    categories: availableServices.map(function (service) {
                        return { id: service.CategoryId, name: service.CategoryDescription };
                    })
                });
            }
            return;
        }

        var categoryText = action.category || action.categoryName || action.serviceName || action.taskName || "";
        var service = availableServices.find(function (item) {
            return action.categoryId != null && String(item.CategoryId) === String(action.categoryId);
        }) || (window.UnifiedAIChild && window.UnifiedAIChild.resolveRequestCategory
            ? window.UnifiedAIChild.resolveRequestCategory(availableServices, categoryText)
            : null);
        if (!service) {
            if (window.UnifiedAIChild) {
                window.UnifiedAIChild.respond(action, false, {
                    availableCategories: availableServices.map(function (item) { return item.CategoryDescription; })
                }, "Could not uniquely match the requested room-comfort service. Ask the patient to clarify.");
            }
            return;
        }

        var card = Array.from(container ? container.querySelectorAll(".service-card") : []).find(function (item) {
            var title = item.querySelector(".service-title");
            return title && title.textContent.trim().toLowerCase() === service.CategoryDescription.trim().toLowerCase();
        });
        if (!card) {
            if (window.UnifiedAIChild) window.UnifiedAIChild.respond(action, false, null, "The selected service card is unavailable.");
            return;
        }

        window.__unifiedAIRequestAction = action;
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.click();
        var remarksInput = document.getElementById("modalRemarks");
        var remarks = action.remarks || action.patientRemarks || action.details || action.description
            || action.comment || action.userRequest || action.transcript || action.message
            || action.categoryName || action.category || "";
        if (remarksInput) {
            remarksInput.value = String(remarks).slice(0, 1000);
            remarksInput.dispatchEvent(new Event("input", { bubbles: true }));
            remarksInput.dispatchEvent(new Event("change", { bubbles: true }));
        }
        var quantityInput = document.getElementById("txtQuantity");
        if (quantityInput && Number.isInteger(Number(action.quantity))) {
            quantityInput.value = String(Math.max(1, Math.min(20, Number(action.quantity))));
        }
        var submitButton = document.getElementById("modalSubmit");
        if (!submitButton) {
            window.__unifiedAIRequestAction = null;
            if (window.UnifiedAIChild) window.UnifiedAIChild.respond(action, false, null, "Request form is unavailable.");
            return;
        }
        submitButton.click();
    }).fail(function () {
        if (window.UnifiedAIChild) window.UnifiedAIChild.respond(action, false, null, "Could not load room-comfort services.");
    });
});