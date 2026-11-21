using ClientsideEncryption;
using iTextSharp.text;
using iTextSharp.text.pdf;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Web;
using System.Web.Script.Serialization;
using System.Web.Services.Description;
using System.Web.UI;
using System.Web.UI.HtmlControls;
using System.Web.UI.WebControls;
using Telerik.Web;
using Telerik.Web.UI;
using Telerik.Web.UI.com.hisoftware.api2;

public partial class Index_Service_Service : System.Web.UI.Page
{
    public static string process { get; set; }
    protected void Page_Load(object sender, EventArgs e)
    {
        if (IsValidProtocol())
            FromWebMobile();
        else
            WriteInvalid();
    }

    public bool IsValidProtocol()
    {
        string ProtocolAllowed = ConfigurationManager.AppSettings["HTTP"].ToString(), RequestProtocol = (HttpContext.Current.Request.IsSecureConnection) ? "https" : "http";


        return true;// (ProtocolAllowed == RequestProtocol);
    }
    public void WriteInvalid()
    {

        DataTable table = generate(); DataRow row = table.NewRow(); row["RESULT"] = "Request Protocal is InValid"; table.Rows.Add(row);
        DataSet DS = new DataSet(); DS.Tables.Add(table);

        ResponseWrite(DS);
    }

    public void ResponseWrite(DataSet data)
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer() { MaxJsonLength = int.MaxValue };
        List<Dictionary<string, object>> rows = new List<Dictionary<string, object>>();
        Dictionary<string, object> row;

        foreach (DataTable table in data.Tables)
        {
            if (table.Rows.Count > 0)
            {
                foreach (DataRow dr in table.Rows)
                {
                    row = new Dictionary<string, object>();
                    foreach (DataColumn col in table.Columns)
                    {
                        row.Add(col.ColumnName, dr[col]);
                    }
                    rows.Add(row);
                }
            }
        }
        Response.Write(serializer.Serialize(rows));
    }
    public void FromWebMobile()
    {
        DataSet data = new DataSet();
        process = ((!string.IsNullOrEmpty((Request.QueryString["Process"]))) ? AESEncrytDecry.DecryptStringAES(Request.QueryString["Process"].ToString()) : "");
        switch (process)
        {
            case "GETPATIENTDETAILSBYID":
                data = GetPatientDetailsById();
                break;
            case "INSERTUPDATEPATIENTDIETASSIGNMENT":
                data = INSERTUPDATEPATIENTDIETASSIGNMENT();
                break;
            case "GETPATIENTDIETASSIGNMENT":
                data = GetPatientDietAssignment();
                break;
            case "INSERTUPDATEDIETTYPE":
                data = InsertUpdateDietType();
                break;
            case "GETDIETTYPELIST":
                data = GetDietTypeList();
                break;
            case "GETDIETTYPEBYID":
                data = GetDietTypeById();
                break;
            case "INSERTUPDATEMENUITEM":
                data = InsertUpdateMenuItem();
                break;
            case "GETMENUTYPELIST":
                data = GetMenuTypeList();
                break;
            case "GETMENUTYPEBYID":
                data = GetMenuTypeById();
                break;
            case "GETDIETCATEGORYDROPDOWN":
                data = GetDietCategoriesDropDown();
                break;
            case "GETDIETTYPEDROPDOWN":
                data = GetDietTypeDropdown();
                break;
            case "GETSERVINGDROPDOWN":
                data = GetServingDropdown();
                break;
            case "GETWARDDROPDOWN":
                data = GetWardDropdown();
                break;
            case "INSERTUPDATEKITCHEN":
                data = InsertUpdateKitchen();
                break;
            case "GETKITCHENLIST":
                data = GetKitchenList();
                break;
            case "GETKITCHENBYID":
                data = GetKitchenById();
                break;
            case "GETMEALCUTOFFS":
                data = GetMealCutoffs();
                break;
            case "UPDATEMEALCUTOFFS":
                data = UpdateMealCutoffs();
                break;
            case "UPDATEKITCHENDIETMAPPING":
                data = UpdateKitchenDietMapping();
                break;
            case "GETKITCHENDIETMAPPING":
                data = GetKitchenDietMapping();
                break;
            case "ADDPATIENTDIET":
                data = AddPatientDiet();
                break;
            case "ADDNPORDER":
                data = AddNpoOrder();
                break;
            case "LIFTNPOORDER":
                data = LiftNpoOrder();
                break;
            case "REMOVEDIET":
                data = RemoveDiet();
                break;
            case "GETKITCHENORDERREPORT":
                data = GetKitchenOrderReport();
                break;
            case "GETMYSTATIONDATA":
                data = GetMyStationData();
                break;
            case "GETPATIENTFOODORDERFEEDBACKFORQUALITY":
                data = GetFeedbackforQuality();
                break;
            case "ACKNOWLEDGEQUALITYFEEDBACK":
                data = SubmitAcknowledgeForQualit();
                break;
            case "UPDATEFOODORDERSTATUS":
                data = UpdateFoodOrderStatus();
                break;
            case "UPDATEFOODORDERSTATUSFORALL":
                data = UpdateFoodOrderStatusForAll();
                break;
            case "ACKNOWLEDGEFEEDBACK":
                data = AcknowledgeFeedback();
                break;
            case "GETORDERSSUMMARY":
                data = GetOrdersSummary();
                break;

            case "GETORDERSLIST":
                data = GetOrdersList();
                break;

            case "GETORDERDETAIL":
                data = GetOrderDetail();
                break;

            case "UPDATEORDERSTATUS":
                data = UpdateOrderStatus();
                break;

            case "GENERATEAUTOORDERS":
                data = GenerateAutoOrders();
                break;

            case "GETMEALTIMINGS":
                data = GetMealTimings();
                break;

            case "GETWARDDROPDOWNLIST":
                data = GetWardDropdownList();
                break;

            case "GETKITCHENDROPDOWNLIST":
                data = GetKitchenDropdownList();
                break;

            case "GETNOTIFICATIONSLIST":
                data = GetNotificationsList();
                break;

            case "MARKNOTIFICATIONASREAD":
                data = MarkNotificationAsRead();
                break;

            case "MARKALLNOTIFICATIONSASREAD":
                data = MarkAllNotificationsAsRead();
                break;

            case "GETUNREADNOTIFICATIONCOUNTS":
                data = GetUnreadNotificationCounts();
                break;

            case "GETMEALCUTOFFSETTINGS":
                data = GetMealCutoffSettings();
                break;
            case "UPDATEMEALCUTOFFSETTINGS":
                data = UpdateMealCutoffSettings();
                break;
            case "UPDATEESTIMATEDTIME":
                data = UpdateEstimatedTime();
                break;

            case "GETDASHBOARDSUMMARY":
                data = GetDashboardSummary();
                break;

            case "GETDIETCATEGORYMIX":
                data = GetDietCategoryMix();
                break;

            case "GETORDERVOLUME":
                data = GetOrderVolume();
                break;

            case "GETTOPMENUITEMS":
                data = GetTopMenuItems();
                break;

            case "GETSLADATA":
                data = GetSLAData();
                break;

            case "GETPATIENTSATISFACTION":
                GetPatientSatisfaction();
                return;

            case "GETDEMANDFORECAST":
                data = GetDemandForecast();
                break;

            case "GETSTAFFPERFORMANCE":
                data = GetStaffPerformance();
                break;

            case "GETRECENTORDERS":
                data = GetRecentOrders();
                break;

            case "GETTRENDINGITEMS":
                data = GetTrendingItems();
                break;

            case "GETDOCKETSSUMMARY":
                data = GetDocketsSummary();
                break;

            case "GETDOCKETSLIST":
                data = GetDocketsList();
                break;

            case "PRINTDOCKET":
                data = PrintDocket();
                break;

            case "PRINTNEXTUNPRINTED":
                data = PrintNextUnprinted();
                break;

            case "GETDOCKETDETAIL":
                data = GetDocketDetail();
                break;

            case "GET":
                data = GetUsers();
                break;
            case "GETBYID":
                data = GetUserById();
                break;
            case "CREATE":
                data = CreateUser();
                break;
            case "UPDATE":
                data = UpdateUser();
                break;
            case "DELETE":
                data = DeleteUser();
                break;
            case "GETROLES":
                data = GetRoles();
                break;
            case "GETWARDS":
                data = GetWards();
                break;
            case "GETKITCHENS":
                data = GetKitchens();
                break;
            case "GETPATIENTSATISFACTIONSUMMARY":
                data = GetPatientSatisfactionSummary();
                break;

            case "GETPATIENTSATISFACTIONDISTRIBUTION":
                data = GetPatientSatisfactionDistribution();
                break;

            case "GETPATIENTSATISFACTIONMEAL":
                data = GetPatientSatisfactionMealRatings();
                break;

            case "GETPATIENTSATISFACTIONFEEDBACK":
                data = GetPatientSatisfactionFeedback();
                break;

            case "EXPORTPATIENTSATISFACTION":
                ExportPatientSatisfaction();
                return;

            case "GETDELIVERIES_ALL":
                data = GetDeliveries("ALL");
                break;

            case "GETDELIVERIES_READY":
                data = GetDeliveries("READY");
                break;

            case "GETDELIVERIES_INTRANSIT":
                data = GetDeliveries("INTRANSIT");
                break;

            case "GETDELIVERIES_DELIVERED":
                data = GetDeliveries("DELIVERED");
                break;
            case "GENERATEOTP":
                data = GenerateOTP();
                break;
            case "VERIFYOTP":
                data = VerifyOTP();
                break;
            case "DELIVEREDWITHOUTOTP":
                data = DeliveredWithoutOTP();
                break;
            case "RESENDOTP":
                data = ResendOTP();
                break;
            case "CHECKVERIFICATION":
                data = CheckOTPStatus();
                break;
            case "REPORTFAILURE":
                data = ReportDeliveryFailure();
                break;
            case "GETFAILURESTATUS":
                data = GetFailureStatus();
                break;
            case "GETFAILUREREMARKS":
                data = GetFailureRemarks();
                break;
            case "GETOTPVERIFICATIONLIST":
                data = GetOTPVerificationList();
                break;
            case "PICKUP":
                data = PickupOrder();
                break;
            case "GETPREORDERSHEETS":
                data = GetPreOrderSheets();
                break;
            case "PRINTPREORDERDOCKETS":
                data = PrintPreOrderDockets();
                break;
            case "GETPREORDERPRINTDATA":
                data = GetPreOrderPrintData();
                break;
            case "LOCKPREORDERSHEET":
                data = LockPreOrderSheet();
                break;
            case "UNLOCKPREORDERSHEET":
                data = UnlockPreOrderSheet();
                break;
            case "GETPATDETAILS":
                data = GetPatientDetails();
                break;
            case "GETMENU":
                data = GetMenuItems();
                break;
            case "REMOVETODAYORDER":
                data = RemoveTodayOrder();
                break;

            case "REMOVEDEFAULTFOOD":
                data = RemoveDefaultFood();
                break;

            case "REQUESTINSERT":
                data = InsertFoodOrder();
                break;
            case "GETSERVICETIMINGS":
                data = GetServiceTimings();
                break;
            case "GETRECOMMENDEDFOODS":
                data = GetRecommendedFoods();
                break;
            case "GETAUDITLOGS":
                data = GetAuditLogs();
                break;

            case "GETAUDITACTIONS":
                data = GetAuditActions();
                break;
            case "UPDATEFOODORDERSTATUSFORASSEMBLY":
                data = UpdateFoodOrderStatusForAssembly();
                break;
            case "GETINCOMINGORDERS":
                data = GetIncomingOrders();
                break;
            case "GETASSEMBLYQUEUE":
                data = GetAssemblyQueue();
                break;
            case "SENDTODELIVERY":
                data = SendToDelivery();
                break;
            case "GETDISCHARGEDASHBOARD":
                data = GetDischargeDashboard();
                break;
            case "INSERTUPDATESERVING":
                data = InsertUpdateServing();
                break;
            case "GETSERVINGDATA":
                data = GetServingData();
                break;
            case "GETSERVINGBYID":
                data = GetServingById();
                break;
            case "GETMEALTYPES":
                data = GetActiveMealTypes();
                break;
            case "GETOPENFLAGCOUNT":
                data = GetOpenFlagCount();
                break;
            case "GETPATIENTFLAGS":
                data = GetPatientFlags();
                break;
            case "UPDATEFLAGSTATUS":
                data = UpdateFlagStatus();
                break;
            case "UPDATEDEFAULTFOOD":
                data = UpdateDefaultFood();
                break;
            case "GETSERVINGLIST":
                data = GetservingList();
                break;
            case "CHECKSERVINGCODE":
                data = GetservingCode();
                break;
            case "GETSERVINGS":
                data = GetServings();
                break;
            case "GETDEFAULTPREORDER":
                data = GetDefaultPreOrder();
                break;
            case "SAVEDIETITIANSESSION":
                data = SaveDietitianSession();
                break;

            case "GETDIETITIANSESSIONS":
                data = GetDietitianSessions();
                break;

            case "DELETEDIETITIANSESSION":
                data = DeleteDietitianSession();
                break;

            case "SAVEDIETITIANORDER":
                data = SaveDietitianOrder();
                break;

            case "GETDIETITIANORDERS":
                data = GetDietitianOrders();
                break;

            case "DELETEDIETITIANORDER":
                data = DeleteDietitianOrder();
                break;

            case "GETWARDROOMS":
                data = GetWardRooms();
                break;
            case "GETWARDROOMSFORBULK":
                data = GetWardRoomsForBulk();
                break;

            case "GETMENUMASTERITEMS":
                data = GetMenuMasterItems();
                break;

            case "GETMEALTIMINGSS":
                data = GetMealTimingss();
                break;

            case "GETFOODORDERINGFLAG":
                data = GetFoodOrderingFlag();
                break;

            case "BULKINSERTORDERS_EXCEL":
                data = BulkInsertOrdersExcel();
                break;

            case "GETCOUNTRIES":
                data = GetCountries();
                break;

            case "GETDIETREPORT":
                data = GetDietReport();
                break;
            case "GETBULKMENUITEMS":
                data = GetBulkMenuItems();
                break;
            case "SAVEBULKORDER":
                data = SaveBulkOrder();
                break;
            case "GETFASTINGMENUITEMS":
                data = GetFastingMenuItems();
                break;

            case "NOTIFYDELAY":
                data = NotifyDelay();
                break;

            case "GETALTERNATEMENU":
                data = GetAlternateMenu();
                break;

            case "APPLYALTERNATEMENU":
                data = ApplyAlternateMenu();
                break;

            case "DENYFOOD":
                data = DenyFoodItem();
                break;
            case "GETORDERS_LO":
                data = LO_GetOrders();
                break;

            case "GETDEFAULTPREORDER_LO":
                data = LO_GetDefaultPreOrder();
                break;

            case "SAVEORDER_LO":
                data = LO_SaveOrder();
                break;

            case "DELETEORDER_LO":
                data = LO_DeleteOrder();
                break;

            case "REMOVEDEFAULTFOOD_LO":
                data = LO_RemoveDefaultFood();
                break;

            case "DENYFOOD_LO":
                data = LO_DenyFood();
                break;

            case "GETWARDROOMS_LO":
                data = LO_GetWardRooms();
                break;

            case "GETSERVINGS_LO":
                data = LO_GetServings();
                break;

            case "GETMEALTIMINGS_LO":
                data = LO_GetMealTimings();
                break;

            case "GETMENUMASTERITEMS_LO":
                data = LO_GetMenuMasterItems();
                break;
        }
        //data = getRecords();
        ResponseWrite(data);
    }

    private DataSet GetPatientDetailsById()
    {
        DataSet ds = new DataSet();
        string Id = string.IsNullOrEmpty(Request.QueryString["ID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ID"]);
        DataTable dt = DataAccess.GetPatientDetailsById(Id);
        ds.Tables.Add(dt);

        return ds;
    }
    private DataSet AddPatientDiet()
    {
        DataSet ds = new DataSet();
        string PatientId = AESEncrytDecry.DecryptStringAES(Request.QueryString["PATIENTID"]);
        string DietType = AESEncrytDecry.DecryptStringAES(Request.QueryString["DIETTYPE"]);
        string DietaryNotes = AESEncrytDecry.DecryptStringAES(Request.QueryString["DIETARYNOTES"]);
        string ReplaceAll = AESEncrytDecry.DecryptStringAES(Request.QueryString["REPLACEALL"]);
        DataTable dt = DataAccess.AddPatientDiet(PatientId, DietType, DietaryNotes, ReplaceAll);
        ds.Tables.Add(dt);
        return ds;
    }
    private DataSet AddNpoOrder()
    {
        DataSet ds = new DataSet();
        string PatientId = AESEncrytDecry.DecryptStringAES(Request.QueryString["PATIENTID"]);
        string Reason = AESEncrytDecry.DecryptStringAES(Request.QueryString["REASON"]);
        string StartDate = AESEncrytDecry.DecryptStringAES(Request.QueryString["STARTDATE"]);
        string EndDate = AESEncrytDecry.DecryptStringAES(Request.QueryString["ENDDATE"]);
        string Notes = AESEncrytDecry.DecryptStringAES(Request.QueryString["NOTES"]);
        DataTable dt = DataAccess.AddNpoOrder(PatientId, Reason, StartDate, EndDate, Notes);
        ds.Tables.Add(dt);
        return ds;
    }
    private DataSet LiftNpoOrder()
    {
        DataSet ds = new DataSet();
        string PatientId = AESEncrytDecry.DecryptStringAES(Request.QueryString["PATIENTID"]);
        string Notes = AESEncrytDecry.DecryptStringAES(Request.QueryString["NOTES"]);
        DataTable dt = DataAccess.LiftNpoOrder(PatientId, Notes);
        ds.Tables.Add(dt);
        return ds;
    }
    private DataSet RemoveDiet()
    {
        DataSet ds = new DataSet();
        string PatientId = AESEncrytDecry.DecryptStringAES(Request.QueryString["PATIENTID"]);
        string diettype = AESEncrytDecry.DecryptStringAES(Request.QueryString["DIETTYPE"]);
        DataTable dt = DataAccess.RemoveDiet(PatientId, diettype);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetKitchenOrderReport()
    {
        DataSet ds = new DataSet();
        string planDate = string.IsNullOrEmpty(Request.QueryString["PLANDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["PLANDATE"]);
        string dietType = string.IsNullOrEmpty(Request.QueryString["DIETTYPE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["DIETTYPE"]);
        string servingType = string.IsNullOrEmpty(Request.QueryString["SERVINGTYPE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["SERVINGTYPE"]);

        DataTable dt = DataAccess.GetKitchenOrderReport(planDate, dietType, servingType);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetMyStationData()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetMyStationOrders();
        ds.Tables.Add(dt);
        return ds;
    }
    private DataSet GetFeedbackforQuality()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetFeedbackforQuality();
        ds.Tables.Add(dt);
        return ds;
    }
    private DataSet SubmitAcknowledgeForQualit()
    {
        DataSet ds = new DataSet();
        string orderId = string.IsNullOrEmpty(Request.QueryString["ORDERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ORDERID"]);
        string remark = string.IsNullOrEmpty(Request.QueryString["REMARK"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["REMARK"]);
        string user = string.IsNullOrEmpty(Request.QueryString["USER"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["USER"]);
        DataTable dt = DataAccess.AcknowledgeQualityFeedback(orderId, remark, user);
        ds.Tables.Add(dt);

        return ds;
    }
    private DataSet UpdateFoodOrderStatus()
    {
        DataSet ds = new DataSet();
        string id = AESEncrytDecry.DecryptStringAES(Request.QueryString["ID"]);
        string status = AESEncrytDecry.DecryptStringAES(Request.QueryString["STATUS"]);

        DataTable dt = DataAccess.UpdateFoodOrderStatus(id, status);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet UpdateFoodOrderStatusForAll()
    {
        DataSet ds = new DataSet();
        string orderid = AESEncrytDecry.DecryptStringAES(Request.QueryString["ORDERID"]);
        string status = AESEncrytDecry.DecryptStringAES(Request.QueryString["STATUS"]);

        DataTable dt = DataAccess.UpdateFoodOrderStatusForAll(orderid, status);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet AcknowledgeFeedback()
    {
        DataSet ds = new DataSet();
        string orderId = AESEncrytDecry.DecryptStringAES(Request.QueryString["ORDERID"]);
        string remark = AESEncrytDecry.DecryptStringAES(Request.QueryString["REMARK"]);
        string user = AESEncrytDecry.DecryptStringAES(Request.QueryString["USER"]);
        DataTable dt = DataAccess.AcknowledgeFeedback(orderId, remark, user);
        ds.Tables.Add(dt);
        return ds;
    }
    private string GetPath(object ImageByte)
    {
        byte[] rPicture = (byte[])ImageByte;
        string base64String = Convert.ToBase64String(rPicture, 0, rPicture.Length);
        string path = "data:image/png;base64," + base64String;
        return path;
    }

    private DataSet GetOrdersSummary()
    {
        DataSet ds = new DataSet();
        string OrderDate = string.IsNullOrEmpty(Request["ORDERDATE"]) ? DateTime.Now.ToString("yyyy-MM-dd") : AESEncrytDecry.DecryptStringAES(Request["ORDERDATE"]);
        DataTable dt = DataAccess.GetOrdersSummary(OrderDate);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetOrdersList()
    {
        DataSet ds = new DataSet();
        string OrderDate = string.IsNullOrEmpty(Request["ORDERDATE"]) ? DateTime.Now.ToString("yyyy-MM-dd") : AESEncrytDecry.DecryptStringAES(Request["ORDERDATE"]);
        string SearchText = string.IsNullOrEmpty(Request["SEARCHTEXT"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["SEARCHTEXT"]);
        string MealType = string.IsNullOrEmpty(Request["MEALTYPE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["MEALTYPE"]);
        string Ward = string.IsNullOrEmpty(Request["WARD"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["WARD"]);
        string Kitchen = string.IsNullOrEmpty(Request["KITCHEN"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["KITCHEN"]);
        string StatusFilter = string.IsNullOrEmpty(Request["STATUSFILTER"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["STATUSFILTER"]);
        DataTable dt = DataAccess.GetOrdersList(OrderDate, SearchText, MealType, Ward, Kitchen, StatusFilter);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetOrderDetail()
    {
        DataSet ds = new DataSet();
        string OrderID = string.IsNullOrEmpty(Request["ORDERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ORDERID"]);
        DataTable dt = DataAccess.GetOrderDetail(OrderID);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet UpdateOrderStatus()
    {
        DataSet ds = new DataSet();
        string OrderID = string.IsNullOrEmpty(Request["ORDERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ORDERID"]);
        string NewStatus = string.IsNullOrEmpty(Request["NEWSTATUS"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["NEWSTATUS"]);
        string UpdatedBy = string.IsNullOrEmpty(Request["UPDATEDBY"]) ? "System" : AESEncrytDecry.DecryptStringAES(Request["UPDATEDBY"]);
        DataTable dt = DataAccess.UpdateOrderStatus(OrderID, NewStatus, UpdatedBy);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GenerateAutoOrders()
    {
        string GenMealType = string.IsNullOrEmpty(Request["GENMEALTYPE"]) ? "Lunch" : AESEncrytDecry.DecryptStringAES(Request["GENMEALTYPE"]);
        string OrderDate = string.IsNullOrEmpty(Request["ORDERDATE"]) ? DateTime.Now.ToString("yyyy-MM-dd") : AESEncrytDecry.DecryptStringAES(Request["ORDERDATE"]);
        string UpdatedBy = string.IsNullOrEmpty(Request["UPDATEDBY"]) ? "System" : AESEncrytDecry.DecryptStringAES(Request["UPDATEDBY"]);
        string Confirm = string.IsNullOrEmpty(Request["CONFIRM"]) ? "false" : AESEncrytDecry.DecryptStringAES(Request["CONFIRM"]);

        return DataAccess.GenerateAutoOrders(GenMealType, OrderDate, UpdatedBy, Confirm);
    }

    private DataSet GetMealTimings()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetMealTimings();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetWardDropdownList()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetWardDropdownList();
        ds.Tables.Add(dt);
        return ds;
    }



    private DataSet GetKitchenDropdownList()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetKitchenDropdownList();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetNotificationsList()
    {
        DataSet ds = new DataSet();
        string MaxCount = string.IsNullOrEmpty(Request["MAXCOUNT"]) ? "20" : AESEncrytDecry.DecryptStringAES(Request["MAXCOUNT"]);
        string UserID = string.IsNullOrEmpty(Request["USERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["USERID"]);
        string RoleID = string.IsNullOrEmpty(Request["ROLEID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ROLEID"]);
        string DepartmentID = string.IsNullOrEmpty(Request["DEPARTMENTID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["DEPARTMENTID"]);
        DataTable dt = DataAccess.GetNotificationsList(MaxCount, UserID, RoleID, DepartmentID);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet MarkNotificationAsRead()
    {
        DataSet ds = new DataSet();
        string NotificationID = string.IsNullOrEmpty(Request["NOTIFICATIONID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["NOTIFICATIONID"]);
        string RoleID = string.IsNullOrEmpty(Request["ROLEID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ROLEID"]);
        string DepartmentID = string.IsNullOrEmpty(Request["DEPARTMENTID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["DEPARTMENTID"]);
        DataTable dt = DataAccess.MarkNotificationAsRead(NotificationID, RoleID, DepartmentID);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet MarkAllNotificationsAsRead()
    {
        DataSet ds = new DataSet();
        string UserID = string.IsNullOrEmpty(Request["USERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["USERID"]);
        string RoleID = string.IsNullOrEmpty(Request["ROLEID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ROLEID"]);
        string DepartmentID = string.IsNullOrEmpty(Request["DEPARTMENTID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["DEPARTMENTID"]);
        DataTable dt = DataAccess.MarkAllNotificationsAsRead(UserID, RoleID, DepartmentID);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetUnreadNotificationCounts()
    {
        DataSet ds = new DataSet();
        string UserID = string.IsNullOrEmpty(Request["USERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["USERID"]);
        string RoleID = string.IsNullOrEmpty(Request["ROLEID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ROLEID"]);
        string DepartmentID = string.IsNullOrEmpty(Request["DEPARTMENTID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["DEPARTMENTID"]);
        DataTable dt = DataAccess.GetUnreadNotificationCounts(UserID, RoleID, DepartmentID);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet UpdateEstimatedTime()
    {
        DataSet ds = new DataSet();
        string OrderID = string.IsNullOrEmpty(Request["ORDERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ORDERID"]);
        string EstimatedTime = string.IsNullOrEmpty(Request["ESTIMATEDTIME"]) ? "15" : AESEncrytDecry.DecryptStringAES(Request["ESTIMATEDTIME"]);

        if (!string.IsNullOrEmpty(OrderID))
        {
            DataTable dt = DataAccess.UpdateEstimatedTime(OrderID, EstimatedTime);
            ds.Tables.Add(dt);
        }
        return ds;
    }

    private DataSet GetDashboardSummary()
    {
        DataSet ds = new DataSet();
        string StartDate = string.IsNullOrEmpty(Request["STARTDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["STARTDATE"]);
        string EndDate = string.IsNullOrEmpty(Request["ENDDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ENDDATE"]);

        DataTable dt = DataAccess.GetDashboardSummary(StartDate, EndDate);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetDietCategoryMix()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetDietCategoryMix();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetOrderVolume()
    {
        DataSet ds = new DataSet();
        string StartDate = string.IsNullOrEmpty(Request["STARTDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["STARTDATE"]);
        string EndDate = string.IsNullOrEmpty(Request["ENDDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ENDDATE"]);

        DataTable dt = DataAccess.GetOrderVolume(StartDate, EndDate);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetTopMenuItems()
    {
        DataSet ds = new DataSet();
        string StartDate = string.IsNullOrEmpty(Request["STARTDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["STARTDATE"]);
        string EndDate = string.IsNullOrEmpty(Request["ENDDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ENDDATE"]);
        int TopN = string.IsNullOrEmpty(Request["TOPN"]) ? 10 : Convert.ToInt32(AESEncrytDecry.DecryptStringAES(Request["TOPN"]));

        DataTable dt = DataAccess.GetTopMenuItems(StartDate, EndDate, TopN);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetSLAData()
    {
        DataSet ds = new DataSet();
        string StartDate = string.IsNullOrEmpty(Request["STARTDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["STARTDATE"]);
        string EndDate = string.IsNullOrEmpty(Request["ENDDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ENDDATE"]);

        DataTable dt = DataAccess.GetSLAData(StartDate, EndDate);
        ds.Tables.Add(dt);
        return ds;
    }

    private void GetPatientSatisfaction()
    {
        string StartDate = string.IsNullOrEmpty(Request["STARTDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["STARTDATE"]);
        string EndDate = string.IsNullOrEmpty(Request["ENDDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ENDDATE"]);

        DataSet ds = DataAccess.GetPatientSatisfaction(StartDate, EndDate);

        var summary = new
        {
            SatisfiedPercent = ds.Tables[0].Rows.Count > 0 && ds.Tables[0].Columns.Contains("SatisfiedPercent")
                ? Convert.ToDecimal(ds.Tables[0].Rows[0]["SatisfiedPercent"])
                : 0,
            TotalRatings = ds.Tables[0].Rows.Count > 0 && ds.Tables[0].Columns.Contains("TotalRatings")
                ? Convert.ToInt32(ds.Tables[0].Rows[0]["TotalRatings"])
                : 0,
            TotalDelivered = ds.Tables[0].Rows.Count > 0 && ds.Tables[0].Columns.Contains("TotalDelivered")
                ? Convert.ToInt32(ds.Tables[0].Rows[0]["TotalDelivered"])
                : 0,
            ResponseRate = ds.Tables[0].Rows.Count > 0 && ds.Tables[0].Columns.Contains("ResponseRate")
                ? Convert.ToDecimal(ds.Tables[0].Rows[0]["ResponseRate"])
                : 0,
            SatisfiedCount = ds.Tables[0].Rows.Count > 0 && ds.Tables[0].Columns.Contains("SatisfiedCount")
                ? Convert.ToInt32(ds.Tables[0].Rows[0]["SatisfiedCount"])
                : 0,
            UnsatisfiedCount = ds.Tables[0].Rows.Count > 0 && ds.Tables[0].Columns.Contains("UnsatisfiedCount")
                ? Convert.ToInt32(ds.Tables[0].Rows[0]["UnsatisfiedCount"])
                : 0,
            NeutralCount = ds.Tables[0].Rows.Count > 0 && ds.Tables[0].Columns.Contains("NeutralCount")
                ? Convert.ToInt32(ds.Tables[0].Rows[0]["NeutralCount"])
                : 0
        };

        var summaryTable = new List<object>();
        summaryTable.Add(summary);

        decimal change = 0;
        if (ds.Tables.Count > 1 && ds.Tables[1].Rows.Count > 0 && ds.Tables[1].Columns.Contains("CHANGE"))
        {
            change = Convert.ToDecimal(ds.Tables[1].Rows[0]["CHANGE"]);
        }
        var changeTable = new List<object>();
        changeTable.Add(new { CHANGE = change });

        var chartData = new List<object>();
        if (ds.Tables.Count > 2)
        {
            foreach (DataRow row in ds.Tables[2].Rows)
            {
                if (!string.IsNullOrEmpty(row["DATE"].ToString()))
                {
                    chartData.Add(new
                    {
                        Date = row["DATE"].ToString(),
                        SatisfiedPercent = Convert.ToDecimal(row["SatisfiedPercent"]),
                        NeutralPercent = ds.Tables[2].Columns.Contains("NeutralPercent") ? Convert.ToDecimal(row["NeutralPercent"]) : 0,
                        UnsatisfiedPercent = ds.Tables[2].Columns.Contains("UnsatisfiedPercent") ? Convert.ToDecimal(row["UnsatisfiedPercent"]) : 0
                    });
                }
            }
        }

        var compliments = new List<object>();
        if (ds.Tables.Count > 3)
        {
            foreach (DataRow row in ds.Tables[3].Rows)
            {
                if (!string.IsNullOrEmpty(row["NAME"].ToString()))
                {
                    compliments.Add(new
                    {
                        Name = row["NAME"].ToString(),
                        Count = Convert.ToInt32(row["COUNT"])
                    });
                }
            }
        }

        var complaints = new List<object>();
        if (ds.Tables.Count > 4)
        {
            foreach (DataRow row in ds.Tables[4].Rows)
            {
                if (!string.IsNullOrEmpty(row["NAME"].ToString()))
                {
                    complaints.Add(new
                    {
                        Name = row["NAME"].ToString(),
                        Count = Convert.ToInt32(row["COUNT"])
                    });
                }
            }
        }

        var sentimentDistribution = new List<object>();
        if (ds.Tables.Count > 5)
        {
            foreach (DataRow row in ds.Tables[5].Rows)
            {
                if (!string.IsNullOrEmpty(row["Sentiment"].ToString()))
                {
                    sentimentDistribution.Add(new
                    {
                        Sentiment = row["Sentiment"].ToString(),
                        Count = Convert.ToInt32(row["Count"]),
                        Percentage = Convert.ToInt32(row["Percentage"])
                    });
                }
            }
        }

        var mealRatings = new List<object>();
        if (ds.Tables.Count > 6)
        {
            foreach (DataRow row in ds.Tables[6].Rows)
            {
                if (!string.IsNullOrEmpty(row["MealName"].ToString()))
                {
                    mealRatings.Add(new
                    {
                        MealName = row["MealName"].ToString(),
                        TotalRatings = Convert.ToInt32(row["TotalRatings"]),
                        SatisfiedPercent = Convert.ToDecimal(row["SatisfiedPercent"]),
                        NeutralPercent = ds.Tables[6].Columns.Contains("NeutralPercent") ? Convert.ToDecimal(row["NeutralPercent"]) : 0,
                        UnsatisfiedPercent = ds.Tables[6].Columns.Contains("UnsatisfiedPercent") ? Convert.ToDecimal(row["UnsatisfiedPercent"]) : 0
                    });
                }
            }
        }

        var result = new object[]
        {
        summaryTable.ToArray(),
        changeTable.ToArray(),
        chartData.ToArray(),
        compliments.ToArray(),
        complaints.ToArray(),
        sentimentDistribution.ToArray(),
        mealRatings.ToArray()
        };

        string json = Newtonsoft.Json.JsonConvert.SerializeObject(result);
        Response.Clear();
        Response.ContentType = "application/json";
        Response.Write(json);
        Response.End();
    }

    private DataSet GetDemandForecast()
    {
        string StartDate = string.IsNullOrEmpty(Request["STARTDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["STARTDATE"]);
        string EndDate = string.IsNullOrEmpty(Request["ENDDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ENDDATE"]);

        return DataAccess.GetDemandForecast(StartDate, EndDate);
    }

    private DataSet GetStaffPerformance()
    {
        DataSet ds = new DataSet();
        string StartDate = string.IsNullOrEmpty(Request["STARTDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["STARTDATE"]);
        string EndDate = string.IsNullOrEmpty(Request["ENDDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ENDDATE"]);

        DataTable dt = DataAccess.GetStaffPerformance(StartDate, EndDate);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetRecentOrders()
    {
        DataSet ds = new DataSet();
        string StartDate = string.IsNullOrEmpty(Request["STARTDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["STARTDATE"]);
        string EndDate = string.IsNullOrEmpty(Request["ENDDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ENDDATE"]);
        int TopN = string.IsNullOrEmpty(Request["TOPN"]) ? 100 : Convert.ToInt32(AESEncrytDecry.DecryptStringAES(Request["TOPN"]));

        DataTable dt = DataAccess.GetRecentOrders(StartDate, EndDate, TopN);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetTrendingItems()
    {
        DataSet ds = new DataSet();
        string StartDate = string.IsNullOrEmpty(Request["STARTDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["STARTDATE"]);
        string EndDate = string.IsNullOrEmpty(Request["ENDDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ENDDATE"]);
        int TopN = string.IsNullOrEmpty(Request["TOPN"]) ? 10 : Convert.ToInt32(AESEncrytDecry.DecryptStringAES(Request["TOPN"]));

        DataTable dt = DataAccess.GetTrendingItems(StartDate, EndDate, TopN);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetDocketsSummary()
    {
        DataSet ds = new DataSet();
        string OrderDate = string.IsNullOrEmpty(Request["ORDERDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ORDERDATE"]);
        DataTable dt = DataAccess.GetDocketsSummary(OrderDate);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetDocketsList()
    {
        DataSet ds = new DataSet();
        string OrderDate = string.IsNullOrEmpty(Request["ORDERDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ORDERDATE"]);
        string SearchText = string.IsNullOrEmpty(Request["SEARCHTEXT"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["SEARCHTEXT"]);
        string Ward = string.IsNullOrEmpty(Request["WARD"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["WARD"]);
        DataTable dt = DataAccess.GetDocketsList(OrderDate, SearchText, Ward);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet PrintDocket()
    {
        DataSet ds = new DataSet();
        string OrderID = string.IsNullOrEmpty(Request["ORDERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ORDERID"]);
        string UpdatedBy = string.IsNullOrEmpty(Request["UPDATEDBY"]) ? "System" : AESEncrytDecry.DecryptStringAES(Request["UPDATEDBY"]);
        DataTable dt = DataAccess.PrintDocket(OrderID, UpdatedBy);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet PrintNextUnprinted()
    {
        DataSet ds = new DataSet();
        string OrderDate = string.IsNullOrEmpty(Request["ORDERDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ORDERDATE"]);
        string UpdatedBy = string.IsNullOrEmpty(Request["UPDATEDBY"]) ? "System" : AESEncrytDecry.DecryptStringAES(Request["UPDATEDBY"]);
        DataTable dt = DataAccess.PrintNextUnprinted(OrderDate, UpdatedBy);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetDocketDetail()
    {
        DataSet ds = new DataSet();
        string OrderID = string.IsNullOrEmpty(Request["ORDERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ORDERID"]);
        DataTable dt = DataAccess.GetDocketDetail(OrderID);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetUsers()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetUsers();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetUserById()
    {
        DataSet ds = new DataSet();
        string UserId = string.IsNullOrEmpty(Request["UserId"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["UserId"]);
        DataTable dt = DataAccess.GetUserById(UserId);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet CreateUser()
    {
        DataSet ds = new DataSet();
        string UserName = string.IsNullOrEmpty(Request["UserName"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["UserName"]);
        string MID = string.IsNullOrEmpty(Request["MID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["MID"]);
        string Password = string.IsNullOrEmpty(Request["Password"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["Password"]);
        string RoleId = string.IsNullOrEmpty(Request["RoleId"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["RoleId"]);
        string EmailId = string.IsNullOrEmpty(Request["EmailId"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["EmailId"]);
        string IsActive = string.IsNullOrEmpty(Request["IsActive"]) ? "1" : AESEncrytDecry.DecryptStringAES(Request["IsActive"]);
        string WardIds = string.IsNullOrEmpty(Request["WardIds"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["WardIds"]);
        string KitchenIds = string.IsNullOrEmpty(Request["KitchenIds"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["KitchenIds"]);
        string ServiceId = string.IsNullOrEmpty(Request["ServiceId"]) ? "1" : AESEncrytDecry.DecryptStringAES(Request["ServiceId"]);

        DataTable dt = DataAccess.CreateUser(UserName, MID, Password, RoleId, EmailId, IsActive, WardIds, KitchenIds, ServiceId);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet UpdateUser()
    {
        DataSet ds = new DataSet();
        string UserId = string.IsNullOrEmpty(Request["UserId"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["UserId"]);
        string UserName = string.IsNullOrEmpty(Request["UserName"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["UserName"]);
        string MID = string.IsNullOrEmpty(Request["MID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["MID"]);
        string Password = string.IsNullOrEmpty(Request["Password"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["Password"]);
        string RoleId = string.IsNullOrEmpty(Request["RoleId"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["RoleId"]);
        string EmailId = string.IsNullOrEmpty(Request["EmailId"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["EmailId"]);
        string IsActive = string.IsNullOrEmpty(Request["IsActive"]) ? "1" : AESEncrytDecry.DecryptStringAES(Request["IsActive"]);
        string WardIds = string.IsNullOrEmpty(Request["WardIds"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["WardIds"]);
        string KitchenIds = string.IsNullOrEmpty(Request["KitchenIds"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["KitchenIds"]);
        string ServiceId = string.IsNullOrEmpty(Request["ServiceId"]) ? "1" : AESEncrytDecry.DecryptStringAES(Request["ServiceId"]);

        DataTable dt = DataAccess.UpdateUser(UserId, UserName, MID, Password, RoleId, EmailId, IsActive, WardIds, KitchenIds, ServiceId);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet DeleteUser()
    {
        DataSet ds = new DataSet();
        string UserId = string.IsNullOrEmpty(Request["UserId"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["UserId"]);
        DataTable dt = DataAccess.DeleteUser(UserId);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetRoles()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetRoles();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetWards()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetWards();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetKitchens()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetKitchens();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetPatientSatisfactionSummary()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetPatientSatisfactionSummary();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetPatientSatisfactionDistribution()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetPatientSatisfactionDistribution();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetPatientSatisfactionMealRatings()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetPatientSatisfactionMealRatings();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetPatientSatisfactionFeedback()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetPatientSatisfactionFeedback();
        ds.Tables.Add(dt);
        return ds;
    }

    private void ExportPatientSatisfaction()
    {
        string userId = Session["UserID"] != null ? Session["UserID"].ToString() : null;
        string range = Request.QueryString["RANGE"] != null ? Request.QueryString["RANGE"] : "30days";
        string startDate = Request.QueryString["STARTDATE"] != null ? Request.QueryString["STARTDATE"] : null;
        string endDate = Request.QueryString["ENDDATE"] != null ? Request.QueryString["ENDDATE"] : null;

        if (!string.IsNullOrEmpty(range))
            range = AESEncrytDecry.DecryptStringAES(range);

        if (!string.IsNullOrEmpty(startDate))
            startDate = AESEncrytDecry.DecryptStringAES(startDate);

        if (!string.IsNullOrEmpty(endDate))
            endDate = AESEncrytDecry.DecryptStringAES(endDate);

        DataTable dt = DataAccess.ExportPatientSatisfaction(userId, range, startDate, endDate);

        if (dt.Rows.Count > 0)
        {
            GeneratePDF(dt, range, startDate, endDate);
        }
        else
        {
            Response.Clear();
            Response.ContentType = "text/plain";
            Response.Write("No data found to export");
            Response.End();
        }
    }

    private void GeneratePDF(DataTable dt, string range, string startDate, string endDate)
    {
        var summary = new Dictionary<string, string>();
        var distribution = new Dictionary<string, int>();
        var mealRatings = new List<Tuple<string, int, int, int>>();
        var menuItems = new List<Tuple<int, string, int, int>>();
        var feedback = new List<Tuple<string, string, string, string, string, string>>();
        var unsatisfiedFeedback = new List<Tuple<string, string, string, string, string, string, string>>();

        string currentSection = "";
        bool isDataRow = false;

        foreach (DataRow row in dt.Rows)
        {
            string col1 = row["Col1"] != null ? row["Col1"].ToString() : "";
            string col2 = row["Col2"] != null ? row["Col2"].ToString() : "";

            if (string.IsNullOrEmpty(col1) && string.IsNullOrEmpty(col2))
                continue;

            if (col1.Contains("Patient Satisfaction Report"))
            {
                continue;
            }
            else if (col1 == "SUMMARY") { currentSection = "SUMMARY"; isDataRow = false; continue; }
            else if (col1 == "SENTIMENT DISTRIBUTION") { currentSection = "DISTRIBUTION"; isDataRow = false; continue; }
            else if (col1 == "% SATISFIED BY MEAL SESSION") { currentSection = "MEAL"; isDataRow = false; continue; }
            else if (col1 == "TOP RATED MENU ITEMS (by % satisfied)") { currentSection = "MENU"; isDataRow = false; continue; }
            else if (col1 == "UNSATISFIED FEEDBACK") { currentSection = "UNSATISFIED"; isDataRow = false; continue; }
            else if (col1 == "RECENT PATIENT FEEDBACK") { currentSection = "FEEDBACK"; isDataRow = false; continue; }
            else if (col1 == "Metric" || col1 == "Sentiment" || col1 == "Meal" || col1 == "#" || col1 == "Status" || col1 == "Feedback")
            {
                isDataRow = true;
                continue;
            }
            else if (col1 == "No unsatisfied feedback in this period. Great job!")
            {
                continue;
            }
            else if (col1.Contains("This report was generated by"))
            {
                continue;
            }

            if (currentSection == "SUMMARY")
            {
                summary[col1] = col2;
            }
            else if (currentSection == "DISTRIBUTION")
            {
                var parts = col2.Split(new[] { " | " }, StringSplitOptions.None);
                if (parts.Length >= 2)
                {
                    string countStr = parts[0].Trim();
                    int count = 0;
                    int.TryParse(countStr, out count);
                    distribution[col1] = count;
                }
            }
            else if (currentSection == "MEAL")
            {
                var parts = col2.Split(new[] { " | " }, StringSplitOptions.None);
                if (parts.Length >= 3)
                {
                    string satisfiedStr = parts[0].Trim().Replace("%", "");
                    string unsatisfiedStr = parts[1].Trim().Replace("%", "");
                    string countStr = parts[2].Trim();
                    int mealSatisfiedPercent = 0;
                    int mealUnsatisfiedPercent = 0;
                    int count = 0;
                    int.TryParse(satisfiedStr, out mealSatisfiedPercent);
                    int.TryParse(unsatisfiedStr, out mealUnsatisfiedPercent);
                    int.TryParse(countStr, out count);
                    mealRatings.Add(Tuple.Create(col1, mealSatisfiedPercent, mealUnsatisfiedPercent, count));
                }
            }
            else if (currentSection == "MENU")
            {
                var parts = col2.Split(new[] { " | " }, StringSplitOptions.None);
                if (parts.Length >= 3)
                {
                    int rank = 0;
                    int.TryParse(col1, out rank);
                    string itemName = parts[0].Trim();
                    string percentStr = parts[1].Trim().Replace("%", "");
                    string countStr = parts[2].Trim();
                    int percent = 0;
                    int count = 0;
                    int.TryParse(percentStr, out percent);
                    int.TryParse(countStr, out count);
                    menuItems.Add(Tuple.Create(rank, itemName, percent, count));
                }
            }
            else if (currentSection == "UNSATISFIED")
            {
                // UPDATED: Col1 is now "Name (Room X) — Meal" (same shape as the
                // Recent Feedback rows) and Col2 is "comment | Items: item list | AckBy: staff name".
                if (string.IsNullOrEmpty(col1))
                {
                    continue;
                }

                var detailParts = col1.Split(new[] { " — " }, StringSplitOptions.None);
                string nameRoom = detailParts.Length > 0 ? detailParts[0] : "";
                string meal = detailParts.Length > 1 ? detailParts[1].Trim() : "";

                string patientName = "";
                string room = "";
                var roomParts = nameRoom.Split(new[] { " (Room " }, StringSplitOptions.None);
                patientName = roomParts.Length > 0 ? roomParts[0].Trim() : "";
                if (roomParts.Length > 1)
                {
                    room = roomParts[1].Replace(")", "").Trim();
                }

                var itemsSplit = col2.Split(new[] { " | Items: " }, StringSplitOptions.None);
                string comment = itemsSplit.Length > 0 ? itemsSplit[0].Trim() : "";
                string itemsAndAck = itemsSplit.Length > 1 ? itemsSplit[1] : "";

                var ackSplit = itemsAndAck.Split(new[] { " | AckBy: " }, StringSplitOptions.None);
                string items = ackSplit.Length > 0 ? ackSplit[0].Trim() : "";
                string ackByAndRemarks = ackSplit.Length > 1 ? ackSplit[1] : "";

                var remarksSplit = ackByAndRemarks.Split(new[] { " | AckRemarks: " }, StringSplitOptions.None);
                string ackBy = remarksSplit.Length > 0 ? remarksSplit[0].Trim() : "";
                string ackRemarks = remarksSplit.Length > 1 ? remarksSplit[1].Trim() : "";

                unsatisfiedFeedback.Add(Tuple.Create(patientName, room, meal, comment, items, ackBy, ackRemarks));
            }
            else if (currentSection == "FEEDBACK")
            {
                var parts = col2.Split(new[] { " | Items: " }, StringSplitOptions.None);
                string comment = parts.Length > 0 ? parts[0].Trim() : "";
                string items = parts.Length > 1 ? parts[1] : "";

                var detailParts = col1.Split(new[] { " — " }, StringSplitOptions.None);
                string patientInfo = detailParts.Length > 0 ? detailParts[0] : "";
                string mealInfo = detailParts.Length > 1 ? detailParts[1] : "";

                string sentiment = "";
                string patientName = "";
                string room = "";
                string meal = "";

                if (patientInfo.Contains("] "))
                {
                    int bracketEnd = patientInfo.IndexOf("] ") + 1;
                    sentiment = patientInfo.Substring(0, bracketEnd).Trim();
                    string rest = patientInfo.Substring(bracketEnd).Trim();
                    var roomParts = rest.Split(new[] { " (Room " }, StringSplitOptions.None);
                    patientName = roomParts.Length > 0 ? roomParts[0].Trim() : "";
                    if (roomParts.Length > 1)
                    {
                        room = roomParts[1].Replace(")", "").Trim();
                    }
                }

                meal = mealInfo.Trim();

                feedback.Add(Tuple.Create(sentiment, patientName, room, meal, comment, items));
            }
        }

        int totalRatings = 0;
        int totalDelivered = 0;
        int satisfiedCount = 0;
        double responseRate = 0;
        int satisfiedPercent = 0;

        if (summary.ContainsKey("% Satisfied"))
        {
            string val = summary["% Satisfied"].Replace("%", "").Trim();
            int.TryParse(val, out satisfiedPercent);
        }
        if (summary.ContainsKey("Total Responses"))
            int.TryParse(summary["Total Responses"], out totalRatings);
        if (summary.ContainsKey("Delivered Orders"))
            int.TryParse(summary["Delivered Orders"], out totalDelivered);
        if (summary.ContainsKey("Response Rate"))
        {
            string val = summary["Response Rate"].Replace("%", "").Trim();
            double.TryParse(val, out responseRate);
        }

        Response.Clear();
        Response.ContentType = "application/pdf";
        string dateRange = GetDateRangeLabel(range, startDate, endDate);
        Response.AddHeader("content-disposition", "attachment;filename=Patient_Satisfaction_Report_" + DateTime.Now.ToString("yyyy-MM-dd") + ".pdf");

        using (MemoryStream ms = new MemoryStream())
        {
            Document document = new Document(PageSize.A4, 40, 40, 40, 40);
            PdfWriter writer = PdfWriter.GetInstance(document, ms);
            document.Open();

            string fontPath = HttpContext.Current.Server.MapPath("~/webfonts/arialuni.ttf");
            BaseFont baseFont = BaseFont.CreateFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
            BaseFont starFont = BaseFont.CreateFont(fontPath, BaseFont.IDENTITY_H, BaseFont.EMBEDDED);

            Font titleFont = new Font(baseFont, 24, Font.BOLD, new BaseColor(26, 26, 46));
            Font subtitleFont = new Font(baseFont, 14, Font.NORMAL, new BaseColor(75, 85, 99));
            Font sectionFont = new Font(baseFont, 16, Font.BOLD, new BaseColor(26, 26, 46));
            Font normalFont = new Font(baseFont, 11, Font.NORMAL, new BaseColor(26, 26, 46));
            Font boldFont = new Font(baseFont, 11, Font.BOLD, new BaseColor(26, 26, 46));
            Font headerFont = new Font(baseFont, 11, Font.BOLD, new BaseColor(255, 255, 255));
            Font smallFont = new Font(baseFont, 10, Font.NORMAL, new BaseColor(75, 85, 99));

            Paragraph title = new Paragraph("Dial50 Food Module", titleFont);
            title.Alignment = Element.ALIGN_CENTER;
            document.Add(title);

            Paragraph subtitle = new Paragraph("Patient Satisfaction Report — " + dateRange, subtitleFont);
            subtitle.Alignment = Element.ALIGN_CENTER;
            document.Add(subtitle);

            Paragraph generated = new Paragraph("Generated on " + DateTime.Now.ToString("MMMM dd, yyyy") + " at " + DateTime.Now.ToString("HH:mm") + " UTC",
                new Font(baseFont, 10, Font.NORMAL, new BaseColor(156, 163, 175)));
            generated.Alignment = Element.ALIGN_CENTER;
            document.Add(generated);
            document.Add(new Paragraph(" "));

            Paragraph sectionTitle = new Paragraph("Summary", sectionFont);
            sectionTitle.Alignment = Element.ALIGN_LEFT;
            document.Add(sectionTitle);
            document.Add(new Paragraph(" "));

            PdfPTable summaryTable = new PdfPTable(4);
            summaryTable.WidthPercentage = 100;
            summaryTable.SetWidths(new float[] { 1, 1, 1, 1 });

            AddSummaryBox(summaryTable, "% Satisfied", satisfiedPercent.ToString() + "%", "of all rated meals", baseFont);
            AddSummaryBox(summaryTable, "Total Responses", totalRatings.ToString(), "of " + totalDelivered + " delivered orders", baseFont);
            AddSummaryBox(summaryTable, "Response Rate", Math.Round(responseRate).ToString() + "%", "patients rated their meal", baseFont);
            AddSummaryBox(summaryTable, "Delivered Orders", totalDelivered.ToString(), "orders delivered", baseFont);

            document.Add(summaryTable);
            document.Add(new Paragraph(" "));

            Paragraph distTitle = new Paragraph("Sentiment Distribution", sectionFont);
            distTitle.Alignment = Element.ALIGN_LEFT;
            document.Add(distTitle);
            document.Add(new Paragraph(" "));

            PdfPTable distTable = new PdfPTable(3);
            distTable.WidthPercentage = 100;
            distTable.SetWidths(new float[] { 1.5f, 1f, 1.5f });

            AddTableHeader(distTable, "Sentiment", headerFont);
            AddTableHeader(distTable, "Count", headerFont);
            AddTableHeader(distTable, "Share", headerFont);

            int totalSentiment = 0;
            foreach (var item in distribution)
                totalSentiment += item.Value;

            string[] sentimentOrder = { "Satisfied", "Neutral", "Unsatisfied" };
            foreach (string sentiment in sentimentOrder)
            {
                if (distribution.ContainsKey(sentiment))
                {
                    int count = distribution[sentiment];
                    int share = totalSentiment > 0 ? (int)Math.Round((double)count / totalSentiment * 100) : 0;
                    AddTableCell(distTable, sentiment, normalFont);
                    AddTableCell(distTable, count.ToString(), normalFont);
                    AddTableCell(distTable, share.ToString() + "%", normalFont);
                }
            }

            document.Add(distTable);
            document.Add(new Paragraph(" "));

            if (mealRatings.Count > 0)
            {
                Paragraph mealTitle = new Paragraph("Satisfaction by Meal Session", sectionFont);
                mealTitle.Alignment = Element.ALIGN_LEFT;
                document.Add(mealTitle);
                document.Add(new Paragraph(" "));

                PdfPTable mealTable = new PdfPTable(4);
                mealTable.WidthPercentage = 100;
                mealTable.SetWidths(new float[] { 2, 1.3f, 1.3f, 1.4f });

                AddTableHeader(mealTable, "Meal", headerFont);
                AddTableHeader(mealTable, "% Satisfied", headerFont);
                AddTableHeader(mealTable, "% Unsatisfied", headerFont);
                AddTableHeader(mealTable, "# Responses", headerFont);

                foreach (var item in mealRatings)
                {
                    AddTableCell(mealTable, item.Item1, normalFont);
                    AddTableCell(mealTable, item.Item2.ToString() + "%", normalFont);
                    AddTableCell(mealTable, item.Item3.ToString() + "%", normalFont);
                    AddTableCell(mealTable, item.Item4.ToString(), normalFont);
                }

                document.Add(mealTable);
                document.Add(new Paragraph(" "));
            }

            if (menuItems.Count > 0)
            {
                Paragraph menuTitle = new Paragraph("Top Rated Menu Items (by % satisfied)", sectionFont);
                menuTitle.Alignment = Element.ALIGN_LEFT;
                document.Add(menuTitle);
                document.Add(new Paragraph(" "));

                PdfPTable menuTable = new PdfPTable(4);
                menuTable.WidthPercentage = 100;
                menuTable.SetWidths(new float[] { 0.5f, 2.5f, 1.5f, 1.5f });

                AddTableHeader(menuTable, "#", headerFont);
                AddTableHeader(menuTable, "Menu Item", headerFont);
                AddTableHeader(menuTable, "% Satisfied", headerFont);
                AddTableHeader(menuTable, "Responses", headerFont);

                foreach (var item in menuItems)
                {
                    AddTableCell(menuTable, item.Item1.ToString(), normalFont);
                    AddTableCell(menuTable, item.Item2, normalFont);
                    AddTableCell(menuTable, item.Item3.ToString() + "%", normalFont);
                    AddTableCell(menuTable, item.Item4.ToString(), normalFont);
                }

                document.Add(menuTable);
                document.Add(new Paragraph(" "));
            }

            Paragraph unsatisfiedTitle = new Paragraph("Unsatisfied Feedback", sectionFont);
            unsatisfiedTitle.Alignment = Element.ALIGN_LEFT;
            document.Add(unsatisfiedTitle);
            document.Add(new Paragraph(" "));

            PdfPTable unsatisfiedTable = new PdfPTable(1);
            unsatisfiedTable.WidthPercentage = 100;

            PdfPCell unsatisfiedCell = new PdfPCell();
            unsatisfiedCell.Padding = 14;
            unsatisfiedCell.Border = Rectangle.BOX;

            if (unsatisfiedFeedback.Count > 0)
            {
                unsatisfiedCell.BackgroundColor = new BaseColor(254, 242, 242);

                for (int i = 0; i < unsatisfiedFeedback.Count; i++)
                {
                    var item = unsatisfiedFeedback[i];
                    string patientName = item.Item1;
                    string room = item.Item2;
                    string meal = item.Item3;
                    string comment = item.Item4;
                    string items = item.Item5;
                    string ackBy = item.Item6;
                    string ackRemarks = item.Item7;

                    Paragraph nameLine = new Paragraph();
                    nameLine.Add(new Phrase(patientName + " (Room " + room + ") — " + meal, boldFont));
                    unsatisfiedCell.AddElement(nameLine);

                    if (!string.IsNullOrEmpty(comment) && comment != "(no comment)")
                    {
                        Paragraph commentLine = new Paragraph("\"" + comment + "\"", new Font(baseFont, 10, Font.ITALIC, new BaseColor(75, 85, 99)));
                        commentLine.IndentationLeft = 20;
                        unsatisfiedCell.AddElement(commentLine);
                    }

                    if (!string.IsNullOrEmpty(items))
                    {
                        Paragraph itemsLine = new Paragraph("Items: " + items, smallFont);
                        itemsLine.IndentationLeft = 20;
                        unsatisfiedCell.AddElement(itemsLine);
                    }

                    Paragraph ackLine = new Paragraph(
                        !string.IsNullOrEmpty(ackBy) ? "Acknowledged By: " + ackBy : "Acknowledged By: Not yet acknowledged",
                        smallFont);
                    ackLine.IndentationLeft = 20;
                    unsatisfiedCell.AddElement(ackLine);

                    if (!string.IsNullOrEmpty(ackRemarks))
                    {
                        Paragraph ackRemarksLine = new Paragraph("Remarks: " + ackRemarks, smallFont);
                        ackRemarksLine.IndentationLeft = 20;
                        unsatisfiedCell.AddElement(ackRemarksLine);
                    }

                    if (i < unsatisfiedFeedback.Count - 1)
                    {
                        unsatisfiedCell.AddElement(new Paragraph(" "));
                    }
                }
            }
            else
            {
                unsatisfiedCell.BackgroundColor = new BaseColor(240, 253, 244);
                unsatisfiedCell.AddElement(new Paragraph("No unsatisfied feedback in this period. Great job!", normalFont));
            }

            unsatisfiedTable.AddCell(unsatisfiedCell);

            document.Add(unsatisfiedTable);
            document.Add(new Paragraph(" "));

            if (feedback.Count > 0)
            {
                Paragraph feedbackTitle = new Paragraph("Recent Patient Feedback", sectionFont);
                feedbackTitle.Alignment = Element.ALIGN_LEFT;
                document.Add(feedbackTitle);
                document.Add(new Paragraph(" "));

                foreach (var item in feedback.Take(20))
                {
                    string sentimentColor = "";
                    if (item.Item1.Contains("Satisfied")) sentimentColor = "Green";
                    else if (item.Item1.Contains("Neutral")) sentimentColor = "Orange";
                    else if (item.Item1.Contains("Unsatisfied")) sentimentColor = "Red";

                    Paragraph feedbackName = new Paragraph();
                    feedbackName.Add(new Phrase(item.Item1 + " ", boldFont));
                    feedbackName.Add(new Phrase(item.Item2 + " (Room " + item.Item3 + ") — " + item.Item4, normalFont));
                    document.Add(feedbackName);

                    if (!string.IsNullOrEmpty(item.Item5) && item.Item5 != "(no comment)")
                    {
                        Paragraph feedbackComment = new Paragraph("\"" + item.Item5 + "\"", new Font(baseFont, 10, Font.ITALIC, new BaseColor(75, 85, 99)));
                        feedbackComment.IndentationLeft = 20;
                        document.Add(feedbackComment);
                    }

                    if (!string.IsNullOrEmpty(item.Item6))
                    {
                        Paragraph feedbackItems = new Paragraph("Items: " + item.Item6, smallFont);
                        feedbackItems.IndentationLeft = 20;
                        document.Add(feedbackItems);
                    }

                    document.Add(new Paragraph(" "));
                }
            }

            document.Add(new Paragraph(" "));
            Paragraph footer = new Paragraph("This report was generated by the Dial50 Food Module. For questions, contact the Food Service Administration team.",
                new Font(baseFont, 9, Font.NORMAL, new BaseColor(156, 163, 175)));
            footer.Alignment = Element.ALIGN_CENTER;
            document.Add(footer);

            document.Close();
            byte[] bytes = ms.ToArray();
            Response.BinaryWrite(bytes);
            Response.End();
        }
    }

    private string GetDateRangeLabel(string range, string startDate, string endDate)
    {
        if (!string.IsNullOrEmpty(startDate) && !string.IsNullOrEmpty(endDate))
        {
            DateTime start = DateTime.Parse(startDate);
            DateTime end = DateTime.Parse(endDate);
            return "Last " + (int)(end - start).TotalDays + " Days (" + start.ToString("MMM dd") + " — " + end.ToString("MMM dd, yyyy") + ")";
        }

        DateTime today = DateTime.Today;
        if (range == "today")
            return "Today (" + today.ToString("MMM dd, yyyy") + ")";
        else if (range == "7days")
            return "Last 7 Days (" + today.AddDays(-6).ToString("MMM dd") + " — " + today.ToString("MMM dd, yyyy") + ")";
        else
            return "Last 30 Days (" + today.AddDays(-29).ToString("MMM dd") + " — " + today.ToString("MMM dd, yyyy") + ")";
    }

    private void AddSummaryBox(PdfPTable table, string label, string value, string subText, BaseFont baseFont)
    {
        PdfPCell cell = new PdfPCell();
        cell.Padding = 12;
        cell.Border = Rectangle.BOX;
        cell.BackgroundColor = new BaseColor(248, 250, 252);

        Paragraph labelPara = new Paragraph(label, new Font(baseFont, 9, Font.BOLD, new BaseColor(107, 114, 128)));
        labelPara.Alignment = Element.ALIGN_CENTER;

        BaseColor valueColor = GetValueColor(label);
        Paragraph valuePara = new Paragraph(value, new Font(baseFont, 18, Font.BOLD, valueColor));
        valuePara.Alignment = Element.ALIGN_CENTER;

        cell.AddElement(labelPara);
        cell.AddElement(valuePara);

        if (!string.IsNullOrEmpty(subText))
        {
            Paragraph subPara = new Paragraph(subText, new Font(baseFont, 10, Font.NORMAL, new BaseColor(107, 114, 128)));
            subPara.Alignment = Element.ALIGN_CENTER;
            cell.AddElement(subPara);
        }

        table.AddCell(cell);
    }

    private BaseColor GetValueColor(string label)
    {
        return new BaseColor(26, 26, 46);
    }

    private void AddTableHeader(PdfPTable table, string text, Font font)
    {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.BackgroundColor = new BaseColor(51, 65, 85);
        cell.Padding = 8;
        cell.Border = Rectangle.BOX;
        cell.HorizontalAlignment = Element.ALIGN_LEFT;
        table.AddCell(cell);
    }

    private void AddTableCell(PdfPTable table, string text, Font font)
    {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.Padding = 8;
        cell.Border = Rectangle.BOX;
        cell.HorizontalAlignment = Element.ALIGN_LEFT;
        table.AddCell(cell);
    }
    private DataSet GetDeliveries(string process)
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetDeliveries(process);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GenerateOTP()
    {
        DataSet ds = new DataSet();
        string orderId = string.IsNullOrEmpty(Request.QueryString["ORDERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ORDERID"]);
        string updatedBy = Session["NAME"] != null ? Session["NAME"].ToString() : "System";
        DataTable dt = DataAccess.GenerateOTP(orderId, updatedBy);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet VerifyOTP()
    {
        DataSet ds = new DataSet();
        string orderId = string.IsNullOrEmpty(Request.QueryString["ORDERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ORDERID"]);
        string otp = string.IsNullOrEmpty(Request.QueryString["OTP"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["OTP"]);
        string updatedBy = Session["NAME"] != null ? Session["NAME"].ToString() : "System";
        DataTable dt = DataAccess.VerifyOTP(orderId, otp, updatedBy);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet DeliveredWithoutOTP()
    {
        DataSet ds = new DataSet();
        string orderId = string.IsNullOrEmpty(Request.QueryString["ORDERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ORDERID"]);
        string updatedBy = Session["NAME"] != null ? Session["NAME"].ToString() : "System";
        DataTable dt = DataAccess.DeliveredWithoutOTP(orderId, updatedBy);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet ResendOTP()
    {
        DataSet ds = new DataSet();
        string orderId = string.IsNullOrEmpty(Request.QueryString["ORDERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ORDERID"]);
        string updatedBy = Session["NAME"] != null ? Session["NAME"].ToString() : "System";
        DataTable dt = DataAccess.ResendOTP(orderId, updatedBy);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet CheckOTPStatus()
    {
        DataSet ds = new DataSet();
        string orderId = string.IsNullOrEmpty(Request.QueryString["ORDERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ORDERID"]);
        DataTable dt = DataAccess.CheckOTPStatus(orderId);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet ReportDeliveryFailure()
    {
        DataSet ds = new DataSet();
        string orderId = string.IsNullOrEmpty(Request.QueryString["ORDERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ORDERID"]);
        string reason = string.IsNullOrEmpty(Request.QueryString["REASON"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["REASON"]);
        string notes = string.IsNullOrEmpty(Request.QueryString["NOTES"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["NOTES"]);
        string updatedBy = Session["NAME"] != null ? Session["NAME"].ToString() : "System";
        DataTable dt = DataAccess.ReportDeliveryFailure(orderId, reason, notes, updatedBy);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetFailureStatus()
    {
        DataSet ds = new DataSet();
        string orderId = string.IsNullOrEmpty(Request.QueryString["ORDERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ORDERID"]);
        DataTable dt = DataAccess.GetFailureStatus(orderId);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetFailureRemarks()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetFailureRemarks();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetOTPVerificationList()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetOTPVerificationList();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet PickupOrder()
    {
        DataSet ds = new DataSet();
        string orderId = string.IsNullOrEmpty(Request.QueryString["ORDERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ORDERID"]);
        string updatedBy = Session["NAME"] != null ? Session["NAME"].ToString() : "System";
        DataTable dt = DataAccess.PickupOrder(orderId, updatedBy);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetPreOrderSheets()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetPreOrderSheets();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet PrintPreOrderDockets()
    {
        DataSet ds = new DataSet();
        string id = Request["ID"];
        if (!string.IsNullOrEmpty(id))
        {
            id = AESEncrytDecry.DecryptStringAES(id);
        }
        DataTable dt = DataAccess.PrintPreOrderDockets(id);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetPreOrderPrintData()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetPreOrderPrintData();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet LockPreOrderSheet()
    {
        DataSet ds = new DataSet();
        string id = string.IsNullOrEmpty(Request["ID"]) ? null : AESEncrytDecry.DecryptStringAES(Request["ID"]);
        string date = string.IsNullOrEmpty(Request["DATE"]) ? null : AESEncrytDecry.DecryptStringAES(Request["DATE"]);
        string mealType = string.IsNullOrEmpty(Request["MEALTYPE"]) ? null : AESEncrytDecry.DecryptStringAES(Request["MEALTYPE"]);
        string updatedBy = string.IsNullOrEmpty(Request["UPDATEDBY"]) ? "System" : AESEncrytDecry.DecryptStringAES(Request["UPDATEDBY"]);

        DataTable dt = DataAccess.LockPreOrderSheet(id, date, mealType, updatedBy);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet UnlockPreOrderSheet()
    {
        DataSet ds = new DataSet();
        string id = string.IsNullOrEmpty(Request["ID"]) ? null : AESEncrytDecry.DecryptStringAES(Request["ID"]);
        string date = string.IsNullOrEmpty(Request["DATE"]) ? null : AESEncrytDecry.DecryptStringAES(Request["DATE"]);
        string mealType = string.IsNullOrEmpty(Request["MEALTYPE"]) ? null : AESEncrytDecry.DecryptStringAES(Request["MEALTYPE"]);
        string updatedBy = string.IsNullOrEmpty(Request["UPDATEDBY"]) ? "System" : AESEncrytDecry.DecryptStringAES(Request["UPDATEDBY"]);

        DataTable dt = DataAccess.UnlockPreOrderSheet(id, date, mealType, updatedBy);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetPatientDetails()
    {
        DataSet ds = new DataSet();
        string roomNo = string.IsNullOrEmpty(Request["RoomNo"]) ? null : AESEncrytDecry.DecryptStringAES(Request["RoomNo"]);
        DataTable dt = DataAccess.GetPatientDetails(roomNo);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetMenuItems()
    {
        DataSet ds = new DataSet();
        string mealType = string.IsNullOrEmpty(Request["MealType"]) ? null : AESEncrytDecry.DecryptStringAES(Request["MealType"]);
        string searchTerm = string.IsNullOrEmpty(Request["SearchTerm"]) ? null : AESEncrytDecry.DecryptStringAES(Request["SearchTerm"]);
        string roomNo = string.IsNullOrEmpty(Request["RoomNo"]) ? null : AESEncrytDecry.DecryptStringAES(Request["RoomNo"]);
        string patientId = string.IsNullOrEmpty(Request["PatientId"]) ? null : AESEncrytDecry.DecryptStringAES(Request["PatientId"]);

        DataTable dt = DataAccess.GetMenuItems(mealType, searchTerm, roomNo, patientId);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet RemoveDefaultFood()
    {
        string OrderID = string.IsNullOrEmpty(Request.QueryString["ORDERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ORDERID"].ToString());

        DataSet DS = new DataSet();
        DataTable Dt = DataAccess.RemoveDefaultFood(OrderID);
        DS.Tables.Add(Dt);
        return DS;
    }
    private DataSet RemoveTodayOrder()
    {
        DataSet ds = new DataSet();
        string orderId = string.IsNullOrEmpty(Request["OrderID"]) ? null : AESEncrytDecry.DecryptStringAES(Request["OrderID"]);
        string roomNo = string.IsNullOrEmpty(Request["RoomNo"]) ? null : AESEncrytDecry.DecryptStringAES(Request["RoomNo"]);
        string userId = string.IsNullOrEmpty(Request["UserID"]) ? null : AESEncrytDecry.DecryptStringAES(Request["UserID"]);

        DataTable dt = DataAccess.RemoveTodayOrder(orderId, roomNo, userId);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet InsertFoodOrder()
    {
        DataSet ds = new DataSet();
        string orderData = string.IsNullOrEmpty(Request["OrderData"]) ? null : AESEncrytDecry.DecryptStringAES(Request["OrderData"]);
        string userId = string.IsNullOrEmpty(Request["UserId"]) ? null : AESEncrytDecry.DecryptStringAES(Request["UserId"]);

        int userID = 0;
        if (!string.IsNullOrEmpty(userId))
            int.TryParse(userId, out userID);

        string orderID = "";
        DataTable dt = DataAccess.InsertFoodOrder(orderData, userID, ref orderID);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetServiceTimings()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetServiceTimings();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetRecommendedFoods()
    {
        DataSet ds = new DataSet();
        string roomNo = string.IsNullOrEmpty(Request["RoomNo"]) ? null : AESEncrytDecry.DecryptStringAES(Request["RoomNo"]);
        string mealType = string.IsNullOrEmpty(Request["MealType"]) ? null : AESEncrytDecry.DecryptStringAES(Request["MealType"]);
        string patientId = string.IsNullOrEmpty(Request["PatientId"]) ? null : AESEncrytDecry.DecryptStringAES(Request["PatientId"]);

        int patientID = 0;
        if (!string.IsNullOrEmpty(patientId))
            int.TryParse(patientId, out patientID);

        DataTable dt = DataAccess.GetRecommendedFoods(roomNo, mealType, patientID);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetAuditLogs()
    {
        DataSet ds = new DataSet();

        string search = string.IsNullOrEmpty(Request["Search"]) ? string.Empty : AESEncrytDecry.DecryptStringAES(Request["Search"]);
        string userId = string.IsNullOrEmpty(Request["UserID"]) ? string.Empty : AESEncrytDecry.DecryptStringAES(Request["UserID"]);

        int userID = 0;
        int.TryParse(userId, out userID);

        DataTable dt = DataAccess.GetAuditLogs(search, userID);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetAuditActions()
    {
        DataSet ds = new DataSet();

        DataTable dt = DataAccess.GetActionTypes();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetAssemblyQueue()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetAssemblyQueue();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet SendToDelivery()
    {
        DataSet ds = new DataSet();
        string orderId = string.IsNullOrEmpty(Request.QueryString["ORDERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ORDERID"]);
        string userId = string.IsNullOrEmpty(Request.QueryString["USERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["USERID"]);
        DataTable dt = DataAccess.SendToDeliveryOrderStatus(orderId, "Ready for Pickup", userId);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetDischargeDashboard()
    {
        DataSet ds = new DataSet();
        int? roleId = null;
        string roleStr = Request.QueryString["ROLEID"];
        if (!string.IsNullOrEmpty(roleStr))
        {
            roleStr = AESEncrytDecry.DecryptStringAES(roleStr);
            int parsed;
            if (int.TryParse(roleStr, out parsed))
                roleId = parsed;
        }
        DataTable dt = DataAccess.GetDischargeDashboardData(roleId);
        ds.Tables.Add(dt);
        return ds;
    }
    private DataSet InsertUpdateServing()
    {
        DataSet ds = new DataSet();

        string catCode = string.IsNullOrEmpty(Request.QueryString["CATCODE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["CATCODE"]);
        string catName = string.IsNullOrEmpty(Request.QueryString["CATNAME"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["CATNAME"]);
        string servingName = string.IsNullOrEmpty(Request.QueryString["SERVINGNAME"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["SERVINGNAME"]);
        string startTime = string.IsNullOrEmpty(Request.QueryString["STARTTIME"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["STARTTIME"]);
        string endTime = string.IsNullOrEmpty(Request.QueryString["ENDTIME"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ENDTIME"]);
        string isActive = string.IsNullOrEmpty(Request.QueryString["ISACTIVE"]) ? "1" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ISACTIVE"]);
        string Action = string.IsNullOrEmpty(Request.QueryString["ACTION"]) ? "INSERT" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ACTION"]);
        string Id = string.IsNullOrEmpty(Request.QueryString["ID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ID"]);
        string fileNameToStore = null;

        if (Request.Files.Count > 0)
        {
            HttpPostedFile file = Request.Files["ICON_FILE"];
            if (file != null && file.ContentLength > 0)
            {
                string ext = Path.GetExtension(file.FileName);
                fileNameToStore = "serving_" + catCode + ext;

                string folderPath = Server.MapPath("~/images/");
                if (!Directory.Exists(folderPath)) Directory.CreateDirectory(folderPath);

                string fullPath = Path.Combine(folderPath, fileNameToStore);
                file.SaveAs(fullPath);
            }
        }
        DataTable dt = DataAccess.SaveServing(catCode, catName, servingName, startTime, endTime, isActive, Action, Id, fileNameToStore);
        ds.Tables.Add(dt);

        return ds;
    }
    private DataSet GetServingData()
    {
        DataSet ds = new DataSet();

        string searchText = string.IsNullOrEmpty(Request.QueryString["SEARCH"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["SEARCH"]);
        string showInactive = string.IsNullOrEmpty(Request.QueryString["INACTIVE"]) ? "1" : AESEncrytDecry.DecryptStringAES(Request.QueryString["INACTIVE"]);
        DataTable dt = DataAccess.GetServingData(searchText, showInactive);
        ds.Tables.Add(dt);
        return ds;
    }
    private DataSet GetServingById()
    {
        DataSet ds = new DataSet();
        string id = string.IsNullOrEmpty(Request.QueryString["ID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ID"]);
        DataTable dt = DataAccess.GetServingById(id);
        ds.Tables.Add(dt);
        return ds;
    }
    private DataSet GetActiveMealTypes()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetActiveMealTypes();
        ds.Tables.Add(dt);
        return ds;
    }
    private DataSet GetOpenFlagCount()
    {
        DataSet ds = new DataSet();
        int? roleId = null;
        string roleStr = Request.QueryString["ROLEID"];
        if (!string.IsNullOrEmpty(roleStr))
        {
            roleStr = AESEncrytDecry.DecryptStringAES(roleStr);
            int parsed;
            if (int.TryParse(roleStr, out parsed))
                roleId = parsed;
        }
        DataTable dt = DataAccess.GetOpenFlagCount(roleId);
        ds.Tables.Add(dt);
        return ds;
    }
    private DataSet GetPatientFlags()
    {
        DataSet ds = new DataSet();
        string status = string.IsNullOrEmpty(Request.QueryString["STATUS"]) ? "OPEN" : AESEncrytDecry.DecryptStringAES(Request.QueryString["STATUS"]);
        string RoleID = string.IsNullOrEmpty(Request.QueryString["RoleID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["RoleID"]);
        string mode = string.IsNullOrEmpty(Request.QueryString["MODE"]) ? "FLAGS" : AESEncrytDecry.DecryptStringAES(Request.QueryString["MODE"]);

        DataTable dt = DataAccess.GetPatientFlags(status, RoleID, mode);
        ds.Tables.Add(dt);
        return ds;
    }
    private DataSet UpdateFlagStatus()
    {
        DataSet ds = new DataSet();
        string flagID = string.IsNullOrEmpty(Request.QueryString["FLAGID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["FLAGID"]);
        string status = string.IsNullOrEmpty(Request.QueryString["STATUS"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["STATUS"]);
        string note = string.IsNullOrEmpty(Request.QueryString["NOTE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["NOTE"]);

        int? roleId = null;
        string roleStr = Request.QueryString["ROLEID"];
        if (!string.IsNullOrEmpty(roleStr))
        {
            roleStr = AESEncrytDecry.DecryptStringAES(roleStr);
            int parsed;
            if (int.TryParse(roleStr, out parsed))
                roleId = parsed;
        }

        DataTable dt = DataAccess.UpdateFlagStatus(flagID, status, note, roleId);
        ds.Tables.Add(dt);
        return ds;
    }
    private DataSet UpdateDefaultFood()
    {
        DataSet ds = new DataSet();
        string id = string.IsNullOrEmpty(Request.QueryString["ID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ID"]);
        string isDefaultFood = string.IsNullOrEmpty(Request.QueryString["ISDEFAULTFOOD"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ISDEFAULTFOOD"]);
        DataTable dt = DataAccess.UpdateDefaultFood(id, isDefaultFood);
        ds.Tables.Add(dt);

        return ds;
    }

    private DataSet GetservingList()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetservingList();
        ds.Tables.Add(dt);
        return ds;
    }
    private DataSet GetservingCode()
    {
        DataSet ds = new DataSet();
        string checkCode = string.IsNullOrEmpty(Request.QueryString["CODE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["CODE"]);
        DataTable dt = DataAccess.GetservingCode(checkCode);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetServings()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetServings();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetDefaultPreOrder()
    {
        string PatientID = string.IsNullOrEmpty(Request.QueryString["PATIENTID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["PATIENTID"].ToString());
        string RoomNo = string.IsNullOrEmpty(Request.QueryString["ROOMNO"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ROOMNO"].ToString());
        string MealType = string.IsNullOrEmpty(Request.QueryString["MEALTYPE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["MEALTYPE"].ToString());

        DataTable Dt = DataAccess.GetDefaultPreOrder(PatientID, RoomNo, MealType);

        DataSet DS = new DataSet();
        DS.Tables.Add(Dt);
        return DS;
    }

    private DataSet SaveDietitianSession()
    {
        string SessionID = string.IsNullOrEmpty(Request.QueryString["SESSIONID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["SESSIONID"].ToString());
        string SessionDate = string.IsNullOrEmpty(Request.QueryString["SESSIONDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["SESSIONDATE"].ToString());
        string SessionTime = string.IsNullOrEmpty(Request.QueryString["SESSIONTIME"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["SESSIONTIME"].ToString());
        string Servings = string.IsNullOrEmpty(Request.QueryString["SERVINGS"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["SERVINGS"].ToString());
        string Wards = string.IsNullOrEmpty(Request.QueryString["WARDS"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["WARDS"].ToString());
        string UserID = string.IsNullOrEmpty(Request.QueryString["USERID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["USERID"].ToString());

        DataTable table = generate();
        DataRow row = table.NewRow();

        if (SessionDate == string.Empty || SessionTime == string.Empty || Servings == string.Empty || Wards == string.Empty)
        {
            row["RESULT"] = "FALSE";
        }
        else
        {
            DataTable Dt = DataAccess.SaveDietitianSession(SessionID, SessionDate, SessionTime, Servings, Wards, UserID);
            row["RESULT"] = Dt.Rows[0]["RESULT"].ToString();
        }

        table.Rows.Add(row);
        DataSet DS = new DataSet();
        DS.Tables.Add(table);
        return DS;
    }

    private DataSet GetDietitianSessions()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetDietitianSessions();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet DeleteDietitianSession()
    {
        string SessionID = string.IsNullOrEmpty(Request.QueryString["SESSIONID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["SESSIONID"].ToString());
        string UserID = string.IsNullOrEmpty(Request.QueryString["USERID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["USERID"].ToString());

        DataTable table = generate();
        DataRow row = table.NewRow();

        if (SessionID == "0" || SessionID == string.Empty)
        {
            row["RESULT"] = "FALSE";
        }
        else
        {
            DataTable Dt = DataAccess.DeleteDietitianSession(SessionID, UserID);
            row["RESULT"] = Dt.Rows[0]["RESULT"].ToString();
        }

        table.Rows.Add(row);
        DataSet DS = new DataSet();
        DS.Tables.Add(table);
        return DS;
    }

    private DataSet SaveDietitianOrder()
    {
        string OrderID = string.IsNullOrEmpty(Request.QueryString["ORDERID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ORDERID"].ToString());
        string SessionID = string.IsNullOrEmpty(Request.QueryString["SESSIONID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["SESSIONID"].ToString());
        string Room = string.IsNullOrEmpty(Request.QueryString["ROOM"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ROOM"].ToString());
        string Ward = string.IsNullOrEmpty(Request.QueryString["WARD"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["WARD"].ToString());
        string Serving = string.IsNullOrEmpty(Request.QueryString["SERVING"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["SERVING"].ToString());
        string Items = string.IsNullOrEmpty(Request.QueryString["ITEMS"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ITEMS"].ToString());
        string UserID = string.IsNullOrEmpty(Request.QueryString["USERID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["USERID"].ToString());

        DataTable table = new DataTable();
        table.Columns.Add("RESULT", typeof(string));
        table.Columns.Add("Message", typeof(string));

        DataRow row = table.NewRow();

        if (Room == string.Empty || Ward == string.Empty || Serving == string.Empty || Items == string.Empty)
        {
            row["RESULT"] = "Error";
            row["Message"] = "Missing required fields.";
        }
        else
        {
            DataTable Dt = DataAccess.SaveDietitianOrder(OrderID, SessionID, Room, Ward, Serving, Items, UserID);

            string result = "";
            string message = "";

            if (Dt != null && Dt.Rows.Count > 0)
            {
                if (Dt.Columns.Contains("RESULT"))
                {
                    result = Dt.Rows[0]["RESULT"].ToString();
                }
                if (Dt.Columns.Contains("Message"))
                {
                    message = Dt.Rows[0]["Message"].ToString();
                }
            }

            row["RESULT"] = string.IsNullOrEmpty(result) ? "Error" : result;
            row["Message"] = message;
        }

        table.Rows.Add(row);

        DataSet DS = new DataSet();
        DS.Tables.Add(table);
        return DS;
    }

    private DataSet GetDietitianOrders()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetDietitianOrders();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet DeleteDietitianOrder()
    {
        string OrderID = string.IsNullOrEmpty(Request.QueryString["ORDERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ORDERID"].ToString());

        DataTable table = generate();
        DataRow row = table.NewRow();

        if (OrderID == string.Empty)
        {
            row["RESULT"] = "FALSE";
        }
        else
        {
            DataTable Dt = DataAccess.DeleteDietitianOrder(OrderID);
            row["RESULT"] = Dt.Rows[0]["RESULT"].ToString();
        }

        table.Rows.Add(row);
        DataSet DS = new DataSet();
        DS.Tables.Add(table);
        return DS;
    }

    private DataSet GetWardRooms()
    {
        string Ward = string.IsNullOrEmpty(Request.QueryString["WARD"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["WARD"].ToString());

        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetWardRooms(Ward);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetWardRoomsForBulk()
    {
        string Ward = string.IsNullOrEmpty(Request.QueryString["WARD"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["WARD"].ToString());

        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetWardRoomsForBulk(Ward);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetMenuMasterItems()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetMenuMasterItems();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetMealTimingss()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetMealTimingss();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetFoodOrderingFlag()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetFoodOrderingFlag();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet BulkInsertOrdersExcel()
    {
        DataSet ds = new DataSet();

        string RoomNo = string.IsNullOrEmpty(Request["ROOMNO"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ROOMNO"]);
        string ItemName = string.IsNullOrEmpty(Request["ITEM_NAME"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ITEM_NAME"]);
        string Quantity = string.IsNullOrEmpty(Request["QUANTITY"]) ? "1" : AESEncrytDecry.DecryptStringAES(Request["QUANTITY"]);
        string MealType = string.IsNullOrEmpty(Request["MEALTYPE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["MEALTYPE"]);
        string SpecialInstruction = string.IsNullOrEmpty(Request["SPECIALINSTRUCTION"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["SPECIALINSTRUCTION"]);
        string UserId = string.IsNullOrEmpty(Request["USER_ID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request["USER_ID"]);
        string PreOrderInput = string.IsNullOrEmpty(Request["PREORDER_INPUT"]) ? "NO" : AESEncrytDecry.DecryptStringAES(Request["PREORDER_INPUT"]);
        string DefaultOrderInput = string.IsNullOrEmpty(Request["DEFAULT_ORDER_INPUT"]) ? "NO" : AESEncrytDecry.DecryptStringAES(Request["DEFAULT_ORDER_INPUT"]);

        DataTable dt = DataAccess.BulkInsertOrdersExcel(RoomNo, ItemName, Quantity, MealType, SpecialInstruction, UserId, PreOrderInput, DefaultOrderInput);
        ds.Tables.Add(dt);

        return ds;
    }

    private DataSet GetCountries()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetCountries();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetDietReport()
    {
        DataSet ds = new DataSet();
        string fromDate = string.IsNullOrEmpty(Request.QueryString["FROMDATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["FROMDATE"]);
        string toDate = string.IsNullOrEmpty(Request.QueryString["TODATE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["TODATE"]);
        string dietType = string.IsNullOrEmpty(Request.QueryString["DIETTYPE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["DIETTYPE"]);
        string search = string.IsNullOrEmpty(Request.QueryString["SEARCH"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["SEARCH"]);
        DataTable dt = DataAccess.GetDietReport(fromDate, toDate, dietType, search);
        ds.Tables.Add(dt);

        return ds;
    }

    private DataSet GetBulkMenuItems()
    {
        string Category = string.IsNullOrEmpty(Request.QueryString["CATEGORY"])
            ? ""
            : AESEncrytDecry.DecryptStringAES(Request.QueryString["CATEGORY"].ToString());

        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetBulkMenuItems(Category);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet SaveBulkOrder()
    {
        DataSet ds = new DataSet();

        string MealType = string.IsNullOrEmpty(Request["MEALTYPE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["MEALTYPE"]);
        string OrderDate = string.IsNullOrEmpty(Request["ORDERDATE"]) ? DateTime.Now.ToString("yyyy-MM-dd") : AESEncrytDecry.DecryptStringAES(Request["ORDERDATE"]);
        string ItemIds = string.IsNullOrEmpty(Request["ITEMIDS"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["ITEMIDS"]);
        string Quantities = string.IsNullOrEmpty(Request["QUANTITIES"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["QUANTITIES"]);
        string UserId = string.IsNullOrEmpty(Request["USERID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request["USERID"]);
        string UserName = string.IsNullOrEmpty(Request["USERNAME"]) ? "System" : AESEncrytDecry.DecryptStringAES(Request["USERNAME"]);

        DataTable dt = DataAccess.SaveBulkOrder(MealType, OrderDate, ItemIds, Quantities, UserId, UserName);
        ds.Tables.Add(dt);

        return ds;
    }
    private DataSet GetFastingMenuItems()
    {
        DataSet ds = new DataSet();
        string PatientID = string.IsNullOrEmpty(Request["PATIENTID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request["PATIENTID"]);
        string Action = string.IsNullOrEmpty(Request["ACTION"]) ? "GET" : AESEncrytDecry.DecryptStringAES(Request["ACTION"]);
        string IsFasting = string.IsNullOrEmpty(Request["ISFASTING"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request["ISFASTING"]);
        string FastingStart = string.IsNullOrEmpty(Request["FASTINGSTART"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["FASTINGSTART"]);
        string FastingEnd = string.IsNullOrEmpty(Request["FASTINGEND"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["FASTINGEND"]);
        string FastingMenuIds = string.IsNullOrEmpty(Request["FASTINGMENUIDS"]) ? "" : AESEncrytDecry.DecryptStringAES(Request["FASTINGMENUIDS"]);

        DataTable dt = DataAccess.GetFastingMenuItems(PatientID, Action, IsFasting, FastingStart, FastingEnd, FastingMenuIds);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet NotifyDelay()
    {
        DataSet ds = new DataSet();
        string orderId = string.IsNullOrEmpty(Request.QueryString["ORDERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ORDERID"]);
        string minutes = string.IsNullOrEmpty(Request.QueryString["MINUTES"]) ? "15" : AESEncrytDecry.DecryptStringAES(Request.QueryString["MINUTES"]);
        string reason = string.IsNullOrEmpty(Request.QueryString["REASON"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["REASON"]);
        string user = string.IsNullOrEmpty(Request.QueryString["USER"]) ? "System" : AESEncrytDecry.DecryptStringAES(Request.QueryString["USER"]);

        DataTable dt = DataAccess.NotifyDelay(orderId, minutes, reason, user);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetAlternateMenu()
    {
        DataSet ds = new DataSet();
        string orderId = string.IsNullOrEmpty(Request.QueryString["ORDERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ORDERID"]);
        string category = string.IsNullOrEmpty(Request.QueryString["CATEGORY"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["CATEGORY"]);
        string servingTime = string.IsNullOrEmpty(Request.QueryString["SERVINGTIME"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["SERVINGTIME"]);

        DataTable dt = DataAccess.GetAlternateMenu(orderId, category, servingTime);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet ApplyAlternateMenu()
    {
        DataSet ds = new DataSet();
        try
        {
            string orderId = string.IsNullOrEmpty(Request.QueryString["ORDERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ORDERID"]);
            string oldRowId = string.IsNullOrEmpty(Request.QueryString["OLDITEMID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["OLDITEMID"]);
            string newItemId = string.IsNullOrEmpty(Request.QueryString["NEWITEMID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["NEWITEMID"]);
            string reason = string.IsNullOrEmpty(Request.QueryString["REASON"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["REASON"]);
            string user = string.IsNullOrEmpty(Request.QueryString["USER"]) ? "System" : AESEncrytDecry.DecryptStringAES(Request.QueryString["USER"]);

            DataTable dt = DataAccess.ApplyAlternateMenu(orderId, oldRowId, newItemId, reason, user);
            ds.Tables.Add(dt);
        }
        catch (Exception ex)
        {
            DataTable dt = new DataTable();
            dt.Columns.Add("RESULT");
            dt.Columns.Add("MESSAGE");
            dt.Rows.Add("FALSE", "Decryption/Processing Error: " + ex.Message);
            ds.Tables.Add(dt);
        }

        return ds;
    }


    private DataSet DenyFoodItem()
    {
        DataSet ds = new DataSet();
        string rowId = string.IsNullOrEmpty(Request.QueryString["ROWID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ROWID"]);
        string reason = string.IsNullOrEmpty(Request.QueryString["REASON"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["REASON"]);
        string user = string.IsNullOrEmpty(Request.QueryString["USER"]) ? "System" : AESEncrytDecry.DecryptStringAES(Request.QueryString["USER"]);

        DataTable dt = DataAccess.DenyFoodItem(rowId, reason, user);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet LO_GetOrders()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.LO_GetOrdersData();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet LO_GetDefaultPreOrder()
    {
        DataSet ds = new DataSet();
        string patientId = string.IsNullOrEmpty(Request.QueryString["PATIENTID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["PATIENTID"]);
        string roomNo = string.IsNullOrEmpty(Request.QueryString["ROOMNO"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ROOMNO"]);
        string mealType = string.IsNullOrEmpty(Request.QueryString["MEALTYPE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["MEALTYPE"]);

        DataTable dt = DataAccess.LO_GetDefaultPreOrderData(patientId, roomNo, mealType);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet LO_SaveOrder()
    {
        DataSet ds = new DataSet();
        string orderId = string.IsNullOrEmpty(Request.QueryString["ORDERID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ORDERID"]);
        string sessionId = string.IsNullOrEmpty(Request.QueryString["SESSIONID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["SESSIONID"]);
        string room = string.IsNullOrEmpty(Request.QueryString["ROOM"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ROOM"]);
        string ward = string.IsNullOrEmpty(Request.QueryString["WARD"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["WARD"]);
        string serving = string.IsNullOrEmpty(Request.QueryString["SERVING"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["SERVING"]);
        string items = string.IsNullOrEmpty(Request.QueryString["ITEMS"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ITEMS"]);
        string userId = string.IsNullOrEmpty(Request.QueryString["USERID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["USERID"]);

        string isPreorderStr = string.IsNullOrEmpty(Request.QueryString["ISPREORDER"]) ? "0" : Request.QueryString["ISPREORDER"];

        int isPreorder = 0;
        int.TryParse(isPreorderStr, out isPreorder);

        DataTable dt = DataAccess.LO_SaveOrderData(orderId, sessionId, room, ward, serving, items, userId, isPreorder);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet LO_DeleteOrder()
    {
        DataSet ds = new DataSet();
        string orderId = string.IsNullOrEmpty(Request.QueryString["ORDERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ORDERID"]);
        string userId = string.IsNullOrEmpty(Request.QueryString["USERID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["USERID"]);

        DataTable dt = DataAccess.LO_DeleteOrderData(orderId, userId);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet LO_RemoveDefaultFood()
    {
        DataSet ds = new DataSet();
        string orderId = string.IsNullOrEmpty(Request.QueryString["ORDERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ORDERID"]);
        string userId = string.IsNullOrEmpty(Request.QueryString["USERID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["USERID"]);

        DataTable dt = DataAccess.LO_RemoveDefaultFoodData(orderId, userId);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet LO_DenyFood()
    {
        DataSet ds = new DataSet();
        string rowId = string.IsNullOrEmpty(Request.QueryString["ROWID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ROWID"]);
        string reason = string.IsNullOrEmpty(Request.QueryString["REASON"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["REASON"]);
        string user = string.IsNullOrEmpty(Request.QueryString["USER"]) ? "System" : AESEncrytDecry.DecryptStringAES(Request.QueryString["USER"]);

        DataTable dt = DataAccess.LO_DenyFoodData(rowId, reason, user);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet LO_GetWardRooms()
    {
        DataSet ds = new DataSet();
        string ward = string.IsNullOrEmpty(Request.QueryString["WARD"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["WARD"]);
        DataTable dt = DataAccess.LO_GetWardRoomsData(ward);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet LO_GetServings()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.LO_GetServingsData();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet LO_GetMealTimings()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.LO_GetMealTimingsData();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet LO_GetMenuMasterItems()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.LO_GetMenuMasterItemsData();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet INSERTUPDATEPATIENTDIETASSIGNMENT()
    {
        string PatientName = (string.IsNullOrEmpty(Request.QueryString["PATIENTNAME"])) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["PATIENTNAME"].ToString());
        string Room = (string.IsNullOrEmpty(Request.QueryString["ROOM"])) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ROOM"].ToString());
        string CountryId = (string.IsNullOrEmpty(Request.QueryString["COUNTRYID"])) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["COUNTRYID"].ToString());
        string Bed = (string.IsNullOrEmpty(Request.QueryString["BED"])) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["BED"].ToString());
        string Ward = (string.IsNullOrEmpty(Request.QueryString["WARD"])) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["WARD"].ToString());
        string Doctor = (string.IsNullOrEmpty(Request.QueryString["DOCTOR"])) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["DOCTOR"].ToString());
        string Age = (string.IsNullOrEmpty(Request.QueryString["AGE"])) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["AGE"].ToString());
        string Gender = (string.IsNullOrEmpty(Request.QueryString["GENDER"])) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["GENDER"].ToString());
        string DietType = (string.IsNullOrEmpty(Request.QueryString["DIETTYPE"])) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["DIETTYPE"].ToString());
        string Allergies = (string.IsNullOrEmpty(Request.QueryString["ALLERGIES"])) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ALLERGIES"].ToString());
        string MedicalNotes = (string.IsNullOrEmpty(Request.QueryString["MEDICALNOTES"])) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["MEDICALNOTES"].ToString());
        string DietaryNotes = (string.IsNullOrEmpty(Request.QueryString["DIETARYNOTES"])) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["DIETARYNOTES"].ToString());
        string IsIsolation = (string.IsNullOrEmpty(Request.QueryString["ISISOLATION"])) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ISISOLATION"].ToString());
        string IsolationReason = (string.IsNullOrEmpty(Request.QueryString["ISOLATIONREASON"])) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ISOLATIONREASON"].ToString());
        string IsUrgentDiet = string.IsNullOrEmpty(Request.QueryString["ISURGENTDIET"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ISURGENTDIET"]);
        string IsActive = (string.IsNullOrEmpty(Request.QueryString["ISACTIVE"])) ? "1" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ISACTIVE"].ToString());
        string Action = (string.IsNullOrEmpty(Request.QueryString["ACTION"])) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ACTION"].ToString());
        string ID = (string.IsNullOrEmpty(Request.QueryString["ID"])) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ID"].ToString());
        DataTable table = generate();

        DataRow row = table.NewRow();

        if (PatientName == string.Empty || Room == string.Empty || Ward == string.Empty || Doctor == string.Empty)
        {
            row["RESULT"] = "FALSE";
        }
        else
        {
            DataTable Dt = null;

            if (PatientName != DataAccess.InvalidStr && Room != DataAccess.InvalidStr && Bed != DataAccess.InvalidStr && Ward != DataAccess.InvalidStr && Doctor != DataAccess.InvalidStr && Age != DataAccess.InvalidStr && Gender != DataAccess.InvalidStr && DietType != DataAccess.InvalidStr && Allergies != DataAccess.InvalidStr && MedicalNotes != DataAccess.InvalidStr && DietaryNotes != DataAccess.InvalidStr && IsActive != DataAccess.InvalidStr && Action != DataAccess.InvalidStr && ID != DataAccess.InvalidStr)
            {
                Dt = DataAccess.InsertUpdatePatientDietAssignment(PatientName, Room, CountryId, Bed, Ward, Doctor, Age, Gender, DietType, Allergies, MedicalNotes, DietaryNotes, IsIsolation, IsolationReason, IsActive, Action, ID, IsUrgentDiet);
            }

            row["RESULT"] = (Dt != null && Dt.Rows.Count > 0) ? Dt.Rows[0]["RESULT"].ToString() : "FALSE";
        }

        table.Rows.Add(row);
        DataSet DS = new DataSet();
        DS.Tables.Add(table);
        return DS;
    }

    private DataSet GetDietTypeList()
    {
        DataSet ds = new DataSet();
        string SearchText = string.IsNullOrEmpty(Request.QueryString["SEARCHTEXT"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["SEARCHTEXT"]);
        string Category = string.IsNullOrEmpty(Request.QueryString["CATEGORY"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["CATEGORY"]);
        string IncludeInactive = string.IsNullOrEmpty(Request.QueryString["INCLUDEINACTIVE"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["INCLUDEINACTIVE"]);
        DataTable dt = DataAccess.GetDietTypeList(SearchText, Category, IncludeInactive);

        ds.Tables.Add(dt);

        return ds;
    }

    private DataSet GetDietTypeById()
    {
        DataSet ds = new DataSet();

        string ID = string.IsNullOrEmpty(Request.QueryString["ID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ID"]);
        DataTable dt = DataAccess.GetDietTypeById(ID);

        ds.Tables.Add(dt);

        return ds;
    }

    private DataSet InsertUpdateMenuItem()
    {
        DataSet ds = new DataSet();

        string FoodName = string.IsNullOrEmpty(Request.QueryString["FOODNAME"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["FOODNAME"]);
        string Category = string.IsNullOrEmpty(Request.QueryString["CATEGORY"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["CATEGORY"]);
        string Description = string.IsNullOrEmpty(Request.QueryString["DESCRIPTION"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["DESCRIPTION"]);
        string ServingCode = string.IsNullOrEmpty(Request.QueryString["SERVINGCODE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["SERVINGCODE"]);
        string AllowedDietType = string.IsNullOrEmpty(Request.QueryString["ALLOWEDDIETTYPE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ALLOWEDDIETTYPE"]);
        string Allergens = string.IsNullOrEmpty(Request.QueryString["ALLERGENS"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ALLERGENS"]);
        string Tags = string.IsNullOrEmpty(Request.QueryString["TAGS"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["TAGS"]);
        string ImagePath = string.IsNullOrEmpty(Request.QueryString["IMAGEPATH"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["IMAGEPATH"]);
        string IsActive = string.IsNullOrEmpty(Request.QueryString["ISACTIVE"]) ? "1" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ISACTIVE"]);
        string Action = string.IsNullOrEmpty(Request.QueryString["ACTION"]) ? "INSERT" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ACTION"]);
        string IsDefaultOrder = string.IsNullOrEmpty(Request.QueryString["ISDEFAULTORDER"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ISDEFAULTORDER"]);
        string Id = string.IsNullOrEmpty(Request.QueryString["ID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ID"]);
        string CountryId = string.IsNullOrEmpty(Request.QueryString["COUNTRYID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["COUNTRYID"]);
        string Calories = string.IsNullOrEmpty(Request.QueryString["CALORIES"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["CALORIES"]);
        string Price = string.IsNullOrEmpty(Request.QueryString["PRICE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["PRICE"]);
        string DietaryType = string.IsNullOrEmpty(Request.QueryString["DIETARYTYPE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["DIETARYTYPE"]);
        string Day = string.IsNullOrEmpty(Request.QueryString["DAY"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["DAY"]);
        string Protein = string.IsNullOrEmpty(Request.QueryString["PROTEIN"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["PROTEIN"]);
        string Carbs = string.IsNullOrEmpty(Request.QueryString["CARBS"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["CARBS"]);
        string TotalFat = string.IsNullOrEmpty(Request.QueryString["TOTALFAT"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["TOTALFAT"]);
        string Sodium = string.IsNullOrEmpty(Request.QueryString["SODIUM"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["SODIUM"]);
        string Sugar = string.IsNullOrEmpty(Request.QueryString["SUGAR"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["SUGAR"]);
        string Ingredients = string.IsNullOrEmpty(Request.QueryString["INGREDIENTS"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["INGREDIENTS"]);
        string Vendor = string.IsNullOrEmpty(Request.QueryString["VENDOR"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["VENDOR"]);
        string HISID = string.IsNullOrEmpty(Request.QueryString["HISID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["HISID"]);

        DataTable dt = DataAccess.InsertUpdateMenuItem(
            FoodName, Category, Description, ServingCode, AllowedDietType, Allergens, Tags,
            ImagePath, IsActive, Action, IsDefaultOrder, Id, CountryId, Calories,
            Price, DietaryType, Day, Protein, Carbs, TotalFat, Sodium, Sugar, Ingredients, Vendor, HISID
        );

        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetPatientDietAssignment()
    {
        DataSet ds = new DataSet();

        string PatientName = (string.IsNullOrEmpty(Request.QueryString["PATIENTNAME"])) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["PATIENTNAME"].ToString());
        string Ward = string.IsNullOrWhiteSpace(Request.QueryString["WARD"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["WARD"].ToString());
        string Doctor = (string.IsNullOrEmpty(Request.QueryString["DOCTOR"])) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["DOCTOR"].ToString());
        string DietType = (string.IsNullOrEmpty(Request.QueryString["DIETTYPE"])) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["DIETTYPE"].ToString());
        string Status = (string.IsNullOrEmpty(Request.QueryString["STATUS"])) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["STATUS"].ToString());

        DataTable dt = DataAccess.GetPatientDietAssignment(PatientName, Ward, Doctor, DietType, Status);
        ds.Tables.Add(dt);

        return ds;
    }
    private DataSet InsertUpdateDietType()
    {
        DataSet ds = new DataSet();

        string Code = string.IsNullOrEmpty(Request.QueryString["CODE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["CODE"].ToString());
        string Name = string.IsNullOrEmpty(Request.QueryString["NAME"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["NAME"].ToString());
        string Category = string.IsNullOrEmpty(Request.QueryString["CATEGORY"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["CATEGORY"].ToString());
        string Restriction = string.IsNullOrEmpty(Request.QueryString["RESTRICTION"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["RESTRICTION"].ToString());
        string Description = string.IsNullOrEmpty(Request.QueryString["DESCRIPTION"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["DESCRIPTION"].ToString());
        string IsActive = string.IsNullOrEmpty(Request.QueryString["ISACTIVE"]) ? "1" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ISACTIVE"].ToString());
        string Action = string.IsNullOrEmpty(Request.QueryString["ACTION"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ACTION"]);
        string Id = string.IsNullOrEmpty(Request.QueryString["ID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ID"]);

        DataTable dt = DataAccess.InsertUpdateDietType(Code, Name, Category, Restriction, Description, IsActive, Action, Id);

        ds.Tables.Add(dt);

        return ds;
    }
    private DataSet GetMenuTypeList()
    {
        DataSet ds = new DataSet();
        string SearchText = string.IsNullOrEmpty(Request.QueryString["SEARCHTEXT"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["SEARCHTEXT"]);
        string Servingcode = string.IsNullOrEmpty(Request.QueryString["SERVINGCODE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["SERVINGCODE"]);
        string DietType = string.IsNullOrEmpty(Request.QueryString["DIETTYPE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["DIETTYPE"]);
        string IncludeInactive = string.IsNullOrEmpty(Request.QueryString["INCLUDEINACTIVE"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["INCLUDEINACTIVE"]);
        string CountryId = string.IsNullOrEmpty(Request.QueryString["COUNTRYID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["COUNTRYID"]);

        DataTable dt = DataAccess.GetMenuTypeList(SearchText, Servingcode, DietType, IncludeInactive, CountryId);

        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetMenuTypeById()
    {
        DataSet ds = new DataSet();

        string Id = string.IsNullOrEmpty(Request.QueryString["ID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ID"]);

        DataTable dt = DataAccess.GetMenuTypeById(Id);

        ds.Tables.Add(dt);

        return ds;
    }

    private DataSet GetDietCategoriesDropDown()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetDietCategoriesDropDown();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetDietTypeDropdown()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetDietTypeDropdown();
        ds.Tables.Add(dt);
        return ds;
    }
    private DataSet GetServingDropdown()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetServingDropdown();
        ds.Tables.Add(dt);
        return ds;
    }
    private DataSet GetWardDropdown()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetWardDropdown();
        ds.Tables.Add(dt);
        return ds;
    }
    private DataSet InsertUpdateKitchen()
    {
        DataSet ds = new DataSet();
        string kitchenName = string.IsNullOrEmpty(Request.QueryString["KITCHENNAME"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["KITCHENNAME"]);
        string kitchenCode = string.IsNullOrEmpty(Request.QueryString["KITCHENCODE"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["KITCHENCODE"]);
        string capacity = string.IsNullOrEmpty(Request.QueryString["CAPACITY"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["CAPACITY"]);
        string location = string.IsNullOrEmpty(Request.QueryString["LOCATION"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["LOCATION"]);
        string wardList = string.IsNullOrEmpty(Request.QueryString["WARDLIST"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["WARDLIST"]);
        string isActive = string.IsNullOrEmpty(Request.QueryString["ISACTIVE"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ISACTIVE"]);
        string Action = string.IsNullOrEmpty(Request.QueryString["ACTION"]) ? "INSERT" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ACTION"]);
        string Id = string.IsNullOrEmpty(Request.QueryString["ID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ID"]);
        DataTable dt = DataAccess.SaveKitchen(kitchenName, kitchenCode, capacity, location, wardList, isActive, Action, Id);
        ds.Tables.Add(dt);

        return ds;
    }

    private DataSet GetKitchenList()
    {
        DataSet ds = new DataSet();
        string searchText = string.IsNullOrEmpty(Request.QueryString["SEARCHTEXT"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["SEARCHTEXT"]);
        string isActive = string.IsNullOrEmpty(Request.QueryString["ISACTIVE"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ISACTIVE"]).Trim();

        DataTable dt = DataAccess.GetKitchenList(searchText, isActive);
        ds.Tables.Add(dt);
        return ds;
    }
    private DataSet GetKitchenById()
    {
        DataSet ds = new DataSet();
        string kitchenId = string.IsNullOrEmpty(Request.QueryString["ID"]) ? "0" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ID"]);
        DataTable dt = DataAccess.GetKitchenById(kitchenId);
        ds.Tables.Add(dt);
        return ds;
    }
    private DataSet GetMealCutoffs()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetMealCutoffs();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet UpdateMealCutoffs()
    {
        DataSet ds = new DataSet();

        string breakfastTime = string.IsNullOrEmpty(Request.QueryString["BreakfastTime"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["BreakfastTime"]);
        string breakfastDay = string.IsNullOrEmpty(Request.QueryString["BreakfastDay"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["BreakfastDay"]);
        string lunchTime = string.IsNullOrEmpty(Request.QueryString["LunchTime"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["LunchTime"]);
        string lunchDay = string.IsNullOrEmpty(Request.QueryString["LunchDay"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["LunchDay"]);
        string dinnerTime = string.IsNullOrEmpty(Request.QueryString["DinnerTime"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["DinnerTime"]);
        string dinnerDay = string.IsNullOrEmpty(Request.QueryString["DinnerDay"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["DinnerDay"]);

        if (!string.IsNullOrEmpty(breakfastTime))
            DataAccess.UpdateMealCutoff("Breakfast", breakfastTime, breakfastDay);

        if (!string.IsNullOrEmpty(lunchTime))
            DataAccess.UpdateMealCutoff("Lunch", lunchTime, lunchDay);

        if (!string.IsNullOrEmpty(dinnerTime))
            DataAccess.UpdateMealCutoff("Dinner", dinnerTime, dinnerDay);
        DataTable dt = new DataTable();
        ds.Tables.Add(dt);
        return ds;

    }


    private DataSet UpdateKitchenDietMapping()
    {
        DataSet ds = new DataSet();
        string KitchenId = string.IsNullOrEmpty(Request.QueryString["KITCHENID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["KITCHENID"]);
        string DietId = string.IsNullOrEmpty(Request.QueryString["DIETID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["DIETID"]);
        string Action = string.IsNullOrEmpty(Request.QueryString["ACTION"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ACTION"]);

        DataTable dt = DataAccess.UpdateKitchenDiet(KitchenId, DietId, Action);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet GetKitchenDietMapping()
    {
        DataSet ds = new DataSet();
        string kitchenId = string.IsNullOrEmpty(Request.QueryString["KitchenID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["KitchenID"]);
        DataTable dt = DataAccess.GetKitchenDietMapping(kitchenId);

        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet UpdateFoodOrderStatusForAssembly()
    {
        DataSet ds = new DataSet();
        string orderid = string.IsNullOrEmpty(Request.QueryString["ORDERID"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["ORDERID"]);
        string status = string.IsNullOrEmpty(Request.QueryString["STATUS"]) ? "" : AESEncrytDecry.DecryptStringAES(Request.QueryString["STATUS"]);

        DataTable dt = DataAccess.UpdateFoodOrderStatusForAssembly(orderid, status);
        ds.Tables.Add(dt);
        return ds;
    }
    private DataSet GetIncomingOrders()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetIncomingOrders();
        ds.Tables.Add(dt);
        return ds;
    }
    private DataSet GetMealCutoffSettings()
    {
        DataSet ds = new DataSet();
        DataTable dt = DataAccess.GetMealCutoffSettings();
        ds.Tables.Add(dt);
        return ds;
    }

    private DataSet UpdateMealCutoffSettings()
    {
        DataSet ds = new DataSet();
        string BreakfastCutoff = string.IsNullOrEmpty(Request["BREAKFASTCUTOFF"]) ? "09:00" : AESEncrytDecry.DecryptStringAES(Request["BREAKFASTCUTOFF"]);
        string LunchCutoff = string.IsNullOrEmpty(Request["LUNCHCUTOFF"]) ? "13:00" : AESEncrytDecry.DecryptStringAES(Request["LUNCHCUTOFF"]);
        string DinnerCutoff = string.IsNullOrEmpty(Request["DINNERCUTOFF"]) ? "20:00" : AESEncrytDecry.DecryptStringAES(Request["DINNERCUTOFF"]);
        string UpdatedBy = string.IsNullOrEmpty(Request["UPDATEDBY"]) ? "System" : AESEncrytDecry.DecryptStringAES(Request["UPDATEDBY"]);
        DataTable dt = DataAccess.UpdateMealCutoffSettings(BreakfastCutoff, LunchCutoff, DinnerCutoff, UpdatedBy);
        ds.Tables.Add(dt);
        return ds;
    }

    private DataTable generate()
    {
        DataColumn column;
        DataRow row;
        var table = new DataTable() { TableName = "OptionAdd" };
        column = new DataColumn();
        column.DataType = System.Type.GetType("System.String");
        column.ColumnName = "RESULT";
        table.Columns.Add(column);
        return table;
    }
}