<%@ Page Language="C#" AutoEventWireup="true" CodeFile="AllergyMaster.aspx.cs" Inherits="FoodDashboard_AllergyMaster" %>

<html lang="en">

<head>
    <title>Allergy Master | DIAL50</title>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- Favicon -->
    <link rel="icon" href="../favicon.png" />
    <!-- CSS -->
    <link rel="stylesheet" type="text/css" href="../css/bootstrap.min.css" />
    <link rel="stylesheet" type="text/css" href="../css/sumoselect.min.css">
    <link rel="stylesheet" type="text/css" href="../css/style.css" />
    <link rel="stylesheet" type="text/css" href="../css/AllergyMaster.css" />
    <link href="../css/changepwd.css" rel="stylesheet" />

    <script src="../js/jquery-3.6.4.min.js" type="text/javascript"></script>
    <script src="../js/aes.js" type="text/javascript"></script>
    <script src="../js/AllergyMaster.js" type="text/javascript"></script>
    <script src="../js/bulk.js" type="text/javascript"></script>
    <script src="../js/ChangePassword.js" type="text/javascript"></script>

    <telerik:RadCodeBlock ID="RadCodeBlock" runat="server">
        <script type="text/javascript">
            var dataSet = [],
                hurl = '<%=ConfigurationManager.AppSettings["HTTP"].ToString() %>' + '://' + '<%=ConfigurationManager.AppSettings["EPEServer"].ToString() %>' + ':' + '<%=ConfigurationManager.AppSettings["AppPort"].ToString() %>' + "/FoodDashboard/",
                urlPageValidation = '<%=ConfigurationManager.AppSettings["HTTP"].ToString() %>' + '://' + '<%=ConfigurationManager.AppSettings["EPEServer"].ToString() %>' + ':' + '<%=ConfigurationManager.AppSettings["AppPort"].ToString() %>' + "/MasterPage/Service/Service.aspx?",
                CryptoKey = '<%=ConfigurationManager.AppSettings["CryptoKey"].ToString() %>',
                CryptoPwd = '<%=ConfigurationManager.AppSettings["CryptoIV"].ToString() %>',
                ConProtocol = '<%=ConfigurationManager.AppSettings["HTTP"].ToString() %>';

            $(document).ready(function () {
                InitChangePassword();
                $("#txtSearchAllergy").val("");
                LoadAllergies();
                $(window).on("load", function () {
                    setTimeout(function () {
                        $("#txtSearchAllergy").val("");
                    }, 50);
                });
                $("#txtSearchAllergy").on("input", function () {
                    LoadAllergies();
                });

                $("#chkShowInactive").on("change", function () {
                    LoadAllergies();
                });

                var userName = sessionStorage.getItem('NAME') || '';
                var userRole = sessionStorage.getItem('ROLENAME') || '';
                $('#spndepNursname').text(userName);
                $('#spnUserTypeLabel').text(userRole);
                $('#spanUserName').text(userName);

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
    <form id="formAllergyMaster" runat="server">
        <telerik:RadScriptManager ID="RadScriptManager" runat="server"></telerik:RadScriptManager>

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

                                <div class="left-panel-menu">
                                    <ul>
                                        <li><a href="../Index/Index.aspx"><span>
                                            <img src="../images/home.png" alt="Home"></span> Home</a></li>
                                        <li><a href="#" onclick="redirectFloorwiseTrac()"><span>
                                            <img src="../images/world-map.png" alt="Map"></span> Map</a></li>
                                        <li><a href="../Track/TrackNew.aspx"><span>
                                            <img src="../images/doc.png" alt="Track"></span> Track</a></li>
                                        <li><a href="../Reports/Report.aspx"><span>
                                            <img src="../images/clipboard.png" alt="Reports"></span> Reports</a></li>
                                        <li><a href="../Planner/Planner.aspx"><span>
                                            <img src="../images/spiral-calendar.png" alt="Planner"></span> Planner</a></li>
                                        <li><a href="../Master/Category.aspx"><span>
                                            <img src="../images/category-master.png" alt="Task Types"></span> Task Types</a></li>
                                        <li><a href="../Master/Porter.aspx"><span>
                                            <img src="../images/porter-master.png" alt="Porter Master"></span> Porter Master</a></li>
                                        <li><a href="../Master/Users.aspx"><span>
                                            <img src="../images/porter-master.png" alt="User Master"></span> User Master</a></li>
                                        <li><a href="../Master/Equipment.aspx"><span>
                                            <img src="../images/Equipment.png" alt="Equipment Master"></span> Equipment Master</a></li>
                                        <li><a href="../Master/Locations.aspx"><span>
                                            <img src="../images/location.png" alt="Location Master"></span> Location Master</a></li>
                                        <li><a href="../Master/Department.aspx"><span>
                                            <img src="../images/location.png" alt="Department Master"></span> Department Master</a></li>
                                        <li><a href="../Master/PerformLogs.aspx"><span>
                                            <img src="../images/priority.png" alt="P3rform Logs"></span> P3rform Logs</a></li>
                                        <li><a onclick="javascript:Bulk();" href="#"><span>
                                            <img src="../images/upload-task.png" alt="Upload Tasks"></span> Upload Tasks</a></li>
                                        <li><a href="../Master/Group.aspx"><span>
                                            <img src="../images/group-master.png" alt="Group Master"></span> Group Master</a></li>
                                        <li><a href="../Master/Remarks.aspx"><span>
                                            <img src="../images/memo.png" alt="Remarks Master"></span> Remarks Master</a></li>
                                        <li><a href="../FoodDashboard/PatientDietAssignment.aspx"><span>
                                            <img src="../images/PATIENTS.png" alt="Patient"></span> Patient</a></li>
                                        <li><a href="../FoodDashboard/DietTypeManagement.aspx"><span>
                                            <img src="../images/DIETS.png" alt="Diet Types"></span> Diet Types</a></li>
                                        <li><a href="../FoodDashboard/MenuMaster.aspx"><span>
                                            <img src="../images/MENUS.png" alt="Menu Master"></span> MenuMaster</a></li>
                                        <li><a href="../FoodDashboard/Kitchen.aspx"><span>
                                            <img src="../images/KITCHENS.png" alt="Kitchen"></span> Kitchen</a></li>
                                        <li class="current-menu-item"><a href="../FoodDashboard/AllergyMaster.aspx"><span>
                                            <img src="../images/memo.png" alt="Allergy Master"></span> Allergy Master</a></li>
                                    </ul>
                                </div>
                            </div>

                            <br />
                            <br />
                            <br />

                            <div>
                                <div class="profile-link" onmouseover="HoverOpenSideBar()" onmouseout="OutOpenSideBar()">
                                    <div class="profile-img"></div>
                                    <div class="profile-designation">
                                        <h6>
                                            <span id="spanUserName"></span>
                                            <br />
                                            <br />
                                            <span style="text-decoration: underline; font-size: 12px;">Log out</span>
                                        </h6>
                                    </div>
                                    <a href="../login.aspx" class="stretched-link"></a>
                                    <img src="../images/User.png" class="ImgUser" onmouseover="HoverOpenSideBar()" alt="Profile" />
                                    <div class="DivPassword" id="DivPassword" style="display: none" align="left">
                                        <ul class='Pmenu'>
                                            <li><a onclick="ChangePassword();">Change Password</a></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right Panel -->
                    <div class="screen-right-panel">
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
                                    <button type="button" class="mark-all-read" id="markAllRead">
                                        <img src="../images/check-double-icon.png" alt="Mark all as read" class="check-icon" />
                                        Mark all as read
                                    </button>
                                </div>
                                <div class="notification-list" id="notificationList">
                                    <div style="text-align: center; padding: 20px; color: #888;">Loading...</div>
                                </div>
                            </div>
                        </div>

                        <div class="allergy-master-container">
                            <div class="am-header">
                                <div class="am-title-area">
                                    <div class="am-icon-box">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                            <line x1="12" y1="8" x2="12" y2="12"></line>
                                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                        </svg>
                                    </div>
                                    <div class="am-text-box">
                                        <h1>
                                            <span>Allergy Master</span>
                                            <span class="allergy-count-pill" id="lblAllergyCount">0 Items</span>
                                        </h1>
                                        <p>Manage food allergies used across patient profiles and menu items.</p>
                                    </div>
                                </div>

                                <button type="button" class="btn-add-emerald" id="btnAddAllergy">
                                    <span class="plus-icon">+</span>
                                    Add Allergy
                                </button>
                            </div>

                            <div class="am-filter-row">
                                <div class="am-search-area">
                                    <img src="../images/search-normal.png" class="search-icon" />
                                    <input type="text" id="txtSearchAllergy" autocomplete="off" placeholder="Search by allergy name or code...">
                                </div>
                                <div class="am-inactive-area">
                                    <label class="am-checkbox-label" for="chkShowInactive">
                                        <input type="checkbox" id="chkShowInactive">
                                        <span class="am-checkbox-box" aria-hidden="true"></span>
                                        <span class="am-checkbox-text">Show inactive</span>
                                    </label>
                                </div>
                            </div>

                            <div class="am-table-card">
                                <table class="am-table">
                                    <thead>
                                        <tr>
                                            <th style="width: 110px;">S.NO</th>
                                            <th>Allergy Name</th>
                                            <th style="width: 130px;">Status</th>
                                            <th style="width: 110px; text-align: right;">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="tblAllergyBody"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <!-- /Right Panel -->
                </div>
            </div>
        </div>

        <!-- Add / Edit Allergy Modal -->
        <div class="modal fade" id="allergyModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content allergy-modal">
                    <div class="allergy-header">
                        <div>
                            <h2 id="allergyModalHeader">Add New Allergy</h2>
                            <p>Allergy code is generated automatically</p>
                        </div>
                        <button type="button" class="close-modal" data-bs-dismiss="modal">&times;</button>
                    </div>

                    <div class="allergy-body">
                        <input type="hidden" id="hdnAllergyCode" value="" />

                        <div class="field-group">
                            <label>Allergy Name <span style="color: #dc2626;">*</span></label>
                            <input type="text" id="txtAllergyName" class="form-control" maxlength="150" placeholder="e.g. Milk & Dairy Allergy">
                            <span id="errAllergyName" class="validation-error"></span>
                        </div>

                        <label class="active-check">
                            <input type="checkbox" id="chkAllergyActive" checked>
                            <span>Active</span>
                        </label>
                    </div>

                    <div class="allergy-footer">
                        <button type="button" class="btn-cancel" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn-create" id="btnSaveAllergy" onclick="SubmitAllergy();">Create Allergy</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Success Modal -->
        <div class="modal fade" id="modalSuccess" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-md">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Success</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="modal-body">
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
                    </div>
                </div>
            </div>
        </div>

        <!-- Confirm Deactivate Modal -->
        <div class="modal fade" id="modalConfirmDelete" tabindex="-1" role="dialog">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Confirm Deactivate</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                            <img src="../images/close-white.svg">
                        </button>
                    </div>
                    <div class="modal-body">
                        Are you sure you want to deactivate <strong id="lblDeleteAllergyName"></strong>?
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="btnCancelDelete">Cancel</button>
                        <button type="button" class="btn btn-danger" id="btnConfirmDelete">Deactivate</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Change Password Modal -->
        <div class="modal fade" id="ModalChangepwd" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-fullscreen-md-down">
                <div class="modal-content">
                    <div class="modal-header">
                        <h6 class="modal-title"><span id="canReqIDpwd"></span>&nbsp;&nbsp;CHANGE PASSWORD</h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                            <img src="../images/close-white.svg" alt="Close">
                        </button>
                    </div>
                    <div class="modal-body">
                        <div id="Div2pwd" align="center">
                            <div id="CancelReasonContentpwd" class="Content">
                                <div id="DivCPContent" class="ContentCP" align="center">
                                    <table class="Custfont" style="min-width: 350px; min-height: 160px; font-size: 14px; font-weight: 500;" cellpadding="5" cellspacing="5">
                                        <tr>
                                            <td>Current Password</td>
                                            <td align="center">
                                                <asp:TextBox ID="TxtCurPassword" runat="server" Width="180px" class="txtpwd" ClientIDMode="Static" Style="border: 1px solid #ded6d6 !important; margin-bottom: 0px !important; padding-left: 5px" TextMode="Password"></asp:TextBox>
                                                <asp:Label ID="ErCurrent" runat="server" Text="*" ForeColor="Red" Font-Size="Medium" ClientIDMode="Static" CssClass="Custfont" Style="visibility: hidden"></asp:Label>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>New Password</td>
                                            <td align="center">
                                                <asp:TextBox ID="TxtPassword" runat="server" Width="180px" class="txtpwd" ClientIDMode="Static" Style="border: 1px solid #ded6d6 !important; margin-bottom: 0px !important; padding-left: 5px" TextMode="Password"></asp:TextBox>
                                                <asp:Label ID="ErPassword" runat="server" Text="*" ForeColor="Red" Font-Size="Medium" ClientIDMode="Static" CssClass="Custfont" Style="visibility: hidden"></asp:Label>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>Confirm Password</td>
                                            <td align="center">
                                                <asp:TextBox ID="TxtConfirmPassword" runat="server" Width="180px" class="txtpwd" ClientIDMode="Static" Style="border: 1px solid #ded6d6 !important; margin-bottom: 0px !important; padding-left: 5px" TextMode="Password"></asp:TextBox>
                                                <asp:Label ID="ErCPassword" runat="server" Text="*" ForeColor="Red" Font-Size="Medium" ClientIDMode="Static" CssClass="Custfont" Style="visibility: hidden"></asp:Label>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colspan="2">
                                                <div style="text-align: left; margin-top: 10px;">
                                                    <div id="message">
                                                        <h6>Password must contain the following:</h6>
                                                        <p id="letter" class="invalid">A lowercase letter</p>
                                                        <p id="capital" class="invalid">A capital (uppercase) letter</p>
                                                        <p id="splChar" class="invalid">A special character [!@#$%^&*()\-+.]</p>
                                                        <p id="number" class="invalid">A number</p>
                                                        <p id="length" class="invalid">Minimum 6 characters</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colspan="2" align="right">
                                                <div class="export-link" onclick="ValidatePassword()" style="display: inline-block; margin-right: 10px;">
                                                    <a href="#" class="btn btn-secondary">
                                                        <img src="../images/memo.png" alt="Change">
                                                        Change Password</a>
                                                </div>
                                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" style="background: #6c757d; border-color: #6c757d;">Cancel</button>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- JS -->
        <script src="../js/bootstrap.bundle.min.js"></script>
        <script src="../js/jquery.sumoselect.min.js"></script>
        <script src="../js/style.js"></script>
    </form>
</body>
</html>
