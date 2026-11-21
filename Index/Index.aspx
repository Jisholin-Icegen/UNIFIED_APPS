<%@ Page Language="C#" AutoEventWireup="true" CodeFile="Index.aspx.cs" Inherits="Index_Index" ValidateRequest="false" %>
  
<html lang="en">

<head>
    <title>Home | TRACZO</title>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- Favicon -->
    <link rel="icon" href="../favicon.png" />
    <!-- CSS -->
    <link rel="stylesheet" type="text/css" href="../css/bootstrap.min.css" />
    <link rel="stylesheet" type="text/css" href="../css/sumoselect.min.css">

    <link rel="stylesheet" type="text/css" href="../css/style.css" />
    <link href="../css/pager.css" rel="stylesheet" />
    <link href="../css/changepwd.css" rel="stylesheet" />
    <link href="../css/ajax.min.css" rel="stylesheet" />

    <script src="../js/jquery-3.6.4.min.js" type="text/javascript"></script>

    <script type="text/javascript" src="../Scripts/echarts.min.js"></script>
    <script type="text/javascript" src="../Scripts/apexcharts.min.js"></script>

    <script type="text/javascript" src="../FUSIONCHARTS/fusioncharts.js"></script>
    <script type="text/javascript" src="../FUSIONCHARTS/themes/fusioncharts.theme.fint.js"></script>

    <script src="../js/aes.js" type="text/javascript"></script>
    <script src="../js/Index13.js" type="text/javascript"></script>
    <script src="../js/bulk.js" type="text/javascript"></script>
    <script src="../js/ChangePassword.js" type="text/javascript"></script>
    <telerik:RadCodeBlock ID="RadCodeBlock" runat="server">

        <script type="text/javascript">
            var dataSet = [], hurl =  '<%=ConfigurationManager.AppSettings["HTTP"].ToString() %>' + '://' +'<%=ConfigurationManager.AppSettings["EPEServer"].ToString() %>' + ':' + '<%=ConfigurationManager.AppSettings["AppPort"].ToString() %>' + "/Index/",
                divServiceArray = ['divPorteringService', 'divCateringService', 'divCleaningService', 'divFeedbackService', 'divSecurityService'],
                urlPageValidation =  '<%=ConfigurationManager.AppSettings["HTTP"].ToString() %>' + '://' +'<%=ConfigurationManager.AppSettings["EPEServer"].ToString() %>' + ':' + '<%=ConfigurationManager.AppSettings["AppPort"].ToString() %>' + "/MasterPage/Service/Service.aspx?",
                CryptoKey = '<%=ConfigurationManager.AppSettings["CryptoKey"].ToString() %>',
                CryptoPwd = '<%=ConfigurationManager.AppSettings["CryptoIV"].ToString() %>',
                ConProtocol = '<%=ConfigurationManager.AppSettings["HTTP"].ToString() %>',
                CProcess = 10, grid, gridMasterTable, pageSize = 20, pageIndex = 0, Reload = window.setInterval(ReloadLinks, 60000), olddatetime = '', prebook = '', TimerHome, ToUpdate = false,
                FPatientName = '', TPatientName = '', MRDPatientName = '', GCancelReason, GFinishReason, GTagID, CurrentDStatus, GReqID, GPorterID, IsEdit, GMIndex = '0', GExtn = '', ReqDate = '', ReqTime = '', ReqCat = '0', RFromID = '0', RToID = '0', RHalt1 = '0', RHalt2 = '0', RPreBook = '0',
                Efrom, ETo, ECategory, EDate, EPatient, Remarks, AReqID, APorter1, APorter2, ADept, Isclear = false, PorterID1 = '', PorterName1 = '', PorterID = '', PorterName = '', PORTERGROUP = '', ISMULTIPORTER = 'NO', IsReturn = 'NO',
                MAReqID = '', MADept = '', MACount = 60, MANReqID = '', MANCount = 60, MANPorterID = '', MANPorterName = '', GPatientName = '', GFrom = '', GStatus = '2', GOMI = '0', GUser = '', ATReqNB = '', //MANInterval = window.setInterval(function () { processMAN(MANCount); }, 1000),
                IsMRD = 'NO', IsMTPR = '0', IsRTC = '0', OIsMTPR = '0', ServiceCode = '1', EServiceCode = '', callFrom = 'Parent';
            var OldFromID = '', OldFrom = '', OldToID = '', OldTo = '', OldCatID = '', OldCategory = '', OldPatientName = '', OldQuantity = '', OldRequestorName = '', OldIsMultiPorter = '0', OKitchen = '',
                LBKitName = '', CatKitName = '', LBKitID = '0', CatKitID = '0',
                NewFrom = '', NewTo = '', NewCategory = '', IsHaywood = false, FHaywood = 'NO', ToHaywood = 'NO';
            const valuePage = {
                truncate: true,
                curPage: 0,
                numLinksTwoSide: 1,
                totalPages: 0
            };


            var PorterCurTasks = '', PendingTasks = '', ATPorterID = '', ATPorterName = '', ATStatus = '', ATReqNB = '';

            var MTCount = 60, MTInterval = window.setInterval(function () { processMT(MTCount); }, 1000);


            var Base64 = { _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", encode: function (e) { var t = ""; var n, r, i, s, o, u, a; var f = 0; e = Base64._utf8_encode(e); while (f < e.length) { n = e.charCodeAt(f++); r = e.charCodeAt(f++); i = e.charCodeAt(f++); s = n >> 2; o = (n & 3) << 4 | r >> 4; u = (r & 15) << 2 | i >> 6; a = i & 63; if (isNaN(r)) { u = a = 64 } else if (isNaN(i)) { a = 64 } t = t + this._keyStr.charAt(s) + this._keyStr.charAt(o) + this._keyStr.charAt(u) + this._keyStr.charAt(a) } return t }, decode: function (e) { var t = ""; var n, r, i; var s, o, u, a; var f = 0; e = e.replace(/[^A-Za-z0-9+/=]/g, ""); while (f < e.length) { s = this._keyStr.indexOf(e.charAt(f++)); o = this._keyStr.indexOf(e.charAt(f++)); u = this._keyStr.indexOf(e.charAt(f++)); a = this._keyStr.indexOf(e.charAt(f++)); n = s << 2 | o >> 4; r = (o & 15) << 4 | u >> 2; i = (u & 3) << 6 | a; t = t + String.fromCharCode(n); if (u != 64) { t = t + String.fromCharCode(r) } if (a != 64) { t = t + String.fromCharCode(i) } } t = Base64._utf8_decode(t); return t }, _utf8_encode: function (e) { e = e.replace(/rn/g, "n"); var t = ""; for (var n = 0; n < e.length; n++) { var r = e.charCodeAt(n); if (r < 128) { t += String.fromCharCode(r) } else if (r > 127 && r < 2048) { t += String.fromCharCode(r >> 6 | 192); t += String.fromCharCode(r & 63 | 128) } else { t += String.fromCharCode(r >> 12 | 224); t += String.fromCharCode(r >> 6 & 63 | 128); t += String.fromCharCode(r & 63 | 128) } } return t }, _utf8_decode: function (e) { var t = ""; var n = 0; var r = c1 = c2 = 0; while (n < e.length) { r = e.charCodeAt(n); if (r < 128) { t += String.fromCharCode(r); n++ } else if (r > 191 && r < 224) { c2 = e.charCodeAt(n + 1); t += String.fromCharCode((r & 31) << 6 | c2 & 63); n += 2 } else { c2 = e.charCodeAt(n + 1); c3 = e.charCodeAt(n + 2); t += String.fromCharCode((r & 15) << 12 | (c2 & 63) << 6 | c3 & 63); n += 3 } } return t } };

            var ArCtrl = ["TxtCurPassword", "TxtPassword", "TxtConfirmPassword"], UsrPassword = ((sessionStorage.getItem('PASSWORD') == null) ? "" : Base64.decode(sessionStorage.getItem('PASSWORD'))),
                arrError = ["ErCurrent", "ErPassword", "ErCPassword"], PageName = document.location.pathname.match(/[^\/]+$/)[0];


            $(document).ready(function () {
                $('#spndepNursname').html(sessionStorage.getItem('NAME'));

                ServiceCode = sessionStorage.getItem('ServiceCode');

                roleWiseDashboard();

                //ReloadLinks();



                InitChangePassword();
                // Preload New Request values.
                LoadNewRequest();
                //setPagerEmpty();

                // Load Pending List
                //ReloadLinksButton();
                //Select("divPendingPercentage", "PENDING");

                $('#chkPreBook').change(function () {
                    var IsPreBook = $('#chkPreBook').prop('checked');

                    $('#containerDate').css("display", (IsPreBook) ? "inline-block" : "none");
                    $('#containerTime').css("display", (IsPreBook) ? "inline-block" : "none");

                    RPreBook = (IsPreBook) ? "1" : "0";

                    setPreBookCat();
                });
                $('#chkUserRequest').change(function () {
                    setIndexscreen(true);

                });
                $('#chkHaywoodRequests').change(function () {
                    IsHaywood = $('#chkHaywoodRequests').prop('checked');
                    setIndexscreen(false);
                });

                $("#ModalAddTask").on("hidden.bs.modal", function () {
                    clearMT();
                });
                $("#floor-map-popup").on("hidden.bs.modal", function () {
                    clearInterval(ReloadMap);
                    Reload = window.setInterval(ReloadLinks, 60000);
                });

                $("#txtFromLoc").keyup(function () {
                    if (ServiceCode != '2')
                        loadsuggesstion('from', $(this).val());
                });


                $("#txtToLoc").keyup(function () {

                    loadsuggesstion('to', $(this).val());
                });


                $('textarea').keypress(function (event) {

                    var regex = new RegExp("^[a-zA-Z0-9]+$");
                    var arrValid = ["*", ",", ".", "-", "_"];
                    var key = String.fromCharCode(!event.charCode ? event.which : event.charCode);

                    //alert(key);
                    if (!regex.test(key) && (event.which !== 32) && (event.which !== 13) && (!(arrValid.indexOf(key) > -1))) {
                        event.preventDefault();
                        return false;
                    }

                });



                $('input[type=search]').keypress(function (event) {

                    var regex = new RegExp("^[a-zA-Z0-9]+$");
                    var arrValid = ["*", ",", ".", "-", "_"];
                    var key = String.fromCharCode(!event.charCode ? event.which : event.charCode);

                    //alert(key);
                    if (!regex.test(key) && (event.which !== 32) && (event.which !== 13) && (!(arrValid.indexOf(key) > -1))) {
                        event.preventDefault();
                        return false;
                    }

                });


                $.xhrPool = [];
                $.ajaxSetup({
                    beforeSend: function (jqXHR) { $.xhrPool.push(jqXHR); }, //  annd connection to list  -- alert($.xhrPool.length);
                    complete: function (jqXHR) {
                        var i = $.xhrPool.indexOf(jqXHR);   //  get index for current connection completed
                        if (i > -1) $.xhrPool.splice(i, 1); //  removes from list by index  -- alert($.xhrPool.length);
                    }
                });
                $('.services-btn-icon').click(function () {
                    // Remove 'active' class from all buttons

                    ServiceCode = $(this).attr('id').replace("divService", ""); callFrom = 'Parent'
                    sessionStorage.setItem('ServiceCode', ServiceCode);
                    // alert(sessionStorage.getItem('ServiceCode'));

                    setRootServices(this);
                    // Add 'active' class to the clicked button

                });
                if (ServiceCode == null)
                    $('.services-btn-icon').first().trigger('click');
                else {
                    ServiceCode = (ServiceCode == '0') ? "1" : ServiceCode;
                    sessionStorage.setItem('ServiceCode', ServiceCode);
                    //alert(sessionStorage.getItem('ServiceCode'));
                    $('#divService' + ServiceCode).trigger('click');
                }

                setServiceColor(ServiceCode);

                $('.services-btn-icon-modal').click(function () {
                    var Process = (($("#TaskHeader").html() == 'New Task') ? "New" : "Edit");


                    var selServiceCode = $(this).attr('id').replace("divRService", "");

                    if (Process == 'New' || EServiceCode == selServiceCode) {
                        var eleParent = $('#divService' + selServiceCode);
                        // Remove 'active' class from all buttons

                        // Add 'active' class to the clicked button
                        ServiceCode = selServiceCode;

                        callFrom = "innerElement";
                        setRequestChanges(selServiceCode, Process);
                        setRootServices(eleParent); setInnerServices(this);

                        /*$('#divRService' + selServiceCode).addClass('active');
                        // Get the rgb color of the clicked button
                        var rgbColor = $('#divRService' + selServiceCode).data('color');

                        // Convert rgb to rgba by appending the opacity
                        var rgbaColor = rgbColor.replace('rgb', 'rgba').replace(')', ', 0.1)');

                        // Set the new rgba color to the CSS variable
                        $(':root').css('--active-color-modal', rgbColor);
                        $(':root').css('--active-bg-color-modal', rgbaColor);*/
                    }

                });

                $('.services-btn-icon-modal').first().trigger('click');
                setTimeout(function () {
                    //loadExecutiveDashboardInIndex();
                }, 500);
            });

            function setServiceColor(serviceCode) {
                var serviceColors = {
                    '1': 'rgb(255, 116, 0)',
                    '2': 'rgb(12, 188, 139)',
                    '3': 'rgb(110, 48, 243)',
                    '4': 'rgb(255, 87, 51)',
                    '5': 'rgb(255, 87, 51)'
                };

                var rgbColor = serviceColors[serviceCode] || 'rgb(255, 116, 0)';
                var rgbaColor = rgbColor.replace('rgb', 'rgba').replace(')', ', 0.1)');

                $(':root').css('--active-color', rgbColor);
                $(':root').css('--active-bg-color', rgbaColor);

            }

            function setRootServices(ele) {
                $('.services-btn-icon').removeClass('active');

                if (ele && ele.length > 0) {
                    $(ele).addClass('active');

                    var rgbColor = $(ele).data('color');
                    var rgbaColor = rgbColor.replace('rgb', 'rgba').replace(')', ', 0.1)');

                    $(':root').css('--active-color', rgbColor);
                    $(':root').css('--active-bg-color', rgbaColor);

                } else {

                    $(':root').css('--active-color', 'rgb(255, 116, 0)');
                    $(':root').css('--active-bg-color', 'rgba(255, 116, 0, 0.1)');

                }

                sessionStorage.setItem('ServiceCode', ServiceCode);

                $('#DivKitchenFilters').css("display", (ServiceCode == "2") ? "inline-block" : "none");
                $('#DivCleaningFilters').css("display", (ServiceCode == "3") ? "inline-block" : "none");
                setServiceUpdates(ServiceCode);
            }

            function setInnerServices(ele) {

                $('.services-btn-icon-modal').removeClass('active');
                $(ele).addClass('active');
                // Get the rgb color of the clicked button
                var rgbColor = $(ele).data('color');

                // Convert rgb to rgba by appending the opacity
                var rgbaColor = rgbColor.replace('rgb', 'rgba').replace(')', ', 0.1)');

                // Set the new rgba color to the CSS variable
                $(':root').css('--active-color-modal', rgbColor);
                $(':root').css('--active-bg-color-modal', rgbaColor);
            }

            function setRequestChanges(ServiceCode, Process) {

                switch (ServiceCode) {
                    case "1":

                        $('#containerMP').css("display", "inline-block");
                        $('#containerPatient').css("display", "inline-block");
                        $('#divQuantity').css("visibility", "hidden");
                        $('#txtFromLoc').prop("readonly", false);
                        $('#txtFromLoc').prop("readonly", false);
                        $('#containerTo').css("visibility", "visible");
                        $('#lblFrom').html('From'); $('#lblTo').html('To');
                        $('#lblPatientDetails').html('Patient Name</span>');
                        $('#divEndDate').css("display", "none"); $('#divBarrierPercentage').css("display", "none");
                        setTimeout(function () { $('#txtFromLoc').focus(); }, 500)

                        $("#suggesstionTo").hide();
                        $('#lblKPITS').html('-');
                        $('#lblKPITE').html('-');
                        $('#containerCat').css('background-color', '#6dadff'); $('#containerKPI').css('background-color', '#6dadff');
                        $('#tdKPICompletion').css('background-color', '#6dadff'); $('#tdKPIResponse').css('background-color', '#6dadff'); $('#parentcontainerMP').css('background-color', '#6dadff');
                        break;
                    case "2":
                        var bgcolor = "#6dadff";
                        $('#containerMP').css("display", "none");
                        $('#containerPatient').css("display", "none");
                        $('#divQuantity').css("visibility", "visible");
                        $('#containerTo').css("visibility", "visible");
                        $('#lblFrom').html('From'); $('#lblTo').html('To');

                        $('#divBarrierPercentage').css("display", "none");
                        $("#suggesstionFrom").hide();
                        setTimeout(function () { $('#txtFromLoc').prop("readonly", true); $('#txtToLoc').focus(); }, 500)
                        $('#lblKPITS').html('-');
                        $('#lblKPITE').html('-');
                        $('#containerCat').css('background-color', bgcolor); $('#containerKPI').css('background-color', bgcolor);
                        $('#tdKPICompletion').css('background-color', bgcolor); $('#tdKPIResponse').css('background-color', bgcolor); $('#parentcontainerMP').css('background-color', bgcolor);
                        $('#divEndDate').css("display", "none");
                        break;

                    case "3":

                        $('#containerMP').css("display", "none");
                        $('#containerPatient').css("display", "none");
                        $('#divQuantity').css("visibility", "hidden");
                        $('#containerTo').css("visibility", "visible"); $('#txtToLoc').prop("readonly", true); $('#lblTo').html('Zone Name');
                        $('#lblPatientDetails').html('Authorizer');
                        $('#txtFromLoc').prop("readonly", false);
                        setTimeout(function () { $('#txtFromLoc').focus(); }, 500)

                        $('#lblFrom').html('Request Location');

                        $('#divBarrierPercentage').css("display", "none");
                        $("#suggesstionTo").hide();
                        $('#lblKPITS').html('-');
                        $('#lblKPITE').html('-');
                        $('#containerCat').css('background-color', '#6dadff'); $('#containerKPI').css('background-color', '#6dadff');
                        $('#tdKPICompletion').css('background-color', '#6dadff'); $('#tdKPIResponse').css('background-color', '#6dadff'); $('#parentcontainerMP').css('background-color', '#6dadff');

                        if (ReqCat == '73') {
                            $('#containerPatient').css("display", "inline-block");
                            $('#divEndDate').css("display", "inline-block");
                        }
                        break;
                }
                if (Process == 'New') {
                    LoadCategories('');
                    LoadPresetRemarks();
                }

            }
            function setPagerEmpty() {
                valuePage.curPage = 0;
                valuePage.totalPages = 0;
                btnNextPg.disabled = true;
                btnLastPg.disabled = true;
                btnPrevPg.disabled = true;
                btnFirstPg.disabled = true;
                $('.page-container').css('display', 'none');
            }

            function loadTraczoViewWithDefaultService() {
                ServiceCode = '1';
                sessionStorage.setItem('ServiceCode', '1');
                $('#divService1').trigger('click');

                loadTraczoView();
            }

            function destroyAllCharts() {

                if (window.ApexCharts && window.ApexCharts.instances) {
                    try {
                        window.ApexCharts.instances.forEach(chart => {
                            try {
                                if (chart && typeof chart.destroy === 'function') {
                                    chart.destroy();
                                }
                            } catch (e) { }
                        });
                        window.ApexCharts.instances = [];
                    } catch (e) { }
                }

                const chartContainers = document.querySelectorAll('[id$="Chart"], [class*="chart"]');
                chartContainers.forEach(container => {
                    try {

                        const apexElements = container.querySelectorAll('.apexcharts-canvas, .apexcharts-tooltip, .apexcharts-legend, .apexcharts-menu');
                        apexElements.forEach(el => el.remove());

                        container.innerHTML = '';
                    } catch (e) { }
                });

                const canvases = document.querySelectorAll('.apexcharts-canvas');
                canvases.forEach(canvas => {
                    try {
                        canvas.remove();
                    } catch (e) { }
                });

                const tooltips = document.querySelectorAll('.apexcharts-tooltip, .apexcharts-tooltip-z');
                tooltips.forEach(tooltip => {
                    try {
                        tooltip.remove();
                    } catch (e) { }
                });

                const chartVarPattern = /Chart$/;
                for (let key in window) {
                    if (chartVarPattern.test(key) && window[key] && typeof window[key].destroy === 'function') {
                        try {
                            window[key].destroy();
                            window[key] = null;
                        } catch (e) { }
                    }
                }

                const allApexElements = document.querySelectorAll('[class*="apexcharts"]');
                allApexElements.forEach(el => {
                    try {
                        if (el && el.parentNode && !el.closest('.dashboard-card')) {
                            el.remove();
                        }
                    } catch (e) { }
                });
            }

            //function setActiveTab(clickedElement) {

            //    document.querySelectorAll('.dashboard-tab').forEach(tab => {
            //        tab.classList.remove('active');
            //        tab.style.background = 'rgba(255,255,255,0.1)';
            //        tab.style.borderLeft = '1px solid rgba(255,255,255,0.2)';
            //    });

            //    clickedElement.classList.add('active');
            //    clickedElement.style.background = 'rgba(255,255,255,0.25)';
            //    clickedElement.style.borderLeft = '4px solid white';

            //    const tabId = clickedElement.id;

            //    const titleElement = document.getElementById('dashboardMainTitle');
            //    const titleMap = {
            //        'divExecutiveDashboard': 'Executive / Operations Dashboard',
            //        'divCommandCenter': 'Department Command Center Dashboard',
            //        'divWorkforce': 'Workforce Optimization Dashboard',
            //        'divAIModules': 'AI Modules Dashboard',
            //        'divPatientExp': 'Patient Experience Dashboard',
            //        'divPredictive': 'Predictive Demand & Capacity Planning',
            //        'divSLA': 'SLA & Compliance Intelligence Dashboard',
            //        'divSafety': 'Safety & Incident Analytics',
            //        'divTraczo': 'Task Dashboard'
            //    };

            //    if (titleMap[tabId]) {
            //        titleElement.textContent = titleMap[tabId];
            //    }

            //    destroyAllCharts();

            //    const chartContainer = document.getElementById('EscalationChart');
            //    if (chartContainer) {
            //        chartContainer.innerHTML = '';
            //        chartContainer.style.display = 'block';
            //    }

            //    $('#divRequestHeaders').hide();
            //    $('#divUserHeaders').hide();
            //    $('#searchFiltersSection').hide();
            //    $('#tasksTableSection').hide();
            //    $('.table-wrap').hide();
            //    $('#tblRequests').hide();

            //    $('#EscalationChart').show();
            //    $('.tab-content-wrapper').show();

            //    if (typeof startLastUpdatedTimer === 'function') {
            //        startLastUpdatedTimer();
            //    }

            //    setTimeout(() => {
            //        if (tabId === 'divExecutiveDashboard' && typeof loadExecutiveDashboardInIndex === 'function') {
            //            loadExecutiveDashboardInIndex();
            //        } else if (tabId === 'divCommandCenter' && typeof loadDepartmentCommandCenter === 'function') {
            //            loadDepartmentCommandCenter();
            //        } else if (tabId === 'divWorkforce' && typeof loadWorkforceDashboard === 'function') {
            //            loadWorkforceDashboard();
            //        } else if (tabId === 'divAIModules' && typeof loadAIModulesDashboard === 'function') {
            //            loadAIModulesDashboard();
            //        } else if (tabId === 'divPatientExp' && typeof loadPatientExperienceDashboard === 'function') {
            //            loadPatientExperienceDashboard();
            //        } else if (tabId === 'divPredictive' && typeof loadPredictiveDashboard === 'function') {
            //            loadPredictiveDashboard();
            //        } else if (tabId === 'divSLA' && typeof loadSLADashboard === 'function') {
            //            loadSLADashboard();
            //        } else if (tabId === 'divSafety' && typeof loadSafetyDashboard === 'function') {
            //            loadSafetyDashboard();
            //        } else if (tabId === 'divTraczo' && typeof loadTraczoViewWithDefaultService === 'function') {
            //            $('#EscalationChart').hide();
            //            $('.tab-content-wrapper').hide();
            //            loadTraczoViewWithDefaultService();
            //        }
            //    }, 100);
            //}

            //document.addEventListener('DOMContentLoaded', function () {
            //    const firstTab = document.querySelector('.dashboard-tab');
            //    if (firstTab) {
            //        setActiveTab(firstTab);
            //        const activeTabId = firstTab.id;

            //        if (typeof ServiceCode !== 'undefined') {
            //            ServiceCode = '1';
            //        }
            //        if (typeof sessionStorage !== 'undefined') {
            //            sessionStorage.setItem('ServiceCode', '1');
            //        }

            //        if (typeof $('#divService1').trigger === 'function') {
            //            $('#divService1').trigger('click');
            //        }

            //        if (typeof startLastUpdatedTimer === 'function') {
            //            startLastUpdatedTimer();
            //        }

            //        if (activeTabId === 'divExecutiveDashboard' && typeof loadExecutiveDashboardInIndex === 'function') {
            //            loadExecutiveDashboardInIndex();
            //        } else if (activeTabId === 'divCommandCenter' && typeof loadDepartmentCommandCenter === 'function') {
            //            loadDepartmentCommandCenter();
            //        } else if (activeTabId === 'divWorkforce' && typeof loadWorkforceDashboard === 'function') {
            //            loadWorkforceDashboard();
            //        } else if (activeTabId === 'divAIModules' && typeof loadAIModulesDashboard === 'function') {
            //            loadAIModulesDashboard();
            //        } else if (activeTabId === 'divPatientExp' && typeof loadPatientExperienceDashboard === 'function') {
            //            loadPatientExperienceDashboard();
            //        } else if (activeTabId === 'divPredictive' && typeof loadPredictiveDashboard === 'function') {
            //            loadPredictiveDashboard();
            //        } else if (activeTabId === 'divSLA' && typeof loadSLADashboard === 'function') {
            //            loadSLADashboard();
            //        } else if (activeTabId === 'divSafety' && typeof loadSafetyDashboard === 'function') {
            //            loadSafetyDashboard();
            //        } else if (activeTabId === 'divTraczo' && typeof loadTraczoViewWithDefaultService === 'function') {
            //            $('#EscalationChart').hide();
            //            $('.tab-content-wrapper').hide();
            //            loadTraczoViewWithDefaultService();
            //        } else {
            //            if (typeof loadExecutiveDashboardInIndex === 'function') {
            //                loadExecutiveDashboardInIndex();
            //            }
            //        }
            //    }
            //});

            function setActiveTab(clickedElement) {
                document.querySelectorAll('.dashboard-tab').forEach(tab => {
                    tab.classList.remove('active');
                    tab.style.background = 'rgba(255,255,255,0.1)';
                    tab.style.borderLeft = '1px solid rgba(255,255,255,0.2)';
                });

                clickedElement.classList.add('active');
                clickedElement.style.background = 'rgba(255,255,255,0.25)';
                clickedElement.style.borderLeft = '4px solid white';

                const tabId = clickedElement.id;

                const titleElement = document.getElementById('dashboardMainTitle');
                const titleMap = {
                    'divExecutiveDashboard': 'Executive / Operations Dashboard',
                    'divCommandCenter': 'Department Command Center Dashboard',
                    'divWorkforce': 'Workforce Optimization Dashboard',
                    'divAIModules': 'AI Modules Dashboard',
                    'divPatientExp': 'Patient Experience Dashboard',
                    'divPredictive': 'Predictive Demand & Capacity Planning',
                    'divSLA': 'SLA & Compliance Intelligence Dashboard',
                    'divSafety': 'Safety & Incident Analytics',
                    'divTraczo': 'Task Dashboard'
                };

                if (titleMap[tabId]) {
                    var titleTextSpan = document.getElementById('dashboardTitleText');
                    if (titleTextSpan) {
                        titleTextSpan.textContent = titleMap[tabId];
                    } else {
                        titleElement.textContent = titleMap[tabId];
                    }

                    var video = document.getElementById('tutorialVideo');
                    if (video) {
                        var groupAVideos = ['divExecutiveDashboard', 'divCommandCenter', 'divWorkforce'];
                        var groupBVideos = ['divAIModules', 'divPatientExp', 'divSLA', 'divTraczo', 'divPredictive', 'divSafety'];

                        var videoSrc = '';

                        if (groupAVideos.indexOf(tabId) > -1) {
                            videoSrc = '/videos/AdminTutorial-A.mp4';
                        } else if (groupBVideos.indexOf(tabId) > -1) {
                            videoSrc = '/videos/AdminTutorial-B.mp4';
                        }

                        if (videoSrc) {
                            var sourceEl = video.querySelector('source');
                            if (sourceEl && sourceEl.getAttribute('src') !== videoSrc) {
                                sourceEl.setAttribute('src', videoSrc);
                                video.load();
                            }
                        }
                    }
                }

                destroyAllCharts();

                const chartContainer = document.getElementById('EscalationChart');
                if (chartContainer) {
                    chartContainer.innerHTML = '';
                    chartContainer.style.display = 'block';
                }

                $('#divRequestHeaders').hide();
                $('#divUserHeaders').hide();
                $('#searchFiltersSection').hide();
                $('#tasksTableSection').hide();
                $('.table-wrap').hide();
                $('#tblRequests').hide();

                $('#EscalationChart').show();
                $('.tab-content-wrapper').show();

                if (typeof startLastUpdatedTimer === 'function') {
                    startLastUpdatedTimer();
                }

                setTimeout(() => {

                    var helpBtn = document.getElementById('watchTutorial');
                    if (helpBtn) {
                        helpBtn.style.display = (tabId === 'divTraczo') ? 'none' : 'inline-flex';
                    }

                    if (tabId === 'divExecutiveDashboard' && typeof loadExecutiveDashboardInIndex === 'function') {
                        loadExecutiveDashboardInIndex();
                    } else if (tabId === 'divCommandCenter' && typeof loadDepartmentCommandCenter === 'function') {
                        loadDepartmentCommandCenter();
                    } else if (tabId === 'divWorkforce' && typeof loadWorkforceDashboard === 'function') {
                        loadWorkforceDashboard();
                    } else if (tabId === 'divAIModules' && typeof loadAIModulesDashboard === 'function') {
                        loadAIModulesDashboard();
                    } else if (tabId === 'divPatientExp' && typeof loadPatientExperienceDashboard === 'function') {
                        loadPatientExperienceDashboard();
                    } else if (tabId === 'divPredictive' && typeof loadPredictiveDashboard === 'function') {
                        loadPredictiveDashboard();
                    } else if (tabId === 'divSLA' && typeof loadSLADashboard === 'function') {
                        loadSLADashboard();
                    } else if (tabId === 'divSafety' && typeof loadSafetyDashboard === 'function') {
                        loadSafetyDashboard();
                    } else if (tabId === 'divTraczo' && typeof loadTraczoViewWithDefaultService === 'function') {
                        $('#EscalationChart').hide();
                        $('.tab-content-wrapper').hide();
                        loadTraczoViewWithDefaultService();
                    }
                }, 100);
            }

            document.addEventListener('DOMContentLoaded', function () {

                if (typeof ServiceCode !== 'undefined') {
                    ServiceCode = '1';
                }
                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.setItem('ServiceCode', '1');
                }

                if (typeof $('#divService1').trigger === 'function') {
                    $('#divService1').trigger('click');
                }

                if (typeof startLastUpdatedTimer === 'function') {
                    startLastUpdatedTimer();
                }

            });

            function roleWiseDashboard() {
                var roleId = parseInt(sessionStorage.getItem("ROLE"));

                if (typeof destroyAllCharts === 'function') {
                    destroyAllCharts();
                }

                const chartContainer = document.getElementById('EscalationChart');
                if (chartContainer) {
                    chartContainer.innerHTML = '';
                }

                $('#divRequestHeaders').hide();
                $('#divUserHeaders').hide();
                $('#searchFiltersSection').hide();
                $('#tasksTableSection').hide();
                $('.table-wrap').hide();
                $('#tblRequests').hide();

                $('#EscalationChart').show();
                $('.tab-content-wrapper').show();

                var tabs = {
                    executive: $("#divExecutiveDashboard"),
                    commandCenter: $("#divCommandCenter"),
                    workforce: $("#divWorkforce"),
                    aiModules: $("#divAIModules"),
                    patientExp: $("#divPatientExp"),
                    sla: $("#divSLA"),
                    safety: $("#divSafety"),
                    traczo: $("#divTraczo")
                };

                var topRowContainer = $("div[style*='margin-bottom: 12px; flex-wrap: wrap;']").first();
                var bottomRowContainer = $("div[style*='margin-bottom: 20px; flex-wrap: wrap;']").first();

                var allTabsContainer = $('<div style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;"></div>');

                var visibleTabs = [];

                $.each(tabs, function (key, tab) {
                    tab.hide();
                    tab.css('flex', '0 0 auto');
                });

                if (roleId === 2) {
                    visibleTabs = [
                        tabs.executive, tabs.commandCenter, tabs.workforce, tabs.aiModules,
                        tabs.patientExp, tabs.sla, tabs.traczo, tabs.safety
                    ];
                } else if (roleId === 14) {
                    visibleTabs = [
                        tabs.traczo, tabs.patientExp
                    ];
                } else if (roleId === 15) {
                    visibleTabs = [
                        tabs.traczo, tabs.commandCenter, tabs.aiModules, tabs.sla, tabs.patientExp
                    ];
                } else {
                    visibleTabs = [
                        tabs.executive, tabs.commandCenter, tabs.workforce, tabs.aiModules,
                        tabs.patientExp, tabs.sla, tabs.traczo, tabs.safety
                    ];
                }

                topRowContainer.hide();
                bottomRowContainer.hide();

                allTabsContainer.insertAfter(topRowContainer);

                visibleTabs.forEach(function (tab) {
                    tab.show();
                    tab.css({
                        'flex': '0 0 auto',
                        'width': '180px',
                        'min-width': '180px'
                    });
                    allTabsContainer.append(tab);
                });

                $('.dashboard-tab').css({
                    'width': 'auto',
                    'min-width': '140px',
                    'flex': '0 0 auto'
                });

                if (!$('.dashboard-tab.active').length) {
                    var traczoTab = document.getElementById('divTraczo');
                    if (traczoTab) {
                        setActiveTab(traczoTab);
                    }
                }

                const activeTab = document.querySelector('.dashboard-tab.active');
                if (activeTab) {
                    const titleElement = document.getElementById('dashboardMainTitle');
                    const titleMap = {
                        'divExecutiveDashboard': 'Executive / Operations Dashboard',
                        'divCommandCenter': 'Department Command Center Dashboard',
                        'divWorkforce': 'Workforce Optimization Dashboard',
                        'divAIModules': 'AI Modules Dashboard',
                        'divPatientExp': 'Patient Experience Dashboard',
                        'divPredictive': 'Predictive Demand & Capacity Planning',
                        'divSLA': 'SLA & Compliance Intelligence Dashboard',
                        'divSafety': 'Safety & Incident Analytics',
                        'divTraczo': 'Task Dashboard'
                    };
                    if (titleMap[activeTab.id]) {
                        var titleTextSpan = document.getElementById('dashboardTitleText');
                        if (titleTextSpan) {
                            titleTextSpan.textContent = titleMap[activeTab.id];
                        } else {
                            titleElement.textContent = titleMap[activeTab.id];
                        }
                    }
                }
            }
            $(document).ready(function () {
                if (typeof roleWiseDashboard === 'function') {
                    roleWiseDashboard();
                }
            });

            function setIndexscreen(fromPorterIcon) {
                var IsUser = $('#chkUserRequest').prop('checked');

                $('#divUserHeaders').css("display", ((IsUser) ? "inline-flex" : "none"));
                $('#divRequestHeaders').css("display", ((IsUser) ? "none" : "inline-flex"));
                $('#taskfileters').css("display", ((IsUser) ? "none" : ""));

                $('#DivCleaningFilters').css("display", (!IsHaywood) ? "inline-block" : "none");

                if (IsUser) {
                    getPorterStatus('0');
                }
                else {

                    var divTask = (CProcess == "0") ? "divTotalPercentage" : (CProcess == "2") ? "divPendingPercentage" : (CProcess == "3") ? "divAssignedPercentage" :
                        (CProcess == "4") ? "divInprogressPercentage" : (CProcess == "6") ? "divCompletedPercentage" : (CProcess == "7") ? "divCancelledPercentage" :
                            (CProcess == "8") ? "divPendingOnHoldPercentage" : (CProcess == "19") ? "divBarrierPercentage" : (CProcess == "100") ? "divPrebookeddPercentage" :
                                (CProcess == "9") ? "divSlaViolationsPercentage" : (CProcess == "10") ? "divActiveAlertsPercentage" : (CProcess == "11") ? "divSlaViolations2Percentage" :
                                    (CProcess == "12") ? "divViolationsByDeptPercentage" : "divPendingPercentage";
                    //var divTask = (CProcess == "0") ? "divTotalPercentage" : (CProcess == "2") ? "divPendingPercentage" : (CProcess == "3") ? "divAssignedPercentage" : (CProcess == "4") ? "divInprogressPercentage" : (CProcess == "6") ? "divCompletedPercentage" : (CProcess == "7") ? "divCancelledPercentage" : (CProcess == "8") ? "divPendingOnHoldPercentage" : (CProcess == "9") ? "divBarrierPercentage" : (CProcess == "100") ? "divPrebookeddPercentage" : (CProcess == "100") ? "tdPreBook" : "divPendingPercentage";

                    // divTask = (ServiceCode == '3') ? ((CProcess == "9") ? "divBarrierPercentage" : divTask) : ((fromPorterIcon || (CProcess == "9")) ? "divPendingPercentage" : divTask);


                    Select(divTask, "");
                    setRequestUsers('Tasks');

                }
            }

            function setServiceUpdates(ServiceCode) {
                switch (ServiceCode) {
                    case "2":
                        $("#pageLinkPlanner").html('<a href="../Planner/SheduledBreakfast.aspx"> <span> <img src="../images/spiral-calendar.png" alt="Planner"></span> Shed. Breakfast </a> ');
                        break;
                    default:
                        $("#pageLinkPlanner").html('<a href="../Planner/Planner.aspx"> <span> <img src="../images/spiral-calendar.png" alt="Planner"></span> Planner </a>');


                }
                if (callFrom == "Parent")
                    setIndexscreen();
            }


            function setPreBookCat() {
                clearAllCheckBox('ReqCategories');
                ReqCat = '';
                //LoadCategories('');
            }
            function LoadProcess(RequestStatusID) {



                var divReq = $("#tblRequests");
                LoadTableRequest(RequestStatusID, divReq);

            //sessionStorage.getItem('ROLE', 'CONTROL ROOM');
               <%-- grid = $find('<%= GridRequest.ClientID %>');
                gridMasterTable = $find('<%= GridRequest.ClientID %>').get_masterTableView();--%>
                //  alert(gridMasterTable.get_virtualItemCount());
            }

            function ReloadLinks() {

                if (sessionStorage.getItem('ROLE') == null)
                    window.location = "../Login.aspx";
                ReloadLinksButton();
            }


        </script>
    </telerik:RadCodeBlock>
    <style type="text/css">
        .switch-button_Occurrence {
            background: #0d6efd;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-radius: var(--border-radius);
            padding: 0 0.5rem;
            gap: .5rem;
            min-height: 2.5rem;
            font-size: 12px;
        }

        .switchOccurrence {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 20px;
            margin-bottom: 0px;
        }

            .switchOccurrence input {
                opacity: 0;
                width: 0;
                height: 0;
            }

        .slideroccurrence {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            -webkit-transition: .4s;
            transition: .4s;
        }

            .slideroccurrence:before {
                position: absolute;
                content: "";
                height: 13px;
                width: 13px;
                left: 4px;
                bottom: 4px;
                background-color: white;
                -webkit-transition: .4s;
                transition: .4s;
            }

        input:checked + .slideroccurrence {
            background-color: #e94234;
        }

        input:focus + .slider {
            box-shadow: 0 0 1px #e94234;
        }

        input:checked + .slideroccurrence:before {
            -webkit-transform: translateX(20px);
            -ms-transform: translateX(20px);
            transform: translateX(20px);
        }

        /* Rounded sliders */
        .slideroccurrence.round {
            border-radius: 15px;
        }

            .slideroccurrence.round:before {
                border-radius: 50%;
            }


        div.polaroid {
            width: 90%;
            background-color: white;
            box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
            margin-bottom: 25px;
        }

        div.container {
            text-align: center;
            padding: 10px 20px;
        }

        .form-control {
            background-color: white !important;
        }

        .table-wrap {
            padding: 21px;
        }

        .imgIconsb {
            cursor: pointer !important;
            width: 28px !important;
        }

            .imgIconsb:hover {
                cursor: pointer !important;
                width: 30px !important;
            }

        .modal-AddTask {
            padding-top: 5%;
            min-height: 500px;
            max-width: 1200px;
            position: absolute;
            width: 92%;
            top: 0;
            bottom: 0;
            left: 0;
            right: 0;
            margin: auto;
        }

        .LocationList::-webkit-scrollbar {
            width: 13px;
            background-color: white;
        }

        .btnOk {
            color: white !important;
            background-color: #2870ff !important;
        }

        .btnCancel {
            color: gray !important;
        }

        legend {
            font-size: 1rem !important;
            color: white;
            /* padding: 0px 15px; */
            font-weight: 600;
            margin-bottom: 1rem;
        }

        fieldset {
            /* border: 1px solid gray;
        padding: 15px; */
            width: 100%;
        }

        .form-control {
            background-color: white;
        }

        .SumoSelect > .optWrapper > .options li label {
            font-size: 14px !important;
        }

        .SumoSelect .select-all > span, .SumoSelect > .optWrapper.multiple > .options li.opt span {
            position: absolute;
            display: none !important;
            width: 30px;
            top: 0;
            bottom: 0;
            margin-left: -35px;
        }

        .btnOk {
            color: white !important;
            background-color: #2870ff !important;
        }

        .btnCancel {
            color: black !important;
            background-color: #f5f5f5 !important;
        }

        /* width */
        /*#tblRequests::-webkit-scrollbar {
        width: 6px;
    }*/

        /* Track */
        /*#tblRequests::-webkit-scrollbar-track {
        box-shadow: inset 0 0 2px grey;
        border-radius: 3px;
    }*/

        /* Handle */
        /*#tblRequests::-webkit-scrollbar-thumb {
        background: #42bc8a;
        border-radius: 3px;
    }*/

        /* Handle on hover */
        /*#tblRequests::-webkit-scrollbar-thumb:hover {
            background: #00796b;
        }*/
        .table-wrap table th, .table-wrap table td {
            padding: 4px;
            font-size: 14px;
            vertical-align: middle;
        }

        .col-md-1 {
            min-width: 135px;
        }

        .progress:hover {
            border: 2px solid #334c5c;
            padding: 2px;
            height: 20px;
        }

        .titleActive {
            border: 2px solid #334c5c;
            padding: 2px;
            height: 20px;
        }

        /*.counter-info-item:hover {
        border: 2px solid #334c5c;
        padding: 2px;
        border-radius: 5px;
    }*/

        .divtitleActive {
            border: 2px solid #334c5c;
            padding: 2px;
            border-radius: 5px;
        }

        .SumoSelect > .optWrapper > .options {
            text-align: left !important;
            max-height: 200px;
        }

        .RadGrid_Metro .rgHeader, .RadGrid_Metro th.rgResizeCol, .RadGrid_Metro .rgMultiHeaderRow th.rgHeader, .RadGrid_Metro .rgMultiHeaderRow th.rgResizeCol {
            /*border: 0 !important;
            border-bottom: 0px solid #e5e5e5 !important;
            border-left: 0px solid #e5e5e5 !important;*/
            border: 1px solid #CFE4FF !important;
        }

            .RadGrid_Metro .rgHeader, .RadGrid_Metro .rgHeader a {
                color: #303537 !important;
                /*background-color: rgb(30, 70, 129) !important;*/
                font-family: monospace !important;
                font-size: 16px !important;
                font-weight: bold !important;
                height: 25px !important;
                vertical-align: middle !important;
            }

        .RadGrid_Metro .rgRow td, .RadGrid_Metro .rgAltRow td, .RadGrid_Metro .rgEditRow td, .RadGrid_Metro .rgFooter td {
            border-style: none !important;
            border-width: 0 0 0px 0px !important;
        }

        .RadGrid_Metro .rgMasterTable .rgSelectedCell, .RadGrid_Metro .rgSelectedRow {
            color: #fff !important;
            background: #9E9E9E !important;
            font-family: monospace !important;
            font-size: 15px !important;
        }

        .RadGrid .rgClipCells .rgHeader, .RadGrid .rgClipCells .rgFilterRow > td, .RadGrid .rgClipCells .rgRow > td, .RadGrid .rgClipCells .rgAltRow > td, .RadGrid .rgClipCells .rgEditRow > td, .RadGrid .rgClipCells .rgFooter > td {
            overflow: hidden !important;
            vertical-align: middle !important;
            text-align: center !important;
            font-family: monospace !important;
            font-size: 15px !important;
        }


        .LocationList {
            z-index: 100;
            max-height: 455px;
            float: left;
            list-style: none;
            margin-top: -3px;
            padding: 0;
            position: absolute;
            overflow-y: scroll;
            min-width: 435px;
        }

            .LocationList li {
                padding: 10px;
                background: white;
                border-bottom: #bbb9b9 1px solid;
            }

                .LocationList li:hover {
                    background: #ece3d2;
                    cursor: pointer;
                }

        .form-control {
            background-color: white !important;
        }

        .msgContainer {
            border-bottom: 2px dotted gray;
            background-color: #f1f1f1;
            border-radius: 5px 0px;
            padding: 10px;
            margin: 10px 0;
            font-family: monospace;
        }

            .msgContainer::after {
                content: "";
                clear: both;
                display: table;
            }


        .time-right {
            float: right;
            color: gray;
            font-size: 12px;
            margin-right: 10px;
        }

        .mitigation-right {
            float: right;
            color: gray;
            font-size: 11px;
            margin-right: 10px;
            font-weight: 600;
            color: white;
            background-color: #0a57c7;
            padding: 5px;
            text-decoration: underline;
        }


        .CounterItems {
            color: gray;
            font-size: 13px;
            font-weight: bold;
            color: white;
            background-color: #0a57c7;
            padding: 5px;
            text-decoration: underline;
        }

        .msgUser {
            font-size: 15pt;
            font-weight: bold;
        }

        .table-wrap table th, .table-wrap table td {
            padding: 2px;
        }

        .modal-body .form-control {
            background: /*#F8F7F7*/ white !important;
        }

        #ReqCategories img {
            /*display: none;*/
        }

        .screen-right-panel {
            background: linear-gradient(180deg, #5B2A86 0%, #4A2578 50%, #3A1E66 100%);
            border-radius: 30px 30px 24px 24px;
        }

        @font-face {
            font-family: 'Inter';
            font-style: normal;
            font-weight: 300;
            src: url('../webfonts/Inter-Light.woff2') format('woff2');
        }

        @font-face {
            font-family: 'Inter';
            font-style: normal;
            font-weight: 400;
            src: url('../webfonts/Inter-Regular.woff2') format('woff2');
        }

        @font-face {
            font-family: 'Inter';
            font-style: normal;
            font-weight: 500;
            src: url('../webfonts/Inter-Medium.woff2') format('woff2');
        }

        @font-face {
            font-family: 'Inter';
            font-style: normal;
            font-weight: 600;
            src: url('../webfonts/Inter-SemiBold.woff2') format('woff2');
        }

        @font-face {
            font-family: 'Inter';
            font-style: normal;
            font-weight: 700;
            src: url('../webfonts/Inter-Bold.woff2') format('woff2');
        }

        * {
            font-family: 'Inter', sans-serif;
        }

        .dashboard-tab {
            width: 350px !important;
            min-width: 140px !important;
            flex: 0 0 auto !important;
            transition: all 0.15s ease !important;
            cursor: pointer !important;
            font-family: 'Inter', sans-serif !important;
        }

            .dashboard-tab:hover {
                background: rgba(255, 255, 255, 0.22) !important;
                border-color: rgba(255,255,255,0.25) !important;
            }

            .dashboard-tab.active {
                background: linear-gradient(to right, #168BFF, #00B7E1) !important;
                border: none !important;
                box-shadow: 0 4px 12px rgba(22,139,255,0.3) !important;
            }

                .dashboard-tab.active span,
                .dashboard-tab.active img {
                    filter: brightness(0) invert(1) !important;
                    text-shadow: 0 1px 3px rgba(0,0,0,0.3) !important;
                }

        .refresh-button:hover {
            background: rgba(255,255,255,0.25) !important;
        }

        .tab-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;
            z-index: 2;
            position: relative;
        }

        .live-badge {
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.3px;
            background: #f0f0f0; /* light grey background */
            padding: 3px 8px;
            border-radius: 30px;
            color: #000000; /* black text */
            transition: background-color 0.3s ease, color 0.3s ease;
        }

        .tab-divider {
            font-size: 12px;
            color: #cbd5e1;
            font-weight: 300;
        }

        .tab-code {
            font-size: 12px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
        }

        .tab-title {
            font-weight: 700;
            font-size: 13px;
            line-height: 1.2;
            color: #1e293b;
            margin: 0;
            z-index: 2;
            position: relative;
            letter-spacing: -0.01em;
        }

        .dashboard-tab div {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .refresh-icon {
            font-size: 18px;
            font-weight: 700;
            color: #4361ee;
            animation: none;
        }

        .refresh-text {
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .refresh-button:hover .refresh-text {
            color: #4361ee;
        }

        @keyframes shimmer {
            0% {
                transform: rotate(0deg) scale(1);
                opacity: 0.4;
            }

            50% {
                transform: rotate(180deg) scale(1.2);
                opacity: 0.6;
            }

            100% {
                transform: rotate(360deg) scale(1);
                opacity: 0.4;
            }
        }

        @keyframes spin {
            from {
                transform: rotate(0deg);
            }

            to {
                transform: rotate(360deg);
            }
        }

        @keyframes pulse {
            0% {
                box-shadow: 0 0 0 0 rgba(67, 97, 238, 0.4);
            }

            70% {
                box-shadow: 0 0 0 6px rgba(67, 97, 238, 0);
            }

            100% {
                box-shadow: 0 0 0 0 rgba(67, 97, 238, 0);
            }
        }

        .horizontal-scroll {
            display: flex;
            align-items: center;
            width: 100%;
            overflow-x: auto;
            padding: 8px 0;
            gap: 10px;
            scrollbar-width: thin;
            scrollbar-color: #4361ee #e2e8f0;
        }

            .horizontal-scroll::-webkit-scrollbar {
                height: 4px;
            }

            .horizontal-scroll::-webkit-scrollbar-track {
                background: #e2e8f0;
                border-radius: 4px;
            }

            .horizontal-scroll::-webkit-scrollbar-thumb {
                background: #4361ee;
                border-radius: 4px;
                transition: background 0.3s ease;
            }

                .horizontal-scroll::-webkit-scrollbar-thumb:hover {
                    background: #3a0ca3;
                }

        .profile-link {
            position: relative;
            z-index: 1000;
        }

        #DivPassword {
            position: absolute;
            top: 100%;
            right: 0;
            z-index: 10000 !important;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            min-width: 140px;
            margin-bottom: 50px;
        }

        #EscalationChart,
        .tab-content-wrapper,
        .chart-container,
        .card,
        .dashboard-card,
        canvas {
            position: relative;
            z-index: 1;
        }

        canvas {
            position: relative;
            z-index: 1;
            pointer-events: auto;
        }

        .chartjs-render-monitor {
            z-index: 1;
        }

        #divRequestHeaders {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 15px;
        }

            #divRequestHeaders .req-modern-card {
                height: 90px;
                width: 120px;
                background: rgba(255, 255, 255, 0.15);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 16px;
                padding: 8px 10px;
                color: #fff;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                justify-content: center;
                line-height: 1.1;
                transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            }

                #divRequestHeaders .req-modern-card:hover {
                    background: rgba(255, 255, 255, 0.25);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                    border-color: rgba(255, 255, 255, 0.35);
                }

                #divRequestHeaders .req-modern-card .req-title {
                    font-size: 12px;
                    font-weight: 600;
                    opacity: 0.9;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                #divRequestHeaders .req-modern-card .req-value {
                    font-size: 24px;
                    font-weight: 700;
                    margin: 5px 0;
                    line-height: 1;
                }

                #divRequestHeaders .req-modern-card .req-sub {
                    font-size: 11px;
                    opacity: 0.75;
                    margin-top: 5px;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }

        .req-modern-card.active {
            transform: scale(1.05);
            z-index: 10;
            background: linear-gradient(135deg, rgba(0, 95, 140, 0.9) 0%, rgba(0, 139, 181, 0.9) 100%) !important;
            border: 1px solid rgba(255, 255, 255, 0.5) !important;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
            transition: all 0.2s ease;
        }

            .req-modern-card.active .req-title {
                font-size: 13px;
            }

            .req-modern-card.active .req-title {
                color: #ffffff;
                font-size: 13px;
            }

            .req-modern-card.active .req-sub {
                color: #e5e7eb;
                font-size: 11px;
            }

            .req-modern-card.active .req-value {
                color: #ffffff;
                font-size: 28px;
                font-weight: 800;
            }

        .req-icon {
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 6px;
        }

            .req-icon img {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }

        .req-modern-grid-row1,
        .req-modern-grid-row2 {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 10px;
        }

            .req-modern-grid-row1 .req-modern-card,
            .req-modern-grid-row2 .req-modern-card {
                flex: 1 1 calc((100% - 50px) / 6);
                min-width: 120px;
                box-sizing: border-box;
            }


        .task-card-container,
        .task-card,
        .task-card-header,
        .task-card-body,
        .task-card-footer,
        .task-info-item label,
        .task-info-item span,
        .task-id,
        .task-notes-icon,
        .task-log-icon {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        /* Container with lighter grey background between cards (reduced by 2%) */
        .task-card-container {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 18px;
            padding: 20px;
            background-color: #e0e0e0;
            border-radius: 10px;
        }

        /* Individual Card */
        .task-card {
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            overflow: hidden;
            transition: transform 0.2s, box-shadow 0.2s;
            background: white;
            height: auto;
            min-height: 0;
            display: flex;
            flex-direction: column;
        }

            .task-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.12);
            }

        /* Card Header - Darker Apollo Healthcare Blue */
        .task-card-header {
            background: linear-gradient(135deg, #005f8c 0%, #008bb5 100%);
            color: white;
            padding: 6px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 700;
        }

        .task-id {
            font-size: 18px;
            font-weight: 700;
            color: white;
            letter-spacing: 0.3px;
        }

        .task-notes-icon {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 600;
            background: rgba(255,255,255,0.2);
            padding: 3px 10px;
            border-radius: 20px;
            cursor: pointer;
            transition: background 0.2s;
        }

            .task-notes-icon:hover {
                background: rgba(255,255,255,0.3);
            }

            .task-notes-icon img {
                width: 14px;
            }

        .task-card-body {
            padding: 8px 16px;
            background: white;
            flex: 1;
        }

        .task-info-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 6px;
            padding-bottom: 4px;
            border-bottom: 1px solid #f0f0f0;
        }

            .task-info-row:last-child {
                border-bottom: none;
                margin-bottom: 0;
                padding-bottom: 0;
            }

        .task-info-item {
            flex: 1;
            min-width: 130px;
        }

            .task-info-item label {
                display: block;
                font-size: 11px;
                font-weight: 700;
                color: #6c757d;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 3px;
                font-family: 'Inter', sans-serif;
            }

            .task-info-item span {
                display: block;
                font-size: 14px;
                font-weight: 600;
                color: #212529;
                word-break: break-word;
                line-height: 1.3;
                font-family: 'Inter', sans-serif;
            }

                .task-info-item span.highlight {
                    color: #667eea;
                    font-weight: 700;
                }

        .task-card-footer {
            padding: 6px 16px;
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            align-items: center;
        }

        .task-action-icon {
            transition: transform 0.2s, opacity 0.2s;
            cursor: pointer;
            width: 22px;
            opacity: 0.8;
        }

            .task-action-icon:hover {
                transform: scale(1.08);
                opacity: 1;
            }

        .task-log-icon {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 11px;
            font-weight: 600;
            color: #495057;
            padding: 3px 10px;
            border-radius: 20px;
            background: #e9ecef;
            cursor: pointer;
            transition: all 0.2s;
            font-family: 'Inter', sans-serif;
        }

            .task-log-icon:hover {
                background: #dee2e6;
                color: #212529;
            }

            .task-log-icon img {
                width: 16px;
            }

        .task-status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            font-family: 'Inter', sans-serif;
        }

        .status-pending {
            background: #fff3cd;
            color: #856404;
        }

        .status-completed {
            background: #d4edda;
            color: #155724;
        }

        .status-cancelled {
            background: #f8d7da;
            color: #721c24;
        }

        .status-inprogress {
            background: #cfe2ff;
            color: #004085;
        }

        .kpi-flag {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            font-family: 'Inter', sans-serif;
        }

        .kpi-green {
            background: #d4edda;
            color: #155724;
        }

        .kpi-red {
            background: #f8d7da;
            color: #721c24;
        }

        .kpi-orange {
            background: #fff3cd;
            color: #856404;
        }

        .task-info-row:empty {
            display: none;
        }

        @media (max-width: 1024px) {
            .task-card-container {
                grid-template-columns: repeat(2, 1fr);
                gap: 16px;
                padding: 16px;
                background-color: #e0e0e0;
            }

            .task-info-item label {
                font-size: 10px;
            }

            .task-info-item span {
                font-size: 13px;
            }
        }

        @media (max-width: 768px) {
            .task-card-container {
                grid-template-columns: 1fr;
                gap: 14px;
                padding: 14px;
                background-color: #e0e0e0;
            }

            .task-info-item {
                min-width: 100%;
            }

            .task-id::before {
                content: "#" attr(data-id);
            }

            .task-card-header {
                padding: 5px 14px;
            }

            .task-id {
                font-size: 16px;
            }

            .task-card-body {
                padding: 6px 14px;
            }

            .task-card-footer {
                padding: 5px 14px;
            }
        }

        .task-card-header {
            display: flex;
            align-items: center;
            gap: 15px;
            padding-bottom: 12px;
            margin-bottom: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .task-cancel-icon {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 13px;
            font-weight: 600;
            padding: 5px 12px;
            border-radius: 20px;
            background: rgba(220, 53, 69, 0.15);
            transition: all 0.2s ease;
        }

            .task-cancel-icon:hover {
                background: rgba(220, 53, 69, 0.3);
                transform: scale(1.02);
            }

        .task-card-footer {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            align-items: center;
            padding-top: 12px;
            margin-top: 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
    </style>
</head>

<body class="">
    <form runat="server">
        <asp:HiddenField ID="HFCancelReqID" runat="server" ClientIDMode="Static" />
        <asp:HiddenField ID="HFCancelReqNB" runat="server" ClientIDMode="Static" />
        <asp:HiddenField ID="HFCancelCatID" runat="server" ClientIDMode="Static" />

        <asp:HiddenField ID="HFCancelMUIndex" runat="server" ClientIDMode="Static" />


        <asp:HiddenField ID="HFOnHoldReqID" runat="server" ClientIDMode="Static" />
        <asp:HiddenField ID="HFOnHoldReqNB" runat="server" ClientIDMode="Static" />
        <asp:HiddenField ID="HFOnHoldPorterID" runat="server" ClientIDMode="Static" />
        <asp:HiddenField ID="HFOnHoldMUIndex" runat="server" ClientIDMode="Static" />


        <asp:HiddenField ID="HFSCReqID" runat="server" ClientIDMode="Static" />
        <asp:HiddenField ID="HFSCReqNB" runat="server" ClientIDMode="Static" />
        <asp:HiddenField ID="HFSCMUIndex" runat="server" ClientIDMode="Static" />
        <asp:HiddenField ID="HFCatID" runat="server" ClientIDMode="Static" />


        <asp:HiddenField ID="HFERID" runat="server" ClientIDMode="Static" />


        <asp:HiddenField ID="HFERNO" runat="server" ClientIDMode="Static" />
        <asp:HiddenField ID="HFStatusID" runat="server" ClientIDMode="Static" />


        <asp:HiddenField ID="HFCryptoKey" runat="server" ClientIDMode="Static" />

        <asp:HiddenField ID="HFCryptoIv" runat="server" ClientIDMode="Static" />
        <input type="hidden" id="HFCancelPorterID" />


        <style>
            @keyframes tutorialBlink {
                0%, 100% {
                    opacity: 1;
                    transform: scale(1);
                }

                50% {
                    opacity: .35;
                    transform: scale(1.25);
                }
            }
        </style>

        <div id="tutorialPopup"
             style="position: fixed; inset: 0; background: rgba(0,0,0,.55); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); display: none; justify-content: center; align-items: center; z-index: 100001;">
            <div style="width: 910px; max-width: 95%; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 30px 70px rgba(0,0,0,.35);">

                <div style="height: 78px; padding: 18px 22px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ECECEC; background: #fff;">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <div style="width: 38px; height: 38px; border-radius: 50%; background: #DDF8EF; color: #00A86B; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; flex: 0 0 auto;">?</div>
                        <div>
                            <h3 style="margin: 0; font-size: 20px; color: #16213E; font-weight: 700; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">Video Tutorial</h3>
                            <p style="margin: 2px 0 0; font-size: 14px; color: #8A94A6; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">A quick walkthrough of the admin console</p>
                        </div>
                    </div>
                    <button type="button" id="closeTutorial"
                            style="width: 42px; height: 42px; min-width: 42px; min-height: 42px; border: none; border-radius: 50%; background: #EEF3F8; color: #6B7280; font-size: 20px; font-weight: 700; cursor: pointer; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; padding: 0; line-height: 1; font-family: Arial, sans-serif;">&#10005;</button>
                </div>

                <div style="background: #1B1B1B; min-height: 420px; display: flex; align-items: center; justify-content: center;">
                    <video id="tutorialVideo" controls preload="metadata"
                           style="width: 100%; display: block; background: #000; min-height: 420px; max-height: 520px;">
                        <source src="/videos/AdminTutorial-A.mp4" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                </div>

            </div>
        </div>

        <script>
            (function () {
                function initTutorialPopup() {
                    var popup = document.getElementById("tutorialPopup");
                    var video = document.getElementById("tutorialVideo");
                    var watch = document.getElementById("watchTutorial");
                    var close = document.getElementById("closeTutorial");

                    if (!popup || !watch || !close) return;

                    watch.addEventListener("click", function () {
                        popup.style.display = "flex";
                        if (video) {
                            video.currentTime = 0;
                            setTimeout(function () {
                                video.play().catch(function (e) {
                                    console.log("Autoplay blocked or video not ready:", e);
                                });
                            }, 50);
                        }
                    });

                    function closeTutorial() {
                        popup.style.display = "none";
                        if (video) {
                            video.pause();
                            video.currentTime = 0;
                        }
                    }

                    close.addEventListener("click", closeTutorial);

                    popup.addEventListener("click", function (e) {
                        if (e.target === popup) closeTutorial();
                    });

                    document.addEventListener("keydown", function (e) {
                        if (e.key === "Escape" && popup.style.display === "flex") {
                            closeTutorial();
                        }
                    });
                }

                if (document.readyState === "loading") {
                    document.addEventListener("DOMContentLoaded", initTutorialPopup);
                } else {
                    initTutorialPopup();
                }
            })();
        </script>

        <telerik:RadScriptManager ID="RadScriptManager" runat="server">
        </telerik:RadScriptManager>


        <div class="lang-menu" style="visibility: hidden">
            <a class="select-language" href="index-thai.html">Thai</a>
        </div>
        <div id="loader" class="loader-wrapper">
            <img src="../images/Traczo.svg" alt="Traczo">
        </div>
        <div class="main-wrapper">
            <div class="main-screen-wrap">
                <div class="main-screen-inner">

                    <!-- Left Panel -->
                    <div class="screen-left-panel">
                        <div class="screen-left-sticky">
                            <div>
                                <div class="traczo-logo">
                                    <a href="../Index/Index.aspx">
                                        <img src="../images/Traczo.svg" alt="Traczo">
                                    </a>
                                </div>
                                <div class="hospital-img">
                                    <img src="../images/hospital.jpg" alt="Hospital">
                                </div>
                               <div class="hospital-title">
                                    <h5>Welcome</h5>
                                    <h6>Apollo Hospitals </h6><p>  Jubilee Hills , Hyderabad</p>
                                </div>
                                <br />
                                <div style="" class="add-task-link">
                                    <button type="button" onclick="setNewTask();" class="btn btn-primary">
                                        <img src="../images/memo.png" alt="Add Task">
                                        Add task
                                    </button>
                                </div>
                                <br />
                                <div class="left-panel-menu">
                                    <ul>
                                        <li class="current-menu-item">
                                            <a href="../Index/Index.aspx">
                                                <span>
                                                    <img src="../images/home.png" alt="Home"></span> Home
                                            </a>
                                        </li>
                                        <li>
                                            <a href="../html/dashboard.html" style="display: none">
                                                <span>
                                                    <img src="../images/dashboard.png" alt="Dashboard"></span> Dashboard
                                            </a>
                                        </li>
 
                                        <li>
                                            <a href="../Reports/Report.aspx">
                                                <span>
                                                    <img src="../images/clipboard.png" alt="Reports"></span> Reports
                                            </a>
                                        </li>
                                        <%--<li>
                                            <a href="../Planner/Planner.aspx">
                                                <span>
                                                    <img src="../images/spiral-calendar.png" alt="Planner"></span> Planner
                                            </a>
                                        </li>--%>

                                        <li>
                                            <a href="../Master/TaskType.aspx">
                                                <span>
                                                    <img src="../images/category-master.png" alt="Task Types"></span> Task Types
                                            </a>
                                        </li>
                                        <li>
                                            <a href="../Master/Operative.aspx">
                                                <span>
                                                    <img src="../images/porter-master.png" alt="Porter Master"></span> Porter Master
                                            </a>
                                        </li>

                                        <li>
                                            <a href="../Master/Users.aspx">
                                                <span>
                                                    <img src="../images/porter-master.png" alt="Location Master"></span> User Master
                                            </a>
                                        </li>
                                        <li>
                                            <a href="../Master/Locations.aspx">
                                                <span>
                                                    <img src="../images/location.png" alt="Location Master"></span> Location Master
                                            </a>
                                        </li>
                                          <li>
                                            <a href="../Master/Department.aspx">
                                                <span>
                                                    <img src="../images/category-master.png" alt="Location Master"></span> Department Master
                                            </a>
                                        </li>

                                        <li>
                                            <a href="../Master/PerformLogs.aspx">
                                                <span>
                                                    <img src="../images/priority.png" alt="Location Master"></span> P3rform Logs
                                            </a>
                                        </li>

                                        <li>
                                            <a onclick="javascript:Bulk();" href="#">
                                                <span>
                                                    <img src="../images/upload-task.png" alt="Upload Tasks"></span> Upload Tasks
                                            </a>
                                        </li>

                                        <li>
                                            <a href="../Master/Roles.aspx">
                                                <span>
                                                    <img src="../images/UserRole.png" alt="Role Master"></span> Role Master
                                            </a>
                                        </li>
                                        <li>
                                            <a href="../Master/Group.aspx">
                                                <span>
                                                    <img src="../images/group-master.png" alt="Group Master"></span> Group Master
                                            </a>
                                        </li>
                                        <li>
                                            <a href="../Master/Remarks.aspx">
                                                <span>
                                                    <img src="../images/memo.png" alt="Group Master"></span> Remarks Master
                                            </a>
                                        </li>

                                    </ul>
                                </div>
                                <br />
                                <br />
                                <br />
                                <div>
                                    <div class="profile-link" onmouseover="HoverOpenSideBar()" onmouseout="OutOpenSideBar()">
                                        <div class="profile-img">
                                            <%--<img src="../images/User.png" class="ImgUser" alt="Profile">--%>
                                        </div>
                                        <div class="profile-designation">
                                            <h6><span id="spanUserName"></span>
                                                <br />
                                                <br />
                                                <span style="text-decoration: underline; font-size: 12px;">Log out</span></h6>
                                        </div>
                                        <a href="../login.aspx" class="stretched-link"></a>
                                        <img src="../images/User.png" class="ImgUser" onmouseover="HoverOpenSideBar()" alt="Profile" />


                                        <div class="DivPassword" id="DivPassword" style="display: none" align="left">
                                            <ul class='Pmenu'>
                                                <li><a onclick="ChangePassword();">Change Password </a></li>

                                            </ul>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- /Left Panel -->

                    <!-- Right Panel -->
                    <div class="screen-right-panel">
                        <div class="row" style="display: none">
                            <div class="col-md-9">

                                <!-- Section heading -->
                                <div class="section-head">
                                    <div class="section-head-left">
                                        <h5>Task</h5>
                                    </div>
                                    <div class="section-head-right d-flex align-items-center">
                                        <div class="export-link" style="visibility: hidden">
                                            <a href="#" class="btn btn-secondary">
                                                <img src="../images/printer.png" alt="Export">
                                                Export
                                            </a>
                                        </div>
                                    </div>
                                </div>

                            </div>
                            <div class="col-md-3" s>
                                <!-- Users Task -->
                                <div class="users-task-count">
                                    <!-- Section heading -->
                                    <div class="section-head">
                                        <div class="section-head-left">
                                            <h5>Users</h5>
                                        </div>
                                        <div class="section-head-right">
                                            <span data-bs-toggle="tooltip" data-bs-placement="left" title="Tooltip on left">
                                                <img src="../images/info.svg" alt="Info">
                                            </span>
                                        </div>
                                    </div>
                                    <!-- /Section heading -->
                                    <hr>
                                    <%--  <div class="users-task-count-item">
                                        <ul>
                                            <li class="ChartLinks" onclick="getPorterStatus('0');">
                                                <span class="users-task-label">On-Duty</span>
                                                <span class="users-task-count-number" id="countOnDutyCount">00</span>
                                            </li>
                                            <li class="ChartLinks" onclick="getPorterStatus('1');">
                                                <span class="users-task-label">Busy</span>
                                                <span class="users-task-count-number" id="countBusyCount">00</span>
                                            </li>
                                            <li class="ChartLinks" onclick="getPorterStatus('2');">
                                                <span class="users-task-label">Idle</span>
                                                <span class="users-task-count-number" id="countIdleCount">00</span>
                                            </li>
                                            <li class="ChartLinks" onclick="getPorterStatus('3');">
                                                <span class="users-task-label">On Break</span>
                                                <span class="users-task-count-number" id="countOnBreakCount">00</span>
                                            </li>
                                        </ul>
                                    </div>--%>
                                    <%-- <div class="row user-task-total text-center" align="center">
                                        <div class="col-lg-12 col-xl-4 ChartLinks" onclick="getPorterStatus('4');">
                                            <div class="alert alert-success" role="alert">
                                                <div class="mb-2">
                                                    <img src="../images/up-arrow.png">
                                                </div>
                                                <p>
                                                    Max Tasks
                                                <br>
                                                    <span class="users-task-count-number" id="MaxTasks">00</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div class="col-lg-12 col-xl-4 ChartLinks" onclick="getPorterStatus('5');">
                                            <div class="alert alert-danger" role="alert">
                                                <div class="mb-2">
                                                    <img src="../images/down-arrow.png">
                                                </div>
                                                <p>
                                                    Min Tasks
                                                <br>
                                                    <span class="users-task-count-number" id="MinTasks">00</span>

                                                </p>
                                            </div>
                                        </div>
                                        <div class="col-lg-12 col-xl-4" style="display: none">
                                            <div class="alert alert-primary" role="alert">
                                                <div class="mb-2">
                                                    <img src="../images/compass.png">
                                                </div>
                                                <p>
                                                    Average
                                                <br>
                                                    <span class="users-task-count-number" id="AvgTasks">00</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>--%>
                                </div>
                                <!-- /Users Task -->
                            </div>
                        </div>

                  <div class="screen-right-panel" style="position: relative;top: -30px !important; background: linear-gradient(180deg, #5B2A86 0%, #4A2578 50%, #3A1E66 100%); border-radius: 30px 30px 24px 24px; padding: 20px 25px 25px 25px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;">

                <div style="position: absolute; top: 12px; right: 8px; z-index: 1000;">
                    <div style="background: white; padding: 8px 16px; border-radius: 40px; 
                                box-shadow: 0 4px 12px rgba(0,0,0,0.15); 
                                border: 1px solid rgba(255,255,255,0.2);">

                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="font-weight: 700; color: #4361ee; font-size: 13px;">Welcome,</span>
                            <span style="font-weight: 600; color: #0f172a; font-size: 13px;" id="spndepNursname">
                                Loading...
                            </span>
                        </div>

                        <div style="margin-top: 2px;">
                            <span style="font-weight: 500; color: #6c757d; font-size: 11px;" id="spnUserTypeLabel">
                                
                            </span>
                            <span style="font-weight: 600; color: #0f172a; font-size: 12px;" id="spndepNurslocdept">
                                Loading...
                            </span>
                        </div>

                    </div>
                </div>
                    <div style="margin-top: 55px; width: 100%;">
        
                        <div style="display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;">
                            <div class="dashboard-tab" id="divExecutiveDashboard" onclick="setActiveTab(this)" style="flex: 1; min-width: 140px; background: rgba(255,255,255,0.15); border-radius: 14px; padding: 14px 0 10px 0; border: 1px solid rgba(255,255,255,0.15); cursor: pointer; transition: all 0.15s ease; display: flex; flex-direction: column; align-items: center;">
                                <img src="../images/chart-bars.png" style="width: 26px; height: 26px; filter: brightness(0) invert(1); opacity: 1; margin-bottom: 6px;">
                                <span style="color: white; font-size: 16px; font-weight: 600; text-align: center; line-height: 1.3; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">Executive / Operations</span>
                            </div>
                            <div class="dashboard-tab" id="divCommandCenter" onclick="setActiveTab(this)" style="flex: 1; min-width: 140px; background: rgba(255,255,255,0.15); border-radius: 14px; padding: 14px 0 10px 0; border: 1px solid rgba(255,255,255,0.15); cursor: pointer; transition: all 0.15s ease; display: flex; flex-direction: column; align-items: center;">
                                <img src="../images/users.png" style="width: 26px; height: 26px; filter: brightness(0) invert(1); opacity: 1; margin-bottom: 6px;">
                                <span style="color: white; font-size: 16px; font-weight: 600; text-align: center; line-height: 1.3; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">Department Command</span>
                            </div>
                            <div class="dashboard-tab" id="divWorkforce" onclick="setActiveTab(this)" style="flex: 1; min-width: 140px; background: rgba(255,255,255,0.15); border-radius: 14px; padding: 14px 0 10px 0; border: 1px solid rgba(255,255,255,0.15); cursor: pointer; transition: all 0.15s ease; display: flex; flex-direction: column; align-items: center;">
                                <img src="../images/trend.png" style="width: 26px; height: 26px; filter: brightness(0) invert(1); opacity: 1; margin-bottom: 6px;">
                                <span style="color: white; font-size: 16px; font-weight: 600; text-align: center; line-height: 1.3; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">Workforce Optimization</span>
                            </div>
                            <div class="dashboard-tab" id="divAIModules" onclick="setActiveTab(this)" style="flex: 1; min-width: 140px; background: rgba(255,255,255,0.15); border-radius: 14px; padding: 14px 0 10px 0; border: 1px solid rgba(255,255,255,0.15); cursor: pointer; transition: all 0.15s ease; display: flex; flex-direction: column; align-items: center;">
                                <img src="../images/brain.png" style="width: 26px; height: 26px; filter: brightness(0) invert(1); opacity: 1; margin-bottom: 6px;">
                                <span style="color: white; font-size: 16px; font-weight: 600; text-align: center; line-height: 1.3; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">AI Modules</span>
                            </div>
                        </div>

                        <div style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">
                            <div class="dashboard-tab" id="divPatientExp" onclick="setActiveTab(this)" style="flex: 1; min-width: 140px; background: rgba(255,255,255,0.15); border-radius: 14px; padding: 14px 0 10px 0; border: 1px solid rgba(255,255,255,0.15); cursor: pointer; transition: all 0.15s ease; display: flex; flex-direction: column; align-items: center;">
                                <img src="../images/heart.png" style="width: 26px; height: 26px; filter: brightness(0) invert(1); opacity: 1; margin-bottom: 6px;">
                                <span style="color: white; font-size: 16px; font-weight: 600; text-align: center; line-height: 1.3; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">Patient Experience</span>
                            </div>
                            <div class="dashboard-tab" id="divSLA" onclick="setActiveTab(this)" style="flex: 1; min-width: 140px; background: rgba(255,255,255,0.15); border-radius: 14px; padding: 14px 0 10px 0; border: 1px solid rgba(255,255,255,0.15); cursor: pointer; transition: all 0.15s ease; display: flex; flex-direction: column; align-items: center;">
                                <img src="../images/shield.png" style="width: 26px; height: 26px; filter: brightness(0) invert(1); opacity: 1; margin-bottom: 6px;">
                                <span style="color: white; font-size: 16px; font-weight: 600; text-align: center; line-height: 1.3; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">SLA & Compliance</span>
                            </div>
                                <div class="dashboard-tab" id="divTraczo" onclick="setActiveTab(this)" style="flex: 1; min-width: 140px; background: rgba(255,255,255,0.15); border-radius: 14px; padding: 14px 0 10px 0; border: 1px solid rgba(255,255,255,0.15); cursor: pointer; transition: all 0.15s ease; display: flex; flex-direction: column; align-items: center;">
                                <img src="../images/calendar.png" style="width: 26px; height: 26px; filter: brightness(0) invert(1); opacity: 1; margin-bottom: 6px;">
                                <span style="color: white; font-size: 16px; font-weight: 600; text-align: center; line-height: 1.3; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">Dial 50 Tasks</span>
                            </div>
                            <div class="dashboard-tab" id="divSafety" onclick="setActiveTab(this)" style="flex: 1; min-width: 140px; background: rgba(255,255,255,0.15); border-radius: 14px; padding: 14px 0 10px 0; border: 1px solid rgba(255,255,255,0.15); cursor: pointer; transition: all 0.15s ease; display: flex; flex-direction: column; align-items: center; visibility: hidden; pointer-events: none;">
                                <img src="../images/warning.png" style="width: 26px; height: 26px; filter: brightness(0) invert(1); opacity: 1; margin-bottom: 6px;">
                                <span style="color: white; font-size: 16px; font-weight: 600; text-align: center; line-height: 1.3; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">Safety & Incidents</span>
                            </div>

                        </div>
<%--                    <div style="display: flex; justify-content: center; margin: 8px 0 -40px 0 !important;">
                            <div class="dashboard-tab" id="divTraczo" onclick="setActiveTab(this)" style="width: auto; min-width: 220px; background: rgba(255,255,255,0.18); border-radius: 30px; padding: 12px 28px; border: 1px solid rgba(255,255,255,0.2); cursor: pointer; transition: all 0.15s ease; display: flex; align-items: center; justify-content: center; gap: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                                <img src="../images/checklist.png" style="width: 22px; height: 22px; filter: brightness(0) invert(1);">
                                <span style="color: white; font-size: 14px; font-weight: 700;">DIAL 50</span>
                                <span style="color: rgba(255,255,255,0.5); font-size: 14px; font-weight: 300;">|</span>
                                <span style="color: white; font-size: 14px; font-weight: 600;">LIVE</span>
                            </div>
                        </div>--%>

                        <div style="display: flex; justify-content: flex-end; align-items: center; gap: 12px; width: 100%; margin-bottom: 15px;">
                            <div style="background: rgba(255,255,255,0.12); backdrop-filter: blur(4px); padding: 6px 18px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                                <span style="color: white; font-size: 14px; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">Last updated: <span id="lastUpdatedSpan"></span></span>
                            </div>

                            <div class="refresh-button" onclick="RefreshTasks();" style="height: 38px !important; width: 38px !important; min-width: 38px !important; min-height: 38px !important; background: rgba(255,255,255,0.15); backdrop-filter: blur(4px); border-radius: 50% !important; border: 1px solid rgba(255,255,255,0.2); display: flex !important; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.15); margin: 0; padding: 0; box-sizing: border-box;">
                                <span style="font-size: 18px; color: white; font-weight: 400; display: inline-block; line-height: 1; margin: 0; padding: 0;">↻</span>
                            </div>
                        </div>

<div style="margin-bottom: 15px;">
    <h1 id="dashboardMainTitle" style="color: white; font-size: 26px; font-weight: 700; margin-bottom: 4px; letter-spacing: -0.3px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); display: inline-flex; align-items: center; gap: 16px; flex-wrap: wrap;">
        <span id="dashboardTitleText">Executive / Operations Dashboard</span>
<button type="button" id="watchTutorial"
        title="Diet Type Management Info"
        onmouseover="this.style.background='rgba(100,116,139,.18)';"
        onmouseout="this.style.background='rgba(100,116,139,.10)';"
        style="background: rgba(100,116,139,.10);
               border: 1px solid rgba(100,116,139,.18);
               border-radius: 20px;
               height: 30px;
               padding: 0 11px 0 8px;
               display: inline-flex;
               align-items: center;
               gap: 6px;
               color: #64748b;
               font-size: 12px;
               font-weight: 600;
               font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
               cursor: pointer;
               transition: .2s;">

    <svg viewBox="0 0 24 24"
         fill="none"
         style="width: 16px; height: 16px; flex-shrink: 0;">
        <circle cx="12" cy="12" r="9"
                stroke="currentColor"
                stroke-width="2.5"/>
        <path d="M12 10.5V16"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"/>
        <circle cx="12" cy="7.5" r="1.4"
                fill="currentColor"/>
    </svg>

    <span>Info</span>

</button>
    </h1>
    <p style="color: white; font-size: 14px; font-weight: 500; text-shadow: 0 1px 3px rgba(0,0,0,0.3);">Real-time performance metrics and analytics</p>
</div>
                    </div>


                    <div id="divRequestHeaders">

                      <div class="req-modern-grid-row1">
                        <div class="req-modern-card" id="divTotalPercentage" onclick='Select("divTotalPercentage","TOTAL");'>
                          <div class="req-title">TOTAL</div>
                          <div class="req-value" id="countTotalCount">00</div>
                          <div class="req-sub">All requests</div>
                        </div>
                        <div class="req-modern-card" id="divPendingPercentage" onclick='Select("divPendingPercentage","PENDING");'>
                          <div class="req-title">PENDING</div>
                          <div class="req-value" id="countPendingCount">00</div>
                          <div class="req-sub">Needs attention</div>
                        </div>
                        <div class="req-modern-card" id="divAssignedPercentage" onclick='Select("divAssignedPercentage","ASSIGNED");'>
                          <div class="req-title">ASSIGNED</div>
                          <div class="req-value" id="countAssignedCount">00</div>
                          <div class="req-sub">In progress</div>
                        </div>
                        <div class="req-modern-card" id="divInprogressPercentage" onclick='Select("divInprogressPercentage","INPROGRESS");'>
                          <div class="req-title">IN-PROGRESS</div>
                          <div class="req-value" id="countInprogressCount">00</div>
                          <div class="req-sub">Ongoing</div>
                        </div>
                        <div class="req-modern-card" id="divCompletedPercentage" onclick='Select("divCompletedPercentage","COMPLETED");'>
                          <div class="req-title">COMPLETED</div>
                          <div class="req-value" id="countCompletedCount">00</div>
                          <div class="req-sub">Finished</div>
                        </div>
                        <div class="req-modern-card" id="divPendingOnHoldPercentage" onclick='Select("divPendingOnHoldPercentage","ONHOLD");'>
                          <div class="req-title">ON-HOLD</div>
                          <div class="req-value" id="countPendingOnHoldCount">00</div>
                          <div class="req-sub">Paused</div>
                        </div>
                      </div>

                      <div class="req-modern-grid-row2">
                        <div class="req-modern-card" id="divPrebookeddPercentage" onclick='Select("divPrebookeddPercentage","PREBOOKED");'>
                          <div class="req-title">PRE-BOOKED</div>
                          <div class="req-value" id="countPreBookedCount">00</div>
                          <div class="req-sub">Scheduled</div>
                        </div>
                        <div class="req-modern-card" id="divCancelledPercentage" onclick='Select("divCancelledPercentage","CANCELLED");'>
                          <div class="req-title">CANCELLED</div>
                          <div class="req-value" id="countCancelledCount">00</div>
                          <div class="req-sub">Stopped</div>
                        </div>
                        <div class="req-modern-card" id="divSlaViolationsPercentage" onclick='Select("divSlaViolationsPercentage","SLA_VIOLATIONS");'>
                          <div class="req-title">SLA VIOLATIONS</div>
                          <div class="req-value" id="countSlaViolationsCount">00</div>
                          <div class="req-sub">Breached</div>
                        </div>
                        <div class="req-modern-card" id="divActiveAlertsPercentage" onclick='Select("divActiveAlertsPercentage","ACTIVE_ALERTS");'>
                          <div class="req-title">ACTIVE ALERTS</div>
                          <div class="req-value" id="countActiveAlertsCount">00</div>
                          <div class="req-sub">Critical</div>
                        </div>
                        <div class="req-modern-card" id="divSlaViolations2Percentage" onclick='Select("divSlaViolations2Percentage","SLA_VIOLATIONS_2");'>
                          <div class="req-title">COMPLAINTS</div>
                          <div class="req-value" id="countComplaintsCount">00</div>
                          <div class="req-sub">By Priority</div>
                        </div>
                        <div class="req-modern-card" id="divViolationsByDeptPercentage" onclick='Select("divViolationsByDeptPercentage","VIOLATIONS_BY_DEPT");'>
                          <div class="req-title">VIOLATIONS BY DEPARTMENT</div>
                          <div class="req-value" id="countSlaViolationsByDeptCount">00</div>
                          <div class="req-sub">Intelligence</div>
                        </div>
                      </div>

                    </div>

                        <div class="col-md-1">
                            <a href="#" class="btn btn-primary w-100" onclick='RefreshTasks();' style="width: 135px !important; height: 45px; display:none">
                                <img src="../images/refresh.png" alt="Refresh">
                                Refresh
                            </a>
                        </div>
                    </div>

                    <div class="row" id="divUserHeaders" style="display: none;">
                        <div class="InnerIndexIcon col-md-1" id="divOnDuty" onclick="getPorterStatus('0','divOnDuty');">
                            <div class="InnerReqCountContainer">
                                <span class="InnerReqCount" id="countOnDutyCount">00</span>
                            </div>
                            <p class="InnerReqText">ON-DUTY</p>
                        </div>

                        <div class="InnerIndexIcon col-md-1" id="divBusy" onclick="getPorterStatus('1','divBusy');">
                            <div class="InnerReqCountContainer">
                                <span class="InnerReqCount" id="countBusyCount">00</span>
                            </div>
                            <p class="InnerReqText">BUSY</p>
                        </div>

                        <div class="InnerIndexIcon col-md-1" id="divIdle" onclick="getPorterStatus('2','divIdle');">
                            <div class="InnerReqCountContainer">
                                <span class="InnerReqCount" id="countIdleCount">00</span>
                            </div>
                            <p class="InnerReqText">IDLE</p>
                        </div>

                        <div class="InnerIndexIcon col-md-1" id="divOnBreak" onclick="getPorterStatus('3','divOnBreak');">
                            <div class="InnerReqCountContainer">
                                <span class="InnerReqCount" id="countOnBreakCount">00</span>
                            </div>
                            <p class="InnerReqText">ON BREAK</p>
                        </div>

                        <div class="InnerIndexIcon col-md-1" id="divMaxTask" onclick="getPorterStatus('4','divMaxTask');">
                            <div class="InnerReqCountContainer">
                                <span class="InnerReqCount" id="MaxTasks">00</span>
                            </div>
                            <p class="InnerReqText">MAX TASKS</p>
                        </div>

                        <div class="InnerIndexIcon col-md-1" id="divMinTask" onclick="getPorterStatus('5','divMinTask');">
                            <div class="InnerReqCountContainer">
                                <span class="InnerReqCount" id="MinTasks">00</span>
                            </div>
                            <p class="InnerReqText">MIN TASKS</p>
                        </div>

                        <div class="InnerIndexIcon col-md-1" id="divAvgCount" onclick="getPorterStatus('6','divAvgCount');" style="display: none;">
                            <div class="InnerReqCountContainer">
                                <span class="InnerReqCount" id="AvgTasks">00</span>
                            </div>
                            <p class="InnerReqText">AVERAGE</p>
                        </div>
                    </div>

                    <div class="search-wrap" id="searchFiltersSection" style="width: 100%; margin-top: 15px;">
                        <div class="search-box">
                            <div class="row">
                                <div class="col-md-12">
                                    <div class="row" id="taskfileters">
                                        <div class="col-md-4">
                                            <fieldset>
                                                <legend>Task Filters</legend>
                                                <div class="row">
                                                    <div class="col-md-6">
                                                    <select name="selectFloor" id="search_TaskFields" tabindex="1"
                                                            class="form-control search_test"
                                                            onchange="OnchangeFilter('search_TaskFields','txtSearchTask');return false;">

                                                        <option value="R.REQUESTID" selected>REQ #</option>
                                                        <option value="REQUESTORNAME">Requested By</option>
                                                        <option value="PATIENTNAME">Patient Name</option>
                                                        <option value="CM.CATEGORYNAME">Task Type</option>
                                                        <option value="L.ZONENAME">From Location</option>
                                                        <option value="D.ZONENAME">To Location</option>
                                                        <option value="CONTACTNO">Contact No</option>
                                                        <option value="PM.USERNAME">Porter Name</option>

                                                    </select>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="search-wrap w-100" style="margin: 0px;">
                                                            <div class="search-box">
                                                                <form>
                                                                    <input type="search" maxlength="30" autocomplete="off webauthn" id="txtSearchTask" class="form-control" placeholder="Search">
                                                                    <input type="submit" value="" class="search-submit" onclick="setIndexscreen(); return false;">
                                                                </form>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </fieldset>
                                        </div>

<%--                                        <div class="col-md-5">
                                            <fieldset>
                                                <legend>Patient/Notes Filters</legend>
                                                <div class="row">
                                                    <div class="col-md-6">
                                                        <select name="selectFloor" id="search_PatientRemarks" class="form-control search_test" onchange="OnchangeFilter('search_PatientRemarks','txtSearchPatient');return false;">
                                                            <option value="PATIENTNAME" selected>Name/DOB/Bed No.</option>
                                                            <option value="[dbo].[FN_GETCOMPLTEREMARK] (R.REQUESTID)">Task Notes</option>
                                                            <option value="PORTERREMARKS">Porter Remarks</option>
                                                            <option value="REMARKS">Cancel Remarks</option>
                                                            <option value="REQUESTDESKREMARKS">Request Desk Remarks</option>
                                                        </select>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="search-wrap w-100" style="margin: 0px;">
                                                            <div class="search-box">
                                                                <form>
                                                                    <input type="search" maxlength="30" autocomplete="off webauthn" id="txtSearchPatient" class="form-control" placeholder="Search">
                                                                    <input type="submit" value="" class="search-submit" onclick="setIndexscreen(); return false;">
                                                                </form>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </fieldset>
                                        </div>--%>

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="tab-content-wrapper" style="background: rgba(255,255,255,0.05); border-radius: 16px; min-height: 400px; border: 1px solid rgba(255,255,255,0.08);">
                    <div id="EscalationChart" style="width: 100%; min-height: 400px;"></div>
                </div>


                    <div class="tabs mt-3">
                        <ul class="nav nav-tabs" id="myTab" role="tablist" style="display: none;">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active" id="tasks-tab" data-bs-toggle="tab" data-bs-target="#tasks" type="button" role="tab" aria-controls="tasks" aria-selected="true">Tasks</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="users-tab" data-bs-toggle="tab" data-bs-target="#users" type="button" role="tab" aria-controls="users" aria-selected="false" onclick="getPorterStatus('0');">Users</button>
                            </li>
                        </ul>
        
                        <div class="tab-content" id="myTabContent" align="center">
                            <!-- TASKS TAB PANE -->
                            <div class="tab-pane fade show active" id="tasks" role="tabpanel" aria-labelledby="tasks-tab">
                                <div class="table-wrap" style="min-height: 800px; max-width: 100%;">
                                    <div class="row">
                                        <div class="col-sm-12">
                                            <div class="page-container" style="display: none;">
                                                <button class="first-page" style="padding: 0px;" onclick="handleButton(this); return false;" disabled>
                                                    <i class="fas fa-angle-double-left"></i>
                                                </button>
                                                <button class="prev-page" style="padding: 0px;" onclick="handleButton(this); return false;" disabled>
                                                    <i class="fas fa-angle-left"></i>
                                                </button>
                                                <div id="pagination"></div>
                                                <button class="next-page" style="padding: 0px;" onclick="handleButton(this); return false;" disabled>
                                                    <i class="fas fa-angle-right"></i>
                                                </button>
                                                <button class="last-page" style="padding: 0px;" onclick="handleButton(this); return false;" disabled>
                                                    <i class="fas fa-angle-double-right"></i>
                                                </button>
                                        <div class="form-group d-flex align-items-center">
                                            <label for="pageSize" class="pgSize" style="margin: 5px 15px 5px 25px;">
                                                Card Size
                                            </label>

                                            <select id="pageSize"
                                                    name="pageSize"
                                                    class="form-control pgSize"
                                                    style="width: 80px;"
                                                    onchange="changeGridSize(this);">
                                                <option value="9" selected>9</option>
                                                <option value="10">10</option>
                                                <option value="11">11</option>
                                                <option value="12">12</option>
                                                <option value="13">13</option>
                                                <option value="14">14</option>
                                                <option value="15">15</option>
                                                <option value="16">16</option>
                                                <option value="17">17</option>
                                                <option value="18">18</option>
                                                <option value="19">19</option>
                                                <option value="20">20</option>
                                            </select>
                                        </div>                                       

                                            </div>
                                        </div>
                                    </div>
                                    <div class="table-responsive" id="tblRequests" style="max-width: 98%; display: none;"></div>
                                </div>
                            </div>
            
                            <!-- USERS TAB PANE -->
                            <div class="tab-pane fade" id="users" role="tabpanel" aria-labelledby="users-tab">
                                <div class="table-wrap">
                                    <div class="table-responsive" id="tblUsers" style="max-width: 98%;"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div> <!-- END screen-right-panel -->

                <!-- /Right Panel -->
            <div class="loaderElement" style="display: none">
                <div class="loader-spinner"></div>
            </div>
        <div class="modal fade" id="ModalChangepwd" tabindex="-1" aria-labelledby="reportsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-fullscreen-md-down">
                <div class="modal-content">

                    <div class="modal-header">
                        <h6 class="modal-title"><span id="canReqIDpwd"></span>
                            &nbsp;&nbsp;CHANGE PASSWORD</h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" style="width: 20px; height: 20px;">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="headFoot" style="height: 0px; margin-top: -2px;">
                    </div>
                    <div id="Div2pwd" align="center" style="overflow-y: auto;">
                        <div id="CancelReasonContentpwd" class="Content" style="min-height: 320px">
                            <div id="DivCPContent" class="ContentCP" align="center" style="margin-top: 25px;">

                                <table class="Custfont" style="min-width: 350px; min-height: 160px; font-size: 14px; font-weight: 500;"
                                    cellpadding="5" cellspacing="5">
                                    <tr>
                                        <td>Current Password
                                        </td>
                                        <td align="center">
                                            <asp:TextBox ID="TxtCurPassword" runat="server" Width="180px" class="txtpwd" ClientIDMode="Static"
                                                Style="border: 1px solid #ded6d6 !important; margin-bottom: 0px !important; padding-left: 5px"
                                                TextMode="Password"></asp:TextBox>
                                            <asp:Label ID="ErCurrent" runat="server" Text="*" ForeColor="Red" Font-Size="Medium"
                                                ClientIDMode="Static" CssClass="Custfont" Style="visibility: hidden"></asp:Label>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>New Password
                                        </td>
                                        <td align="center">
                                            <asp:TextBox ID="TxtPassword" runat="server" Width="180px" class="txtpwd" ClientIDMode="Static"
                                                Style="border: 1px solid #ded6d6 !important; margin-bottom: 0px !important; padding-left: 5px"
                                                TextMode="Password"></asp:TextBox>
                                            <asp:Label ID="ErPassword" runat="server" Text="*" ForeColor="Red" Font-Size="Medium"
                                                ClientIDMode="Static" CssClass="Custfont" Style="visibility: hidden"></asp:Label>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Confirm Password
                                        </td>
                                        <td align="center">
                                            <asp:TextBox ID="TxtConfirmPassword" runat="server" Width="180px" class="txtpwd" ClientIDMode="Static"
                                                Style="border: 1px solid #ded6d6 !important; margin-bottom: 0px !important; padding-left: 5px"
                                                TextMode="Password"></asp:TextBox>
                                            <asp:Label ID="ErCPassword" runat="server" Text="*" ForeColor="Red" Font-Size="Medium"
                                                ClientIDMode="Static" CssClass="Custfont" Style="visibility: hidden"></asp:Label>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colspan="2">
                                            <table width="90%" align="center">
                                                <tr>
                                                    <td valign="middle" align="center"></td>
                                                    <td align="right">
                                                        <div class="section-head-right d-flex align-items-center">
                                                            <!-- <div class="date">
                                        <img src="../images/spiral-calendar.png" alt="Date"> 03-Mar-2023
                                    </div> -->

                                                        </div>
                                                        <div class="export-link" onclick="ValidatePassword()">
                                                            <a href="#" class="btn btn-secondary">
                                                                <img src="../images/memo.png" alt="Change">
                                                                Change
                                                            </a>
                                                        </div>
                                                        <%--<asp:Button ID="BtnSave" runat="server" Text="CHANGE" Style="background-color: rgba(32, 72, 132, 1);
                                                    border: none; padding: 5px 10px; color: white; font-weight: lighter !important;
                                                    font-size: 14px; border-radius: 0px !important; font-family: monospace;" OnClientClick="ValidatePassword();return false;" />--%>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>

                            </div>
                            <div style="text-align: justify;">
                                <span style="color: red; /* font-size: 15px; */">*</span><%-- The password must contain at least one digit and one lowercase English character and one uppercase English character and one special character from the specified set [!@#$%^&amp;*()\-+.]--%>

                                <div id="message">
                                    <h6>Password must contain the following:</h6>
                                    <p id="letter" class="invalid">A lowercase letter</p>
                                    <p id="capital" class="invalid">A capital (uppercase) letter</p>
                                    <p id="splChar" class="invalid">A special character [!@#$%^&*()\-+.] letter</p>

                                    <p id="number" class="invalid">A number</p>
                                    <p id="length" class="invalid">Minimum 6 characters</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>

        <!-- Reports -->
        <!-- Modal -->
        <div class="modal fade" id="reportsModal" tabindex="-1" aria-labelledby="reportsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="reportsModalLabel">Generate New Report</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="modal-body">
                        <form>
                            <div class="row">
                                <div class="col-md-12">
                                    <div class="mb-3">
                                        <label for="select-format">Choose Format</label>
                                        <select name="select-format" id="select-format" class="form-control selectFormat sumoSelect">
                                            <option selected>Select Format</option>
                                            <option value="PDF">PDF</option>
                                            <option value="Excel">Excel</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="since-date">Since</label>
                                        <input type="date" id="since-date" class="form-control">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="to-date">To</label>
                                        <input type="date" id="to-date" class="form-control">
                                    </div>
                                </div>
                                <div class="col-md-12">
                                    <div class="d-flex justify-content-end">
                                        <button type="button" class="btn btn-outline me-3" data-bs-dismiss="modal">
                                            <img src="../images/multiply.svg">
                                            Cancel</button>
                                        <input type="submit" value="Generate" class="btn btn-secondary">
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <!-- /Reports -->
        <!-- Add Task -->
        <!-- Modal -->


        <div class="modal fade" id="ModalImage" tabindex="-1" aria-labelledby="reportsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-md" style="min-width: 600px;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <img id="imgAckHead" src="../images/Photo.png" alt="Logs" style="width: 35px;" />&nbsp;
                            <span style="font-size: 16px;"><span id="spanReqID"></span><span id="spanAckHead"></span></span>
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" style="width: 20px; height: 20px;">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="modal-body" style="height: 450px;">
                        <form>
                            <div class="row">

                                <div class="col-md-12" align="center">
                                    <div class="polaroid">
                                        <img id="ImgACK" alt="ACK" style="width: 100%; height: 380px" />
                                        <div class="container">
                                            <p id="ACK_ON"></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal fade addTask" id="addTask" data-backdrop="static" tabindex="-1" aria-labelledby="addTaskLabel" aria-hidden="true">
            <button type="button" class="floating btn-close" data-bs-dismiss="modal" aria-label="Close">
                <img src="../images/close-white.svg">
            </button>
            <div class="modal-dialog modal-xxl">
                <div class="modal-content">
                    <div class="search-header" style="display: none;">
                        <div class="search-wrap shadow">
                            <div class="search-box">
                                <form>
                                    <input type="search" maxlength="30" autocomplete="off webauthn" class="form-control">
                                    <input type="submit" value="" class="search-submit">
                                </form>
                            </div>
                        </div>
                    </div>
                    <div class="modal-body">
                        <div class="d-flex justify-content-between">
                            <div class="form-wrap me-4">
                                <div class=" align-items-center justify-content-between mb-5">
                                    <%--d-flex--%>

                                    <div class="addtask-header row">
                                        <div class="col-md-6">
                                            <h5><span id="TaskHeader"></span></h5>
                                        </div>
                                        <div class="col-md-6 text-with-btn">
                                            <h5><span id="ReqUserLogin" <%-- style="margin-left: 20px; font-size: 19px;"--%>></span></h5>
                                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                                                <img src="../images/close-white.svg">
                                            </button>
                                        </div>
                                    </div>
                                    <%--<h5 style="font-family: monospace; width: 700px;"><span id="TaskHeader"></span>&nbsp;&nbsp;&nbsp;<span id="ReqUserLogin" style="margin-left: 20px; font-size: 19px;"></span></h5>--%>
                                </div>

                                <div class="navigation-tabs-wrapper-modal mb-0 p-0" style="display:none">
                                    <div class="services-button-modal">
                                        <label>Services</label>
                                    </div>
                                    <div class="services-tabs-wrapper-modal">
                                        <div class="services-btn-icon-modal" data-color="rgb(255, 116, 0)" id="divRService1">
                                            <img src="../images/porter-icon.svg" />
                                            <span>Porter</span>
                                        </div>
                                        <div class="services-btn-icon-modal" data-color="rgb(12, 188, 139)" id="divRService2">
                                            <img src="../images/cater-icon.svg" />
                                            <span>Cater</span>
                                        </div>
                                        <div class="services-btn-icon-modal" data-color="rgb(110, 48, 243)" id="divRService3">
                                            <img src="../images/clean-icon.svg" />
                                            <span>Clean</span>
                                        </div>
                                        <div class="services-btn-icon-modal" data-color="rgb(255, 87, 51)" id="divRService4">
                                            <img src="../images/pest-icon.svg" />
                                            <span>Feedback</span>
                                        </div>
                                        <div class="services-btn-icon-modal" data-color="rgb(255, 87, 51)" id="divRService5">
                                            <img src="../images/security-icon.svg" />
                                            <span>Security</span>
                                        </div>
                                        <%--<div class="services-btn-icon-modal" data-color="rgb(255, 87, 51)">
                                            <span>Show All</span>
                                        </div>--%>
                                    </div>


                                </div>
                                <form id="formRequest">

                                    <div class="row">
                                        <div class="col-md-12" id="divReqDate">
                                            <div class="mb-3">
                                                <h5 style="font-family: monospace; width: 700px; font-size: 20px;"><span id="spanRequestDate"></span></h5>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="row">

                                        <div class="col-md-12 d-flex justify-content-end align-items-center gap-2" id="DivPrebookSlider">

                                            <label class="mb-0" style="vertical-align: middle; padding-left: 10px; font-size: 19px; font-weight: bold;">PRE-BOOK</label>
                                            <label class="switch">
                                                <input type="checkbox" id="chkPreBook">
                                                <span class="slider round"></span>
                                            </label>

                                        </div>
                                        <div class="col-md-6" id="containerDate" style="display: none">
                                            <div class="mb-3">
                                                <label for="txtReqdate">Date</label>
                                                <input type="date" id="txtReqdate" class="form-control">
                                            </div>

                                        </div>
                                        <div class="col-md-6" id="containerTime" style="display: none">
                                            <div class="mb-3">
                                                <label for="txtReqTime">Time</label>
                                                <input type="time" id="txtReqTime" class="form-control">
                                            </div>
                                        </div>
                                        <%--  <div class="col-md-12" align="center">
                                            <div class="d-flex align-items-center col-md-11">
                                                <div class="from-title">
                                                    <h5>From</h5>
                                                </div>
                                                <div class="task-type">
                                                    <span class="left"></span>
                                                    <div class="btn btn-primary">Task type</div>
                                                    <span class="right"></span>
                                                </div>
                                                <div class="to-title text-end">
                                                    <h5>To</h5>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="locations">
                                            <div class="from-location-wrap">
                                                <div class="from-location mb-4" id="containerFrom">
                                                    <div class="sumo-container">
                                                        <select name="selectFloor" id="search_from" tabindex="1" class="select sumoSelect sumo-select" onchange="setLocation(this,'From');">
                                                            <option value="0">--Select--</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <hr>
                                                <div class="from-location mb-4" id="containerHalt1">
                                                    <div class="sumo-container">
                                                        <select name="selectFloor" id="search_Halt1" tabindex="1" class="select sumoSelect sumo-select" onchange="setLocation(this,'Halt1');">
                                                            <option value="0">--Select--</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>--%>


                                        <div class="col-md-6" id="containerFrom">
                                            <div class="mb-3">
                                                <label id="lblFrom">From</label>
                                                <textarea maxlength="50" name="txtFromLoc" rows="1" class="form-control" placeholder="-- Select --" id="txtFromLoc"   style="padding:15px; height:50px; resize:none; overflow:hidden;"></textarea>
                                                <div id="suggesstionFrom" class="col-md-6"></div>
                                            </div>
                                        </div>

                                        <div class="col-md-6" id="containerTo">
                                            <div class="mb-3">
                                                <label id="lblTo">To</label>
                                                <textarea maxlength="50" name="txtToLoc" rows="1" class="form-control" placeholder="-- Select --" id="txtToLoc" style="padding:15px; height:50px; resize:none; overflow:hidden;"></textarea>
                                                <div id="suggesstionTo" class="col-md-6"></div>
                                            </div>
                                        </div>


                                        <%-- <div class="col-md-6" id="containerFrom">
                                            <div class="mb-3">
                                                <label>From</label>
                                                <select name="selectFloor" id="search_from" tabindex="1" class="form-control search_test" onchange="setLocation(this,'From');">
                                                    <option value="0">--Select--</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="col-md-6" id="containerTo">
                                            <div class="mb-3">
                                                <label>To</label>
                                                <select name="selectFloor" id="search_to" tabindex="2" class="form-control search_test" onchange="setLocation(this,'To');">
                                                    <option value="0">--Select--</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div style="display: none">
                                            <div class="col-md-6" id="containerHalt1">
                                                <div class="mb-3">
                                                    <label>Halt1 <span style="font-size: 9pt">(optional)</span></label>
                                                    <select name="selectFloor" id="search_Halt1" tabindex="1" class="form-control search_test" onchange="setLocation(this,'Halt1');">
                                                        <option value="0">--Select--</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div class="col-md-6" id="containerHalt2">
                                                <div class="mb-3">
                                                    <label>Halt2<span style="font-size: 9pt">(optional)</span></label>
                                                    <select name="selectFloor" id="search_Halt2" tabindex="1" class="form-control search_test" onchange="setLocation(this,'Halt2');">
                                                        <option value="0">--Select--</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>--%>
                                        <div class="col-md-12" id="containerCat" style="background-color: #6dadff; padding: 25px 25px 10px 25px; margin-top: 30px; min-height: 325px;">
                                            <div class="row mb-2 align-items-center search-bar-modal justify-content-between" style="padding: 10px;">
                                                <div class="col-md-2">
                                                    <label>Task Type</label>
                                                </div>
                                                <div class="col-md-6">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="21" viewBox="0 0 20 21" fill="none">
                                                        <path d="M9.58342 18.625C4.87508 18.625 1.04175 14.7917 1.04175 10.0833C1.04175 5.37501 4.87508 1.54167 9.58342 1.54167C14.2917 1.54167 18.1251 5.37501 18.1251 10.0833C18.1251 14.7917 14.2917 18.625 9.58342 18.625ZM9.58342 2.79167C5.55841 2.79167 2.29175 6.06667 2.29175 10.0833C2.29175 14.1 5.55841 17.375 9.58342 17.375C13.6084 17.375 16.8751 14.1 16.8751 10.0833C16.8751 6.06667 13.6084 2.79167 9.58342 2.79167Z" fill="var(--active-color-modal)" />
                                                        <path d="M18.3333 19.4583C18.175 19.4583 18.0166 19.4 17.8916 19.275L16.225 17.6083C15.9833 17.3667 15.9833 16.9667 16.225 16.725C16.4666 16.4833 16.8666 16.4833 17.1083 16.725L18.775 18.3917C19.0166 18.6333 19.0166 19.0333 18.775 19.275C18.65 19.4 18.4916 19.4583 18.3333 19.4583Z" fill="var(--active-color-modal)" />
                                                    </svg>
                                                    <%--<textarea maxlength="50" name="task-description" rows="2" class="form-control" placeholder="search..." id="txtSearchCat" onkeyup="searchCategory(this);"></textarea>--%>
                                                    <textarea maxlength="50" name="task-description" rows="2" class="form-control search-bar" placeholder="Search..." id="txtSearchCat" onkeyup="searchCategory(this);" style="box-shadow: none; padding-left: 5rem; background-color: white !important;height:50px; resize:none; overflow:hidden;"></textarea>
                                                </div>

                                                <div class="col-md-3">
                                                    <div class="d-flex gap-2 align-items-center" id="divQuantity">
                                                        <label class="mb-0">Quantity <span style="font-size: 11px">(optional)</span></label>
                                                        <input type="number" max="5" min="0" name="txtQty" class="form-control" placeholder="" id="txtQty" value="1" />
                                                    </div>
                                                </div>

                                            </div>
                                            <div class="icon-section" id="ReqCategories">
                                            </div>
                                        </div>

                                        <div class="col-md-8" id="containerKPI" style="background-color: #84abf9; padding-bottom: 10px;">
                                            <%--<div class="kpi-container">
                                                <label class="label-title">
                                                    KPI Response
                                                </label>
                                                <label id="lblKPITS" class="form-control">- </label>
                                            </div>
                                            <div class="kpi-container">
                                                <label class="label-title">
                                                    KPI Completion
                                                </label>
                                                <label id="lblKPITE" class="form-control">- </label>
                                            </div>--%>
                                            <table style="height: 74px; /*position: absolute; */ background: white; width: 470px; margin-bottom: -10px;" cellpadding="8px">

                                                <tr style="border: 3px solid white;">
                                                    <td style="text-align: center; width: 130px; background-color: #7eafff;" id="tdKPIResponse">
                                                        <label style="font-size: 14px;">
                                                            KPI
                                                            <br />
                                                            Response</label></td>
                                                    <td style="text-align: center; width: 105px;">
                                                        <label id="lblKPITS" style="font-size: 13px;">- </label>
                                                    </td>
                                                    <td style="text-align: center; width: 130px; background-color: #7eafff;" id="tdKPICompletion">
                                                        <label style="font-size: 14px;">
                                                            KPI
                                                            <br />
                                                            Completion</label></td>

                                                    <td style="text-align: center; width: 105px;">
                                                        <label id="lblKPITE" style="font-size: 13px;">- </label>
                                                    </td>
                                                </tr>

                                            </table>
                                        </div>

                                        <div class="col-md-4" style="background-color: #84abf9;" id="parentcontainerMP">
                                            <%--<div class="switch-cointainer" onclick="setMultiPorter();">
                                                <label class="mb-0">Two Porters</label>
                                                <label class="switch">
                                                    <input type="checkbox" id="chkMultiPorter">
                                                    <span class="slider round"></span>
                                                </label>
                                            </div>
                                            <div class="switch-cointainer" onclick="setReturnCalls();" style="display: none">
                                                <label class="mb-0">Return call</label>
                                                <label class="switch">
                                                    <input type="checkbox" id="chkReturnCalls">
                                                    <span class="slider round"></span>
                                                </label>
                                            </div>--%>
                                            <table style="width: 100%; margin-top: 35px;" id="containerMP">
                                                <tr>
                                                    <td onclick="setMultiPorter();">
                                                        <div align="right">
                                                            <table style="background-color: white; margin-bottom: -1px; border-radius: 5px 5px 0px 0px;">
                                                                <tr>
                                                                    <td style="padding-left: 10px; padding-top: 10px;">
                                                                        <label>Two Porters</label></td>
                                                                    <td style="padding-left: 20px; padding-right: 10px;">
                                                                        <label class="switch">
                                                                            <input type="checkbox" id="chkMultiPorter">
                                                                            <span class="slider round"></span>
                                                                        </label>
                                                                    </td>
                                                                </tr>
                                                            </table>


                                                        </div>
                                                    </td>
                                                    <td onclick="setReturnCalls();" style="display: none">
                                                        <div class="mb-3" align="center">
                                                            <table>
                                                                <tr>
                                                                    <td>
                                                                        <label>Return call</label></td>
                                                                    <td style="padding-left: 20px;">
                                                                        <label class="switch">
                                                                            <input type="checkbox" id="chkReturnCalls">
                                                                            <span class="slider round"></span>
                                                                        </label>
                                                                    </td>
                                                                </tr>
                                                            </table>


                                                        </div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </div>
                                        <div class="col-md-12 mt-4" id="containerPatient">
                                            <div class="row mb-3">
                                                <label id="lblPatientDetails">Patient Name</label>
                                                <div class="col-md-8">
                                                    <textarea maxlength="75" name="txtPatientName" rows="3" class="form-control" placeholder="Name" id="txtPatientName" style=" height:50px; resize:none; overflow:hidden;"></textarea>

                                                    <div class="row">
                                                        <div class="col-md-6">
                                                            <%-- <label>Name </label>
                                                                                                   <textarea name="txtPatientName" rows="2" class="form-control" placeholder="Name" id="txtPatientName"></textarea>--%>
                                                        </div>

                                                        <div class="col-md-3" style="display: none;">
                                                            <label>DOB </label>
                                                            <input type="date" id="txtPatientDOB" class="form-control" style="padding: 20px 12px;">
                                                        </div>
                                                        <div class="col-md-3" style="display: none;">
                                                            <label>Hospital No. </label>
                                                            <textarea name="txtPatientHNO" rows="2" class="form-control" placeholder="Hospital No." id="txtPatientHNO"></textarea>

                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="col-md-4" id="divEndDate" style="display: inline-block; padding-top: 30px;">

                                                    <fieldset style="height: 50px;">
                                                        <label>End Date :- &nbsp <span style="font-size: 12px" id="lblEndDate"></span></label>
                                                    </fieldset>

                                                </div>
                                            </div>
                                        </div>

                                        <%-- <div class="col-md-4">
                                              <div class="mb-3" style="margin-top: 5px; display: none;" id="divQuantity">
                                                <label>Quantity <span style="font-size: 11px">(optional)</span></label>
                                                <textarea maxlength="5" name="txtQty" rows="3" class="form-control" placeholder="Quantity" id="txtQty"></textarea>
                                            </div>
                                        </div>--%>
                                    </div>
                                    <div class="col"></div>
                                </form>
                            </div>

                            <div class="custom-calendar-wrap">

                                <div class="RequestIcons" style="padding: 20px">


                                    <div class="col-md-12" id="containerRequestor" style="padding: 15px 10px;">
                                        <div class="mb-3">
                                            <label>Requestor Name <span style="color:red;">*</span></label>
                                            <textarea maxlength="50" name="txtRequestorName" rows="2" class="form-control" placeholder="Requestor Name" id="txtRequestorName" style="height:50px; resize:none; overflow:hidden;"></textarea>
                                        </div>
                                    </div>

                                    <div class="col-md-12" id="containerContact">
                                        <div class="mb-3">
                                            <label>Contact No. <span style="font-size: 11px">(optional)</span></label>
                                            <textarea maxlength="50" name="txtContactNumber" rows="2" class="form-control" placeholder="Contact No." id="txtContactNumber" style="height:50px; resize:none; overflow:hidden;"></textarea>
                                        </div>
                                    </div>

                                    <div class="col-md-12">
                                        <div class="mb-3">
                                            <label>Remarks</label>
                                            <div id="divSelRemarks">
                                                <select name="selectFloor" id="search_Remarks" tabindex="10" multiple="multiple" class="form-control search_test" onchange="OnChangeRemarks(this,'txtRemarks');return false;" style="margin-bottom: 10px; background-color: white !important;"></select>
                                            </div>
                                            <textarea maxlength="100" name="task-description" rows="4" class="form-control" placeholder="Remarks" id="txtRemarks" style="display: inline-block; height:70px; resize:none;"></textarea>
                                        </div>
                                    </div>
                                    <div id="divEditRemarks" class="col-md-12">
                                        <%-- <div class="col-md-12" id="divCompleteRemarks">
                                            <div class="row">
                                                <div class="col-md-6">
                                                    <label>Notes</label>
                                                </div>
                                                <div class="col-md-5" align="right">
                                                    <label style="font-size: 13px;">&lt;&lt;Prev </label>
                                                    <label style="font-size: 12px; text-decoration: underline; color: blue; cursor: pointer;" id="lblPreNotes" onclick="showPrevNotes();">
                                                        show
                                                    </label>
                                                </div>
                                            </div>
                                            <div id="divPrevNotes" class="completeRemarks" style="display: none; max-height: 310px; overflow-y: auto; padding: 5px;">
                                            </div>

                                            <div class="row">
                                                <div class="col-md-8">
                                                    <textarea name="task-description" rows="3" class="form-control" placeholder=" Notes " id="txtCompleteRemarks" style="display: inline-block;"></textarea>
                                                </div>
                                                <div class="col-md-4">
                                                    <div class="row">
                                                        <div class="col-md-12 mb-3" align="center" style="margin-top: 10px; margin-bottom: 6px !important;">
                                                            <label style="text-decoration: underline; color: white; margin-bottom: 6px; background-color: #0a57c7; padding: 5px;" onclick="setCheckbyID('chkMitigation');">Mitigation </label>
                                                        </div>
                                                        <div class="col-md-12" align="center">
                                                            <img src="../images/NoMCheck.jpg" id="chkMitigation" style="width: 20px; cursor: pointer;" onclick="setCheck(this);">
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>

                                        </div>--%>
                                        <div class="col-md-12" id="divPorterRemarks">
                                            <div class="mb-3">
                                                <label>Porter Remarks</label>
                                                <textarea maxlength="100" name="task-description" rows="4" class="form-control" placeholder="Porter Remarks" id="txtPorterRemarks" style="display: inline-block;"></textarea>
                                            </div>
                                        </div>
                                        <br />
                                        <div class="col-md-12" id="divCancelRemarks">
                                            <label>Cancel Remarks</label>
                                            <div id="divSelCRemarks">
                                                <select name="selectFloor" id="search_CancelRemarks" tabindex="12" multiple="multiple" class="form-control search_test" onchange="OnChangeRemarks(this,'txtCanceRemarks');return false;" style="margin-bottom: 10px; background-color: white !important;"></select>
                                            </div>
                                            <textarea maxlength="300" name="task-description" rows="10" class="form-control" placeholder="Cancel Remarks" id="txtCanceRemarks" style="display: inline-block; height: 150px;"></textarea>
                                        </div>
                                    </div>
                                </div>

                                <div class="RequestIcons" style="padding: 10px; padding-top: 15px;">
                                    <div class="mb-3 row">
                                        <div class="col-sm-4" style="display: none">
                                            <button type="reset" class="btn btn-tertiary w-100">Clear</button>
                                        </div>
                                        <div class="col-sm-6">
                                            <button type="button" class="btn btn-outline w-100"
                                                data-bs-dismiss="modal">
                                                <img src="../images/multiply.svg">
                                                Close</button>
                                        </div>
                                        <div class="col-sm-6">
                                            <button type="button" class="btn btn-secondary w-100" onclick="submitRequest();" id="btnReqSubmit">
                                                <img
                                                    src="../images/envelope.png">
                                                Submit</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal fade" id="modalReqAlert" tabindex="-1" aria-labelledby="reportsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-md">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="NRSuccess">Success</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="modal-body">
                        <form>
                            <div class="row">
                                <div class="col-md-12">
                                    <div class="mb-3 text-center">
                                        <img src="../images/icon-success.gif" alt="Icon Success">
                                    </div>
                                    <div class="mb-3 text-center">
                                        <span id="LBLRequestResult"></span>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <!-- /Add Task -->


        <div class="modal fade" id="ModalStart" tabindex="-1" aria-labelledby="reportsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-fullscreen-md-down">
                <div class="modal-content">

                    <div class="modal-header">
                        <h6 class="modal-title">#<span id="StartReqID"></span>
                            &nbsp;&nbsp;-&nbsp;REASON  <span style="font-size: 11px">(optional)</span> </h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" style="width: 20px; height: 20px;">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="headFoot" style="height: 0px; margin-top: -2px;">
                    </div>
                    <div id="DivStart" align="center" style="overflow-y: auto;">
                        <div id="StartdReasonContent" class="Content" style="margin-bottom: 10px;">
                            <table width="95%">
                                <tr>
                                    <td align="center">
                                        <table style="width: 190px;">
                                            <tr>
                                                <td valign="middle" align="center" style="vertical-align: middle">
                                                    <table>
                                                        <tr>
                                                            <td>
                                                                <textarea maxlength="100" name="txtStartReason" id="txtStartReason" cols="25" rows="10" maxlength="120" class="txtRemarksInfo"
                                                                    style="height: 100px; width: 300px; word-break: break-word !important; font-size: 14px; font-weight: bold !important; text-align: left !important; resize: none !important; padding: 5px; border-radius: 5px; color: #142d52;" tabindex="4"></textarea>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td width="25%" style="vertical-align: middle;">
                                        <span id="ImgStartReq" style="cursor: pointer; background-color: #0d6efd; padding: 22px 12px; border-radius: 39px; font-weight: bold; font-size: 15px; color: white;" onclick="StartRequest();return false;">START </span>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>


        <div class="modal fade" id="ModalComplete" tabindex="-1" aria-labelledby="reportsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-fullscreen-md-down">
                <div class="modal-content">

                    <div class="modal-header">
                        <h6 class="modal-title">#<span id="CompleteReqID"></span>
                            &nbsp;&nbsp;-&nbsp;REASON <span style="font-size: 11px">(optional)</span></h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" style="width: 20px; height: 20px;">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="headFoot" style="height: 0px; margin-top: -2px;">
                    </div>
                    <div id="DivComplete" align="center" style="overflow-y: auto;">
                        <div id="CompletedReasonContent" class="Content" style="margin-bottom: 10px;">
                            <table width="95%">
                                <tr>
                                    <td align="center">
                                        <table style="width: 190px;">
                                            <tr>
                                                <td valign="middle" align="center" style="vertical-align: middle">
                                                    <table>
                                                        <tr>
                                                            <td>
                                                                <textarea maxlength="100" name="txtCompleteReason" id="txtCompleteReason" cols="25" rows="10" maxlength="120" class="txtRemarksInfo"
                                                                    style="height: 100px; width: 300px; word-break: break-word !important; font-size: 14px; font-weight: bold !important; text-align: left !important; resize: none !important; padding: 5px; border-radius: 5px; color: #142d52;" tabindex="4"></textarea>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td width="25%" style="vertical-align: middle;">
                                        <span id="ImgCompleteReq" style="cursor: pointer; background-color: #FF725E; padding: 22px 12px; border-radius: 39px; font-weight: bold; font-size: 15px; color: white;" onclick="CompleteRequest();return false;">Finish </span>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>


        <div class="modal fade" id="ModalOnHold" tabindex="-1" aria-labelledby="reportsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-fullscreen-md-down">
                <div class="modal-content">
                    <%-- <div class="header" align="center">
                        <table width="95%" style="margin-top: -6px;">
                            <tr>
                                <td style="color: white; font-weight: bold; font-family: monospace; font-size: 18px; position: relative; top: -4px; padding-right: 5px;">#<span id="canReqID"></span> </td>
                                <td colspan="2" align="center" valign="middle">
                                    <span style="color: white; font-family: monospace; font-size: 18px; position: relative; top: -4px; padding-right: 5px;">REASON FOR CANCEL</span>
                                </td>
                                <td width="10%">
                                    <input type="image" name="BtnRequestCatClose" id="ImgReqCancelClose" src="../images/close.png"
                                        style="border-width: 0px; cursor: pointer; float: right; margin-right: 8px;"
                                        data-bs-dismiss="modal" />
                                </td>
                            </tr>
                        </table>
                    </div>--%>
                    <div class="modal-header">
                        <h6 class="modal-title">#<span id="OnHoldReqID"></span>
                            &nbsp;&nbsp;REASON FOR ONHOLD</h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" style="width: 20px; height: 20px;">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="headFoot" style="height: 0px; margin-top: -2px;">
                    </div>
                    <div id="DivOhHold" align="center" style="overflow-y: auto;">
                        <div id="OnHoldReasonContent" class="Content" style="margin-bottom: 10px;">
                            <table width="95%">
                                <tr>
                                    <td align="center">
                                        <table style="width: 190px;">
                                            <tr>
                                                <td valign="middle" align="center" style="vertical-align: middle">
                                                    <table>
                                                        <tr>
                                                            <td>
                                                                <textarea maxlength="100" name="txtOnHoldReason" id="txtOnHoldReason" cols="25" rows="10" maxlength="120" class="txtRemarksInfo"
                                                                    style="height: 100px; width: 300px; word-break: break-word !important; font-size: 14px; font-weight: bold !important; text-align: left !important; resize: none !important; padding: 5px; border-radius: 5px; color: #142d52;" tabindex="4"></textarea>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td width="25%" style="vertical-align: middle;">
                                        <span id="ImgOnHoldReq" style="cursor: pointer; background-color: #FF725E; padding: 22px 12px; border-radius: 39px; font-weight: bold; font-size: 15px; color: white;" onclick="OnHoldRequest();return false;">HOLD </span>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>


        <div class="modal fade" id="ModalOnHoldRelease" tabindex="-1" aria-labelledby="reportsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-fullscreen-md-down">
                <div class="modal-content">
                    <%-- <div class="header" align="center">
                        <table width="95%" style="margin-top: -6px;">
                            <tr>
                                <td style="color: white; font-weight: bold; font-family: monospace; font-size: 18px; position: relative; top: -4px; padding-right: 5px;">#<span id="canReqID"></span> </td>
                                <td colspan="2" align="center" valign="middle">
                                    <span style="color: white; font-family: monospace; font-size: 18px; position: relative; top: -4px; padding-right: 5px;">REASON FOR CANCEL</span>
                                </td>
                                <td width="10%">
                                    <input type="image" name="BtnRequestCatClose" id="ImgReqCancelClose" src="../images/close.png"
                                        style="border-width: 0px; cursor: pointer; float: right; margin-right: 8px;"
                                        data-bs-dismiss="modal" />
                                </td>
                            </tr>
                        </table>
                    </div>--%>
                    <div class="modal-header">
                        <h6 class="modal-title">Click 'Confirm' If You Are Ok To Release The Task No. &nbsp;&nbsp;#<span id="OnHoldReleaseReqID"></span></h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" style="width: 20px; height: 20px;">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="headFoot" style="height: 0px; margin-top: -2px;">
                    </div>
                    <div id="DivOhHoldRelease" align="center" style="overflow-y: auto;">
                        <div id="OnHoldReleaseContent" class="Content" style="margin-bottom: 10px;">
                            <table width="95%">
                                <tr>
                                    <td align="center" style="padding: 20px; vertical-align: middle;">
                                        <span id="ImgOnHoldRelease" style="cursor: pointer; background-color: #FF725E; padding: 14px 10px; border-radius: 10px; margin: 5px; font-weight: bold; font-size: 15px; color: white;" onclick="ReleaseOnHoldRequest();return false;">Confirm </span>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="ModalCancel" tabindex="-1" aria-labelledby="reportsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-fullscreen-md-down">
                <div class="modal-content">
                    <%-- <div class="header" align="center">
                        <table width="95%" style="margin-top: -6px;">
                            <tr>
                                <td style="color: white; font-weight: bold; font-family: monospace; font-size: 18px; position: relative; top: -4px; padding-right: 5px;">#<span id="canReqID"></span> </td>
                                <td colspan="2" align="center" valign="middle">
                                    <span style="color: white; font-family: monospace; font-size: 18px; position: relative; top: -4px; padding-right: 5px;">REASON FOR CANCEL</span>
                                </td>
                                <td width="10%">
                                    <input type="image" name="BtnRequestCatClose" id="ImgReqCancelClose" src="../images/close.png"
                                        style="border-width: 0px; cursor: pointer; float: right; margin-right: 8px;"
                                        data-bs-dismiss="modal" />
                                </td>
                            </tr>
                        </table>
                    </div>--%>
                    <div class="modal-header">
                        <h6 class="modal-title">#<span id="canReqID"></span>
                            &nbsp;&nbsp;REASON FOR CANCEL</h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" style="width: 20px; height: 20px;">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="headFoot" style="height: 0px; margin-top: -2px;">
                    </div>
                    <div id="Div2" align="center" style="overflow-y: auto;">
                        <div id="CancelReasonContent" class="Content" style="min-height: 320px">
                            <table width="95%" style="min-height: 250px;">
                                <tr>

                                    <td colspan="2" align="center">
                                        <div class="col-md-11">
                                            <select name="selectFloor" id="searchCR_CancelRemarks" multiple="multiple" class="form-control search_test" onchange="OnChangeRemarks(this,'txtCanceRemarks');return false;" style="margin-bottom: 10px; text-align: left;"></select>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <table style="width: 190px;">
                                            <tr>
                                                <td valign="middle" align="center" style="vertical-align: middle">
                                                    <table>

                                                        <tr>
                                                            <td>
                                                                <textarea maxlength="300" name="txtCancelReason" id="txtCancelReason" cols="25" rows="10" class="txtRemarksInfo"
                                                                    style="height: 150px; width: 300px; word-break: break-word !important; font-size: 14px; font-weight: bold !important; text-align: left !important; resize: none !important; padding: 5px; border-radius: 5px; color: #142d52;" tabindex="4"></textarea>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td width="25%" style="vertical-align: middle;">

                                        <div class="col-md-11" id="divOccurrence">
                                            <div class="switch-button_Occurrence">
                                                <label style="color: white">
                                                    Occurrence
                                                </label>
                                                <label class="switchOccurrence">
                                                    <input type="checkbox" id="chkCancelOccurrence">
                                                    <span class="slideroccurrence round"></span>
                                                </label>
                                            </div>
                                        </div>
                                        <div class="col-md-11" align="center">

                                            <img src="../images/Delete.png" id="ImgDeleteReq" style="cursor: pointer; margin-top: 20px;" onclick="CancelRequest();return false;" />
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>


        <div id="ModalDone" class="modal fade" role="dialog">
            <div class="modal-dialog modal-dialog-centered modal-fullscreen-md-down">
                <div class="modal-dialogLoc" align="center">
                    <table style="margin-top: 100px;">
                        <tr>
                            <td>
                                <img id="ImgDone" src="../images/Tick.png" />
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
        </div>
        <div class="modal fade" id="modalAlert" tabindex="-1" aria-labelledby="reportsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-md">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Alert</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="modal-body">
                        <form>
                            <div class="row">
                                <div class="col-md-12">
                                    <div class="mb-3 text-center">
                                        <img src="../images/priority.png" alt="Icon Success">
                                    </div>
                                    <div class="mb-3 text-center">
                                        <span id="spanErrorMessage"></span>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>


<div id="ModalAddTask" class="modal fade" role="dialog">
    <div class="modal-dialog modal-dialog-centered modal-fullscreen-xxl-down" style="max-width:1200px;width:95%;">
        <div class="modal-content" style="border:none;border-radius:14px;overflow:visible;background:#F7F6FB;box-shadow:0 25px 60px rgba(15,23,42,.30);font-family:'Inter','Segoe UI',-apple-system,BlinkMacSystemFont,Arial,sans-serif;">

            <div style="background:#FF6B57;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;border-radius:14px 14px 0 0;">

                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:40px;height:40px;border-radius:10px;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;">
                        <img src="../Images/PorterModal.PNG" width="22" alt="">
                    </div>
                    <div>
                        <div style="color:#FFFFFF;font-size:17px;font-weight:800;letter-spacing:.3px;line-height:1.15;">Reassign Task</div>
                        <div style="color:rgba(255,255,255,.85);font-size:12px;font-weight:500;margin-top:2px;">Select a pending task and assign it to an available porter.</div>
                    </div>
                </div>

                <input type="image"
                       id="ImgAddTask"
                       name="BtnRequestAddtaskClose"
                       src="../images/close.png"
                       data-bs-dismiss="modal"
                       onclick="return false;"
                       style="width:36px;height:36px;padding:0;border:0;border-radius:50%;cursor:pointer;background:rgba(255,255,255,.22);flex:0 0 auto;display:block;box-sizing:border-box;object-fit:contain;transition:background .15s ease;"
                       onmouseover="this.style.background='rgba(255,255,255,.40)';"
                       onmouseout="this.style.background='rgba(255,255,255,.22)';">
            </div>

            <div style="padding:20px 24px;background:#F7F6FB;border-radius:0 0 14px 14px;">

                <div style="background:#FFFFFF;border-radius:12px;padding:18px;border:1px solid #E5E7EB;box-shadow:0 2px 8px rgba(15,23,42,.04);margin-bottom:16px;">

                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                        <div style="display:flex;align-items:center;gap:9px;">
                            <div style="width:8px;height:8px;background:#FF6B57;border-radius:50%;"></div>
                            <span style="font-size:12px;font-weight:800;color:#0F172A;text-transform:uppercase;letter-spacing:1px;">Select Task</span>
                        </div>
                        <span style="background:#FFEDEA;color:#C4321F;padding:5px 11px;border-radius:20px;font-size:11px;font-weight:700;">Pending Tasks</span>
                    </div>

                    <div id="gridPenTask"
                         style="max-height:400px;overflow-y:auto;padding:10px;border-radius:10px;border:1px solid #E5E7EB;background:#FAFBFC;">
                    </div>

                </div>

                <div style="background:#FFFFFF;border-radius:12px;padding:18px;border:1px solid #E5E7EB;box-shadow:0 2px 8px rgba(15,23,42,.04);">

                    <div style="display:flex;align-items:center;gap:9px;margin-bottom:14px;">
                        <div style="width:8px;height:8px;background:#16A34A;border-radius:50%;"></div>
                        <span style="font-size:12px;font-weight:800;color:#0F172A;text-transform:uppercase;letter-spacing:1px;">Assign Porter</span>
                    </div>

                    <div style="display:flex;align-items:center;gap:12px;">

                        <div style="flex:0 0 50%;max-width:50%;min-width:0;position:relative;">
                            <select id="search_PorterMT"
                                    name="selectFloor"
                                    tabindex="3"
                                    class="form-control search_test"
                                    onchange="OnChangeMTPorters(this);"
                                    style="width:100%;height:46px;border-radius:8px;border:1.5px solid #D1D5DB;background:#FFFFFF;color:#0F172A;font-size:14px;font-weight:600;padding:0 36px 0 14px;outline:none;box-shadow:none;box-sizing:border-box;cursor:pointer;appearance:auto;-webkit-appearance:auto;-moz-appearance:auto;text-overflow:ellipsis;white-space:nowrap;overflow:hidden;transition:border-color .15s ease,box-shadow .15s ease;"
                                    onfocus="this.style.borderColor='#FF6B57';this.style.boxShadow='0 0 0 3px rgba(255,107,87,.18)';"
                                    onblur="this.style.borderColor='#D1D5DB';this.style.boxShadow='none';">
                                <option value="0">Select Porter</option>
                            </select>
                        </div>

                        <div id="btnAddTasks"
                             onclick="AbortAllActiveRuquests();AssignTasks();return false;"
                             style="height:46px;padding:0 26px;border-radius:8px;background:#FF6B57;display:inline-flex;align-items:center;justify-content:center;gap:9px;color:#FFFFFF;font-size:13px;font-weight:800;letter-spacing:.5px;cursor:pointer;box-shadow:0 4px 12px rgba(255,107,87,.30);box-sizing:border-box;flex:0 0 auto;white-space:nowrap;transition:background .15s ease,transform .15s ease;"
                             onmouseover="this.style.background='#E85540';this.style.transform='translateY(-1px)';"
                             onmouseout="this.style.background='#FF6B57';this.style.transform='translateY(0)';">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M20 8v6M23 11h-6"/>
                            </svg>
                            ASSIGN
                        </div>

                    </div>

                </div>

                <div style="display:flex;justify-content:flex-end;margin-top:16px;">
                    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:30px;padding:9px 16px;display:inline-flex;align-items:center;gap:9px;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span style="font-size:12px;font-weight:600;color:#7F1D1D;">Manual assign closes in</span>
                        <span id="MTCount" style="font-size:17px;font-weight:800;color:#DC2626;min-width:26px;text-align:center;">60</span>
                        <span style="font-size:12px;font-weight:700;color:#DC2626;">sec</span>
                    </div>
                </div>

            </div>

        </div>
    </div>
</div>

        <%-- <div id="ModalMTDone" class="modal fade" role="dialog">
            <div class="modal-dialogLoc" align="center">
                <table style="margin-top: 100px; background: white; height: 100px; border-radius: 20px;">
                    <tr>
                        <td style="line-height: 25px; text-align: center; vertical-align: middle; padding: 20px;">
                            <span id="spanMT" style="font-size: 11pt; color: #c10000; font-weight: bold;">Tasks <span id="spanMTTasks"></span>been assigned to  <span id="spanMTPorter" style="color: rgb(30, 70, 129); font-size: 12pt; text-shadow: 1px 1px 1px #c5cae9;"></span>Successfully </span>
                        </td>
                    </tr>
                </table>
            </div>
        </div>
        --%>
        <!-- Success Modal -->
        <div class="modal fade" id="ModalMTDone" tabindex="-1" aria-labelledby="reportsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-md">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="MTNSuccess">Success</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="modal-body">
                        <form>
                            <div class="row">
                                <div class="col-md-12">
                                    <div class="mb-3 text-center">
                                        <img src="../images/icon-success.gif" alt="Icon Success">
                                    </div>
                                    <div class="mb-3 text-center">
                                        <span id="spanMT" style="font-size: 11pt;">Task(s) <span id="spanMTTasks"></span>been assigned to  <span id="spanMTPorter"></span>Successfully </span>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>



        <div class="modal fade" id="ModalDoneAddRemarks" tabindex="-1" aria-labelledby="reportsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-md">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Success</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="modal-body">
                        <form>
                            <div class="row">
                                <div class="col-md-12">
                                    <div class="mb-3 text-center">
                                        <img src="../images/icon-success.gif" alt="Icon Success">
                                    </div>
                                    <div class="mb-3 text-center">
                                        <span style="font-size: 11pt;">Notes subimtted Successfully </span>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>



        <!-- Success Modal -->
        <div class="modal fade" id="ModalCompleteNotes" tabindex="-1" aria-labelledby="reportsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-md">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Notes
                            <img src="../images/memo.png" alt="Notes" />
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="modal-body" style="height: 650px;">
                        <form>
                            <div class="row">

                                <div id="divCompleteselect" class="col-md-12"; style="display:none;">
                                    <select name="selectFloor" id="search_CompleteRemarks" tabindex="11" multiple="multiple" class="form-control search_test" onchange="OnChangeRemarks(this,'txtCompleteRemarks');return false;" style="margin-bottom: 10px; background-color: white !important; "></select>
                                </div>

                            </div>
                            <div class="row">
                                <div class="col-md-8">
                                    <textarea maxlength="100" name="txtComRemarks" rows="4" class="form-control" placeholder=" Notes " id="txtComRemarks" style="width: 100%; height: 100px; resize: none;"></textarea>
                                </div>

                                <div class="col-md-4">

                                    <div class="row">
                                        <div id="divMitigationSection" style="display:none;">
                                        <div class="col-md-3" align="center" style="padding-top: 17px;" >
                                            <img src="../images/NoMCheck.jpg" id="chkMitigationCom" style="height: 20px; width: 20px; cursor: pointer;" onclick="setCheck(this);">
                                        </div>
                                        <div class="col-md-9 mb-3" align="center" style="margin-top: 10px; margin-bottom: 3px !important;">
                                            <label style="font-weight: 600; color: white; margin-bottom: 6px; background-color: #0a57c7; padding: 5px; margin-left: -10px; text-decoration: underline; cursor: pointer;"
                                                onclick="setCheckbyID('chkMitigationCom');">
                                                Mitigation
                                            </label>
                                        </div>
                                            </div>
                                        <div class="col-md-12">
                                            <button type="button" class="btn btn-secondary " onclick="submitNotes();" style="margin-top: 10px; padding: 10px 20px;">
                                                <img
                                                    src="../images/envelope.png">
                                                Submit</button>

                                        </div>
                                    </div>


                                </div>

                                <div class="col-md-12">
                                    <div id="divComNotes" class="completeRemarks" style="display: none; max-height: 400px; overflow-y: auto; padding: 5px;">
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="ModalReqLogs" tabindex="-1" aria-labelledby="reportsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-md" style="min-width: 800px;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <img src="../images/Logr.png" alt="Logs" style="width: 35px;" />&nbsp;
                            <span id="spanLogReq" style="font-size: 18px;"></span>
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" style="width: 20px; height: 20px;">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="modal-body" style="height: 650px;">
                        <form>
                            <div class="row">

                                <div class="col-md-12">
                                    <div id="divReqLogs" class="completeRemarks" style="display: none; max-height: 600px; overflow-y: auto; padding: 5px;">
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="ModalSuccessCancel" tabindex="-1" aria-labelledby="reportsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-md">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Success</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="modal-body">
                        <form>
                            <div class="row">
                                <div class="col-md-12">
                                    <div class="mb-3 text-center">
                                        <img src="../images/icon-success.gif" alt="Icon Success">
                                    </div>
                                    <div class="mb-3 text-center">
                                        <span style="font-size: 11pt;">Task #<span id="spanTaskCnl"></span> cancelled Successfully </span>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>


        <div class="modal fade" id="ModalSuccessOnHold" tabindex="-1" aria-labelledby="reportsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-md">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Success</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="modal-body">
                        <form>
                            <div class="row">
                                <div class="col-md-12">
                                    <div class="mb-3 text-center">
                                        <img src="../images/icon-success.gif" alt="Icon Success">
                                    </div>
                                    <div class="mb-3 text-center">
                                        <span style="font-size: 11pt;">Task #<span id="spanTaskOnHold"></span> has been put on HOLD Successfully. </span>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>


        <div class="modal fade" id="ModalSuccessStart" tabindex="-1" aria-labelledby="reportsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-md">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Success</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="modal-body">
                        <form>
                            <div class="row">
                                <div class="col-md-12">
                                    <div class="mb-3 text-center">
                                        <img src="../images/icon-success.gif" alt="Icon Success">
                                    </div>
                                    <div class="mb-3 text-center">
                                        <span style="font-size: 11pt;">Task #<span id="spanTaskStart"></span> has been Started Successfully. </span>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>



        <div class="modal fade" id="ModalSuccessComplete" tabindex="-1" aria-labelledby="reportsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-md">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Success</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="modal-body">
                        <form>
                            <div class="row">
                                <div class="col-md-12">
                                    <div class="mb-3 text-center">
                                        <img src="../images/icon-success.gif" alt="Icon Success">
                                    </div>
                                    <div class="mb-3 text-center">
                                        <span style="font-size: 11pt;">Task #<span id="spanTaskComplete"></span> has been Completed Successfully. </span>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>



        <div class="modal fade" id="ModalReleaseSuccessOnHold" tabindex="-1" aria-labelledby="reportsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-md">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Success</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="modal-body">
                        <form>
                            <div class="row">
                                <div class="col-md-12">
                                    <div class="mb-3 text-center">
                                        <img src="../images/icon-success.gif" alt="Icon Success">
                                    </div>
                                    <div class="mb-3 text-center">
                                        <span style="font-size: 11pt;">Task #<span id="spanReleaseTaskOnHold"></span> has been moved to pending list successfully. </span>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="successMTNoTask" tabindex="-1" aria-labelledby="reportsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-md">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Success</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="modal-body">
                        <form>
                            <div class="row">
                                <div class="col-md-12">
                                    <div class="mb-3 text-center">
                                        <img src="../images/icon-success.gif" alt="Icon Success">
                                    </div>
                                    <div class="mb-3 text-center">
                                        <span style="font-size: 11pt;"><span id="spanMTPorterNTasks"></span>task(s) have been moved to pending list successfully. </span>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <!-- Success Modal -->
        <div class="modal fade" id="successMTNoporter" tabindex="-1" aria-labelledby="reportsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-md">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="MTSuccess">Success</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="modal-body">
                        <form>
                            <div class="row">
                                <div class="col-md-12">
                                    <div class="mb-3 text-center">
                                        <img src="../images/icon-success.gif" alt="Icon Success">
                                    </div>
                                    <div class="mb-3 text-center">
                                        <span id="spanMTN" style="font-size: 11pt;">Tasks <span id="spanMTNTasks"></span>been merged for multi-tasking Successfully </span>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <!-- Floor Map Modal -->
        <div class="modal fade" id="floor-map-popup" tabindex="-1" aria-labelledby="reportsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Tracking</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="modal-body">
                        <form>
                            <div class="row">
                                <div class="col-md-12">

                                    <div class="mb-3 text-center">
                                        <table width="90%" align="center">
                                            <tr>
                                                <td>
                                                    <img src="../images/avtar.png" alt="Porter" id="ImgMapPorter">
                                                    <h5 id="MapPorterNmae"></h5>
                                                </td>
                                                <td align="center">
                                                    <img src="../images/Locate.png" alt="Locate">
                                                    <h5 id="MapCurLocation">Main Corridor</h5>
                                                </td>
                                            </tr>
                                        </table>

                                    </div>
                                    <div class="mb-3">
                                        <img src="../images/hospital-map.png" id="PorterMap" alt="Map">
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>



        <!-- JS CSS -->

        <script src="../js/bootstrap.bundle.min.js"></script>
        <script src="../js/jquery.sumoselect.min.js"></script>
        <script src="../js/style.js"></script>
        <script src="../js/Pager.js"></script>
    </form>
</body>

</html>

