

$(document).on("click", "#btnAddAllergy", function () {
    ClearAllergyForm();
    $("#allergyModalHeader").text("Add New Allergy");
    $("#btnSaveAllergy").text("Create Allergy");
    $("#codeDisplayRow").hide();
    ShowModalPopUp("allergyModal");
});

function ClearAllergyForm() {
    $("#hdnAllergyCode").val("");
    $("#txtAllergyCodeDisplay").val("");
    $("#txtAllergyName").val("").removeClass("error-border");
    $("#errAllergyName").text("");
    $("#chkAllergyActive").prop("checked", true);
}

function LoadAllergies() {
    var searchText = ($("#txtSearchAllergy").val() || "").trim();
    var showInactive = $("#chkShowInactive").is(":checked") ? "1" : "0";

    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("ALLERGYMASTER")) +
        "&ACTION=" + encodeURIComponent(Encrypt("GETLIST")) +
        "&SEARCHTEXT=" + encodeURIComponent(Encrypt(searchText)) +
        "&SHOWINACTIVE=" + encodeURIComponent(Encrypt(showInactive));

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (res) {
            $("#tblAllergyBody").empty();

            if (res && res.length > 0) {
                $("#lblAllergyCount").text(res.length + (res.length === 1 ? " Item" : " Items"));

                $.each(res, function (i, item) {
                    var sNo = i + 1;
                    var isActive = item.ISACTIVE === true || item.ISACTIVE == 1;
                    var statusHtml = isActive
                        ? '<span class="status-active">Active</span>'
                        : '<span class="status-inactive">Inactive</span>';

                    var safeName = String(item.AllergyName || "")
                        .replace(/\\/g, "\\\\")
                        .replace(/'/g, "\\'")
                        .replace(/"/g, "&quot;");

                    var rowHtml =
                        '<tr>' +
                        '<td><span class="am-code-text">' + sNo + '</span></td>' +
                        '<td><span class="am-name-main">' + escapeHtml(item.AllergyName) + '</span></td>' +
                        '<td>' + statusHtml + '</td>' +
                        '<td class="action-col">' +
                        '<button type="button" class="action-btn edit-btn" title="Edit" onclick="EditAllergy(' + item.AllergyCode + '); return false;">' +
                        '<img src="../images/memo.png" width="18" />' +
                        '</button>' +
                        '<button type="button" class="action-btn delete-btn" title="Deactivate" onclick="DeleteAllergy(' + item.AllergyCode + ', \'' + safeName + '\'); return false;">' +
                        '<img src="../images/delete.png" width="18" />' +
                        '</button>' +
                        '</td>' +
                        '</tr>';

                    $("#tblAllergyBody").append(rowHtml);
                });
            } else {
                $("#lblAllergyCount").text("0 Items");
                $("#tblAllergyBody").append(
                    '<tr><td colspan="4" style="text-align:center; padding: 24px; color: #6b7280;">No allergies found</td></tr>'
                );
            }
        },
        error: function () {
            alert("Error loading allergy list.");
        }
    });
}

function SubmitAllergy() {
    var allergyCode = $("#hdnAllergyCode").val() || "";
    var allergyName = ($("#txtAllergyName").val() || "").trim();
    var isActive = $("#chkAllergyActive").is(":checked") ? "1" : "0";
    var action = allergyCode ? "UPDATE" : "INSERT";

    $("#errAllergyName").text("");
    $("#txtAllergyName").removeClass("error-border");

    if (allergyName.length === 0) {
        $("#txtAllergyName").addClass("error-border");
        $("#errAllergyName").text("Allergy name is required");
        setTimeout(function () {
            $("#txtAllergyName").removeClass("error-border");
            $("#errAllergyName").text("");
        }, 3000);
        return false;
    }

    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("ALLERGYMASTER")) +
        "&ACTION=" + encodeURIComponent(Encrypt(action)) +
        "&ALLERGYCODE=" + encodeURIComponent(Encrypt(allergyCode)) +
        "&ALLERGYNAME=" + encodeURIComponent(Encrypt(allergyName)) +
        "&ISACTIVE=" + encodeURIComponent(Encrypt(isActive));

    var $btn = $("#btnSaveAllergy").prop("disabled", true);

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (res) {
            var result = res && res.length > 0 ? String(res[0].RESULT).toUpperCase() : "";

            if (result === "TRUE") {
                HideModalPopUp("allergyModal");
                ClearAllergyForm();
                LoadAllergies();

                setTimeout(function () {
                    $("#LBLRequestResult").html(
                        action === "INSERT" ? "Allergy added successfully." : "Allergy updated successfully."
                    );
                    ShowModalPopUp("modalSuccess");
                    setTimeout(function () { HideModalPopUp("modalSuccess"); }, 2200);
                }, 250);
            } else if (result === "DUPLICATE") {
                $("#txtAllergyName").addClass("error-border");
                $("#errAllergyName").text("This allergy name already exists.");
            } else {
                alert("Failed to save allergy.");
            }
        },
        error: function () {
            alert("Ajax error while saving allergy.");
        },
        complete: function () {
            $btn.prop("disabled", false);
        }
    });
}

function EditAllergy(allergyCode) {
    ClearAllergyForm();

    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("ALLERGYMASTER")) +
        "&ACTION=" + encodeURIComponent(Encrypt("GETBYID")) +
        "&ALLERGYCODE=" + encodeURIComponent(Encrypt(String(allergyCode)));

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (res) {
            if (res && res.length > 0) {
                var item = res[0];
                $("#hdnAllergyCode").val(item.AllergyCode);
                $("#txtAllergyName").val(item.AllergyName);
                $("#chkAllergyActive").prop("checked", item.ISACTIVE === true || item.ISACTIVE == 1);
                
                $("#allergyModalHeader").text("Edit Allergy");
                $("#btnSaveAllergy").text("Save Changes");
                ShowModalPopUp("allergyModal");
            }
        },
        error: function () {
            alert("Error fetching allergy details.");
        }
    });
}

function DeleteAllergy(allergyCode, allergyName) {
    $("#lblDeleteAllergyName").text(allergyName);
    ShowModalPopUp("modalConfirmDelete");

    $("#btnCancelDelete").off("click").on("click", function () {
        HideModalPopUp("modalConfirmDelete");
    });

    $("#btnConfirmDelete").off("click").on("click", function () {
        HideModalPopUp("modalConfirmDelete");

        var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("ALLERGYMASTER")) +
            "&ACTION=" + encodeURIComponent(Encrypt("DELETE")) +
            "&ALLERGYCODE=" + encodeURIComponent(Encrypt(String(allergyCode)));

        $.ajax({
            url: url,
            type: "GET",
            dataType: "json",
            success: function (res) {
                if (res && res.length > 0 && String(res[0].RESULT).toUpperCase() === "TRUE") {
                    $("#LBLRequestResult").html("Allergy deactivated successfully.");
                    ShowModalPopUp("modalSuccess");
                    setTimeout(function () { HideModalPopUp("modalSuccess"); }, 2200);
                    LoadAllergies();
                } else {
                    alert("Failed to deactivate allergy.");
                }
            },
            error: function () {
                alert("Ajax error while deactivating allergy.");
            }
        });
    });
}

/* ---------- Notifications & Utilities ---------- */
function getRoleId() {
    return (sessionStorage.getItem('ROLE') || sessionStorage.getItem('ROLEID') || '').toString();
}

function LoadNotifications() {
    var roleId = getRoleId();
    var url = hurl + "Service/Service.aspx?Process=" +
        encodeURIComponent(Encrypt("GETNOTIFICATIONSLIST")) +
        "&MAXCOUNT=" + encodeURIComponent(Encrypt("20"));
    if (roleId) url += "&ROLEID=" + encodeURIComponent(Encrypt(roleId));

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        timeout: 5000,
        success: function (res) {
            RenderNotifications(res || []);
            GetUnreadCount();
        }
    });
}

function RenderNotifications(notifications) {
    var html = '';
    var unreadCount = 0;
    if (notifications && notifications.length > 0) {
        $.each(notifications, function (i, item) {
            var isRead = item.IS_READ === true || item.IS_READ === 1;
            if (!isRead) unreadCount++;
            var iconClass = (item.NOTIFICATION_TYPE || 'info').toLowerCase();
            var icon = getNotificationIcon(iconClass);
            var notificationId = item.NOTIFICATION_ID || item.ID || i;
            html += '<div class="notification-item' + (isRead ? ' read' : ' unread') + '" data-id="' + notificationId + '">' +
                '<div class="notification-icon ' + iconClass + '"><img src="' + icon + '" alt="' + iconClass + '"></div>' +
                '<div class="notification-content"><div class="notification-text"><h4>' + escapeHtml(item.NOTIFICATION_HEADER || '') + '</h4><p>' + escapeHtml(item.NOTIFICATION_MESSAGE || '') + '</p></div><div class="notification-time">' + escapeHtml(item.TIME_AGO || '') + '</div></div>' +
                (!isRead ? '<span class="unread-dot"></span>' : '') + '</div>';
        });
    } else {
        html = '<div class="notification-item" style="text-align:center;color:#888;padding:20px;">No new notifications</div>';
    }
    $('#notificationList').html(html);
    $('#notificationCount').text(unreadCount).toggleClass('show', unreadCount > 0);
}

function getNotificationIcon(type) {
    switch ((type || '').toLowerCase()) {
        case "error": return "../images/notification/warning.png";
        case "info": return "../images/notification/shield.png";
        case "success": return "../images/notification/thumbs-up.png";
        default: return "../images/notification/bell-icon.png";
    }
}

function GetUnreadCount() {
    var roleId = getRoleId();
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETUNREADNOTIFICATIONCOUNTS"));
    if (roleId) url += "&ROLEID=" + encodeURIComponent(Encrypt(roleId));

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        timeout: 5000,
        success: function (res) {
            var count = (res && res.length > 0) ? (res[0].UNREAD_COUNT || 0) : 0;
            $('#notificationCount').text(count).toggleClass('show', count > 0);
        }
    });
}

function MarkAllNotificationsAsRead() {
    var roleId = getRoleId();
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("MARKALLNOTIFICATIONSASREAD"));
    if (roleId) url += "&ROLEID=" + encodeURIComponent(Encrypt(roleId));

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        timeout: 5000,
        success: function () {
            LoadNotifications();
        }
    });
}

function escapeHtml(value) {
    if (value == null) return '';
    return String(value).replace(/[&<>"']/g, function (ch) {
        return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[ch];
    });
}

function Encrypt(Value) {
    var key = CryptoJS.enc.Utf8.parse(CryptoKey);
    var iv = CryptoJS.enc.Utf8.parse(CryptoPwd);
    return CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(Value), key, {
        keySize: 128 / 8,
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
}

function ShowModalPopUp(ModalId) {
    $('#' + ModalId).modal('show');
}

function HideModalPopUp(ModalId) {
    $('#' + ModalId).modal('hide');
}