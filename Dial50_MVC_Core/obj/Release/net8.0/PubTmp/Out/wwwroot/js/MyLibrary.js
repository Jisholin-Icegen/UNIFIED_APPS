(function () {
    var PAGE_SIZE = 10;
    var visibleCount = PAGE_SIZE;
    var activeCategory = "ALL";
    var searchQuery = "";
    var previewObserver = null;

    function formatDuration(seconds) {
        if (!isFinite(seconds) || seconds <= 0) return "VIDEO";
        var total = Math.round(seconds);
        var mins = Math.floor(total / 60);
        var secs = total % 60;
        if (mins >= 1 && secs === 0) return mins + " min";
        return mins + ":" + (secs < 10 ? "0" + secs : secs);
    }

    function convertToEmbedUrl(url) {
        if (!url) return "";
        if (url.indexOf("youtube.com/embed") > -1) return url;
        var videoId = "";
        if (url.indexOf("youtu.be/") > -1) {
            videoId = url.split("youtu.be/")[1].split("?")[0];
        } else if (url.indexOf("youtube.com/watch") > -1) {
            var params = url.split("?")[1];
            if (params) {
                params.split("&").forEach(function (p) {
                    if (p.indexOf("v=") === 0) videoId = p.substring(2);
                });
            }
        } else if (url.indexOf("youtube.com/shorts/") > -1) {
            videoId = url.split("shorts/")[1].split("?")[0];
        }
        return videoId
            ? "https://www.youtube.com/embed/" + videoId + "?rel=0&modestbranding=1"
            : url;
    }

    function isDirectVideoFile(url) {
        return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(String(url || "").trim())
            || /^\/Mydailycarevideos\//i.test(String(url || "").trim());
    }

    function normalizeVideoText(value) {
        return String(value || "")
            .toLowerCase()
            .replace(/\.[^.]+$/, "")
            .replace(/[-_]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function resolveLocalVideo(action) {
        var list = Array.isArray(window.LOCAL_LIBRARY_VIDEOS) ? window.LOCAL_LIBRARY_VIDEOS : [];
        if (!list.length) return null;

        var candidates = [
            action.videoUrl,
            action.url,
            action.fileName,
            action.file,
            action.title,
            action.categoryName,
            action.name
        ].filter(Boolean);

        for (var i = 0; i < candidates.length; i++) {
            var rawLower = String(candidates[i]).trim().toLowerCase();
            var exact = list.find(function (v) {
                var decodedUrl = "";
                try { decodedUrl = decodeURIComponent(v.url).toLowerCase(); } catch (e) { }
                return v.url.toLowerCase() === rawLower
                    || decodedUrl === rawLower
                    || v.fileName.toLowerCase() === rawLower
                    || ("/mydailycarevideos/" + v.fileName).toLowerCase() === rawLower;
            });
            if (exact) return exact;
        }

        for (var j = 0; j < candidates.length; j++) {
            var query = normalizeVideoText(candidates[j]);
            if (!query) continue;
            var byTitle = list.find(function (v) {
                var t = normalizeVideoText(v.title);
                return t === query || t.indexOf(query) > -1 || query.indexOf(t) > -1;
            });
            if (byTitle) return byTitle;
        }

        return null;
    }

    function pauseOtherVideos(activeVideo) {
        var body = document.getElementById("videoModalBody");
        if (!body) return;
        var allVideos = body.querySelectorAll("video");
        for (var i = 0; i < allVideos.length; i++) {
            if (allVideos[i] !== activeVideo && !allVideos[i].paused) {
                allVideos[i].pause();
            }
        }
    }

    function openVideoOverlay(videoUrlOrList, title) {
        var overlay = document.getElementById("videoOverlay");
        var body = document.getElementById("videoModalBody");
        if (!overlay || !body) return false;

        var links = [];
        if (Array.isArray(videoUrlOrList)) {
            links = videoUrlOrList;
        } else if (typeof videoUrlOrList === "string") {
            links = videoUrlOrList.trim().split(/\s+/).filter(Boolean);
        }

        if (!links.length && title) {
            var byTitleOnly = resolveLocalVideo({ title: title });
            if (byTitleOnly) links = [byTitleOnly.url];
        }

        if (!links.length) return false;

        closeVideoOverlay();
        body.innerHTML = "";

        var isMany = links.length > 4;

        links.forEach(function (rawLink, idx) {
            var matched = resolveLocalVideo({ videoUrl: rawLink, title: idx === 0 ? title : "" });
            var resolvedUrl = matched ? matched.url : rawLink;
            var resolvedTitle = (matched && matched.title) || (links.length === 1 ? title : "") || "";

            var wrap = document.createElement("div");
            wrap.className = "video-frame-wrap";

            if (resolvedTitle && links.length > 1) {
                var caption = document.createElement("div");
                caption.className = "video-frame-title";
                caption.textContent = resolvedTitle;
                wrap.appendChild(caption);
            }

            var frame = document.createElement("div");
            frame.className = "video-frame";

            if (isDirectVideoFile(resolvedUrl) || !/^https?:\/\//i.test(resolvedUrl)) {
                var video = document.createElement("video");
                video.src = resolvedUrl;
                video.controls = true;
                video.playsInline = true;
                video.preload = isMany ? "none" : "metadata";
                video.addEventListener("play", function () {
                    pauseOtherVideos(video);
                });
                if (links.length === 1) {
                    video.autoplay = true;
                    video.play().catch(function () { });
                }
                frame.appendChild(video);
            } else {
                var iframe = document.createElement("iframe");
                iframe.src = convertToEmbedUrl(resolvedUrl);
                iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
                iframe.allowFullscreen = true;
                frame.loading = isMany && idx > 2 ? "lazy" : "eager";
                frame.appendChild(document.createTextNode(""));
                frame.appendChild(iframe);
            }

            wrap.appendChild(frame);
            body.appendChild(wrap);
        });

        overlay.classList.add("show");
        document.body.style.overflow = "hidden";
        return true;
    }

    function closeVideoOverlay() {
        var overlay = document.getElementById("videoOverlay");
        var body = document.getElementById("videoModalBody");
        if (body) {
            var videos = body.querySelectorAll("video");
            for (var i = 0; i < videos.length; i++) {
                videos[i].pause();
                videos[i].removeAttribute("src");
                videos[i].load();
            }
            body.innerHTML = "";
        }
        if (overlay) overlay.classList.remove("show");
        document.body.style.overflow = "";
    }

    function goBackFromVideo() {
        closeVideoOverlay();
    }

    function setupPreviewObserver() {
        if (previewObserver) {
            previewObserver.disconnect();
            previewObserver = null;
        }
        if (!("IntersectionObserver" in window)) return null;

        var container = document.getElementById("materials-container");
        previewObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var video = entry.target;
                var dataSrc = video.getAttribute("data-src");
                if (dataSrc) {
                    video.src = dataSrc;
                    video.removeAttribute("data-src");
                }
                previewObserver.unobserve(video);
            });
        }, {
            root: container || null,
            rootMargin: "150px 0px"
        });
        return previewObserver;
    }

    function getFilteredVideos() {
        var list = Array.isArray(window.LOCAL_LIBRARY_VIDEOS) ? window.LOCAL_LIBRARY_VIDEOS : [];
        var q = searchQuery.toLowerCase().trim();
        return list.filter(function (item) {
            if (activeCategory !== "ALL" && (item.category || "") !== activeCategory) {
                return false;
            }
            if (!q) return true;
            var haystack = ((item.title || "") + " " + (item.fileName || "") + " " + (item.category || "")).toLowerCase();
            return haystack.indexOf(q) > -1;
        });
    }

    function renderToolbar() {
        var toolbar = document.getElementById("libraryToolbar");
        var catBar = document.getElementById("libraryCategoryBar");
        var list = Array.isArray(window.LOCAL_LIBRARY_VIDEOS) ? window.LOCAL_LIBRARY_VIDEOS : [];
        if (!toolbar) return;

        if (list.length <= 4) {
            toolbar.hidden = true;
            return;
        }
        toolbar.hidden = false;

        if (!catBar) return;
        var categories = [];
        list.forEach(function (item) {
            if (item.category && categories.indexOf(item.category) === -1) {
                categories.push(item.category);
            }
        });

        if (!categories.length) {
            catBar.hidden = true;
            return;
        }

        catBar.hidden = false;
        catBar.innerHTML = "";

        var allCats = ["ALL"].concat(categories);
        allCats.forEach(function (cat) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "library-chip" + (activeCategory === cat ? " active" : "");
            btn.textContent = cat === "ALL" ? "All" : cat;
            btn.addEventListener("click", function () {
                activeCategory = cat;
                visibleCount = PAGE_SIZE;
                renderToolbar();
                renderMaterials();
            });
            catBar.appendChild(btn);
        });
    }

    function renderMaterials() {
        var container = document.getElementById("materials-container");
        if (!container) return;

        var filtered = getFilteredVideos();
        container.innerHTML = "";

        if (!filtered.length) {
            var empty = document.createElement("div");
            empty.className = "local-video-empty";
            empty.textContent = searchQuery
                ? "No matching videos found."
                : "No videos available.";
            container.appendChild(empty);
            return;
        }

        var observer = setupPreviewObserver();
        var slice = filtered.slice(0, visibleCount);

        slice.forEach(function (item) {
            var card = document.createElement("div");
            card.className = "card";
            card.setAttribute("role", "button");
            card.setAttribute("tabindex", "0");
            card.setAttribute("data-video-url", item.url);

            var imageWrapper = document.createElement("div");
            imageWrapper.className = "image-wrapper";

            var preview = document.createElement("video");
            preview.muted = true;
            preview.playsInline = true;
            preview.preload = "metadata";
            if (observer) {
                preview.setAttribute("data-src", item.url + "#t=0.5");
            } else {
                preview.src = item.url + "#t=0.5";
            }

            var overlayIcon = document.createElement("div");
            overlayIcon.className = "overlay-icon";
            overlayIcon.textContent = "▶";

            var durationEl = document.createElement("div");
            durationEl.className = "duration";
            durationEl.textContent = "VIDEO";

            preview.addEventListener("loadedmetadata", function () {
                durationEl.textContent = formatDuration(preview.duration);
            });

            if (observer) observer.observe(preview);

            imageWrapper.appendChild(preview);
            imageWrapper.appendChild(overlayIcon);
            imageWrapper.appendChild(durationEl);

            var cardBody = document.createElement("div");
            cardBody.className = "card-body";

            var typeLabel = document.createElement("div");
            typeLabel.className = "type-label";
            typeLabel.textContent = item.category || item.type || "VIDEO";

            var cardTitle = document.createElement("div");
            cardTitle.className = "card-title";
            cardTitle.textContent = item.title || item.fileName;

            var externalIcon = document.createElement("span");
            externalIcon.className = "external-icon";
            externalIcon.textContent = " ↗";
            cardTitle.appendChild(externalIcon);

            cardBody.appendChild(typeLabel);
            cardBody.appendChild(cardTitle);

            card.appendChild(imageWrapper);
            card.appendChild(cardBody);

            card.addEventListener("click", function () {
                openVideoOverlay(item.url, item.title || item.fileName);
            });
            card.addEventListener("keydown", function (e) {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openVideoOverlay(item.url, item.title || item.fileName);
                }
            });

            container.appendChild(card);
        });

        var remaining = filtered.length - slice.length;
        if (remaining > 0) {
            var wrap = document.createElement("div");
            wrap.className = "library-load-more-wrap";

            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "library-load-more-btn";
            btn.textContent = "Load More (" + remaining + " more)";
            btn.addEventListener("click", function () {
                visibleCount += PAGE_SIZE;
                renderMaterials();
            });

            wrap.appendChild(btn);
            container.appendChild(wrap);
        }
    }

    function playIncomingAction(action) {
        if (!action) return false;
        if (action.videoUrl && String(action.videoUrl).trim()) {
            return openVideoOverlay(String(action.videoUrl).trim(), action.title || action.categoryName || "");
        }
        var matched = resolveLocalVideo(action);
        if (matched) {
            return openVideoOverlay(matched.url, matched.title || matched.fileName);
        }
        return false;
    }

    function checkAutoPlayVideo() {
        var params = new URLSearchParams(window.location.search);
        var playVideo = params.get("playVideo");
        var videoTitle = params.get("videoTitle") || "";
        var pending = null;

        try {
            var rawPending = sessionStorage.getItem("pendingLibraryVideo");
            if (rawPending) {
                sessionStorage.removeItem("pendingLibraryVideo");
                pending = JSON.parse(rawPending);
            }
        } catch (e) { }

        if (playVideo) {
            params.delete("playVideo");
            params.delete("videoTitle");
            var cleanUrl = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
            window.history.replaceState({}, "", cleanUrl);
            playIncomingAction({ videoUrl: playVideo, title: videoTitle });
            return;
        }

        if (pending && (pending.videoUrl || pending.title)) {
            playIncomingAction(pending);
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        renderToolbar();
        renderMaterials();

        var searchInput = document.getElementById("librarySearchInput");
        if (searchInput) {
            searchInput.addEventListener("input", function () {
                searchQuery = searchInput.value || "";
                visibleCount = PAGE_SIZE;
                renderMaterials();
            });
        }

        var overlay = document.getElementById("videoOverlay");
        if (overlay) {
            overlay.addEventListener("click", function (e) {
                if (e.target === overlay) closeVideoOverlay();
            });
        }

        checkAutoPlayVideo();
    });

    window.addEventListener("unified-ai:action", function (event) {
        var action = event.detail;
        if (!action || (action.action !== "video.play" && action.action !== "video.stop")) return;

        if (action.action === "video.stop") {
            closeVideoOverlay();
            if (window.UnifiedAIChild) window.UnifiedAIChild.respond(action, true, { stopped: true });
            return;
        }

        var opened = playIncomingAction(action);
        if (window.UnifiedAIChild) {
            window.UnifiedAIChild.respond(action, opened, opened ? { opened: true } : null,
                opened ? null : "Requested video could not be opened.");
        }
    });

    window.openVideoOverlay = openVideoOverlay;
    window.closeVideoOverlay = closeVideoOverlay;
    window.goBackFromVideo = goBackFromVideo;
    window.goBack = function () {
        if (typeof window.goBackMDC === "function") window.goBackMDC();
    };
})();