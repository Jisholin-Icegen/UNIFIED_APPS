<%@ Page Language="C#" AutoEventWireup="true" CodeFile="MenuMaster.aspx.cs" Inherits="FoodDashboard_MenuMaster" %>

<html lang="en">

<head>
    <title>MenuMaster | DIAL50</title>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- Favicon -->
    <link rel="icon" href="../favicon.png" />
    <!-- CSS -->
    <link rel="stylesheet" type="text/css" href="../css/bootstrap.min.css" />
    <link rel="stylesheet" type="text/css" href="../css/sumoselect.min.css">
    <link rel="stylesheet" type="text/css" href="../css/style.css" />
    <link rel="stylesheet" type="text/css" href="../css/MenuMaster.css">
    <link href="../css/changepwd.css" rel="stylesheet" />


    <script src="../js/jquery-3.6.4.min.js" type="text/javascript"></script>
    <script src="../js/xlsx.full.min.js"></script>
    <script src="../js/exceljs.min.js"></script>
    <script src="../js/MenuMaster.js" type="text/javascript"></script>
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
                LoadMenuTypes();
                $('#ddlCountryFilter').SumoSelect();
                LoadCountryDropdowns();
                $('#ddlDietType').SumoSelect();



                LoadDietTypeDropdown();
                LoadServingTimings();
                LoadCategories();


                initModalSelects();
                $('.menu-input').on('keypress', function (e) { if (e.which == 13) e.preventDefault(); });
                var userName = sessionStorage.getItem('NAME') || '';
                var userRole = GetUserRoleName();
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
        <asp:HiddenField ID="HFServingCode" runat="server" ClientIDMode="Static" />
        <asp:HiddenField ID="HFDWSearchQuery" runat="server" ClientIDMode="Static" />
        <asp:HiddenField ID="hdnDeleteMenuId" runat="server" ClientIDMode="Static" />
        
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
            
            /* modal styles live in ../css/MenuMaster.css */
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
                                        <li>
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
                                        <li class="current-menu-item">
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
                    <div class="screen-right-panel menu-master-page">
                        <div style="position: absolute; top: 12px; right: 30px; z-index: 1000;">
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
                        <div class="menu-master-header">
                            <div>
                                <h1 style="margin: 0; display: inline-flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                                    <span>Menu Master</span>
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
                                    Manage all menu items and the diets they're approved for.
            <span class="item-count" id="lblItemCount">0 Items</span>
                                </p>
                            </div>
                            <div class="excel-dropdown-wrapper" style="position: relative; display: inline-block;">
                                <button type="button" class="btn-import-excel" onclick="toggleExcelDropdown(event)">
                                    <svg viewBox="0 0 24 24" fill="none" style="width: 16px; height: 16px; margin-right: 4px;">
                                        <path d="M12 3V15M12 15L7 10M12 15L17 10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                                        <path d="M4 17V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V17" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
                                    </svg>
                                    Import Excel
        <svg viewBox="0 0 24 24" fill="none" style="width: 16px; height: 16px; margin-left: 4px;">
            <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
                                </button>
                                <input type="file" id="fileExcelImport" accept=".xlsx,.xls,.csv" style="display: none" onchange="handleExcelImport(event)" />
                                <div class="excel-dropdown-menu" id="excelDropdownMenu">
                                    <a class="excel-dropdown-item" onclick="downloadImportTemplate()">
                                        <svg viewBox="0 0 24 24" fill="none">
                                            <path d="M12 4V16M12 16L7 11M12 16L17 11" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                                            <path d="M4 19H20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
                                        </svg>
                                        Download Template
                                    </a>

                                    <a class="excel-dropdown-item" onclick="triggerExcelImport()">
                                        <svg viewBox="0 0 24 24" fill="none">
                                            <path d="M12 16V4M12 4L7 9M12 4L17 9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                                            <path d="M4 19H20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
                                        </svg>
                                        Import Excel File
                                    </a>
                                </div>
                            </div>
                            <button type="button" class="btn-add-menu" onclick="OpenNewMenuItem();">
                                <span class="plus-icon">+</span>
                                Add Menu Item
                            </button>
                        </div>
                        <div class="menu-master-content">
                            <div class="menu-filter-panel">
                                <div class="filter-section">
                                    <label>SEARCH</label>
                                    <div class="search-box">
                                        <img src="../images/search-normal.png" class="search-icon" />
                                        <input type="text" id="txtSearch" placeholder="Search by name..." />
                                    </div>
                                </div>
                                <div class="filter-section">
                                    <label>CATEGORY</label>
                                    <%-- <button type="button" class="category-btn" data-value="DEFAULT">⭐ Default Food</button>
                                    <button type="button" class="category-btn active" data-value="">All Categories</button>
                                    <button type="button" class="category-btn" data-value="Breakfast">🍛 Breakfast</button>
                                    <button type="button" class="category-btn" data-value="Lunch">🍜 Lunch</button>
                                    <button type="button" class="category-btn" data-value="Dinner">🍲 Dinner</button>
                                    <button type="button" class="category-btn" data-value="Beverages">🥤 Beverages</button>
                                    <button type="button" class="category-btn" data-value="Snacks">🍪 Snacks</button>--%>
                                    <div id="categoryList">
                                    </div>
                                </div>
                                <%-- <div class="filter-section">
                                    <label>MEAL TIMING</label>
                                    <div class="timing-buttons">
                                        <button type="button" class="timing-btn active" data-value="">All</button>
                                        <button type="button" class="timing-btn" data-value="Breakfast">Breakfast</button>
                                        <button type="button" class="timing-btn" data-value="Lunch">Lunch</button>
                                        <button type="button" class="timing-btn" data-value="Dinner">Dinner</button>
                                    </div>
                                </div>--%>
                                <div class="filter-section">
                                    <label>DIET TYPE</label>
                                    <select id="ddlDietType">
                                        <option value="">All Diet Types</option>
                                    </select>
                                </div>
                                <div class="filter-section">
                                    <label>COUNTRY</label>
                                    <select id="ddlCountryFilter" class="form-control">
                                        <option value="">All Countries</option>
                                    </select>
                                </div>
                                <button type="button" id="btnInactive" class="inactive-btn">Include Inactive Items </button>
                            </div>
                            <div class="menu-grid-panel">

                                <div class="table-responsive">

                                    <table class="menu-master-table">

                                        <thead>
                                            <tr>
                                                <th style="width: 90px;">Image</th>
                                                <th>Name</th>
                                                <th>Country</th>
                                                <th>Calories</th>
                                                <th>Diet Tags</th>
                                                <th>Allergens</th>
                                                <th>Default Food</th>
                                                <th>Status</th>
                                                <th style="width: 120px;">Actions</th>
                                            </tr>
                                        </thead>

                                        <tbody id="tblMenuMaster"></tbody>

                                    </table>

                                </div>

                            </div>

                        </div>

                    </div>

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

                    <!-- Menu item modal : single modal, two panels (left = big, right = compact) -->
                    <div class="modal fade" id="menuItemBasicModal" tabindex="-1" aria-hidden="true">
                        <input type="hidden" id="hdnMenuId" value="" />
                        <div class="modal-dialog menu-modal-dialog">
                            <div class="modal-content">
                                <div class="menu-split">

                                    <!-- ============ LEFT PANEL (big) ============ -->
                                    <div class="panel-left">
                                        <div class="menu-card">
                                            <div class="card-head">
                                                <div>
                                                    <h5 class="menu-modal-title" id="BasicModalHeader">New menu item</h5>
                                                    <p class="menu-modal-subtitle">Enter the menu item details, nutrition and status.</p>
                                                </div>
                                                <button type="button" class="menu-close-btn" data-bs-dismiss="modal">×</button>
                                            </div>
                                            <div class="card-body-scroll">
                                                <div class="row g-3">
                                                    <!-- column A -->
                                                    <div class="col-lg-6">
                                                        <div class="form-section">
                                                            <h6 class="section-title">Basic Information</h6>
                                                            <div class="row g-2">
                                                                <div class="col-8">
                                                                    <label>Name <span class="required">*</span></label>
                                                                    <input type="text" id="txtMenuName" class="form-control menu-input" placeholder="e.g. Avocado Toast" />
                                                                    <span id="errMenuName" class="validation-error">Name is required</span>
                                                                </div>
                                                                <div class="col-4">
                                                                    <label>Calories</label>
                                                                    <input type="number" id="txtCalories" class="form-control menu-input" placeholder="105" min="0" />
                                                                </div>
                                                                <div class="col-12">
                                                                    <label>Description</label>
                                                                    <textarea id="txtDescription" class="form-control menu-textarea" rows="2" placeholder="Short description shown to patients & kitchen..."></textarea>
                                                                </div>
                                                                <div class="col-6">
                                                                    <label>Country</label>
                                                                    <select id="ddlModalCountry" class="form-control"></select>
                                                                </div>
                                                                <div class="col-6">
                                                                    <label>Dietary Type</label>
                                                                    <select id="ddlDietaryType" class="form-control">
                                                                        <option value="">Select Type</option>
                                                                        <option value="VEG">Vegetarian</option>
                                                                        <option value="NONVEG">Non-Vegetarian</option>
                                                                        <option value="VEGAN">Vegan</option>
                                                                    </select>
                                                                </div>
                                                                <div class="col-4">
                                                                    <label>Price ($)</label>
                                                                    <input type="number" id="txtPrice" class="form-control menu-input" placeholder="1.00" step="0.01" min="0" />
                                                                </div>
                                                                <div class="col-4">
                                                                    <label>HIS ID</label>
                                                                    <input type="text" id="txtHISID" class="form-control menu-input" placeholder="HIS ID" />
                                                                </div>
                                                                <div class="col-4">
                                                                    <label>Vendor</label>
                                                                    <input type="text" id="txtVendor" class="form-control menu-input" placeholder="Vendor" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <!-- column B -->
                                                    <div class="col-lg-6">
                                                        <div class="form-section">
                                                            <h6 class="section-title">Nutritional Information</h6>
                                                            <div class="nutri-grid">
                                                                <div><label>Protein (g)</label><input type="number" id="txtProtein" class="form-control menu-input" placeholder="3.4" step="0.1" min="0" /></div>
                                                                <div><label>Carbs (g)</label><input type="number" id="txtCarbs" class="form-control menu-input" placeholder="19.8" step="0.1" min="0" /></div>
                                                                <div><label>Fat (g)</label><input type="number" id="txtTotalFat" class="form-control menu-input" placeholder="1.6" step="0.1" min="0" /></div>
                                                                <div><label>Sodium (mg)</label><input type="number" id="txtSodium" class="form-control menu-input" placeholder="135" step="1" min="0" /></div>
                                                                <div><label>Sugar (g)</label><input type="number" id="txtSugar" class="form-control menu-input" placeholder="0.4" step="0.1" min="0" /></div>
                                                            </div>
                                                            <label class="mt-2">Ingredients</label>
                                                            <textarea id="txtIngredients" class="form-control menu-textarea" rows="2" placeholder="e.g., low-fat milk, whole wheat bread, avocado..."></textarea>
                                                        </div>

                                                        <div class="form-section">
                                                            <h6 class="section-title">Image & Status</h6>
                                                            <label>Image URL (optional)</label>
                                                            <input type="text" id="txtImageUrl" class="form-control menu-input" placeholder="https://..." />
                                                            <div class="active-box mt-2">
                                                                <div>
                                                                    <div class="active-title">Active</div>
                                                                    <div class="active-desc">Inactive items are hidden from order screens.</div>
                                                                </div>
                                                                <label class="switch">
                                                                    <input type="checkbox" id="chkActive" checked />
                                                                    <span class="slider"></span>
                                                                </label>
                                                            </div>
                                                            <label class="checkbox-label mt-2">
                                                                <input type="checkbox" id="chkDefaultOrder" />
                                                                <span class="checkmark"></span>
                                                                Default Order Item
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- ============ RIGHT PANEL (compact) ============ -->
                                    <div class="panel-right">
                                        <div class="menu-card">
                                            <div class="card-body-scroll">
                                                <div class="form-section">
                                                    <h6 class="section-title">Classification</h6>
                                                    <div class="row g-2">
                                                        <div class="col-7">
                                                            <label>Category</label>
                                                            <input type="text" id="ddlCategory" class="form-control menu-input" placeholder="e.g. Main Course" />
                                                        </div>
                                                        <div class="col-5">
                                                            <label>Day</label>
                                                            <select id="ddlDay" class="form-control">
                                                                <option value="0">All Days</option>
                                                                <option value="1">Monday</option>
                                                                <option value="2">Tuesday</option>
                                                                <option value="3">Wednesday</option>
                                                                <option value="4">Thursday</option>
                                                                <option value="5">Friday</option>
                                                                <option value="6">Saturday</option>
                                                                <option value="7">Sunday</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <label class="mt-2">Available Serving Timings</label>
                                                    <div id="servingTimingList" class="serving-checkbox-list"></div>
                                                </div>

                                                <div class="form-section">
                                                    <h6 class="section-title">Allowed Diet Types <span class="required">*</span></h6>
                                                    <select id="ddlAllowedDietTypes" class="form-control" multiple></select>
                                                    <span id="errDietType" class="validation-error">Pick at least one diet</span>
                                                </div>

                                                <div class="form-section mb-0">
                                                    <div class="row g-2">
                                                        <div class="col-6">
                                                            <h6 class="section-title">Allergens</h6>
                                                            <select id="ddlAllergens" class="form-control" multiple>
                                                                <option value="dairy">Dairy</option>
                                                                <option value="gluten">Gluten</option>
                                                                <option value="nuts">Nuts</option>
                                                                <option value="peanuts">Peanuts</option>
                                                                <option value="soy">Soy</option>
                                                                <option value="eggs">Eggs</option>
                                                                <option value="fish">Fish</option>
                                                                <option value="shellfish">Shellfish</option>
                                                                <option value="sesame">Sesame</option>
                                                            </select>
                                                        </div>
                                                        <div class="col-6">
                                                            <h6 class="section-title">Food Tags</h6>
                                                            <select id="ddlFoodTags" class="form-control" multiple>
                                                                <option value="high-protein">High Protein</option>
                                                                <option value="low-carb">Low Carb</option>
                                                                <option value="low-fat">Low Fat</option>
                                                                <option value="high-fiber">High Fiber</option>
                                                                <option value="gluten-free">Gluten Free</option>
                                                                <option value="dairy-free">Dairy Free</option>
                                                                <option value="sugar-free">Sugar Free</option>
                                                                <option value="organic">Organic</option>
                                                                <option value="halal">Halal</option>
                                                                <option value="kosher">Kosher</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="menu-card menu-card-footer">
                                            <button type="button" class="btn-cancel" data-bs-dismiss="modal">✕&nbsp; Cancel</button>
                                            <button type="button" id="btnCreateMenu" class="btn-create" onclick="CreateMenuItem();">Save menu item</button>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="modal fade" id="deleteMenuModal" tabindex="-1">
                        <div class="modal-dialog modal-dialog-centered delete-modal-dialog">
                            <div class="modal-content delete-modal-content">

                                <div class="modal-body">

                                    <h3 class="delete-title">Deactivate this menu item?
                                    </h3>

                                    <p class="delete-message">
                                        <span id="lblDeleteMenuName"></span>
                                        will be hidden from order screens.
                    Historical orders that reference this item are not affected.
                                    </p>

                                    <div class="delete-footer">
                                        <button type="button" class="btn-delete-cancel" data-bs-dismiss="modal">Cancel </button>
                                        <button type="button" class="btn-delete-confirm" onclick="ConfirmDeleteMenu();">Deactivate</button>
                                    </div>

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
                                <h3 id="deleteModalTitle">Remove Today's Selected Menu</h3>
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