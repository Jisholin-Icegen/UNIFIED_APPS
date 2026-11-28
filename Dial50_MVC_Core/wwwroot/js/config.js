var urlParams = new URLSearchParams(window.location.search);

window.CLIENT_CONFIG = {
    backendUrl: "http://0.0.0.0:8000",
    defaultUserId: (window.BedContext && BedContext.get().bedId) || "",
    defaultLanguage: "English",
    defaultDialect: "United States"
};