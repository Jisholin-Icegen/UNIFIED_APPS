
function submitPatient() {
    let isValid = true;
    $(".validation-message").remove();

    var patientName = ($("#txtPatientName").val() || "").trim();
    var country = ($("#ddlCountry").val() || "").trim();
    var room = ($("#txtRoom").val() || "").trim();
    var bed = ($("#txtBed").val() || "").trim();
    var ward = ($("#ddlWard").val() || "").trim();
    var doctor = ($("#txtDoctor").val() || "").trim();
    var age = ($("#txtAge").val() || "").trim();
    var gender = ($("#ddlGender").val() || "").trim();
    var diet = ($("#ddlDietType").val() || "").trim();
    var medicalNotes = ($("#txtMedicalNotes").val() || "").trim();
    var dietaryNotes = ($("#txtDietaryNotes").val() || "").trim();

    var isIsolation = $("#chkIsolation").is(":checked") ? "1" : "0";
    var IsolationReason = ($("#txtIsolationReason").val() || "").trim();
    var isUrgentDiet = $("#chkUrgentDiet").is(":checked") ? "1" : "0";

    var allergies = [];
    $(".allergy-pill.active").each(function () {
        var val = $(this).attr("data-value");
        if (val !== "Others") {
            allergies.push(val.replace("Custom:", ""));
        }
    });

    if (patientName === "") {
        $("#txtPatientName").css("border-color", "#ef4444");
        showValidationMessage("txtPatientName", "Patient name is required.");
        isValid = false;
    }
    if (country === "") {
        $("#ddlCountry").closest(".SumoSelect").css("border", "1px solid #ef4444");
        showValidationMessage("ddlCountry", "Country is required.");
        isValid = false;
    }
    if (room === "") {
        $("#txtRoom").css("border-color", "#ef4444");
        showValidationMessage("txtRoom", "Room is required.");
        isValid = false;
    }
    if (diet === "") {
        $("#ddlDietType").closest(".SumoSelect").css({ "border": "1px solid #ef4444", "border-radius": "14px" });
        showValidationMessage("ddlDietType", "Diet Type is required.");
        isValid = false;
    }
    if (ward === "") {
        $("#ddlWard").closest(".SumoSelect").css("border", "1px solid #ef4444");
        showValidationMessage("ddlWard", "Ward is required.");
        isValid = false;
    }
    if (doctor === "") {
        $("#txtDoctor").css("border-color", "#ef4444");
        showValidationMessage("txtDoctor", "Doctor is required.");
        isValid = false;
    }

    var id = ($("#hdnPatientId").val() || "").trim();
    var action = id ? "UPDATE" : "INSERT";

    if (!isValid) {
        setTimeout(function () {
            $("#txtPatientName, #txtRoom, #txtDoctor").css("border-color", "#edf1f5");
            $("#ddlDietType, #ddlWard, #ddlCountry").closest(".SumoSelect").css("border", "");
            $(".validation-message").fadeOut(300, function () { $(this).remove(); });
        }, 3000);
        return false;
    }

    var url;
    try {
        url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("INSERTUPDATEPATIENTDIETASSIGNMENT")) +
            "&PATIENTNAME=" + encodeURIComponent(Encrypt(patientName)) +
            "&COUNTRYID=" + encodeURIComponent(Encrypt(country)) +
            "&ROOM=" + encodeURIComponent(Encrypt(room)) +
            "&BED=" + encodeURIComponent(Encrypt(bed)) +
            "&WARD=" + encodeURIComponent(Encrypt(ward)) +
            "&DOCTOR=" + encodeURIComponent(Encrypt(doctor)) +
            "&AGE=" + encodeURIComponent(Encrypt(age)) +
            "&GENDER=" + encodeURIComponent(Encrypt(gender)) +
            "&DIETTYPE=" + encodeURIComponent(Encrypt(diet)) +
            "&ALLERGIES=" + encodeURIComponent(Encrypt(allergies.join(","))) +
            "&MEDICALNOTES=" + encodeURIComponent(Encrypt(medicalNotes)) +
            "&DIETARYNOTES=" + encodeURIComponent(Encrypt(dietaryNotes)) +
            "&ISISOLATION=" + encodeURIComponent(Encrypt(isIsolation)) +
            "&ISOLATIONREASON=" + encodeURIComponent(Encrypt(IsolationReason)) +
            "&ISURGENTDIET=" + encodeURIComponent(Encrypt(isUrgentDiet)) +
            "&ID=" + encodeURIComponent(Encrypt(id)) +
            "&ACTION=" + encodeURIComponent(Encrypt(action));
    } catch (e) {
        alert("Encrypt/URL build failed: " + (e && e.message));
        return false;
    }

    $.ajax({
        url: url,
        method: "GET",
        dataType: "json",
        success: function (res) {
            var result = res && res[0] ? res[0].RESULT : null;
            if (result && result.toUpperCase() === "TRUE") {
                $('#LBLRequestResult').html('Patient "' + patientName + '" ' + (action == "UPDATE" ? 'updated' : 'added') + ' Successfully.');
                ShowModalPopUp('modalSuccess');
                setTimeout(function () { HideModalPopUp('modalSuccess'); }, 2500);
                HideModalPopUp('admitPatientModal');
                LoadPatientDietAssignments();
            } else {
                alert("Failed to save patient");
            }
        },
        error: function (xhr, status, error) {
            alert("Ajax error: " + status + " (" + xhr.status + ")");
        }
    });
}


var EXCEL_COLUMN_MAP = {
    'PATIENTNAME': 'patientName',
    'ROOMNUMBER': 'room',
    'BED': 'bed',
    'WARD': 'ward',
    'DOCTORNAME': 'doctor',
    'AGE': 'age',
    'GENDER': 'gender',
    'DIETTYPE': 'diet',
    'ALLERGIES': 'allergies',
    'MEDICALNOTES': 'medicalNotes',
    'DIETARYNOTES': 'dietaryNotes'
};

function triggerExcelImport() {
    var inp = document.getElementById('fileExcelImport');
    inp.value = '';       
    inp.click();
}

function handleExcelImport(evt) {
    var file = evt.target.files && evt.target.files[0];
    if (!file) return;

    var ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
        alert('Please select a valid Excel file (.xlsx, .xls) or .csv');
        return;
    }

    var btn = document.querySelector('.btn-import-excel');
    if (btn) { btn.disabled = true; btn.dataset.oldText = btn.innerHTML; btn.innerHTML = 'Reading...'; }

    var reader = new FileReader();
    reader.onload = function (e) {
        try {
            var data = new Uint8Array(e.target.result);
            var workbook = XLSX.read(data, { type: 'array', cellDates: true });
            var sheetName = workbook.SheetNames[0];
            var sheet = workbook.Sheets[sheetName];
            var rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
            if (!rows || !rows.length) {
                alert('The Excel file appears to be empty.');
                restoreImportButton(btn);
                return;
            }
            var normalized = [];
            rows.forEach(function (rawRow) {
                var out = { _raw: rawRow };
                var hasValue = false;
                Object.keys(rawRow).forEach(function (key) {
                    var normKey = String(key).replace(/[^A-Za-z]/g, '').toUpperCase();
                    var mapped = EXCEL_COLUMN_MAP[normKey];
                    if (mapped) {
                        out[mapped] = String(rawRow[key] == null ? '' : rawRow[key]).trim();
                        if (out[mapped] !== '') hasValue = true;
                    }
                });
                if (hasValue) normalized.push(out);
            });

            if (!normalized.length) {
                alert('No recognisable patient rows found. Ensure your file has a header row with columns like PATIENTNAME, ROOMNUMBER, WARD, DOCTORNAME, DIETTYPE.');
                restoreImportButton(btn);
                return;
            }

            var valid = [], errors = [];
            normalized.forEach(function (row, idx) {
                var lineNo = idx + 2; 
                var rowErrors = [];
                if (!row.patientName) rowErrors.push('PATIENTNAME missing');
                if (!row.room) rowErrors.push('ROOMNUMBER missing');
                if (!row.ward) rowErrors.push('WARD missing');
                if (!row.doctor) rowErrors.push('DOCTORNAME missing');
                if (row.age && isNaN(Number(row.age))) rowErrors.push('AGE not numeric');

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
                if (!valid.length || !confirm(msg)) {
                    restoreImportButton(btn);
                    return;
                }
            }

            if (!valid.length) { restoreImportButton(btn); return; }

            if (!errors.length) {
                if (!confirm('Found ' + valid.length + ' patient row(s). Import now?')) {
                    restoreImportButton(btn);
                    return;
                }
            }

            importPatientRowsSequentially(valid, btn);
        } catch (err) {
            console.error('Excel parse error:', err);
            alert('Failed to read the Excel file: ' + err.message);
            restoreImportButton(btn);
        }
    };
    reader.onerror = function () {
        alert('Failed to read file.');
        restoreImportButton(btn);
    };
    reader.readAsArrayBuffer(file);
}

function restoreImportButton(btn) {
    if (!btn) return;
    btn.disabled = false;
    if (btn.dataset.oldText) btn.innerHTML = btn.dataset.oldText;
}


function importPatientRowsSequentially(rows, btn) {
    var total = rows.length;
    var okCount = 0, failCount = 0, failedLines = [];
    var i = 0;

    function next() {
        if (i >= total) {
            restoreImportButton(btn);
            var msg;
            if (failCount === 0) {
                msg = 'Imported <b>' + okCount + '</b> patient record(s) successfully.';
            } else if (okCount === 0) {
                msg = 'Import finished. <b>0</b> inserted, <b>' + failCount + '</b> failed.<br/>' +
                    '<small>Failed row(s) at line: ' + failedLines.join(', ') + '</small>';
            } else {
                msg = 'Import finished. <b>' + okCount + '</b> inserted, <b>' + failCount + '</b> failed.<br/>' +
                    '<small>Failed row(s) at line: ' + failedLines.join(', ') + '</small>';
            }

            $('#LBLRequestResult').html(msg);
            ShowModalPopUp('modalSuccess');
            setTimeout(function () { HideModalPopUp('modalSuccess'); }, 3500);

            LoadPatientDietAssignments();
            return;
        }

        var row = rows[i];
        if (btn) btn.innerHTML = 'Importing ' + (i + 1) + ' / ' + total + '...';

        var allergiesCsv = '';
        if (row.allergies) {
            allergiesCsv = row.allergies.split(/[;,|]/).map(function (s) { return s.trim(); }).filter(Boolean).join(',');
        }

        var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("INSERTUPDATEPATIENTDIETASSIGNMENT")) +
            "&PATIENTNAME=" + encodeURIComponent(Encrypt(row.patientName)) +
            "&ROOM=" + encodeURIComponent(Encrypt(row.room)) +
            "&BED=" + encodeURIComponent(Encrypt(row.bed || '')) +
            "&WARD=" + encodeURIComponent(Encrypt(row.ward)) +
            "&DOCTOR=" + encodeURIComponent(Encrypt(row.doctor)) +
            "&AGE=" + encodeURIComponent(Encrypt(row.age || '')) +
            "&GENDER=" + encodeURIComponent(Encrypt(row.gender || '')) +
            "&DIETTYPE=" + encodeURIComponent(Encrypt(row.diet || '')) +
            "&ALLERGIES=" + encodeURIComponent(Encrypt(allergiesCsv)) +
            "&MEDICALNOTES=" + encodeURIComponent(Encrypt(row.medicalNotes || '')) +
            "&DIETARYNOTES=" + encodeURIComponent(Encrypt(row.dietaryNotes || '')) +
            "&ID=" + encodeURIComponent(Encrypt('')) +    
            "&ACTION=" + encodeURIComponent(Encrypt('INSERT'));

        $.ajax({
            url: url,
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
        alert("Excel styling library (ExcelJS) is not loaded.");
        return;
    }

    var headers = [
        'PATIENTNAME', 'ROOMNUMBER', 'BED', 'WARD', 'DOCTORNAME', 'AGE', 'GENDER',
        'DIETTYPE', 'ALLERGIES', 'MEDICALNOTES', 'DIETARYNOTES'
    ];

    var workbook = new ExcelJS.Workbook();
    var worksheet = workbook.addWorksheet('PatientTemplate');
    var headerRow = worksheet.addRow(headers);
    headerRow.eachCell(function (cell) {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF009688' } 
        };
        cell.font = {
            color: { argb: 'FFFFFFFF' },
            bold: true
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    worksheet.columns.forEach(function (column) {
        column.width = 22;
    });
    workbook.xlsx.writeBuffer().then(function (buffer) {
        var blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        var url = window.URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'PATIENT_MANAGEMENT_TEMPLATE.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
    });
}


function LoadDietTypeDropdown() {
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETDIETTYPEDROPDOWN"));
    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (res) {

            $("#ddlDietType").empty();
            $("#ddlDietFilter").empty();
            $("#ddlNewDietType").empty();
            $("#ddlDietType").append('<option value="">All Diet Types</option>');
            $("#ddlDietFilter").append('<option value="">All diet type...</option>');
            $("#ddlNewDietType").append('<option value="">All diet type...</option>');
            $.each(res, function (i, item) {
                $("#ddlDietType").append('<option value="' + item.NAME + '">' + item.CODE + ' · ' + item.NAME + '</option>');
                $("#ddlDietFilter").append('<option value="' + item.NAME + '">' + item.NAME + ' (' + item.CODE + ')' + '</option>');
                $("#ddlNewDietType").append('<option value="' + item.NAME + '">' + item.NAME + ' (' + item.CODE + ')' + '</option>');
            });
            if ($("#ddlDietType")[0].sumo) {
                $("#ddlDietType")[0].sumo.reload();
            }
            if ($("#ddlDietFilter")[0].sumo) {
                $("#ddlDietFilter")[0].sumo.reload();
            }
            if ($("#ddlNewDietType")[0].sumo) {
                $("#ddlNewDietType")[0].sumo.reload();
            }
        }
    });
}
function SaveDiet() {
    var patientId = $("#hdnPatientId").val();
    var dietType = $("#ddlNewDietType").val();
    var notes = $("#txtDietNotes").val();
    var assignedby = $("#txtAssignedBy").val();
    var replaceAll = $("#chkReplaceDiet").is(":checked") ? "1" : "0";

    var isValid = true;
    $("#errDietType").text('');
    $("#errAssignedBy").text('');
    $("#errDietType,#txtAssignedBy").removeClass("error-border");
    if (dietType.length == 0) {
        $("#ddlNewDietType").closest(".SumoSelect").addClass("error-border");
        $("#errDietType").text("Diet type is required");
        isValid = false;
    }
    if (assignedby.length == 0) {
        $("#txtAssignedBy").addClass("error-border");
        $("#errAssignedBy").text("Assigned By is required");

        isValid = false;
    }
    if (!isValid) {

        setTimeout(function () {
            $("#ddlNewDietType").closest(".SumoSelect").removeClass("error-border");
            $("#txtAssignedBy").removeClass("error-border");

            $("#errDietType").text('');
            $("#errAssignedBy").text('');

        }, 3000);

        return false;
    }
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("ADDPATIENTDIET")) +
        "&PATIENTID=" + encodeURIComponent(Encrypt(patientId)) +
        "&DIETTYPE=" + encodeURIComponent(Encrypt(dietType)) +
        "&DIETARYNOTES=" + encodeURIComponent(Encrypt(notes)) +
        "&REPLACEALL=" + encodeURIComponent(Encrypt(replaceAll));

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (res) {

            if (res && res.length > 0 && res[0].RESULT == "TRUE") {
                ShowToast("Diet Added Successfully");
                $("#addDietPanel").slideUp();
                $(".btn-add-diet").html(
                    '<i class="fa fa-plus"></i> Add diet'
                );
                $("#txtDietNotes").val("");
                $("#chkReplaceDiet").prop("checked", false);
                LoadPatientDetails(patientId);
                $("#patientDetailsModal").modal("show");

            }
        },
        error: function () {
            alert("Ajax Error");
        }
    });
}



//here fpr fasting 


// ==========================================
// FASTING SECTION LOGIC (CONSOLIDATED)
// ==========================================

var selectedFastingMenuIds = [];

function ToggleFastingPanel() {
    var panel = $("#fastingPanel");
    var btn = $("#btnToggleFasting");

    if (panel.is(":visible")) {
        panel.slideUp(200);
        btn.html('<i class="fa fa-clock-o"></i> Manage Fasting');
    } else {
        panel.slideDown(200);
        btn.html('<i class="fa fa-times"></i> Close Fasting');
        $("#npoOrderPanel").slideUp(200);
        $(".npo-box").show();
    }
}

function toggleManageFastingDateTime() {
    var isFasting = $('#chkManageFasting').is(':checked');
    if (isFasting) {
        $('#lblManageFastingStatus').text('Yes').css('color', '#00a86b');
        $('#manageFastingDateTimeWrap').css('display', 'flex');
    } else {
        $('#lblManageFastingStatus').text('No').css('color', '#334155');
        $('#manageFastingDateTimeWrap').hide();
        $('#txtManageFastStart').val('');
        $('#txtManageFastEnd').val('');
    }
}

function toggleFastingMenuDropdown(event) {
    if (event) event.stopPropagation();
    var wrap = document.getElementById('fastingMenuMultiselect');
    wrap.classList.toggle('open');
}

document.addEventListener('click', function (e) {
    var wrap = document.getElementById('fastingMenuMultiselect');
    if (wrap && !wrap.contains(e.target)) {
        wrap.classList.remove('open');
    }
});

function LoadFastingMenuDropdown() {
    var patientId = $("#hdnPatientId").val();
    var container = document.getElementById("fastingMenuOptions");

    container.innerHTML = '<div style="padding: 10px; text-align: center; color: #94a3b8; font-size: 12px;"><i class="fa fa-spinner fa-spin"></i> Loading...</div>';

    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETFASTINGMENUITEMS")) +
        "&PATIENTID=" + encodeURIComponent(Encrypt(patientId));

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (res) {
            container.innerHTML = '';
            if (res && res.length > 0) {
                var html = '';
                $.each(res, function (i, item) {
                    var isChecked = selectedFastingMenuIds.includes(item.ID.toString()) ? "checked" : "";
                    html += `
                        <label class="multiselect-option">
                            <input type="checkbox" value="${item.ID}" data-name="${item.FOODNAME}" ${isChecked} onchange="toggleFastingMenuItem(this)">
                            <span>${item.FOODNAME}</span>
                        </label>
                    `;
                });
                container.innerHTML = html;
            } else {
                container.innerHTML = '<div style="padding: 10px; text-align: center; color: #94a3b8; font-size: 12px;">No items available</div>';
            }
            updateFastingMenuLabel();
        },
        error: function () {
            container.innerHTML = '<div style="padding: 10px; text-align: center; color: red; font-size: 12px;">Error loading items</div>';
        }
    });
}

function toggleFastingMenuItem(checkbox) {
    var val = checkbox.value;
    if (checkbox.checked) {
        if (!selectedFastingMenuIds.includes(val)) selectedFastingMenuIds.push(val);
    } else {
        selectedFastingMenuIds = selectedFastingMenuIds.filter(function (id) { return id !== val; });
    }
    updateFastingMenuLabel();
}

function updateFastingMenuLabel() {
    var label = document.getElementById("fastingMenuLabel");
    if (selectedFastingMenuIds.length === 0) {
        label.textContent = "Select fasting menus...";
        label.classList.add("placeholder");
    } else if (selectedFastingMenuIds.length === 1) {
        var firstCheckbox = document.querySelector('#fastingMenuOptions input[type="checkbox"]:checked');
        label.textContent = firstCheckbox ? firstCheckbox.getAttribute('data-name') : "1 selected";
        label.classList.remove("placeholder");
    } else {
        label.textContent = selectedFastingMenuIds.length + " selected";
        label.classList.remove("placeholder");
    }
}

function filterFastingMenuOptions() {
    var input = document.getElementById("txtSearchFastingMenu");
    var filter = input.value.toLowerCase();
    var options = document.getElementById("fastingMenuOptions").getElementsByTagName("label");

    for (var i = 0; i < options.length; i++) {
        var txtValue = options[i].textContent || options[i].innerText;
        if (txtValue.toLowerCase().indexOf(filter) > -1) {
            options[i].style.display = "flex";
        } else {
            options[i].style.display = "none";
        }
    }
}

function SaveManageFasting() {
    var patientId = $("#hdnPatientId").val();
    var isFasting = $("#chkManageFasting").is(":checked") ? "1" : "0";
    var fastStart = ($("#txtManageFastStart").val() || "").trim().replace("T", " ");
    var fastEnd = ($("#txtManageFastEnd").val() || "").trim().replace("T", " ");
    var fastingMenuIds = selectedFastingMenuIds.join(',');

    if (isFasting === "1" && !fastStart) {
        ShowToast("Please select a fasting start time.", "error");
        return;
    }

    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETFASTINGMENUITEMS")) +
        "&PATIENTID=" + encodeURIComponent(Encrypt(patientId)) +
        "&ACTION=" + encodeURIComponent(Encrypt("SAVE")) +
        "&ISFASTING=" + encodeURIComponent(Encrypt(isFasting)) +
        "&FASTINGSTART=" + encodeURIComponent(Encrypt(fastStart)) +
        "&FASTINGEND=" + encodeURIComponent(Encrypt(fastEnd)) +
        "&FASTINGMENUIDS=" + encodeURIComponent(Encrypt(fastingMenuIds));

    var btn = $("#btnCancelFasting").next("button");
    var originalHtml = btn.html();
    btn.html('<i class="fa fa-spinner fa-spin"></i> Saving...').prop("disabled", true);

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (res) {
            btn.html(originalHtml).prop("disabled", false);
            if (res && res.length > 0 && res[0].RESULT == "TRUE") {
                ShowToast("Fasting status updated successfully!");
                ToggleFastingPanel();
                if (isFasting === "1") {
                    $('#fastingStatusBadge').show();
                } else {
                    $('#fastingStatusBadge').hide();
                }
            } else {
                ShowToast("Failed to update fasting status.", "error");
            }
        },
        error: function () {
            btn.html(originalHtml).prop("disabled", false);
            ShowToast("Error connecting to server.", "error");
        }
    });
}


function SaveNpoOrder() {

    var patientId = $("#hdnPatientId").val();
    var reason = $("#txtNpoReason").val();
    var startDate = $("#txtNpoStart").val();
    var endDate = $("#txtNpoEnd").val();
    var notes = $("#txtNpoNotes").val();
    var isValid = true;
    $(".npo-input").removeClass("error-border");

    if (reason.trim() == "") {
        $("#txtNpoReason").addClass("error-border");
        isValid = false;
    }
    if (!isValid) {
        setTimeout(function () {
            $(".npo-input").removeClass("error-border");
        }, 3000);
        return false;
    }
    var url = hurl + "Service/Service.aspx?Process=" +
        encodeURIComponent(Encrypt("ADDNPORDER")) +
        "&PATIENTID=" + encodeURIComponent(Encrypt(patientId)) +
        "&REASON=" + encodeURIComponent(Encrypt(reason)) +
        "&STARTDATE=" + encodeURIComponent(Encrypt(startDate)) +
        "&ENDDATE=" + encodeURIComponent(Encrypt(endDate)) +
        "&NOTES=" + encodeURIComponent(Encrypt(notes));

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (res) {
            if (res && res.length > 0 && res[0].RESULT == "TRUE") {
                $("#npoOrderPanel").slideUp();
                $("#txtNpoReason").val("");
                $("#txtNpoStart").val("");
                $("#txtNpoEnd").val("");
                $("#txtNpoNotes").val("");
                ShowToast("NPO order created — any in-flight meal orders for this window will be cancelled.");
                setTimeout(function () {
                    location.reload();
                }, 2000);
            }
        },
        error: function () {

            alert("Ajax Error");
        }

    });

}
function ShowToast(message) {

    $("#npoToastMessage").text(message);
    $("#npoToast").fadeIn(300);
    setTimeout(function () {$("#npoToast").fadeOut(300);}, 4000);
}

function LoadWardDropdown() {
    var url = hurl +
        "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETWARDDROPDOWN"));

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (res) {
            $("#ddlWard").empty();
            $("#ddlWardFilter").empty();
            $("#ddlWard").append('<option value="">Select Ward</option>');
            $("#ddlWardFilter").append('<option value="">All Wards</option>');
            $.each(res, function (i, item) {
                $("#ddlWard").append(
                    $('<option></option>').val(item.WARDNAME).text(item.WARDNAME)
                );

                $("#ddlWardFilter").append(
                    $('<option></option>').val(item.WARDNAME).text(item.WARDNAME)
                );
            });
            if ($("#ddlWard")[0].sumo) {
                $("#ddlWard")[0].sumo.reload();
            }
            if ($("#ddlWardFilter")[0].sumo) {
                $("#ddlWardFilter")[0].sumo.reload();
            }
        }
    });
}
function LoadPatientDietAssignments() {

    var patientSearch = $("#txtSearchPatient").val();
    var ward = $("#ddlWardFilter").val();
    var doctor = $("#txtDoctorSearch").val();
    var diet = $("#ddlDietFilter").val();
    var status = $("#btnStatusFilter").attr("data-status");
    var assignedName = sessionStorage.getItem("NAME");
    if (assignedName && assignedName.trim() !== "") {
        $("#txtAssignedBy").val(assignedName);
    }
    else {
        $("#txtAssignedBy").val("");
    }
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETPATIENTDIETASSIGNMENT")) +
        "&PATIENTNAME=" + (patientSearch ? encodeURIComponent(Encrypt(patientSearch)) : "") +
        "&WARD=" + (ward ? encodeURIComponent(Encrypt(ward)) : "") +
        "&DOCTOR=" + (doctor ? encodeURIComponent(Encrypt(doctor)) : "") +
        "&DIETTYPE=" + (diet ? encodeURIComponent(Encrypt(diet)) : "") +
        "&STATUS=" + (status ? encodeURIComponent(Encrypt(status.trim())) : "");

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (data) {
            $("#tblPatientDietBody").empty();
            if (data.length > 0) {
                $("#emptyDietMessage").hide();
                $("#patientCountText").text(data.length + " of " + data.length + " patients");
                $.each(data, function (i, item) {
                    var admittedDate = formatDisplayDate(item.CREATEDDATE);
                    var lastAssigned = formatDisplayDate(item.CREATEDDATE);
                    var allergyHtml = "";
                    if (
                        item.ALLERGIES &&
                        item.ALLERGIES.trim() !== "" &&
                        item.ALLERGIES.toLowerCase() !== "none"
                    ) {
                        var allergyList = item.ALLERGIES.split(",");
                        $.each(allergyList, function (a, allergy) {
                            allergyHtml += "<span class='allergy-badge'>" + allergy.trim() + "</span>";

                        });
                    }
                    else {
                        allergyHtml = "<span class='no-allergy'>None</span>";
                    }

                    var row = "";
                    row += "<tr class='patient-row' data-id='" + item.ID + "' " +
                        "data-patient='" + item.PATIENTNAME + "' " +
                        "data-room='" + item.ROOMNUMBER + "' " +
                        "data-doctor='" + item.DOCTORNAME + "' " +
                        "data-diet='" + item.DIETTYPE + "' " +
                        "data-allergies='" + item.ALLERGIES + "' " +
                        "data-notes='" + item.MEDICALNOTES + "'>";
                    row += "<td class='room-text'>" + item.ROOMNUMBER + "</td>";
                    row += "<td>";

                    row += "<div class='patient-name'>";
                    row += item.PATIENTNAME;
                    if (item.NPO_FLAG == true || parseInt(item.NPO_FLAG) === 1) {
                        row += "<span class='npo-table-badge'>";
                        row += "<i class='fa fa-exclamation-circle'></i>";
                        row += " NPO";
                        row += "</span>";
                    }

                    row += "</div>";

                    row += "<div class='admitted-date'>";
                    row += "Admitted " + admittedDate;
                    row += "</div>";

                    row += "</td>";

                    row += "<td>" + item.WARD + "</td>";

                    var countryDisplay = item.CountryName ? item.CountryName : "<span style='color:#94a3b8;'>-</span>";
                    row += "<td>" + countryDisplay + "</td>";

                    var isIsolation = (item.IS_ISOLATION == 1 || item.IS_ISOLATION === true);
                    var isolationDisplay = isIsolation
                        ? "<span style='color:#ef4444; font-weight:bold;'>Yes</span>"
                        : "<span style='color:#64748b;'>No</span>";
                    row += "<td>" + isolationDisplay + "</td>";

                    row += "<td>" + item.DOCTORNAME + "</td>";

                    row += "<td>";
                    if (item.DIETTYPE) {
                        var diets = item.DIETTYPE.split(',');
                        $.each(diets, function (i, diet) {
                            row += "<span class='diet-badge'>";
                            row += "<span class='diet-icon'>🥣</span>";
                            row += diet.trim();
                            row += "</span> ";
                        });
                    }

                    row += "</td>";
                    row += "<td>" + allergyHtml + "</td>";
                    row += "<td>" + item.MEDICALNOTES + "</td>";
                    row += "<td>" + lastAssigned + "</td>";
                    row += "<td>";
                    row += "<div class='d-flex gap-2'>";
                    row += "<button type='button' class='btn-manage' data-id='" + item.ID + "'>Manage</button>";
                    row += "<button type='button' class='btn-manage btn-edit' onclick='EditPatient(" + item.ID + ")' title='Edit Patient'><i class='fa fa-pencil-alt'></i></button>";
                    row += "</div>";
                    row += "</td>";
                    row += "</tr>";
                    $("#tblPatientDietBody").append(row);
                });
            }
            else {
                $("#emptyDietMessage").show();
            }
        },
        error: function (xhr, status, error) {
            console.log(error);
        }
    });

}

function ToggleStatusFilter() {

    var btn = $("#btnStatusFilter");
    var currentStatus = btn.attr("data-status");
    if (currentStatus == "1") {
        btn.attr("data-status", "");
        btn.removeClass("active-mode");
    }
    else {
        btn.attr("data-status", "1");
        btn.addClass("active-mode");
    }
    LoadPatientDietAssignments();
}

$("#btnStatusFilter").on("click", function () {
    if (statusFilter == "1") {
        statusFilter = "";
        $(this).removeClass("btn-active-selected");
        $(this).text("All");
    }
    else {
        statusFilter = "1";
        $(this).addClass("btn-active-selected");
        $(this).text("Active");
    }
    LoadPatientDietAssignments();

});
$(document).on("click", "#btnDietTab", function () {
    $("#btnClinicalTab").removeClass("active");
    $("#btnDietTab").addClass("active");
    $("#clinicalTabContent").hide();
    $("#dietTabContent").show();
});
$(document).on("click", "#btnClinicalTab", function () {
    $("#btnDietTab").removeClass("active");
    $("#btnClinicalTab").addClass("active");
    $("#dietTabContent").hide();
    $("#clinicalTabContent").show();

});
$(document).on("click", ".btn-order-npo", function () {
    $("#npoOrderPanel").slideDown(200);
});
$(document).on("click", "#btnCancelNpo", function () {
    $("#npoOrderPanel").slideUp(200);
});
$(document).on("click", ".btn-order-npo", function () {
    $("#npoOrderPanel").slideDown(200);
    $(".npo-box").hide();
});
$(document).on("click", "#btnCancelNpo", function () {
    $("#npoOrderPanel").slideUp(200);
    $(".npo-box").show();
});

$(document).on("click", ".btn-manage", function () {

    var id = $(this).attr("data-id");

    LoadPatientDetails(id);

});
function OpenLiftNPOModal() {

    $("#txtLiftNpoNotes").val("");

    $("#liftNpoModal").modal("show");

}
function LiftNpoOrder() {
    var patientId = $("#hdnPatientId").val();
    var notes = $("#txtLiftNpoNotes").val();
    var url = hurl + "Service/Service.aspx?Process=" +
        encodeURIComponent(Encrypt("LIFTNPOORDER")) +
        "&PATIENTID=" + encodeURIComponent(Encrypt(patientId)) +
        "&NOTES=" + encodeURIComponent(Encrypt(notes));
    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (res) {
            if (res && res.length > 0 && res[0].RESULT == "TRUE") {
                $("#liftNpoModal").modal("hide");
                $("#npoBanner").hide();
                $("#npoOrderTitle").text("NPO ORDERS (0 ACTIVE)");
                $("#npoOrdersContainer").html("");
                $("#npoBox").show().text("No active NPO. Patient may order meals normally.");
                ShowToast("NPO lifted — patient may now order meals.");
                LoadPatientDietAssignments();
            }
        },
        error: function () {
            alert("Ajax Error");
        }
    });
}
function LoadPatientDetails(id) {
    $("#hdnPatientId").val(id);
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETPATIENTDETAILSBYID")) +
        "&ID=" + encodeURIComponent(Encrypt(id));

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (res) {
            if (res.length > 0) {
                var item = res[0];
                selectedFastingMenuIds = [];
                document.getElementById('txtSearchFastingMenu').value = '';

                if (item.FASTING_MENU_ID) {
                    selectedFastingMenuIds = item.FASTING_MENU_ID.toString().split(',').map(function (id) { return id.trim(); });
                }
                LoadFastingMenuDropdown(); 
                if (item.IS_FASTING == true || parseInt(item.IS_FASTING) === 1) {
                    $('#chkManageFasting').prop('checked', true);
                    $('#lblManageFastingStatus').text('Yes').css('color', '#00a86b');
                    $('#manageFastingDateTimeWrap').css('display', 'flex');
                    $('#fastingStatusBadge').show();

                    if (item.FASTING_START) {
                        var startDate = parseServerDate(item.FASTING_START);
                        if (startDate) $('#txtManageFastStart').val(startDate.toISOString().slice(0, 16));
                    }
                    if (item.FASTING_END) {
                        var endDate = parseServerDate(item.FASTING_END);
                        if (endDate) $('#txtManageFastEnd').val(endDate.toISOString().slice(0, 16));
                    }
                } else {
                    $('#chkManageFasting').prop('checked', false);
                    $('#lblManageFastingStatus').text('No').css('color', '#334155');
                    $('#manageFastingDateTimeWrap').hide();
                    $('#txtManageFastStart').val('');
                    $('#txtManageFastEnd').val('');
                    $('#fastingStatusBadge').hide();
                }

                // Reset Fasting Panel state
                $("#fastingPanel").hide();
                $("#btnToggleFasting").html('<i class="fa fa-clock-o"></i> Manage Fasting');

           
                $("#popupPatientName").text(item.PATIENTNAME);
                $("#popupRoomNo").text(item.ROOMNUMBER);
                $("#popupDoctor").text(item.DOCTORNAME);

                if (item.ALLERGIES && item.ALLERGIES.trim() !== "" && item.ALLERGIES.toLowerCase() !== "none") {
                    $("#popupAllergyWrap").html('<span class="patient-allergy-pill">' + item.ALLERGIES + '</span>');
                } else {
                    $("#popupAllergyWrap").html("");
                }
                if (item.NPO_FLAG == true || parseInt(item.NPO_FLAG) === 1) {
                    $("#npoBanner").show();
                    $("#npoReasonText").html('<i class="fa fa-exclamation-triangle"></i>Reason: ' + item.NPO_REASON);
                    $("#npoOrderTitle").text("NPO ORDERS (1 ACTIVE)");
                    var startTime = parseServerDate(item.NPO_STARTDATE);
                    var timeAgoText = "Just now";
                    if (startTime) {
                        var diffMs = (new Date() - startTime);
                        var diffMins = Math.floor(diffMs / 60000);
                        if (diffMins < 1) timeAgoText = "Started less than a minute ago";
                        else if (diffMins < 60) timeAgoText = "Started " + diffMins + " minutes ago";
                        else timeAgoText = "Started " + Math.floor(diffMins / 60) + " hours ago";
                    }

                    var expiryDate = parseServerDate(item.NPO_ENDDATE);
                    var expiryText = "";
                    if (expiryDate) {
                        var datePart = expiryDate.toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
                        var timePart = expiryDate.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: false });
                        expiryText = " · Auto-expires " + datePart + ", " + timePart;
                    }

                    var npoHtml = `
                        <div class="npo-order-card">
                            <div class="npo-card-header">
                                <div class="npo-card-title">
                                    <i class="fa fa-stop-circle" style="color: #ef4444; margin-right: 8px;"></i>
                                    ${item.NPO_REASON}
                                </div>
                                <button class="btn-lift-npo" onclick="OpenLiftNPOModal()">Lift</button>
                            </div>
                            <div class="npo-time-info" style="font-size: 12px; color: #64748b; margin-top: 5px;">
                                ${timeAgoText}${expiryText}
                            </div>
                            <div class="npo-created-by" style="font-size: 12px; color: #64748b; margin-top: 2px;">
                                Ordered by <b>System Administrator</b> 
                            </div>
                        </div>`;

                    $("#npoOrdersContainer").html(npoHtml);
                    $("#npoBox").hide();
                }
                else {
                    $("#npoBanner").hide();
                    $("#npoReasonText").text("");
                    $("#npoOrderTitle").text("NPO ORDERS (0 ACTIVE)");
                    $("#npoOrdersContainer").html("");
                    $("#npoBox").show();

                }
                var dietWrap = $("#popupDietWrap");
                dietWrap.empty();

                if (item.DIETTYPE && item.DIETTYPE.trim() !== "") {
                    var diets = item.DIETTYPE.split(',');
                    $(".section-title-row h5").text("CURRENT DIETS (" + diets.length + ")");
                    $.each(diets, function (i, name) {
                        name = name.trim();
                        if (name === "") return;

                        var label = "DIET";
                        var lowerName = name.toLowerCase();

                        if (lowerName.includes("vegetarian")) label = "VEG";
                        else if (lowerName.includes("soft")) label = "SOFT";
                        else if (lowerName.includes("liquid")) label = "LIQ";
                        else if (lowerName.includes("diabetic")) label = "DBT";
                        else if (lowerName.includes("renal")) label = "RNL";
                        else if (lowerName.includes("regular")) label = "REG";
                        else {
                            label = name.split(' ')[0].substring(0, 3).toUpperCase();
                        }
                        var chipHtml = `
                            <div class="diet-item-pill">
                                <div class="diet-item-inner">
                                    <span class="diet-item-icon">🥣</span>
                                    <span class="diet-item-code">${label}</span>
                                    <span class="diet-item-name">${name}</span>
                                    <i class="fa fa-magic diet-item-sparkle"></i>
                                </div>
                                <button type="button" class="diet-item-remove" onclick="RemoveDiet('${name}')">&times;</button>
                            </div>`;

                        dietWrap.append(chipHtml);
                    });
                } else {
                    $(".section-title-row h5").text("CURRENT DIETS (0)");
                }
                var historyHtml = "";
                $.each(res, function (i, hItem) {
                    var hName = hItem.DIETTYPE || "N/A";
                    var hLabel = hName.substring(0, 3).toUpperCase();
                    if (hName.toLowerCase().includes("vegetarian")) hLabel = "VEG";

                    historyHtml += `
                        <div class="diet-history-card">
                            <div class="diet-history-top">
                                <div class="diet-history-left">
                                    <span class="diet-history-code">${hLabel}</span>
                                    <span class="diet-history-title">${hName}</span>
                                    <span class="diet-history-status">Active</span>
                                </div>
                                <div class="diet-history-date">${formatDisplayDateTime(hItem.CREATEDDATE)}</div>
                            </div>
                            <div class="diet-history-doctor">By Dr. ${hItem.DOCTORNAME}</div>
                            ${hItem.MEDICALNOTES ? `<div class="diet-history-description">${hItem.MEDICALNOTES}</div>` : ""}
                        </div>`;
                });

                $("#popupDietHistory").html(historyHtml);
                $("#historyCount").text("(" + res.length + ")");
                $("#patientDetailsModal").modal("show");
            }
        }
    });
}
function RemoveDiet(dietName) {

    var patientId = $("#hdnPatientId").val();
    var url = hurl + "Service/Service.aspx?Process=" +
        encodeURIComponent(Encrypt("REMOVEDIET")) +
        "&PATIENTID=" + encodeURIComponent(Encrypt(patientId)) +
        "&DIETTYPE=" + encodeURIComponent(Encrypt(dietName));


    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",

        success: function (res) {

            if (res.length > 0 && res[0].RESULT == "TRUE") {
                ShowToast("Diet Removed Successfully");
                LoadPatientDetails(patientId);
            }

        },

        error: function () {
            alert("Error removing diet");
        }

    });

}
$(document).on("click", ".btn-add-diet", function () {
    var btn = $(this);
    if ($("#addDietPanel").is(":visible")) {
        $("#addDietPanel").slideUp(200);
        btn.html('<i class="fa fa-plus"></i> Add diet');
    } else {
        $("#addDietPanel").slideDown(200);
        btn.html('<i class="fa fa-times"></i> Close');
    }
});

$(document).on("click", "#btnCancelDiet", function () {
    $("#addDietPanel").slideUp(200);
    $(".btn-add-diet").html(
        '<i class="fa fa-plus"></i> Add diet'
    );
});
$(document).on("click", "#toggleDietHistory", function () {
    $("#popupDietHistory").slideToggle(200);
    $("#historyArrow").toggleClass("rotate");
});
function parseServerDate(dateString) {
    if (!dateString)
        return null;
    var createdDate;
    if (dateString.indexOf("/Date(") >= 0) {
        var timestamp = parseInt(
            dateString.replace("/Date(", "").replace(")/", "")
        );
        createdDate = new Date(timestamp);
    }
    else {
        createdDate = new Date(dateString.replace(" ", "T"));
    }
    return createdDate;

}
function formatDisplayDate(dateString) {

    var createdDate = parseServerDate(dateString);
    if (!createdDate || isNaN(createdDate.getTime()))
        return "";
    return createdDate.toLocaleDateString("en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );
}

function formatDisplayDateTime(dateString) {
    var createdDate = parseServerDate(dateString);
    if (!createdDate || isNaN(createdDate.getTime()))
        return "";

    var datePart = createdDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });

    var timePart = createdDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });

    return datePart + " " + timePart;
}


function showValidationMessage(id, message) {
    var $element = $("#" + id);
    $element.next(".validation-message").remove();
    $element.closest(".SumoSelect").next(".validation-message").remove();

    if ($element.closest(".SumoSelect").length > 0) {
        $element.closest(".SumoSelect").after('<div class="validation-message">' + message + '</div>');
    } else {
        $element.after('<div class="validation-message">' + message + '</div>');
    }
}
$(document).on("keyup change", "#txtPatientName", function () {
    if ($(this).val().trim() !== "") {
        $("#valPatientName").hide();
        $(this).css({ "border-color": "#edf1f5", "box-shadow": "none" });
        $(this).next(".validation-message").remove();

    }
});
$(document).on("keyup change", "#txtRoom", function () {
    if ($(this).val().trim() !== "") {
        $("#valRoom").hide();
        $(this).css({ "border-color": "#edf1f5", "box-shadow": "none" });
        $(this).next(".validation-message").remove();
    }
});
$(document).on("change", "#ddlWard", function () {
    if ($(this).val().trim() !== "") {
        $("#valWard").hide();
        $(this).css({ "border-color": "#edf1f5", "box-shadow": "none" });
        $(this).next(".validation-message").remove();
    }
});
$(document).on("keyup change", "#txtDoctor", function () {
    if ($(this).val().trim() !== "") {
        $("#valDoctor").hide();
        $(this).css({ "border-color": "#edf1f5", "box-shadow": "none" });
        $(this).next(".validation-message").remove();
    }
});

let selectedAllergies = [];

$(document).on("click", ".allergy-pill", function (e) {
    let $this = $(this);
    let value = $this.attr("data-value");

    if ($this.attr('id') === 'pillOthers') {
        if ($this.hasClass('active')) {
            $this.removeClass('active');
            $('#customAllergyWrapper').slideUp(200);
            $('#customAllergyTags').empty();
        } else {
            $this.addClass('active');
            $('#customAllergyWrapper').slideDown(200);
            setTimeout(function () {
                $('#txtCustomAllergy').focus();
            }, 250);
        }
        return;
    }

    $this.toggleClass('active');

    if ($this.hasClass('active')) {
        if (!selectedAllergies.includes(value)) {
            selectedAllergies.push(value);
        }
    } else {
        selectedAllergies = selectedAllergies.filter(x => x !== value);
    }
});

function AddCustomAllergyTag() {
    var $input = $("#txtCustomAllergy");
    var val = ($input.val() || "").trim();
    if (!val) return;
    var $existingMasterPill = $("#allergyPillsContainer .allergy-pill").filter(function () {
        return $(this).attr("id") !== "pillOthers" &&
            ($(this).attr("data-value") || "").replace(/^Custom:/i, "").trim().toLowerCase() === val.toLowerCase();
    });

    if ($existingMasterPill.length > 0) {
        $existingMasterPill.first().addClass("active");
        var existingName = $existingMasterPill.first().attr("data-value").replace(/^Custom:/i, "").trim();
        if (!selectedAllergies.includes(existingName)) {
            selectedAllergies.push(existingName);
        }
        $input.val("").focus();
        ShowToast('"' + existingName + '" selected.', "info");
        return;
    }

    var $addBtn = $("#customAllergyWrapper button");
    $addBtn.prop("disabled", true).text("Adding...");

    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("ALLERGYMASTER")) +
        "&ACTION=" + encodeURIComponent(Encrypt("INSERT")) +
        "&ALLERGYCODE=" + encodeURIComponent(Encrypt("")) +
        "&ALLERGYNAME=" + encodeURIComponent(Encrypt(val)) +
        "&ISACTIVE=" + encodeURIComponent(Encrypt("1"));

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (res) {
            $addBtn.prop("disabled", false).text("Add");

            var result = res && res[0] ? (res[0].RESULT || res[0].Status || "") : "";
            if (String(result).toUpperCase() === "TRUE" || String(result).toUpperCase() === "SUCCESS") {
                var $pill = $("<span>", {"class": "allergy-pill active","attr": { "data-value": val }, "text": val});
                $pill.insertBefore($("#pillOthers"));

                if (!selectedAllergies.includes(val)) {
                    selectedAllergies.push(val);
                }

                $input.val("").focus();
                ShowToast('"' + val + '" added to Allergy Master.', "success");
            } else {
                var msg = (res && res[0] && (res[0].MESSAGE || res[0].Message)) || "Failed to add allergy to Allergy Master.";
                ShowToast(msg, "error");
            }
        },
        error: function () {
            $addBtn.prop("disabled", false).text("Add");
            ShowToast("Error saving allergy to Allergy Master.", "error");
        }
    });
}

function RemoveCustomAllergyTag(tagId) {
    $('#' + tagId).remove();
}

function EditPatient(id) {
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETPATIENTDETAILSBYID")) + "&ID=" + encodeURIComponent(Encrypt(id));

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (res) {
            if (res.length > 0) {
                var item = res[0];

                openAdmitPatientModal(item.COUNTRYID, item.ALLERGIES || "");

                $("#hdnPatientId").val(item.ID);
                $(".custom-modal-header h2").text("Edit Patient Details");

                $("#txtPatientName").val(item.PATIENTNAME);
                $("#txtRoom").val(item.ROOMNUMBER);
                $("#txtBed").val(item.BED || '');
                $("#txtDoctor").val(item.DOCTORNAME);
                $("#txtAge").val(item.AGE || '');
                $("#txtMedicalNotes").val(item.MEDICALNOTES || '');
                $("#txtDietaryNotes").val(item.DIETARYNOTES || '');

                setTimeout(function () {
                    if (item.WARD) {
                        var wardVal = String(item.WARD);
                        $("#ddlWard").val(wardVal);
                        if ($("#ddlWard")[0] && $("#ddlWard")[0].sumo) {
                            $("#ddlWard")[0].sumo.selectItem(wardVal);
                        }
                    }

                    if (item.GENDER) {
                        var genderVal = String(item.GENDER);
                        $("#ddlGender").val(genderVal);
                        if ($("#ddlGender")[0] && $("#ddlGender")[0].sumo) {
                            $("#ddlGender")[0].sumo.selectItem(genderVal);
                        }
                    }

                    if (item.DIETTYPE) {
                        var dietVal = String(item.DIETTYPE);
                        $("#ddlDietType").val(dietVal);
                        if ($("#ddlDietType")[0] && $("#ddlDietType")[0].sumo) {
                            $("#ddlDietType")[0].sumo.selectItem(dietVal);
                        }
                    }
                }, 50);

                if (item.IS_ISOLATION == 1 || item.IS_ISOLATION == true) {
                    $("#chkIsolation").prop("checked", true).trigger('change');
                    $("#txtIsolationReason").val(item.ISOLATIONREASON || '');
                } else {
                    $("#chkIsolation").prop("checked", false).trigger('change');
                    $("#txtIsolationReason").val('');
                }
            }
        }
    });
}

function getOrderDashRoleId() {
    return (sessionStorage.getItem('ROLE') || sessionStorage.getItem('ROLEID') || '0').toString();
}

function LoadNotifications() {
    var roleId = getOrderDashRoleId();
    var url = hurl + "Service/Service.aspx?Process=" +
        encodeURIComponent(Encrypt("GETNOTIFICATIONSLIST")) +
        "&MAXCOUNT=" + encodeURIComponent(Encrypt("20")) +
        "&ROLEID=" + encodeURIComponent(Encrypt(roleId));

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
    var roleId = getOrderDashRoleId();
    var url = hurl + "Service/Service.aspx?Process=" +
        encodeURIComponent(Encrypt("MARKNOTIFICATIONASREAD")) +
        "&NOTIFICATIONID=" + encodeURIComponent(Encrypt(NotificationID)) +
        "&ROLEID=" + encodeURIComponent(Encrypt(roleId));

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
    var roleId = getOrderDashRoleId();
    var url = hurl + "Service/Service.aspx?Process=" +
        encodeURIComponent(Encrypt("GETUNREADNOTIFICATIONCOUNTS")) +
        "&ROLEID=" + encodeURIComponent(Encrypt(roleId));

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
    var roleId = getOrderDashRoleId();
    var url = hurl + "Service/Service.aspx?Process=" +
        encodeURIComponent(Encrypt("MARKALLNOTIFICATIONSASREAD")) +
        "&ROLEID=" + encodeURIComponent(Encrypt(roleId));

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
function openAdmitPatientModal(countryId, allergiesCsv) { 
    $("#ddlDietType").val("");
    $("#urgentDietWrap").hide();
    $("#chkUrgentDiet").prop("checked", false);
    $("#admitPatientModal input[type='text']").val("");
    $("#admitPatientModal textarea").val("");

    $("#chkFasting").prop("checked", false);
    $("#lblFastingStatus").text('No').css('color', '#334155');
    $("#fastingDateTimeWrap").hide();
    $("#txtFastStart").val('');
    $("#txtFastEnd").val('');

    $("#chkIsolation").prop("checked", false);
    $("#isolationReasonWrap").hide();
    $("#txtIsolationReason").val("");

    $("#hdnPatientId").val("");
    $(".custom-modal-header h2").text("Admit New Patient");
    $(".allergy-pill").removeClass("active");
    $("#customAllergyTags").empty();
    $("#customAllergyWrapper").slideUp(0);
    $("#txtCustomAllergy").val("");
    LoadAllergyMasterPills(allergiesCsv || "");
    LoadCountryDropdown(countryId);

    $("#admitPatientModal").modal({ backdrop: 'static', keyboard: false });
    ShowModalPopUp('admitPatientModal');
}

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
var FOOD_MENU = { Breakfast: [], Lunch: [], Dinner: [], Beverages: [], Snacks: [] };
var currentMeal = "Breakfast";
var selections = { Breakfast: {}, Lunch: {}, Dinner: {}, Beverages: {}, Snacks: {} };

var MEAL_ICONS = {
    Breakfast: "../images/breakfast-icon.png",
    Lunch: "../images/lunch-icon.png",
    Dinner: "../images/dinner-icon.png",
    Beverages: "../images/beverages-icon.png",
    Snacks: "../images/snacks-icon.png"
};

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
    var mealPriority = {
        'Breakfast': 1,
        'Lunch': 2,
        'Dinner': 3,
        'Beverages': 4,
        'Snacks': 5
    };
    var currentMealVal = currentActiveMealType || 'Breakfast';
    if (!isPreBook) {
        return item.MEALTYPE === currentMealVal;
    }
    if (orderDate === today) {
        return mealPriority[item.MEALTYPE] >= mealPriority[currentMealVal];
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
        defaultSelectedMap.set(uniqueKey, {
            id: foodItem.id,
            name: foodItem.name,
            desc: foodItem.desc || '',
            mealType: currentActiveMealType,
            qty: foodItem.qty || 1,
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
    var mealType = currentActiveMealType || 'Breakfast';
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
function LoadNotifications() {
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETNOTIFICATIONSLIST")) + "&MAXCOUNT=" + encodeURIComponent(Encrypt("20"));
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
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("MARKNOTIFICATIONASREAD")) + "&NOTIFICATIONID=" + encodeURIComponent(Encrypt(NotificationID));
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
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETUNREADNOTIFICATIONCOUNTS"));
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
function toggleFastingDateTime() {
    var isFasting = $('#chkFasting').is(':checked');
    if (isFasting) {
        $('#lblFastingStatus').text('Yes').css('color', '#00a86b');
        $('#fastingDateTimeWrap').css('display', 'flex');
    } else {
        $('#lblFastingStatus').text('No').css('color', '#334155');
        $('#fastingDateTimeWrap').hide();
        $('#txtFastStart').val('');
        $('#txtFastEnd').val('');
    }
}
function MarkAllNotificationsAsRead() {
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("MARKALLNOTIFICATIONSASREAD"));
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

function LoadCountryDropdown(selectedCountryId) {
    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("GETCOUNTRIES"));

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (res) {
            var ddl = $("#ddlCountry");

            if (ddl[0] && ddl[0].sumo) {
                ddl[0].sumo.unload();
            }
            ddl.empty();
            ddl.append('<option value="">Select Country</option>');

            if (res && res.length > 0) {
                $.each(res, function (i, item) {
                    ddl.append('<option value="' + item.ID + '">' + item.CountryName + '</option>');
                });
            } else {
                ddl.append('<option value="">No countries found</option>');
            }

            ddl.SumoSelect({ placeholder: 'Select Country' });

            if (selectedCountryId && selectedCountryId !== "0" && selectedCountryId !== "") {
                var valStr = String(selectedCountryId);

                setTimeout(function () {
                    if (ddl[0] && ddl[0].sumo) {

                        ddl[0].sumo.unSelectAll();

                        ddl[0].sumo.selectItem(valStr);

                        ddl.val(valStr);
                    }
                }, 50);
            }
        },
        error: function (xhr, status, error) {
            console.log("Error loading countries:", error);
            var ddl = $("#ddlCountry");
            if (ddl[0] && ddl[0].sumo) {
                ddl[0].sumo.unload();
            }
            ddl.empty();
            ddl.append('<option value="">Error loading countries</option>');
            ddl.SumoSelect();
        }
    });
}
function LoadAllergyMasterPills(preselectedCsv) {
    var $container = $("#allergyPillsContainer");
    var $pillOthers = $("#pillOthers");
    if (!$container.length || !$pillOthers.length) return;

    // Remove previously loaded dynamic master pills (keep #pillOthers, #customAllergyWrapper, #customAllergyTags)
    $container.children(".allergy-pill").not("#pillOthers").remove();
    $("#customAllergyTags").empty();
    $("#pillOthers").removeClass("active");
    $("#customAllergyWrapper").hide();
    $("#txtCustomAllergy").val("");
    selectedAllergies = [];

    var preselectedList = [];
    if (preselectedCsv && preselectedCsv.trim() !== "" && preselectedCsv.toLowerCase() !== "none") {
        preselectedList = preselectedCsv.split(",").map(function (s) {
            return s.trim();
        }).filter(Boolean);
    }

    var url = hurl + "Service/Service.aspx?Process=" + encodeURIComponent(Encrypt("ALLERGYMASTER")) +
        "&ACTION=" + encodeURIComponent(Encrypt("GETLIST")) +
        "&SEARCHTEXT=" + encodeURIComponent(Encrypt("")) +
        "&SHOWINACTIVE=" + encodeURIComponent(Encrypt("0"));

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (res) {
            $container.children(".allergy-pill").not("#pillOthers").remove();

            var list = Array.isArray(res)
                ? res
                : (res && res.Tables && res.Tables[0] && res.Tables[0].Rows ? res.Tables[0].Rows : []);

            var masterNamesLower = [];

            $.each(list, function (i, item) {
                var isActive = item.ISACTIVE === undefined || item.ISACTIVE === true || item.ISACTIVE == 1;
                if (!isActive) return;

                var allergyName = (item.AllergyName || item.ALLERGYNAME || item.NAME || "").trim();
                if (!allergyName) return;

                masterNamesLower.push(allergyName.toLowerCase());

                var isSelected = preselectedList.some(function (p) {
                    return p.toLowerCase() === allergyName.toLowerCase();
                });

                if (isSelected && !selectedAllergies.includes(allergyName)) {
                    selectedAllergies.push(allergyName);
                }

                var $pill = $("<span>", {
                    "class": "allergy-pill" + (isSelected ? " active" : ""),
                    "attr": { "data-value": allergyName },
                    "text": allergyName
                });

                // Insert right before "Others" so "Others" always stays last
                $pill.insertBefore($pillOthers);
            });

            // Any saved allergy not in Allergy Master goes into "Others" custom tags (same behavior as before)
            preselectedList.forEach(function (savedName) {
                if (masterNamesLower.indexOf(savedName.toLowerCase()) === -1) {
                    if (!$("#pillOthers").hasClass("active")) {
                        $("#pillOthers").addClass("active");
                        $("#customAllergyWrapper").css("display", "flex");
                    }

                    var tagId = "custom_" + Date.now() + Math.floor(Math.random() * 100);
                    var tagHtml =
                        '<span class="allergy-pill active" id="' + tagId + '" data-value="Custom:' + escapeHtml(savedName) + '" style="background: #fef2f2; border-color: #ef4444; color: #b91c1c; margin-right: 6px; margin-bottom: 6px;">' +
                        escapeHtml(savedName) + ' <i class="fa fa-times ms-1" style="cursor:pointer;" onclick="event.stopPropagation(); RemoveCustomAllergyTag(\'' + tagId + '\')"></i>' +
                        '</span>';

                    $("#customAllergyTags").append(tagHtml);
                }
            });
        },
        error: function () {
            console.error("Failed to load allergies from Allergy Master.");
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
function ShowModalPopUp(ModalId) {
    $('#' + ModalId).modal('show');
}
function HideModalPopUp(ModalId) {
    $('#' + ModalId).modal('hide');
}
