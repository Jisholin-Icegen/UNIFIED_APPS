
self.addEventListener('install', function (event) {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (event) {
    event.waitUntil(self.clients.claim());
});

function scopeUrl(path) {
    return new URL(path, self.registration.scope).href;
}

self.addEventListener('push', function (event) {
    var data = {};

    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = {
            title: 'Dial50 Patient Care',
            body: event.data ? event.data.text() : ''
        };
    }

    var title = data.title || data.orderType || data.ordeR_TYPE || 'Dial50 Patient Care';

    var body = data.body ||
        data.itemSummary ||
        data.iteM_SUMMARY ||
        'You have a new hospital service notification.';

    var options = {
        body: body,

        icon: scopeUrl('images/pwa/icon-192.png'),

        badge: scopeUrl('images/pwa/badge-96.png'),

        image: scopeUrl('images/pwa/notification-bg.png'),

        requireInteraction: true,
        renotify: true,
        vibrate: [200, 100, 200, 100, 300],
        timestamp: Date.now(),

        tag: data.tag || 'dial50-' + Date.now(),

        actions: [
            {
                action: 'open',
                title: 'View Details'
            }
        ],

        data: {
            url: data.url || '/'
        }
    };

    event.waitUntil(
        Promise.all([

            self.registration.showNotification(title, options),

            self.clients.matchAll({
                type: 'window',
                includeUncontrolled: true
            }).then(function (list) {
                list.forEach(function (client) {
                    client.postMessage({
                        type: 'push-received',
                        payload: data
                    });
                });
            }),

            Promise.resolve().then(function () {
                if (self.navigator && self.navigator.setAppBadge) {
                    return self.navigator.setAppBadge();
                }
            }).catch(function () {
            })
        ])
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    if (self.navigator && self.navigator.clearAppBadge) {
        self.navigator.clearAppBadge().catch(function () { });
    }

    var notificationData = event.notification.data || {};
    var target = scopeUrl(notificationData.url || '/');

    event.waitUntil((async function () {

        var list = await self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        });

        for (var i = 0; i < list.length; i++) {
            var client = list[i];

            // only top-level windows (never an iframe inside the Home shell)
            if (client.frameType && client.frameType !== 'top-level') continue;

            if (
                new URL(client.url).origin === self.location.origin &&
                'focus' in client
            ) {
                // The Home page may own a live voice call. client.navigate() would unload it
                // and drop the WebSocket + microphone, so ask Home to open the target itself.
                var path = new URL(client.url).pathname;
                if (/\/home(?:\/index)?\/?$/i.test(path) || /^\/?$/.test(path)) {
                    client.postMessage({ type: 'push-open', url: target });
                    return client.focus();
                }
                try {
                    var moved = await client.navigate(target);
                    return (moved || client).focus();
                } catch (e) {
                    return client.focus();
                }
            }
        }

        return self.clients.openWindow(target);

    })());
});

self.addEventListener('pushsubscriptionchange', function (event) {
    var oldSub = event.oldSubscription;

    if (!oldSub) return;

    event.waitUntil(
        self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: oldSub.options.applicationServerKey
        }).then(function (newSub) {

            return fetch(scopeUrl('api/Push/Resubscribe'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    OldEndpoint: oldSub.endpoint,
                    Subscription: newSub.toJSON()
                })
            });

        }).catch(function (error) {
            console.error('Dial50 push resubscription failed:', error);
        })
    );
});
