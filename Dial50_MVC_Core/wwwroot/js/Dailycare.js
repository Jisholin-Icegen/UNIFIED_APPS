//const data = [
//    {
//        title: "My Library",
//        description: "Educational resources for you",
//        icon: "/images/ChildIcons/mdc_c.png",
//        onclick_URL: "/MyLibrary/Index?BedInfo="
//    },
//    {
//        title: "Medications",
//        description: "View your daily medication schedule",
//        icon: "/images/ChildIcons/mdc_a.png",
//        onclick_URL: "/Medication/Index?BedInfo="
//    },
//    {
//        title: "Appointments",
//        description: "Check upcoming doctors visits",
//        icon: "/images/ChildIcons/mdc_b.png",
//        onclick_URL: "/Appointments/Index?BedInfo="
//    },
//    {
//        title: "Discharge",
//        description: "Track your discharge progress",
//        icon: "/images/ChildIcons/mdc_d.png",
//        onclick_URL: "/Discharge/Index?BedInfo="
//    }
//];

//document.addEventListener("DOMContentLoaded", function () {

//    const container = document.getElementById("pageContent");
//    if (!container) return;
//    const params = new URLSearchParams(window.location.search);
//    const unifiedAI = !!window.UnifiedAIChild
//        || params.get("UnifiedAI") === "1"
//        || params.get("Unified") === "1";
//    const bedInfo = sessionStorage.getItem("bedInfo")
//        || new URLSearchParams(window.location.search).get("BedInfo")
//        || "";

//    function openDailyCareItem(item) {
//        const page = item.onclick_URL.split("?")[0].replace(/^\/+/, "");
//        if (unifiedAI && window.UnifiedAIChild) {
//            window.UnifiedAIChild.navigate(window.BedContext && window.BedContext.url
//                ? window.BedContext.url(page)
//                : item.onclick_URL + encodeURIComponent(bedInfo));
//            return;
//        }
//        if (unifiedAI) {
//            const target = new URL(window.BedContext && window.BedContext.url
//                ? window.BedContext.url(page)
//                : item.onclick_URL + encodeURIComponent(bedInfo), window.location.origin);
//            target.searchParams.set("Unified", "1");
//            target.searchParams.set("UnifiedAI", "1");
//            window.location.href = target.toString();
//            return;
//        }
//        if (window.BedContext && typeof window.BedContext.go === "function") {
//            window.BedContext.go(page);
//            return;
//        }
//        window.location.href = item.onclick_URL + encodeURIComponent(bedInfo);
//    }

//    container.innerHTML = "";

//    data.forEach(function (item) {
//        const card = document.createElement("div");
//        const isAvailable = item.title === "My Library";
//        card.className = isAvailable ? "card focused" : "card faded";
//        card.dataset.route = item.onclick_URL.split("?")[0];
//        card.dataset.voiceRoute = card.dataset.route;
//        if (!isAvailable) card.setAttribute("aria-disabled", "true");
//        card.innerHTML = `
//            <div class="icon-box">
//                <img src="${item.icon}" alt="${item.title}">
//            </div>
//            <h3>${item.title}</h3>
//            <p>${item.description}</p>
//        `;
//        if (isAvailable) {
//            card.addEventListener("click", function () {
//                if (unifiedAI && !window.UnifiedAIChild) openDailyCareItem(item);
//                else GoToChat();
//            });
//        }
//        container.appendChild(card);
//    });
//});

//function GoToChat() {
//    if (window.UnifiedAIChild) {
//        window.UnifiedAIChild.showChat();
//        return;
//    }
//    var overlay = document.getElementById('chatConfirmOverlay');
//    if (overlay) overlay.classList.add('show');
//}

//function closeChatConfirm() {
//    var overlay = document.getElementById('chatConfirmOverlay');
//    if (overlay) overlay.classList.remove('show');
//}

//function confirmGoToChat() {
//    closeChatConfirm();

//    var urlParams = new URLSearchParams(window.location.search);

//    var bedInfoEncrypt = sessionStorage.getItem('bedInfo')
//        || urlParams.get('BedInfo')
//        || '';

//    if (!bedInfoEncrypt) {
//        alert('Session expired. Please log in again.');
//        return;
//    }

//    if (typeof window.connectToAvatarBackend !== 'function') {
//        console.warn('[DailyCare] video-script.js not loaded — cannot start video call');
//        return;
//    }

//    if (typeof window.setState === 'function') {
//        window.setState('connecting');
//    } else {
//        document.body.setAttribute('data-state', 'connecting');
//    }

//    if (typeof window.setCallStatus === 'function') {
//        window.setCallStatus('dialing');
//    }

//    window.connectToAvatarBackend();
//}

const data = [
    {
        title: "My Library",
        description: "Educational resources for you",
        icon: "/images/ChildIcons/mdc_c.png",
        onclick_URL: "/MyLibrary/Index?BedInfo="
    },
    {
        title: "Medications",
        description: "View your daily medication schedule",
        icon: "/images/ChildIcons/mdc_a.png",
        onclick_URL: "/Medication/Index?BedInfo="
    },
    {
        title: "Appointments",
        description: "Check upcoming doctors visits",
        icon: "/images/ChildIcons/mdc_b.png",
        onclick_URL: "/Appointments/Index?BedInfo="
    },
    {
        title: "Discharge",
        description: "Track your discharge progress",
        icon: "/images/ChildIcons/mdc_d.png",
        onclick_URL: "/Discharge/Index?BedInfo="
    }
];

document.addEventListener("DOMContentLoaded", function () {

    const container = document.getElementById("pageContent");
    if (!container) return;
    const params = new URLSearchParams(window.location.search);
    const unifiedAI = !!window.UnifiedAIChild
        || params.get("UnifiedAI") === "1"
        || params.get("Unified") === "1";
    const bedInfo = sessionStorage.getItem("bedInfo")
        || params.get("BedInfo")
        || "";

    function openDailyCareItem(item) {
        const page = item.onclick_URL.split("?")[0].replace(/^\/+/, "");
        if (unifiedAI && window.UnifiedAIChild && typeof window.UnifiedAIChild.navigate === "function") {
            window.UnifiedAIChild.navigate(window.BedContext && window.BedContext.url
                ? window.BedContext.url(page)
                : item.onclick_URL + encodeURIComponent(bedInfo));
            return;
        }
        if (unifiedAI) {
            const target = new URL(window.BedContext && window.BedContext.url
                ? window.BedContext.url(page)
                : item.onclick_URL + encodeURIComponent(bedInfo), window.location.origin);
            target.searchParams.set("Unified", "1");
            target.searchParams.set("UnifiedAI", "1");
            window.location.href = target.toString();
            return;
        }
        if (window.BedContext && typeof window.BedContext.go === "function") {
            window.BedContext.go(page);
            return;
        }
        window.location.href = item.onclick_URL + encodeURIComponent(bedInfo);
    }

    container.innerHTML = "";

    data.forEach(function (item) {
        const card = document.createElement("div");
        const isAvailable = item.title === "My Library";
        card.className = isAvailable ? "card focused" : "card faded";
        card.dataset.route = item.onclick_URL.split("?")[0];
        card.dataset.voiceRoute = card.dataset.route;
        if (!isAvailable) card.setAttribute("aria-disabled", "true");
        card.innerHTML = `
            <div class="icon-box">
                <img src="${item.icon}" alt="${item.title}">
            </div>
            <h3>${item.title}</h3>
            <p>${item.description}</p>
        `;
        if (isAvailable) {
            card.addEventListener("click", function () {
                openDailyCareItem(item);
            });
        }
        container.appendChild(card);
    });
});

function GoToChat() {
    if (window.UnifiedAIChild) {
        window.UnifiedAIChild.showChat();
        return;
    }
    var overlay = document.getElementById('chatConfirmOverlay');
    if (overlay) overlay.classList.add('show');
}

function closeChatConfirm() {
    var overlay = document.getElementById('chatConfirmOverlay');
    if (overlay) overlay.classList.remove('show');
}

function confirmGoToChat() {
    closeChatConfirm();

    var urlParams = new URLSearchParams(window.location.search);

    var bedInfoEncrypt = sessionStorage.getItem('bedInfo')
        || urlParams.get('BedInfo')
        || '';

    if (!bedInfoEncrypt) {
        alert('Session expired. Please log in again.');
        return;
    }

    if (typeof window.connectToAvatarBackend !== 'function') {
        console.warn('[DailyCare] video-script.js not loaded — cannot start video call');
        return;
    }

    if (typeof window.setState === 'function') {
        window.setState('connecting');
    } else {
        document.body.setAttribute('data-state', 'connecting');
    }

    if (typeof window.setCallStatus === 'function') {
        window.setCallStatus('dialing');
    }

    window.connectToAvatarBackend();
}