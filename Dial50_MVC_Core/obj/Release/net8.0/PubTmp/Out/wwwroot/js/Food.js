
let servicesData = [];
let lastSyncTimestamp = new Date();
const modal = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle");
const modalIcon = document.getElementById("modalIcon");
const modalSubmit = document.getElementById("modalSubmit");

function showNpoUi(reason) {
    $("#npoAlertContainer").html(`
        <div class="npo-alert-card">
            <div class="npo-alert-icon">
                <i class="fa-solid fa-circle-exclamation"></i>
            </div>
            <div class="npo-alert-text">
                <h4>Patient is currently on NPO (Nil Per Os)</h4>
                <p>Reason: <strong>${reason}</strong>. The patient cannot place a meal order until the NPO is lifted. Visitor orders are still allowed.</p>
            </div>
        </div>
    `);

    const patientCard = $("#patientCard");
    patientCard.addClass("disabled-card").removeAttr("onclick");
    patientCard.find("p").text("Disabled — patient is on NPO. Lift the NPO order before ordering.");
}

function openModal(id) {
    const service = servicesData.find(s => s.CategoryId === id);
    modalTitle.textContent = service.CategoryDescription;
    modalIcon.src = "/" + service.CategoryImage;
    $("#hdnTaskTypeId").val(service.CategoryId);
    modal.style.display = "flex";
}

function closeModal() {
    modal.style.display = "none";
}

function DailCareRedirect(RedirectURL) {
    navigateFoodPage(RedirectURL);
}

function browseOtherMeals() {
    const wrapper = $("#mealOptionsWrapper");
    const btn = $("#browseToggleBtn");

    if (wrapper.is(":visible")) {
        wrapper.hide();
        btn.text("Browse other meal menus");
    } else {
        wrapper.fadeIn(200);
        btn.text("Hide");
        applyMealLogic();
    }
}

function applyMealLogic() {
    if (typeof servingData === 'undefined' || !servingData || servingData.length === 0) return;

    const mode = $("#hdnMealOrderType").val();

    $(".meal-select-pill").removeClass("disabled active").find(".not-now-label").remove();
    $(".meal-select-pill").off("mouseenter mouseleave");

    if (mode === "preorder") {
        const selected = $("#hdnMealType").val();
        if (selected) {
            const sanitizedSelected = selected.replace(/\s+/g, '_');
            $(`#pill-${sanitizedSelected}`).addClass("active");
        }
    }
    else {
        let firstOpenMealFound = false;

        $(".meal-select-pill").each(function () {
            const $pill = $(this);
            const mealName = $pill.attr("data-mealname");
            const mealObj = servingData.find(m => m.categoryName === mealName);
            if (!mealObj) return;
            const isOpen = isTimeBetween(mealObj.startTime, mealObj.endTime);

            if (isOpen) {
                if (!firstOpenMealFound) {
                    $pill.addClass("active");
                    $("#hdnMealType").val(mealName);
                    firstOpenMealFound = true;
                }
            } else {
                $pill.addClass("disabled");
                $pill.append('<span class="not-now-label">NOT NOW</span>');
                const dynamicMsg = `${mealName} is served between ${mealObj.startTime} and ${mealObj.endTime}. Tap another meal that's currently open instead — there's always something on the menu.`;

                $pill.on("mouseenter", function () {
                    $("#mealHoverNotice").text(dynamicMsg).stop(true, true).fadeIn(200);
                });
                $pill.on("mouseleave", function () {
                    $("#mealHoverNotice").stop(true, true).fadeOut(100);
                });
            }
        });

        if (!firstOpenMealFound) {
            showClosedUI("Kitchen", "our set hours", "scheduled times");
        }
    }
}

function setSpecialInstruction(val) {
    localStorage.setItem("SpecialInstruction", val);
}

var allMenuItems = allMenuItems || [];
var currentCart = currentCart || {};

function finishUnifiedFoodAction(success, result, error) {
    var action = window.__unifiedAIFoodAction;
    if (!action || !window.UnifiedAIChild) return;
    window.__unifiedAIFoodAction = null;
    sessionStorage.removeItem("UnifiedAIPendingFoodSubmit");
    window.UnifiedAIChild.respond(action, success, result, error);
}

function preserveUnifiedAI(url) {
    var params = new URLSearchParams(window.location.search);
    if (params.get("UnifiedAI") !== "1" && params.get("Unified") !== "1") return url;
    var target = new URL(url, window.location.origin);
    target.searchParams.set("Unified", "1");
    target.searchParams.set("UnifiedAI", "1");
    return target.toString();
}

function navigateFoodPage(url) {
    if (window.UnifiedAIChild) {
        window.UnifiedAIChild.navigate(url);
    } else {
        window.location.href = preserveUnifiedAI(url);
    }
}

function getRoomBed() {
    return sessionStorage.getItem('RoomBed')
        || sessionStorage.getItem('bedInfo')
        || '';
}

function addToOrder(id, specificMealType) {
    const mealType = specificMealType || $("#hdnMealType").val();
    const cartKey = id + "_" + mealType;
    const sanitizedId = (id + "_" + mealType).replace(/\s+/g, '_');

    if (!currentCart) { currentCart = {}; }

    if (currentCart[cartKey]) {
        return changeQty(id, 1, mealType);
    }

    var item = allMenuItems.find(x => x.id == id);
    if (!item) return null;

    currentCart[cartKey] = {
        id: item.id,
        mealType: mealType,
        name: item.foodName,
        itemDesc: item.description || "",
        calories: parseInt(item.calories) || 0,
        price: parseFloat(item.price) || 0,
        dietaryType: item.dietaryType || '',
        qty: 1
    };

    var saveRequest = SaveCartToDatabase(currentCart[cartKey]);

    $(`#add-btn-${sanitizedId}`).hide();
    $(`#qty-selector-${sanitizedId}`).css("display", "inline-flex");
    $(`#qty-count-${sanitizedId}`).text(1);

    updateReviewBar();
    const translatedName = i18n.t(item.foodName, item.foodName);
    showCancelToast(translatedName + " added to cart");
    return saveRequest;
}

function LoadCartFromDatabase() {
    const roomNo = getRoomBed();
    const activeTabMealType = $("#hdnMealType").val();

    if (!roomNo) return;

    return $.get('/FoodDining/GetCartItems', { roomNo: roomNo }, function (data) {
        currentCart = {};

        if (data) {
            data.forEach(function (item) {
                const cartKey = item.itemId + "_" + item.mealType;

                currentCart[cartKey] = {
                    id: item.itemId,
                    mealType: item.mealType,
                    name: item.itemName,
                    itemDesc: item.itemDesc,
                    calories: item.quantity > 0 ? Math.round((parseInt(item.calories) || 0) / item.quantity) : 0,
                    price: parseFloat(item.price) || 0,
                    dietaryType: item.dietaryType || '',
                    qty: item.quantity
                };
                if (item.mealType.toLowerCase() === activeTabMealType.toLowerCase()) {
                    const sanitizedId = (item.itemId + "_" + item.mealType).replace(/\s+/g, '_');

                    if ($(`#add-btn-${sanitizedId}`).length) {
                        $(`#add-btn-${sanitizedId}`).hide();
                        $(`#qty-selector-${sanitizedId}`).css("display", "flex");
                        $(`#qty-count-${sanitizedId}`).text(item.quantity);
                    }
                }
            });
        }
        updateReviewBar();
    });
}

function changeQty(id, delta, specificMealType) {
    let mealType = specificMealType || $("#hdnMealType").val();
    const cartKey = id + "_" + mealType;
    const sanitizedId = (id + "_" + mealType).replace(/\s+/g, '_');

    if (!currentCart[cartKey]) return null;
    const itemName = currentCart[cartKey].name || "Item";
    let saveRequest;

    const baseCalories = parseInt(currentCart[cartKey].calories) || 0;

    currentCart[cartKey].qty += delta;

    if (currentCart[cartKey].qty <= 0) {
        saveRequest = $.post('/FoodDining/DeleteCartItem', {
            roomNo: getRoomBed(),
            itemId: id,
            mealType: mealType
        });

        $(`#card-${sanitizedId}`).fadeOut(300, function () { $(this).remove(); });
        $(`#qty-selector-${sanitizedId}`).hide();
        $(`#add-btn-${sanitizedId}`).show();

        delete currentCart[cartKey];
        const translatedName = i18n.t(itemName, itemName);
        showCancelToast(translatedName + " removed");

    } else {
        saveRequest = SaveCartToDatabase(currentCart[cartKey]);
        $(`#qty-count-${sanitizedId}`).text(currentCart[cartKey].qty);
        const c = currentCart[cartKey];
        if (c.price) {
            $(`#row-price-${sanitizedId}`).text('$' + (c.price * c.qty).toFixed(2));
        }
        if ($(`#cal-count-${sanitizedId}`).length) {
            const newTotalCals = baseCalories * currentCart[cartKey].qty;
            $(`#cal-count-${sanitizedId}`).text(newTotalCals);
        }
        const $groupCard = $(`#qty-count-${sanitizedId}`).closest('.review-meal-group-card');
        if ($groupCard.length > 0) {
            let groupTotal = 0;
            $groupCard.find('.qty-count-v2').each(function () {
                groupTotal += parseInt($(this).text()) || 0;
            });
            $groupCard.find('.meal-group-count').text(groupTotal + (groupTotal > 1 ? ' items' : ' item'));
        }
    }

    updateReviewBar();
    return saveRequest;
}

function SaveCartToDatabase(item) {
    const totalCalories = (parseInt(item.calories) || 0) * (parseInt(item.qty) || 0);
    const payload = {
        RoomNo: getRoomBed(),
        ItemId: item.id,
        ItemName: item.name,
        ItemDesc: item.itemDesc,
        Quantity: item.qty,
        OrderType: $("#hdnOrderType").val(),
        MealType: item.mealType,
        Calories: totalCalories,
        Price: item.price || 0,
        DietaryType: item.dietaryType || ''
    };

    return $.ajax({
        url: '/FoodDining/SaveCartItem',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    });
}
function getItemMeta(id) {
    try { return (JSON.parse(localStorage.getItem('MenuMeta') || '{}'))[String(id)] || {}; }
    catch (e) { return {}; }
}

function dietInfo(d) {
    d = (d || '').toLowerCase();
    if (d.includes('non')) return { cls: 'nonveg', label: 'NON-VEG', icon: 'fa-drumstick-bite' };
    if (d.includes('vegan')) return { cls: 'vegan', label: 'VEGAN', icon: 'fa-seedling' };
    return { cls: 'veg', label: 'VEG', icon: 'fa-leaf' };
}

function renderOrderSummary() {
    const isVisitor = isVisitorOrder();
    let count = 0, veg = 0, nonVeg = 0, total = 0;

    Object.values(currentCart || {}).forEach(it => {
        const q = parseInt(it.qty, 10) || 0;
        const p = parseFloat(it.price) || 0;
        count += q;
        total += p * q;
        if (dietInfo(it.dietaryType).cls === 'nonveg') nonVeg += q; else veg += q;
    });

    $("#sumItemCount").text(count);
    $("#sumVegCount").text(veg);
    $("#sumNonVegCount").text(nonVeg);

    if (isVisitor) {
        $("#sumSubtotal, #sumGrandTotal").text("$" + total.toFixed(2));
        $("#orderTotalCard .visitor-only").show();
    } else {
        $("#orderTotalCard .visitor-only").hide();
    }
    $("#orderTotalCard").toggle(count > 0);
}

function updateReviewBar() {
    let totalItems = 0;

    if (typeof currentCart !== 'undefined' && currentCart) {
        totalItems = Object.values(currentCart).reduce((sum, item) => {
            return sum + (parseInt(item.qty) || 0);
        }, 0);
    }

    if (typeof renderOrderSummary === 'function' && $("#orderTotalCard").length) renderOrderSummary();

    $("#total-cart-count").text(totalItems);
    $("#review-total-count").text(totalItems);

    const $floatingBar = $("#reviewOrderBar");
    if ($floatingBar.length > 0) {
        if (totalItems > 0 && !isOrderingDisabled) {
            $floatingBar.stop(true, true).fadeIn(300);
        } else {
            $floatingBar.stop(true, true).fadeOut(300);
        }
    }

    if ($("#reviewItemsList").length > 0) {
        const innerWrapper = $(".review-page-inner");

        if (totalItems > 0) {
            innerWrapper.removeClass("is-empty");
            $(".review-page-header, #dynamicHeaderArea, .order-info-summary, #reviewItemsList, #confirmOrderBar, .back-link").show();
            $("#emptyCartSection").hide();

            let note = localStorage.getItem("SpecialInstruction");
            if (note && note.trim() !== "") {
                $("#reviewSpecialInstructionBox").show();
            }
        } else {
            innerWrapper.addClass("is-empty");
            $(".review-page-header, #dynamicHeaderArea, .order-info-summary, #reviewItemsList, #confirmOrderBar, .special-instructions-box, .back-link").hide();
            $("#emptyCartSection").css("display", "flex").fadeIn();
        }
    }
}

function renderReviewItems() {
    const container = $("#reviewItemsList");
    const roomNo = getRoomBed();
    const mode = $("#hdnMealOrderType").val();

    if (!roomNo) return $.Deferred().reject(new Error("Room information is unavailable.")).promise();

    return $.ajax({
        url: '/FoodDining/GetCartItems',
        type: 'GET',
        data: { roomNo: roomNo },
        success: function (items) {
            if (items && items.length > 0) {
                currentCart = {};
                container.empty().show();
                $(".review-page-header, .order-info-summary, #confirmOrderBar").show();
                $("#emptyCartSection").hide();

                if (mode === "preorder") {
                    const groupedItems = items.reduce((acc, item) => {
                        const meal = item.mealType || "Other";
                        if (!acc[meal]) acc[meal] = [];
                        acc[meal].push(item);
                        return acc;
                    }, {});
                    for (const meal in groupedItems) {
                        const mealItems = groupedItems[meal];
                        const totalQtyInGroup = mealItems.reduce((sum, i) => sum + parseInt(i.quantity), 0);
                        let groupHtml = `
                            <div class="review-meal-group-card">
                                <div class="meal-group-header">
                                    <span class="meal-group-title">${i18n.t(meal, meal).toUpperCase()}</span>
                                    <span class="meal-group-count">${totalQtyInGroup} ${totalQtyInGroup > 1 ? 'items' : 'item'}</span>
                                </div>
                                <div class="meal-group-body">`;
                        mealItems.forEach(item => {
                            groupHtml += getCartItemRowHtml(item);
                        });

                        groupHtml += `</div></div>`;
                        container.append(groupHtml);
                    }
                }
                else {
                    items.forEach((item) => {
                        container.append(getCartItemRowHtml(item, true));
                    });
                }
                updateReviewBar();
            }
            else {
                showEmptyCartUI();
            }
        },
        error: function () {
            showEmptyCartUI();
        }
    });
}

function showEmptyCartUI() {
    currentCart = {};
    $(".review-page-header, #dynamicHeaderArea, .header-container-spacing, .order-info-summary, #reviewItemsList, .back-link, #confirmOrderBar, .special-instructions-box").hide();
    $("#emptyCartSection").css("display", "flex").fadeIn();

    updateReviewBar();
}

function isVisitorOrder() {
    const hdn = ($("#hdnOrderType").val() || '').toLowerCase();
    if (hdn) return hdn === 'visitor';
    return Object.values(currentCart || {}).some(i => (i.orderType || '').toLowerCase() === 'visitor');
}

function getCartItemRowHtml(item, isStandalone = false) {
    const cartKey = item.itemId + "_" + item.mealType;
    const sid = (item.itemId + "_" + item.mealType).replace(/\s+/g, '_');
    const meta = getItemMeta(item.itemId);

    const totalCal = parseInt(item.calories || item.Calories) || 0;
    const baseCal = totalCal > 0 ? Math.round(totalCal / item.quantity) : 0;
    const price = parseFloat(item.price) || 0;
    const dietType = item.dietaryType || '';
    const imgPath = meta.imagePath || '';

    currentCart[cartKey] = {
        id: item.itemId, mealType: item.mealType, name: item.itemName,
        itemDesc: item.itemDesc, calories: baseCal,
        price: price, dietaryType: dietType,
        orderType: item.orderType, qty: item.quantity
    };

    const isVisitor = (item.orderType || $("#hdnOrderType").val() || '').toLowerCase() === 'visitor';

    const hasPhoto = imgPath && !/defaultfood/i.test(imgPath);
    const img = hasPhoto ? imgPath : '/images/defaultfood.png';
    const d = dietInfo(dietType);

    const priceBlock = (isVisitor && price > 0) ? `
        <div class="rv-price">
            <span class="rv-unit">$${price.toFixed(2)} each</span>
            <span class="rv-line" id="row-price-${sid}">$${(price * item.quantity).toFixed(2)}</span>
        </div>` : '';

    return `
    <div class="rv-card" id="card-${sid}">
            <div class="rv-img ${hasPhoto ? 'has-photo' : 'no-photo'}">
                ${hasPhoto
                        ? `<img src="${img}" alt="" onerror="this.outerHTML='<i class=\\'fa-solid fa-utensils rv-ph\\'></i>'; " />`
                        : `<i class="fa-solid fa-utensils rv-ph"></i>`}
                <span class="rv-diet-dot ${d.cls}"><i class="fa-solid ${d.icon}"></i></span>
            </div>
            <div class="rv-body">
            <div class="rv-top">
                <h3 class="rv-title cart-item-title">${i18n.t(item.itemName, item.itemName)}</h3>
                <button class="rv-del" onclick="changeQty('${item.itemId}', -${item.quantity}, '${item.mealType}')">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </div>
            <p class="rv-desc">${item.itemDesc || ''}</p>
            <div class="rv-tags">
                <span class="diet-chip ${d.cls}">${d.label}</span>
                ${totalCal > 0 ? `<span class="rv-cal"><i class="fa-solid fa-fire"></i> <span id="cal-count-${sid}">${totalCal}</span> cal</span>` : ''}
            </div>
            <div class="rv-bottom">
                <div class="qty-selector-v2">
                    <button class="qty-btn-v2 minus" onclick="changeQty('${item.itemId}', -1, '${item.mealType}')">−</button>
                    <span class="qty-count-v2" id="qty-count-${sid}">${item.quantity}</span>
                    <button class="qty-btn-v2 plus" onclick="changeQty('${item.itemId}', 1, '${item.mealType}')">+</button>
                </div>
                ${priceBlock}
            </div>
        </div>
    </div>`;
}

function updateDynamicHeader() {
    const container = $("#dynamicHeaderArea");
    const orderType = $("#hdnOrderType").val();
    const mode = $("#hdnMealOrderType").val();
    const meal = $("#hdnMealType").val();
    const rawDate = $("#hdnOrderDate").val() || $("#hdnPreorderDate").val();
    let displayDate = new Date();

    if (rawDate && rawDate.trim() !== "") {
        const parsedDateStr = parseOrderDate(rawDate);
        if (parsedDateStr) {
            const parts = parsedDateStr.split('-');
            if (parts.length === 3) {
                displayDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            }
        }
    }

    const readableDate = formatReadableDate(displayDate);
    const modeText = (mode === "preorder") ? "Pre-order" : "Instant";

    let html = "";
    if (orderType === "visitor") {
        html = `
            <div class="visitor-header-row">
                <span class="badge-visitor-outline">
                    <i class="fa-solid fa-user-group"></i> Visitor Order
                </span>
                <span class="badge-visitor-outline">
                    ${modeText} for ${readableDate}
                </span>
            </div>`;
    } else {
        const patientName = sessionStorage.getItem("PatientName") || "Patient";
        const roomBed = getRoomBed() || "";
        const diet = sessionStorage.getItem("DietType") || "Regular Diet";

        html = `
            <div class="patient-header-container">

                <div class="header-line-1" style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 8px;">
                    <span class="badge-lavender-solid">${modeText} for ${readableDate}</span>
                    <span class="badge-green-solid"><i class="fa-solid fa-utensils"></i> ${diet}</span>
                </div>
                <div class="header-line-2">
                    <span class="details-text">For <strong>${patientName}</strong> in Room ${roomBed}</span>
                </div>
            </div>`;
    }
    if (container.length) {
        container.html(html);
    } else {
        $(".order-info-summary").html(html);
    }
}

function formatDate(date) {
    return String(date.getDate()).padStart(2, "0") + "-" +
        String(date.getMonth() + 1).padStart(2, "0") + "-" +
        date.getFullYear();
}

function formatIsoDate(date) {
    return date.getFullYear() + "-" +
        String(date.getMonth() + 1).padStart(2, "0") + "-" +
        String(date.getDate()).padStart(2, "0");
}
function formatReadableDate(date) {
    const options = {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
}

function parseOrderDate(value) {
    if (!value || !value.trim()) {
        return formatIsoDate(new Date());
    }

    value = value.trim();
    const dateOnly = value.split(/[T ]/)[0].trim();
    let match, year, month, day, date;

    match = dateOnly.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
    if (match) {
        year = parseInt(match[1]);
        month = parseInt(match[2]);
        day = parseInt(match[3]);
        date = new Date(year, month - 1, day);
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
            return formatIsoDate(date);
        }
    }

    match = dateOnly.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (match) {
        const first = parseInt(match[1]);
        const second = parseInt(match[2]);
        year = parseInt(match[3]);

        if (first > 12) {
            day = first;
            month = second;
        } else if (second > 12) {
            month = first;
            day = second;
        } else {
            day = first;
            month = second;
        }

        date = new Date(year, month - 1, day);
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
            return formatIsoDate(date);
        }
    }

    const parsedDate = new Date(value);
    if (!isNaN(parsedDate.getTime())) {
        return formatIsoDate(parsedDate);
    }

    return formatIsoDate(new Date());
}
function submitReviewWithAJAX(deferUnifiedActionResult) {
    if (window.__foodReviewPreparing) return;
    window.__foodReviewPreparing = true;
    var reviewData = {
        orderType: $("#hdnOrderType").val(),
        mode: $("#hdnMealOrderType").val(),
        meal: $("#hdnMealType").val(),
        orderdate: $("#hdnPreorderDate").val(),
        BedInfo: sessionStorage.getItem('bedInfo') || ''
    };
    $.ajax({
        url: '/FoodDining/PrepareReview',
        type: 'POST',
        data: reviewData,
        success: function (response) {
            if (response.success) {
                if (!deferUnifiedActionResult) finishUnifiedFoodAction(true, { reviewReady: true });
                window.location.href = preserveUnifiedAI(response.redirectUrl);
            } else {
                finishUnifiedFoodAction(false, null, "Could not prepare the order review.");
            }
        },
        error: function () {
            finishUnifiedFoodAction(false, null, "Could not prepare the order review.");
            alert("Error preparing order review.");
        },
        complete: function () {
            window.__foodReviewPreparing = false;
        }
    });
}

function submitFinalOrder() {
    if (window.__foodOrderSubmitting) return;
    if (!currentCart || !Object.keys(currentCart).some(function (key) {
        return Number(currentCart[key] && currentCart[key].qty) > 0;
    })) {
        finishUnifiedFoodAction(false, null, "The cart is empty.");
        return;
    }

    let roomNo = getRoomBed();
    let specialInstruction = localStorage.getItem("SpecialInstruction") || "";
    let mealType = $("#hdnMealType").val();
    let mode = $("#hdnMealOrderType").val();
    let rawDate = $("#hdnOrderDate").val();
    let orddate = "";
    orddate = parseOrderDate(rawDate);

    if (!orddate) {
        finishUnifiedFoodAction(false, null, "Invalid order date.");
        alert("Invalid order date.");
        return;
    }

    if (!roomNo) {
        finishUnifiedFoodAction(false, null, "Room information is missing.");
        alert("Room information missing. Please rescan your QR code.");
        return;
    }

    window.__foodOrderSubmitting = true;
    let isPreorder = (mode === "preorder") ? 1 : 0;
    let totalCalories = 0;
    if (typeof currentCart !== 'undefined' && currentCart) {
        Object.values(currentCart).forEach(item => {
            totalCalories += (parseInt(item.calories) || 0) * (parseInt(item.qty) || 0);
        });
    }
    $("#confirmOrderBar, #reviewOrderBar").find("button")
        .prop("disabled", true)
        .html('<i class="fa-solid fa-spinner fa-spin"></i> Processing...');

    $.ajax({
        url: "/FoodDining/SubmitOrder",
        type: "POST",
        data: {
            roomNo: roomNo,
            specialInstruction: specialInstruction,
            orddate: orddate,
            isPreorder: isPreorder,
            Calories: totalCalories
        },
        success: function (res) {
            window.__foodOrderSubmitting = false;
            if (res.success) {
                localStorage.removeItem("SpecialInstruction");
                localStorage.setItem("ShowOrderSuccessToast", "true");

                var bedInfo = sessionStorage.getItem('bedInfo') || '';
                var url = "/FoodDining/OrderSuccess?orderIds=" + res.orderIds + "&isPreorder=" + isPreorder;
                if (bedInfo) url += "&BedInfo=" + encodeURIComponent(bedInfo);

                finishUnifiedFoodAction(true, { orderIds: res.orderIds });
                window.location.href = preserveUnifiedAI(url);
            } else {
                $("#confirmOrderBar, #reviewOrderBar").find("button").prop("disabled", false);
                finishUnifiedFoodAction(false, null, res.message || "Order failed.");
                alert(res.message || "Order failed");
            }
        },
        error: function () {
            window.__foodOrderSubmitting = false;
            $("#confirmOrderBar, #reviewOrderBar").find("button").prop("disabled", false);
            finishUnifiedFoodAction(false, null, "Order submission failed.");
            alert("Order submission failed.");
        }
    });
}

function updateOrderUI(res) {
    if (!res || !res.status) return;

    const statusMap = {
        "Placed": 1, "Confirmed": 2, "Preparing": 3, "Ready": 4,
        "Assembling": 5, "Ready for Pickup": 5, "In-Transit": 6, "Delivered": 7
    };

    const currentStatus = res.status;
    const currentLevel = statusMap[currentStatus] || 1;
    const orderId = res.orderId;
    if (currentLevel >= 6) {
        checkOtp();
    }

    const liquidKeywords = ["Juice", "Broth", "Tea", "Soup", "Smoothie", "Milkshake", "Drink", "Water", "Coffee"];
    let hasSolid = false;

    $(".ordered-item-row .item-name").each(function () {
        let itemName = ($(this).attr('data-orig') || $(this).text()).toLowerCase();
        let matchesLiquid = liquidKeywords.some(k => itemName.includes(k.toLowerCase()));
        if (!matchesLiquid) hasSolid = true;
    });

    let calculatedBase = hasSolid ? 40 : 20;
    let dbManualTime = parseInt(res.estimatedTime || res.Estimatedtime || 0);
    let activeBase = dbManualTime > 0 ? dbManualTime : calculatedBase;

    let finalETA = 0;

    if (currentLevel <= 3) {
        finalETA = activeBase;
    }
    else if (currentLevel < 7) {
        const reductions = { 4: 0.40, 5: 0.25, 6: 0.12 };
        finalETA = Math.floor(activeBase * reductions[currentLevel]);
        if (finalETA < 2) finalETA = 2;
    }
    else {
        finalETA = 0;
    }

    let arrivalDate = new Date();
    arrivalDate.setMinutes(arrivalDate.getMinutes() + finalETA);

    let clockTimeStr = arrivalDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    updateHeaderDisplay(currentStatus, finalETA, clockTimeStr);

    if (currentStatus === "Delivered") {
        $("#eta-display").text("Enjoy your meal!");
    } else {
        $("#eta-display").text("Arriving in " + finalETA + " min (" + clockTimeStr + ")");
    }

    updateProgressTimeline(currentLevel, res.statusLogs, statusMap);
    if (currentStatus === "Delivered") {
        if ((res.rating == -1 || res.rating === null || res.rating === '') && selectedRatings[orderId] !== -1) {
            $("#rating-box-" + orderId).fadeIn();
        } else {
            $("#rating-box-" + orderId).hide();
        }
    }
    lastSyncTimestamp = new Date();
}

function updateHeaderDisplay(status, mins, clockTime) {
    let title = "";
    let icon = "";
    let cssClass = status.toLowerCase().replace("-", "");

    switch (status) {
        case "Placed": title = "Order Placed"; icon = "fa-check"; break;
        case "Preparing": title = "Preparing Your Meal"; icon = "fa-utensils"; break;
        case "In-Transit": title = "Your order is on the way!"; icon = "fa-truck-fast"; break;
        case "Delivered": title = "Your order has arrived!"; icon = "fa-house-chimney"; break;
        default: title = status; icon = "fa-check"; break;
    }

    $(".success-text-content h2").text(title);
    $(".success-check-icon").removeClass().addClass("success-check-icon " + cssClass);
    $(".success-check-icon i").removeClass().addClass("fa-solid " + icon);

    let etaElement = $("#eta-display");
    if (status === "Delivered") {
        etaElement.text("Enjoy your meal!");
    } else {
        etaElement.text(`Arriving in ${mins} min • ${clockTime}`);
    }
}

function updateProgressTimeline(currentLevel, statusLogs, statusMap) {
    $(".status-time").text("");
    var isFoodOrderingShown = window.isFoodOrderingShown === true;
    $(".progress-step").each(function (index) {
        let stepNumber = index + 1;
        let $step = $(this);
        let $header = $step.find("h4");
        $header.find(".now-badge").remove();
        $step.removeClass("active current");
        if ((stepNumber === 5 || stepNumber === 6) && !isFoodOrderingShown) {
            $step.hide();
            return;
        } else {
            $step.show();
        }
        if (stepNumber < currentLevel) {
            $step.addClass("active");
        } else if (stepNumber === currentLevel) {
            $step.addClass("active current");
            $header.append('<span class="now-badge">NOW</span>');
        }

        let $trackBtn = $step.find("#trackBtn");
        if ($trackBtn.length > 0) {
            if (stepNumber === 6 && stepNumber === currentLevel) {
                $trackBtn.show();
            } else {
                $trackBtn.hide();
            }
        }
    });

    if (statusLogs) {
        statusLogs.forEach(log => {
            let logStepIndex = statusMap[log.status];
            if (logStepIndex) {
                let rawTime = log.time;
                let englishTime = rawTime;

                if (rawTime) {
                    try {

                        let d = new Date("1970-01-01T" + rawTime.replace(" ", "T"));
                        if (isNaN(d.getTime())) {

                            let match = rawTime.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|பிற்பகல்|முற்பகல்)?/i);
                            if (match) {
                                let h = parseInt(match[1]);
                                let m = match[2];
                                let s = match[3] ? ":" + match[3] : "";
                                let ampm = match[4];

                                if (ampm === 'பிற்பகல்' || ampm === 'PM') ampm = 'PM';
                                if (ampm === 'முற்பகல்' || ampm === 'AM') ampm = 'AM';

                                englishTime = `${h.toString().padStart(2, '0')}:${m}${s} ${ampm || ''}`.trim();
                            }
                        } else {
                            englishTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
                        }
                    } catch (e) {
                        englishTime = rawTime;
                    }
                }

                $(".progress-step").eq(logStepIndex - 1).find(".status-time").text(englishTime);
            }
        });
    }
}
function calculateETA(level, base) {
    if (level <= 1) return base;
    if (level === 2) return base - 2;
    if (level === 3) return Math.round(base * 0.7);
    if (level === 4) return Math.round(base * 0.4);
    if (level === 5) return 10;
    if (level === 6) return 5;
    return 0;
}

function toggleCancelDisplay(orderId, state) {
    if (state === 'confirm') {
        $(`#initialView_${orderId}`).hide();
        $(`#confirmView_${orderId}`).fadeIn(250);
    } else {
        $(`#confirmView_${orderId}`).hide();
        $(`#initialView_${orderId}`).fadeIn(250);
    }
}

function processCancel(orderId, mealName) {
    const $btn = $(`#pre-confirm-${orderId} .btn-pill-red`);
    const originalHtml = $btn.html();
    $btn.html('<i class="fa-solid fa-spinner fa-spin"></i>').prop('disabled', true);

    $.ajax({
        url: '/FoodDining/CancelPreOrder',
        type: 'POST',
        data: { orderId: orderId },
        success: function (res) {
            if (res.success) {
                showCancelToast("Order cancelled successfully");
                $(`#header-right-${orderId}`).html('<span class="status-badge-cancelled">CANCELLED</span>');

                var b = sessionStorage.getItem('bedInfo') || '';
                $(`#action-area-${orderId}`).html(`
                    <button class="btn-view-details-full" 
                            onclick="navigateFoodPage('/FoodDining/OrderSuccess?orderIds=${orderId}&isPreorder=1${b ? '&BedInfo=' + encodeURIComponent(b) : ''}')">
                        View details
                    </button>
                `);
                window.location.reload();
            } else {
                alert("Error: " + res.message);
                $btn.html(originalHtml).prop('disabled', false);
            }
        },
        error: function () {
            $btn.html(originalHtml).prop('disabled', false);
        }
    });
}

function showCancelToast(message) {
    $("#toast-message-text").text(message);
    const $toast = $("#cancel-toast");
    $toast.stop(true, true).fadeIn(300);
    setTimeout(function () {
        $toast.fadeOut(400);
    }, 3000);
}

function loadOrdersDashboard(roomNo) {
    if (!roomNo) return;
    $("#preorderList").html('<div class="text-center p-3"><i class="fa-solid fa-spinner fa-spin"></i></div>');
    $("#recentOrdersList").html('<div class="text-center p-3"><i class="fa-solid fa-spinner fa-spin"></i></div>');

    $.ajax({
        url: '/FoodDining/GetMyOrdersDashboard',
        type: 'GET',
        data: { roomNo: roomNo },
        success: function (res) {
            $("#totalOrdersCount").text(res.summary?.totalOrders || 0);
            $("#activeOrdersCount").text(res.summary?.activeOrders || 0);
            $("#deliveredOrdersCount").text(res.summary?.deliveredOrders || 0);

            function getDynamicIcon(type) {
                var name = (type || "").toLowerCase();
                if (name.includes("serving 1") || name.includes("breakfast")) return "fa-mug-hot";
                if (name.includes("serving 2") || name.includes("lunch")) return "fa-utensils";
                if (name.includes("serving 3") || name.includes("dinner")) return "fa-moon";
                return "fa-bowl-food";
            }

            const mealDefs = res.servingTypes || [];
            var bedInfo = sessionStorage.getItem('bedInfo') || '';
            var bedQuery = bedInfo ? '&BedInfo=' + encodeURIComponent(bedInfo) : '';

            let tomorrowHtml = "";
            mealDefs.forEach(m => {
                let order = res.tomorrowOrders ? res.tomorrowOrders.find(o => o.mealType === m.type) : null;
                let iconClass = getDynamicIcon(m.type);

                if (order) {
                    const isCancelled = (order.status || "").toLowerCase() === "cancelled";
                    tomorrowHtml += `
    <div class="active-preorder-card" id="card-${order.orderId}">
        <div class="card-header-row">
            <div class="header-left">
                <div class="icon-circle-blue"><i class="fa-solid ${iconClass}"></i></div>
                <div class="header-titles">
                    <span class="meal-label-blue">${m.type.toUpperCase()}</span>
                    <span class="time-sub-label">Served ${m.time}</span>
                </div>
            </div>
            <div class="header-right" id="header-right-${order.orderId}">
                ${isCancelled ? `<span class="status-badge-cancelled">CANCELLED</span>` : `<small>ORDER</small><strong>${order.orderId}</strong>`}
            </div>
        </div>
        <div class="card-body-content">
            <div class="item-line">
                <i class="fa-regular fa-circle-check"></i>
                <span> ${order.itemsSummary}</span>
            </div>
            <div class="action-container" id="action-area-${order.orderId}">
                ${isCancelled ?
                            `<button class="btn-view-details-full" onclick="navigateFoodPage('/FoodDining/OrderSuccess?orderIds=${order.orderId}&isPreorder=1${bedQuery}')">View details</button>` :
                            `<div class="card-action-btns">
                        <button class="btn-outline-details" onclick="navigateFoodPage('/FoodDining/OrderSuccess?orderIds=${order.orderId}&isPreorder=1${bedQuery}')">View details</button>
                        <button class="btn-outline-cancel" onclick="togglePreConfirm('${order.orderId}', true)">Cancel</button>
                    </div>`
                        }
            </div>
        </div>
    </div>`;
                } else {
                    tomorrowHtml += `
                    <div class="meal-placeholder-card" onclick="navigateFoodPage('/FoodDining/PatientOrderMode?BedInfo=${encodeURIComponent(bedInfo)}')">
                        <div class="placeholder-icon-circle"><i class="fa-solid ${iconClass}"></i></div>
                        <div class="placeholder-content">
                            <strong>${m.type.toUpperCase()}</strong><span>${m.time}</span>
                            <div class="placeholder-action-text">+ Pre-order this meal</div>
                            <small>Tap to plan ahead for tomorrow.</small>
                        </div>
                    </div>`;
                }
            });
            $("#preorderList").html(tomorrowHtml);

            let recentHtml = "";

            let groupedOrders = new Map();

            if (res.recentOrders && res.recentOrders.length > 0) {
                res.recentOrders.forEach(item => {
                    if (!groupedOrders.has(item.orderId)) {
                        groupedOrders.set(item.orderId, {
                            orderId: item.orderId,
                            mealType: item.mealType,
                            orderType: item.orderType,
                            status: item.status,
                            orderDate: item.orderDate,
                            createdOn: item.createdOn,
                            specialInstruction: item.specialInstruction,
                            rating: item.rating,
                            acknowledgeRemarks: item.acknowledgeRemarks,
                            ackQtyRemarks: item.ackQtyRemarks,
                            items: []
                        });
                    }
                    groupedOrders.get(item.orderId).items.push({
                        quantity: item.quantity || 1,
                        itemName: item.itemName || "Unknown Item",
                        isDenied: item.isDenied,
                        deniedReason: item.deniedReason,
                        menuChanged: item.menuChanged,
                        menuChangeReason: item.menuChangeReason,
                        oldMenu: item.oldMenu || "",
                        status: item.status 
                    });
                });

                const ordersList = Array.from(groupedOrders.values());

                const groupedByDate = new Map();
                ordersList.forEach(order => {
                    const date = new Date(order.orderDate).toDateString();
                    if (!groupedByDate.has(date)) {
                        groupedByDate.set(date, []);
                    }
                    groupedByDate.get(date).push(order);
                });

                groupedByDate.forEach((orders, dateStr) => {
                    const dateObj = new Date(dateStr);
                    const isToday = dateObj.toDateString() === new Date().toDateString();
                    const displayDate = isToday ? "Today" : dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

                    recentHtml += `
                    <div class="history-date-header">
                        <i class="fa-regular fa-calendar"></i>
                        <span class="date-label">${displayDate}</span>
                        <span class="order-count">${orders.length} orders</span>
                    </div>`;

                    orders.forEach(order => {
                        let activeItems = [];
                        let deniedItems = [];
                        let altItems = [];

                        order.items.forEach(item => {
                            var isItemDenied = (item.isDenied === true || item.isDenied === 1 || item.isDenied === "1" || item.isDenied === "true");

                            if (isItemDenied) {
                                deniedItems.push(item);
                            } else if (item.menuChanged === true || item.menuChanged === 1 || item.menuChanged === "1" || item.menuChanged === "true") {
                                altItems.push(item);
                            } else {
                                activeItems.push(item);
                            }
                        });

                        const hasDeniedItems = deniedItems.length > 0;
                        const isDelivered = (order.status || "").toLowerCase() === "delivered";
                        const isActuallyCancelled = (order.status || "").toLowerCase() === "cancelled";

                        const ago = typeof timeAgo === 'function' ? timeAgo(order.createdOn) : "";
                        const isActuallyRated = (order.rating !== null && order.rating !== "" && order.rating !== undefined && order.rating != -1) || selectedRatings[order.orderId] === -1;

                        if (activeItems.length > 0 || altItems.length > 0) {

                            let activeCardStatus = "Placed";
                            if (isDelivered) activeCardStatus = "Delivered";
                            else if (isActuallyCancelled) activeCardStatus = "Cancelled";
                            else if (activeItems.length > 0) {

                                let activeItemStatus = (activeItems[0].status || "Placed").toLowerCase();
                                if (activeItemStatus === "denied") activeItemStatus = "placed";
                                activeCardStatus = activeItemStatus.charAt(0).toUpperCase() + activeItemStatus.slice(1);
                            }

                            let mainClassStatus = activeCardStatus.toLowerCase().replace(/\s+/g, '-');

                            let activeItemsStr = activeItems.map(item => `${item.quantity}x ${i18n.t(item.itemName, item.itemName)}`).join(' | ');
                            let activeItemsHtml = activeItems.length > 0 ? `
                                <div class="item-pill-container">
                                    <span class="grey-item-pill">${activeItemsStr}</span>
                                </div>` : '';

                            let altItemsHtml = "";
                            if (altItems.length > 0) {
                                let altHtmlList = altItems.map(item => {
                                    let oldMenu = item.oldMenu || "Original Item";
                                    return `<div style="margin-bottom: 4px; font-size: 13px;">
                                        <i class="fa-solid fa-arrow-right-arrow-left" style="font-size:10px; margin-right:6px; opacity:0.6;"></i>
                                        <span style="text-decoration: line-through; color:#94a3b8; margin-right:6px;">${item.quantity}x ${oldMenu}</span>
                                        <span style="font-weight:700;">${item.quantity}x ${i18n.t(item.itemName, item.itemName)}</span>
                                        ${item.menuChangeReason ? `<span style="font-size:11px; color:#6d28d9; display:block; margin-left:18px; margin-top:2px;">Reason: ${item.menuChangeReason}</span>` : ''}
                                    </div>`;
                                }).join('');

                                altItemsHtml = `
                                    <div class="item-pill-container" style="margin-top: 8px;">
                                        <span class="grey-item-pill" style="background: #f5f3ff; border-color: #ddd6fe; color: #6d28d9; display: block; padding: 10px; line-height:1.5;">
                                            ${altHtmlList}
                                        </span>
                                    </div>`;
                            }

                            let trackButtonHtml = (!isDelivered && !isActuallyCancelled)
                                ? `<button class="btn-track-modern" onclick="navigateFoodPage('/FoodDining/OrderSuccess?orderIds=${order.orderId}${bedQuery}')">
                                       <i class="fa-solid fa-stopwatch"></i> Track
                                   </button>`
                                : (isDelivered && isActuallyRated
                                    ? `<div class="submitted-rating">${getRatingStars(order.rating)}</div>`
                                    : "");

                            recentHtml += `
                                <div class="tracking-order-card ${mainClassStatus}" id="card-${order.orderId}">
                                    <div class="card-header-flex">
                                        <div class="header-left-group">
                                            <div class="status-icon-box ${mainClassStatus}">
                                                <i class="fa-solid ${isActuallyCancelled ? 'fa-xmark' : (isDelivered ? 'fa-check' : 'fa-clock')}"></i>
                                            </div>
                                            <div class="header-text-details">
                                                <div class="title-badge-inline">
                                                    <h4 class="meal-type-title">${order.mealType}</h4>
                                                    <span class="badge-patient-visitor ${order.orderType?.toLowerCase()}">
                                                        <i class="fa-solid fa-bolt"></i> ${order.orderType || "Patient"}
                                                    </span>
                                                </div>
                                                <div class="status-track-row">
                                                    <div class="status-pill-small ${mainClassStatus}">${activeCardStatus}</div>
                                                    ${trackButtonHtml}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="card-body-summary">
                                        ${activeItemsHtml}
                                        ${altItemsHtml}
                                        
                                        ${order.specialInstruction ? `<div class="special-instr-quote">"${order.specialInstruction}"</div>` : ""}
                                        
                                        <div class="feedback-remarks-container" style="margin-top: 10px;">
                                            ${order.acknowledgeRemarks ? `<div class="admin-feedback-note"><i class="fa-solid fa-comment-dots"></i> <strong>Kitchen Acknowledge Feedback:</strong> ${order.acknowledgeRemarks}</div>` : ""}
                                            ${order.ackQtyRemarks ? `<div class="admin-feedback-note"><i class="fa-solid fa-medal"></i> <strong>Quality Acknowledge Feedback:</strong> ${order.ackQtyRemarks}</div>` : ""}
                                        </div>
                                    </div>

                                    <div class="card-footer-meta">
                                        <i class="fa-regular fa-clock"></i> Placed ${ago} • <strong>${order.orderId}</strong>
                                    </div>

                                    ${(!isDelivered && !isActuallyCancelled) ? `<div class="segmented-progress-v2">${getSegments(activeCardStatus)}</div>` : ''}

                                    ${(isDelivered && !isActuallyRated) ? `
                                        <div class="rate-meal-footer" id="rate-trigger-${order.orderId}" onclick="toggleRatingBox('${order.orderId}')">
                                            <button class="btn-rate-action"><i class="fa-regular fa-star"></i> Rate this meal</button>
                                        </div>` : ''}
                                </div>`;
                        }

                        if (hasDeniedItems) {
                            let deniedHtmlList = deniedItems.map(item => {
                                return `<div style="margin-bottom: 4px; font-size: 13px;">
                                    <span style="text-decoration: line-through; font-weight:700;">${item.quantity}x ${i18n.t(item.itemName, item.itemName)}</span>
                                    <span style="font-size: 11px; display:block; margin-top:2px;">Reason: ${item.deniedReason || 'Not specified'}</span>
                                </div>`;
                            }).join('');

                            recentHtml += `
                                <div class="tracking-order-card cancelled" id="card-denied-${order.orderId}" style="margin-top: 12px;">
                                    <div class="card-header-flex">
                                        <div class="header-left-group">
                                            <div class="status-icon-box cancelled">
                                                <i class="fa-solid fa-xmark"></i>
                                            </div>
                                            <div class="header-text-details">
                                                <div class="title-badge-inline">
                                                    <h4 class="meal-type-title">${order.mealType}</h4>
                                                    <span class="badge-patient-visitor ${order.orderType?.toLowerCase()}">
                                                        <i class="fa-solid fa-bolt"></i> ${order.orderType || "Patient"}
                                                    </span>
                                                </div>
                                                <div class="status-track-row">
                                                    <div class="status-pill-small cancelled">Denied</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="card-body-summary">
                                        <div class="item-pill-container" style="margin-top: 8px;">
                                            <span class="grey-item-pill" style="background: #fef2f2; border-color: #fecaca; color: #b91c1c; display: block; padding: 10px; line-height:1.5;">
                                                <div style="margin-bottom:6px;"><i class="fa-solid fa-ban"></i> Denied Items</div>
                                                ${deniedHtmlList}
                                            </span>
                                        </div>
                                    </div>

                                    <div class="card-footer-meta">
                                        <i class="fa-regular fa-clock"></i> Placed ${ago} • <strong>${order.orderId}</strong>
                                    </div>
                                </div>`;
                        }
                    });
                });
            } else {
                recentHtml = '<div class="text-center p-5 text-muted">No recent orders found.</div>';
            }
            $("#recentOrdersList").html(recentHtml);
        }
    });
}

function getRatingStars(rating) {
    if (rating === null || rating === undefined || rating === "") return "";

    let visualCount = 0;
    if (rating == 0) visualCount = 1;
    else if (rating == 1) visualCount = 3;
    else if (rating == 2) visualCount = 5;

    let html = '<div class="submitted-rating">';
    for (let i = 1; i <= 5; i++) {
        html += `<i class="fa-solid fa-star ${i <= visualCount ? 'filled' : ''}"></i>`;
    }
    html += '</div>';
    return html;
}

function timeAgo(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    return Math.floor(hours / 24) + 'd ago';
}

function getSegments(status) {
    const s = status ? status.toLowerCase() : "";
    let currentLevel = 0;
    if (s === "placed") {
        currentLevel = 1;
    }
    else if (s === "confirmed" || s === "preparing") {
        currentLevel = 2;
    }
    else if (s === "ready" || s === "cooked") {
        currentLevel = 3;
    }
    else if (s === "in-transit" || s.includes("transit") || s.includes("delivery") || s.includes("assembling") || s.includes("ready for pickup")) {
        currentLevel = 4;
    }
    else if (s === "delivered") {
        currentLevel = 5;
    }
    else if (s === "cancelled") {
        currentLevel = 0;
    }

    let html = "";
    for (let i = 1; i <= 5; i++) {
        html += `<div class="seg ${i <= currentLevel ? 'active' : ''}"></div>`;
    }
    return html;
}

function togglePreConfirm(orderId, show) {
    if (show) {
        $(`#pre-actions-${orderId}`).hide();
        $(`#pre-confirm-${orderId}`).stop(true, true).fadeIn(200);
    } else {
        $(`#pre-confirm-${orderId}`).hide();
        $(`#pre-actions-${orderId}`).stop(true, true).fadeIn(200);
    }
}

function toggleRatingBox(orderId) {
    $(`#rate-trigger-${orderId}`).toggle();
    $(`#rating-box-${orderId}`).slideToggle();
}

var selectedRatings = {};

function selectOption(orderId, val, btn) {
    $(`#options-${orderId} .rating-opt-btn`).removeClass('active');
    $(btn).addClass('active');
    selectedRatings[orderId] = val;
    $(`#btn-submit-${orderId}`).removeClass('muted').addClass('active-blue').prop('disabled', false);
}

function submitRating(orderId) {
    const rating = selectedRatings[orderId];
    const feedback = $("#comment-" + orderId).val().trim();
    if (rating === undefined || rating === null) {
        alert("Please select a rating.");
        return;
    }

    $.ajax({
        url: "/FoodDining/SubmitRating",
        type: "POST",
        data: {
            orderId: orderId,
            rating: rating,
            feedback: feedback
        },
        beforeSend: function () {
            $("#btn-submit-" + orderId)
                .prop("disabled", true)
                .removeClass("active-blue")
                .addClass("muted")
                .html('<i class="fa-solid fa-spinner fa-spin"></i> Submitting...');
        },
        success: function (res) {
            if (res.result === "TRUE" || res.result === "true" || res.success === true) {
                showCancelToast("Thank you for your feedback.");
                selectedRatings[orderId] = -1;
                $("#rating-box-" + orderId).stop().slideUp(400, function () {
                    $(this).remove();
                });

                $("#rate-trigger-" + orderId).hide();
                $(`#card-${orderId} .rate-meal-footer`).hide();
                $(`#card-${orderId} .segmented-progress-v2`).hide();
                if (typeof getRatingStars === "function") {
                    const starsHtml = getRatingStars(rating);
                    $(`#card-${orderId} .header-right-action`).html(starsHtml);
                }

                if (typeof refreshOrder === "function") {
                    refreshOrder();
                }
            } else {
                alert("Failed to submit feedback: " + (res.message || "Unknown error"));
                resetSubmitButton(orderId);
            }
        },
        error: function () {
            alert("Connection error. Feedback was not saved.");
            resetSubmitButton(orderId);
        }
    });
}

function resetSubmitButton(orderId) {
    $("#btn-submit-" + orderId).prop("disabled", false).removeClass("muted").addClass("active-blue").html('<i class="fa-solid fa-paper-plane"></i> Submit Feedback');
}

var otpIsActive = false;

function checkOtp() {
    var orderId = window.orderId;
    if (!orderId) return;
    $.ajax({
        url: '/FoodDining/CheckOrderOtp',
        type: 'GET',
        data: { orderId: orderId },
        success: function (res) {
            if (res.success && res.hasOtp === true && res.otp && res.otp !== "0000" && res.otp.trim() !== "") {
                $("#otpNumber").text(res.otp);

                if (!otpIsActive) {
                    $("#otpModal").css("display", "flex").hide().fadeIn(200);
                    otpIsActive = true;
                }
            } else {
                if (otpIsActive) {
                    $("#otpModal").fadeOut(200);
                    otpIsActive = false;
                }
            }
        },
        error: function (err) {
            console.log("OTP Ajax Error:", err);
        }
    });
}

$(document).on('click', '#confirmOtpBtn', function () {
    var orderId = window.orderId;
    $("#otpModal").fadeOut(200);
    otpIsActive = false;
    sessionStorage.setItem("otp_dismissed_" + orderId, "true");
});

function RemoveDefaultPreference(itemId) {
    const mealType = $("#hdnMealType").val();
    const roomNo = getRoomBed();
    if (!confirm("Are you sure you want to remove this default selection?")) return;

    $.ajax({
        url: '/FoodDining/UpdateDefaultFoodStatus',
        type: 'POST',
        data: {
            roomNo: roomNo,
            itemId: itemId,
            mealType: mealType
        },
        success: function (res) {
            if (res.success) {
                showCancelToast("Preference updated.");
                $(".todays-food-container").fadeOut(400, function () {
                    $(this).remove();
                });
            } else {
                alert("Error: " + res.message);
            }
        },
        error: function () {
            alert("Ajax Error while updating status.");
        }
    });
}

(function () {
    function bindNav() {
        var curpage = window.location.pathname.split("/").filter(Boolean).pop();

        document.querySelectorAll(".navBtn").forEach(function (button) {
            if (button.dataset.bound === "1") return;
            button.dataset.bound = "1";

            if (button.dataset.page === curpage)
                button.classList.add("active");

            button.addEventListener("click", function (e) {
                e.preventDefault();
                var page = this.getAttribute("data-page");
                if (!page) return;

                var bedInfo = sessionStorage.getItem('bedInfo') || '';
                if (!bedInfo) return;

                var base = (page === 'FoodDining') ? '/FoodDining/FoodDining' : '/' + page;
                navigateFoodPage(base + '?BedInfo=' + encodeURIComponent(bedInfo));
            });
        });
    }

    if (document.readyState === "loading")
        document.addEventListener("DOMContentLoaded", bindNav);
    else
        bindNav();
})();

(function () {
    'use strict';
    if (window.__i18nInitialized) return;
    window.__i18nInitialized = true;

    const wrapper = document.querySelector('[data-locale-base]');
    const LOCALE_BASE = wrapper ? wrapper.getAttribute('data-locale-base') : '/locales/';

    window.LANGUAGES = [];
    window.RTL_LANGS = [];

    function langKey() {
        let id = '';
        try {
            const bc = (window.BedContext && BedContext.get) ? BedContext.get() : {};
            id = bc.bedId || bc.roomBed || bc.roomNumber || '';
        } catch (e) { }
        id = id || sessionStorage.getItem('RoomBed') || sessionStorage.getItem('bedInfo') || 'default';
        return 'menuLang_' + id;
    }

    function getSavedLang() {
        return sessionStorage.getItem(langKey()) || sessionStorage.getItem('menuLang_selected') || 'en';
    }

    function saveLang(lang) {
        sessionStorage.setItem(langKey(), lang);
        sessionStorage.setItem('menuLang_selected', lang);
    }

    window.i18n = {
        current: 'en',
        dict: {},
        cache: {},
        async load(lang) {
            if (this.cache[lang]) return this.cache[lang];
            try {
                const res = await fetch(`${LOCALE_BASE}${lang}.json`, { cache: 'force-cache' });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                this.cache[lang] = await res.json();
            } catch (e) {
                console.warn('[i18n] Load failed for', lang, e);
                return null;
            }
            return this.cache[lang];
        },
        t(key, fallback) {
            if (!key) return fallback || '';
            return this.dict[key] || fallback || key;
        }
    };

    async function loadManifest() {
        try {
            const res = await fetch(`${LOCALE_BASE}languages.json`, { cache: 'force-cache' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const list = await res.json();
            window.LANGUAGES = list.map(l => ({ code: l.code, label: l.label }));
            window.RTL_LANGS = list.filter(l => l.rtl === true).map(l => l.code);
        } catch (e) {
            console.warn('[i18n] Manifest load failed', e);
            window.LANGUAGES = [{ code: 'en', label: 'English' }];
            window.RTL_LANGS = [];
        }
    }

    function buildLanguageDropdown() {
        const sel = document.getElementById('languageSelector');
        if (!sel) return;
        sel.innerHTML = window.LANGUAGES.map(l => `<option value="${l.code}">${l.label}</option>`).join('');
    }

    function applyLanguageDirection(lang) {
        document.documentElement.lang = lang;
        document.documentElement.dir = window.RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
    }

    async function bootstrapI18n() {
        const saved = getSavedLang();

        await Promise.all([loadManifest(), i18n.load(saved)]);
        buildLanguageDropdown();

        const applied = i18n.cache[saved] ? saved : 'en';
        if (!i18n.cache[applied]) await i18n.load('en');

        i18n.current = applied;
        i18n.dict = i18n.cache[applied] || {};
        applyLanguageDirection(applied);

        const sel = document.getElementById('languageSelector');
        if (sel) sel.value = applied;

        document.dispatchEvent(new Event('languageChanged'));

        setTimeout(function () {
            window.LANGUAGES.forEach(l => { if (!i18n.cache[l.code]) i18n.load(l.code); });
        }, 3000);
    }

    window.changeMenuLanguage = async function (lang) {
        if (!i18n.cache[lang]) await i18n.load(lang);
        if (!i18n.cache[lang]) return;

        i18n.current = lang;
        i18n.dict = i18n.cache[lang];
        saveLang(lang);
        applyLanguageDirection(lang);

        if (typeof LoadMenuDetails === 'function') LoadMenuDetails();
        if (typeof renderReviewItems === 'function') renderReviewItems();

        const mode = document.getElementById('hdnMealOrderType')?.value;
        if (mode === 'preorder' && typeof renderPreorderTabs === 'function') renderPreorderTabs();
        else if (typeof renderInstantPills === 'function') renderInstantPills();

        if (typeof applyMealLogic === 'function') applyMealLogic();
        if (typeof updateDynamicHeader === 'function') updateDynamicHeader();

        const roomNo = typeof getRoomBed === 'function' ? getRoomBed() : '';
        if (roomNo && typeof loadOrdersDashboard === 'function' && document.getElementById('recentOrdersList')) {
            loadOrdersDashboard(roomNo);
        }

        const currentMeal = document.getElementById('hdnMealType')?.value;
        const lbl = document.getElementById('currentMealLabel');
        if (currentMeal && lbl) lbl.textContent = `Showing ${i18n.t(currentMeal, currentMeal).toLowerCase()} menu`;

        document.dispatchEvent(new Event('languageChanged'));
    };

    window.i18nReady = bootstrapI18n();
})();