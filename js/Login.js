/*var ISMULTITENANT = 0;*/
var HospitalList = [];
var selectedHospital = null;

function RaiseInvalid(message) {
    $("#LblLoginError").text(message || "The credentials you entered are incorrect.");
    $('#errorBar').css('display', 'flex').css('visibility', 'visible');
    $("#password").val('');
    $('#authBtn').prop('disabled', true);
    if (!$("#userid").val()) $('#userid').addClass('input-error');
    $("#userid").focus();

    setTimeout(function () {
        $('#errorBar').fadeOut(200);
        $('#userid').removeClass('input-error');
        $('#password').removeClass('input-error');
        $('#errorBar').css('display', 'none').css('visibility', 'hidden');
        $('#authBtn').prop('disabled', false);
    }, 2000);
}

function SetFalse() {
    $("#LblLoginError").css('visibility', 'hidden');
}

function smoothRedirect(url) {
    window.location = url;
}

function LoadHospitals(done) {
    if (!ISMULTITENANT) {
        HospitalList = [];
        if (done) done();
        return;
    }

    $.ajax({
        type: 'POST',
        url: 'Login.aspx/GetHospitals',
        data: '{}',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        success: function (res) {
            HospitalList = (res && res.d) || [];
            if (done) done();
        },
        error: function (xhr, status, err) {
            console.error('GetHospitals failed:', status, err, xhr.responseText);
            HospitalList = [];
            if (done) done();
        }
    });
}

function getLockedHospital() {
    if (!ISMULTITENANT || !HospitalList.length) return null;

    var q = new URLSearchParams(window.location.search).get('hospital');
    if (q) {
        var byCode = HospitalList.find(function (h) {
            return h.HospitalCode && h.HospitalCode.toLowerCase() === q.toLowerCase();
        });
        if (byCode) return byCode;
    }

    return null;
}

function renderHospitals() {
    var $c = $('#hospitalList');
    var $wrap = $('#hospitalWrap');

    if (!ISMULTITENANT) {
        $wrap.hide();
        selectedHospital = null;
        return;
    }

    if (!HospitalList || HospitalList.length === 0) {
        $c.html('<div style="color:#fca5a5;">No hospitals configured.</div>');
        $('#authBtn').prop('disabled', true);
        $wrap.show();
        return;
    }

    $wrap.show();

    var locked = getLockedHospital();
    var list = locked ? [locked] : HospitalList.slice().sort(function (a, b) {
        return a.SortOrder - b.SortOrder;
    });

    var html = '';
    list.forEach(function (h, i) {
        var code = h.HospitalCode || "";
        var name = h.DisplayName || "Unknown Hospital";
        var sub = h.Subtitle || "Hospital";
        var logo = h.LogoPath || "";

        html +=
            '<label class="hospital-option" for="hosp' + code + '">' +
            '<input type="radio" id="hosp' + code + '" name="hospital" value="' + code + '"' + (i === 0 ? ' checked' : '') + '>' +
            '<div class="hospital-card">' +
            '<img src="' + logo + '" alt="' + name + '">' +
            '<span class="hospital-name">' + name + '</span>' +
            '<span class="hospital-sub">' + sub + '</span>' +
            '</div>' +
            '</label>';
    });

    $c.html(html);

    var checked = $c.find('input[name="hospital"]:checked').val();
    if (checked) selectedHospital = checked;

    $c.off('change.hospital').on('change.hospital', 'input[name="hospital"]', function () {
        selectedHospital = $(this).val();
    });
}

function callCheckUser(userPlain, pwdPlain, hospitalCode) {
    ShowModalPopUp('ModalLoading');

    var UsID = encodeURIComponent(Encrypt(userPlain)),
        pwd = encodeURIComponent(Encrypt(pwdPlain));

    var url = ServiceURL + "Service.aspx?Process=CHECKUSER&USERNAME=" + UsID + "&PWD=" + pwd;

    if (ISMULTITENANT) {
        url += "&HOSPITAL=" + encodeURIComponent(Encrypt(hospitalCode));
    }

    $.ajax({
        async: true,
        url: url,
        type: 'POST',
        data: 'pData',
        dataType: 'json',
        success: function (data) {
            if (data[0].RESULT !== 'FALSE') {
                sessionStorage.setItem('HOSPITAL', hospitalCode);

                var resultStr = data[0].RESULT;

                var parts = resultStr.split('_');

                var userId = parts[0];            
                var userName = parts[1];          
                var roleId = parts[3];            
                var roleName = parts[5];          
                var redirectUrl = parts[parts.length - 1]; 

                sessionStorage.setItem('ID', userId);
                sessionStorage.setItem('NAME', userName);
                sessionStorage.setItem('ROLE', roleId);
                sessionStorage.setItem('ROLENAME', roleName);
                sessionStorage.setItem('LURL', redirectUrl);

                if (redirectUrl && redirectUrl.indexOf('.aspx') > -1) {
                    smoothRedirect(redirectUrl);
                } else {
                    HideModalPopUp('ModalLoading');
                    RaiseInvalid("Login successful, but no landing page was provided.");
                }
            } else {
                RaiseInvalid();
            }
            HideModalPopUp('ModalLoading');
        },
        error: function (xhr, status, err) {
            console.error('CHECKUSER failed:', status, err, xhr.responseText);
            HideModalPopUp('ModalLoading');
            RaiseInvalid("Connection error. Please try again.");
        }
    });
}

function ValidateLogin() {
    var userid = $("#userid"), Password = $("#password");

    if (userid.val().length === 0) {
        userid.focus();
        return;
    }
    if (Password.val().length === 0) {
        Password.focus();
        return;
    }

    if (ISMULTITENANT) {
        selectedHospital = $('input[name="hospital"]:checked').val() || selectedHospital;
        if (!selectedHospital) {
            RaiseInvalid("Please select a hospital.");
            return;
        }
        callCheckUser(userid.val(), Password.val(), selectedHospital);
    } else {
        callCheckUser(userid.val(), Password.val(), null);
    }
}

function autoLoginFromQuery() {
    if (!ISMULTITENANT) return;

    var p = new URLSearchParams(window.location.search);
    if (!p.has('lp') || !p.has('lu')) return;

    var h = (getLockedHospital() || {}).HospitalCode || $('input[name="hospital"]:checked').val();
    if (!h) return;

    callCheckUser(Base64.decode(p.get('lu')), Base64.decode(p.get('lp')), h);
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
    $('#' + ModalId).css('display', 'flex');
}

function HideModalPopUp(ModalId) {
    $('#' + ModalId).fadeOut(300);
}

$(document).ready(function () {

    if (typeof ISMULTITENANT === 'undefined') {
        ISMULTITENANT = 0;
    }

    LoadHospitals(function () {
        renderHospitals();
        autoLoginFromQuery();
    });
});