(function () {
    "use strict";

    var old = document.getElementById("unifiedVoiceNav");
    if (old && old.parentNode) old.parentNode.removeChild(old);

    try { sessionStorage.removeItem("unifiedVoiceNavOn"); } catch (e) {  }

    window.UnifiedVoiceNav = {
        start: function () { return false; },
        stop: function () { },
        isListening: function () { return false; },
        handleText: function () { }
    };
})();