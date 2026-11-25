(function (w, d) {
    'use strict';

    var PROMPT_COOLDOWN_MS = 12 * 60 * 60 * 1000;

    w.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
    });

    var cfg = w.PUSH_CONFIG || {
        swUrl: '/sw.js',
        scope: '/',
        api: '/api/Push'
    };

    var state = {
        room: '',
        reg: null,
        started: false,
        promptKey: '',
        promptKeyPromise: null,
        statusCheck: null
    };

    function supported() {
        return 'serviceWorker' in navigator &&
            'PushManager' in w &&
            'Notification' in w;
    }

    function b64ToU8(b64) {
        var pad = '='.repeat((4 - b64.length % 4) % 4);
        var raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
        var out = new Uint8Array(raw.length);
        for (var i = 0; i < raw.length; i++) {
            out[i] = raw.charCodeAt(i);
        }
        return out;
    }

    function getBedInfo() {
        var v = '';
        try { v = sessionStorage.getItem('bedInfo') || ''; } catch (e) { }
        if (!v) {
            try { v = new URLSearchParams(w.location.search).get('BedInfo') || ''; } catch (e) { }
        }
        return v;
    }

    function getPromptStorageKey() {
        if (state.promptKey) return Promise.resolve(state.promptKey);
        if (state.promptKeyPromise) return state.promptKeyPromise;

        var identity = state.room.trim().toUpperCase() + '\n' + getBedInfo();
        if (!w.crypto || !w.crypto.subtle || !w.TextEncoder) {
            state.promptKey = 'pushPrompt:v2:room:' + encodeURIComponent(state.room.trim().toUpperCase());
            return Promise.resolve(state.promptKey);
        }

        state.promptKeyPromise = w.crypto.subtle.digest('SHA-256', new w.TextEncoder().encode(identity))
            .then(function (digest) {
                var key = Array.from(new Uint8Array(digest)).map(function (value) {
                    return value.toString(16).padStart(2, '0');
                }).join('');
                state.promptKey = 'pushPrompt:v2:' + key;
                return state.promptKey;
            })
            .catch(function (error) {
                console.warn('Could not create a browser-local notification prompt key:', error);
                state.promptKey = 'pushPrompt:v2:room:' + encodeURIComponent(state.room.trim().toUpperCase());
                return state.promptKey;
            });
        return state.promptKeyPromise;
    }

    function readLocalPromptState(key) {
        try {
            return JSON.parse(localStorage.getItem(key) || '{}');
        } catch (error) {
            console.warn('Could not read the local notification prompt state:', error);
            return {};
        }
    }

    function writeLocalPromptState(key, values) {
        var current = readLocalPromptState(key);
        try {
            localStorage.setItem(key, JSON.stringify(Object.assign({}, current, values)));
        } catch (error) {
            console.warn('Could not save the local notification prompt state:', error);
        }
    }

    function api(path, method, body) {
        return fetch(cfg.api + path, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
            credentials: 'same-origin'
        }).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status + ' on ' + path);
            return r.json();
        });
    }

    function withTimeout(promise, ms, label) {
        return new Promise(function (resolve, reject) {
            var t = setTimeout(function () { reject(new Error(label + ' timed out')); }, ms);
            promise.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
        });
    }

    function getPromptData() {
        return { RoomNo: state.room, BedInfo: getBedInfo() };
    }

    function getReg() {
        if (state.reg) return Promise.resolve(state.reg);
        return navigator.serviceWorker.register(cfg.swUrl, { scope: cfg.scope })
            .then(function () { return withTimeout(navigator.serviceWorker.ready, 10000, 'service worker ready'); })
            .then(function (reg) { state.reg = reg; return reg; });
    }

    function createSubscription(reg) {
        return api('/PublicKey', 'GET').then(function (r) {
            return withTimeout(reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: b64ToU8(r.key)
            }), 15000, 'push subscribe');
        });
    }

    function ensureSubscription(reg) {
        return reg.pushManager.getSubscription().then(function (sub) {
            if (sub) return sub;
            return createSubscription(reg);
        });
    }

    function subscribe() {
        return getReg().then(function (reg) {
            return ensureSubscription(reg);
        }).then(function (sub) {
            return api('/Subscribe', 'POST', {
                RoomNo: state.room,
                BedInfo: getBedInfo(),
                Subscription: sub.toJSON()
            }).then(function () { return sub; });
        });
    }

    function completePrompt() {
        return getPromptStorageKey().then(function (key) {
            writeLocalPromptState(key, { enabled: true, deferredUntil: 0, shownUntil: 0 });
            return api('/CompletePrompt', 'POST', getPromptData()).then(function (result) {
                if (!result || !result.success) throw new Error('The server did not confirm notification setup.');
                return result;
            });
        });
    }

    function deferPrompt() {
        return getPromptStorageKey().then(function (key) {
            var deferredUntil = Date.now() + PROMPT_COOLDOWN_MS;
            writeLocalPromptState(key, { deferredUntil: deferredUntil, shownUntil: deferredUntil });
            return api('/DeferPrompt', 'POST', getPromptData()).then(function (result) {
                if (!result || !result.success) throw new Error('The server did not confirm the notification delay.');
                return result;
            }).catch(function (error) {
                console.warn('Notification delay is saved in this browser but could not be synced:', error);
                return { success: false, localOnly: true };
            });
        });
    }

    function removeModal() {
        var modal = d.getElementById('pushBlockedModal');
        if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
    }

    function showPromptModal() {
        if (!supported() || Notification.permission !== 'default' || d.getElementById('pushBlockedModal')) return;
        if (state.promptKey) {
            var now = Date.now();
            var localState = readLocalPromptState(state.promptKey);
            if (localState.enabled || localState.deferredUntil > now || localState.shownUntil > now) return;
            writeLocalPromptState(state.promptKey, { shownUntil: now + PROMPT_COOLDOWN_MS });
        }

        var modalHtml = `
            <div id="pushBlockedModal" role="dialog" aria-modal="true" aria-labelledby="pushPromptTitle" style="position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                <div style="background:white;width:90%;max-width:400px;border-radius:24px;padding:32px 24px;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);animation:slideUp 0.3s ease-out;">
                    <div style="width:64px;height:64px;background:#eef2ff;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
                        <svg width="32" height="32" fill="none" stroke="#4f46e5" stroke-width="2.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                    </div>
                    <h2 id="pushPromptTitle" style="margin:0 0 12px;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">Enable Notifications</h2>
                    <p id="pushPromptMessage" style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.5;">Allow notifications to receive updates about your orders and requests.</p>
                    <button id="modalAllowBtn" type="button" style="width:100%;background:#4f46e5;color:white;border:none;border-radius:12px;padding:14px;font-size:16px;font-weight:700;cursor:pointer;margin-bottom:8px;">
                        Allow Notifications
                    </button>
                    <button id="modalCloseBtn" type="button" style="width:100%;background:transparent;color:#64748b;border:none;padding:14px;font-size:14px;font-weight:600;cursor:pointer;">
                        Maybe Later
                    </button>
                </div>
            </div>
        `;

        d.body.insertAdjacentHTML('beforeend', modalHtml);

        d.getElementById('modalAllowBtn').addEventListener('click', function () {
            var btn = this;
            btn.disabled = true;
            btn.textContent = 'Please wait...';

            enable().then(function (result) {
                if (result === 'granted') {
                    return completePrompt().catch(function (error) {
                        console.warn('Notifications are enabled in this browser, but setup could not be synced:', error);
                    }).then(function () {
                        removeModal();
                    });
                }
                if (result === 'default' || result === 'denied') {
                    return deferPrompt().then(function () {
                        removeModal();
                    });
                }
                btn.disabled = false;
                btn.textContent = 'Allow Notifications';
            }).catch(function (error) {
                console.error('Could not enable notifications:', error);
                var message = d.getElementById('pushPromptMessage');
                if (message) message.textContent = 'Notifications could not be enabled. Please try again.';
                btn.disabled = false;
                btn.textContent = 'Allow Notifications';
            });
        });

        d.getElementById('modalCloseBtn').addEventListener('click', function () {
            removeModal();
            deferPrompt();
        });
    }

    function updateUi() {
        if (!state.room || !supported()) {
            removeModal();
            return;
        }

        if (Notification.permission === 'granted' || Notification.permission === 'denied') {
            removeModal();
            return;
        }

        if (d.getElementById('pushBlockedModal') || state.statusCheck) return;

        state.statusCheck = getPromptStorageKey().then(function (key) {
            var localState = readLocalPromptState(key);
            var now = Date.now();
            if (localState.enabled || localState.deferredUntil > now || localState.shownUntil > now) {
                removeModal();
                return null;
            }

            var url = cfg.api + '/GetPromptStatus?roomNo=' + encodeURIComponent(state.room)
                + '&bedInfo=' + encodeURIComponent(getBedInfo());
            return fetch(url, { credentials: 'same-origin' }).then(function (response) {
                if (!response.ok) throw new Error('HTTP ' + response.status + ' while checking notification prompt status.');
                return response.json();
            }).then(function (status) {
                if (!status || !status.success) throw new Error('Notification prompt status was not returned.');
                if (status.status === 'DEFERRED' && status.shouldShow === false) {
                    var nextPromptAt = Date.parse(status.nextPromptAt);
                    if (!Number.isFinite(nextPromptAt) || nextPromptAt <= now) {
                        nextPromptAt = now + PROMPT_COOLDOWN_MS;
                    }
                    writeLocalPromptState(key, { deferredUntil: nextPromptAt, shownUntil: nextPromptAt });
                    removeModal();
                    return null;
                }
                showPromptModal();
                return status;
            });
        }).catch(function (error) {
            console.warn('Could not check notification prompt status; not showing a repeat prompt:', error);
        }).finally(function () {
            state.statusCheck = null;
        });
    }

    function enable() {
        if (!supported()) return Promise.resolve('unsupported');
        if (Notification.permission === 'denied') return Promise.resolve('denied');

        var permission = Notification.permission === 'granted'
            ? Promise.resolve('granted')
            : Notification.requestPermission();
        return permission.then(function (result) {
            if (result !== 'granted') return result;
            return subscribe().then(function () { return 'granted'; });
        });
    }

    function init(roomNo) {
        state.room = roomNo || '';
        if (state.started) {
            updateUi();
            return;
        }

        if (!supported() || !state.room) return;
        state.started = true;

        getReg().catch(function (error) {
            console.warn('Could not initialize the notification service worker:', error);
        });

        if (Notification.permission === 'granted') {
            subscribe().then(completePrompt).catch(function (error) {
                console.warn('Could not refresh this browser notification subscription:', error);
            });
        }

        updateUi();
    }

    w.addEventListener('storage', function (event) {
        if (!state.promptKey || event.key !== state.promptKey) return;
        var localState = readLocalPromptState(state.promptKey);
        if (localState.enabled || localState.deferredUntil > Date.now() || localState.shownUntil > Date.now()) {
            removeModal();
        }
    });

    w.PushClient = {
        init: init,
        enable: enable
    };
})(window, document);