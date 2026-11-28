var urlParams = new URLSearchParams(window.location.search);

window.CLIENT_CONFIG = {
    backendUrl: "http://localhost:8000",
    defaultUserId: (window.BedContext && BedContext.get().bedId) || "",
    defaultLanguage: "English",
    defaultDialect: "United States"
};