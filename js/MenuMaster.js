

var COUNTRY_MAP = {};                    
var MODAL_ID = 'menuItemBasicModal';      
var MULTI_SELECTS = ['ddlAllowedDietTypes', 'ddlAllergens', 'ddlFoodTags'];

function getMulti(id) {
    return $('#' + id).val() || [];
}

function setMulti(id, arr) {
    var $s = $('#' + id);
    $s.val(arr || []);
    var el = $s[0];
    if (el && el.sumo) el.sumo.reload();
}

function initModalSelects() {
    $.each(MULTI_SELECTS, function (i, id) {
        var el = document.getElementById(id);
        if (el && !el.sumo) {
            $(el).SumoSelect({ csvDispCount: 3, search: true, searchText: 'Search...', placeholder: 'Select...' });
        }
    });
}

function toNum(id) {
    return ($('#' + id).val() || '').toString().trim();
}

function isBadNumber(v) {
    return v !== '' && (isNaN(v) || parseFloat(v) < 0);
}


var ROLE_NAME_BY_ID = {};  

function GetUserRoleName() {
    var keys = ['ROLENAME', 'ROLE_NAME', 'RoleName', 'ROLEDESC', 'USERROLE', 'USERTYPE', 'UTYPE', 'ROLETYPE'];
    var stores = [window.sessionStorage, window.localStorage];
    var i, j, v;
    for (i = 0; i < stores.length; i++) {
        for (j = 0; j < keys.length; j++) {
            try { v = stores[i].getItem(keys[j]); } catch (e) { v = null; }
            if (v && v.toString().trim() !== '' && isNaN(v)) return v.toString().trim();
        }
    }
    for (i = 0; i < stores.length; i++) {
        try {
            for (j = 0; j < stores[i].length; j++) {
                var k = stores[i].key(j);
                if (/ROLE/i.test(k)) {
                    v = stores[i].getItem(k);
                    if (v && isNaN(v)) return v.toString().trim();
                }
            }
        } catch (e) { }
    }
    var id = parseInt(sessionStorage.getItem('ROLE'));
    return ROLE_NAME_BY_ID[id] || '';
}

function buildMenuUrl(fields, action, id) {
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("INSERTUPDATEMENUITEM"));
    $.each(fields || {}, function (k, v) {
        url += "&" + k + "=" + encodeURIComponent(Encrypt(String(v == null ? '' : v)));
    });
    url += "&ACTION=" + encodeURIComponent(Encrypt(action)) +
        "&ID=" + encodeURIComponent(Encrypt(String(id == null ? '' : id)));
    return url;
}

$(document).on("change", ".meal-chip input[type='checkbox']", function () {
    if ($(this).is(":checked")) {
        $(".meal-chip input[type='checkbox']").not(this).prop("checked", false).closest(".meal-chip").removeClass("checked");
        $(this).closest(".meal-chip").addClass("checked");
    } else {
        $(this).closest(".meal-chip").removeClass("checked");
    }
});

$(document).on("change", "input[name='MealType']", function () {
    if ($(this).is(":checked")) { $("input[name='MealType']").not(this).prop("checked", false); }
});

function LoadDietTypeDropdown() {
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETDIETTYPEDROPDOWN"));

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (res) {
            var filterHtml = '<option value="">All Diet Types</option>';
            var modalHtml = '';
            $.each(res || [], function (i, item) {
                var label = item.CODE + ' · ' + item.NAME;
                filterHtml += '<option value="' + item.CODE + '">' + label + '</option>';
                modalHtml += '<option value="' + item.CODE + '" data-dietid="' + item.ID + '">' + label + '</option>';
            });

            $("#ddlDietType").html(filterHtml);
            if ($("#ddlDietType")[0].sumo) $("#ddlDietType")[0].sumo.reload();

            var keep = getMulti('ddlAllowedDietTypes');
            $("#ddlAllowedDietTypes").html(modalHtml);
            setMulti('ddlAllowedDietTypes', keep);
        },
        error: function (xhr, status, error) {
            console.error("Error loading diet master list:", error);
        }
    });
}

function LoadAllergenDropdown() {
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("ALLERGYMASTER")) +
        "&ACTION=" + encodeURIComponent(Encrypt("GETLIST")) +
        "&SEARCHTEXT=" + encodeURIComponent(Encrypt("")) +
        "&SHOWINACTIVE=" + encodeURIComponent(Encrypt("0"));

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (res) {
            var list = Array.isArray(res)
                ? res
                : (res && res.Tables && res.Tables[0] && res.Tables[0].Rows ? res.Tables[0].Rows : []);

            var modalHtml = '';
            $.each(list, function (i, item) {
                var isActive = item.ISACTIVE === undefined || item.ISACTIVE === true || item.ISACTIVE == 1;
                if (!isActive) return;

                var allergyName = (item.AllergyName || item.ALLERGYNAME || item.NAME || "").trim();
                if (!allergyName) return;

                modalHtml += '<option value="' + escapeHtml(allergyName.toLowerCase()) + '">' + escapeHtml(allergyName) + '</option>';
            });

            var keep = getMulti('ddlAllergens');
            $("#ddlAllergens").html(modalHtml);
            setMulti('ddlAllergens', keep);
        },
        error: function (xhr, status, error) {
            console.error("Error loading allergy master list:", error);
        }
    });
}
function LoadCountryDropdowns() {
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETCOUNTRIES"));
    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (res) {
            var filterHtml = '<option value="">All Countries</option>';
            var modalHtml = '<option value="">Select Country</option>';
            COUNTRY_MAP = {};

            if (res && res.length > 0) {
                $.each(res, function (i, item) {
                    filterHtml += '<option value="' + item.ID + '">' + item.CountryName + '</option>';
                    modalHtml += '<option value="' + item.ID + '">' + item.CountryName + '</option>';
                    COUNTRY_MAP[String(item.CountryName).trim().toLowerCase()] = String(item.ID);
                });
            }
            $("#ddlCountryFilter").html(filterHtml);
            $("#ddlModalCountry").html(modalHtml);

            if ($("#ddlCountryFilter")[0].sumo) $("#ddlCountryFilter")[0].sumo.reload();
            if ($("#ddlModalCountry")[0].sumo) $("#ddlModalCountry")[0].sumo.reload();
        }
    });
}

function LoadServingTimings() {
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETSERVINGLIST"));

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (res) {
            var html = "";
            $.each(res || [], function (i, item) {
                html += `
                    <label class="serving-checkbox-card">
                        <div class="serving-header">
                            <input type="checkbox" class="serving-checkbox" value="${item.CODE}" />
                            <span class="serving-name">${item.NAME}</span>
                        </div>
                        <div class="serving-time">${item.StartTime} - ${item.EndTime}</div>
                    </label>`;
            });
            $("#servingTimingList").html(html);
        }
    });
}

function LoadCategories() {
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETSERVINGLIST"));
    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (res) {
            var html = "";
            html += `<button type="button" class="category-btn" data-value="DEFAULT"><span class="category-icon">⭐</span><span class="category-name"> Default Food</span></button>`;
            html += `<button type="button" class="category-btn active" data-value=""><span class="category-icon">🍽️</span><span class="category-name">All Servings</span></button>`;
            $.each(res || [], function (i, item) {
                var iconHtml = "";
                if (item.IMGPATH && item.IMGPATH.trim() !== "") {
                    iconHtml = `<img src="${item.IMGPATH}" class="category-icon-img" alt="${item.NAME}" onerror="this.style.display='none';" />`;
                } else {
                    iconHtml = `<span class="category-icon">🍽️</span>`;
                }
                html += `<button type="button" class="category-btn" data-value="${item.CODE}"> ${iconHtml}<span class="category-name">${item.NAME} </span></button>`;
            });
            $("#categoryList").html(html);
            $("#HFServingCode").val("");
        },
        error: function (xhr, status, error) {
            console.log("Error loading categories:", error);
        }
    });
}

function CreateMenuItem(ActionType) {
    var Id = $("#hdnMenuId").val();
    var Action = ActionType || (Id ? "UPDATE" : "INSERT");

    if (Action == "DELETE") {
        $.ajax({
            url: buildMenuUrl({}, "DELETE", Id),
            type: "GET",
            dataType: "json",
            success: function (res) {
                var result = res && res[0] ? res[0].RESULT : "";
                if (String(result).toUpperCase() == "TRUE") {
                    $('#LBLRequestResult').html('Menu Item Deactivated Successfully');
                    ShowModalPopUp('modalSuccess');
                    setTimeout(function () { HideModalPopUp('modalSuccess'); }, 2500);
                    $("#deleteMenuModal").modal("hide");
                    LoadMenuTypes();
                } else {
                    alert("Failed to deactivate menu item");
                }
            },
            error: function (xhr, status, error) {
                console.log(error);
                alert("Ajax error");
            }
        });
        return false;
    }

    var MenuName = ($("#txtMenuName").val() || "").trim();
    var AllowedDietTypes = getMulti('ddlAllowedDietTypes');
    var ServingCodes = [];
    $("#servingTimingList input[type='checkbox']:checked").each(function () {
        ServingCodes.push($(this).val());
    });

    var isValid = true;
    $("#errMenuName, #errDietType").removeClass("show").hide();
    $("#txtMenuName").removeClass("error-border");
    $("#ddlAllowedDietTypes").closest(".SumoSelect").removeClass("error-border");
    $("#menuItemBasicModal .menu-input").removeClass("error-border");

    if (MenuName.length == 0) {
        $("#txtMenuName").addClass("error-border");
        $("#errMenuName").text("Name is required").show();
        isValid = false;
    }

    if (AllowedDietTypes.length == 0) {
        $("#ddlAllowedDietTypes").closest(".SumoSelect").addClass("error-border");
        $("#errDietType").text("Pick at least one diet").show();
        isValid = false;
    }

    $.each(['txtCalories', 'txtPrice', 'txtProtein', 'txtCarbs', 'txtTotalFat', 'txtSodium', 'txtSugar'], function (i, id) {
        if (isBadNumber(toNum(id))) {
            $("#" + id).addClass("error-border");
            isValid = false;
        }
    });

    if (!isValid) {
        setTimeout(function () {
            $("#menuItemBasicModal .error-border").removeClass("error-border");
            $("#errMenuName, #errDietType").hide();
        }, 3500);
        return false;
    }

    var fields = {
        FOODNAME: MenuName,
        DESCRIPTION: ($("#txtDescription").val() || "").trim(),
        CATEGORY: $("#ddlCategory").val() || "",
        DAY: $("#ddlDay").val() || "0",
        SERVINGCODE: ServingCodes.join(","),
        ALLOWEDDIETTYPE: AllowedDietTypes.join(","),
        DIETARYTYPE: $("#ddlDietaryType").val() || "",
        IMAGEPATH: ($("#txtImageUrl").val() || "").trim(),
        ISACTIVE: $("#chkActive").is(":checked") ? "1" : "2",
        ISDEFAULTORDER: $("#chkDefaultOrder").is(":checked") ? "1" : "0",
        ALLERGENS: getMulti('ddlAllergens').join(","),
        TAGS: getMulti('ddlFoodTags').join(","),
        COUNTRYID: $("#ddlModalCountry").val() || "0",
        CALORIES: toNum('txtCalories'),
        PRICE: toNum('txtPrice'),
        HISID: ($("#txtHISID").val() || "").trim(),
        VENDOR: ($("#txtVendor").val() || "").trim(),
        PROTEIN: toNum('txtProtein'),
        CARBS: toNum('txtCarbs'),
        TOTALFAT: toNum('txtTotalFat'),
        SODIUM: toNum('txtSodium'),
        SUGAR: toNum('txtSugar'),
        INGREDIENTS: ($("#txtIngredients").val() || "").trim()
    };

    var $btn = $("#btnCreateMenu").prop("disabled", true);

    $.ajax({
        url: buildMenuUrl(fields, Action, Id),
        type: "GET",
        dataType: "json",
        success: function (res) {
            var result = res && res[0] ? res[0].RESULT : "";
            if (String(result).toUpperCase() == "TRUE") {
                $('#LBLRequestResult').html(Action == "INSERT" ? 'Menu Item Added Successfully' : 'Menu Item Updated Successfully');
                HideModalPopUp(MODAL_ID);
                ShowModalPopUp('modalSuccess');
                setTimeout(function () { HideModalPopUp('modalSuccess'); }, 2500);
                ClearMenuItem();
                LoadMenuTypes();
            } else {
                alert("Failed to save menu item");
            }
        },
        error: function (xhr, status, error) {
            console.log(error);
            alert("Ajax error");
        },
        complete: function () {
            $btn.prop("disabled", false);
        }
    });
}

function ClearMenuItem() {
    $("#hdnMenuId").val("");
    $("#txtMenuName, #txtDescription, #txtCalories, #txtPrice, #txtHISID, #txtVendor, #txtImageUrl").val('');
    $("#ddlDietaryType").val('');
    $("#ddlModalCountry").prop('selectedIndex', 0);
    if ($("#ddlModalCountry")[0] && $("#ddlModalCountry")[0].sumo) {
        $("#ddlModalCountry")[0].sumo.unSelectAll();
    }
    $("#chkActive").prop('checked', true);
    $("#chkDefaultOrder").prop('checked', false);
    $("#txtProtein, #txtCarbs, #txtTotalFat, #txtSodium, #txtSugar, #txtIngredients").val('');
    $("#ddlCategory").val('');
    $("#ddlDay").val('0');
    $("#servingTimingList input[type='checkbox']").prop('checked', false);
    $.each(MULTI_SELECTS, function (i, id) { setMulti(id, []); });
    $("#errMenuName, #errDietType").hide();
    $("#menuItemBasicModal .error-border").removeClass("error-border");
}

function LoadMenuTypes() {
    var SearchText = ($("#txtSearch").val() || "").trim();
    var Servingcode = $("#HFServingCode").val();
    var DietType = $("#ddlDietType").val();
    var CountryId = $("#ddlCountryFilter").val();
    var IncludeInactive = $("#btnInactive").hasClass("active") ? "1" : "0";

    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETMENUTYPELIST")) +
        "&SEARCHTEXT=" + encodeURIComponent(Encrypt(SearchText)) +
        "&SERVINGCODE=" + encodeURIComponent(Encrypt(Servingcode || "")) +
        "&DIETTYPE=" + encodeURIComponent(Encrypt(DietType || "")) +
        "&COUNTRYID=" + encodeURIComponent(Encrypt(CountryId || "")) +
        "&INCLUDEINACTIVE=" + encodeURIComponent(Encrypt(IncludeInactive));

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (res) {
            $("#tblMenuMaster").html('');
            if (res == null || res.length == 0) {
                $("#tblMenuMaster").html(
                    '<tr><td colspan="9" style="text-align:center; padding:20px; color:#555;">' +
                    'No menu items found. Click "Add Menu Item" to create the first one.' +
                    '</td></tr>'
                );
                $("#lblItemCount").text("0 Items");
                return;
            }

            var html = '';
            $.each(res, function (i, item) {
                var statusClass = item.ISACTIVE == 1 ? "active" : "inactive";
                var statusText = item.ISACTIVE == 1 ? "Active" : "Inactive";
                var createPills = function (data, cssClass) {
                    if (!data || data.trim() == "" || data.toLowerCase() == "none")
                        return '<span class="text-none">None</span>';
                    return data.split(',').map(function (tag) {
                        return '<span class="badge-pill ' + cssClass + '">' + escapeHtml(tag.trim()) + '</span>';
                    }).join('');
                };

                html += '<tr>';
                html += '<td>';
                if (item.IMAGEPATH && item.IMAGEPATH.trim() != '') {
                    html += '<img src="' + item.IMAGEPATH + '" class="menu-item-image" ' +
                        'onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\';" />' +
                        '<div class="img-placeholder" style="display:none;">' +
                        '<img src="../images/image-placeholder.png" width="22" />' +
                        '</div>';
                } else {
                    html += '<div class="img-placeholder">' +
                        '<img src="../images/image-placeholder.png" width="22" />' +
                        '</div>';
                }
                html += '</td>';

                html += '<td>' +
                    '<div class="menu-name-cell">' +
                    '<span class="menu-name-title">' + escapeHtml(item.FOODNAME) + '</span>' +
                    '<span class="menu-name-desc">' + escapeHtml(item.DESCRIPTION || "") + '</span>' +
                    '</div>' +
                    '</td>';

                html += '<td>' + escapeHtml(item.COUNTRYNAME || item.COUNTRY || '-') + '</td>';
                html += '<td>' + (item.CALORIES || '-') + '</td>';
                html += '<td>' + createPills(item.ALLOWEDDIETTYPE, 'badge-diet') + '</td>';
                html += '<td>' + createPills(item.ALLERGENS, 'badge-allergen') + '</td>';
                html += '<td class="text-center">' +
                    '<input type="checkbox" class="default-food-checkbox" ' +
                    (item.ISDEFAULTORDER === true || item.ISDEFAULTORDER == 1 ? 'checked' : '') +
                    ' onchange="UpdateDefaultFood(' + item.ID + ', this.checked)" />' +
                    '</td>';
                html += '<td>' +
                    '<span class="status-badge ' + statusClass + '">' +
                    '<span class="status-dot"></span>' + statusText +
                    '</span>' +
                    '</td>';
                html += '<td>' +
                    '<button type="button" class="action-btn edit-btn" onclick="EditMenuType(' + item.ID + '); return false;">' +
                    '<img src="../images/memo.png" width="18" />' +
                    '</button>' +
                    '<button type="button" class="action-btn delete-btn" onclick="ShowDeleteMenu(' + item.ID + ',\'' + String(item.FOODNAME).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;") + '\'); return false;">' +
                    '<img src="../images/delete.png" width="18" />' +
                    '</button>' +
                    '</td>';
                html += '</tr>';
            });

            $("#tblMenuMaster").html(html);
            $("#lblItemCount").text(res.length + " Items");
        },
        error: function (xhr, status, error) {
            console.log(error);
        }
    });
}

function UpdateDefaultFood(id, isChecked) {
    var isDefault = isChecked ? 1 : 0;

    var url = hurl + "Service/Service.aspx?Process=" +
        encodeURIComponent(Encrypt("UPDATEDEFAULTFOOD")) +
        "&ID=" + encodeURIComponent(Encrypt(id.toString())) +
        "&ISDEFAULTFOOD=" + encodeURIComponent(Encrypt(isDefault.toString()));

    $.ajax({
        url: url,
        type: "POST",
        success: function () {
            $('#LBLRequestResult').html(isChecked
                ? "Menu item marked as default food successfully."
                : "Menu item removed from default food successfully.");
            ShowModalPopUp('modalSuccess');
            setTimeout(function () { HideModalPopUp('modalSuccess'); }, 2500);
        },
        error: function () {
            alert("Failed to update default food.");
            LoadMenuTypes();
        }
    });
}

function ShowDeleteMenu(ID, Name) {
    $("#hdnDeleteMenuId").val(ID);
    $("#lblDeleteMenuName").text(Name);
    $("#deleteMenuModal").modal("show");
}

function ConfirmDeleteMenu() {
    $("#hdnMenuId").val($("#hdnDeleteMenuId").val());
    CreateMenuItem("DELETE");
    $("#deleteMenuModal").modal("hide");
}

function OpenNewMenuItem() {
    ClearMenuItem();
    $("#BasicModalHeader").text("New menu item");
    $("#btnCreateMenu").text("Save menu item");
    ShowModalPopUp(MODAL_ID);
}

function EditMenuType(ID) {
    ClearMenuItem();
    $("#hdnMenuId").val(ID);
    $("#BasicModalHeader").text("Edit menu item");
    $("#btnCreateMenu").text("Save changes");
    ShowModalPopUp(MODAL_ID);
    GetMenuTypeById(ID);
}

function splitCsv(v) {
    if (!v) return [];
    return String(v).split(',').map(function (x) { return $.trim(x); }).filter(function (x) { return x !== ''; });
}

function GetMenuTypeById(ID) {
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETMENUTYPEBYID")) +
        "&ID=" + encodeURIComponent(Encrypt(ID));
    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (res) {
            if (!res || res.length == 0) return;
            var item = res[0];
            $("#txtMenuName").val(item.FOODNAME);
            $("#txtDescription").val(item.DESCRIPTION);
            $("#txtCalories").val(item.CALORIES || '');
            $("#ddlDietaryType").val(item.DIETARYTYPE || '');
            $("#txtPrice").val(item.PRICE || '');
            $("#txtHISID").val(item.HISID || '');
            $("#txtVendor").val(item.VENDOR || '');
            $("#txtImageUrl").val(item.IMAGEPATH);
            $("#chkActive").prop("checked", item.ISACTIVE == 1);
            $("#chkDefaultOrder").prop("checked", item.ISDEFAULTORDER === true || item.ISDEFAULTORDER == 1);

            setTimeout(function () {
                if (item.COUNTRYID) {
                    $("#ddlModalCountry").val(item.COUNTRYID);
                    if ($("#ddlModalCountry")[0] && $("#ddlModalCountry")[0].sumo) {
                        $("#ddlModalCountry")[0].sumo.selectItem(String(item.COUNTRYID));
                    }
                }
            }, 150);

            $("#txtProtein").val(item.PROTEIN || '');
            $("#txtCarbs").val(item.CARBS || '');
            $("#txtTotalFat").val(item.TOTALFAT || '');
            $("#txtSodium").val(item.SODIUM || '');
            $("#txtSugar").val(item.SUGAR || '');
            $("#txtIngredients").val(item.INGREDIENTS || '');
            $("#ddlCategory").val(item.CATEGORY || '');
            $("#ddlDay").val(item.DAY != null && item.DAY !== '' ? String(item.DAY) : '0');

            $("#servingTimingList input[type='checkbox']").prop("checked", false);
            $.each(splitCsv(item.SERVINGCODE), function (i, value) {
                $("#servingTimingList input[value='" + value + "']").prop("checked", true);
            });

            setMulti('ddlAllowedDietTypes', splitCsv(item.ALLOWEDDIETTYPE));
            setMulti('ddlAllergens', splitCsv(item.ALLERGENS).map(function (x) { return x.toLowerCase(); }));
            setMulti('ddlFoodTags', splitCsv(item.TAGS).map(function (x) { return x.toLowerCase().replace(/\s+/g, '-'); }));
        },
        error: function (xhr, status, error) {
            console.log(error);
            alert("Failed to load menu item");
        }
    });
}

$(document).on('change', '#ddlCountryFilter', function () {
    LoadMenuTypes();
});
$(document).on("keyup", "#txtSearch", function () {
    LoadMenuTypes();
});
$(document).on("click", ".category-btn", function () {
    $(".category-btn").removeClass("active");
    $(this).addClass("active");
    $("#HFServingCode").val($(this).attr("data-value") || "");
    LoadMenuTypes();
});
$(document).on("click", ".timing-btn", function () {
    $(".timing-btn").removeClass("active");
    $(this).addClass("active");
    LoadMenuTypes();
});
$(document).on("change", "#ddlDietType", function () {
    LoadMenuTypes();
});
$(document).on("click", "#btnInactive", function () {
    $(this).toggleClass("active");
    LoadMenuTypes();
});


var psCurrentPage = 1;
var psRowsPerPage = 10;
var psAllFeedback = [];
var psFilteredFeedback = [];
var psTotalPages = 1;
var selectedPreorderDate = null;
var mealAvailabilityData = [];
var currentPickerMonth = null;
var currentPickerYear = null;
var selectedRecommendedFoods = [];
var defaultOrdersMap = new Map();
var defaultSelectedMap = new Map();
var currentActiveMealType = "";
var defaultOrdersExpanded = false;
var FOOD_MENU = {};
var currentMeal = "";
var selections = {};
var MEAL_ICONS = {};
var mealTypesList = [];
var MEAL_ORDER = {};

function getMealIcon(mealType) {
    if (MEAL_ICONS[mealType]) {
        return MEAL_ICONS[mealType];
    }
    return '../images/servings_default.png';
}

function getLocalDateString(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function escapeHtml(value) {
    if (!value) return '';
    return String(value).replace(/[&<>"']/g, function (ch) {
        return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[ch];
    });
}

function escapeXml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function hasMealEnded(service) {
    var now = new Date();
    var end = new Date();
    var parts = service.EndTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!parts) return false;
    var hour = parseInt(parts[1], 10);
    var minute = parseInt(parts[2], 10);
    var ampm = parts[3].toUpperCase();
    if (ampm === "PM" && hour !== 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    end.setHours(hour, minute, 0, 0);
    if (service.MealType === "Dinner") {
        if (now.getHours() < 4) {
            end.setDate(end.getDate());
        } else {
            end.setDate(end.getDate() + 1);
        }
    }
    return now > end;
}

function parseTodayOrders(selectedOption) {
    var raw = selectedOption ? (selectedOption.dataset.todayOrders || '[]') : '[]';
    try {
        var parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function updateDefaultOrderVisibility() {
    var wrapper = document.getElementById("defaultOrdersWrapper");
    var room = document.getElementById("ddlRoomNo");
    var preorder = document.getElementById("chkPreBook");
    if (!wrapper) return;
    if (preorder && room && preorder.checked && room.value) {
        wrapper.style.display = "block";
    } else {
        wrapper.style.display = "none";
        defaultOrdersExpanded = false;
        var section = document.getElementById("defaultOrdersSection");
        var arrow = document.getElementById("defaultOrdersArrow");
        if (section) section.classList.add("collapsed");
        if (arrow) arrow.classList.remove("rotated");
    }
}

function toggleDefaultOrders() {
    var section = document.getElementById("defaultOrdersSection");
    var arrow = document.getElementById("defaultOrdersArrow");
    if (!section || !arrow) return;
    defaultOrdersExpanded = !defaultOrdersExpanded;
    if (defaultOrdersExpanded) {
        section.classList.remove("collapsed");
        arrow.classList.add("rotated");
    } else {
        section.classList.add("collapsed");
        arrow.classList.remove("rotated");
    }
}

function shouldShowOrder(item) {
    var chkPreBook = document.getElementById("chkPreBook");
    var isPreBook = chkPreBook ? chkPreBook.checked : false;
    var today = getLocalDateString(new Date());
    var orderDate = item.ORDERDATE ? getLocalDateString(new Date(item.ORDERDATE)) : today;
    var currentMealVal = currentActiveMealType || (mealTypesList.length > 0 ? mealTypesList[0] : '');
    if (!isPreBook) {
        return item.MEALTYPE === currentMealVal;
    }
    if (orderDate === today) {
        return MEAL_ORDER[item.MEALTYPE] >= MEAL_ORDER[currentMealVal];
    }
    return true;
}

function updateDefaultOrdersUI() {
    var listContainer = document.getElementById("defaultOrdersList");
    var countLabel = document.getElementById("defaultOrdersCountLabel");
    var countBadge = document.getElementById("defaultOrdersCount");
    if (!listContainer) return;
    var totalItems = defaultOrdersMap.size;
    if (countLabel) {
        countLabel.textContent = totalItems + ' item' + (totalItems !== 1 ? 's' : '');
    }
    if (countBadge) {
        countBadge.textContent = totalItems;
    }
    var subtitle = document.getElementById('defaultSubtitle');
    if (subtitle) {
        if (totalItems === 0) {
            subtitle.textContent = 'No saved meals';
        } else {
            subtitle.textContent = 'Previous saved meals for this patient';
        }
    }
    if (totalItems === 0) {
        listContainer.innerHTML = '<div class="empty-state"><div class="empty-icon"><img src="../images/orders-icon.png" alt="No orders"></div><span class="empty-title">No Default Food Available</span><span class="empty-subtitle">Previous meals will appear here</span></div>';
        return;
    }
    listContainer.innerHTML = '';
    defaultOrdersMap.forEach(function (item, key) {
        var itemCard = document.createElement("div");
        itemCard.className = "default-food-card";
        var mealTagClass = item.mealType ? item.mealType.toLowerCase() : '';
        var mealIcon = getMealIcon(item.mealType);
        itemCard.innerHTML = '<div class="card-content">'
            + '<div class="card-top-row">'
            + '<div class="default-food-icon"><img src="' + mealIcon + '" alt="' + item.mealType + '"></div>'
            + '<div class="food-meta">'
            + '<span class="default-meal-tag ' + mealTagClass + '"><img class="meal-tag-icon" src="' + mealIcon + '" alt="">' + item.mealType + '</span>'
            + '<span class="default-food-qty">x' + (item.qty || 1) + '</span>'
            + '</div>'
            + '<button class="default-delete-btn" onclick="event.stopPropagation(); removeDefaultOrder(\'' + key + '\', \'' + escapeHtml(item.name) + '\')"><img src="../images/delete-icon.png" alt="Remove"></button>'
            + '</div>'
            + '<span class="default-food-name">' + escapeHtml(item.name) + '</span>'
            + '</div>';
        listContainer.appendChild(itemCard);
    });
    setTimeout(function () {
        if (listContainer.scrollWidth > listContainer.clientWidth) {
            listContainer.classList.add('has-scroll');
        } else {
            listContainer.classList.remove('has-scroll');
        }
    }, 100);
}

function renderDefaultOrders(orders) {
    defaultOrdersMap.clear();
    if (!orders || orders.length === 0) {
        updateDefaultOrdersUI();
        updateDefaultOrderVisibility();
        return;
    }
    orders.forEach(function (item) {
        if (!shouldShowOrder(item)) return;
        var uniqueKey = item.MEALTYPE + '-' + (item.ITEMID || 0);
        defaultOrdersMap.set(uniqueKey, {
            id: item.ITEMID || 0,
            name: item.ITEMNAME,
            desc: item.ITEMDESC || '',
            mealType: item.MEALTYPE,
            qty: item.QUANTITY || 1,
            orderId: item.ORDERID,
            prescribed: item.DEFAULT_PREORDER == 1 && item.ACTIVE_PREORDER == 1
        });
    });
    updateDefaultOrdersUI();
    updateDefaultOrderVisibility();
}

function addDefaultOrder(foodItem) {
    var uniqueKey = currentActiveMealType + '-' + foodItem.id;
    if (!defaultOrdersMap.has(uniqueKey)) {
        defaultOrdersMap.set(uniqueKey, {
            id: foodItem.id,
            name: foodItem.name,
            desc: foodItem.desc || '',
            mealType: currentActiveMealType,
            qty: foodItem.qty || 1,
            prescribed: foodItem.prescribed || false
        });
        updateDefaultOrdersUI();
        return true;
    }
    return false;
}

function removeDefaultOrder(uniqueKey, itemName) {
    defaultOrdersMap.delete(uniqueKey);
    updateDefaultOrdersUI();
    ShowToast(itemName + ' removed from default orders', 'info');
}

function toggleDefaultSelected() {
    var content = document.getElementById("defaultSelectedContent");
    var section = document.getElementById("defaultSelectedSection");
    var label = document.querySelector(".default-selected-label");
    var arrow = document.getElementById("defaultSelectedArrow");
    if (!content || !section) return;
    if (section.classList.contains("expanded")) {
        section.classList.remove("expanded");
        if (label) label.classList.remove("expanded");
        if (arrow) arrow.classList.remove("rotated");
    } else {
        section.classList.add("expanded");
        if (label) label.classList.add("expanded");
        if (arrow) arrow.classList.add("rotated");
    }
}

function updateDefaultSelectedUI() {
    var listContainer = document.getElementById("defaultSelectedList");
    var countBadge = document.getElementById("defaultSelectedCount");
    var wrapper = document.getElementById("defaultSelectedWrapper");
    var section = document.getElementById("defaultSelectedSection");
    var label = document.querySelector(".default-selected-label");
    var arrow = document.getElementById("defaultSelectedArrow");
    if (!listContainer) return;
    var totalItems = defaultSelectedMap.size;
    if (countBadge) {
        countBadge.textContent = totalItems;
    }
    if (wrapper) {
        if (totalItems > 0) {
            wrapper.style.display = "block";
            wrapper.classList.add("has-items");
            if (section && !section.classList.contains("expanded")) {
                section.classList.add("expanded");
                if (label) label.classList.add("expanded");
                if (arrow) arrow.classList.add("rotated");
            }
        } else {
            wrapper.style.display = "none";
            wrapper.classList.remove("has-items");
            if (section) section.classList.remove("expanded");
            if (label) label.classList.remove("expanded");
            if (arrow) arrow.classList.remove("rotated");
        }
    }
    if (totalItems === 0) {
        listContainer.innerHTML = '<div class="default-selected-empty"><div class="empty-icon-large"><img src="../images/food-order.png" alt="No items"></div><span class="empty-title-large">No Default Food Available</span><span class="empty-subtitle-large">No predefined food has been assigned for this meal.</span></div>';
        return;
    }
    listContainer.innerHTML = '';
    var colorIndex = 0;
    defaultSelectedMap.forEach(function (item, key) {
        colorIndex = (colorIndex % 15) + 1;
        var mealClass = 'color-' + colorIndex;
        var mealIcon = item.imagePath || getMealIcon(item.mealType);
        var mealDisplay = item.mealType || 'Meal';
        var card = document.createElement("div");
        card.className = "default-selected-card";
        card.innerHTML = '<div class="food-card-image"><span class="badge-prescribed">Today\'s menu</span><div class="food-card-icon"><img src="' + mealIcon + '" alt="' + mealDisplay + '" onerror="this.src=\'../images/servings_default.png\'; this.onerror=null;"></div></div><div class="food-card-body"><div class="food-card-title-row"><span class="food-card-title">' + escapeHtml(item.name) + '</span><span class="meal-badge ' + mealClass + '">' + mealDisplay + '</span></div><div class="food-card-desc">' + escapeHtml(item.desc || mealDisplay + ' item') + '</div><div class="food-card-footer"><span class="qty-badge">Qty: <span class="qty-number">' + (item.qty || 1) + '</span></span><button type="button" class="btn-remove" onclick="event.stopPropagation(); removeDefaultSelected(\'' + key + '\')"><img src="../images/delete-icon.png" alt="Remove"> Remove</button></div></div>';
        listContainer.appendChild(card);
    });
    setTimeout(function () {
        if (listContainer.scrollWidth > listContainer.clientWidth) {
            listContainer.classList.add('has-scroll');
        } else {
            listContainer.classList.remove('has-scroll');
        }
    }, 100);
}

function addDefaultSelected(foodItem) {
    var uniqueKey = currentActiveMealType + '-' + foodItem.id;
    if (!defaultSelectedMap.has(uniqueKey)) {
        var mealIcon = getMealIcon(currentActiveMealType);
        var qty = foodItem.qty || 1;
        defaultSelectedMap.set(uniqueKey, {
            id: foodItem.id,
            name: foodItem.name,
            desc: foodItem.desc || '',
            mealType: currentActiveMealType,
            qty: qty,
            prescribed: foodItem.prescribed || false,
            imagePath: foodItem.imagePath || mealIcon
        });
        updateDefaultSelectedUI();
        return true;
    }
    return false;
}

function removeDefaultSelected(uniqueKey, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (!uniqueKey) return;
    var ddl = document.getElementById("ddlRoomNo");
    var selectedOption = ddl ? ddl.options[ddl.selectedIndex] : null;
    var roomNo = selectedOption ? selectedOption.value : '';
    var patientId = selectedOption ? selectedOption.dataset.patientId : 0;
    if (!roomNo || !patientId) {
        ShowToast('Please select a patient first.', 'error');
        return;
    }
    var item = defaultSelectedMap.get(uniqueKey);
    if (!item) {
        ShowToast('Item not found.', 'error');
        return;
    }
    var orderId = item.orderId;
    if (!orderId) {
        defaultSelectedMap.delete(uniqueKey);
        updateDefaultSelectedUI();
        ShowToast('Item removed from selection', 'info');
        return;
    }
    openRemoveConfirmModal(uniqueKey, item.name);
}

function openRemoveConfirmModal(uniqueKey, itemName) {
    var overlay = document.getElementById('deleteModalOverlay');
    var modal = document.getElementById('deleteModalnew');
    var title = document.getElementById('deleteModalTitle');
    var body = document.querySelector('#deleteModalnew .cancel-modal-body p');
    var keepBtn = document.getElementById('btnKeepUser');
    var yesBtn = document.getElementById('btnYesDelete');
    if (!overlay || !modal) {
        ShowToast('Modal not found.', 'error');
        return;
    }
    title.textContent = 'Remove Today\'s Selected Menu?';
    body.innerHTML = 'Are you sure you want to remove "<strong id="deleteUserName" class="user-name-highlight">' + escapeHtml(itemName) + '</strong>" from today\'s selected menu?';
    keepBtn.textContent = 'Cancel';
    yesBtn.textContent = 'Yes, remove item';
    overlay.classList.add('show');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    window._removeConfirmData = {
        uniqueKey: uniqueKey,
        itemName: itemName
    };
    var newKeepBtn = keepBtn.cloneNode(true);
    var newYesBtn = yesBtn.cloneNode(true);
    keepBtn.parentNode.replaceChild(newKeepBtn, keepBtn);
    yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
    newKeepBtn.onclick = function () {
        closeRemoveConfirmModal();
    };
    newYesBtn.onclick = function () {
        var data = window._removeConfirmData;
        if (data) {
            confirmRemoveDefaultSelected(data.uniqueKey);
        }
        closeRemoveConfirmModal();
    };
    overlay.onclick = function () {
        closeRemoveConfirmModal();
    };
}

function closeRemoveConfirmModal() {
    var overlay = document.getElementById('deleteModalOverlay');
    var modal = document.getElementById('deleteModalnew');
    if (overlay) overlay.classList.remove('show');
    if (modal) modal.classList.remove('show');
    document.body.style.overflow = '';
    window._removeConfirmData = null;
}

function confirmRemoveDefaultSelected(uniqueKey) {
    if (!uniqueKey) return;
    var ddl = document.getElementById("ddlRoomNo");
    var selectedOption = ddl ? ddl.options[ddl.selectedIndex] : null;
    var roomNo = selectedOption ? selectedOption.value : '';
    var patientId = selectedOption ? selectedOption.dataset.patientId : 0;
    if (!roomNo || !patientId) {
        ShowToast('Please select a patient first.', 'error');
        return;
    }
    var item = defaultSelectedMap.get(uniqueKey);
    if (!item) {
        ShowToast('Item not found.', 'error');
        return;
    }
    var orderId = item.orderId;
    if (!orderId) {
        defaultSelectedMap.delete(uniqueKey);
        updateDefaultSelectedUI();
        ShowToast('Item removed from selection', 'info');
        return;
    }
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("REMOVETODAYORDER")) + "&ORDERID=" + encodeURIComponent(Encrypt(orderId.toString())) + "&ROOMNO=" + encodeURIComponent(Encrypt(roomNo)) + "&USERID=" + encodeURIComponent(Encrypt(document.getElementById("hfUserId").value || '0'));
    ShowToast('Removing item...', 'info');
    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        timeout: 30000,
        success: function (response) {
            var result = null;
            if (response && response.Tables && response.Tables[0] && response.Tables[0].Rows) {
                result = response.Tables[0].Rows[0];
            } else if (Array.isArray(response) && response.length > 0) {
                result = response[0];
            }
            if (result && result.Status === 'Success') {
                defaultSelectedMap.delete(uniqueKey);
                updateDefaultSelectedUI();
                ShowToast('Item removed successfully!', 'success');
                refreshPatientData();
                if (typeof LoadPatientSatisfactionData === 'function') LoadPatientSatisfactionData();
                if (typeof LoadNotifications === 'function') LoadNotifications();
            } else {
                ShowToast(result && result.Message ? result.Message : 'Failed to remove item. Please try again.', 'error');
                refreshPatientData();
            }
        },
        error: function (xhr, status, error) {
            console.log("Error removing item:", status, error);
            ShowToast('Error connecting to server. Please try again.', 'error');
            refreshPatientData();
        }
    });
}

function refreshPatientData() {
    var ddl = document.getElementById("ddlRoomNo");
    if (!ddl || !ddl.value) return;
    var roomNo = ddl.value;
    var mealType = currentActiveMealType || (mealTypesList.length > 0 ? mealTypesList[0] : '');
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETPATDETAILS")) + "&ROOMNO=" + encodeURIComponent(Encrypt(roomNo)) + "&MEALTYPE=" + encodeURIComponent(Encrypt(mealType));
    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        timeout: 30000,
        success: function (response) {
            var patients = [];
            if (response && response.Tables && response.Tables[0] && response.Tables[0].Rows) {
                var rows = response.Tables[0].Rows;
                for (var i = 0; i < rows.length; i++) {
                    patients.push(rows[i]);
                }
            } else if (Array.isArray(response)) {
                patients = response;
            }
            if (patients.length > 0) {
                var patient = patients[0];
                var selectedOption = ddl.options[ddl.selectedIndex];
                if (selectedOption) {
                    selectedOption.dataset.todayOrders = patient.TodayOrders || '[]';
                    var orders = parseTodayOrders(selectedOption);
                    var filteredOrders = orders.filter(function (item) {
                        return item.MEALTYPE === currentActiveMealType;
                    });
                    renderDefaultSelectedOrders(filteredOrders);
                    var chkPreBook = document.getElementById("chkPreBook");
                    if (orders.length > 0 && chkPreBook && chkPreBook.checked) {
                        renderDefaultOrders(orders);
                        updateDefaultOrderVisibility();
                    } else {
                        defaultOrdersMap.clear();
                        updateDefaultOrdersUI();
                        updateDefaultOrderVisibility();
                    }
                }
            }
        },
        error: function (xhr, status, error) {
            console.log("Error refreshing patient data:", error);
        }
    });
}

function renderDefaultSelectedOrders(orders) {
    defaultSelectedMap.clear();
    if (!orders || orders.length === 0) {
        updateDefaultSelectedUI();
        return;
    }
    orders.forEach(function (item) {
        var uniqueKey = item.MEALTYPE + '-' + (item.ITEMID || 0);
        var mealIcon = getMealIcon(item.MEALTYPE);
        defaultSelectedMap.set(uniqueKey, {
            id: item.ITEMID || 0,
            name: item.ITEMNAME,
            desc: item.ITEMDESC || '',
            mealType: item.MEALTYPE,
            qty: item.QUANTITY || 1,
            orderId: item.ORDERID,
            prescribed: item.DEFAULT_PREORDER == 1 && item.ACTIVE_PREORDER == 1,
            imagePath: mealIcon
        });
    });
    updateDefaultSelectedUI();
}

function openFoodOrder() {
    var foodOrderOverlay = document.getElementById("foodOrderOverlay");
    var txtPatientName = document.getElementById("txtPatientName");
    var txtRequestorName = document.getElementById("txtRequestorName");
    var txtInstruction = document.getElementById("txtInstruction");
    var searchFoodInput = document.getElementById("searchFoodInput");
    var chkPreBook = document.getElementById("chkPreBook");
    var preorderChip = document.getElementById("preorderChip");
    var reviewBtnLabel = document.getElementById("reviewBtnLabel");
    var dietPill = document.getElementById("dietPill");
    var allergyPill = document.getElementById("allergyPill");
    var mealSectionTitle = document.getElementById("mealSectionTitle");
    var recommendedGrid = document.getElementById('recommendedGrid');
    var arrow = document.querySelector('.arrow-toggle');

    if (txtPatientName) txtPatientName.value = "";
    if (txtRequestorName) txtRequestorName.value = "";
    if (txtInstruction) txtInstruction.value = "";
    if (searchFoodInput) searchFoodInput.value = "";
    if (chkPreBook) chkPreBook.checked = false;
    if (preorderChip) preorderChip.style.display = "none";
    if (reviewBtnLabel) reviewBtnLabel.textContent = "Submit";
    if (dietPill) dietPill.classList.add("hidden");
    if (allergyPill) allergyPill.classList.add("hidden");

    selectedPreorderDate = null;
    mealAvailabilityData = [];
    currentPickerMonth = null;
    currentPickerYear = null;
    defaultOrdersMap.clear();
    defaultSelectedMap.clear();

    FOOD_MENU = {};
    selections = {};
    mealTypesList = [];

    loadMealTabs();
    loadRoomOptions();
    updateDefaultOrdersUI();
    updateDefaultSelectedUI();
    updateDefaultOrderVisibility();

    if (foodOrderOverlay) foodOrderOverlay.classList.add("show");
    if (recommendedGrid) recommendedGrid.classList.add('hidden');
    if (arrow) arrow.classList.remove('rotated');
}
function closeFoodOrder() {
    var foodOrderOverlay = document.getElementById("foodOrderOverlay");
    if (foodOrderOverlay) foodOrderOverlay.classList.remove("show");
}

function loadMealTabs() {
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETSERVICETIMINGS"));
    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        timeout: 30000,
        success: function (response) {
            var timingsData = [];
            if (response && response.Tables && response.Tables[0] && response.Tables[0].Rows) {
                var rows = response.Tables[0].Rows;
                for (var i = 0; i < rows.length; i++) timingsData.push(rows[i]);
            } else if (Array.isArray(response)) {
                timingsData = response;
            }
            mealAvailabilityData = timingsData;
            mealTypesList = [];
            MEAL_ICONS = {};
            MEAL_ORDER = {};
            FOOD_MENU = {};
            selections = {};
            timingsData.forEach(function (service, index) {
                var mealType = service.MealType || service.CategoryName;
                if (mealType) {
                    mealTypesList.push(mealType);
                    MEAL_ORDER[mealType] = index + 1;
                    var imagePath = service.IMGPATH || null;
                    if (imagePath && imagePath.trim() !== '' && imagePath !== 'NULL') {
                        if (!imagePath.startsWith('../') && !imagePath.startsWith('/') && !imagePath.startsWith('http')) {
                            imagePath = '../' + imagePath;
                        }
                        MEAL_ICONS[mealType] = imagePath;
                    } else {
                        MEAL_ICONS[mealType] = '../images/servings_default.png';
                    }
                    FOOD_MENU[mealType] = [];
                    selections[mealType] = {};
                }
            });
            renderMealTabs();
            if (mealTypesList.length > 0) {
                currentActiveMealType = mealTypesList[0];
                currentMeal = mealTypesList[0];
                selectMeal(currentActiveMealType);
            }
            updateMealTabsAvailability(timingsData);
            var chkPreBook = document.getElementById('chkPreBook');
            var isPreBookEnabled = chkPreBook ? chkPreBook.checked : false;
            if (isPreBookEnabled) {
                updatePreorderDateBasedOnAvailability(timingsData);
            }
        },
        error: function (xhr, status, error) {
            console.log("Error fetching service timings:", error);
        }
    });
}

function getMealTiming(mealType) {
    var service = mealAvailabilityData.find(function (s) {
        return (s.MealType === mealType || s.CategoryName === mealType);
    });
    if (service) {
        return service.ServiceHours || (service.StartTime + ' - ' + service.EndTime);
    }
    return '';
}

function renderMealTabs() {
    var container = document.getElementById("mealTabs");
    if (!container) return;
    container.innerHTML = '';
    mealTypesList.forEach(function (mealType) {
        var tab = document.createElement('div');
        tab.className = 'meal-tab';
        tab.dataset.meal = mealType;

        //tab.onclick = function () {
        //    if (!this.classList.contains('is-locked')) {
        //        selectMeal(mealType);
        //    } else {
        //        ShowToast(mealType + ' is not available now. Please select another meal.', 'warning');
        //    }
        //};

        tab.onclick = function () {
            if (!this.classList.contains('is-locked')) {
                selectMeal(mealType);
            } else {
                ShowToast(mealType + ' is served between ' + getMealTiming(mealType) + '. Tap another meal that\'s currently open instead — there\'s always something on the menu.', 'warning');
            }
        };

        var iconPath = MEAL_ICONS[mealType] || '../images/servings_default.png';
        tab.innerHTML = '<div class="icon-wrapper"><img src="' + iconPath + '" alt="' + mealType + '" onerror="this.src=\'../images/servings_default.png\'; this.onerror=null;"></div><span class="meal-title">' + mealType + '</span><span class="tab-count" id="count-' + mealType.replace(/\s+/g, '') + '" style="display: none;">0</span>';
        container.appendChild(tab);
    });
    if (mealTypesList.length > 0) {
        var firstTab = container.querySelector('.meal-tab');
        if (firstTab) firstTab.classList.add('active');
    }
}

document.addEventListener("DOMContentLoaded", function () {
    var overlay = document.getElementById("foodOrderOverlay");
    if (overlay) {
        overlay.addEventListener("click", function (e) {
            if (e.target === overlay) closeFoodOrder();
        });
    }
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeFoodOrder();
    });
});

function loadRoomOptions() {
    var ddl = document.getElementById("ddlRoomNo");
    if (!ddl) return;
    ddl.innerHTML = '<option value="">-- Select Room --</option>';
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETPATDETAILS"));
    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        timeout: 30000,
        success: function (response) {
            var patients = [];
            if (response && response.Tables && response.Tables[0] && response.Tables[0].Rows) {
                var rows = response.Tables[0].Rows;
                for (var i = 0; i < rows.length; i++) {
                    patients.push(rows[i]);
                }
            } else if (Array.isArray(response)) {
                patients = response;
            }
            if (patients.length > 0) {
                for (var i = 0; i < patients.length; i++) {
                    var row = patients[i];
                    var opt = document.createElement("option");
                    opt.value = row.RoomNo;
                    opt.textContent = row.RoomNo;
                    opt.dataset.patientId = row.PatientID;
                    opt.dataset.patientName = row.PatientName;
                    opt.dataset.dietType = row.DietType || '';
                    opt.dataset.allergies = row.Allergies || '';
                    opt.dataset.ward = row.WARD || '';
                    opt.dataset.doctor = row.DOCTORNAME || '';
                    opt.dataset.age = row.AGE || '';
                    opt.dataset.gender = row.GENDER || '';
                    opt.dataset.todayOrders = row.TodayOrders || '[]';
                    ddl.appendChild(opt);
                }
            } else {
                var opt = document.createElement("option");
                opt.value = "";
                opt.textContent = "No patients found";
                ddl.appendChild(opt);
            }
        },
        error: function (xhr, status, error) {
            console.log("Error loading room options:", status, error);
            ShowToast('Failed to load room options. Please refresh and try again.', 'error');
        }
    });
}

function onRoomChange() {
    var ddl = document.getElementById("ddlRoomNo");
    var selectedOption = ddl ? ddl.options[ddl.selectedIndex] : null;
    var dietPill = document.getElementById("dietPill");
    var allergyPill = document.getElementById("allergyPill");
    var txtPatientName = document.getElementById("txtPatientName");
    if (selectedOption && selectedOption.value) {
        if (txtPatientName) txtPatientName.value = selectedOption.dataset.patientName || '';
        if (selectedOption.dataset.dietType && dietPill) {
            dietPill.textContent = selectedOption.dataset.dietType;
            dietPill.classList.remove("hidden");
        } else if (dietPill) {
            dietPill.classList.add("hidden");
        }
        if (selectedOption.dataset.allergies && selectedOption.dataset.allergies !== 'None' && selectedOption.dataset.allergies !== '' && allergyPill) {
            allergyPill.textContent = selectedOption.dataset.allergies;
            allergyPill.classList.remove("hidden");
        } else if (allergyPill) {
            allergyPill.classList.add("hidden");
        }
        defaultSelectedMap.clear();
        defaultOrdersMap.clear();
        var orders = parseTodayOrders(selectedOption);
        var filteredOrders = orders.filter(function (item) {
            return item.MEALTYPE === currentActiveMealType;
        });
        renderDefaultSelectedOrders(filteredOrders);
        var chkPreBook = document.getElementById("chkPreBook");
        if (orders.length > 0 && chkPreBook && chkPreBook.checked) {
            renderDefaultOrders(orders);
            updateDefaultOrderVisibility();
        } else {
            defaultOrdersMap.clear();
            updateDefaultOrdersUI();
            updateDefaultOrderVisibility();
        }
        selections[currentMeal] = {};
        loadMenuItems(currentMeal, '');
        loadRecommendedFoods();
    } else {
        if (txtPatientName) txtPatientName.value = "";
        if (dietPill) dietPill.classList.add("hidden");
        if (allergyPill) allergyPill.classList.add("hidden");
        defaultOrdersMap.clear();
        defaultSelectedMap.clear();
        renderDefaultSelectedOrders([]);
        updateDefaultOrdersUI();
        updateDefaultOrderVisibility();
        selections[currentMeal] = {};
        loadMenuItems(currentMeal, '');
        loadDefaultRecommendedFoods();
    }
    updateAllBadges();
}

function onPatientNameChange() { }

function toggleRecommendedSection() {
    var grid = document.getElementById('recommendedGrid');
    var arrow = document.querySelector('.arrow-toggle');
    if (grid) {
        if (grid.classList.contains('hidden')) {
            grid.classList.remove('hidden');
            if (arrow) arrow.classList.remove('rotated');
            var ddl = document.getElementById("ddlRoomNo");
            var selectedOption = ddl ? ddl.options[ddl.selectedIndex] : null;
            var roomNo = selectedOption ? selectedOption.value : '';
            if (roomNo) {
                loadRecommendedFoods();
            } else {
                loadDefaultRecommendedFoods();
            }
        } else {
            grid.classList.add('hidden');
            if (arrow) arrow.classList.add('rotated');
        }
    }
}

function loadDefaultRecommendedFoods() {
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETMENU")) + "&MEALTYPE=" + encodeURIComponent(Encrypt(currentMeal));
    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        timeout: 30000,
        success: function (response) {
            var foods = [];
            if (response && response.Tables && response.Tables[0] && response.Tables[0].Rows) {
                var rows = response.Tables[0].Rows;
                var count = 0;
                for (var i = 0; i < rows.length && count < 10; i++) {
                    var row = rows[i];
                    var randomPercentage = Math.floor(Math.random() * 20) + 80;
                    var randomResponses = Math.floor(Math.random() * 5) + 1;
                    foods.push({
                        id: row.MenuItemID || 0,
                        name: row.ItemName || '',
                        desc: row.ItemDesc || '',
                        rating: randomPercentage + '%',
                        responses: randomResponses,
                        avgRating: 0,
                        imagePath: row.IMAGEPATH || ''
                    });
                    count++;
                }
            } else if (Array.isArray(response)) {
                var count = 0;
                for (var i = 0; i < response.length && count < 10; i++) {
                    var row = response[i];
                    var randomPercentage = Math.floor(Math.random() * 20) + 80;
                    var randomResponses = Math.floor(Math.random() * 5) + 1;
                    foods.push({
                        id: row.MenuItemID || row.id || 0,
                        name: row.ItemName || row.name || '',
                        desc: row.ItemDesc || row.desc || '',
                        rating: randomPercentage + '%',
                        responses: randomResponses,
                        avgRating: 0,
                        imagePath: row.IMAGEPATH || row.imagePath || ''
                    });
                    count++;
                }
            }
            renderRecommendedFoods(foods);
        },
        error: function (xhr, status, error) {
            console.log("Error loading default foods:", error);
            renderRecommendedFoods([]);
        }
    });
}

function loadRecommendedFoods() {
    var ddl = document.getElementById("ddlRoomNo");
    var selectedOption = ddl ? ddl.options[ddl.selectedIndex] : null;
    var roomNo = selectedOption ? selectedOption.value : '';
    var patientId = selectedOption ? selectedOption.dataset.patientId : 0;
    if (!roomNo) {
        loadDefaultRecommendedFoods();
        return;
    }
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETRECOMMENDEDFOODS")) + "&ROOMNO=" + encodeURIComponent(Encrypt(roomNo)) + "&MEALTYPE=" + encodeURIComponent(Encrypt(currentMeal)) + "&PATIENTID=" + encodeURIComponent(Encrypt(patientId.toString()));
    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        timeout: 30000,
        success: function (response) {
            var foods = [];
            if (response && response.Tables && response.Tables[0] && response.Tables[0].Rows) {
                var rows = response.Tables[0].Rows;
                for (var i = 0; i < rows.length; i++) {
                    var row = rows[i];
                    var ratingValue = row.RatingPercentage || '0%';
                    if (row.AvgRating && row.AvgRating > 0 && (!row.RatingPercentage || row.RatingPercentage === '0%')) {
                        ratingValue = Math.round(row.AvgRating * 20) + '%';
                    }
                    foods.push({
                        id: row.MenuItemID || 0,
                        name: row.ItemName || '',
                        desc: row.ItemDesc || '',
                        rating: ratingValue,
                        responses: row.TotalRatings || 0,
                        avgRating: row.AvgRating || 0,
                        imagePath: row.IMAGEPATH || ''
                    });
                }
            } else if (Array.isArray(response)) {
                for (var i = 0; i < response.length; i++) {
                    var row = response[i];
                    var ratingValue = row.RatingPercentage || row.rating || '0%';
                    if (row.AvgRating && row.AvgRating > 0 && ratingValue === '0%') {
                        ratingValue = Math.round(row.AvgRating * 20) + '%';
                    }
                    foods.push({
                        id: row.MenuItemID || row.id || 0,
                        name: row.ItemName || row.name || '',
                        desc: row.ItemDesc || row.desc || '',
                        rating: ratingValue,
                        responses: row.TotalRatings || row.responses || 0,
                        avgRating: row.AvgRating || row.avgRating || 0,
                        imagePath: row.IMAGEPATH || row.imagePath || ''
                    });
                }
            }
            if (foods.length === 0) {
                loadDefaultRecommendedFoods();
            } else {
                renderRecommendedFoods(foods);
            }
        },
        error: function (xhr, status, error) {
            console.log("Error loading recommended foods:", error);
            loadDefaultRecommendedFoods();
        }
    });
}

function renderRecommendedFoods(foods) {
    var grid = document.getElementById("recommendedGrid");
    if (!grid) return;
    grid.innerHTML = '';
    if (!foods || foods.length === 0) {
        grid.innerHTML = '<div class="empty-state">No recommendations available</div>';
        var countBadge = document.querySelector('.recommended-header .count-badge');
        if (countBadge) countBadge.textContent = '(0)';
        return;
    }
    foods.forEach(function (food) {
        var isSelected = selectedRecommendedFoods.some(function (f) { return f.id === food.id; });
        var card = document.createElement('div');
        card.className = 'food-card' + (isSelected ? ' is-selected' : '');
        card.dataset.foodId = food.id;
        card.onclick = function (e) {
            if (e.target.closest('.add-btn')) return;
            toggleRecommendedFood(food.id, food.name, food.desc, this);
        };
        var ratingDisplay = food.rating || '0%';
        var responsesDisplay = food.responses || 0;
        var ratingText = 'top pick';
        if (!isNaN(ratingDisplay) && typeof ratingDisplay !== 'string') {
            ratingDisplay = Math.round(ratingDisplay * 20) + '%';
        }
        if (typeof ratingDisplay === 'string' && ratingDisplay.indexOf('%') === -1 && !isNaN(ratingDisplay)) {
            ratingDisplay = Math.round(parseFloat(ratingDisplay) * 20) + '%';
        }
        var percentValue = parseInt(ratingDisplay);
        if (!isNaN(percentValue)) {
            if (percentValue >= 90) {
                ratingText = 'top pick';
            } else if (percentValue >= 70) {
                ratingText = 'well liked';
            } else if (percentValue >= 50) {
                ratingText = 'recommended';
            } else {
                ratingText = 'popular';
            }
        }
        card.innerHTML = '<div class="card-body"><h4 class="food-title">' + escapeHtml(food.name) + '</h4><div class="trend-badge"><img src="../images/PatientSatisfaction.png" alt="" class="smiley-icon">' + escapeHtml(ratingDisplay) + ' ' + ratingText + '</div><div class="card-footer"><span class="response-count">' + (responsesDisplay > 0 ? responsesDisplay + ' responses' : 'New item') + '</span><button type="button" class="add-btn" onclick="event.stopPropagation(); handleAddClick(' + food.id + ', \'' + escapeHtml(food.name) + '\', \'' + escapeHtml(food.desc || '') + '\')">+ Add</button></div></div>';
        grid.appendChild(card);
    });
    var countBadge = document.querySelector('.recommended-header .count-badge');
    if (countBadge) {
        countBadge.textContent = '(' + foods.length + ')';
    }
}

function toggleRecommendedFood(foodId, foodName, foodDesc, cardElement) {
    var index = selectedRecommendedFoods.findIndex(function (f) { return f.id === foodId; });
    if (index !== -1) {
        selectedRecommendedFoods.splice(index, 1);
        cardElement.classList.remove('is-selected');
        var currentQty = selections[currentMeal][foodId] || 0;
        if (currentQty > 0) {
            selections[currentMeal][foodId] = currentQty - 1;
            if (selections[currentMeal][foodId] === 0) {
                delete selections[currentMeal][foodId];
            }
            renderItemControl(foodId, selections[currentMeal][foodId] || 0);
        }
        ShowToast(foodName + ' removed from selection', 'info');
    } else {
        selectedRecommendedFoods.push({ id: foodId, name: foodName, desc: foodDesc || '' });
        cardElement.classList.add('is-selected');
        var currentQty = selections[currentMeal][foodId] || 0;
        selections[currentMeal][foodId] = currentQty + 1;
        renderItemControl(foodId, currentQty + 1);
        ShowToast(foodName + ' added to selection', 'success');
    }
    updateAllBadges();
}

function updateSelectionsFromRecommended() {
    selectedRecommendedFoods.forEach(function (food) {
        var currentQty = selections[currentMeal][food.id] || 0;
        if (currentQty === 0) {
            selections[currentMeal][food.id] = 1;
        }
    });
    renderFoodGrid();
    updateAllBadges();
}

function handleAddClick(foodId, foodName, foodDesc) {
    var existingIndex = selectedRecommendedFoods.findIndex(function (f) { return f.id === foodId; });
    if (existingIndex === -1) {
        selectedRecommendedFoods.push({ id: foodId, name: foodName, desc: foodDesc || '' });
    }
    var currentQty = selections[currentMeal][foodId] || 0;
    selections[currentMeal][foodId] = currentQty + 1;
    renderItemControl(foodId, currentQty + 1);
    updateAllBadges();
    var cards = document.querySelectorAll('.recommended-grid .food-card');
    cards.forEach(function (card) {
        if (parseInt(card.dataset.foodId) === foodId) {
            card.classList.add('is-selected');
        }
    });
    ShowToast(foodName + ' added to your order!', 'success');
}

function loadMenuItems(mealType, searchTerm) {
    var searchValue = searchTerm || '';
    var ddl = document.getElementById("ddlRoomNo");
    var selectedOption = ddl ? ddl.options[ddl.selectedIndex] : null;
    var roomNo = selectedOption ? selectedOption.value : '';
    var patientId = selectedOption ? selectedOption.dataset.patientId : 0;
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETMENU")) + "&MEALTYPE=" + encodeURIComponent(Encrypt(mealType)) + "&SEARCHTERM=" + encodeURIComponent(Encrypt(searchValue));
    if (roomNo) {
        url += "&ROOMNO=" + encodeURIComponent(Encrypt(roomNo)) + "&PATIENTID=" + encodeURIComponent(Encrypt(patientId.toString()));
    }
    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        timeout: 30000,
        success: function (response) {
            var menuItems = [];
            if (response && response.Tables && response.Tables[0] && response.Tables[0].Rows) {
                var rows = response.Tables[0].Rows;
                for (var i = 0; i < rows.length; i++) {
                    var row = rows[i];
                    menuItems.push({
                        id: row.MenuItemID,
                        name: row.ItemName,
                        desc: row.ItemDesc,
                        category: row.CATEGORY,
                        dietTypes: row.DietTypes || '',
                        allergens: row.Allergens || '',
                        tags: row.TAGS || '',
                        imagePath: row.IMAGEPATH || '',
                        prescribed: row.Prescribed === 1 || row.Prescribed === true ? true : false
                    });
                }
            } else if (Array.isArray(response)) {
                for (var i = 0; i < response.length; i++) {
                    var row = response[i];
                    menuItems.push({
                        id: row.MenuItemID || row.id || 0,
                        name: row.ItemName || row.name || '',
                        desc: row.ItemDesc || row.desc || '',
                        category: row.CATEGORY || row.category || '',
                        dietTypes: row.DietTypes || row.dietTypes || '',
                        allergens: row.Allergens || row.allergens || '',
                        tags: row.TAGS || row.tags || '',
                        imagePath: row.IMAGEPATH || row.imagePath || '',
                        prescribed: row.Prescribed === 1 || row.Prescribed === true ? true : false
                    });
                }
            }
            if (!FOOD_MENU[mealType]) {
                FOOD_MENU[mealType] = [];
            }
            FOOD_MENU[mealType] = menuItems;
            renderFoodGrid();
            updateAllBadges();
        },
        error: function (xhr, status, error) {
            console.log("Error loading menu items:", status, error);
            ShowToast('Failed to load menu items. Please refresh and try again.', 'error');
        }
    });
}

function fetchServiceTimings() {
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETSERVICETIMINGS"));
    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        timeout: 30000,
        success: function (response) {
            var timingsData = [];
            if (response && response.Tables && response.Tables[0] && response.Tables[0].Rows) {
                var rows = response.Tables[0].Rows;
                for (var i = 0; i < rows.length; i++) timingsData.push(rows[i]);
            } else if (Array.isArray(response)) {
                timingsData = response;
            }
            if (timingsData.length > 0) {
                mealAvailabilityData = timingsData;
                timingsData.forEach(function (service) {
                    var mealType = service.MealType || service.CategoryName;
                    if (mealType) {
                        var imagePath = service.IMGPATH || null;
                        if (imagePath && imagePath.trim() !== '' && imagePath !== 'NULL') {
                            if (!imagePath.startsWith('../') && !imagePath.startsWith('/') && !imagePath.startsWith('http')) {
                                imagePath = '../' + imagePath;
                            }
                            MEAL_ICONS[mealType] = imagePath;
                        } else {
                            MEAL_ICONS[mealType] = '../images/servings_default.png';
                        }
                    }
                });
                var chkPreBook = document.getElementById('chkPreBook');
                var isPreBookEnabled = chkPreBook ? chkPreBook.checked : false;
                if (isPreBookEnabled) {
                    var today = new Date();
                    var todayStr = getLocalDateString(today);
                    var formatted = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                    var dateLabel = document.getElementById("lblOrderDate");
                    if (dateLabel) dateLabel.textContent = "Pre-order for " + formatted;
                    selectedPreorderDate = todayStr;
                    var chip = document.getElementById("preorderChip");
                    if (chip) chip.dataset.selectedDate = todayStr;
                    currentPickerMonth = today.getMonth();
                    currentPickerYear = today.getFullYear();
                } else {
                    selectedPreorderDate = null;
                    var dateLabel = document.getElementById("lblOrderDate");
                    if (dateLabel) dateLabel.textContent = "Today's Order";
                }
                renderMealTabs();
                updateMealTabsAvailability(timingsData);
            }
        },
        error: function (xhr, status, error) {
            console.log("Error fetching service timings:", error);
        }
    });
}
function updatePreorderDateBasedOnAvailability(timingsData) {
    var chkPreBook = document.getElementById('chkPreBook');
    var isPreBookEnabled = chkPreBook ? chkPreBook.checked : false;
    if (!isPreBookEnabled) return;
    var chip = document.getElementById("preorderChip");
    var dateLabel = document.getElementById("lblOrderDate");
    var today = new Date();
    var todayStr = getLocalDateString(today);
    var formatted = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    if (dateLabel) dateLabel.textContent = "Pre-order for " + formatted;
    selectedPreorderDate = todayStr;
    if (chip) chip.dataset.selectedDate = todayStr;
    currentPickerMonth = today.getMonth();
    currentPickerYear = today.getFullYear();
    var dropdown = document.getElementById("preorderDateDropdown");
    if (dropdown && dropdown.classList.contains("show")) {
        renderDatePicker();
    }
    updateMealTabsAvailability(timingsData);
}

function updateMealTabsAvailability(apiResponseData) {
    var chkPreBook = document.getElementById("chkPreBook");
    var isPreBookEnabled = chkPreBook ? chkPreBook.checked : false;
    var today = new Date();
    var todayStr = getLocalDateString(today);
    var isTodaySelected = selectedPreorderDate === todayStr;
    var availableMeals = [];

    apiResponseData.forEach(function (service) {
        var mealType = service.MealType || service.CategoryName;
        var tab = document.querySelector('.meal-tab[data-meal="' + mealType + '"]');
        if (!tab) return;

        var existingText = tab.querySelector('.not-now-text');
        if (existingText) existingText.remove();

        var existingTooltip = tab.querySelector('.meal-tab-tooltip');
        if (existingTooltip) existingTooltip.remove();

        if (!isPreBookEnabled) {
            if (service.IsAvailableNow == 1) {
                tab.classList.remove("is-locked");
                tab.classList.remove("has-tooltip");
                availableMeals.push(mealType);
            } else {
                tab.classList.add("is-locked");
                tab.classList.add("has-tooltip");
                var span = document.createElement("span");
                span.className = "not-now-text";
                span.innerText = "NOT NOW";
                tab.appendChild(span);

                var tooltip = document.createElement('div');
                tooltip.className = 'meal-tab-tooltip';
                var serviceHours = service.ServiceHours || '';
                var servingName = service.ServingName || mealType;
                var startTime = service.StartTime || '';
                var endTime = service.EndTime || '';
                if (!serviceHours && startTime && endTime) {
                    serviceHours = startTime + ' - ' + endTime;
                }
                tooltip.innerHTML = '<strong>' + mealType + '</strong> is not available now.<br><span style="font-size:12px;color:#9ca3af;">' + serviceHours + '</span>';
                tab.appendChild(tooltip);
            }
            return;
        }

        if (isTodaySelected) {
            var now = new Date();
            var end = new Date();
            var parts = service.EndTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (parts) {
                var hour = parseInt(parts[1], 10);
                var minute = parseInt(parts[2], 10);
                var ampm = parts[3].toUpperCase();
                if (ampm === "PM" && hour !== 12) hour += 12;
                if (ampm === "AM" && hour === 12) hour = 0;
                end.setHours(hour, minute, 0, 0);
                if (now > end) {
                    tab.classList.add("is-locked");
                    tab.classList.add("has-tooltip");
                    var span = document.createElement("span");
                    span.className = "not-now-text";
                    span.innerText = "NOT NOW";
                    tab.appendChild(span);

                    var tooltip = document.createElement('div');
                    tooltip.className = 'meal-tab-tooltip';
                    var serviceHours = service.ServiceHours || '';
                    var servingName = service.ServingName || mealType;
                    var startTime = service.StartTime || '';
                    var endTime = service.EndTime || '';
                    if (!serviceHours && startTime && endTime) {
                        serviceHours = startTime + ' - ' + endTime;
                    }
                    tooltip.innerHTML = '<strong>' + mealType + '</strong> is not available now.<br><span style="font-size:12px;color:#9ca3af;">' + serviceHours + '</span>';
                    tab.appendChild(tooltip);
                } else {
                    tab.classList.remove("is-locked");
                    tab.classList.remove("has-tooltip");
                    availableMeals.push(mealType);
                }
            } else {
                tab.classList.remove("is-locked");
                tab.classList.remove("has-tooltip");
                availableMeals.push(mealType);
            }
            return;
        }

        tab.classList.remove("is-locked");
        tab.classList.remove("has-tooltip");
        availableMeals.push(mealType);
    });

    selectFirstAvailableMeal(availableMeals);
}


function selectFirstAvailableMeal(availableMeals) {
    var selectedMeal = null;
    for (var i = 0; i < mealTypesList.length; i++) {
        if (availableMeals.indexOf(mealTypesList[i]) !== -1) {
            selectedMeal = mealTypesList[i];
            break;
        }
    }
    if (!selectedMeal && mealTypesList.length > 0) {
        selectedMeal = mealTypesList[0];
    }
    if (selectedMeal) {
        selectMeal(selectedMeal);
    }
}

function onPreBookToggle() {
    var isOn = document.getElementById("chkPreBook");
    var chip = document.getElementById("preorderChip");
    var dateLabel = document.getElementById("lblOrderDate");
    var ddl = document.getElementById("ddlRoomNo");
    var selectedOption = ddl ? ddl.options[ddl.selectedIndex] : null;
    var wrapper = document.getElementById("defaultOrdersWrapper");
    if (isOn && isOn.checked) {
        if (chip) chip.style.display = "inline-flex";
        var today = new Date();
        var todayStr = getLocalDateString(today);
        var formatted = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        if (dateLabel) dateLabel.textContent = "Pre-order for " + formatted;
        selectedPreorderDate = todayStr;
        if (chip) chip.dataset.selectedDate = todayStr;
        currentPickerMonth = today.getMonth();
        currentPickerYear = today.getFullYear();
        if (selectedOption && selectedOption.value) {
            var orders = parseTodayOrders(selectedOption);
            if (orders.length > 0) {
                renderDefaultOrders(orders);
                updateDefaultOrderVisibility();
            } else {
                defaultOrdersMap.clear();
                updateDefaultOrdersUI();
                updateDefaultOrderVisibility();
            }
        } else {
            defaultOrdersMap.clear();
            updateDefaultOrdersUI();
            if (wrapper) wrapper.style.display = "none";
        }
        updateDefaultOrdersUI();
        updateDefaultOrderVisibility();
        fetchServiceTimingsForPreBook();
    } else {
        if (chip) chip.style.display = "none";
        closeDatePicker();
        selectedPreorderDate = null;
        if (dateLabel) dateLabel.textContent = "Today's Order";
        defaultOrdersMap.clear();
        updateDefaultOrdersUI();
        if (wrapper) wrapper.style.display = "none";
        defaultOrdersExpanded = false;
        var section = document.getElementById("defaultOrdersSection");
        var arrow = document.getElementById("defaultOrdersArrow");
        if (section) section.classList.add("collapsed");
        if (arrow) arrow.classList.remove("rotated");
        fetchServiceTimings();
    }
    updateAllBadges();
}

function fetchServiceTimingsForPreBook() {
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETSERVICETIMINGS"));
    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        timeout: 30000,
        success: function (response) {
            var timingsData = [];
            if (response && response.Tables && response.Tables[0] && response.Tables[0].Rows) {
                var rows = response.Tables[0].Rows;
                for (var i = 0; i < rows.length; i++) timingsData.push(rows[i]);
            } else if (Array.isArray(response)) {
                timingsData = response;
            }
            if (timingsData.length > 0) {
                mealAvailabilityData = timingsData;
                timingsData.forEach(function (service) {
                    var mealType = service.MealType || service.CategoryName;
                    if (mealType) {
                        var imagePath = service.IMGPATH || null;
                        if (imagePath && imagePath.trim() !== '' && imagePath !== 'NULL') {
                            if (!imagePath.startsWith('../') && !imagePath.startsWith('/') && !imagePath.startsWith('http')) {
                                imagePath = '../' + imagePath;
                            }
                            MEAL_ICONS[mealType] = imagePath;
                        } else {
                            MEAL_ICONS[mealType] = '../images/servings_default.png';
                        }
                    }
                });
                var today = new Date();
                var todayStr = getLocalDateString(today);
                var formatted = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                var dateLabel = document.getElementById("lblOrderDate");
                if (dateLabel) dateLabel.textContent = "Pre-order for " + formatted;
                selectedPreorderDate = todayStr;
                var chip = document.getElementById("preorderChip");
                if (chip) chip.dataset.selectedDate = todayStr;
                currentPickerMonth = today.getMonth();
                currentPickerYear = today.getFullYear();
                renderMealTabs();
                updateMealTabsAvailability(timingsData);
                renderDatePicker();
            }
        },
        error: function (xhr, status, error) {
            console.log("Error fetching service timings:", error);
        }
    });
}

function toggleDatePicker(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    var dropdown = document.getElementById("preorderDateDropdown");
    if (dropdown && dropdown.classList.contains("show")) {
        closeDatePicker();
    } else {
        openDatePicker();
    }
}

function openDatePicker() {
    var dropdown = document.getElementById("preorderDateDropdown");
    var arrow = document.getElementById("calendarDropdownArrow");
    if (dropdown) dropdown.classList.add("show");
    if (arrow) arrow.classList.add("rotated");
    if (currentPickerMonth === null || currentPickerYear === null) {
        var today = new Date();
        currentPickerMonth = today.getMonth();
        currentPickerYear = today.getFullYear();
    }
    renderDatePicker();
}

function closeDatePicker() {
    var dropdown = document.getElementById("preorderDateDropdown");
    var arrow = document.getElementById("calendarDropdownArrow");
    if (dropdown) dropdown.classList.remove("show");
    if (arrow) arrow.classList.remove("rotated");
}

function changeMonth(delta, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    currentPickerMonth += delta;
    if (currentPickerMonth > 11) {
        currentPickerMonth = 0;
        currentPickerYear++;
    } else if (currentPickerMonth < 0) {
        currentPickerMonth = 11;
        currentPickerYear--;
    }
    renderDatePicker();
}

function formatDate(date) {
    return String(date.getDate()).padStart(2, "0") + "-" +
        String(date.getMonth() + 1).padStart(2, "0") + "-" +
        date.getFullYear();
}

function formatReadableDate(date) {
    var options = {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
}

function parseOrderDate(value) {
    if (!value || !value.trim()) {
        return formatDate(new Date());
    }
    value = value.trim();
    var dateOnly = value.split(/[T ]/)[0].trim();
    var match, year, month, day, date;
    match = dateOnly.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
    if (match) {
        year = parseInt(match[1]);
        month = parseInt(match[2]);
        day = parseInt(match[3]);
        date = new Date(year, month - 1, day);
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
            return formatDate(date);
        }
    }
    match = dateOnly.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (match) {
        var first = parseInt(match[1]);
        var second = parseInt(match[2]);
        year = parseInt(match[3]);
        if (first > 12) {
            day = first;
            month = second;
        } else if (second > 12) {
            month = first;
            day = second;
        } else {
            month = first;
            day = second;
        }
        date = new Date(year, month - 1, day);
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
            return formatDate(date);
        }
    }
    var parsedDate = new Date(value);
    if (!isNaN(parsedDate.getTime())) {
        return formatDate(parsedDate);
    }
    return formatDate(new Date());
}

function renderDatePicker() {
    var grid = document.getElementById("datePickerGrid");
    var monthLabel = document.getElementById("datePickerMonth");
    if (!grid || !monthLabel) return;
    var today = new Date();
    var todayStr = getLocalDateString(today);
    var tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    var tomorrowStr = getLocalDateString(tomorrow);
    var year = currentPickerYear !== null ? currentPickerYear : today.getFullYear();
    var month = currentPickerMonth !== null ? currentPickerMonth : today.getMonth();
    var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    monthLabel.textContent = monthNames[month] + ' ' + year;
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var html = '';
    var dayHeaders = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    dayHeaders.forEach(function (day) {
        html += '<div class="day-header">' + day + '</div>';
    });
    for (var i = 0; i < firstDay; i++) {
        html += '<div class="date-cell empty"></div>';
    }
    var chip = document.getElementById("preorderChip");
    var currentSelected = chip ? chip.dataset.selectedDate : null;
    if (!currentSelected && selectedPreorderDate) {
        currentSelected = selectedPreorderDate;
    }
    for (var day = 1; day <= daysInMonth; day++) {
        var dateObj = new Date(year, month, day);
        var dateStr = getLocalDateString(dateObj);
        var isToday = dateStr === todayStr;
        var isTomorrow = dateStr === tomorrowStr;
        var isSelected = dateStr === currentSelected;
        var isSelectable = isToday || isTomorrow;
        var classes = 'date-cell';
        if (isToday) classes += ' today';
        if (isTomorrow) classes += ' tomorrow';
        if (isSelected) classes += ' selected';
        if (!isSelectable) classes += ' disabled';
        var displayStr = formatDate(dateObj);
        var onclickAttr = isSelectable ? ' onclick="selectPreorderDate(\'' + dateStr + '\', event)"' : '';
        html += '<div class="' + classes + '" data-date="' + displayStr + '"' + onclickAttr + '>' + day + '</div>';
    }
    grid.innerHTML = html;
}

function selectPreorderDate(dateStr, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    var today = new Date();
    var tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    var todayStr = getLocalDateString(today);
    var tomorrowStr = getLocalDateString(tomorrow);
    if (dateStr !== todayStr && dateStr !== tomorrowStr) {
        ShowToast('You can only select today or tomorrow for pre-order.', 'warning');
        return;
    }
    var parts = dateStr.split('-');
    var selectedDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    var chip = document.getElementById("preorderChip");
    var dateLabel = document.getElementById("lblOrderDate");
    var formatted = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    selectedPreorderDate = dateStr;
    if (chip) chip.dataset.selectedDate = dateStr;
    if (dateLabel) dateLabel.textContent = "Pre-order for " + formatted;
    currentPickerMonth = selectedDate.getMonth();
    currentPickerYear = selectedDate.getFullYear();
    updateMealTabsAvailability(mealAvailabilityData);
    closeDatePicker();
    renderDatePicker();
}

document.addEventListener('click', function (e) {
    var chip = document.getElementById('preorderChip');
    var dropdown = document.getElementById('preorderDateDropdown');
    if (chip && dropdown) {
        if (!chip.contains(e.target) && !dropdown.contains(e.target)) closeDatePicker();
    }
});

function selectMeal(meal) {
    var tabElement = document.querySelector('.meal-tab[data-meal="' + meal + '"]');
    if (!tabElement) return;
    currentMeal = meal;
    currentActiveMealType = meal;
    document.querySelectorAll(".meal-tab").forEach(function (t) { t.classList.remove("active"); });
    tabElement.classList.add("active");
    var mealSectionTitle = document.getElementById("mealSectionTitle");
    if (mealSectionTitle) mealSectionTitle.textContent = meal;
    var searchFoodInput = document.getElementById("searchFoodInput");
    if (searchFoodInput) searchFoodInput.value = "";
    loadMenuItems(meal, '');
    updateAllBadges();
    var ddl = document.getElementById("ddlRoomNo");
    var selectedOption = ddl ? ddl.options[ddl.selectedIndex] : null;
    var roomNo = selectedOption ? selectedOption.value : '';
    if (roomNo) {
        loadRecommendedFoods();
    } else {
        loadDefaultRecommendedFoods();
    }
    var orders = parseTodayOrders(selectedOption);
    var filteredOrders = orders.filter(function (item) {
        return item.MEALTYPE === meal;
    });
    renderDefaultSelectedOrders(filteredOrders);
    if (document.getElementById("chkPreBook") && document.getElementById("chkPreBook").checked) {
        updateDefaultOrderVisibility();
        if (orders.length > 0) {
            renderDefaultOrders(orders);
        } else {
            defaultOrdersMap.clear();
            updateDefaultOrdersUI();
        }
    }
}
function filterFoodItems() {
    var searchTerm = document.getElementById("searchFoodInput").value.trim();
    if (searchTerm.length >= 2 || searchTerm.length === 0) {
        loadMenuItems(currentMeal, searchTerm);
    } else {
        filterFoodItemsClientSide(searchTerm);
    }
}

function filterFoodItemsClientSide(searchTerm) {
    var term = searchTerm.toLowerCase().trim();
    var grid = document.getElementById("foodGrid");
    if (!grid) return;
    var cards = grid.querySelectorAll(".food-card");
    var visibleCount = 0;
    if (cards.length === 0) {
        loadMenuItems(currentMeal, term);
        return;
    }
    cards.forEach(function (card) {
        var title = card.querySelector(".food-card-title").textContent.toLowerCase();
        var desc = card.querySelector(".food-card-desc").textContent.toLowerCase();
        if (term === "" || title.indexOf(term) !== -1 || desc.indexOf(term) !== -1) {
            card.classList.remove("hidden-card");
            visibleCount++;
        } else {
            card.classList.add("hidden-card");
        }
    });
    var noResult = grid.querySelector(".no-results");
    if (visibleCount === 0 && term !== "") {
        if (!noResult) {
            noResult = document.createElement("div");
            noResult.className = "no-results";
            noResult.innerHTML = '<img src="../images/orders-icon.png" alt="No results" class="no-results-icon"><span class="no-results-text">No food items found matching your search.</span>';
            grid.appendChild(noResult);
        }
        noResult.style.display = "flex";
    } else if (noResult) {
        noResult.style.display = "none";
    }
}

function renderFoodGrid() {
    var grid = document.getElementById("foodGrid");
    if (!grid) return;
    grid.innerHTML = "";
    var mealIcon = getMealIcon(currentMeal);
    var items = FOOD_MENU[currentMeal] || [];
    var searchFoodInput = document.getElementById("searchFoodInput");
    var searchTerm = searchFoodInput ? searchFoodInput.value.toLowerCase().trim() : "";
    var itemsToShow = searchTerm !== "" ? items : items.slice(0, 6);
    if (itemsToShow.length === 0) {
        grid.innerHTML = '<div class="no-results"><img src="../images/orders-icon.png" alt="No results" class="no-results-icon"><span class="no-results-text">No food items available for ' + currentMeal + '</span></div>';
        return;
    }
    itemsToShow.forEach(function (item) {
        var qty = selections[currentMeal][item.id] || 0;
        var card = document.createElement("div");
        card.className = "food-card";
        card.dataset.itemId = item.id;
        var prescribedHtml = '';
        if (item.prescribed) {
            prescribedHtml = '<span class="badge-prescribed">Prescribed</span>';
        }
        card.innerHTML = '<div class="food-card-image">' + prescribedHtml + '<div class="food-card-icon"><img src="' + (item.imagePath || mealIcon) + '" alt="' + item.name + '"></div></div><div class="food-card-body"><div class="food-card-title">' + escapeHtml(item.name) + '</div><div class="food-card-desc">' + escapeHtml(item.desc) + '</div><div class="food-card-footer" id="ctrl-' + item.id + '"></div></div>';
        grid.appendChild(card);
        renderItemControl(item.id, qty);
    });
}

function renderItemControl(itemId, qty) {
    var el = document.getElementById('ctrl-' + itemId);
    if (!el) return;
    if (qty > 0) {
        el.innerHTML = '<div class="qty-stepper"><button type="button" onclick="changeQty(\'' + itemId + '\', -1)">-</button><span>' + qty + '</span><button type="button" onclick="changeQty(\'' + itemId + '\', 1)">+</button></div>';
    } else {
        el.innerHTML = '<button type="button" class="btn-add" onclick="changeQty(\'' + itemId + '\', 1)">+ Add</button>';
    }
}

function changeQty(itemId, delta) {
    var current = selections[currentMeal][itemId] || 0;
    var next = Math.max(0, current + delta);
    if (next === 0) {
        delete selections[currentMeal][itemId];
        var recIndex = selectedRecommendedFoods.findIndex(function (f) { return f.id === itemId; });
        if (recIndex !== -1) {
            selectedRecommendedFoods.splice(recIndex, 1);
            var cards = document.querySelectorAll('.recommended-grid .food-card');
            cards.forEach(function (card) {
                if (parseInt(card.dataset.foodId) === itemId) {
                    card.classList.remove('is-selected');
                }
            });
        }
    } else {
        selections[currentMeal][itemId] = next;
    }
    renderItemControl(itemId, next);
    updateAllBadges();
}

function mealItemCount(meal) {
    return Object.keys(selections[meal] || {}).length;
}

function mealTotalQty(meal) {
    var total = 0;
    for (var key in (selections[meal] || {})) total += selections[meal][key];
    return total;
}

function grandTotalQty() {
    var total = 0;
    for (var i = 0; i < mealTypesList.length; i++) {
        total += mealTotalQty(mealTypesList[i]);
    }
    return total;
}

function updateAllBadges() {
    for (var i = 0; i < mealTypesList.length; i++) {
        var meal = mealTypesList[i];
        var totalQty = mealTotalQty(meal);
        var badge = document.getElementById('count-' + meal.replace(/\s+/g, ''));
        if (badge) {
            badge.style.display = totalQty > 0 ? "flex" : "none";
            badge.textContent = totalQty;
        }
    }
    var curCount = mealItemCount(currentMeal);
    var selBadge = document.getElementById("itemsSelectedBadge");
    if (selBadge) {
        if (curCount > 0) {
            selBadge.style.display = "inline-block";
            selBadge.textContent = curCount + ' item' + (curCount > 1 ? 's' : '') + ' selected';
        } else {
            selBadge.style.display = "none";
        }
    }
    var total = grandTotalQty();
    var btn = document.getElementById("btnReview");
    var label = document.getElementById("reviewBtnLabel");
    if (btn && label) {
        if (total > 0) {
            btn.disabled = false;
            label.textContent = 'Submit (' + total + ' item' + (total > 1 ? 's' : '') + ')';
        } else {
            btn.disabled = true;
            label.textContent = "Submit";
        }
    }
}

function submitFoodOrder() {
    var requestor = document.getElementById("txtRequestorName");
    var roomNo = document.getElementById("ddlRoomNo");
    var patientName = document.getElementById("txtPatientName");
    if (!requestor || !requestor.value.trim()) { ShowToast("Requestor Name is required.", "error"); return; }
    if (!roomNo || !roomNo.value) { ShowToast("Please select a Room No.", "error"); return; }
    if (!patientName || !patientName.value.trim()) { ShowToast("Please enter Patient Name.", "error"); return; }
    var ddl = document.getElementById("ddlRoomNo");
    var selectedOption = ddl ? ddl.options[ddl.selectedIndex] : null;
    var patientId = selectedOption ? selectedOption.dataset.patientId : 0;
    var currentUserId = parseInt(document.getElementById("hfUserId").value) || 0;
    var totalItems = 0;
    for (var i = 0; i < mealTypesList.length; i++) {
        var meal = mealTypesList[i];
        var menuItems = FOOD_MENU[meal] || [];
        menuItems.forEach(function (item) {
            totalItems += selections[meal][item.id] || 0;
        });
    }
    if (totalItems === 0) { ShowToast("Please select at least one food item.", "warning"); return; }
    var maxItems = 10;
    if (totalItems > maxItems) {
        ShowToast("You can select a maximum of " + maxItems + " items per order. Please remove " + (totalItems - maxItems) + " item(s) and try again.", "warning");
        return;
    }
    var chkPreBook = document.getElementById("chkPreBook");
    var isPreBook = chkPreBook ? chkPreBook.checked : false;
    var txtInstruction = document.getElementById("txtInstruction");
    var orderDateToSend = getLocalDateString(new Date());
    if (isPreBook && selectedPreorderDate) {
        orderDateToSend = selectedPreorderDate;
    }
    var xmlData = '<Order>';
    xmlData += '<RoomNo>' + escapeXml(roomNo.value) + '</RoomNo>';
    xmlData += '<PatientID>' + patientId + '</PatientID>';
    xmlData += '<PatientName>' + escapeXml(patientName.value) + '</PatientName>';
    xmlData += '<Requestor>' + escapeXml(requestor.value) + '</Requestor>';
    xmlData += '<SpecialInstruction>' + escapeXml(txtInstruction ? txtInstruction.value.trim() : '') + '</SpecialInstruction>';
    xmlData += '<IsPreOrder>' + (isPreBook ? 1 : 0) + '</IsPreOrder>';
    xmlData += '<UserID>' + currentUserId + '</UserID>';
    xmlData += '<OrderDate>' + orderDateToSend + '</OrderDate>';
    if (isPreBook && selectedPreorderDate) {
        xmlData += '<PreOrderDate>' + selectedPreorderDate + '</PreOrderDate>';
    }
    xmlData += '<Items>';
    for (var j = 0; j < mealTypesList.length; j++) {
        var mealType = mealTypesList[j];
        var menuItems = FOOD_MENU[mealType] || [];
        menuItems.forEach(function (item) {
            var qty = selections[mealType][item.id] || 0;
            if (qty > 0) {
                xmlData += '<Item>';
                xmlData += '<MenuItemID>' + item.id + '</MenuItemID>';
                xmlData += '<Quantity>' + qty + '</Quantity>';
                xmlData += '<MealType>' + mealType + '</MealType>';
                xmlData += '</Item>';
            }
        });
    }
    xmlData += '</Items></Order>';
    var btn = document.getElementById("btnReview");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = 'Placing Order...';
    }
    ShowToast("Placing your order...", "info");
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("REQUESTINSERT")) + "&ORDERDATA=" + encodeURIComponent(Encrypt(xmlData)) + "&USERID=" + encodeURIComponent(Encrypt(currentUserId.toString()));
    $.ajax({
        url: url,
        type: "POST",
        dataType: "json",
        timeout: 30000,
        success: function (response) {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<img src="../images/cart-icon.png" alt="" class="btn-icon"><span id="reviewBtnLabel">Submit</span><img src="../images/arrow-right.png" alt="" class="btn-icon">';
            }
            var result = null;
            if (response && response.Tables && response.Tables[0] && response.Tables[0].Rows) {
                result = response.Tables[0].Rows[0];
            } else if (Array.isArray(response) && response.length > 0) {
                result = response[0];
            }
            if (result && result.Status === 'Success') {
                var orderType = isPreBook ? 'Pre-order' : 'Order';
                ShowToast(orderType + ' placed successfully! (' + totalItems + ' items)', 'success');
                setTimeout(function () {
                    if (typeof LoadPatientSatisfactionData === 'function') LoadPatientSatisfactionData();
                    if (typeof LoadNotifications === 'function') LoadNotifications();
                    closeFoodOrder();
                }, 1500);
            } else {
                ShowToast(result && result.Message ? result.Message : 'Failed to place order. Please try again.', 'error');
            }
        },
        error: function (xhr, status, error) {
            console.log("Error submitting order:", status, error);
            console.log("Response Text:", xhr.responseText);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<img src="../images/cart-icon.png" alt="" class="btn-icon"><span id="reviewBtnLabel">Submit</span><img src="../images/arrow-right.png" alt="" class="btn-icon">';
            }
            ShowToast('Unable to create a request. Please try again.', 'error');
        }
    });
}

function getKitchenRoleId() {
    return (sessionStorage.getItem('ROLE') || sessionStorage.getItem('ROLEID') || '').toString();
}

function LoadNotifications() {
    var roleId = getKitchenRoleId();
    var url = hurl + "Service/Service.aspx?Process=" +
        encodeURIComponent(Encrypt("GETNOTIFICATIONSLIST")) +
        "&MAXCOUNT=" + encodeURIComponent(Encrypt("20"));

    if (roleId) {
        url += "&ROLEID=" + encodeURIComponent(Encrypt(roleId));
    }

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        timeout: 5000,
        success: function (res) {
            RenderNotifications(res || []);
            GetUnreadCount();
        },
        error: function () { }
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
            html += '<div class="notification-item' + (isRead ? ' read' : ' unread') + '" data-id="' + notificationId + '" style="display:flex;align-items:flex-start;gap:12px;padding:12px 18px;cursor:pointer;transition:all 0.2s;border-bottom:1px solid #f8fafc;position:relative;' + (!isRead ? 'background:#f0f7ff;border-left:3px solid #3b82f6;' : '') + '"><div class="notification-icon ' + iconClass + '" style="width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:' + getIconBackground(iconClass) + ';border:none;"><img src="' + icon + '" alt="' + iconClass + '" style="width:20px;height:20px;object-fit:contain;"></div><div class="notification-content" style="flex:1;min-width:0;"><div class="notification-text"><h4 style="font-size:13px;font-weight:600;color:#0f172a;margin:0 0 2px 0;">' + escapeHtml(item.NOTIFICATION_HEADER || '') + '</h4><p style="font-size:13px;color:#6b7280;margin:0;line-height:1.4;">' + escapeHtml(item.NOTIFICATION_MESSAGE || '') + '</p></div><div class="notification-time" style="font-size:11px;color:#9ca3af;margin-top:4px;">' + escapeHtml(item.TIME_AGO || '') + '</div></div>' + (!isRead ? '<span class="unread-dot" style="width:8px;height:8px;background:#3b82f6;border-radius:50%;flex-shrink:0;margin-top:4px;"></span>' : '') + '</div>';
        });
    } else {
        html = '<div class="notification-item" style="text-align:center;color:#888;padding:20px;">No new notifications</div>';
    }
    $('#notificationList').html(html);
    $('#notificationCount').text(unreadCount);
    if (unreadCount > 0) {
        $('#notificationCount').addClass('show');
    } else {
        $('#notificationCount').removeClass('show');
    }
}

$(document).on('click', '.notification-item.unread[data-id]', function () {
    var id = $(this).data('id');
    var $this = $(this);
    $this.removeClass('unread');
    $this.find('.unread-dot').remove();
    $this.css({
        'transition': 'opacity 0.5s ease, transform 0.3s ease',
        'opacity': '0',
        'transform': 'translateX(20px)'
    });
    MarkNotificationAsRead(id);
    setTimeout(function () {
        $this.remove();
        var currentCount = parseInt($('#notificationCount').text()) || 0;
        var newCount = Math.max(0, currentCount - 1);
        $('#notificationCount').text(newCount);
        if (newCount <= 0) {
            $('#notificationCount').removeClass('show');
        }
        if ($('.notification-item').length === 0) {
            $('#notificationList').html('<div class="notification-item" style="text-align:center;color:#888;padding:20px;">No new notifications</div>');
        }
    }, 600);
});

function MarkNotificationAsRead(NotificationID) {
    var roleId = getKitchenRoleId();
    var url = hurl + "Service/Service.aspx?Process=" +
        encodeURIComponent(Encrypt("MARKNOTIFICATIONASREAD")) +
        "&NOTIFICATIONID=" + encodeURIComponent(Encrypt(NotificationID));

    if (roleId) {
        url += "&ROLEID=" + encodeURIComponent(Encrypt(roleId));
    }

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        timeout: 5000,
        success: function (res) {
            var currentCount = parseInt($('#notificationCount').text()) || 0;
            var newCount = Math.max(0, currentCount - 1);
            $('#notificationCount').text(newCount);
            if (newCount <= 0) {
                $('#notificationCount').removeClass('show');
            }
        },
        error: function (xhr, status, error) {
            console.log("Error marking notification as read:", error);
        }
    });
}
function getIconBackground(type) {
    switch (type) {
        case 'info': return 'rgba(37, 99, 235, 0.08)';
        case 'success': return 'rgba(22, 163, 74, 0.08)';
        case 'warning': return 'rgba(245, 158, 11, 0.08)';
        case 'error': return 'rgba(239, 68, 68, 0.08)';
        default: return 'rgba(37, 99, 235, 0.08)';
    }
}

function getNotificationIcon(type) {
    type = (type || '').toLowerCase();
    switch (type) {
        case "error": return "../images/notification/warning.png";
        case "info": return "../images/notification/shield.png";
        case "success": return "../images/notification/thumbs-up.png";
        default: return "../images/notification/bell-icon.png";
    }
}

function GetUnreadCount() {
    var roleId = getKitchenRoleId();
    var url = hurl + "Service/Service.aspx?Process=" +
        encodeURIComponent(Encrypt("GETUNREADNOTIFICATIONCOUNTS"));

    if (roleId) {
        url += "&ROLEID=" + encodeURIComponent(Encrypt(roleId));
    }

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        timeout: 5000,
        success: function (res) {
            if (res && res.length > 0) {
                var count = res[0].UNREAD_COUNT || 0;
                var $badge = $('#notificationCount');
                if ($badge.length > 0) {
                    $badge.text(count);
                    if (count > 0) {
                        $badge.addClass('show');
                    } else {
                        $badge.removeClass('show');
                    }
                }
            } else {
                $('#notificationCount').removeClass('show');
            }
        },
        error: function () { }
    });
}

function MarkAllNotificationsAsRead() {
    var roleId = getKitchenRoleId();
    var url = hurl + "Service/Service.aspx?Process=" +
        encodeURIComponent(Encrypt("MARKALLNOTIFICATIONSASREAD"));

    if (roleId) {
        url += "&ROLEID=" + encodeURIComponent(Encrypt(roleId));
    }

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        timeout: 5000,
        success: function () {
            $('.notification-item.unread').each(function () {
                var $this = $(this);
                $this.removeClass('unread');
                $this.find('.unread-dot').remove();
                $this.css({
                    'background': '',
                    'border-left': ''
                });
            });
            $('#notificationCount').text(0);
            $('#notificationCount').removeClass('show');
            if ($('.notification-item').length === 0) {
                $('#notificationList').html('<div class="notification-item" style="text-align:center;color:#888;padding:20px;">No new notifications</div>');
            }
            ShowToast('All notifications marked as read', 'success');
            LoadNotifications();
        },
        error: function () {
            ShowToast('Failed to mark all as read', 'error');
        }
    });
}

function ShowToast(message, type) {
    type = type || 'success';
    var toast = $('#dashToastNotification');
    if (toast.length === 0) {
        $('body').append('<div class="dash-toast-notification" id="dashToastNotification"><i class="fas fa-check-circle"></i><span id="dashToastMessage"></span><button class="toast-close" onclick="HideDashToast();">&times;</button></div>');
        toast = $('#dashToastNotification');
    }
    var icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
    toast.find('i').attr('class', 'fas ' + icon);
    toast.find('#dashToastMessage').text(message);
    toast.removeClass('success error warning info');
    toast.addClass(type);
    toast.addClass('show');
    clearTimeout(toast.data('timer'));
    toast.data('timer', setTimeout(function () {
        HideDashToast();
    }, 3000));
}

function HideDashToast() {
    var toast = $('#dashToastNotification');
    toast.removeClass('show');
    if (toast.data('timer')) {
        clearTimeout(toast.data('timer'));
        toast.data('timer', null);
    }
}



function Encrypt(Value) {
    var key = CryptoJS.enc.Utf8.parse(CryptoKey);
    var iv = CryptoJS.enc.Utf8.parse(CryptoPwd);

    var encryptedVal = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(Value), key,
        {
            keySize: 128 / 8,
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
    return encryptedVal;
}

function ShowModalPopUp(ModalId) {
    $('#' + ModalId).modal('show');
}
function HideModalPopUp(ModalId) {
    $('#' + ModalId).modal('hide');
}

$(document).on('mouseenter', '.meal-tab.is-locked', function (e) {
    var tooltip = $(this).find('.meal-tab-tooltip');
    if (tooltip.length) {
        var tooltipWidth = 280;
        var tooltipHeight = 120;

        var left = e.clientX - 510;
        var top = e.clientY - tooltipHeight - 15;

        if (left + tooltipWidth > window.innerWidth - 20) {
            left = window.innerWidth - tooltipWidth - 20;
        }
        if (left < 20) {
            left = 20;
        }
        if (top < 20) {
            top = e.clientY + 15;
        }
        if (top + tooltipHeight > window.innerHeight - 20) {
            top = window.innerHeight - tooltipHeight - 20;
        }

        tooltip.css({
            'display': 'block',
            'position': 'fixed',
            'left': left + 'px',
            'top': top + 'px',
            'max-width': tooltipWidth + 'px',
            'width': 'auto',
            'transform': 'none'
        });
    }
});

$(document).on('mousemove', '.meal-tab.is-locked', function (e) {
    var tooltip = $(this).find('.meal-tab-tooltip');
    if (tooltip.length && tooltip.css('display') === 'block') {
        var tooltipWidth = 280;
        var tooltipHeight = 120;

        var left = e.clientX - 510;
        var top = e.clientY - tooltipHeight - 15;

        if (left + tooltipWidth > window.innerWidth - 20) {
            left = window.innerWidth - tooltipWidth - 20;
        }
        if (left < 20) {
            left = 20;
        }
        if (top < 20) {
            top = e.clientY + 15;
        }
        if (top + tooltipHeight > window.innerHeight - 20) {
            top = window.innerHeight - tooltipHeight - 20;
        }

        tooltip.css({
            'left': left + 'px',
            'top': top + 'px'
        });
    }
});

$(document).on('mouseleave', '.meal-tab.is-locked', function () {
    var tooltip = $(this).find('.meal-tab-tooltip');
    if (tooltip.length) {
        tooltip.css('display', 'none');
    }
});

$(document).on('click', '.meal-tab.is-locked', function (e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
});



/* =====================================================================
   Section 3 : Excel import / template  (includes all new parameters)
   ===================================================================== */

/* Excel header (letters only, upper-cased)  ->  internal key */
var MENU_EXCEL_COLUMN_MAP = {
    'MEALNAME': 'MenuName',
    'DESCRIPTION': 'Description',
    'SERVINGNAME': 'ServingName',
    'DIETTYPE': 'DietType',
    'DIETARYTYPE': 'DietaryType',
    'CATEGORY': 'Category',
    'ALLERGY': 'Allergies',
    'TAGS': 'Tags',
    'FOODTAGS': 'FoodTags',
    'IMAGENAME': 'ImagePath',
    'DEFAULTORDER': 'DefaultOrder',
    'ACTIVE': 'Active',
    'DAY': 'Day',
    'COUNTRY': 'Country',
    'CALORIES': 'Calories',
    'PRICE': 'Price',
    'HISID': 'HISID',
    'VENDOR': 'Vendor',
    'PROTEIN': 'Protein',
    'CARBS': 'Carbs',
    'TOTALFAT': 'TotalFat',
    'SODIUM': 'Sodium',
    'SUGAR': 'Sugar',
    'INGREDIENTS': 'Ingredients'
};

var MENU_EXCEL_HEADERS = [
    'MEALNAME', 'DESCRIPTION', 'SERVINGNAME', 'DIETTYPE', 'DIETARYTYPE', 'CATEGORY',
    'ALLERGY', 'TAGS', 'FOOD_TAGS', 'IMAGENAME', 'DEFAULTORDER', 'ACTIVE',
    'DAY', 'COUNTRY', 'CALORIES', 'PRICE', 'HIS_ID', 'VENDOR',
    'PROTEIN', 'CARBS', 'TOTAL_FAT', 'SODIUM', 'SUGAR', 'INGREDIENTS'
];

var MENU_EXCEL_SAMPLE = [
    'Avocado Toast', 'Whole wheat toast with avocado', 'BREAKFAST', 'DM,CARD', 'VEG', '',
    'gluten,eggs', 'high-fiber', 'low-fat', 'avocado.jpg', 'NO', 'YES',
    'All Days', 'India', 105, 4.5, 'HIS1001', 'Fresh Foods',
    3.4, 19.8, 1.6, 135, 0.4, 'whole wheat bread, avocado, olive oil'
];

var DAY_MAP = {
    'ALLDAYS': '0', 'ALL': '0', '0': '0',
    'MONDAY': '1', 'MON': '1', '1': '1',
    'TUESDAY': '2', 'TUE': '2', '2': '2',
    'WEDNESDAY': '3', 'WED': '3', '3': '3',
    'THURSDAY': '4', 'THU': '4', '4': '4',
    'FRIDAY': '5', 'FRI': '5', '5': '5',
    'SATURDAY': '6', 'SAT': '6', '6': '6',
    'SUNDAY': '7', 'SUN': '7', '7': '7'
};

var DIETARY_MAP = {
    'VEG': 'VEG', 'VEGETARIAN': 'VEG',
    'NONVEG': 'NONVEG', 'NONVEGETARIAN': 'NONVEG', 'NON-VEG': 'NONVEG', 'NON-VEGETARIAN': 'NONVEG',
    'VEGAN': 'VEGAN'
};

function toggleExcelDropdown(e) {
    e.stopPropagation();
    var menu = document.getElementById('excelDropdownMenu');
    menu.classList.toggle('show');
}

document.addEventListener('click', function (e) {
    var menu = document.getElementById('excelDropdownMenu');
    if (menu && menu.classList.contains('show')) {
        if (!e.target.closest('.excel-dropdown-wrapper')) {
            menu.classList.remove('show');
        }
    }
});

function triggerExcelImport() {
    document.getElementById('excelDropdownMenu').classList.remove('show');
    var inp = document.getElementById('fileExcelImport');
    inp.value = '';
    inp.click();
}

function downloadImportTemplate() {
    var menu = document.getElementById('excelDropdownMenu');
    if (menu) menu.classList.remove('show');
    if (typeof ExcelJS === 'undefined') {
        alert("Excel styling library (ExcelJS) is not loaded. Please add the script tag to your page.");
        return;
    }

    var workbook = new ExcelJS.Workbook();
    var worksheet = workbook.addWorksheet('MenuTemplate');
    var headerRow = worksheet.addRow(MENU_EXCEL_HEADERS);

    headerRow.eachCell(function (cell) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF009688' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    var sample = worksheet.addRow(MENU_EXCEL_SAMPLE);
    sample.eachCell(function (cell) {
        cell.font = { italic: true, color: { argb: 'FF6B7280' } };
    });

    worksheet.columns.forEach(function (column) { column.width = 20; });
    worksheet.getColumn(2).width = 34;   // DESCRIPTION
    worksheet.getColumn(24).width = 40;  // INGREDIENTS
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Notes sheet
    var notes = workbook.addWorksheet('Instructions');
    [
        ['Column', 'Required', 'Allowed values / notes'],
        ['MEALNAME', 'YES', 'Menu item name'],
        ['DIETTYPE', 'YES', 'Diet type CODE(s), comma separated (e.g. DM,CARD)'],
        ['SERVINGNAME', 'no', 'Serving CODE(s), comma separated (e.g. BREAKFAST,LUNCH)'],
        ['DIETARYTYPE', 'no', 'VEG / NONVEG / VEGAN'],
        ['DEFAULTORDER', 'no', 'YES / NO'],
        ['ACTIVE', 'no', 'YES / NO (default YES)'],
        ['DAY', 'no', 'All Days, Monday ... Sunday (default All Days)'],
        ['COUNTRY', 'no', 'Country name exactly as in Country master (or its numeric ID)'],
        ['ALLERGY', 'no', 'dairy, gluten, nuts, peanuts, soy, eggs, fish, shellfish, sesame (comma separated)'],
        ['TAGS / FOOD_TAGS', 'no', 'high-protein, low-carb, low-fat, high-fiber, gluten-free, dairy-free, sugar-free, organic, halal, kosher'],
        ['PRICE, CALORIES, PROTEIN, CARBS, TOTAL_FAT, SODIUM, SUGAR', 'no', 'Numbers only (0 or more)'],
        ['HIS_ID, VENDOR, INGREDIENTS, CATEGORY', 'no', 'Free text']
    ].forEach(function (r, i) {
        var row = notes.addRow(r);
        if (i === 0) row.font = { bold: true };
    });
    notes.columns = [{ width: 52 }, { width: 12 }, { width: 100 }];

    workbook.xlsx.writeBuffer().then(function (buffer) {
        var blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        var url = window.URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'MENU_MASTER_TEMPLATE.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
    });
}

function cleanCsv(v) {
    return String(v == null ? '' : v).split(/[,;]/).map(function (x) { return $.trim(x); }).filter(Boolean).join(',');
}

function handleExcelImport(evt) {
    var file = evt.target.files && evt.target.files[0];
    if (!file) return;

    if (typeof XLSX === 'undefined') {
        alert('Excel parser (SheetJS) is not loaded. Please refresh the page.');
        return;
    }

    var btn = document.querySelector('.btn-import-excel');
    if (btn) { btn.disabled = true; btn.dataset.oldText = btn.innerHTML; btn.innerHTML = 'Reading...'; }

    var reader = new FileReader();
    reader.onload = function (e) {
        try {
            var data = new Uint8Array(e.target.result);
            var workbook = XLSX.read(data, { type: 'array', cellDates: true });
            var sheet = workbook.Sheets[workbook.SheetNames[0]];
            var rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

            if (!rows || !rows.length) {
                alert('The Excel file appears to be empty.');
                restoreImportButton(btn);
                return;
            }

            var normalized = [];
            rows.forEach(function (rawRow) {
                var out = {};
                var hasValue = false;
                Object.keys(rawRow).forEach(function (key) {
                    var normKey = String(key).replace(/[^A-Za-z]/g, '').toUpperCase();
                    var mapped = MENU_EXCEL_COLUMN_MAP[normKey];
                    if (mapped) {
                        out[mapped] = String(rawRow[key] == null ? '' : rawRow[key]).trim();
                        if (out[mapped] !== '') hasValue = true;
                    }
                });
                if (out.ImagePath && !/^https?:/i.test(out.ImagePath) && out.ImagePath.indexOf('../') !== 0) {
                    out.ImagePath = '../images/menu/' + out.ImagePath;
                }
                if (hasValue) normalized.push(out);
            });

            var valid = [], errors = [];
            normalized.forEach(function (row, idx) {
                var lineNo = idx + 2;
                var rowErrors = [];
                if (!row.MenuName) rowErrors.push('MEALNAME missing');
                if (!row.DietType) rowErrors.push('DIETTYPE missing');

                ['Calories', 'Price', 'Protein', 'Carbs', 'TotalFat', 'Sodium', 'Sugar'].forEach(function (f) {
                    if (row[f] && (isNaN(row[f]) || parseFloat(row[f]) < 0)) rowErrors.push(f.toUpperCase() + ' must be a number');
                });

                if (row.DietaryType && !DIETARY_MAP[row.DietaryType.toUpperCase().replace(/\s+/g, '')]) {
                    rowErrors.push('DIETARYTYPE must be VEG / NONVEG / VEGAN');
                }
                if (row.Day && DAY_MAP[row.Day.toUpperCase().replace(/\s+/g, '')] === undefined) {
                    rowErrors.push('DAY "' + row.Day + '" not recognised');
                }

                if (rowErrors.length) {
                    errors.push('Row ' + lineNo + ': ' + rowErrors.join(', '));
                } else {
                    row._line = lineNo;
                    valid.push(row);
                }
            });

            if (errors.length) {
                var msg = 'The following rows have problems and will be SKIPPED:\n\n' + errors.join('\n') + '\n\n';
                msg += (valid.length ? valid.length + ' valid row(s) will be imported. Continue?' : 'No valid rows to import.');
                if (!valid.length) { alert(msg); restoreImportButton(btn); return; }
                if (!confirm(msg)) { restoreImportButton(btn); return; }
            } else if (!confirm('Found ' + valid.length + ' menu item(s). Import now?')) {
                restoreImportButton(btn);
                return;
            }

            importMenuRowsSequentially(valid, btn);
        } catch (err) {
            console.error('Excel parse error:', err);
            alert('Failed to read the Excel file: ' + err.message);
            restoreImportButton(btn);
        }
    };
    reader.readAsArrayBuffer(file);
}

function restoreImportButton(btn) {
    if (!btn) return;
    btn.disabled = false;
    if (btn.dataset.oldText) btn.innerHTML = btn.dataset.oldText;
}

function resolveCountryId(value) {
    if (!value) return '0';
    if (!isNaN(value)) return String(value);
    return COUNTRY_MAP[String(value).trim().toLowerCase()] || '0';
}

function yes(v, def) {
    var s = String(v || '').trim().toUpperCase();
    if (s === '') return def;
    return (s === 'YES' || s === 'Y' || s === '1' || s === 'TRUE');
}

function importMenuRowsSequentially(rows, btn) {
    var total = rows.length;
    var okCount = 0, failCount = 0, failedLines = [];
    var i = 0;

    function next() {
        if (i >= total) {
            restoreImportButton(btn);
            var msg;
            if (failCount === 0) {
                msg = 'Imported <b>' + okCount + '</b> menu item(s) successfully.';
            } else {
                msg = 'Import finished. <b>' + okCount + '</b> inserted, <b>' + failCount + '</b> failed.<br/>' +
                    '<small>Failed row(s) at line: ' + failedLines.join(', ') + '</small>';
            }
            $('#LBLRequestResult').html(msg);
            ShowModalPopUp('modalSuccess');
            setTimeout(function () { HideModalPopUp('modalSuccess'); }, 3500);
            LoadMenuTypes();
            return;
        }

        var row = rows[i];
        if (btn) btn.innerHTML = 'Importing ' + (i + 1) + ' / ' + total + '...';

        var dayKey = (row.Day || '').toUpperCase().replace(/\s+/g, '');
        var dietary = row.DietaryType ? DIETARY_MAP[row.DietaryType.toUpperCase().replace(/\s+/g, '')] : '';
        var tags = cleanCsv([row.Tags, row.FoodTags].filter(Boolean).join(','));

        var fields = {
            FOODNAME: row.MenuName,
            DESCRIPTION: row.Description || '',
            CATEGORY: row.Category || '',
            DAY: dayKey ? DAY_MAP[dayKey] : '0',
            SERVINGCODE: cleanCsv(row.ServingName),
            ALLOWEDDIETTYPE: cleanCsv(row.DietType),
            DIETARYTYPE: dietary || '',
            IMAGEPATH: row.ImagePath || '',
            ISACTIVE: yes(row.Active, true) ? '1' : '2',
            ISDEFAULTORDER: yes(row.DefaultOrder, false) ? '1' : '0',
            ALLERGENS: cleanCsv(row.Allergies).toLowerCase(),
            TAGS: tags.toLowerCase(),
            COUNTRYID: resolveCountryId(row.Country),
            CALORIES: row.Calories || '',
            PRICE: row.Price || '',
            HISID: row.HISID || '',
            VENDOR: row.Vendor || '',
            PROTEIN: row.Protein || '',
            CARBS: row.Carbs || '',
            TOTALFAT: row.TotalFat || '',
            SODIUM: row.Sodium || '',
            SUGAR: row.Sugar || '',
            INGREDIENTS: row.Ingredients || ''
        };

        $.ajax({
            url: buildMenuUrl(fields, 'INSERT', ''),
            method: 'GET',
            dataType: 'json',
            success: function (res) {
                var result = res && res[0] ? res[0].RESULT : null;
                if (result && String(result).toUpperCase() === 'TRUE') {
                    okCount++;
                } else {
                    failCount++;
                    failedLines.push(row._line);
                }
            },
            error: function () {
                failCount++;
                failedLines.push(row._line);
            },
            complete: function () {
                i++;
                setTimeout(next, 80);
            }
        });
    }

    next();
}