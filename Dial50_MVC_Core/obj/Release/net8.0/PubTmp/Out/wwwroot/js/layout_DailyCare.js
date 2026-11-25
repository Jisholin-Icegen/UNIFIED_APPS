document.addEventListener("DOMContentLoaded", function () {
    setTimeout(setActiveNav, 200);
    setTimeout(updateTime, 200);
    bindNav();
});

function loadComponent(id, file) {
    fetch(file)
        .then(res => res.text())
        .then(data => {
            if (document.getElementById(id) != null)
                document.getElementById(id).innerHTML = data;
        });
}

function bindNav() {
    document.querySelectorAll(".parent-nav .navBtn").forEach(function (btn) {
        if (btn.dataset.bound === "1") return;
        btn.dataset.bound = "1";

        btn.addEventListener("click", function (e) {
            e.preventDefault();

            var page = this.dataset.page;
            if (!page) return;

            var bedInfo = sessionStorage.getItem("bedInfo") || "";
            if (!bedInfo) {
                window.location.href = "/Home";
                return;
            }

            var params = new URLSearchParams(window.location.search);
            if ((params.get("UnifiedAI") === "1" || params.get("Unified") === "1")
                && window.BedContext && typeof window.BedContext.go === "function") {
                window.BedContext.go(page === "FoodDining" ? "FoodDining/FoodDining" : page);
                return;
            }

            var base = (page === "FoodDining")
                ? "/FoodDining/FoodDining"
                : "/" + page;

            window.location.href = base + "?BedInfo=" + encodeURIComponent(bedInfo);
        });
    });
}

function setActiveNav() {
    var segs = window.location.pathname.split("/").filter(Boolean);
    var page = segs[0] || "Home";

    document.querySelectorAll(".parent-nav .navBtn").forEach(function (btn) {
        btn.classList.toggle("active", btn.dataset.page === page);
    });
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

function GoToAI() {
    if (window.parent !== window) {
        window.parent.postMessage({ type: "unified_ai_show_chat" }, window.location.origin);
        return;
    }

    if (/^\/home(?:\/index)?\/?$/i.test(window.location.pathname)) {
        var startButton = document.getElementById("idleBtn");
        if (startButton) startButton.click();
        return;
    }

    if (window.BedContext && typeof window.BedContext.url === "function") {
        window.location.href = window.BedContext.url("AI/Chat");
        return;
    }

    var bedInfo = sessionStorage.getItem("bedInfo") || "";
    var url = "/AI/Chat";
    if (bedInfo) url += "?BedInfo=" + encodeURIComponent(bedInfo);
    window.location.href = url;
}

function getFormattedDateTime(date = new Date()) {
    const optionsDate = {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    };

    const optionsTime = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };

    //const formattedDate = date.toLocaleDateString('en-US', optionsDate);
    //const formattedTime = date.toLocaleTimeString('en-US', optionsTime);

    const formattedDate = date.toLocaleDateString((window.I18N ? I18N.locale() : 'en-US'), optionsDate);
    const formattedTime = date.toLocaleTimeString((window.I18N ? I18N.locale() : 'en-US'), optionsTime);
    return `${formattedDate} ${formattedTime}`;
}

function setNavigation(bedSessions) {

}