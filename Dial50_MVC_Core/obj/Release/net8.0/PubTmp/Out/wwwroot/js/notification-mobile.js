(function ($) {
    'use strict';

    var notificationRequest = null;
    var unreadCountRequest = null;
    var currentRoomNo = '';
    var currentNotifications = [];

    function escapeHtml(value) {
        if (!value) return '';
        return String(value).replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch];
        });
    }

    // The notification endpoints are tenant-aware. Pass XTenantID in the query string so they keep
    // working when a tab was opened without the tenant id in its URL and the session has not been
    // populated yet (otherwise the server throws and the drawer shows the connection error).
    function apiUrl(path) {
        var tenantId = (window.BedContext && window.BedContext.get
            ? window.BedContext.get().tenantId : '')
            || sessionStorage.getItem('XTenantID') || '';
        return tenantId ? path + '?XTenantID=' + encodeURIComponent(tenantId) : path;
    }

    function isNotificationRead(value) {
        return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'read';
    }

    function getServiceTypeIcon(serviceType) {
        var type = (serviceType || 'SYSTEM').toUpperCase();
        var icons = {
            'FOOD': '../images/notification/food.png',
            'REQUEST': '../images/notification/request.png',
            'SYSTEM': '../images/notification/system.png',
            'FEEDBACK': '../images/notification/system.png'
        };
        return icons[type] || icons.SYSTEM;
    }

    function getTimeAgo(dateString) {
        if (!dateString) return '';
        var date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        var seconds = Math.floor((new Date() - date) / 1000);
        var interval = Math.floor(seconds / 60);
        if (interval < 1) return 'Just now';
        if (interval < 60) return interval + 'm ago';
        var hours = Math.floor(interval / 60);
        if (hours < 24) return hours + 'h ago';
        var days = Math.floor(hours / 24);
        if (days < 7) return days + 'd ago';
        return date.toLocaleDateString();
    }

    function refreshMarkAllReadState() {
        var $btn = $('#markAllReadBtn');
        if (!$btn.length) return;

        var unreadInList = $('#mobileNotificationList .order-card.unread').length;
        var badgeCount = parseInt($('#mobileBadgeCount').text(), 10) || 0;

        if (unreadInList > 0 || badgeCount > 0) {
            $btn.removeClass('is-empty is-done').prop('disabled', false);
        } else {
            $btn.addClass('is-empty').removeClass('is-done').prop('disabled', true);
        }
    }

    function updateUnreadBadges(count) {
        count = parseInt(count, 10) || 0;
        $('#mobileBadgeCount').text(count);
        $('#drawerBadgeCount').text(count);
        $('#mobileBadgeCount').toggleClass('show', count > 0);
        refreshMarkAllReadState();
    }

    function showEmptyState() {
        lastNotificationsSig = null;
        currentNotifications = [];
        $('#mobileNotificationList').html(
            '<div class="drawer-empty">' +
            '<img src="../images/notification/empty.png" class="empty-icon" alt="Empty">' +
            '<div class="empty-text">No orders found</div>' +
            '<div class="empty-sub">You\'re all caught up!</div>' +
            '</div>'
        );
        refreshMarkAllReadState();
    }

    function showNotificationError() {
        // Background refreshes must not fill a closed drawer with a stale error. When the user
        // actually opens the drawer we reload, so a transient failure is retried then.
        if (!$('#mobileDrawer').hasClass('open')) return;
        lastNotificationsSig = null;
        $('#mobileNotificationList').html(
            '<div class="drawer-empty">' +
            '<div class="empty-text">Notifications could not be loaded</div>' +
            '<div class="empty-sub">Check the connection and try again.</div>' +
            '</div>'
        );
        refreshMarkAllReadState();
    }

    function getActiveCount() {
        if (!currentRoomNo) {
            $('#activeCount').text(0);
            return;
        }

        $.ajax({
            url: apiUrl('/api/Notification/GetTotalCount'),
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ RoomNo: currentRoomNo }),
            timeout: 5000
        }).done(function (response) {
            var total = 0;
            if (response && response.totaL_COUNT !== undefined) {
                total = response.totaL_COUNT;
            } else if (response && response.TOTAL_COUNT !== undefined) {
                total = response.TOTAL_COUNT;
            } else if (response && response.TOTALCOUNT !== undefined) {
                total = response.TOTALCOUNT;
            }
            $('#activeCount').text(total);
        }).fail(function () {
            $('#activeCount').text(0);
        });
    }

    function getStatusClass(status) {
        var s = String(status || '').toLowerCase().trim();

        if (s === 'cancelled' || s === 'canceled') return 'status-cancelled';
        if (s === 'pending' || s === 'accepted' || s === 'placed') return 'status-confirmed';
        if (s === 'assigned') return 'status-assigned';
        if (s === 'on the way' || s === 'ontheway' || s === 'in transit' || s === 'in-transit') return 'status-ontheway';
        if (s === 'in progress' || s === 'in-progress') return 'status-inprogress';
        if (s === 'completed' || s === 'delivered' || s === 'resolved') return 'status-completed';
        if (s === 'feedback') return 'status-feedback';

        return 'status-confirmed';
    }

    function getStatusLabel(status) {
        var s = String(status || '').toLowerCase().trim();
        if (s === 'pending' || s === 'accepted' || s === 'placed') return 'Pending';
        if (s === 'feedback') return 'Feedback';
        return status;
    }

    function isNavigableNotification(status, serviceType, orderType) {
        var s = String(status || '').toLowerCase().trim();
        var svc = String(serviceType || '').toUpperCase().trim();
        var ot = String(orderType || '').toUpperCase().trim();

        if (svc === 'FEEDBACK') return false;
        if (svc === 'GUEST PASS') return false;
        if (svc === 'ALERT') return false;

        if (s === 'feedback') return false;
        if (s === 'guest pass') return false;
        if (s === 'missed order') return false;
        if (s === 'cancelled' || s === 'canceled') return false;

        if (s === 'diet assigned') return false;
        if (s === 'details updated') return false;
        if (s === 'diet changed') return false;
        if (s === 'diet added') return false;
        if (s === 'diet removed') return false;
        if (s === 'diet deleted') return false;
        if (s === 'meal missed') return false;
        if (s === 'meal not ordered') return false;
        if (s === 'no food ordered') return false;

        if (ot.indexOf('MULTI-ITEM') !== -1) return false;
        if (ot.indexOf('MULTI ITEM') !== -1) return false;
        if (ot.indexOf('HEADER') !== -1) return false;
        if (ot.indexOf('HEADLESS') !== -1) return false;
        if (ot.indexOf('DIET') !== -1) return false;
        if (ot.indexOf('CANCELLED') !== -1) return false;
        if (ot.indexOf('CANCELED') !== -1) return false;

        if (ot.indexOf('MEAL MISSED') !== -1) return false;
        if (ot.indexOf('NO FOOD') !== -1) return false;

        if (ot.indexOf('MISSED') !== -1) return false;

        return true;
    }

    var lastNotificationsSig = null;
    function renderMobileNotifications(notifications) {

        var sig = JSON.stringify(notifications);
        if (sig === lastNotificationsSig) return;
        lastNotificationsSig = sig;
        currentNotifications = Array.isArray(notifications) ? notifications : [];

        if (!Array.isArray(notifications) || notifications.length === 0) {
            showEmptyState();
            return;
        }

        var html = [];

        notifications.forEach(function (item, index) {
            var read = isNotificationRead(item.iS_READ || item.IS_READ);
            var notificationId = item.ID || item.id;
            var id = item.ordeR_ID || item.ORDER_ID || '';
            var orderCode = item.ordeR_CODE || item.ORDER_CODE || 'Information';
            var title = item.ordeR_TYPE || item.ORDER_TYPE || '';
            var message = item.iteM_SUMMARY || item.ITEM_SUMMARY || '';
            var rawStatus = item.status || item.STATUS || '';
            var status = String(rawStatus).toLowerCase().trim();
            var serviceType = (item.service || item.SERVICE || 'SYSTEM').toUpperCase();
            var orderType = (item.ordeR_TYPE || item.ORDER_TYPE || '').toUpperCase();
            var icon = getServiceTypeIcon(serviceType);
            var rawDate = item.createD_DATE || item.CREATED_DATE || '';
            var timeAgo = getTimeAgo(rawDate);

            var statusClass = getStatusClass(status);
            var statusLabel = getStatusLabel(rawStatus);
            var showArrow = isNavigableNotification(status, serviceType, orderType);

            var arrowHtml = showArrow
                ? '<div class="order-arrow"><img src="../images/notification/arrow.png" alt="View"></div>'
                : '';

            html.push(
                '<div class="order-card ' + (read ? 'read' : 'unread') + '" data-unified-ai-target="notification-action-' + index + '" data-notification-id="' + escapeHtml(notificationId) + '" data-order-id="' + escapeHtml(id) + '" data-service="' + escapeHtml(serviceType) + '" data-navigable="' + (showArrow ? '1' : '0') + '">' +
                '<div class="order-avatar">' +
                '<img src="' + escapeHtml(icon) + '" alt="' + escapeHtml(serviceType) + '">' +
                '</div>' +
                '<div class="order-info">' +
                '<span class="order-code">#' + escapeHtml(orderCode) + '</span>' +
                '<span class="status-badge ' + statusClass + '">' + escapeHtml(statusLabel) + '</span>' +
                '<h4>' + escapeHtml(title) + '</h4>' +
                '<p>' + escapeHtml(message) + '</p>' +
                '</div>' +
                arrowHtml +
                '<div class="notif-time">' + escapeHtml(timeAgo) + '</div>' +
                '</div>'
            );
        });

        $('#mobileNotificationList').html(html.join(''));
        refreshMarkAllReadState();
    }

    function loadMobileNotifications() {
        currentRoomNo = currentRoomNo || resolveRoomNo();
        if (!currentRoomNo) {
            showEmptyState();
            return $.Deferred().reject(new Error('Room information is unavailable.')).promise();
        }

        if (notificationRequest) notificationRequest.abort();

        var request = $.ajax({
            url: apiUrl('/api/Notification/GetNotifications'),
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ RoomNo: currentRoomNo, MaxCount: 100 }),
            timeout: 10000
        }).done(function (response) {
            renderMobileNotifications(Array.isArray(response) ? response : []);
        }).fail(function (xhr, status) {
            if (status !== 'abort') showNotificationError();
        }).always(function () {
            if (notificationRequest === request) notificationRequest = null;
        });
        notificationRequest = request;
        return request;
    }

    function getMobileUnreadCount() {
        currentRoomNo = currentRoomNo || resolveRoomNo();
        if (!currentRoomNo) {
            updateUnreadBadges(0);
            return $.Deferred().reject(new Error('Room information is unavailable.')).promise();
        }

        if (unreadCountRequest) unreadCountRequest.abort();

        var request = $.ajax({
            url: apiUrl('/api/Notification/GetUnreadCount'),
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ RoomNo: currentRoomNo }),
            timeout: 5000
        }).done(function (response) {
            var count = 0;
            if (response && response.unreaD_COUNT !== undefined) {
                count = response.unreaD_COUNT;
            } else if (response && response.UNREAD_COUNT !== undefined) {
                count = response.UNREAD_COUNT;
            } else if (Array.isArray(response) && response.length > 0) {
                count = response[0].unreaD_COUNT || response[0].UNREAD_COUNT || 0;
            }
            updateUnreadBadges(count);
        }).fail(function (xhr, status) {
            if (status === 'abort') return;
            console.warn('Could not refresh notification unread count.',
                'HTTP', xhr && xhr.status, status);
        }).always(function () {
            if (unreadCountRequest === request) unreadCountRequest = null;
        });
        unreadCountRequest = request;
        return request;
    }

    function markNotificationAsRead(notificationId) {
        if (!notificationId || !currentRoomNo) {
            return $.Deferred().reject(new Error('A notification and room are required.')).promise();
        }
        return $.ajax({
            url: apiUrl('/api/Notification/MarkAsRead'),
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ RoomNo: currentRoomNo, NotificationId: String(notificationId) }),
            timeout: 5000
        }).done(function (response) {
            if (!response || !response.success) {
                console.warn('Mark notification as read was not confirmed by the server.');
                loadMobileNotifications();
                getMobileUnreadCount();
                return;
            }
            getMobileUnreadCount();
        }).fail(function () {
            loadMobileNotifications();
            getMobileUnreadCount();
        });
    }

    function markAllNotificationsAsRead() {
        currentRoomNo = currentRoomNo || resolveRoomNo();
        if (!currentRoomNo) return $.Deferred().reject(new Error('Room information is unavailable.')).promise();

        var $btn = $('#markAllReadBtn');

        if ($btn.hasClass('loading') || $btn.prop('disabled')) {
            return $.Deferred().reject(new Error('Notification updates are already in progress.')).promise();
        }

        $btn.addClass('loading').prop('disabled', true);

        return $.ajax({
            url: apiUrl('/api/Notification/MarkAllAsRead'),
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ RoomNo: currentRoomNo }),
            timeout: 10000
        }).done(function (response) {
            if (!response || !response.success) {
                console.warn('Mark all notifications as read was not confirmed by the server.');
                $btn.removeClass('loading');
                refreshMarkAllReadState();
                return;
            }
            $('#mobileNotificationList .order-card.unread')
                .removeClass('unread')
                .addClass('read');

            currentNotifications.forEach(function (item) {
                item.iS_READ = true;
                item.IS_READ = true;
            });
            updateUnreadBadges(0);
            $btn.removeClass('loading is-done').addClass('is-empty');
            refreshMarkAllReadState();
        }).fail(function () {
            console.error('Mark all as read failed');
            $btn.removeClass('loading');
            refreshMarkAllReadState();
        });
    }

    function normalizeNotification(item) {
        return {
            id: item.ID || item.id || '',
            orderId: item.ordeR_ID || item.ORDER_ID || '',
            orderCode: item.ordeR_CODE || item.ORDER_CODE || '',
            title: item.ordeR_TYPE || item.ORDER_TYPE || 'Notification',
            status: item.status || item.STATUS || '',
            service: item.service || item.SERVICE || 'SYSTEM',
            summary: item.iteM_SUMMARY || item.ITEM_SUMMARY || '',
            read: isNotificationRead(item.iS_READ !== undefined ? item.iS_READ : item.IS_READ),
            createdDate: item.createD_DATE || item.CREATED_DATE || '',
            navigable: isNavigableNotification(
                item.status || item.STATUS,
                item.service || item.SERVICE,
                item.ordeR_TYPE || item.ORDER_TYPE
            )
        };
    }

    function redactNotificationText(value) {
        var text = String(value || '').replace(/\s+/g, ' ').trim();
        if (window.BedContext) {
            var context = window.BedContext.get();
            ['bedInfo', 'bedId', 'patientName', 'roomNumber', 'roomBed', 'bedNumber', 'uhid', 'userId']
                .map(function (key) { return String(context[key] || '').trim(); })
                .filter(function (identifier) { return identifier.length >= 3; })
                .forEach(function (identifier) {
                    var escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    text = text.replace(new RegExp(escaped, 'ig'), '[redacted]');
                });
        }
        return text.slice(0, 240);
    }

    function setNotificationReadInUi(notificationId) {
        var item = currentNotifications.find(function (entry) {
            return String(entry.ID || entry.id) === String(notificationId);
        });
        if (item) {
            item.IS_READ = true;
            item.iS_READ = true;
        }
        $('#mobileNotificationList .order-card').filter(function () {
            return String($(this).data('notification-id')) === String(notificationId);
        }).removeClass('unread').addClass('read');
        getMobileUnreadCount();
        refreshMarkAllReadState();
    }

    function handleUnifiedNotificationAction(action, respond) {
        var finish = function (success, result, error) {
            if (typeof respond === 'function') {
                respond(success, result, error);
            } else if (window.UnifiedAIChild) {
                window.UnifiedAIChild.respond(action, success, result, error);
            }
        };
        if (!action || typeof action.action !== 'string') return;

        currentRoomNo = currentRoomNo || resolveRoomNo();
        if (action.action === 'notification.list') {
            // Loading the list for the assistant must never change the UI by itself.
            // The drawer is user-owned: only the bell button opens it.
            loadMobileNotifications().done(function () {
                finish(true, {
                    unreadCount: parseInt($('#mobileBadgeCount').text(), 10) || 0,
                    notifications: currentNotifications.map(function (item) {
                        var notification = normalizeNotification(item);
                        notification.title = redactNotificationText(notification.title);
                        notification.summary = redactNotificationText(notification.summary);
                        return notification;
                    })
                });
            }).fail(function () {
                finish(false, null, 'Could not load notifications for this room.');
            });
            return;
        }

        if (action.action === 'notification.mark_read') {
            var readId = action.notificationId || action.id;
            if (!readId) {
                finish(false, null, 'A notification ID from the latest notification list is required.');
                return;
            }
            markNotificationAsRead(readId).done(function (response) {
                if (!response || !response.success) {
                    finish(false, null, 'The notification could not be marked as read.');
                    return;
                }
                setNotificationReadInUi(readId);
                finish(true, { notificationId: String(readId), read: true });
            }).fail(function () {
                finish(false, null, 'The notification update failed.');
            });
            return;
        }

        if (action.action === 'notification.mark_all_read') {
            getMobileUnreadCount().done(function (response) {
                var unread = Number(response && (
                    response.unreaD_COUNT !== undefined ? response.unreaD_COUNT : response.UNREAD_COUNT
                )) || 0;
                if (unread === 0) {
                    finish(true, { updated: 0, unreadCount: 0 });
                    return;
                }
                markAllNotificationsAsRead().done(function (result) {
                    if (!result || !result.success) {
                        finish(false, null, 'The notifications could not be marked as read.');
                        return;
                    }
                    finish(true, { updated: true, unreadCount: 0 });
                }).fail(function () {
                    finish(false, null, 'The notification update failed.');
                });
            }).fail(function () {
                finish(false, null, 'Could not check the current unread notification count.');
            });
            return;
        }

        if (action.action === 'notification.open') {
            var selected = currentNotifications.find(function (item) {
                return String(item.ID || item.id) === String(action.notificationId || action.id || '');
            });
            if (!selected) {
                finish(false, null, 'The notification is not in the latest list. Refresh notifications first.');
                return;
            }
            var notification = normalizeNotification(selected);
            if (!notification.navigable || !notification.orderId) {
                finish(false, null, 'This notification does not have a page to open.');
                return;
            }
            var open = function () {
                finish(true, { notificationId: notification.id, opened: true });
                window.setTimeout(function () {
                    if (notification.service.toUpperCase().indexOf('FOOD') !== -1) {
                        BedContext.go('FoodDining/OrderSuccess', { orderIds: notification.orderId });
                    } else {
                        BedContext.go('Tracking', { RequestID: notification.orderId });
                    }
                }, 0);
            };
            if (notification.read) {
                open();
            } else {
                markNotificationAsRead(notification.id).done(function (response) {
                    if (!response || !response.success) {
                        finish(false, null, 'The notification could not be marked as read.');
                        return;
                    }
                    setNotificationReadInUi(notification.id);
                    open();
                }).fail(function () {
                    finish(false, null, 'The notification update failed.');
                });
            }
            return;
        }

        finish(false, null, 'Unsupported notification action.');
    }

    function showBrowserNotification(notification) {
        if (!notification) return;

        var title = notification.title || notification.ordeR_TYPE || 'New notification';
        var message = notification.body || notification.iteM_SUMMARY || '';

        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }

        if (!document.hidden) {
/*            console.log('[Notify] Page is visible — skipping OS notification.');*/
            return;
        }

        try {
            var browserNotification = new Notification(title, {
                body: message,
                icon: '/images/notification/system.png',
                tag: String(notification.id || notification.ID || Date.now()),
                renotify: false
            });

/*            console.log('[Notify] new Notification() created successfully.');*/

            browserNotification.onclick = function () {
                window.focus();
                browserNotification.close();
            };
        } catch (err) {
            console.error('[Notify] Failed to create Notification:', err);
        }
    }

    function openMobileDrawer(skipRefresh) {
        $('#mobileDrawerOverlay').addClass('active');
        $('#mobileDrawer').addClass('open');
        $('body').css('overflow', 'hidden');

        $('#markAllReadBtn').removeClass('loading is-done');

        if (!skipRefresh) {
            loadMobileNotifications();
            getMobileUnreadCount();
        }
    }

    function closeMobileDrawer() {
        $('#mobileDrawerOverlay').removeClass('active');
        $('#mobileDrawer').removeClass('open');
        $('body').css('overflow', '');
    }

    function openLogoutSheet() { $('#logoutSheet').addClass('open'); }
    function closeLogoutSheet() { $('#logoutSheet').removeClass('open'); }
    function confirmLogout() { if (window.logoutUrl) window.location.href = window.logoutUrl; }

    function resolveRoomNo() {
        if (window.BedContext) {
            var bc = BedContext.get();
            return bc.roomBed || bc.roomNumber
                || (typeof BedContext.taskBedNumber === 'function' ? BedContext.taskBedNumber() : '')
                || '';
        }
        return window.currentRoomNo || '';
    }

    // While a voice call is live the Home shell owns notifications: unified child
    // pages load inside iframes and must not each fire GetUnreadCount/GetTotalCount
    // on every navigation. sessionStorage is shared with same-origin iframes, so the
    // flag set by voice-agent/script.js is visible here. The drawer still loads on
    // demand when the user (or notification.* action) opens it.
    function voiceCallActive() {
        try { return sessionStorage.getItem('dial50_voice_call_active') === '1'; } catch (e) { return false; }
    }

    $(function () {

        setTimeout(function () {
            currentRoomNo = resolveRoomNo();

            if (!window.trackOrderUrl) {
                window.trackOrderUrl = '/FoodDining/OrderSuccess';
            }

            if (currentRoomNo && !voiceCallActive()) {
                getMobileUnreadCount();
                getActiveCount();
                if (window.PushClient && currentRoomNo) {
                    PushClient.init(currentRoomNo);
                    /*console.log('[Notify] PushClient.init called for room:', currentRoomNo);*/

                    if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.addEventListener('message', function (event) {
                            /*console.log('[Notify] Message from Service Worker:', event.data);*/

                            if (event.data && event.data.type === 'push-received') {

                                showBrowserNotification(event.data.payload);

                                getMobileUnreadCount();

                                if ($('#mobileDrawer').hasClass('open')) loadMobileNotifications();

                            }
                        });
                    }                } else {
                    console.warn('[Notify] PushClient.init skipped. PushClient:', !!window.PushClient, '| currentRoomNo:', currentRoomNo);
                }
            }
        }, 100);

        window.addEventListener('storage', function (e) {
            if (e.key === 'RoomBed' || e.key === 'RoomNumber') {
                currentRoomNo = resolveRoomNo();
                if (currentRoomNo) {
                    getMobileUnreadCount();
                    getActiveCount();
                    if ($('#mobileDrawer').hasClass('open')) {
                        loadMobileNotifications();
                    }
                }
            }
        });

        $('#mobileNotificationTrigger').on('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            openMobileDrawer();
        });

        $('#mobileDrawerClose, #mobileDrawerOverlay').on('click', function () {
            closeMobileDrawer();
        });

        $('#markAllReadBtn').on('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            markAllNotificationsAsRead();
        });

        $('#logoutButton').on('click', openLogoutSheet);
        $('#cancelLogoutButton').on('click', closeLogoutSheet);
        $('#confirmLogoutButton').on('click', confirmLogout);

        $('#logoutSheet').on('click', function (e) {
            if (e.target === this) closeLogoutSheet();
        });

        $(document).on('click', '.order-card', function (e) {
            e.preventDefault();

            var $item = $(this);

            if ($item.hasClass('unread')) {
                $item.removeClass('unread').addClass('read');
                markNotificationAsRead($item.data('notification-id'));
                var currentBadge = parseInt($('#mobileBadgeCount').text(), 10) || 0;
                updateUnreadBadges(currentBadge > 0 ? currentBadge - 1 : 0);
            }

            if ($item.attr('data-navigable') !== '1') {
                return;
            }

            window.isNavigating = true;

            var orderId = $item.data('order-id');
            var serviceType = ($item.data('service') || 'SYSTEM').toUpperCase();

            if (serviceType.indexOf('FOOD') !== -1) {
                BedContext.go('FoodDining/OrderSuccess', { orderIds: orderId });
            } else {
                BedContext.go('Tracking', { RequestID: orderId });
            }
        });

        $(document).on('keydown', function (e) {
            if (e.key === 'Escape') {
                closeMobileDrawer();
                closeLogoutSheet();
            }
        });
    });

    window.getMobileUnreadCount = getMobileUnreadCount;
    window.loadMobileNotifications = loadMobileNotifications;
    window.getActiveCount = getActiveCount;
    window.showBrowserNotification = showBrowserNotification;
    window.UnifiedNotifications = {
        handleAction: handleUnifiedNotificationAction,
        getContext: function () { return currentNotifications.map(normalizeNotification); },
        load: loadMobileNotifications
    };

    window.addEventListener('unified-ai:action', function (event) {
        var action = event.detail;
        if (!action || !action.action || action.action.indexOf('notification.') !== 0) return;
        handleUnifiedNotificationAction(action, function (success, result, error) {
            if (window.UnifiedAIChild) window.UnifiedAIChild.respond(action, success, result, error);
        });
    });

})(jQuery);