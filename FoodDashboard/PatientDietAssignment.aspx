<%@ Page Language="C#" AutoEventWireup="true" CodeFile="PatientDietAssignment.aspx.cs" Inherits="FoodDashboard_PatientDietAssignment" %>

<html lang="en">

<head>
    <title>Patient | DIAL50</title>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- Favicon -->
    <link rel="icon" href="../favicon.png" />
    <!-- CSS -->
    <link rel="stylesheet" type="text/css" href="../css/bootstrap.min.css" />
    <link rel="stylesheet" type="text/css" href="../css/sumoselect.min.css">

    <link rel="stylesheet" href="../fontawesome/css/all.min.css" />

    <link rel="stylesheet" type="text/css" href="../css/style.css" />
    <link rel="stylesheet" type="text/css" href="../css/PatientDietAssignment.css" />
    <link href="../css/changepwd.css" rel="stylesheet" />
    <script src="../js/jquery-3.6.4.min.js" type="text/javascript"></script>
    <script src="../js/xlsx.full.min.js" type="text/javascript"></script>
    <script src="../js/exceljs.min.js"></script>
    <script src="../js/PatientDietAssignment.js" type="text/javascript"></script>
    <script src="../js/aes.js" type="text/javascript"></script>
    <script src="../js/bulk.js" type="text/javascript"></script>
    <script src="../js/ChangePassword.js" type="text/javascript"></script>
    <telerik:RadCodeBlock ID="RadCodeBlock" runat="server">
        <script type="text/javascript">
            var dataSet = [], hurl = '<%=ConfigurationManager.AppSettings["HTTP"].ToString() %>' + '://' + '<%=ConfigurationManager.AppSettings["EPEServer"].ToString() %>' + ':' + '<%=ConfigurationManager.AppSettings["AppPort"].ToString() %>' + "/FoodDashboard/",
                urlPageValidation =  '<%=ConfigurationManager.AppSettings["HTTP"].ToString() %>' + '://' +'<%=ConfigurationManager.AppSettings["EPEServer"].ToString() %>' + ':' + '<%=ConfigurationManager.AppSettings["AppPort"].ToString() %>' + "/MasterPage/Service/Service.aspx?",
                CryptoKey = '<%=ConfigurationManager.AppSettings["CryptoKey"].ToString() %>',
                CryptoPwd = '<%=ConfigurationManager.AppSettings["CryptoIV"].ToString() %>',
                ConProtocol = '<%=ConfigurationManager.AppSettings["HTTP"].ToString() %>',
                olddatetime = '', prebook = '', TimerHome, ToUpdate = false,
                FPatientName = '', TPatientName = '', MRDPatientName = '', GCancelReason, GFinishReason, GTagID, CurrentDStatus, GReqID, GPorterID, IsEdit, GMIndex = '0', GExtn = '', ReqDate = '', ReqTime = '', ReqCat = '0', RFromID = '0', RToID = '0', RPreBook = '0',
                Efrom, ETo, ECategory, EDate, EPatient, Remarks, AReqID, APorter1, APorter2, ADept, Isclear = false, PorterID1 = ''; PorterName1 = ''; PorterID = ''; PorterName = '', PORTERGROUP = '', ISMULTIPORTER = 'NO', IsReturn = 'NO',
                    MAReqID = '', MADept = '', MACount = 60, MANReqID = '', MANCount = 60, MANPorterID = '', MANPorterName = '', GPatientName = '', GFrom = '', GStatus = '2', GOMI = '0', GUser = '', ATReqNB = '',
                    IsMRD = 'NO';
            var PorterCurTasks = '', PendingTasks = '', ATPorterID = '', ATPorterName = '', ATStatus = '', ATReqNB = '';
            var EUserID = '', EUserName = '', ERoleID = '', EDefaultLocation = '', Erolename = '', EIsActive = '', ERoleName = '', ENearByZoneArr = '', ENearByZoneIDs = '', EMId = '';
            var grid, gridMasterTable, pageSize = 15, pageIndex = 0;

            $(document).ready(function () {
                InitChangePassword();
                LoadDietTypeDropdown();
                LoadWardDropdown();
                LoadPatientDietAssignments();
                $('#ddlWardFilter').SumoSelect();
                $('#ddlDietFilter').SumoSelect();
                $('#ddlWard').SumoSelect();
                $('#ddlGender').SumoSelect();
                $('#ddlDietType').SumoSelect();
                $('#ddlNewDietType').SumoSelect();
                $('#ddlCountry').SumoSelect();
                $("#ddlWardFilter").on("change", function () {
                    LoadPatientDietAssignments();
                });

                $("#ddlDietFilter").on("change", function () {
                    LoadPatientDietAssignments();
                });
                $("#txtSearchPatient").on("keyup", function () {
                    LoadPatientDietAssignments();
                });
                $("#txtDoctorSearch").on("keyup", function () {
                    LoadPatientDietAssignments();

                });
                $("#urgentDietWrap").hide();

                $("#ddlDietType").change(function () {
                    if ($(this).val() !== "") {
                        $("#urgentDietWrap").css("display", "flex");
                    } else {
                        $("#urgentDietWrap").hide();
                        $("#chkUrgentDiet").prop("checked", false);
                    }
                });
                $('#chkIsolation').on('change', function () {

                    if ($(this).is(':checked')) {
                        $('#isolationReasonWrap').show();
                    } else {
                        $('#isolationReasonWrap').hide();
                        $('#txtIsolationReason').val('');
                    }

                });
                var userName = sessionStorage.getItem('NAME') || '';
                var userRole = sessionStorage.getItem('ROLENAME') || '';
                var roleId = parseInt(sessionStorage.getItem("ROLE")) || 0;
                if (roleId === 14) {
                    $("#foodOrderContainer").show();
                } else {
                    $("#foodOrderContainer").next("br").remove();
                    $("#foodOrderContainer").remove();
                }
                $('#spndepNursname').text(userName);
                $('#spnUserTypeLabel').text(userRole);
                $('#spanUserName').text(userName);
                $('#hfUserName').val(userName);
                $('#hfUserRole').val(userRole);
                LoadNotifications();
                $('#notificationBell').off('click').on('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    $('#notificationDropdown').toggleClass('show');
                    if ($('#notificationDropdown').hasClass('show')) {
                        LoadNotifications();
                    }
                });
                $(document).on('click', function (e) {
                    if (!$(e.target).closest('.notification-wrapper').length) {
                        $('#notificationDropdown').removeClass('show');
                    }
                });
                $('#markAllRead').off('click').on('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    MarkAllNotificationsAsRead();
                });
            });


        </script>
    </telerik:RadCodeBlock>
</head>
<body>
    <form id="formCategory" runat="server">
        <telerik:RadScriptManager ID="RadScriptManager" runat="server">
        </telerik:RadScriptManager>
        <asp:HiddenField ID="HFCancelReqID" runat="server" ClientIDMode="Static" />
        <asp:HiddenField ID="HFERID" runat="server" ClientIDMode="Static" />

        <asp:HiddenField ID="HFERNO" runat="server" ClientIDMode="Static" />
        <asp:HiddenField ID="HFStatusID" runat="server" ClientIDMode="Static" />

        <asp:HiddenField ID="HFDWExportHeader" runat="server" ClientIDMode="Static" />
        <asp:HiddenField ID="hfUserId" runat="server" ClientIDMode="Static" />
        <asp:HiddenField ID="HFDWSearchQuery" runat="server" ClientIDMode="Static" />
        <input type="hidden" id="hdnPatientAction" value="INSERT" />
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
                        style="width: 42px; height: 42px; min-width: 42px; min-height: 42px; border: none; border-radius: 50%; background: #EEF3F8; color: #6B7280; font-size: 20px; font-weight: 700; cursor: pointer; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; padding: 0; line-height: 1; font-family: Arial, sans-serif;">
                        &#10005;</button>
                </div>

                <div style="background: #1B1B1B; min-height: 420px; display: flex; align-items: center; justify-content: center;">
                    <video id="tutorialVideo" controls preload="metadata"
                        style="width: 100%; display: block; background: #000; min-height: 420px; max-height: 520px;">
                        <source src="/videos/AdminTutorial.mp4" type="video/mp4">
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
                                    <img src="../images/hospitaleq.jpg" alt="Hospital">
                                </div>
                                <div class="hospital-title">
                                    <h5>Welcome</h5>
                                    <h6>Burjeel Medical City (BMC)</h6>
                                    <p>Mohamed Bin Zayed City - Abu Dhabi - United Arab Emirates</p>
                                </div>
                                <div class="food-order-btn-container" id="foodOrderContainer">
                                    <button type="button"
                                        class="food-order-btn"
                                        onclick="openFoodOrder()">
                                        <img src="../images/food-order.png">
                                        Food Order
    
                                    </button>
                                </div>
                                <div class="left-panel-menu">
                                    <ul>
                                        <li>
                                            <a href="../Index/Index.aspx">
                                                <span>
                                                    <img src="../images/home.png" alt="Home"></span> Home
                                            </a>
                                        </li>
                                        <li style="display: none">
                                            <a href="dashboard.html">
                                                <span>
                                                    <img src="../images/dashboard.png" alt="Dashboard"></span> Dashboard
                                            </a>
                                        </li>
                                        <li>
                                            <a href="#" onclick="redirectFloorwiseTrac()">
                                                <span>
                                                    <img src="../images/world-map.png" alt="Map"></span> Map
                                            </a>
                                        </li>
                                        <li>
                                            <a href="../Track/TrackNew.aspx">
                                                <span>
                                                    <img src="../images/doc.png" alt="Track"></span> Track
                                            </a>
                                        </li>
                                        <li>
                                            <a href="../Reports/Report.aspx">
                                                <span>
                                                    <img src="../images/clipboard.png" alt="Reports"></span> Reports
                                            </a>
                                        </li>
                                        <li>
                                            <a href="../Planner/Planner.aspx">
                                                <span>
                                                    <img src="../images/spiral-calendar.png" alt="Planner"></span> Planner
                                            </a>
                                        </li>

                                        <li>
                                            <a href="../Master/Category.aspx">
                                                <span>
                                                    <img src="../images/category-master.png" alt="Task Types"></span> Task Types
                                            </a>
                                        </li>
                                        <li>
                                            <a href="../Master/Porter.aspx">
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
                                            <a href="../Master/Equipment.aspx">
                                                <span>
                                                    <img src="../images/Equipment.png" alt="Location Master"></span> Equipment Master
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
                                                    <img src="../images/location.png" alt="Location Master"></span> Department Master
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
                                        <li class="current-menu-item">
                                            <a href="../FoodDashboard/PatientDietAssignment.aspx">
                                                <span>
                                                    <img src="../images/PATIENTS.png" alt="PatientDiet Assignment"></span> Patient
                                            </a>
                                        </li>
                                        <li>
                                            <a href="../FoodDashboard/DietTypeManagement.aspx">
                                                <span>
                                                    <img src="../images/DIETS.png" alt="Diet Types"></span> Diet Types
                                            </a>
                                        </li>
                                        <li>
                                            <a href="../FoodDashboard/MenuMaster.aspx">
                                                <span>
                                                    <img src="../images/MENUS.png" alt="Menu Master"></span> MenuMaster
                                            </a>
                                        </li>
                                        <li>
                                            <a href="../FoodDashboard/Kitchen.aspx">
                                                <span>
                                                    <img src="../images/KITCHENS.png" alt="Kitchen"></span> Kitchen
                                            </a>
                                        </li>
                                    </ul>
                                </div>
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

                    <!-- Right Panel -->
                    <div class="screen-right-panel patient-diet-page">
                        <div class="user-pill-bar">
                            <div style="background: white; padding: 6px 16px 6px 18px; border-radius: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; gap: 12px;">
                                <div style="display: flex; flex-direction: column; align-items: flex-end;">
                                    <span style="font-weight: 700; color: #0f172a; font-size: 14px;" id="spndepNursname"></span>
                                    <span style="font-weight: 500; color: #6b7280; font-size: 11px;" id="spnUserTypeLabel"></span>
                                </div>
                                <div style="width: 1px; height: 30px; background: #e5e7eb;"></div>
                                <div class="notification-bell" id="notificationBell">
                                    <img src="../images/bell-icon.png" alt="Notifications" class="bell-icon" />
                                    <span class="notification-badge" id="notificationCount">0</span>
                                </div>
                                <a href="../login.aspx" title="Logout" style="display: flex; align-items: center; gap: 6px; padding: 4px 12px 4px 8px; border-radius: 20px; transition: all 0.2s; text-decoration: none; color: #dc2626; cursor: pointer; font-size: 13px; font-weight: 500;"
                                    onmouseover="this.style.background='#fee2e2'; this.style.color='#b91c1c';"
                                    onmouseout="this.style.background='transparent'; this.style.color='#dc2626';">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                        <polyline points="16 17 21 12 16 7"></polyline>
                                        <line x1="21" y1="12" x2="9" y2="12"></line>
                                    </svg>
                                    Logout
                                </a>
                            </div>
                        </div>


                        <div class="notification-wrapper">
                            <div class="notification-dropdown" id="notificationDropdown">
                                <div class="notification-header">
                                    <h6>Notifications</h6>
                                    <button class="mark-all-read" id="markAllRead">
                                        <img src="../images/check-double-icon.png" alt="Mark all as read" class="check-icon" />
                                        Mark all as read
                                    </button>
                                </div>
                                <div class="notification-list" id="notificationList">
                                    <div style="text-align: center; padding: 20px; color: #888;">Loading...</div>
                                </div>
                            </div>
                        </div>
                        <div class="diet-header">
                            <div class="diet-header-left">
                                <h1 style="margin: 0; display: inline-flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                                    <span>Patient Diet Assignment</span>
                                    <button type="button" id="watchTutorial"
                                        title="Diet Type Management Info"
                                        onmouseover="this.style.background='rgba(100,116,139,.18)';"
                                        onmouseout="this.style.background='rgba(100,116,139,.10)';"
                                        style="background: rgba(100,116,139,.10); border: 1px solid rgba(100,116,139,.18); border-radius: 20px; height: 30px; padding: 0 11px 0 8px; display: inline-flex; align-items: center; gap: 6px; color: #64748b; font-size: 12px; font-weight: 600; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; cursor: pointer; transition: .2s;">

                                        <svg viewBox="0 0 24 24"
                                            fill="none"
                                            style="width: 16px; height: 16px; flex-shrink: 0;">
                                            <circle cx="12" cy="12" r="9"
                                                stroke="currentColor"
                                                stroke-width="2.5" />
                                            <path d="M12 10.5V16"
                                                stroke="currentColor"
                                                stroke-width="2.5"
                                                stroke-linecap="round" />
                                            <circle cx="12" cy="7.5" r="1.4"
                                                fill="currentColor" />
                                        </svg>

                                        <span>Info</span>

                                    </button>
                                </h1>
                                <p style="margin: 4px 0 0 0;">
                                    View admitted patients and assign or update their active diet plan.
            <span id="patientCountText">0 of 0 patients</span>
                                </p>
                            </div>



                            <div class="diet-header-right">
                                <div class="excel-dropdown-wrapper">
                                    <button type="button"
                                        class="btn-import-excel"
                                        onclick="toggleExcelDropdown(event)">
                                        <svg viewBox="0 0 24 24" fill="none"
                                            style="width: 16px; height: 16px;">
                                            <path d="M12 3V15M12 15L7 10M12 15L17 10"
                                                stroke="currentColor" stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round" />
                                            <path d="M4 17V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V17"
                                                stroke="currentColor" stroke-width="2"
                                                stroke-linecap="round" />
                                        </svg>
                                        Import Excel
            <i class="fa fa-chevron-down"></i>
                                    </button>

                                    <input type="file" id="fileExcelImport"
                                        accept=".xlsx,.xls,.csv"
                                        style="display: none"
                                        onchange="handleExcelImport(event)" />

                                    <div class="excel-dropdown-menu" id="excelDropdownMenu">
                                        <a class="excel-dropdown-item"
                                            onclick="downloadImportTemplate()">
                                            <i class="fa fa-download"></i>
                                            Download Template
                                        </a>
                                        <a class="excel-dropdown-item"
                                            onclick="triggerExcelImport()">
                                            <i class="fa fa-upload"></i>
                                            Import Excel File
                                        </a>
                                    </div>
                                </div>

                                <button type="button" class="btn-admit"
                                    onclick="openAdmitPatientModal();">
                                    <span class="patient-plus-icon">
                                        <span class="icon-head"></span>
                                        <span class="icon-body"></span>
                                        <span class="icon-plus">+</span>
                                    </span>
                                    Admit New Patient
                                </button>
                            </div>

                        </div>
                        <br />
                        <div class="diet-filter-bar">
                            <div class="filter-search">
                                <span class="search-icon"></span>
                                <input type="text" id="txtSearchPatient" placeholder="Search by name or room..." />
                            </div>
                            <div class="filter-select">
                                <select id="ddlWardFilter">
                                    <option value="">All wards</option>
                                </select>
                            </div>
                            <div class="filter-field">
                                <input type="text" id="txtDoctorSearch" placeholder="Doctor..." />
                            </div>
                            <div class="filter-select">
                                <select id="ddlDietFilter">
                                    <option value="">All diet type...</option>
                                </select>
                            </div>
                            <button type="button" id="btnStatusFilter" class="btn-active" data-status="" onclick="ToggleStatusFilter();">
                                Active
                            </button>
                        </div>

                        <div class="diet-table-wrapper">
                            <table class="diet-table">
                                <thead>
                                    <tr>
                                        <th>Room</th>
                                        <th>Patient</th>
                                        <th>Ward</th>
                                        <th>Country</th>
                                        <th>Isolation</th>
                                        <th>Doctor</th>
                                        <th>Current Diet</th>
                                        <th>Allergies</th>
                                        <th>Notes</th>
                                        <th>Last Assigned</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody id="tblPatientDietBody">
                                </tbody>
                            </table>
                            <div id="emptyDietMessage" class="empty-diet-message">
                                No patient diet assignments found.
                            </div>
                        </div>
                        <div class="loaderElement" style="display: none">
                            <div class="loader-spinner"></div>
                        </div>
                    </div>
                    <!-- /Right Panel -->
                </div>
            </div>
        </div>

        <!-- MODAL -->
        <div class="modal fade" id="modalSuccess" tabindex="-1" aria-labelledby="reportsModalLabel" aria-hidden="true">
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
                                        <div class="mb-3 text-center">
                                            <span id="LBLRequestResult"></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="admitPatientModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
            <div class="modal-dialog modal-dialog-centered modal-xl">
                <div class="modal-content custom-admit-modal">
                    <div class="modal-header custom-modal-header">
                        <div class="modal-title-wrap">
                            <span class="patient-header-icon">
                                <span class="patient-head"></span>
                                <span class="patient-body"></span>
                                <span class="patient-plus">+</span>
                            </span>
                            <h2>Admit New Patient</h2>
                        </div>
                        <button type="button" class="custom-close-btn" data-bs-dismiss="modal">× </button>
                    </div>
                    <div class="modal-body custom-modal-body">
                        <div class="admit-grid">
                            <div class="name-country-row">
                                <div>
                                    <label for="txtPatientName">FULL NAME <span>*</span></label>
                                    <input type="text"
                                        id="txtPatientName"
                                        class="admit-input"
                                        placeholder="Enter full name" />
                                    <span class="validation-message" id="errPatientName"></span>
                                </div>
                                <div>
                                    <label for="ddlCountry">COUNTRY <span>*</span></label>
                                    <select id="ddlCountry" class="admit-select">
                                        <option value="">Loading countries...</option>
                                    </select>
                                    <span class="validation-message" id="errCountry"></span>
                                </div>
                            </div>
                            <div>
                                <label>DOCTOR <span>*</span> </label>
                                <input type="text" id="txtDoctor" placeholder="e.g. Dr. Mehta" />
                                <small class="validation-text" id="valDoctor">Doctor is required </small>
                            </div>
                            <div>
                                <label>WARD <span>*</span> </label>
                                <select id="ddlWard">
                                    <option value="">Select ward...</option>
                                </select>

                                <small class="validation-text" id="valWard">Ward is required </small>
                            </div>

                            <div>
                                <label>ROOM <span>*</span></label>
                                <input type="text" id="txtRoom" placeholder="e.g. 402" />
                                <small class="validation-text" id="valRoom">Room is required </small>
                            </div>
                            <div>
                                <label>BED</label>
                                <input type="text" id="txtBed" placeholder="A" />
                            </div>

                            <div>
                                <label>AGE</label>
                                <input type="text" id="txtAge"
                                    placeholder="e.g. 62" />
                            </div>
                            <div>
                                <label>GENDER</label>
                                <select id="ddlGender">
                                    <option value="">Select...</option>
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Other</option>
                                </select>
                            </div>

                            <div class="full-width">
                                <label>KNOWN ALLERGIES</label>
                                <div class="allergy-wrap" id="allergyPillsContainer">
                          
                                    <span class="allergy-pill" id="pillOthers" data-value="Others">Others</span>

                                    <div id="customAllergyWrapper" style="display: none; align-items: center; gap: 8px; margin-top: 15px; width: 100%;">
                                        <input type="text" id="txtCustomAllergy" class="admit-input" placeholder="Specify other allergy..." style="max-width: 300px;" />
                                        <button type="button" class="btn btn-sm btn-danger" onclick="AddCustomAllergyTag()" style="border-radius: 8px; padding: 8px 16px;">Add</button>
                                    </div>

                                    <div id="customAllergyTags" style="display: contents;"></div>
                                </div>
                            </div>

                            <div class="full-width">
                                <label>INITIAL DIET ASSIGNMENT</label>
                                <select id="ddlDietType">
                                    <option value="">Select diet type...</option>
                                </select>
                                <div class="urgent-diet-wrap" id="urgentDietWrap">
                                    <input type="checkbox" id="chkUrgentDiet" />
                                    <label for="chkUrgentDiet" class="urgent-label">
                                        <span style="color: orange">Urgent diet change — notify kitchen immediately</span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label>MEDICAL NOTES</label>
                                <textarea id="txtMedicalNotes" placeholder="e.g. Post-cardiac admit, low sodium strict"></textarea>
                            </div>
                            <div>
                                <label>DIETARY NOTES</label>
                                <textarea id="txtDietaryNotes" placeholder="e.g. Prefers South Indian cuisine"></textarea>
                            </div>

                            <div class="isolation-row full-width">
                                <div class="isolation-toggle-container">
                                    <label for="chkIsolation" class="isolation-label">
                                        Isolation
                                    </label>

                                    <label class="switch">
                                        <input type="checkbox" id="chkIsolation" />
                                        <span class="slider"></span>
                                    </label>
                                </div>
                                <div class="isolation-reason-container" id="isolationReasonWrap"
                                    style="display: none;">
                                    <label for="txtIsolationReason">Isolation Reason</label>
                                    <input type="text" id="txtIsolationReason" placeholder="Enter isolation reason..." />
                                </div>

                            </div>

                        </div>
                        <div class="modal-action-wrap">
                            <button type="button" class="btn-cancel" data-bs-dismiss="modal">Cancel </button>
                            <button type="button" class="btn-submit" onclick="submitPatient();">Admit Patient </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal fade" id="patientDetailsModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-slideout">
                <div class="modal-content patient-modal-content">
                    <input type="hidden" id="hdnPatientId" />
                    <div id="npoToast" class="npo-toast">
                        <i class="fa fa-check-circle"></i>
                        <span id="npoToastMessage"></span>
                    </div>
                    <div class="patient-modal-header">
                        <div class="patient-header-left">
                            <div class="patient-avatar">
                                <img src="../images/User.png" />
                            </div>
                            <div>
                                <div id="popupPatientName" class="popup-patient-name"></div>
                                <div class="popup-room-doctor">Room <span id="popupRoomNo"></span>· Under Dr.<span id="popupDoctor"></span> </div>
                                <div id="popupAllergyWrap"></div>
                            </div>
                        </div>
                        <button type="button" class="custom-close-btn" data-bs-dismiss="modal">×</button>
                    </div>
                    <div id="npoBanner" class="npo-banner" style="display: none;">
                        <div class="npo-alert-icon">
                            <i class="fas fa-exclamation-circle"></i>
                            <div class="npo-title">PATIENT ON NPO</div>
                        </div>
                        <div>
                            <div id="npoReasonText" class="npo-reason"></div>
                        </div>
                    </div>
                    <div class="patient-modal-body">
                        <div class="diet-tabs">
                            <button type="button" id="btnDietTab" class="diet-tab active">
                                <i class="fa fa-cutlery"></i>Diet & NPO
                            </button>
                            <button type="button" id="btnClinicalTab" class="diet-tab">
                                <i class="fa fa-heartbeat"></i>Clinical Activity
                            </button>
                        </div>
                        <div id="dietTabContent">
                            <div class="section-title-row">
                                <h5>CURRENT DIETS </h5>
                                <button type="button" class="btn-add-diet"><i class="fa fa-plus"></i>Add diet</button>
                            </div>
                            <div id="popupDietWrap"></div>
                            <div id="addDietPanel" class="add-diet-panel" style="display: none;">
                                <div class="add-diet-title">ADD DIET </div>
                                <div class="diet-form-group">
                                    <label>Diet type *</label>

                                    <input type="hidden" id="hdnPatientId" />

                                    <select id="ddlNewDietType" class="diet-form-select">
                                        <option value="">Pick a diet plan...</option>
                                    </select>

                                    <span id="errDietType" class="field-error"></span>
                                </div>
                                <div class="diet-form-group">
                                    <label>Notes (optional) </label>
                                    <textarea id="txtDietNotes" class="diet-form-textarea" placeholder="e.g. Per Dr. Rao, post-op soft diet for 3 days."></textarea>
                                </div>
                                <div class="diet-form-group">
                                    <label>Assigned by *</label>
                                    <input type="text" id="txtAssignedBy" class="diet-form-input" readonly />
                                    <span id="errAssignedBy" class="field-error"></span>
                                </div>
                                <div class="replace-row">
                                    <input type="checkbox" id="chkReplaceDiet" />
                                    <div>
                                        <div class="replace-title">
                                            Replace all current diets
                                        </div>
                                        <div class="replace-subtitle">
                                            Deactivate every other active diet first.
         Use this to reset the patient's plan.
                                        </div>
                                    </div>
                                </div>
                                <div class="diet-form-buttons">
                                    <button type="button" id="btnCancelDiet" class="btn-cancel-diet">Cancel </button>
                                    <button type="button" id="btnSaveDiet" class="btn-save-diet" onclick="SaveDiet()">
                                        <i class="fa fa-check-square-o"></i>Add diet
                                    </button>
                                </div>
                            </div>
                            <div class="route-text">
                                <i class="fa fa-map-o"></i>ROUTES TO:<span id="popupKitchenRoute"></span>
                            </div>
                            <div class="npo-header">
                                <h5 id="npoOrderTitle">NPO ORDERS (0 ACTIVE) </h5>
                                <button type="button" class="btn-order-npo"><i class="fa fa-circle-o"></i>Order NPO </button>
                            </div>
                            <div id="npoOrdersContainer">
                            </div>
                            <div id="npoOrderPanel" class="npo-order-panel" style="display: none;">
                                <div class="npo-panel-title">NEW NPO ORDER</div>
                                <div class="npo-form-group">
                                    <label>Reason *</label>
                                    <input type="text" id="txtNpoReason" class="npo-input" placeholder="e.g. Pre-op fasting, OT scheduled 06:00" />
                                </div>
                                <div class="npo-date-row">
                                    <div class="npo-form-group flex-1">
                                        <label>Start at</label>
                                        <input type="datetime-local" id="txtNpoStart" class="npo-input" />
                                        <div class="npo-helper-text">Defaults to now if blank.</div>
                                    </div>
                                    <div class="npo-form-group flex-1">
                                        <label>End at (optional) </label>
                                        <input type="datetime-local" id="txtNpoEnd" class="npo-input" />
                                        <div class="npo-helper-text">Open-ended NPO if left blank. </div>
                                    </div>
                                </div>
                                <div class="npo-form-group">
                                    <label>Notes (optional)</label>
                                    <textarea id="txtNpoNotes" class="npo-textarea"></textarea>
                                </div>
                                <div class="npo-warning-box">
                                    <i class="fa fa-shield"></i>
                                    Any in-flight meal orders overlapping the NPO window
                            will be auto-cancelled and pending deliveries
                            will be marked failed.
                                </div>
                                <div class="npo-button-row">
                                    <button type="button" id="btnCancelNpo" class="btn-cancel-npo">Cancel</button>
                                    <button type="button" id="btnSaveNpo" class="btn-save-npo" onclick="SaveNpoOrder()">
                                        <i class="fa fa-circle-o"></i>Order NPO</button>
                                </div>
                            </div>
                            <div id="npoBox" class="npo-box" style="display: none;">No active NPO. Patient may order meals normally. </div>
                            <div class="history-header" id="toggleDietHistory">
                                <h5><i class="fa fa-calendar-o"></i>Diet assignment history
                            <span id="historyCount" class="history-count">(0)</span>
                                </h5>
                                <i class="fa fa-angle-down history-arrow"></i>
                            </div>
                            <div id="popupDietHistory" style="display: none;"></div>
                        </div>
                        <div id="clinicalTabContent" style="display: none;">
                            <div class="clinical-title">LAST 20 CLINICAL EVENTS</div>
                            <div class="clinical-empty">
                                <i class="fa fa-heartbeat"></i>
                                <div>
                                    No clinical activity yet.
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- FASTING SECTION (Fixed Padding & Layout) -->
                    <div style="padding: 0 28px; margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 20px;">

                        <div class="fasting-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h5 style="margin: 0; font-size: 14px; font-weight: 700; color: #94a3b8; letter-spacing: 0.5px;">FASTING STATUS <span id="fastingStatusBadge" style="display: none; background: #ecfdf5; color: #059669; padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-left: 8px;">ACTIVE</span>
                            </h5>
                            <button type="button" class="btn-manage-fasting" id="btnToggleFasting" onclick="ToggleFastingPanel()" style="border: 1px solid #cbd5e1; background: white; color: #475569; border-radius: 12px; padding: 8px 16px; font-size: 14px; font-weight: 600;">
                                <i class="fa fa-clock-o"></i>Manage Fasting
                            </button>
                        </div>

                        <div id="fastingPanel" class="npo-order-panel" style="display: none; background: #f8fafc; border-color: #e2e8f0; margin-bottom: 20px;">

                            <div class="fasting-toggle-wrap" style="margin-bottom: 20px;">
                                <label for="chkManageFasting" class="fasting-label">IS FASTING</label>
                                <label class="switch">
                                    <input type="checkbox" id="chkManageFasting" onchange="toggleManageFastingDateTime()" />
                                    <span class="slider"></span>
                                </label>
                                <span class="fasting-status-text" id="lblManageFastingStatus">No</span>
                            </div>

                            <div id="manageFastingDateTimeWrap" class="fasting-datetime-wrap" style="display: none; border-left: none; padding-left: 0; flex-wrap: wrap; gap: 15px;">
                                <div class="fasting-input-group" style="flex: 1; min-width: 200px;">
                                    <label class="fasting-input-label">Start at</label>
                                    <input type="datetime-local" id="txtManageFastStart" class="fasting-datetime-input" />
                                </div>

                                <div class="fasting-input-group" style="flex: 1; min-width: 200px;">
                                    <label class="fasting-input-label">End at (optional)</label>
                                    <input type="datetime-local" id="txtManageFastEnd" class="fasting-datetime-input" />
                                </div>

                                <div class="fasting-input-group" style="flex: 0 0 100%; width: 100%;">
                                    <label class="fasting-input-label">Fasting Menu (Optional)</label>
                                    <div class="custom-multiselect" id="fastingMenuMultiselect">
                                        <div class="multiselect-trigger" onclick="toggleFastingMenuDropdown(event)">
                                            <span id="fastingMenuLabel" class="placeholder">Select fasting menus...</span>
                                            <span class="arrow">&#9660;</span>
                                        </div>
                                        <div class="multiselect-menu" id="fastingMenuMenu">
                                            <div class="multiselect-search-wrap">
                                                <input type="text" id="txtSearchFastingMenu" class="multiselect-search" placeholder="Search menu..." onkeyup="filterFastingMenuOptions()">
                                            </div>
                                            <div class="multiselect-options" id="fastingMenuOptions">
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            <div class="npo-button-row" style="margin-top: 20px;">
                                <button type="button" id="btnCancelFasting" class="btn-cancel-npo" onclick="ToggleFastingPanel()">Cancel</button>
                                <button type="button" class="btn-save-npo" style="background: #00a86b;" onclick="SaveManageFasting()">
                                    <i class="fa fa-check"></i>Save Fasting
                                </button>
                            </div>
                        </div>

                    </div>
                    <!-- END FASTING SECTION -->
                    <div class="patient-modal-footer">
                        <button type="button" class="btn-close-popup" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="liftNpoModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5><i class="fa fa-exclamation-circle text-danger"></i>Lift NPO Order</h5>
                        <button type="button" class="custom-close-btn" data-bs-dismiss="modal">×</button>
                    </div>
                    <div class="modal-body">
                        <label>Optional note explaining why the NPO is being lifted (leave blank to skip):</label>
                        <textarea id="txtLiftNpoNotes" class="form-control" rows="4"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-success" onclick="LiftNpoOrder()">OK</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="food-order-overlay" id="foodOrderOverlay">
            <div class="food-modal">

                <button type="button" class="food-modal-close" onclick="closeFoodOrder()">✕</button>

                <div class="food-header">
                    <div>
                        <h3>
                            <img src="../images/food-order.png" alt="Food Order">
                            Food Order
                        </h3>
                    </div>
                    <div class="prebook-section">
                        <span>PRE-BOOK</span>
                        <label class="switch">
                            <input type="checkbox" id="chkPreBook" onchange="onPreBookToggle()">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>

                <div class="preorder-chip" id="preorderChip" style="display: none;" onclick="toggleDatePicker(event)">
                    <img src="../images/calendar.png" alt="Calendar" style="cursor: pointer; width: 14px; height: 14px; filter: brightness(0) saturate(100%) invert(12%) sepia(92%) saturate(7180%) hue-rotate(268deg) brightness(88%) contrast(104%);">
                    <span id="lblOrderDate">Pre-order for Tomorrow</span>
                    <img src="../images/arrow-down.png" alt="Dropdown" id="calendarDropdownArrow" style="cursor: pointer; width: 14px; height: 14px; filter: brightness(0) saturate(100%) invert(12%) sepia(92%) saturate(7180%) hue-rotate(268deg) brightness(88%) contrast(104%);">
                    <div class="preorder-date-dropdown" id="preorderDateDropdown" onclick="event.stopPropagation();">
                        <div class="date-picker-header">
                            <button type="button" class="date-nav-btn" onclick="changeMonth(-1, event)">‹</button>
                            <span id="datePickerMonth"></span>
                            <button type="button" class="date-nav-btn" onclick="changeMonth(1, event)">›</button>
                        </div>
                        <div class="date-picker-grid" id="datePickerGrid"></div>
                    </div>
                </div>

                <div class="food-subtitle">Switch between meal tabs to plan each course. All 5 meals submit together.</div>

                <div class="diet-allergy-pills" id="dietAllergyPills">
                    <span class="diet-pill hidden" id="dietPill">Cardiac Diet</span>
                    <span class="allergy-pill hidden" id="allergyPill">Allergic to dairy</span>
                </div>

                <div class="food-form-row">
                    <div class="form-group">
                        <label>Room No</label>
                        <select class="form-control" id="ddlRoomNo" onchange="onRoomChange()">
                            <option value="">-- Select Room --</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Patient Name</label>
                        <input type="text" class="form-control" id="txtPatientName" placeholder="Enter Patient Name" oninput="onPatientNameChange()">
                    </div>
                </div>

                <div class="meal-tabs-wrapper" style="overflow: visible !important; position: relative;">
                    <div class="meal-tabs" id="mealTabs" style="overflow: visible !important; padding-bottom: 30px;"></div>
                </div>
                <div id="defaultSelectedWrapper">
                    <div class="default-selected-label" onclick="toggleDefaultSelected()">
                        <div class="label-left">
                            <div class="label-icon">
                                <img src="../images/default-food.png" alt="Food">
                            </div>
                            <div class="label-text-wrapper">
                                <span class="label-text">Today's selection</span>
                                <span class="label-badge">SELECTED</span>
                            </div>
                        </div>
                        <div class="label-right">
                            <span class="label-action">
                                <span class="action-text">View All</span>
                                <img src="../images/arrow-down.png" alt="Toggle" class="action-arrow" id="defaultSelectedArrow">
                            </span>
                        </div>
                    </div>

                    <div id="defaultSelectedSection">
                        <div id="defaultSelectedContent" class="default-selected-content">
                            <div id="defaultSelectedList" class="default-selected-list"></div>
                        </div>
                    </div>
                </div>
                <div class="recommended-container">
                    <div class="recommended-header" onclick="toggleRecommendedSection()">
                        <img src="../images/sparkles.png" alt="Sparkles" class="sparkle-icon">
                        <span class="header-title">Recommended for You</span>
                        <span class="count-badge">(0)</span>
                        <img src="../images/arrow-down.png" alt="Toggle" class="arrow-toggle">
                    </div>
                    <div class="recommended-grid hidden" id="recommendedGrid"></div>
                </div>

                <!-- Meal Section Header -->
                <div class="meal-section-header">
                    <h5 id="mealSectionTitle">Breakfast</h5>
                    <div class="search-box">
                        <img src="../images/search-icon.png" alt="Search">
                        <input type="text" id="searchFoodInput" placeholder="Search food items..." oninput="filterFoodItems()">
                    </div>
                    <span class="items-selected-badge" id="itemsSelectedBadge" style="display: none;"></span>
                </div>

                <!-- Food Grid -->
                <div class="food-grid" id="foodGrid"></div>

                <!-- Requestor & Instructions -->
                <div class="food-form-row">
                    <div class="form-group">
                        <label>Requestor Name</label>
                        <input type="text" class="form-control" id="txtRequestorName" placeholder="Enter Requestor Name">
                    </div>
                    <div class="form-group">
                        <label>Special Instructions</label>
                        <textarea rows="1" class="form-control" id="txtInstruction" placeholder="Less Salt, No Sugar, Extra Spoon..." style="resize: none"></textarea>
                    </div>
                </div>

                <!-- Footer -->
                <div class="food-footer">
                    <button type="button" class="btn-review" id="btnReview" disabled onclick="submitFoodOrder()">
                        <img src="../images/cart-icon.png" alt="Cart" style="filter: brightness(0) invert(1); width: 20px; height: 20px;">
                        <span id="reviewBtnLabel">Submit</span>
                        <img src="../images/arrow-right.png" alt="Arrow" style="filter: brightness(0) invert(1); width: 20px; height: 20px;">
                    </button>
                </div>

            </div>
        </div>


        <div class="cancel-modal-overlay" id="deleteModalOverlay"></div>
        <div class="cancel-modal" id="deleteModalnew">
            <div class="cancel-modal-content">
                <div class="cancel-modal-header">
                    <h3 id="deleteModalTitle">Remove Today's Selected Menu?</h3>
                </div>
                <div class="cancel-modal-body">
                    <p>Are you sure you want to remove "<span id="deleteUserName" class="user-name-highlight"></span>" from today's selected menu?</p>
                </div>
                <div class="cancel-modal-footer">
                    <button type="button" class="btn btn-secondary" id="btnKeepUser">Cancel</button>
                    <button type="button" class="btn btn-danger" id="btnYesDelete">Yes, remove menu</button>
                </div>
            </div>
        </div>

        <!-- Toast Notification -->
        <div class="dash-toast-notification" id="dashToastNotification">
            <i class="fas fa-check-circle"></i>
            <span id="dashToastMessage"></span>
        </div>

        <!-- JS CSS -->
        <script src="../js/bootstrap.bundle.min.js"></script>
        <script src="../js/jquery.sumoselect.min.js"></script>
        <script src="../js/style.js"></script>

    </form>
</body>
</html>
