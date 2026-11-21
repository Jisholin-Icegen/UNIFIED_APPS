using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Data;
using System.Data.SqlClient;
using System.Configuration;
using System.Net.Mail;
using System.Net;
using System.IO;
using System.Xml;
using System.Web.Services.Description;
using System.Drawing;

public class DataAccess
{
    public const string InvalidStr = "Invalid Input";

    public DataAccess()
    {

    }

    public static DataTable GetPatientDetailsById(string Id)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETPATIENTDETAILSBYID", Con);
            cmd.CommandType = CommandType.StoredProcedure;

            int parsedId = 0;
            int.TryParse(Id, out parsedId);

            cmd.Parameters.AddWithValue("@ID", parsedId);

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            throw ex;
        }
        finally
        {
            Con.Close();
        }

        return dt;
    }

    public static DataTable AddPatientDiet(string PatientId, string DietType, string DietaryNotes, string ReplaceAll)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("SP_PATIENTDIETASSIGNMENT_INSERTUPDATE", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@ID", PatientId);
            cmd.Parameters.AddWithValue("@DIETTYPE", DietType);
            cmd.Parameters.AddWithValue("@DIETARYNOTES", DietaryNotes);
            cmd.Parameters.AddWithValue("@REPLACEALL", ReplaceAll);
            cmd.Parameters.AddWithValue("@ACTION", "ADDDIET");

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch
        {
            throw;
        }
        finally
        {
            Con.Close();
        }

        return dt;
    }
    public static DataTable AddNpoOrder(string PatientId, string Reason, string StartDate, string EndDate, string Notes)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_INSERT_NPO_ORDER", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@PATIENTID", PatientId);
            cmd.Parameters.AddWithValue("@REASON", Reason);
            cmd.Parameters.AddWithValue("@STARTDATE", Convert.ToDateTime(StartDate));
            cmd.Parameters.AddWithValue("@ENDDATE", Convert.ToDateTime(EndDate));
            cmd.Parameters.AddWithValue("@NOTES", Notes);
            cmd.Parameters.AddWithValue("@NPO_FLAG", 1);
            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_INSERT_NPO_ORDER");
            dt = new DataTable();
        }
        finally
        {
            Con.Close();
        }
        return dt;
    }
    public static DataTable LiftNpoOrder(string PatientId, string Notes)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_LIFT_NPO_ORDER", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@PATIENTID", PatientId);
            cmd.Parameters.AddWithValue("@NOTES", Notes);
            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_INSERT_NPO_ORDER");
            dt = new DataTable();
        }
        finally
        {
            Con.Close();
        }
        return dt;
    }
    public static DataTable RemoveDiet(string PatientId, string diettype)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_PATIENTDIETASSIGNMENT_INSERTUPDATE", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@ID", PatientId);
            cmd.Parameters.AddWithValue("@DIETTYPE", diettype);
            cmd.Parameters.AddWithValue("@ACTION", "REMOVEDIET");
            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_INSERT_NPO_ORDER");
            dt = new DataTable();
        }
        finally
        {
            Con.Close();
        }
        return dt;
    }
    public static DataTable GetKitchenOrderReport(string planDate, string dietType, string servingType)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GET_KITCHEN_ORDER_REPORT", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@PLANDATE", planDate);
            cmd.Parameters.AddWithValue("@DIETTYPE", dietType);
            cmd.Parameters.AddWithValue("@SERVINGTYPE", servingType);
            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GET_KITCHEN_ORDER_REPORT");
            dt = new DataTable();
        }
        finally
        {
            Con.Close();
        }
        return dt;
    }
    public static DataTable GetMyStationOrders()
    {
        DataTable dt = new DataTable();
        string connString = Tenant.ConnectionString;

        using (SqlConnection Con = new SqlConnection(connString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_GET_MY_STATION_ORDERS", Con);
                cmd.CommandType = CommandType.StoredProcedure;
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_GET_MY_STATION_ORDERS");
                dt = new DataTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open) { Con.Close(); }
            }
        }
        return dt;
    }
    public static DataTable GetFeedbackforQuality()
    {
        DataTable dt = new DataTable();
        string connString = Tenant.ConnectionString;

        using (SqlConnection Con = new SqlConnection(connString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_GETPATIENTFOODORDER_FEEDBACKFORQUALITY", Con);
                cmd.CommandType = CommandType.StoredProcedure;
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_GET_MY_STATION_ORDERS");
                dt = new DataTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open) { Con.Close(); }
            }
        }
        return dt;
    }

    public static DataTable AcknowledgeQualityFeedback(string orderId, string remarks, string user)
    {
        DataTable dt = new DataTable();
        string connString = Tenant.ConnectionString;

        using (SqlConnection Con = new SqlConnection(connString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_SUBMITACKNOWLEDGE_QUALITY_FEEDBACK", Con);
                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.AddWithValue("@OrderID", orderId);
                cmd.Parameters.AddWithValue("@Remarks", remarks);
                cmd.Parameters.AddWithValue("@User", user);

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_SUBMITACKNOWLEDGE_QUALITY_FEEDBACK");
                dt.Columns.Add("RESULT");
                dt.Rows.Add("FALSE");
            }
        }
        return dt;
    }

    public static DataTable UpdateFoodOrderStatus(string id, string status)
    {
        DataTable dt = new DataTable();
        string connString = Tenant.ConnectionString;

        using (SqlConnection Con = new SqlConnection(connString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_UPDATE_FOOD_ORDER_STATUS", Con);
                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.AddWithValue("@ID", id);
                cmd.Parameters.AddWithValue("@STATUS", status);

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_UPDATE_FOOD_ORDER_STATUS");
                dt = new DataTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open) { Con.Close(); }
            }
        }
        return dt;
    }
    public static DataTable UpdateFoodOrderStatusForAll(string orderid, string status)
    {
        DataTable dt = new DataTable();
        string connString = Tenant.ConnectionString;

        using (SqlConnection Con = new SqlConnection(connString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_UPDATE_FOOD_ORDER_STATUS_FOR_ASSEMBLY", Con);
                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.AddWithValue("@ORDERID", orderid);
                cmd.Parameters.AddWithValue("@STATUS", status);

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_UPDATE_FOOD_ORDER_STATUS_FOR_ASSEMBLY");
                dt = new DataTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open) { Con.Close(); }
            }
        }
        return dt;
    }
    public static DataTable AcknowledgeFeedback(string orderid, string remark, string user)
    {
        DataTable dt = new DataTable();
        string connString = Tenant.ConnectionString;

        using (SqlConnection Con = new SqlConnection(connString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_ACKNOWLEDGE_FEEDBACK", Con);
                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.AddWithValue("@ORDERID", orderid);
                cmd.Parameters.AddWithValue("@REMARK", remark);
                cmd.Parameters.AddWithValue("@USER", user);
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_ACKNOWLEDGE_FEEDBACK");
                dt = new DataTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open) { Con.Close(); }
            }
        }
        return dt;
    }
    public static DataTable GetDischargeDashboardData(int? roleId = null)
    {
        DataTable dt = new DataTable();
        string connString = Tenant.ConnectionString;

        using (SqlConnection Con = new SqlConnection(connString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_GET_DISCHARGE_FEEDBACK_DASHBOARD", Con);
                cmd.CommandType = CommandType.StoredProcedure;

                if (roleId.HasValue)
                    cmd.Parameters.AddWithValue("@RoleID", roleId.Value);
                else
                    cmd.Parameters.AddWithValue("@RoleID", DBNull.Value);

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_GET_DISCHARGE_FEEDBACK_DASHBOARD");
            }
            finally
            {
                if (Con.State == ConnectionState.Open) { Con.Close(); }
            }
        }
        return dt;
    }

    public static DataTable SaveServing(string catCode, string catName, string servingName, string startTime, string endTime, string isActive, string Action, string Id, string iconName)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("SP_INSERTUPDATESERVING", Con);
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@CATCODE", catCode);
            cmd.Parameters.AddWithValue("@CATNAME", catName);
            cmd.Parameters.AddWithValue("@SERVINGNAME", servingName);
            cmd.Parameters.AddWithValue("@STARTTIME", startTime);
            cmd.Parameters.AddWithValue("@ENDTIME", endTime);
            cmd.Parameters.AddWithValue("@ISACTIVE", isActive);
            cmd.Parameters.AddWithValue("@ACTION", Action);
            cmd.Parameters.AddWithValue("@ID", Id);
            cmd.Parameters.AddWithValue("@ICON_NAME", (object)iconName ?? DBNull.Value);

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_INSERTUPDATESERVING");
        }
        finally
        {
            if (Con.State == ConnectionState.Open) { Con.Close(); }
        }

        return dt;
    }

    public static DataTable GetServingData(string searchText, string showInactive)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETSERVINGLIST", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@SearchText", searchText);
            cmd.Parameters.AddWithValue("@ShowInactive", showInactive);
            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETSERVINGLIST");
        }
        finally
        {
            Con.Close();
        }
        return dt;
    }

    public static DataTable GetServingById(string id)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETSERVINGBYID", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@ID", id);

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETSERVINGBYID");
        }
        finally { Con.Close(); }
        return dt;
    }
    public static DataTable GetActiveMealTypes()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETACTIVEMEALTYPES", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETSERVINGBYID");
        }
        finally { Con.Close(); }
        return dt;
    }
    public static DataTable GetOpenFlagCount(int? roleId = null)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETOPENFLAGCOUNT", Con);
            cmd.CommandType = CommandType.StoredProcedure;

            if (roleId.HasValue)
                cmd.Parameters.AddWithValue("@RoleID", roleId.Value);
            else
                cmd.Parameters.AddWithValue("@RoleID", DBNull.Value);

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();

            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETOPENFLAGCOUNT");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetPatientFlags(string status, string RoleID, string mode = "FLAGS")
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GET_PATIENTDISCHARGEFEEDBACK_FLAGS", Con);
            cmd.Parameters.AddWithValue("@Status", status);
            cmd.Parameters.AddWithValue("@RoleID", RoleID);
            cmd.Parameters.AddWithValue("@Mode", string.IsNullOrEmpty(mode) ? "FLAGS" : mode);
            cmd.CommandType = CommandType.StoredProcedure;

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();

            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GET_PATIENTDISCHARGEFEEDBACK_FLAGS");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable UpdateFlagStatus(string flagID, string status, string notes, int? roleId = null)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_UPDATEPATIENTDISCHARGEFLAGSTATUS", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@FlagID", flagID);
            cmd.Parameters.AddWithValue("@Status", status);
            cmd.Parameters.AddWithValue("@Notes", notes);

            if (roleId.HasValue)
                cmd.Parameters.AddWithValue("@RoleID", roleId.Value);
            else
                cmd.Parameters.AddWithValue("@RoleID", DBNull.Value);

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();

            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_UPDATE_FLAG_STATUS");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable UpdateDefaultFood(string id, string isDefaultFood)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("SP_UPDATEDEFAULTFOOD", Con);
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@ID", id);
            cmd.Parameters.AddWithValue("@ISDEFAULTFOOD", isDefaultFood);

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_UPDATEDEFAULTFOOD");
        }
        finally
        {
            Con.Close();
        }

        return dt;
    }

    public static DataTable GetservingList()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETSERVINGDROPDOWN", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETSERVINGBYID");
        }
        finally { Con.Close(); }
        return dt;
    }

    public static DataTable GetservingCode(string code)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_CHECKSERVINGCODE", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@CATCODE", code);

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_CHECKSERVINGCODE");
        }
        finally { Con.Close(); }
        return dt;
    }

    public static DataTable RemoveDefaultFood(string OrderID)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_DIETITIANENTRY", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "REMOVEDEFAULTFOOD");
            cmd.Parameters.AddWithValue("@OrderID", OrderID);

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_DIETITIANENTRY_REMOVEDEFAULTFOOD");
        }
        finally { Con.Close(); }
        return dt;
    }
    public static DataTable GetDefaultPreOrder(string PatientID, string RoomNo, string MealType)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_DIETITIANENTRY", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "GETDEFAULTPREORDER");
            cmd.Parameters.AddWithValue("@PatientID", string.IsNullOrEmpty(PatientID) ? 0 : Convert.ToInt32(PatientID));
            cmd.Parameters.AddWithValue("@RoomNo", RoomNo);
            cmd.Parameters.AddWithValue("@MealType", MealType);

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_DIETITIANENTRY_GETDEFAULTPREORDER");
        }
        finally { Con.Close(); }
        return dt;
    }
    public static DataTable GetServings()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_DIETITIANENTRY", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "GETSERVINGS");

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_DIETITIANENTRY_GETSERVINGS");
        }
        finally { Con.Close(); }
        return dt;
    }

    public static DataTable SaveDietitianSession(string sessionId, string sessionDate, string sessionTime, string servings, string wards, string userId)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_DIETITIANENTRY", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "SAVESESSION");
            cmd.Parameters.AddWithValue("@SessionID", Convert.ToInt32(sessionId));
            cmd.Parameters.AddWithValue("@SessionDate", sessionDate);
            cmd.Parameters.AddWithValue("@SessionTime", sessionTime);
            cmd.Parameters.AddWithValue("@Servings", servings);
            cmd.Parameters.AddWithValue("@Wards", wards);
            cmd.Parameters.AddWithValue("@UserID", Convert.ToInt32(userId));

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_DIETITIANENTRY_SAVESESSION");
        }
        finally { Con.Close(); }
        return dt;
    }

    public static DataTable GetDietitianSessions()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_DIETITIANENTRY", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "GETSESSIONS");

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_DIETITIANENTRY_GETSESSIONS");
        }
        finally { Con.Close(); }
        return dt;
    }

    public static DataTable DeleteDietitianSession(string sessionId, string userId)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_DIETITIANENTRY", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "DELETESESSION");
            cmd.Parameters.AddWithValue("@SessionID", Convert.ToInt32(sessionId));
            cmd.Parameters.AddWithValue("@UserID", Convert.ToInt32(userId));

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_DIETITIANENTRY_DELETESESSION");
        }
        finally { Con.Close(); }
        return dt;
    }

    public static DataTable SaveDietitianOrder(string orderId, string sessionId, string room, string ward, string serving, string items, string userId)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_DIETITIANENTRY", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "SAVEORDER");
            cmd.Parameters.AddWithValue("@OrderID", orderId);
            cmd.Parameters.AddWithValue("@SessionID", string.IsNullOrEmpty(sessionId) ? 0 : Convert.ToInt32(sessionId));
            cmd.Parameters.AddWithValue("@RoomNo", room);
            cmd.Parameters.AddWithValue("@Ward", ward);
            cmd.Parameters.AddWithValue("@Serving", serving);
            cmd.Parameters.AddWithValue("@Items", items);
            cmd.Parameters.AddWithValue("@UserID", Convert.ToInt32(userId));

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_DIETITIANENTRY_SAVEORDER");
        }
        finally { Con.Close(); }
        return dt;
    }

    public static DataTable GetDietitianOrders()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_DIETITIANENTRY", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "GETORDERS");

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_DIETITIANENTRY_GETORDERS");
        }
        finally { Con.Close(); }
        return dt;
    }

    public static DataTable DeleteDietitianOrder(string orderId)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_DIETITIANENTRY", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "DELETEORDER");
            cmd.Parameters.AddWithValue("@OrderID", orderId);

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_DIETITIANENTRY_DELETEORDER");
        }
        finally { Con.Close(); }
        return dt;
    }

    public static DataTable GetWardRooms(string ward)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_DIETITIANENTRY", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "GETWARDROOMS");
            cmd.Parameters.AddWithValue("@Ward", (object)ward ?? DBNull.Value);

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_DIETITIANENTRY_GETWARDROOMS");
        }
        finally { Con.Close(); }
        return dt;
    }

    public static DataTable GetWardRoomsForBulk(string ward)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_DIETITIANENTRY", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "GETWARDROOMSFORBULK");
            cmd.Parameters.AddWithValue("@Ward", (object)ward ?? DBNull.Value);

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_DIETITIANENTRY_GETWARDROOMS");
        }
        finally { Con.Close(); }
        return dt;
    }
    public static DataTable GetMenuMasterItems()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_DIETITIANENTRY", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "GETMENUMASTERITEMS");

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_DIETITIANENTRY_GETMENUMASTERITEMS");
        }
        finally { Con.Close(); }
        return dt;
    }

    public static DataTable GetMealTimingss()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_DIETITIANENTRY", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "GETMEALTIMINGS");

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_DIETITIANENTRY_GETMEALTIMINGS");
        }
        finally { Con.Close(); }
        return dt;
    }

    public static DataTable BulkInsertOrdersExcel(string RoomNo, string ItemName, string Quantity, string MealType, string SpecialInstruction, string UserId, string PreOrderInput, string DefaultOrderInput)
    {
        DataTable dt = new DataTable();
        string connString = Tenant.ConnectionString;

        using (SqlConnection Con = new SqlConnection(connString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_SUBMIT_FOOD_ORDER_EXCEL", Con);
                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.AddWithValue("@ROOMNO", RoomNo);
                cmd.Parameters.AddWithValue("@ITEM_NAME", ItemName);

                int qty = 1;
                int.TryParse(Quantity, out qty);
                cmd.Parameters.AddWithValue("@QUANTITY", qty);

                cmd.Parameters.AddWithValue("@MEALTYPE", MealType);
                cmd.Parameters.AddWithValue("@SPECIALINSTRUCTION", SpecialInstruction);
                cmd.Parameters.AddWithValue("@USER_ID", UserId);
                cmd.Parameters.AddWithValue("@PREORDER_INPUT", PreOrderInput);
                cmd.Parameters.AddWithValue("@DEFAULT_ORDER_INPUT", DefaultOrderInput);

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_SUBMIT_FOOD_ORDER_EXCEL");
                dt = new DataTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open) { Con.Close(); }
            }
        }
        return dt;
    }

    public static DataTable GetCountries()
    {
        DataTable dt = new DataTable();
        string connString = Tenant.ConnectionString;

        using (SqlConnection Con = new SqlConnection(connString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("GETCOUNTRIES", Con);
                cmd.CommandType = CommandType.StoredProcedure;

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "GETCOUNTRIES");
                dt = new DataTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open) { Con.Close(); }
            }
        }
        return dt;
    }

    public static DataTable GetDietReport(string fromDate, string toDate, string dietType, string search)
    {
        DataTable dt = new DataTable();
        string connString = Tenant.ConnectionString;

        using (SqlConnection Con = new SqlConnection(connString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_GETDIETREPORT", Con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@FROMDATE", string.IsNullOrEmpty(fromDate) ? (object)DBNull.Value : fromDate);
                cmd.Parameters.AddWithValue("@TODATE", string.IsNullOrEmpty(toDate) ? (object)DBNull.Value : toDate);
                cmd.Parameters.AddWithValue("@DIETTYPE", string.IsNullOrEmpty(dietType) ? (object)DBNull.Value : dietType);
                cmd.Parameters.AddWithValue("@SEARCH", string.IsNullOrEmpty(search) ? (object)DBNull.Value : search);
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_GETDIETREPORT");
                dt = new DataTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open) { Con.Close(); }
            }
        }
        return dt;
    }

    public static DataTable GetBulkMenuItems(string category)
    {
        DataTable dt = new DataTable();
        using (SqlConnection Con = new SqlConnection(Tenant.ConnectionString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_GETMENUDETAILSFORFOODORDER_BULK", Con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@ORDERTYPE", "visitor");
                cmd.Parameters.AddWithValue("@CATEGORY", category);
                cmd.Parameters.AddWithValue("@SERVINGTIME", DBNull.Value);

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_GETMENUDETAILSFORFOODORDER_BULK");
                dt = new DataTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open) Con.Close();
            }
        }
        return dt;
    }

    public static DataTable SaveBulkOrder(string mealType, string orderDate, string itemIds, string quantities, string userId, string userName)
    {
        DataTable dt = new DataTable();
        using (SqlConnection Con = new SqlConnection(Tenant.ConnectionString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_SAVEBULKORDER", Con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@MEALTYPE", mealType);
                cmd.Parameters.AddWithValue("@ORDERDATE", orderDate);
                cmd.Parameters.Add(new SqlParameter("@ITEMIDS", SqlDbType.NVarChar, -1) { Value = itemIds });
                cmd.Parameters.Add(new SqlParameter("@QUANTITIES", SqlDbType.NVarChar, -1) { Value = quantities });
                cmd.Parameters.AddWithValue("@USERID", string.IsNullOrEmpty(userId) ? "0" : userId);
                cmd.Parameters.AddWithValue("@USERNAME", userName);

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_SAVEBULKORDER");
                dt.Columns.Add("RESULT", typeof(string));
                dt.Columns.Add("MESSAGE", typeof(string));
                dt.Rows.Add("Error", ex.Message);
            }
            finally
            {
                if (Con.State == ConnectionState.Open) Con.Close();
            }
        }
        return dt;
    }

    public static DataTable GetFastingMenuItems(string PatientID, string Action = "GET", string IsFasting = "0", string FastingStart = "", string FastingEnd = "", string FastingMenuIds = "")
    {
        DataTable dt = new DataTable();
        using (SqlConnection Con = new SqlConnection(Tenant.ConnectionString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_GETFASTINGMENUFORPATIENT", Con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@PATIENTID", string.IsNullOrEmpty(PatientID) ? 0 : Convert.ToInt32(PatientID));
                cmd.Parameters.AddWithValue("@ACTION", Action);
                cmd.Parameters.AddWithValue("@ISFASTING", IsFasting == "1" ? true : false);
                if (string.IsNullOrEmpty(FastingStart))
                    cmd.Parameters.AddWithValue("@FASTINGSTART", DBNull.Value);
                else
                    cmd.Parameters.AddWithValue("@FASTINGSTART", Convert.ToDateTime(FastingStart));
                if (string.IsNullOrEmpty(FastingEnd))
                    cmd.Parameters.AddWithValue("@FASTINGEND", DBNull.Value);
                else
                    cmd.Parameters.AddWithValue("@FASTINGEND", Convert.ToDateTime(FastingEnd));
                cmd.Parameters.AddWithValue("@FASTINGMENUIDS", string.IsNullOrEmpty(FastingMenuIds) ? (object)DBNull.Value : FastingMenuIds);

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_GETFASTINGMENUFORPATIENT");
                dt = new DataTable();
            }
        }
        return dt;
    }

    public static DataTable NotifyDelay(string OrderID, string Minutes, string Reason, string User)
    {
        DataTable dt = new DataTable();
        using (SqlConnection Con = new SqlConnection(Tenant.ConnectionString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_GET_ALTERNATE_MENU", Con);
                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.AddWithValue("@PROCESS", "NOTIFY_DELAY");
                cmd.Parameters.AddWithValue("@ORDERID", string.IsNullOrEmpty(OrderID) ? "" : OrderID);
                cmd.Parameters.AddWithValue("@MINUTES", string.IsNullOrEmpty(Minutes) ? 15 : Convert.ToInt32(Minutes));
                cmd.Parameters.AddWithValue("@REASON", string.IsNullOrEmpty(Reason) ? (object)DBNull.Value : Reason);
                cmd.Parameters.AddWithValue("@USER", string.IsNullOrEmpty(User) ? "System" : User);

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_GET_ALTERNATE_MENU - NOTIFY_DELAY");
                dt = new DataTable();
            }
        }
        return dt;
    }

    public static DataTable GetAlternateMenu(string OrderID, string Category, string ServingTime)
    {
        DataTable dt = new DataTable();
        using (SqlConnection Con = new SqlConnection(Tenant.ConnectionString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_GET_ALTERNATE_MENU", Con);
                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.AddWithValue("@PROCESS", "ALTERNATE_MENU");
                cmd.Parameters.AddWithValue("@ORDERID", string.IsNullOrEmpty(OrderID) ? "" : OrderID);
                cmd.Parameters.AddWithValue("@CATEGORY", string.IsNullOrEmpty(Category) ? (object)DBNull.Value : Category);
                cmd.Parameters.AddWithValue("@SERVINGTIME", string.IsNullOrEmpty(ServingTime) ? (object)DBNull.Value : ServingTime);

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_GET_ALTERNATE_MENU - ALTERNATE_MENU");
                dt = new DataTable();
            }
        }
        return dt;
    }

    public static DataTable ApplyAlternateMenu(string OrderID, string OldRowId, string NewItemId, string Reason, string User)
    {
        DataTable dt = new DataTable();
        using (SqlConnection Con = new SqlConnection(Tenant.ConnectionString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_GET_ALTERNATE_MENU", Con);
                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.AddWithValue("@PROCESS", "APPLY_ALTERNATE_MENU");
                cmd.Parameters.AddWithValue("@ORDERID", string.IsNullOrEmpty(OrderID) ? (object)DBNull.Value : OrderID);

                cmd.Parameters.AddWithValue("@OLDROWID", string.IsNullOrEmpty(OldRowId) ? 0 : Convert.ToInt32(OldRowId));
                cmd.Parameters.AddWithValue("@NEWITEMID", string.IsNullOrEmpty(NewItemId) ? 0 : Convert.ToInt32(NewItemId));

                cmd.Parameters.AddWithValue("@REASON", string.IsNullOrEmpty(Reason) ? (object)DBNull.Value : Reason);
                cmd.Parameters.AddWithValue("@USER", string.IsNullOrEmpty(User) ? (object)DBNull.Value : User);

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message + " | StackTrace: " + ex.StackTrace, "SP_GET_ALTERNATE_MENU - APPLY_ALTERNATE_MENU");
                dt = new DataTable();
            }
        }
        return dt;
    }

    public static DataTable DenyFoodItem(string RowId, string Reason, string User)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("SP_DENY_FOOD_ITEM", Con);
            cmd.CommandType = CommandType.StoredProcedure;

            int parsedId = 0;
            int.TryParse(RowId, out parsedId);

            cmd.Parameters.AddWithValue("@ID", parsedId);
            cmd.Parameters.AddWithValue("@REASON", Reason);

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            throw ex;
        }
        finally
        {
            Con.Close();
        }

        return dt;
    }

    public static DataTable LO_GetOrdersData()
    {
        DataTable dt = new DataTable();
        string connString = Tenant.ConnectionString;

        using (SqlConnection Con = new SqlConnection(connString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_DIETITIANFOOD", Con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@Process", "GETORDERS_LO");

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "GETORDERS_LO");
                dt = new DataTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open) { Con.Close(); }
            }
        }
        return dt;
    }

    public static DataTable LO_GetDefaultPreOrderData(string patientId, string roomNo, string mealType)
    {
        DataTable dt = new DataTable();
        string connString = Tenant.ConnectionString;

        using (SqlConnection Con = new SqlConnection(connString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_DIETITIANFOOD", Con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@Process", "GETDEFAULTPREORDER_LO");

                int parsedPatientId = 0;
                int.TryParse(patientId, out parsedPatientId);

                cmd.Parameters.AddWithValue("@PatientID", parsedPatientId);
                cmd.Parameters.AddWithValue("@RoomNo", roomNo ?? "");
                cmd.Parameters.AddWithValue("@MealType", mealType ?? "");

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "GETDEFAULTPREORDER_LO");
                dt = new DataTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open) { Con.Close(); }
            }
        }
        return dt;
    }

    public static DataTable LO_SaveOrderData(string orderId, string sessionId, string room, string ward, string serving, string items, string userId, int isPreorder)
    {
        DataTable dt = new DataTable();
        string connString = Tenant.ConnectionString;

        using (SqlConnection Con = new SqlConnection(connString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_DIETITIANFOOD", Con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@Process", "SAVEORDER_LO");

                int parsedSessionId = 0, parsedUserId = 0;
                int.TryParse(sessionId, out parsedSessionId);
                int.TryParse(userId, out parsedUserId);

                cmd.Parameters.AddWithValue("@OrderID", orderId ?? "");
                cmd.Parameters.AddWithValue("@SessionID", parsedSessionId);
                cmd.Parameters.AddWithValue("@RoomNo", room ?? "");
                cmd.Parameters.AddWithValue("@Ward", ward ?? "");
                cmd.Parameters.AddWithValue("@Serving", serving ?? "");
                cmd.Parameters.AddWithValue("@Items", items ?? "");
                cmd.Parameters.AddWithValue("@UserID", parsedUserId);
                cmd.Parameters.AddWithValue("@IsPreorder", isPreorder);

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SAVEORDER_LO");
                dt = new DataTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open) { Con.Close(); }
            }
        }
        return dt;
    }

    public static DataTable LO_DeleteOrderData(string orderId, string userId)
    {
        DataTable dt = new DataTable();
        string connString = Tenant.ConnectionString;

        using (SqlConnection Con = new SqlConnection(connString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_DIETITIANFOOD", Con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@Process", "DELETEORDER_LO");

                int parsedUserId = 0;
                int.TryParse(userId, out parsedUserId);

                cmd.Parameters.AddWithValue("@OrderID", orderId ?? "");
                cmd.Parameters.AddWithValue("@UserID", parsedUserId);

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "DELETEORDER_LO");
                dt = new DataTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open) { Con.Close(); }
            }
        }
        return dt;
    }

    public static DataTable LO_RemoveDefaultFoodData(string orderId, string userId)
    {
        DataTable dt = new DataTable();
        string connString = Tenant.ConnectionString;

        using (SqlConnection Con = new SqlConnection(connString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_DIETITIANFOOD", Con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@Process", "REMOVEDEFAULTFOOD_LO");

                int parsedUserId = 0;
                int.TryParse(userId, out parsedUserId);

                cmd.Parameters.AddWithValue("@OrderID", orderId ?? "");
                cmd.Parameters.AddWithValue("@UserID", parsedUserId);

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "REMOVEDEFAULTFOOD_LO");
                dt = new DataTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open) { Con.Close(); }
            }
        }
        return dt;
    }

    public static DataTable LO_DenyFoodData(string rowId, string reason, string user)
    {
        DataTable dt = new DataTable();
        string connString = Tenant.ConnectionString;

        using (SqlConnection Con = new SqlConnection(connString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_DIETITIANFOOD", Con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@Process", "DENYFOOD_LO");

                int parsedId = 0;
                int.TryParse(rowId, out parsedId);

                cmd.Parameters.AddWithValue("@OrderID", parsedId.ToString());
                cmd.Parameters.AddWithValue("@Reason", reason ?? "");
                cmd.Parameters.AddWithValue("@User", user ?? "");

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "DENYFOOD_LO");
                dt = new DataTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open) { Con.Close(); }
            }
        }
        return dt;
    }

    public static DataTable LO_GetWardRoomsData(string ward)
    {
        DataTable dt = new DataTable();
        string connString = Tenant.ConnectionString;

        using (SqlConnection Con = new SqlConnection(connString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_DIETITIANFOOD", Con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@Process", "GETWARDROOMS_LO");
                cmd.Parameters.AddWithValue("@Ward", ward ?? "");

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "GETWARDROOMS_LO");
                dt = new DataTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open) { Con.Close(); }
            }
        }
        return dt;
    }

    public static DataTable LO_GetServingsData()
    {
        DataTable dt = new DataTable();
        string connString = Tenant.ConnectionString;

        using (SqlConnection Con = new SqlConnection(connString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_DIETITIANFOOD", Con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@Process", "GETSERVINGS_LO");

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "GETSERVINGS_LO");
                dt = new DataTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open) { Con.Close(); }
            }
        }
        return dt;
    }

    public static DataTable LO_GetMealTimingsData()
    {
        DataTable dt = new DataTable();
        string connString = Tenant.ConnectionString;

        using (SqlConnection Con = new SqlConnection(connString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_DIETITIANFOOD", Con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@Process", "GETMEALTIMINGS_LO");

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "GETMEALTIMINGS_LO");
                dt = new DataTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open) { Con.Close(); }
            }
        }
        return dt;
    }

    public static DataTable LO_GetMenuMasterItemsData()
    {
        DataTable dt = new DataTable();
        string connString = Tenant.ConnectionString;

        using (SqlConnection Con = new SqlConnection(connString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_DIETITIANFOOD", Con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@Process", "GETMENUMASTERITEMS_LO");

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "GETMENUMASTERITEMS_LO");
                dt = new DataTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open) { Con.Close(); }
            }
        }
        return dt;
    }
    public static DataTable GetFoodOrderingFlag()
    {
        DataTable dt = new DataTable();
        string connString = Tenant.ConnectionString;

        using (SqlConnection Con = new SqlConnection(connString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_GET_FOODORDERING_FLAG", Con);
                cmd.CommandType = CommandType.StoredProcedure;
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_GET_FOODORDERING_FLAG");
                dt = new DataTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open) { Con.Close(); }
            }
        }
        return dt;
    }



    public static DataTable InsertUpdatePatientDietAssignment(string PatientName, string RoomNumber, string CountryId, string Bed, string Ward, string Doctor, string Age, string Gender, string DietType, string Allergies, string MedicalNotes, string DietaryNotes, string IsIsolation, string IsolationReason, string IsActive, string Action, string ID, string IsUrgentDiet)
    {
        DataTable dt = new DataTable();

        SqlConnection Con = new SqlConnection(
            Tenant.ConnectionString
        );

        try
        {
            SqlCommand cmd = new SqlCommand("SP_PATIENTDIETASSIGNMENT_INSERTUPDATE", Con);

            cmd.Parameters.AddWithValue("@PATIENTNAME", PatientName);
            cmd.Parameters.AddWithValue("@ROOMNO", RoomNumber);
            cmd.Parameters.AddWithValue("@COUNTRYID", CountryId);
            cmd.Parameters.AddWithValue("@BED", Bed);
            cmd.Parameters.AddWithValue("@WARD", Ward);
            cmd.Parameters.AddWithValue("@DOCTORNAME", Doctor);
            cmd.Parameters.AddWithValue("@AGE", Age);
            cmd.Parameters.AddWithValue("@GENDER", Gender);
            cmd.Parameters.AddWithValue("@DIETTYPE", DietType);
            cmd.Parameters.AddWithValue("@ALLERGIES", Allergies);
            cmd.Parameters.AddWithValue("@MEDICALNOTES", MedicalNotes);
            cmd.Parameters.AddWithValue("@DIETARYNOTES", DietaryNotes);
            cmd.Parameters.AddWithValue("@ISISOLATION", IsIsolation);
            cmd.Parameters.AddWithValue("@ISOLATIONREASON", IsolationReason);
            cmd.Parameters.AddWithValue("@ISACTIVE", IsActive);
            cmd.Parameters.AddWithValue("@ACTION", Action);
            cmd.Parameters.AddWithValue("@ID", ID);
            cmd.Parameters.AddWithValue("@ISURGENTDIET", string.IsNullOrEmpty(IsUrgentDiet) ? "0" : IsUrgentDiet);

            cmd.CommandType = CommandType.StoredProcedure;

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);

            if (Con.State == ConnectionState.Closed)
                Con.Open();

            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_INSERTUPDATEPATIENTDIETASSIGNMENT");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }

        return dt;
    }


    public static DataTable GetPatientDietAssignment(string PatientName, string Ward, string Doctor, string DietType, string Status)
    {
        DataTable dt = new DataTable();

        SqlConnection Con = new SqlConnection(
            Tenant.ConnectionString
        );

        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETPATIENTDIETASSIGNMENT", Con);

            cmd.Parameters.AddWithValue("@PATIENTNAME", PatientName);
            cmd.Parameters.AddWithValue("@WARD", Ward);
            cmd.Parameters.AddWithValue("@DOCTOR", Doctor);
            cmd.Parameters.AddWithValue("@DIETTYPE", DietType);
            cmd.Parameters.AddWithValue("@STATUS", Status);

            cmd.CommandType = CommandType.StoredProcedure;

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);

            if (Con.State == ConnectionState.Closed)
                Con.Open();

            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETPATIENTDIETASSIGNMENT");

            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }

        return dt;
    }

    public static DataTable InsertUpdateDietType(string Code, string Name, string Category, string Restriction, string Description, string IsActive, string Action, string Id)
    {
        DataTable dt = new DataTable();

        SqlConnection Con = new SqlConnection(
            Tenant.ConnectionString
        );

        try
        {
            SqlCommand cmd = new SqlCommand("SP_INSERTUPDATEDIETTYPE", Con);

            cmd.Parameters.AddWithValue("@CODE", Code);
            cmd.Parameters.AddWithValue("@NAME", Name);
            cmd.Parameters.AddWithValue("@CATEGORY", Category);
            cmd.Parameters.AddWithValue("@RESTRICTION", Restriction);
            cmd.Parameters.AddWithValue("@DESCRIPTION", Description);
            cmd.Parameters.AddWithValue("@ISACTIVE", IsActive);
            cmd.Parameters.AddWithValue("@ACTION", Action);
            cmd.Parameters.AddWithValue("@ID", Id);

            cmd.CommandType = CommandType.StoredProcedure;

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);

            if (Con.State == ConnectionState.Closed)
                Con.Open();

            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_INSERTUPDATEDIETTYPE");

            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }

        return dt;
    }
    public static DataTable GetMenuTypeList(string SearchText, string Servingcode, string DietType, string IncludeInactive, string CountryId)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETMENUTYPELIST", Con);
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@SEARCHTEXT", SearchText);
            cmd.Parameters.AddWithValue("@SERVINGCODE", Servingcode);
            cmd.Parameters.AddWithValue("@DIETTYPE", DietType);
            cmd.Parameters.AddWithValue("@INCLUDEINACTIVE", IncludeInactive);
            cmd.Parameters.AddWithValue("@COUNTRYID", string.IsNullOrEmpty(CountryId) ? (object)DBNull.Value : CountryId);

            SqlDataAdapter da = new SqlDataAdapter(cmd);

            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETMENUTYPELIST");
        }
        finally
        {
            Con.Close();
        }

        return dt;
    }
    public static DataTable GetMenuTypeById(string Id)
    {
        DataTable dt = new DataTable();

        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETMENUTYPEBYID", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@ID", Id);
            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETMENUTYPEBYID");
        }
        finally
        {
            Con.Close();
        }

        return dt;
    }

    public static DataTable GetDietCategoriesDropDown()
    {
        DataTable dt = new DataTable();

        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_DIETCATEGORYDROPDOWN", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        finally
        {
            Con.Close();
        }

        return dt;
    }

    public static DataTable GetDietTypeDropdown()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand("SP_GETDIETTYPEDROPDOWN", Con);
        cmd.CommandType = CommandType.StoredProcedure;
        SqlDataAdapter da = new SqlDataAdapter(cmd);
        da.Fill(dt);
        return dt;
    }
    public static DataTable GetServingDropdown()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand("SP_GETSERVINGDROPDOWN", Con);
        cmd.CommandType = CommandType.StoredProcedure;
        SqlDataAdapter da = new SqlDataAdapter(cmd);
        da.Fill(dt);
        return dt;
    }
    public static DataTable GetWardDropdown()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand("SP_GETWARDDROPDOWN", Con);
        cmd.CommandType = CommandType.StoredProcedure;
        SqlDataAdapter da = new SqlDataAdapter(cmd);
        da.Fill(dt);
        return dt;
    }
    public static DataTable GetDietTypeList(string SearchText, string Category, string IncludeInactive)
    {
        DataTable dt = new DataTable();

        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETDIETTYPELIST", Con);
            cmd.Parameters.AddWithValue("@SEARCHTEXT", SearchText);
            cmd.Parameters.AddWithValue("@CATEGORY", Category);
            cmd.Parameters.AddWithValue("@INCLUDEINACTIVE", IncludeInactive);
            cmd.CommandType = CommandType.StoredProcedure;

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);

            if (Con.State == ConnectionState.Closed)
                Con.Open();

            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETDIETTYPELIST");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }

        return dt;
    }

    public static DataTable SaveKitchen(string kitchenName, string kitchenCode, string capacity, string location, string wardList, string isActive, string Action, string Id)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("SP_INSERTUPDATEKITCHEN", Con);
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@KITCHENNAME", kitchenName);
            cmd.Parameters.AddWithValue("@KITCHENCODE", kitchenCode);
            cmd.Parameters.AddWithValue("@CAPACITY", string.IsNullOrEmpty(capacity) ? 0 : Convert.ToInt32(capacity));
            cmd.Parameters.AddWithValue("@LOCATION", location);
            cmd.Parameters.AddWithValue("@WARDLIST", wardList);
            cmd.Parameters.AddWithValue("@ISACTIVE", isActive);
            cmd.Parameters.AddWithValue("@ACTION", Action);
            cmd.Parameters.AddWithValue("@ID", Id);

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_INSERTUPDATEKITCHEN");
        }
        finally
        {
            Con.Close();
        }

        return dt;
    }

    public static DataTable GetKitchenList(string searchText, string isActive)
    {
        DataTable dt = new DataTable();

        using (SqlConnection Con = new SqlConnection(Tenant.ConnectionString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_GETKITCHENLIST", Con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@SEARCHTEXT", searchText);
                cmd.Parameters.AddWithValue("@SHOWINACTIVE", isActive);
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_GETKITCHENLIST");
            }
        }

        return dt;
    }
    public static DataTable GetKitchenById(string kitchenId)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETKITCHENBYID", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@ID", kitchenId);
            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETKITCHENBYID");
        }
        finally
        {
            Con.Close();
        }

        return dt;
    }

    public static DataTable GetMealCutoffs()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETMEALCUTOFFS", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETMEALCUTOFFS");
        }
        finally
        {
            Con.Close();
        }

        return dt;
    }
    public static DataTable UpdateMealCutoff(string mealName, string cutoffTime, string dayOption)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("SP_UPDATEMEALCUTOFFS", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@MealName", mealName);
            cmd.Parameters.AddWithValue("@CutoffTime", TimeSpan.Parse(cutoffTime));
            cmd.Parameters.AddWithValue("@DayOption", dayOption);

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_UPDATEMEALCUTOFFS");
        }
        finally
        {
            Con.Close();
        }

        return dt;
    }

    public static DataTable UpdateKitchenDiet(string KitchenId, string DietId, string Action)
    {
        DataTable dt = new DataTable();
        using (SqlConnection Con = new SqlConnection(Tenant.ConnectionString))
        {
            SqlCommand cmd = new SqlCommand("SP_KITCHENDIETASSIGNMENT_INSERTUPDATE", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@KitchenId", KitchenId);
            cmd.Parameters.AddWithValue("@DietId", DietId);
            cmd.Parameters.AddWithValue("@Action", Action);

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        return dt;
    }

    public static DataTable GetKitchenDietMapping(string kitchenId)
    {
        DataTable dt = new DataTable();
        using (SqlConnection con = new SqlConnection(Tenant.ConnectionString))
        {
            SqlCommand cmd = new SqlCommand("SP_GET_KITCHEN_MAPPED_DIETS", con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@KitchenId", kitchenId);

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        return dt;
    }
    public static DataTable GetDietTypeById(string ID)
    {
        DataTable dt = new DataTable();

        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETDIETTYPEBYID", Con);

            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@ID", ID);

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);

            if (Con.State == ConnectionState.Closed)
                Con.Open();

            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETDIETTYPEBYID");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }

        return dt;
    }

    public static DataTable InsertUpdateMenuItem(
        string FoodName, string Category, string Description, string ServingCode,
        string AllowedDietType, string Allergens, string Tags, string ImagePath,
        string IsActive, string Action, string IsDefaultOrder, string Id,
        string CountryId, string Calories, string Price, string DietaryType,
        string Day, string Protein, string Carbs, string TotalFat, string Sodium,
        string Sugar, string Ingredients, string Vendor, string HISID)
    {
        DataTable dt = new DataTable();

        try
        {
            using (SqlConnection Con = new SqlConnection(Tenant.ConnectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_INSERTUPDATEMENUITEM", Con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.AddWithValue("@FOODNAME", FoodName ?? (object)DBNull.Value);
                    cmd.Parameters.AddWithValue("@CATEGORY", Category ?? (object)DBNull.Value);
                    cmd.Parameters.AddWithValue("@DESCRIPTION", Description ?? (object)DBNull.Value);
                    cmd.Parameters.AddWithValue("@SERVINGCODE", ServingCode ?? (object)DBNull.Value);
                    cmd.Parameters.AddWithValue("@ALLOWEDDIETTYPE", AllowedDietType ?? (object)DBNull.Value);
                    cmd.Parameters.AddWithValue("@ALLERGENS", Allergens ?? (object)DBNull.Value);
                    cmd.Parameters.AddWithValue("@TAGS", Tags ?? (object)DBNull.Value);
                    cmd.Parameters.AddWithValue("@IMAGEPATH", ImagePath ?? (object)DBNull.Value);
                    cmd.Parameters.AddWithValue("@ISACTIVE", IsActive ?? "0");
                    cmd.Parameters.AddWithValue("@ACTION", Action ?? "INSERT");
                    cmd.Parameters.AddWithValue("@ISDEFAULTORDER", IsDefaultOrder ?? "0");

                    if (string.IsNullOrWhiteSpace(Id))
                        cmd.Parameters.AddWithValue("@ID", DBNull.Value);
                    else
                        cmd.Parameters.AddWithValue("@ID", Convert.ToInt32(Id));

                    cmd.Parameters.AddWithValue("@COUNTRYID", string.IsNullOrWhiteSpace(CountryId) ? (object)DBNull.Value : Convert.ToInt32(CountryId));
                    cmd.Parameters.AddWithValue("@CALORIES", string.IsNullOrWhiteSpace(Calories) ? (object)DBNull.Value : Convert.ToInt32(Calories));
                    cmd.Parameters.AddWithValue("@PRICE", string.IsNullOrWhiteSpace(Price) ? (object)DBNull.Value : Convert.ToDecimal(Price));
                    cmd.Parameters.AddWithValue("@Dietary_Type", string.IsNullOrWhiteSpace(DietaryType) ? (object)DBNull.Value : DietaryType);
                    cmd.Parameters.AddWithValue("@DAY", string.IsNullOrWhiteSpace(Day) ? 0 : Convert.ToInt32(Day));
                    cmd.Parameters.AddWithValue("@PROTEIN", string.IsNullOrWhiteSpace(Protein) ? (object)DBNull.Value : Convert.ToDecimal(Protein));
                    cmd.Parameters.AddWithValue("@CARBS", string.IsNullOrWhiteSpace(Carbs) ? (object)DBNull.Value : Convert.ToDecimal(Carbs));
                    cmd.Parameters.AddWithValue("@TOTALFAT", string.IsNullOrWhiteSpace(TotalFat) ? (object)DBNull.Value : Convert.ToDecimal(TotalFat));
                    cmd.Parameters.AddWithValue("@SODIUM", string.IsNullOrWhiteSpace(Sodium) ? (object)DBNull.Value : Convert.ToDecimal(Sodium));
                    cmd.Parameters.AddWithValue("@SUGAR", string.IsNullOrWhiteSpace(Sugar) ? (object)DBNull.Value : Convert.ToDecimal(Sugar));
                    cmd.Parameters.AddWithValue("@INGREDIENTS", string.IsNullOrWhiteSpace(Ingredients) ? (object)DBNull.Value : Ingredients);
                    cmd.Parameters.AddWithValue("@VENDOR", string.IsNullOrWhiteSpace(Vendor) ? (object)DBNull.Value : Vendor);
                    cmd.Parameters.AddWithValue("@HISID", string.IsNullOrWhiteSpace(HISID) ? (object)DBNull.Value : HISID);

                    using (SqlDataAdapter da = new SqlDataAdapter(cmd))
                    {
                        da.Fill(dt);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_INSERTUPDATEMENUITEM");
        }

        return dt;
    }

    public static DataTable UpdateEquipment(string name, string shortName, string division, string isActive, string assistantRequired, string id)
    {
        DataTable dt = new DataTable();
        dt.Columns.Add("RESULT", typeof(string));

        using (SqlConnection conn = new SqlConnection(Tenant.ConnectionString))
        {
            try
            {
                conn.Open();
                using (SqlCommand cmd = new SqlCommand("SP_EQUIPMENT_INSERTUPDATE", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.AddWithValue("@NAME", name ?? "");
                    cmd.Parameters.AddWithValue("@SHORT", shortName ?? "");
                    cmd.Parameters.AddWithValue("@DIVISION", division ?? "");

                    int activeBit = (!string.IsNullOrWhiteSpace(isActive) &&
                                    (isActive.ToLower() == "true" || isActive == "1")) ? 1 : 0;
                    int assistantBit = (!string.IsNullOrWhiteSpace(assistantRequired) &&
                                       (assistantRequired.ToLower() == "yes" || assistantRequired == "1")) ? 1 : 0;

                    cmd.Parameters.AddWithValue("@ISACTIVE", activeBit);
                    cmd.Parameters.AddWithValue("@ASSISTANTREQUIRED", assistantBit);
                    cmd.Parameters.AddWithValue("@ID", string.IsNullOrWhiteSpace(id) ? (object)0 : Convert.ToInt32(id));

                    object result = cmd.ExecuteScalar();

                    if (result != null)
                    {
                        DataRow row = dt.NewRow();
                        row[0] = result.ToString();
                        dt.Rows.Add(row);
                    }

                    System.Diagnostics.Debug.WriteLine("DataTable Rows: " + dt.Rows.Count.ToString());
                    if (dt.Rows.Count > 0)
                        System.Diagnostics.Debug.WriteLine("RESULT: '" + dt.Rows[0][0].ToString() + "'");
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("ERROR: " + ex.Message);
                InsertError(ex.Message, "SP_EQUIPMENT_INSERTUPDATE");
            }
        }
        return dt;
    }

    public static DataTable ChangePwd(string userId, string password, string process)
    {
        using (SqlConnection conn = new SqlConnection(Tenant.ConnectionString))
        {
            using (SqlCommand cmd = new SqlCommand("SP_CHANGEPWD", conn))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@USERID", userId);
                cmd.Parameters.AddWithValue("@PASSWORD", password);
                cmd.Parameters.AddWithValue("@PROCESS", process);

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                DataTable dt = new DataTable();
                da.Fill(dt);

                return dt;
            }
        }
    }
    public static DataSet GetUpdateBuzzer(string alertid, string ime, string type)
    {
        DataSet ds = new DataSet();
        try
        {

            SqlDataAdapter dbAdap = new SqlDataAdapter();
            SqlConnection sqlCON = new SqlConnection(Tenant.ConnectionString);
            dbAdap.SelectCommand = new SqlCommand();
            dbAdap.SelectCommand.CommandText = "SP_ALERTRAISEDLIST";
            dbAdap.SelectCommand.CommandType = CommandType.StoredProcedure;
            dbAdap.SelectCommand.Connection = sqlCON;
            dbAdap.SelectCommand.Parameters.AddWithValue("@ptype", type);
            dbAdap.SelectCommand.Parameters.AddWithValue("@ALERTID", alertid);
            dbAdap.SelectCommand.Parameters.AddWithValue("@IMEINO", ime);
            dbAdap.Fill(ds);
            dbAdap.Dispose();
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_ALERTRAISEDLIST");
            ds = new DataSet();
        }

        return ds;
    }


    public static DataSet getPorterLocation(string tagid)
    {
        DataSet dt = new DataSet();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand("GetPorterLocation", Con);
        cmd.CommandTimeout = 1000;
        cmd.Parameters.AddWithValue("@TagId", tagid);

        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
        cmd.CommandType = CommandType.StoredProcedure;
        try
        {
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {

            InsertError(ex.Message, "SP_GETPATIENTNAMEBYBEDID");
            dt = new DataSet();

        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;

    }

    public static DataTable UpdateDepartment(string name, string description, string isActive, string id, string action, string parentDepartmentId = "")
    {
        DataTable dt = new DataTable();

        try
        {
            using (SqlConnection conn = new SqlConnection(Tenant.ConnectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_DEPARTMENTINSERTUPDATE", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.AddWithValue("@NAME", name ?? "");
                    cmd.Parameters.AddWithValue("@DESCRIPTION", description ?? "");
                    cmd.Parameters.AddWithValue("@ISACTIVE", isActive ?? "1");
                    cmd.Parameters.AddWithValue("@ID", id ?? "");
                    cmd.Parameters.AddWithValue("@ACTION", action ?? "");

                    if (string.IsNullOrEmpty(parentDepartmentId))
                    {
                        cmd.Parameters.AddWithValue("@PARENTDEPARTMENTID", DBNull.Value);
                    }
                    else
                    {
                        cmd.Parameters.AddWithValue("@PARENTDEPARTMENTID", parentDepartmentId);
                    }

                    cmd.Parameters.AddWithValue("@SERVICEID", "1");

                    using (SqlDataAdapter da = new SqlDataAdapter(cmd))
                    {
                        da.Fill(dt);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            dt.Columns.Add("RESULT");
            DataRow row = dt.NewRow();
            row["RESULT"] = "ERROR: " + ex.Message;
            dt.Rows.Add(row);
        }

        return dt;
    }

    public static DataTable UpdateDevice(string DEVICENO, string action, string Id)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_DEVICEUPDATE", Con);
            cmd.Parameters.AddWithValue("@DEVICENO", DEVICENO);
            cmd.Parameters.AddWithValue("@ACTION", action);
            cmd.Parameters.AddWithValue("@ID", SafeInt(Id));



            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_DEVICEUPDATE");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }


    public static DataTable UpdateDepartment(string name, string description, string isActive, string id, string action)
    {
        return UpdateDepartment(name, description, isActive, id, action, "");
    }

    public static DataTable DeleteDepartment(string id)
    {
        DataTable dt = new DataTable();
        using (SqlConnection conn = new SqlConnection(Tenant.ConnectionString))
        {
            using (SqlCommand cmd = new SqlCommand("SP_DEPARTMENTINSERTUPDATE", conn))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@ACTION", "DELETE");
                cmd.Parameters.AddWithValue("@ID", id);

                using (SqlDataAdapter da = new SqlDataAdapter(cmd))
                {
                    da.Fill(dt);
                }
            }
        }
        return dt;
    }

    public static DataTable SendMessage(string DeviceId, string msg, string userid, string porterid, string preqid, string preno, string process)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_MESSAGEMASTER_INSRT", Con);
            cmd.Parameters.AddWithValue("@DEVICEID", DeviceId);
            cmd.Parameters.AddWithValue("@MESSAGE", msg);
            cmd.Parameters.AddWithValue("@USERID", userid);
            cmd.Parameters.AddWithValue("@PORTERID", porterid);
            cmd.Parameters.AddWithValue("@PREVIOUSREQUESTID", preqid);
            cmd.Parameters.AddWithValue("@PREVIOUSREQUESTNO", preno);
            cmd.Parameters.AddWithValue("@PROCESS", process);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_MESSAGEMASTER_INSRT");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable SendMessageNew(string DeviceId, string msg, string userid, string porterid, string preqid, string preno, string process, string ServiceID)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_MESSAGEMASTER_INSRT", Con);
            cmd.Parameters.AddWithValue("@DEVICEID", DeviceId);
            cmd.Parameters.AddWithValue("@MESSAGE", msg);
            cmd.Parameters.AddWithValue("@USERID", userid);
            cmd.Parameters.AddWithValue("@PORTERID", porterid);
            cmd.Parameters.AddWithValue("@PREVIOUSREQUESTID", preqid);
            cmd.Parameters.AddWithValue("@PREVIOUSREQUESTNO", preno);
            cmd.Parameters.AddWithValue("@PROCESS", process);
            cmd.Parameters.AddWithValue("@SERVICEID", ServiceID);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_MESSAGEMASTER_INSRT");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }


    //public static DataTable SendMessage(string DeviceId, string msg, string userid, string porterid, string preqid, string preno, string process)
    //{
    //    DataTable dt = new DataTable();
    //    SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
    //    try
    //    {
    //        SqlCommand cmd = new SqlCommand("SP_MESSAGEMASTER_INSRT", Con);
    //        cmd.Parameters.AddWithValue("@DEVICEID", DeviceId);
    //        cmd.Parameters.AddWithValue("@MESSAGE", msg);
    //        cmd.Parameters.AddWithValue("@USERID", userid);
    //        cmd.Parameters.AddWithValue("@PORTERID", porterid);
    //        cmd.Parameters.AddWithValue("@PREVIOUSREQUESTID", preqid);
    //        cmd.Parameters.AddWithValue("@PREVIOUSREQUESTNO", preno);
    //        cmd.Parameters.AddWithValue("@PROCESS", process);
    //        cmd.CommandType = CommandType.StoredProcedure;
    //        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
    //        if (Con.State == ConnectionState.Closed)
    //            Con.Open();
    //        adpt.Fill(dt);
    //    }
    //    catch (Exception ex)
    //    {
    //        InsertError(ex.Message, "SP_TAGMESSAGEMASTER_INSRT");
    //    }
    //    finally
    //    {
    //        if (Con.State == ConnectionState.Open)
    //            Con.Close();
    //    }
    //    return dt;
    //}

    public static DataSet GetDataSet(string storedProcedureName, SqlParameter[] parameters)
    {
        DataSet ds = new DataSet();
        try
        {
            using (SqlConnection con = new SqlConnection(Tenant.ConnectionString))
            {
                using (SqlCommand cmd = new SqlCommand(storedProcedureName, con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.CommandTimeout = 1000;

                    if (parameters != null && parameters.Length > 0)
                    {
                        cmd.Parameters.AddRange(parameters);
                    }

                    using (SqlDataAdapter da = new SqlDataAdapter(cmd))
                    {
                        da.Fill(ds);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            InsertError(ex.Message.ToString(), storedProcedureName);
        }
        return ds;
    }

    public static DataSet getRecords(string SpName)
    {
        DataSet ds = new DataSet();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand(SpName, Con);
        cmd.CommandType = CommandType.StoredProcedure;
        try
        {
            SqlDataAdapter adpt = new SqlDataAdapter(cmd); Con.Open();
            adpt.Fill(ds);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, SpName);
            ds = new DataSet();
        }
        finally
        {
            while (ds.Tables.Count == 0)
            {
                SqlDataAdapter adpt = new SqlDataAdapter(cmd);
                if (Con.State == ConnectionState.Closed)
                    Con.Open();
                adpt.Fill(ds);
            }
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return ds;
    }

    public static DataTable getPatientName(string bedID)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand("SP_GETPATIENTNAMEBYBEDID", Con);
        cmd.CommandTimeout = 1000;
        cmd.Parameters.AddWithValue("@BEDID", bedID);
        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
        cmd.CommandType = CommandType.StoredProcedure;
        try
        {
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {

            InsertError(ex.Message, "SP_GETPATIENTNAMEBYBEDID");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;

    }
    public static DataSet getReqCount(string Param1, string Value1, string Param2, string Value2, string Param3, string Value3, string Param4, string Value4)
    {
        DataSet dt = new DataSet();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand("SP_REQUESTCOUNT", Con);
        cmd.CommandTimeout = 1000;
        cmd.Parameters.AddWithValue(Param1, Value1);
        cmd.Parameters.AddWithValue(Param2, Value2);
        cmd.Parameters.AddWithValue(Param3, Value3);
        cmd.Parameters.AddWithValue(Param4, Value4);
        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
        cmd.CommandType = CommandType.StoredProcedure;
        try
        {
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {

            InsertError(ex.Message, "SP_REQUESTCOUNT");
            dt = new DataSet();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;

    }

    public static DataTable GetOrdersSummary(string OrderDate)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_FOOD_ORDER", Con);
            cmd.Parameters.AddWithValue("@Process", "SUMMARY");
            cmd.Parameters.AddWithValue("@OrderDate", OrderDate);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_ORDER_SUMMARY");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetOrdersList(string OrderDate, string SearchText, string MealType, string Ward, string Kitchen, string StatusFilter)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_FOOD_ORDER", Con);
            cmd.Parameters.AddWithValue("@Process", "ORDERS");
            cmd.Parameters.AddWithValue("@OrderDate", OrderDate);
            cmd.Parameters.AddWithValue("@SearchText", string.IsNullOrEmpty(SearchText) ? (object)DBNull.Value : SearchText);
            cmd.Parameters.AddWithValue("@MealType", string.IsNullOrEmpty(MealType) ? (object)DBNull.Value : MealType);
            cmd.Parameters.AddWithValue("@Ward", string.IsNullOrEmpty(Ward) ? (object)DBNull.Value : Ward);
            cmd.Parameters.AddWithValue("@Kitchen", string.IsNullOrEmpty(Kitchen) ? (object)DBNull.Value : Kitchen);
            cmd.Parameters.AddWithValue("@StatusFilter", string.IsNullOrEmpty(StatusFilter) ? (object)DBNull.Value : StatusFilter);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_ORDER_ORDERS");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetOrderDetail(string OrderID)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_FOOD_ORDER", Con);
            cmd.Parameters.AddWithValue("@Process", "DETAIL");
            cmd.Parameters.AddWithValue("@OrderID", OrderID);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_ORDER_DETAIL");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable UpdateOrderStatus(string OrderID, string NewStatus, string UpdatedBy)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_FOOD_ORDER", Con);
            cmd.Parameters.AddWithValue("@Process", "UPDATE_STATUS");
            cmd.Parameters.AddWithValue("@OrderID", OrderID);
            cmd.Parameters.AddWithValue("@NewStatus", NewStatus);
            cmd.Parameters.AddWithValue("@UpdatedBy", UpdatedBy);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_ORDER_UPDATE_STATUS");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable UpdateEstimatedTime(string OrderID, string EstimatedTime)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_FOOD_ORDER", Con);
            cmd.Parameters.AddWithValue("@Process", "UPDATEESTIMATEDTIME");
            cmd.Parameters.AddWithValue("@OrderID", OrderID);
            cmd.Parameters.AddWithValue("@NewStatus", EstimatedTime);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_ORDER_UPDATEESTIMATEDTIME");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataSet GenerateAutoOrders(string GenMealType, string OrderDate, string UpdatedBy, string Confirm)
    {
        DataSet ds = new DataSet();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_FOOD_ORDER", Con);
            cmd.Parameters.AddWithValue("@Process", "GENERATE");
            cmd.Parameters.AddWithValue("@GenMealType", GenMealType);
            cmd.Parameters.AddWithValue("@OrderDate", OrderDate);
            cmd.Parameters.AddWithValue("@UpdatedBy", UpdatedBy);
            cmd.Parameters.AddWithValue("@Confirm", Confirm);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(ds);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_ORDER_GENERATE");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return ds;
    }

    public static DataTable GetMealTimings()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_FOOD_ORDER", Con);
            cmd.Parameters.AddWithValue("@Process", "GETMEALTIMINGS");
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_ORDER_GETMEALTIMINGS");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetDashboardSummary(string StartDate, string EndDate)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_FOOD_DASHBOARD", Con);
            cmd.Parameters.AddWithValue("@Process", "GETDASHBOARDSUMMARY");
            cmd.Parameters.AddWithValue("@StartDate", string.IsNullOrEmpty(StartDate) ? (object)DBNull.Value : StartDate);
            cmd.Parameters.AddWithValue("@EndDate", string.IsNullOrEmpty(EndDate) ? (object)DBNull.Value : EndDate);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_DASHBOARD_GETDASHBOARDSUMMARY");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetDietCategoryMix()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_FOOD_DASHBOARD", Con);
            cmd.Parameters.AddWithValue("@Process", "GETDIETCATEGORYMIX");
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_DASHBOARD_GETDIETCATEGORYMIX");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetOrderVolume(string StartDate, string EndDate)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_FOOD_DASHBOARD", Con);
            cmd.Parameters.AddWithValue("@Process", "GETORDERVOLUME");
            cmd.Parameters.AddWithValue("@StartDate", string.IsNullOrEmpty(StartDate) ? (object)DBNull.Value : StartDate);
            cmd.Parameters.AddWithValue("@EndDate", string.IsNullOrEmpty(EndDate) ? (object)DBNull.Value : EndDate);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_DASHBOARD_GETORDERVOLUME");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetTopMenuItems(string StartDate, string EndDate, int TopN)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_FOOD_DASHBOARD", Con);
            cmd.Parameters.AddWithValue("@Process", "GETTOPMENUITEMS");
            cmd.Parameters.AddWithValue("@StartDate", string.IsNullOrEmpty(StartDate) ? (object)DBNull.Value : StartDate);
            cmd.Parameters.AddWithValue("@EndDate", string.IsNullOrEmpty(EndDate) ? (object)DBNull.Value : EndDate);
            cmd.Parameters.AddWithValue("@TopN", TopN);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_DASHBOARD_GETTOPMENUITEMS");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetSLAData(string StartDate, string EndDate)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_FOOD_DASHBOARD", Con);
            cmd.Parameters.AddWithValue("@Process", "GETSLADATA");
            cmd.Parameters.AddWithValue("@StartDate", string.IsNullOrEmpty(StartDate) ? (object)DBNull.Value : StartDate);
            cmd.Parameters.AddWithValue("@EndDate", string.IsNullOrEmpty(EndDate) ? (object)DBNull.Value : EndDate);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_DASHBOARD_GETSLADATA");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataSet GetPatientSatisfaction(string StartDate, string EndDate)
    {
        DataSet ds = new DataSet();
        using (SqlConnection Con = new SqlConnection(Tenant.ConnectionString))
        {
            using (SqlCommand cmd = new SqlCommand("SP_FOOD_DASHBOARD", Con))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@Process", "GETPATIENTSATISFACTION");
                cmd.Parameters.AddWithValue("@StartDate", string.IsNullOrEmpty(StartDate) ? (object)DBNull.Value : StartDate);
                cmd.Parameters.AddWithValue("@EndDate", string.IsNullOrEmpty(EndDate) ? (object)DBNull.Value : EndDate);

                SqlDataAdapter adpt = new SqlDataAdapter(cmd);
                Con.Open();
                adpt.Fill(ds);
            }
        }
        return ds;
    }

    public static DataSet GetPatientSatisfactionWithAllData(string StartDate, string EndDate)
    {
        DataSet ds = new DataSet();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_FOOD_DASHBOARD", Con);
            cmd.Parameters.AddWithValue("@Process", "GETPATIENTSATISFACTION");
            cmd.Parameters.AddWithValue("@StartDate", string.IsNullOrEmpty(StartDate) ? (object)DBNull.Value : StartDate);
            cmd.Parameters.AddWithValue("@EndDate", string.IsNullOrEmpty(EndDate) ? (object)DBNull.Value : EndDate);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(ds);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_DASHBOARD_GETPATIENTSATISFACTIONWITHALLDATA");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return ds;
    }

    public static DataSet GetDemandForecast(string StartDate, string EndDate)
    {
        DataSet ds = new DataSet();

        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("SP_FOOD_DASHBOARD", Con);
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@Process", "GETDEMANDFORECAST");
            cmd.Parameters.AddWithValue("@StartDate", string.IsNullOrEmpty(StartDate) ? (object)DBNull.Value : StartDate);
            cmd.Parameters.AddWithValue("@EndDate", string.IsNullOrEmpty(EndDate) ? (object)DBNull.Value : EndDate);

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);

            if (Con.State == ConnectionState.Closed)
                Con.Open();

            adpt.Fill(ds);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_DASHBOARD_GETDEMANDFORECAST");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }

        return ds;
    }

    public static DataSet GetDemandForecastWithStockItems(string StartDate, string EndDate)
    {
        DataSet ds = new DataSet();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_FOOD_DASHBOARD", Con);
            cmd.Parameters.AddWithValue("@Process", "GETDEMANDFORECAST");
            cmd.Parameters.AddWithValue("@StartDate", string.IsNullOrEmpty(StartDate) ? (object)DBNull.Value : StartDate);
            cmd.Parameters.AddWithValue("@EndDate", string.IsNullOrEmpty(EndDate) ? (object)DBNull.Value : EndDate);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(ds);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_DASHBOARD_GETDEMANDFORECASTWITHSTOCKITEMS");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return ds;
    }

    public static DataTable GetStaffPerformance(string StartDate, string EndDate)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_FOOD_DASHBOARD", Con);
            cmd.Parameters.AddWithValue("@Process", "GETSTAFFPERFORMANCE");
            cmd.Parameters.AddWithValue("@StartDate", string.IsNullOrEmpty(StartDate) ? (object)DBNull.Value : StartDate);
            cmd.Parameters.AddWithValue("@EndDate", string.IsNullOrEmpty(EndDate) ? (object)DBNull.Value : EndDate);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_DASHBOARD_GETSTAFFPERFORMANCE");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetRecentOrders(string StartDate, string EndDate, int TopN)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_FOOD_DASHBOARD", Con);
            cmd.Parameters.AddWithValue("@Process", "GETRECENTORDERS");
            cmd.Parameters.AddWithValue("@StartDate", string.IsNullOrEmpty(StartDate) ? (object)DBNull.Value : StartDate);
            cmd.Parameters.AddWithValue("@EndDate", string.IsNullOrEmpty(EndDate) ? (object)DBNull.Value : EndDate);
            cmd.Parameters.AddWithValue("@TopN", TopN);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_DASHBOARD_GETRECENTORDERS");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetTrendingItems(string StartDate, string EndDate, int TopN)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_FOOD_DASHBOARD", Con);
            cmd.Parameters.AddWithValue("@Process", "GETTRENDINGITEMS");
            cmd.Parameters.AddWithValue("@StartDate", string.IsNullOrEmpty(StartDate) ? (object)DBNull.Value : StartDate);
            cmd.Parameters.AddWithValue("@EndDate", string.IsNullOrEmpty(EndDate) ? (object)DBNull.Value : EndDate);
            cmd.Parameters.AddWithValue("@TopN", TopN);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_DASHBOARD_GETTRENDINGITEMS");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetDocketsSummary(string OrderDate)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_MENU_DOCKET", Con);
            cmd.Parameters.AddWithValue("@Process", "GETDOCKETSSUMMARY");
            cmd.Parameters.AddWithValue("@OrderDate", string.IsNullOrEmpty(OrderDate) ? (object)DBNull.Value : OrderDate);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_MENU_DOCKET_GETDOCKETSSUMMARY");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetDocketsList(string OrderDate, string SearchText, string Ward)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_MENU_DOCKET", Con);
            cmd.Parameters.AddWithValue("@Process", "GETDOCKETSLIST");
            cmd.Parameters.AddWithValue("@OrderDate", string.IsNullOrEmpty(OrderDate) ? (object)DBNull.Value : OrderDate);
            cmd.Parameters.AddWithValue("@SearchText", string.IsNullOrEmpty(SearchText) ? (object)DBNull.Value : SearchText);
            cmd.Parameters.AddWithValue("@Ward", string.IsNullOrEmpty(Ward) ? (object)DBNull.Value : Ward);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_MENU_DOCKET_GETDOCKETSLIST");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable PrintDocket(string OrderID, string UpdatedBy)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_MENU_DOCKET", Con);
            cmd.Parameters.AddWithValue("@Process", "PRINTDOCKET");
            cmd.Parameters.AddWithValue("@OrderId", OrderID);
            cmd.Parameters.AddWithValue("@UpdatedBy", string.IsNullOrEmpty(UpdatedBy) ? "System" : UpdatedBy);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_MENU_DOCKET_PRINTDOCKET");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable PrintNextUnprinted(string OrderDate, string UpdatedBy)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_MENU_DOCKET", Con);
            cmd.Parameters.AddWithValue("@Process", "PRINTNEXTUNPRINTED");
            cmd.Parameters.AddWithValue("@OrderDate", string.IsNullOrEmpty(OrderDate) ? (object)DBNull.Value : OrderDate);
            cmd.Parameters.AddWithValue("@UpdatedBy", string.IsNullOrEmpty(UpdatedBy) ? "System" : UpdatedBy);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_MENU_DOCKET_PRINTNEXTUNPRINTED");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetDocketDetail(string OrderID)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_MENU_DOCKET", Con);
            cmd.Parameters.AddWithValue("@Process", "GETDOCKETDETAIL");
            cmd.Parameters.AddWithValue("@OrderId", OrderID);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_MENU_DOCKET_GETDOCKETDETAIL");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetUsers()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_UserManagement", Con);
            cmd.Parameters.AddWithValue("@Process", "GET");
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_UserManagement_GET");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetUserById(string UserId)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_UserManagement", Con);
            cmd.Parameters.AddWithValue("@Process", "GETBYID");
            cmd.Parameters.AddWithValue("@UserId", UserId);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_UserManagement_GETBYID");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable CreateUser(string UserName, string MID, string Password, string RoleId, string EmailId, string IsActive, string WardIds, string KitchenIds, string ServiceId)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_UserManagement", Con);
            cmd.Parameters.AddWithValue("@Process", "CREATE");
            cmd.Parameters.AddWithValue("@UserName", UserName);
            cmd.Parameters.AddWithValue("@MID", MID);
            cmd.Parameters.AddWithValue("@Password", Password);
            cmd.Parameters.AddWithValue("@RoleId", RoleId);
            cmd.Parameters.AddWithValue("@EmailId", EmailId);
            cmd.Parameters.AddWithValue("@IsActive", IsActive);
            cmd.Parameters.AddWithValue("@WardIds", WardIds);
            cmd.Parameters.AddWithValue("@KitchenIds", KitchenIds);
            cmd.Parameters.AddWithValue("@ServiceId", ServiceId);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_UserManagement_CREATE");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable UpdateUser(string UserId, string UserName, string MID, string Password, string RoleId, string EmailId, string IsActive, string WardIds, string KitchenIds, string ServiceId)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_UserManagement", Con);
            cmd.Parameters.AddWithValue("@Process", "UPDATE");
            cmd.Parameters.AddWithValue("@UserId", UserId);
            cmd.Parameters.AddWithValue("@UserName", UserName);
            cmd.Parameters.AddWithValue("@MID", MID);
            cmd.Parameters.AddWithValue("@Password", Password);
            cmd.Parameters.AddWithValue("@RoleId", RoleId);
            cmd.Parameters.AddWithValue("@EmailId", EmailId);
            cmd.Parameters.AddWithValue("@IsActive", IsActive);
            cmd.Parameters.AddWithValue("@WardIds", WardIds);
            cmd.Parameters.AddWithValue("@KitchenIds", KitchenIds);
            cmd.Parameters.AddWithValue("@ServiceId", ServiceId);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_UserManagement_UPDATE");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable DeleteUser(string UserId)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_UserManagement", Con);
            cmd.Parameters.AddWithValue("@Process", "DELETE");
            cmd.Parameters.AddWithValue("@UserId", UserId);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_UserManagement_DELETE");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetRoles()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_UserManagement", Con);
            cmd.Parameters.AddWithValue("@Process", "GETROLES");
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_UserManagement_GETROLES");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetWards()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_UserManagement", Con);
            cmd.Parameters.AddWithValue("@Process", "GETWARDS");
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_UserManagement_GETWARDS");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetKitchens()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_UserManagement", Con);
            cmd.Parameters.AddWithValue("@Process", "GETKITCHENS");
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_UserManagement_GETKITCHENS");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetPatientSatisfactionSummary()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETPATIENTSATISFACTION", Con);
            cmd.Parameters.AddWithValue("@Process", "SUMMARY");
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETPATIENTSATISFACTION_SUMMARY");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetPatientSatisfactionDistribution()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETPATIENTSATISFACTION", Con);
            cmd.Parameters.AddWithValue("@Process", "DISTRIBUTION");
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETPATIENTSATISFACTION_DISTRIBUTION");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetPatientSatisfactionMealRatings()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETPATIENTSATISFACTION", Con);
            cmd.Parameters.AddWithValue("@Process", "MEAL");
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETPATIENTSATISFACTION_MEAL");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetPatientSatisfactionFeedback()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETPATIENTSATISFACTION", Con);
            cmd.Parameters.AddWithValue("@Process", "FEEDBACK");
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETPATIENTSATISFACTION_FEEDBACK");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable ExportPatientSatisfaction(string userId, string range = "30days", string startDate = null, string endDate = null)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_EXPORT_PATIENTSATISFACTION", Con);
            cmd.Parameters.AddWithValue("@USERID", userId ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@RANGE", range ?? "30days");
            cmd.Parameters.AddWithValue("@STARTDATE", !string.IsNullOrEmpty(startDate) ? (object)DateTime.Parse(startDate) : DBNull.Value);
            cmd.Parameters.AddWithValue("@ENDDATE", !string.IsNullOrEmpty(endDate) ? (object)DateTime.Parse(endDate) : DBNull.Value);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_EXPORT_PATIENTSATISFACTION");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }


    public static DataSet GetOrderDetailWithItemCount(string OrderID)
    {
        DataSet ds = new DataSet();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_FOOD_DASHBOARD", Con);
            cmd.Parameters.AddWithValue("@Process", "GETORDERDETAIL");
            cmd.Parameters.AddWithValue("@OrderId", OrderID);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(ds);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_DASHBOARD_GETORDERDETAILWITHITEMCOUNT");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return ds;
    }

    public static DataTable GetWardDropdownList()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_FOOD_ORDER", Con);
            cmd.Parameters.AddWithValue("@Process", "WARD");
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_ORDER_WARD");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetKitchenDropdownList()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_FOOD_ORDER", Con);
            cmd.Parameters.AddWithValue("@Process", "KITCHEN");
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_ORDER_KITCHEN");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetNotificationsList(string MaxCount, string UserID, string RoleID, string DepartmentID)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_NOTIFICATION", Con);
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@Process", "GET");

            int maxCount;
            cmd.Parameters.AddWithValue("@MaxCount",
                int.TryParse(MaxCount, out maxCount) && maxCount > 0 ? maxCount : 20);

            int roleId;
            cmd.Parameters.AddWithValue("@RoleID",
                int.TryParse(RoleID, out roleId) ? (object)roleId : DBNull.Value);

            int deptId;
            cmd.Parameters.AddWithValue("@DepartmentID",
                int.TryParse(DepartmentID, out deptId) ? (object)deptId : DBNull.Value);

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_DASHBOARD_GETNOTIFICATIONSLIST");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable MarkNotificationAsRead(string NotificationId, string RoleID, string DepartmentID)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_NOTIFICATION", Con);
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@Process", "MARK_READ");

            int notifId;
            cmd.Parameters.AddWithValue("@NotificationID",
                int.TryParse(NotificationId, out notifId) ? (object)notifId : DBNull.Value);

            int roleId;
            cmd.Parameters.AddWithValue("@RoleID",
                int.TryParse(RoleID, out roleId) ? (object)roleId : DBNull.Value);

            int deptId;
            cmd.Parameters.AddWithValue("@DepartmentID",
                int.TryParse(DepartmentID, out deptId) ? (object)deptId : DBNull.Value);

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_DASHBOARD_MARKNOTIFICATIONASREAD");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable MarkAllNotificationsAsRead(string UserID, string RoleID, string DepartmentID)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_NOTIFICATION", Con);
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@Process", "MARK_ALL_READ");

            int roleId;
            cmd.Parameters.AddWithValue("@RoleID",
                int.TryParse(RoleID, out roleId) ? (object)roleId : DBNull.Value);

            int deptId;
            cmd.Parameters.AddWithValue("@DepartmentID",
                int.TryParse(DepartmentID, out deptId) ? (object)deptId : DBNull.Value);

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_FOOD_DASHBOARD_MARKALLNOTIFICATIONSASREAD");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetUnreadNotificationCounts(string UserID, string RoleID, string DepartmentID)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_NOTIFICATION", Con);
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@Process", "COUNT");

            int userId;
            cmd.Parameters.AddWithValue("@UserID",
                int.TryParse(UserID, out userId) ? (object)userId : DBNull.Value);

            int roleId;
            cmd.Parameters.AddWithValue("@RoleID",
                int.TryParse(RoleID, out roleId) ? (object)roleId : DBNull.Value);

            int deptId;
            cmd.Parameters.AddWithValue("@DepartmentID",
                int.TryParse(DepartmentID, out deptId) ? (object)deptId : DBNull.Value);

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_NOTIFICATION_COUNT");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    public static DataTable GetDeliveries(string process)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETDELIVERIES", Con);
            cmd.Parameters.AddWithValue("@Process", process);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);

            if (Con.State == ConnectionState.Closed)
                Con.Open();

            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETDELIVERIES_" + process);
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GenerateOTP(string orderId, string updatedBy = null)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_VERIFYOTP", Con);
            cmd.Parameters.AddWithValue("@Process", "GENERATEOTP");
            cmd.Parameters.AddWithValue("@OrderId", orderId);
            cmd.Parameters.AddWithValue("@UpdatedBy", updatedBy ?? "System");
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_VERIFYOTP_GENERATEOTP");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable VerifyOTP(string orderId, string otp, string updatedBy = null)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_VERIFYOTP", Con);
            cmd.Parameters.AddWithValue("@Process", "VERIFYOTP");
            cmd.Parameters.AddWithValue("@OrderId", orderId);
            cmd.Parameters.AddWithValue("@OTP", otp);
            cmd.Parameters.AddWithValue("@UpdatedBy", updatedBy ?? "System");
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_VERIFYOTP_VERIFYOTP");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable DeliveredWithoutOTP(string orderId, string updatedBy = null)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("SP_VERIFYOTP", Con);
            cmd.Parameters.AddWithValue("@Process", "DELIVEREDWITHOUTOTP");
            cmd.Parameters.AddWithValue("@OrderId", orderId);
            cmd.Parameters.AddWithValue("@UpdatedBy", updatedBy ?? "System");
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();

            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_VERIFYOTP_DELIVEREDWITHOUTOTP");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }

        return dt;
    }
    public static DataTable ResendOTP(string orderId, string updatedBy = null)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_VERIFYOTP", Con);
            cmd.Parameters.AddWithValue("@Process", "RESENDOTP");
            cmd.Parameters.AddWithValue("@OrderId", orderId);
            cmd.Parameters.AddWithValue("@UpdatedBy", updatedBy ?? "System");
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_VERIFYOTP_RESENDOTP");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable CheckOTPStatus(string orderId)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_VERIFYOTP", Con);
            cmd.Parameters.AddWithValue("@Process", "CHECKVERIFICATION");
            cmd.Parameters.AddWithValue("@OrderId", orderId);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_VERIFYOTP_CHECKVERIFICATION");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable ReportDeliveryFailure(string orderId, string reason, string notes, string updatedBy = null)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_VERIFYOTP", Con);
            cmd.Parameters.AddWithValue("@Process", "REPORTFAILURE");
            cmd.Parameters.AddWithValue("@OrderId", orderId);
            cmd.Parameters.AddWithValue("@FailureReason", reason ?? "");
            cmd.Parameters.AddWithValue("@FailureNotes", notes ?? "");
            cmd.Parameters.AddWithValue("@UpdatedBy", updatedBy ?? "System");
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_VERIFYOTP_REPORTFAILURE");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetFailureStatus(string orderId)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_VERIFYOTP", Con);
            cmd.Parameters.AddWithValue("@Process", "GETFAILURESTATUS");
            cmd.Parameters.AddWithValue("@OrderId", orderId);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_VERIFYOTP_GETFAILURESTATUS");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetFailureRemarks()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_VERIFYOTP", Con);
            cmd.Parameters.AddWithValue("@Process", "GETFAILUREREMARKS");
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_VERIFYOTP_GETFAILUREREMARKS");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetOTPVerificationList()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_VERIFYOTP", Con);
            cmd.Parameters.AddWithValue("@Process", "GETOTPVERIFICATIONLIST");
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_VERIFYOTP_GETOTPVERIFICATIONLIST");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable PickupOrder(string orderId, string updatedBy = null)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_VERIFYOTP", Con);
            cmd.Parameters.AddWithValue("@Process", "PICKUP");
            cmd.Parameters.AddWithValue("@OrderId", orderId);
            cmd.Parameters.AddWithValue("@UpdatedBy", updatedBy ?? "System");
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_VERIFYOTP_PICKUP");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetPreOrderSheets()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETPREORDERSHEETS", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "GETPREORDERSHEETS");
            cmd.Parameters.AddWithValue("@UpdatedBy", DBNull.Value);
            cmd.Parameters.AddWithValue("@IsPrinted", DBNull.Value);
            cmd.Parameters.AddWithValue("@ID", DBNull.Value);
            cmd.Parameters.AddWithValue("@Date", DBNull.Value);
            cmd.Parameters.AddWithValue("@MealType", DBNull.Value);

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);

            if (Con.State == ConnectionState.Closed)
                Con.Open();

            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETPREORDERSHEETS_GETPREORDERSHEETS");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }

        return dt;
    }

    public static DataTable PrintPreOrderDockets(string id)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETPREORDERSHEETS", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "PRINTPREORDERDOCKETS");
            cmd.Parameters.AddWithValue("@UpdatedBy", DBNull.Value);
            cmd.Parameters.AddWithValue("@IsPrinted", DBNull.Value);
            cmd.Parameters.AddWithValue("@ID", string.IsNullOrEmpty(id) ? (object)DBNull.Value : Convert.ToInt32(id));
            cmd.Parameters.AddWithValue("@Date", DBNull.Value);
            cmd.Parameters.AddWithValue("@MealType", DBNull.Value);

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);

            if (Con.State == ConnectionState.Closed)
                Con.Open();

            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETPREORDERSHEETS_PRINTPREORDERDOCKETS");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }

        return dt;
    }

    public static DataTable GetPreOrderPrintData()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETPREORDERSHEETS", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "GETPREORDERPRINTDATA");
            cmd.Parameters.AddWithValue("@UpdatedBy", DBNull.Value);
            cmd.Parameters.AddWithValue("@IsPrinted", DBNull.Value);
            cmd.Parameters.AddWithValue("@ID", DBNull.Value);
            cmd.Parameters.AddWithValue("@Date", DBNull.Value);
            cmd.Parameters.AddWithValue("@MealType", DBNull.Value);

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);

            if (Con.State == ConnectionState.Closed)
                Con.Open();

            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETPREORDERSHEETS_GETPREORDERPRINTDATA");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }

        return dt;
    }

    public static DataTable LockPreOrderSheet(string id, string date, string mealType, string updatedBy)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETPREORDERSHEETS", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "LOCKPREORDERSHEET");
            cmd.Parameters.AddWithValue("@UpdatedBy", updatedBy ?? "System");
            cmd.Parameters.AddWithValue("@IsPrinted", DBNull.Value);
            cmd.Parameters.AddWithValue("@ID", string.IsNullOrEmpty(id) ? (object)DBNull.Value : Convert.ToInt32(id));
            cmd.Parameters.AddWithValue("@Date", string.IsNullOrEmpty(date) ? (object)DBNull.Value : date);
            cmd.Parameters.AddWithValue("@MealType", string.IsNullOrEmpty(mealType) ? (object)DBNull.Value : mealType);

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);

            if (Con.State == ConnectionState.Closed)
                Con.Open();

            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETPREORDERSHEETS_LOCKPREORDERSHEET");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }

        return dt;
    }

    public static DataTable UnlockPreOrderSheet(string id, string date, string mealType, string updatedBy)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETPREORDERSHEETS", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "UNLOCKPREORDERSHEET");
            cmd.Parameters.AddWithValue("@UpdatedBy", updatedBy ?? "System");
            cmd.Parameters.AddWithValue("@IsPrinted", DBNull.Value);
            cmd.Parameters.AddWithValue("@ID", string.IsNullOrEmpty(id) ? (object)DBNull.Value : Convert.ToInt32(id));
            cmd.Parameters.AddWithValue("@Date", string.IsNullOrEmpty(date) ? (object)DBNull.Value : date);
            cmd.Parameters.AddWithValue("@MealType", string.IsNullOrEmpty(mealType) ? (object)DBNull.Value : mealType);

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);

            if (Con.State == ConnectionState.Closed)
                Con.Open();

            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETPREORDERSHEETS_UNLOCKPREORDERSHEET");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }

        return dt;
    }

    public static DataTable GetPatientDetails(string roomNo)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("SP_NEWFOODREQUEST", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "GETPATDETAILS");
            cmd.Parameters.AddWithValue("@RoomNo", string.IsNullOrEmpty(roomNo) ? (object)DBNull.Value : roomNo);

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);

            if (Con.State == ConnectionState.Closed)
                Con.Open();

            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_NEWFOODREQUEST_GETPATDETAILS");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }

        return dt;
    }

    public static DataTable GetMenuItems(string mealType, string searchTerm, string roomNo, string patientId)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("SP_NEWFOODREQUEST", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "GETMENU");
            cmd.Parameters.AddWithValue("@MealType", string.IsNullOrEmpty(mealType) ? (object)DBNull.Value : mealType);
            cmd.Parameters.AddWithValue("@SearchTerm", string.IsNullOrEmpty(searchTerm) ? (object)DBNull.Value : searchTerm);
            cmd.Parameters.AddWithValue("@RoomNo", string.IsNullOrEmpty(roomNo) ? (object)DBNull.Value : roomNo);
            cmd.Parameters.AddWithValue("@PatientID", string.IsNullOrEmpty(patientId) ? (object)DBNull.Value : Convert.ToInt32(patientId));

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);

            if (Con.State == ConnectionState.Closed)
                Con.Open();

            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error in GetMenuItems: " + ex.Message);
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }

        return dt;
    }

    public static DataTable RemoveTodayOrder(string orderId, string roomNo, string userId)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("SP_NEWFOODREQUEST", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "REMOVETODAYORDER");
            cmd.Parameters.AddWithValue("@OrderID", string.IsNullOrEmpty(orderId) ? (object)DBNull.Value : orderId);
            cmd.Parameters.AddWithValue("@RoomNo", string.IsNullOrEmpty(roomNo) ? (object)DBNull.Value : roomNo);
            cmd.Parameters.AddWithValue("@UserID", string.IsNullOrEmpty(userId) ? (object)DBNull.Value : Convert.ToInt32(userId));
            cmd.Parameters.AddWithValue("@MealType", DBNull.Value);
            cmd.Parameters.AddWithValue("@SearchTerm", DBNull.Value);
            cmd.Parameters.AddWithValue("@PatientID", DBNull.Value);
            cmd.Parameters.AddWithValue("@OrderData", DBNull.Value);

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);

            if (Con.State == ConnectionState.Closed)
                Con.Open();

            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error in RemoveTodayOrder: " + ex.Message);
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }

        return dt;
    }
    public static DataTable InsertFoodOrder(string orderData, int userId, ref string orderID)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("SP_NEWFOODREQUEST", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "REQUESTINSERT");
            cmd.Parameters.AddWithValue("@OrderData", string.IsNullOrEmpty(orderData) ? (object)DBNull.Value : orderData);
            cmd.Parameters.AddWithValue("@UserID", userId > 0 ? userId : (object)DBNull.Value);

            SqlParameter orderIdParam = new SqlParameter("@OrderID", SqlDbType.VarChar, 50);
            orderIdParam.Direction = ParameterDirection.Output;
            cmd.Parameters.Add(orderIdParam);

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);

            if (Con.State == ConnectionState.Closed)
                Con.Open();

            adpt.Fill(dt);

            if (orderIdParam.Value != DBNull.Value)
                orderID = orderIdParam.Value.ToString();
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_NEWFOODREQUEST_REQUESTINSERT");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }

        return dt;
    }

    public static DataTable GetServiceTimings()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("SP_NEWFOODREQUEST", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "GETSERVICETIMINGS");

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);

            if (Con.State == ConnectionState.Closed)
                Con.Open();

            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_NEWFOODREQUEST_GETSERVICETIMINGS");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }

        return dt;
    }

    public static DataTable GetRecommendedFoods(string roomNo, string mealType, int patientId)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("SP_NEWFOODREQUEST", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "GETRECOMMENDEDFOODS");
            cmd.Parameters.AddWithValue("@RoomNo", string.IsNullOrEmpty(roomNo) ? (object)DBNull.Value : roomNo);
            cmd.Parameters.AddWithValue("@MealType", string.IsNullOrEmpty(mealType) ? (object)DBNull.Value : mealType);
            cmd.Parameters.AddWithValue("@PatientID", patientId > 0 ? patientId : (object)DBNull.Value);

            SqlDataAdapter adpt = new SqlDataAdapter(cmd);

            if (Con.State == ConnectionState.Closed)
                Con.Open();

            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_NEWFOODREQUEST_GETRECOMMENDEDFOODS");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }

        return dt;
    }

    public static DataTable GetAuditLogs(string search, int userID)
    {
        DataTable dt = new DataTable();

        using (SqlConnection con = new SqlConnection(Tenant.ConnectionString))
        {
            try
            {
                using (SqlCommand cmd = new SqlCommand("SP_AUDITLOG", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.AddWithValue("@UserID", userID > 0 ? (object)userID : DBNull.Value);
                    cmd.Parameters.AddWithValue("@Search", string.IsNullOrWhiteSpace(search) ? "" : search);
                    cmd.Parameters.AddWithValue("@Process", "GET");

                    using (SqlDataAdapter adpt = new SqlDataAdapter(cmd))
                    {
                        adpt.Fill(dt);
                    }
                }
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "GetAuditLogs");
            }
        }

        return dt;
    }

    public static DataTable GetActionTypes()
    {
        DataTable dt = new DataTable();

        using (SqlConnection con = new SqlConnection(Tenant.ConnectionString))
        {
            try
            {
                using (SqlCommand cmd = new SqlCommand("SP_AUDITLOG", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.AddWithValue("@UserID", DBNull.Value);
                    cmd.Parameters.AddWithValue("@Search", "");
                    cmd.Parameters.AddWithValue("@Process", "ACTION");

                    using (SqlDataAdapter adpt = new SqlDataAdapter(cmd))
                    {
                        adpt.Fill(dt);
                    }
                }
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "GetActionTypes");
            }
        }

        return dt;
    }

    public static DataTable SendToDeliveryOrderStatus(string orderId, string status, string userId)
    {
        DataTable dt = new DataTable();
        string connString = Tenant.ConnectionString;

        using (SqlConnection Con = new SqlConnection(connString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_UPDATE_FOOD_ORDER_STATUS_FOR_ASSEMBLY", Con);
                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.AddWithValue("@ORDERID", orderId);
                cmd.Parameters.AddWithValue("@STATUS", status);
                cmd.Parameters.AddWithValue("@USERID", string.IsNullOrEmpty(userId) ? "" : userId);

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_UPDATE_FOOD_ORDER_STATUS");
                dt = new DataTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open) { Con.Close(); }
            }
        }
        return dt;
    }
    public static DataTable UpdateFoodOrderStatusForAssembly(string orderid, string status)
    {
        DataTable dt = new DataTable();
        string connString = Tenant.ConnectionString;

        using (SqlConnection Con = new SqlConnection(connString))
        {
            try
            {
                SqlCommand cmd = new SqlCommand("SP_UPDATE_FOOD_ORDER_STATUS_FOR_ASSEMBLY", Con);
                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.AddWithValue("@ORDERID", orderid);
                cmd.Parameters.AddWithValue("@STATUS", status);

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(dt);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_UPDATE_FOOD_ORDER_STATUS");
                dt = new DataTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open) { Con.Close(); }
            }
        }
        return dt;
    }
    public static DataTable GetIncomingOrders()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GET_INCOMING_ORDERS", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GET_INCOMING_ORDERS");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    public static DataTable GetAssemblyQueue()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GET_ASSEMBLY_QUEUE", Con);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GET_ASSEMBLY_QUEUE");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }


    public static DataTable GetMealCutoffSettings()
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_MEALCUTOFFS", Con);
            cmd.Parameters.AddWithValue("@Process", "GET");
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_MEALCUTOFFS_GET");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable UpdateMealCutoffSettings(string BreakfastCutoff, string LunchCutoff, string DinnerCutoff, string UpdatedBy)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_MEALCUTOFFS", Con);
            cmd.Parameters.AddWithValue("@Process", "UPDATE");
            cmd.Parameters.AddWithValue("@BreakfastCutoff", BreakfastCutoff);
            cmd.Parameters.AddWithValue("@LunchCutoff", LunchCutoff);
            cmd.Parameters.AddWithValue("@DinnerCutoff", DinnerCutoff);
            cmd.Parameters.AddWithValue("@UpdatedBy", UpdatedBy);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_MEALCUTOFFS_UPDATE");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataSet getRequestCount(string SpName, string userID, string RoleId)
    {
        string Id = ((string.IsNullOrEmpty(userID) || userID.ToString().ToUpper() == "NULL") ? "0" : userID),
            RId = ((string.IsNullOrEmpty(RoleId) || RoleId.ToString().ToUpper() == "NULL") ? "0" : RoleId);
        DataSet ds = new DataSet();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand(SpName, Con);
        cmd.Parameters.AddWithValue("@REQUESTORID", Id);
        cmd.Parameters.AddWithValue("@RROLEID", RId);
        cmd.CommandType = CommandType.StoredProcedure;
        try
        {
            SqlDataAdapter adpt = new SqlDataAdapter(cmd); Con.Open();
            adpt.Fill(ds);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, SpName);
            ds = new DataSet();
        }
        finally
        {
            while (ds.Tables.Count == 0)
            {
                SqlDataAdapter adpt = new SqlDataAdapter(cmd);
                if (Con.State == ConnectionState.Closed)
                    Con.Open();
                adpt.Fill(ds);
            }
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return ds;
    }

    public static void InsertError(string ErrMsg, string SpName)
    {
        SqlConnection TmpCon = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_ERRORLOG", TmpCon);
            cmd.Parameters.AddWithValue("@PROC", SpName);
            cmd.Parameters.AddWithValue("@ERRORMSG", ErrMsg);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (TmpCon.State == ConnectionState.Closed)
                TmpCon.Open();
            cmd.ExecuteNonQuery();
            TmpCon.Close();
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_ERRORLOG");
        }
        finally
        {
            if (TmpCon.State == ConnectionState.Open)
                TmpCon.Close();
        }
    }

    public static DataTable RequestMaster(string ReqDate, string ReqID, string Source, string Halt1, string Halt2, string Dest, string UserId, string CatId, string Remarks, string Status,
                      string STime, string ETime, string Assignto, string From, string To, string Priority, string Process, string Search, string MultiPorter, string PageIndex, string PageSize)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_REQUESTMASTER", Con);
            cmd.Parameters.AddWithValue("@REQUESTDATE", ReqDate);
            cmd.Parameters.AddWithValue("@REQID", ReqID);
            cmd.Parameters.AddWithValue("@REQLOCID", Source);
            cmd.Parameters.AddWithValue("@DESTLOCID", Dest);
            cmd.Parameters.AddWithValue("@HALT1", Halt1);
            cmd.Parameters.AddWithValue("@HALT2", Halt2);
            cmd.Parameters.AddWithValue("@REQUESTORID", UserId);
            cmd.Parameters.AddWithValue("@CATEGORYID", CatId);
            cmd.Parameters.AddWithValue("@REMARKS", Remarks);
            cmd.Parameters.AddWithValue("@STATUS", Status);
            cmd.Parameters.AddWithValue("@ASSIGNTIME", STime);
            cmd.Parameters.AddWithValue("@ENDTIME", ETime);
            cmd.Parameters.AddWithValue("@ASSIGNTO", Assignto);
            cmd.Parameters.AddWithValue("@PROCESS", Process);
            cmd.Parameters.AddWithValue("@FROM", From);
            cmd.Parameters.AddWithValue("@TO", To);
            cmd.Parameters.AddWithValue("@SEARCH", Search);
            cmd.Parameters.AddWithValue("@MULTIPORTER", MultiPorter);
            cmd.Parameters.AddWithValue("@PRIORITY", Priority);
            cmd.Parameters.AddWithValue("@PAGEINDEX", PageIndex);
            cmd.Parameters.AddWithValue("@PAGESIZE", PageSize);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_REQUESTMASTER");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }


    public static DataSet PerformLogs(string ProcedureName, string search, string reqID, string status, string from, string to, string pageIndex, string pageSize)
    {
        DataSet ds = new DataSet();
        string constr = Tenant.ConnectionString;
        try
        {
            using (SqlConnection con = new SqlConnection(constr))
            {
                SqlCommand cmd = new SqlCommand(ProcedureName, con);
                cmd.Parameters.AddWithValue("@STATUS", status);
                cmd.Parameters.AddWithValue("@REQUESTID", reqID);
                cmd.Parameters.AddWithValue("@SEARCH", search);
                cmd.Parameters.AddWithValue("@FROM", from);
                cmd.Parameters.AddWithValue("@TO", to);
                cmd.Parameters.AddWithValue("@PAGEINDEX", pageIndex);
                cmd.Parameters.AddWithValue("@PAGESIZE", pageSize);
                cmd.CommandType = CommandType.StoredProcedure;
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(ds);
                return ds;
            }
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, ProcedureName);
            ds = new DataSet();
        }
        return ds;
    }

    public static DataTable PerformLogs_Export(string ProcedureName, string search, string reqID, string status, string from, string to)
    {
        DataTable ds = new DataTable();
        string constr = Tenant.ConnectionString;
        try
        {
            using (SqlConnection con = new SqlConnection(constr))
            {
                SqlCommand cmd = new SqlCommand(ProcedureName, con);
                cmd.Parameters.AddWithValue("@STATUS", status);
                cmd.Parameters.AddWithValue("@REQUESTID", reqID);
                cmd.Parameters.AddWithValue("@SEARCH", search);
                cmd.Parameters.AddWithValue("@FROM", from);
                cmd.Parameters.AddWithValue("@TO", to);
                cmd.CommandType = CommandType.StoredProcedure;
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(ds);
                return ds;
            }
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, ProcedureName);
            ds = new DataTable();
        }
        return ds;
    }


    public static DataTable UpdateLocationsNew(string zonename, string macid, string apname, string floorid, string isactive, string ismultiporter, string action, string nearby, string Id, string Tag,
                                            string IsPorterLocation, string IsCateringLocation, string IsCleaningLocation, string IsSecurityLocaiton, string IsFeedbackLocation, string CATERGROUPID, string CleaningZoneID)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_LOCATIONINSERTUPDATE", Con);
            cmd.Parameters.AddWithValue("@ZONENAME", zonename);
            cmd.Parameters.AddWithValue("@MACID", macid);
            cmd.Parameters.AddWithValue("@APNAME", apname);
            cmd.Parameters.AddWithValue("@FLOORID", floorid);
            cmd.Parameters.AddWithValue("@ISMULTIPORTER", ismultiporter);
            cmd.Parameters.AddWithValue("@ISACTIVE", isactive);
            cmd.Parameters.AddWithValue("@NEARBY", nearby);
            cmd.Parameters.AddWithValue("@ACTION", action);
            cmd.Parameters.AddWithValue("@ID", Id);
            cmd.Parameters.AddWithValue("@TAG", Tag);

            cmd.Parameters.AddWithValue("@ISPORTERINGLOCATION", IsPorterLocation);
            cmd.Parameters.AddWithValue("@ISCATERINGLOCATION", IsCateringLocation);
            cmd.Parameters.AddWithValue("@ISCLEANINGLOCATION", IsCleaningLocation);
            cmd.Parameters.AddWithValue("@ISSECURITYLOCATION", IsSecurityLocaiton);
            cmd.Parameters.AddWithValue("@ISFEEDBACKLOCATION", IsFeedbackLocation);
            cmd.Parameters.AddWithValue("@CATERGROUPID", CATERGROUPID);
            cmd.Parameters.AddWithValue("@CLEAINGGROUPID", CleaningZoneID);


            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_LOCATIONINSERTUPDATE");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    private static string SafeInt(string value)
    {
        int n;
        return int.TryParse(value, out n) ? value : "0";
    }
    public static DataTable UpdateLocations(string zonename, string macid, string apname, string floorid, string isactive, string ismultiporter, string action, string nearby, string Id, string Tag,
                                       string IsPorterLocation, string IsCateringLocation, string IsCleaningLocation, string IsSecurityLocaiton, string IsFeedbackLocation, string CATERGROUPID, string Device, string ShortName)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_LOCATIONINSERTUPDATE", Con);
            cmd.Parameters.AddWithValue("@ZONENAME", zonename);
            cmd.Parameters.AddWithValue("@MACID", macid);
            cmd.Parameters.AddWithValue("@APNAME", apname);
            cmd.Parameters.AddWithValue("@FLOORID", SafeInt(floorid));
            cmd.Parameters.AddWithValue("@ISMULTIPORTER", ismultiporter);
            cmd.Parameters.AddWithValue("@ISACTIVE", isactive);
            cmd.Parameters.AddWithValue("@NEARBY", nearby);
            cmd.Parameters.AddWithValue("@ACTION", action);
            cmd.Parameters.AddWithValue("@ID", SafeInt(Id));
            cmd.Parameters.AddWithValue("@TAG", Tag);

            cmd.Parameters.AddWithValue("@ISPORTERINGLOCATION", IsPorterLocation);
            cmd.Parameters.AddWithValue("@ISCATERINGLOCATION", IsCateringLocation);
            cmd.Parameters.AddWithValue("@ISCLEANINGLOCATION", IsCleaningLocation);
            cmd.Parameters.AddWithValue("@ISSECURITYLOCATION", IsSecurityLocaiton);
            cmd.Parameters.AddWithValue("@ISFEEDBACKLOCATION", IsFeedbackLocation);
            cmd.Parameters.AddWithValue("@CATERGROUPID", SafeInt(CATERGROUPID));
            cmd.Parameters.AddWithValue("@DEVICE", SafeInt(Device));
            cmd.Parameters.AddWithValue("@SHORTNAME", ShortName);


            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_LOCATIONINSERTUPDATE");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    public static DataSet GetCategoryTypes(string departmentId)
    {
        DataSet ds = new DataSet();
        string constr = Tenant.ConnectionString;

        try
        {
            using (SqlConnection con = new SqlConnection(constr))
            {
                SqlCommand cmd = new SqlCommand("SP_GETCATEGORY", con);
                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.AddWithValue("@DepartmentId", departmentId);

                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(ds);
            }
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETCATEGORY");
            ds = new DataSet();
        }

        return ds;
    }

    public static DataSet GetFloors()
    {
        DataSet ds = new DataSet();
        string constr = Tenant.ConnectionString;
        try
        {
            using (SqlConnection con = new SqlConnection(constr))
            {
                SqlCommand cmd = new SqlCommand("SP_GetFloorname", con);
                cmd.CommandType = CommandType.StoredProcedure;
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(ds);
            }
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GetFloorname");
            ds = new DataSet();
        }
        return ds;
    }

    public static DataTable UpdatePorterNew(string PorterName, string UserID, string UserName, string Password, string IsActive,
                                       string gpshort, string ServiceID, string CategoryIds = "", string FloorIds = "",
                                       string ProfilePicture = "", string Gender = "", string AppId = "", string Action = "SAVE")
    {
        DataTable dt = new DataTable();
        dt.Columns.Add("RESULT", typeof(string));

        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_UPDATEPORTER", Con);

            cmd.Parameters.AddWithValue("@ID", UserID);
            cmd.Parameters.AddWithValue("@PORTERNAME", PorterName);
            cmd.Parameters.AddWithValue("@USERID", UserName);
            cmd.Parameters.AddWithValue("@PASSWORD", Password);
            cmd.Parameters.AddWithValue("@ISACTIVE", IsActive);
            cmd.Parameters.AddWithValue("@SHORT", gpshort);
            cmd.Parameters.AddWithValue("@DEPARTMENT", ServiceID);
            cmd.Parameters.AddWithValue("@CATEGORYIDS", CategoryIds);
            cmd.Parameters.AddWithValue("@FLOORIDS", FloorIds);
            cmd.Parameters.AddWithValue("@PROFILEPICTURE", ProfilePicture);
            cmd.Parameters.AddWithValue("@GENDER", Gender);
            cmd.Parameters.AddWithValue("@APPID", AppId);
            cmd.Parameters.AddWithValue("@SERVICEID", "1");
            cmd.Parameters.AddWithValue("@ACTION", Action);

            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(dt);

            if (dt.Rows.Count == 0)
            {
                DataRow errorRow = dt.NewRow();
                errorRow["RESULT"] = "FALSE - Stored procedure returned no results";
                dt.Rows.Add(errorRow);
            }
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_UPDATEPORTER");

            DataRow errorRow = dt.NewRow();
            errorRow["RESULT"] = "FALSE - Database error: " + ex.Message;
            dt.Rows.Add(errorRow);
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }


    public static DataTable UpdateUser(string UserName, string MId, string RoleName, string isactive, string Email, string Id, string division, string shift, string device, string shortName, string nurseLocationId, string departmentIds)
    {
        DataTable dt = new DataTable();
        using (SqlConnection Con = new SqlConnection(Tenant.ConnectionString))
        {
            try
            {
                using (SqlCommand cmd = new SqlCommand("SP_USRESINSERTUPDATE", Con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.AddWithValue("@USERNAME", UserName);
                    cmd.Parameters.AddWithValue("@MID", MId);
                    cmd.Parameters.AddWithValue("@ROLENAME", RoleName);
                    cmd.Parameters.AddWithValue("@ISACTIVE", isactive);
                    cmd.Parameters.AddWithValue("@EMAIL", Email);
                    cmd.Parameters.AddWithValue("@SHORT", shortName);
                    cmd.Parameters.AddWithValue("@ACTION", string.IsNullOrEmpty(Id) ? "INSERT" : "UPDATE");
                    cmd.Parameters.AddWithValue("@ID", Id);
                    cmd.Parameters.AddWithValue("@LOCATIONIDS", string.IsNullOrEmpty(nurseLocationId) ? (object)DBNull.Value : nurseLocationId);
                    cmd.Parameters.AddWithValue("@SERVICEID", "1");
                    cmd.Parameters.AddWithValue("@DepartmentIds", string.IsNullOrEmpty(departmentIds) ? (object)DBNull.Value : departmentIds);

                    SqlDataAdapter adpt = new SqlDataAdapter(cmd);

                    if (Con.State == ConnectionState.Closed)
                        Con.Open();

                    adpt.Fill(dt);
                }
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_USRESINSERTUPDATE");
                dt = CreateErrorTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open)
                    Con.Close();
            }
        }
        return dt;
    }

    public static DataTable DeleteUser(string UserName, string Id)
    {
        DataTable dt = new DataTable();
        using (SqlConnection Con = new SqlConnection(Tenant.ConnectionString))
        {
            try
            {
                using (SqlCommand cmd = new SqlCommand("SP_USRESINSERTUPDATE", Con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.AddWithValue("@USERNAME", UserName ?? "");
                    cmd.Parameters.AddWithValue("@MID", "");
                    cmd.Parameters.AddWithValue("@ROLENAME", "");
                    cmd.Parameters.AddWithValue("@ISACTIVE", "");
                    cmd.Parameters.AddWithValue("@EMAIL", "");
                    cmd.Parameters.AddWithValue("@SHORT", "");
                    cmd.Parameters.AddWithValue("@ACTION", "DELETE");
                    cmd.Parameters.AddWithValue("@ID", Id ?? "");

                    SqlDataAdapter adpt = new SqlDataAdapter(cmd);

                    if (Con.State == ConnectionState.Closed)
                        Con.Open();

                    adpt.Fill(dt);
                }
            }
            catch (Exception ex)
            {
                InsertError("DeleteUser Error: " + ex.Message + " | UserName: " + UserName + " | ID: " + Id, "SP_USRESINSERTUPDATE_DELETE");
                dt = CreateErrorTable();
            }
            finally
            {
                if (Con.State == ConnectionState.Open)
                    Con.Close();
            }
        }
        return dt;
    }


    public static DataTable UpdateUsers(string UserName, string MId, string RoleId, string isactive, string action, string nearby, string Id)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_USRESINSERTUPDATE", Con);
            cmd.Parameters.AddWithValue("@USERNAME", UserName);
            cmd.Parameters.AddWithValue("@MID", MId);
            cmd.Parameters.AddWithValue("@ROLEID", RoleId);
            cmd.Parameters.AddWithValue("@ISACTIVE", isactive);
            cmd.Parameters.AddWithValue("@NEARBY", nearby);
            cmd.Parameters.AddWithValue("@ACTION", action);
            cmd.Parameters.AddWithValue("@ID", Id);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_USRESINSERTUPDATE");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable InsertRoutineRequest(string svcid, string eqid, string PBDate, string Category, string From, string To, string MultiPorter, string PatientName, string Remarks, string UserID, string Priority, string ExtraFields)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_ROUTINETASK_INSERT", Con);
            cmd.Parameters.AddWithValue("@EQUIPMENTID", eqid);
            cmd.Parameters.AddWithValue("@PBDATE", PBDate);
            cmd.Parameters.AddWithValue("@CATEGORY", Category);
            cmd.Parameters.AddWithValue("@FROM", From);
            cmd.Parameters.AddWithValue("@TO", To);
            cmd.Parameters.AddWithValue("@MULTIPORTER", MultiPorter);
            cmd.Parameters.AddWithValue("@PATIENTNAME", PatientName);
            cmd.Parameters.AddWithValue("@REMARKS", Remarks);
            cmd.Parameters.AddWithValue("@USERID", UserID);
            cmd.Parameters.AddWithValue("@PRIORITY", Priority);
            cmd.Parameters.AddWithValue("@EXTRAFIELDS", ExtraFields);
            cmd.Parameters.AddWithValue("@SERVICEID", svcid);

            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_ROUTINETASK_INSERT");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }


    public static DataTable InsertRoutineRequestBF(string PBDate, string Category, string From, string To, string MultiPorter, string PatientName, string Remarks, string UserID, string Priority, string ExtraFields, string EndDate, string Kitchen)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_ROUTINETASK_INSERT_BF", Con);
            cmd.Parameters.AddWithValue("@PBDATE", PBDate);
            cmd.Parameters.AddWithValue("@CATEGORY", Category);
            cmd.Parameters.AddWithValue("@FROM", From);
            cmd.Parameters.AddWithValue("@TO", To);
            cmd.Parameters.AddWithValue("@MULTIPORTER", MultiPorter);
            cmd.Parameters.AddWithValue("@PATIENTNAME", PatientName);
            cmd.Parameters.AddWithValue("@REMARKS", Remarks);
            cmd.Parameters.AddWithValue("@USERID", UserID);
            cmd.Parameters.AddWithValue("@PRIORITY", Priority);
            cmd.Parameters.AddWithValue("@ENDDATE", EndDate);
            cmd.Parameters.AddWithValue("@EXTRAFIELDS", ExtraFields);
            cmd.Parameters.AddWithValue("@KITCHEN", Kitchen);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_ROUTINETASK_INSERT_BF");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    public static DataTable updateRoutineRequest(string svcid, string eqid, string PBDate, string Category, string From, string To, string MultiPorter, string PatientName, string Remarks, string UserID, string Priority, string ExtraFields)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_ROUTINETASK_UPDATE", Con);
            cmd.Parameters.AddWithValue("@EQUIPMENTID", eqid);
            cmd.Parameters.AddWithValue("@PBDATE", PBDate);
            cmd.Parameters.AddWithValue("@CATEGORY", Category);
            cmd.Parameters.AddWithValue("@FROM", From);
            cmd.Parameters.AddWithValue("@TO", To);
            cmd.Parameters.AddWithValue("@MULTIPORTER", MultiPorter);
            cmd.Parameters.AddWithValue("@PATIENTNAME", PatientName);
            cmd.Parameters.AddWithValue("@REMARKS", Remarks);
            cmd.Parameters.AddWithValue("@USERID", UserID);
            cmd.Parameters.AddWithValue("@PRIORITY", Priority);
            cmd.Parameters.AddWithValue("@EXTRAFIELDS", ExtraFields);
            cmd.Parameters.AddWithValue("@SERVICEID", svcid);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_ROUTINETASK_UPDATE");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable updateRoutineRequestBF(string PBDate, string Category, string From, string To, string MultiPorter, string PatientName, string Remarks, string UserID, string Priority, string EndDate, string ExtraFields, string Kitchen)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_ROUTINETASK_UPDATE_BF", Con);
            cmd.Parameters.AddWithValue("@PBDATE", PBDate);
            cmd.Parameters.AddWithValue("@CATEGORY", Category);
            cmd.Parameters.AddWithValue("@FROM", From);
            cmd.Parameters.AddWithValue("@TO", To);
            cmd.Parameters.AddWithValue("@MULTIPORTER", MultiPorter);
            cmd.Parameters.AddWithValue("@PATIENTNAME", PatientName);
            cmd.Parameters.AddWithValue("@REMARKS", Remarks);
            cmd.Parameters.AddWithValue("@ENDDATE", EndDate);
            cmd.Parameters.AddWithValue("@USERID", UserID);
            cmd.Parameters.AddWithValue("@PRIORITY", Priority);
            cmd.Parameters.AddWithValue("@EXTRAFIELDS", ExtraFields);
            cmd.Parameters.AddWithValue("@KITCHEN", Kitchen);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_ROUTINETASK_UPDATE_BF");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    public static DataTable InsertRequest(string PBDate, string Category, string From, string To, string MultiPorter, string PatientName, string Remarks, string UserID, string Priority, string Halt1, string Halt2,
                                          string ExtraFields, string qty, string Requestor, string ServiceID, string Kitchen)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_NEWREQUEST_WEB", Con);
            cmd.Parameters.AddWithValue("@PBDATE", PBDate);
            cmd.Parameters.AddWithValue("@CATEGORY", Category);
            cmd.Parameters.AddWithValue("@FROM", From);
            cmd.Parameters.AddWithValue("@TO", To);
            cmd.Parameters.AddWithValue("@MULTIPORTER", MultiPorter);
            cmd.Parameters.AddWithValue("@PATIENTNAME", PatientName);
            cmd.Parameters.AddWithValue("@REMARKS", Remarks);
            cmd.Parameters.AddWithValue("@USERID", UserID);
            cmd.Parameters.AddWithValue("@PRIORITY", Priority);
            cmd.Parameters.AddWithValue("@HALT1", Halt1);
            cmd.Parameters.AddWithValue("@HALT2", Halt2);
            cmd.Parameters.AddWithValue("@EXTRAFIELDS", ExtraFields);
            cmd.Parameters.AddWithValue("@Qty", qty);
            cmd.Parameters.AddWithValue("@REQUESTOR", Requestor);
            cmd.Parameters.AddWithValue("@SERVICEID", ServiceID);
            cmd.Parameters.AddWithValue("@KITCHEN", Kitchen);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_NEWREQUEST_WEB");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable DuplicateRequest(string User, string ReqID)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_RAISEDUPLICATE_REQUEST", Con);
            cmd.Parameters.AddWithValue("@REQID", ReqID);
            cmd.Parameters.AddWithValue("@USERID", User);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_RAISEDUPLICATE_REQUEST");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    public static DataTable setRoleValues(string RoleID, string TreeID, string Value, string IsActive)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_UPDATEROLEVALUES", Con);
            cmd.Parameters.AddWithValue("@ROLEID", RoleID);
            cmd.Parameters.AddWithValue("@TREEID", TreeID);
            cmd.Parameters.AddWithValue("@VALUE", Value);
            cmd.Parameters.AddWithValue("@ISACTIVE", IsActive);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_UPDATEROLEVALUES");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable UpdateRoleValues(string RoleName, string TreeID, string Action, string Isactive, string ID)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_CRAETEROLES_WEBUSERS", Con);
            cmd.Parameters.AddWithValue("@ROLENAME", RoleName);
            cmd.Parameters.AddWithValue("@TREEIDS", TreeID);
            cmd.Parameters.AddWithValue("@ID", ID);
            cmd.Parameters.AddWithValue("@ACTION", Action);
            cmd.Parameters.AddWithValue("@ISACTIVE", Isactive);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_CRAETEROLES_WEBUSERS");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable UpdateRequestPreBook(string PBDate, string Category, string From, string To, string MultiPorter, string PatientName, string Remarks, string UserID, string Priority, string ExtraFields, string RequestID, string StatusID, string CompletedRemarks, string CancelledRemarks,
          string Quantity, string Requestor, string ServiceID, string Kitchen)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_NEWREQUEST_WEB_UPDATE_PREBOOK", Con);
            cmd.Parameters.AddWithValue("@PBDATE", PBDate);
            cmd.Parameters.AddWithValue("@CATEGORY", Category);
            cmd.Parameters.AddWithValue("@FROM", From);
            cmd.Parameters.AddWithValue("@TO", To);
            cmd.Parameters.AddWithValue("@MULTIPORTER", MultiPorter);
            cmd.Parameters.AddWithValue("@PATIENTNAME", PatientName);
            cmd.Parameters.AddWithValue("@REMARKS", Remarks);
            cmd.Parameters.AddWithValue("@USERID", UserID);
            cmd.Parameters.AddWithValue("@PRIORITY", Priority);
            cmd.Parameters.AddWithValue("@EXTRAFIELDS", ExtraFields);
            cmd.Parameters.AddWithValue("@REQUESTID", RequestID);
            cmd.Parameters.AddWithValue("@STATUS", StatusID);
            cmd.Parameters.AddWithValue("@COMPLETEDREMARKS", CompletedRemarks);
            cmd.Parameters.AddWithValue("@CANCELLEDREMARKS", CancelledRemarks);
            cmd.Parameters.AddWithValue("@Qty", Quantity);
            cmd.Parameters.AddWithValue("@REQUESTOR", Requestor);
            cmd.Parameters.AddWithValue("@SERVICEID", ServiceID);
            cmd.Parameters.AddWithValue("@KITCHEN", Kitchen);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_NEWREQUEST_WEB_UPDATE_PREBOOK");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    public static DataTable UpdateRequest(string PBDate, string Category, string From, string To, string MultiPorter, string PatientName, string Remarks, string UserID, string Priority, string ExtraFields, string RequestID, string StatusID, string CompletedRemarks, string CancelledRemarks,
          string Quantity, string Requestor, string ServiceID, string Kitchen)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_NEWREQUEST_WEB_UPDATE", Con);
            cmd.Parameters.AddWithValue("@PBDATE", PBDate);
            cmd.Parameters.AddWithValue("@CATEGORY", Category);
            cmd.Parameters.AddWithValue("@FROM", From);
            cmd.Parameters.AddWithValue("@TO", To);
            cmd.Parameters.AddWithValue("@MULTIPORTER", MultiPorter);
            cmd.Parameters.AddWithValue("@PATIENTNAME", PatientName);
            cmd.Parameters.AddWithValue("@REMARKS", Remarks);
            cmd.Parameters.AddWithValue("@USERID", UserID);
            cmd.Parameters.AddWithValue("@PRIORITY", Priority);
            cmd.Parameters.AddWithValue("@EXTRAFIELDS", ExtraFields);
            cmd.Parameters.AddWithValue("@REQUESTID", RequestID);
            cmd.Parameters.AddWithValue("@STATUS", StatusID);
            cmd.Parameters.AddWithValue("@COMPLETEDREMARKS", CompletedRemarks);
            cmd.Parameters.AddWithValue("@CANCELLEDREMARKS", CancelledRemarks);
            cmd.Parameters.AddWithValue("@Qty", Quantity);
            cmd.Parameters.AddWithValue("@REQUESTOR", Requestor);
            cmd.Parameters.AddWithValue("@SERVICEID", ServiceID);
            cmd.Parameters.AddWithValue("@KITCHEN", Kitchen);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_NEWREQUEST_WEB_UPDATE");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }


    public static DataTable GetRequests(string UserId, string RoleId, string Status, string PageIndex, string PageSize, string Search, string ServiceID)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETUSERREQUESTS", Con);
            cmd.Parameters.AddWithValue("@USERID", UserId);
            cmd.Parameters.AddWithValue("@ROLEID", RoleId);
            cmd.Parameters.AddWithValue("@STATUS", Status);
            cmd.Parameters.AddWithValue("@SEARCH", Search);
            cmd.Parameters.AddWithValue("@SERVICEID", ServiceID);
            cmd.Parameters.AddWithValue("@PAGEINDEX", PageIndex);
            cmd.Parameters.AddWithValue("@PAGESIZE", PageSize);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETUSERREQUESTS");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetPorterStatus(string Status, string ServiceID)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETPORTERSTATUS", Con);
            cmd.Parameters.AddWithValue("@STATUS", Status);
            cmd.Parameters.AddWithValue("@SERVICEID", ServiceID);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETPORTERSTATUS");
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    public static DataTable PreBookingMaster(string UserId, string RoleId, string Process, string PageIndex, string PageSize, string RequestId, string Remarks)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_PREBOOKINGMASTER", Con);
            cmd.Parameters.AddWithValue("@USERID", UserId);
            cmd.Parameters.AddWithValue("@ROLEID", RoleId);
            cmd.Parameters.AddWithValue("@PROCESS", Process);
            cmd.Parameters.AddWithValue("@PAGEINDEX", PageIndex);
            cmd.Parameters.AddWithValue("@PAGESIZE", PageSize);
            cmd.Parameters.AddWithValue("@REQUESTID", RequestId);
            cmd.Parameters.AddWithValue("@REMARKS", Remarks);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_PREBOOKINGMASTER");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static bool SendMessage(string TagId, string Message)
    {

        string ErrMsg = string.Empty;
        try
        {
            string server = ConfigurationManager.AppSettings["EPEserver"].ToString(), port = ConfigurationManager.AppSettings["EPEPort"].ToString(),
                EPEId = ConfigurationManager.AppSettings["EPEName"].ToString(), EPEPwd = ConfigurationManager.AppSettings["EPEValue"].ToString(),
                URL = ConfigurationManager.AppSettings["HTTP"].ToString() + "://" + server + ":" + port + "/epe/msg/tagsendmsg?tagid=" + TagId + "&message=" + Message + "&messagetype=instant";
            DigestHttpWebRequest req = new DigestHttpWebRequest("admin", "admin");
            HttpWebResponse webResponse = req.GetResponse(new Uri(string.Format(URL)));
            Stream stream = webResponse.GetResponseStream();

            //this.streamReader = new StreamReader(this.streamResponse);
            //this.xmlTxtReader = new XmlTextReader(this.streamReader);
        }
        catch (Exception Excep)
        {
            ErrMsg = Excep.Message;
        }
        return (ErrMsg.Trim() == string.Empty);
    }

    public static string GetBody(DataTable Table)
    {
        string body = string.Empty, BodyHeader = string.Empty;
        body = "</html> <head></head><body><br/><table cellpadding='6' style='border:none;width:90%;display:table;border: none;color: Black !important;font-weight:bold;font-size: 12px;'> <tr>";
        body += "<td align='left'>The porter request - #" + Table.Rows[0]["REQUEST"].ToString() + " for moving the (PATIENT/DOC) from ' " + Table.Rows[0]["SOURCE"].ToString().ToUpper() + " '  to  ' " + Table.Rows[0]["DESTINATION"].ToString().ToUpper() + " ' raised by " + Table.Rows[0]["REQUESTOR"].ToString().ToUpper() + " on " + Table.Rows[0]["DATE"].ToString().ToUpper() + " at " + Table.Rows[0]["TIME"].ToString().ToUpper() + " was assigned to " + Table.Rows[0]["PORTER"].ToString().ToUpper() + ", but was delayed due to the following reason:</td></tr><tr><td align='left'> REASON : " + Table.Rows[0]["REASON"].ToString().ToUpper() + "</td></tr>";

        return body;

    }

    public static bool SendMail(string To, string Sub, string mBody, string From, string Password)
    {
        try
        {

            SmtpClient smtp = new SmtpClient();
            MailMessage msg = new MailMessage();
            char[] separator = new char[] { ';' };
            msg.From = new MailAddress(From);
            string[] strSplitArr = To.Split(separator);
            msg.To.Add(new System.Net.Mail.MailAddress(To)); msg.CC.Add(new System.Net.Mail.MailAddress("thomas@icegen.net")); msg.CC.Add(new System.Net.Mail.MailAddress("senthil@icegen.net"));
            msg.Subject = Sub;
            msg.IsBodyHtml = true;
            msg.Body = mBody;
            smtp.Port = 587;
            smtp.Host = "smtp.gmail.com";

            try
            {
                NetworkCredential cred = new NetworkCredential(From, Password);
                smtp.UseDefaultCredentials = false;
                smtp.Credentials = cred;
                smtp.EnableSsl = true;
                smtp.DeliveryMethod = SmtpDeliveryMethod.Network;
            }
            catch (Exception ex2) { InsertError(ex2.Message, "MAIL"); }
            smtp.Send(msg);
            return true;
        }
        catch (Exception ex1)
        {
            InsertError(ex1.Message, "MAIL");
            return false;
        }
    }

    public static DataTable CategoryMaster(string Id, string Category, string Image, bool Active, string Process)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_CATEGORYMASTER", Con);
            cmd.Parameters.AddWithValue("@ID", Id);
            cmd.Parameters.AddWithValue("@CATEGORY", Category);
            cmd.Parameters.AddWithValue("@IMAGE", Image);
            cmd.Parameters.AddWithValue("@PROCESS", Process);
            cmd.Parameters.AddWithValue("@ACTIVE", Active);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex) { InsertError(ex.Message, "SP_CATEGORYMASTER"); dt = new DataTable(); }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable LocationMaster(string Id, string Location, string Floor, bool Active, string Process)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_LOCATIONMASTER", Con);
            cmd.Parameters.AddWithValue("@ID", Id);
            cmd.Parameters.AddWithValue("@LOCATION", Location);
            cmd.Parameters.AddWithValue("@FLOOR", Floor);
            cmd.Parameters.AddWithValue("@PROCESS", Process);
            cmd.Parameters.AddWithValue("@ACTIVE", Active);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex) { InsertError(ex.Message, "SP_LOCATIONMASTER"); dt = new DataTable(); }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable NLocationMaster(string Id, string Location, string Floor, bool Active, string Lgroup, string Process)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_LOCATIONMASTER", Con);
            cmd.Parameters.AddWithValue("@ID", Id);
            cmd.Parameters.AddWithValue("@LOCATION", Location);
            cmd.Parameters.AddWithValue("@FLOOR", Floor);
            cmd.Parameters.AddWithValue("@PROCESS", Process);
            cmd.Parameters.AddWithValue("@LOCATIONGROUP", Lgroup);
            cmd.Parameters.AddWithValue("@ACTIVE", Active);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex) { InsertError(ex.Message, "SP_LOCATIONMASTER"); dt = new DataTable(); }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    public static DataTable StatusMaster(string Id, string Status, bool Active, string Process)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_STATUSMASTER", Con);
            cmd.Parameters.AddWithValue("@ID", Id);
            cmd.Parameters.AddWithValue("@STATUS", Status);
            cmd.Parameters.AddWithValue("@PROCESS", Process);
            cmd.Parameters.AddWithValue("@ACTIVE", Active);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex) { InsertError(ex.Message, "SP_STATUSMASTER"); dt = new DataTable(); }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    public static DataTable StatusMasterNew(string Id, string Status, bool Active, string Process, string ServiceID)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_STATUSMASTER", Con);
            cmd.Parameters.AddWithValue("@ID", Id);
            cmd.Parameters.AddWithValue("@STATUS", Status);
            cmd.Parameters.AddWithValue("@PROCESS", Process);
            cmd.Parameters.AddWithValue("@SERVICEID", ServiceID);
            cmd.Parameters.AddWithValue("@ACTIVE", Active);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex) { InsertError(ex.Message, "SP_STATUSMASTER"); dt = new DataTable(); }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    public static DataTable UpdatePorter(string Id, string PorterName, string UserID, string Password, string Heavy, string IsActive, string IsPharmacy, string IsBP, string IsMGas, string IsWaste, string IsSupervisor,
                                         string IsHaywood, string IsRoyalStoke, string IsSpeciman, string LightTask, string DeseasedPatient, string KPS, string KP, string KPMK, string KPR, string KPSA, string ServiceID)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_UPDATEPORTER", Con);
            cmd.Parameters.AddWithValue("@ID", Id);
            cmd.Parameters.AddWithValue("@PORTERNAME", PorterName);
            cmd.Parameters.AddWithValue("@USERID", UserID);
            cmd.Parameters.AddWithValue("@PASSWORD", Password);
            cmd.Parameters.AddWithValue("@HEAVY", Heavy);
            cmd.Parameters.AddWithValue("@ISACTIVE", IsActive);


            cmd.Parameters.AddWithValue("@ISPHARMACY", IsPharmacy);
            cmd.Parameters.AddWithValue("@ISBLOODPRODUCT", IsBP);
            cmd.Parameters.AddWithValue("@ISMEDICALGASES", IsMGas);
            cmd.Parameters.AddWithValue("@ISWASTE", IsWaste);
            cmd.Parameters.AddWithValue("@ISSUPERVISOR", IsSupervisor);
            cmd.Parameters.AddWithValue("@ISHAYWOOD", IsHaywood);
            cmd.Parameters.AddWithValue("@ISROYALSTOKE", IsRoyalStoke);



            cmd.Parameters.AddWithValue("@ISLIGHTTASK", LightTask);
            cmd.Parameters.AddWithValue("@ISSPECIMEN", IsSpeciman);
            cmd.Parameters.AddWithValue("@ISDESEASEDPATIENT", DeseasedPatient);


            cmd.Parameters.AddWithValue("@KP_SUPERVISOR", KPS);
            cmd.Parameters.AddWithValue("@KP", KP);
            cmd.Parameters.AddWithValue("@KP_MAINKITCHEN", KPMK);
            cmd.Parameters.AddWithValue("@KP_RETAIL", KPR);
            cmd.Parameters.AddWithValue("@KP_SAFFRONADMIN", KPSA);


            cmd.Parameters.AddWithValue("@SERVICEID", ServiceID);


            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex) { InsertError(ex.Message, "SP_UPDATEPORTER"); dt = new DataTable(); }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable UpdateTaskTypeMaster(
   string CategoryName, string DepartmentId, string ThresholdForStartTime,
   string ThresholdForEndTime, string Orderwise, string EscationTat1,
   string EscationTat2, string EscationTat3, string EscationContact1,
   string EscationContact2, string EscationContact3, string TaskTypeld,
   string HistUrl, string Dial50Url, string ComplaintContact,
   string ShortName, string Image, string CategoryDescription,
   string DescriptionDetails, string AdditionalUrl,
   string Title, string Description,
   string IsSignRequired, string IsPhotoRequired,
   string IsTwoPorterTask, string IsActive,
   string Action, string ID, string ServiceID = "1")
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);

        try
        {
            SqlCommand cmd = new SqlCommand("[SP_TASKTYPEMASTERINSERTUPDATE]", Con);

            AddParam(cmd, "@CATEGORYNAME", CategoryName);
            AddParam(cmd, "@DEPARTMENTID", ParseInt(DepartmentId));
            AddParam(cmd, "@THRESHOLDFORSTARTTIME", ParseInt(ThresholdForStartTime));
            AddParam(cmd, "@THRESHOLDFORENDTIME", ParseInt(ThresholdForEndTime));
            AddParam(cmd, "@ORDERWISE", ParseInt(Orderwise));
            AddParam(cmd, "@ESCATIONTAT1", ParseInt(EscationTat1));
            AddParam(cmd, "@ESCATIONTAT2", ParseInt(EscationTat2));
            AddParam(cmd, "@ESCATIONTAT3", ParseInt(EscationTat3));
            AddParam(cmd, "@ESCATIONCONTACT1", EscationContact1);
            AddParam(cmd, "@ESCATIONCONTACT2", EscationContact2);
            AddParam(cmd, "@ESCATIONCONTACT3", EscationContact3);
            AddParam(cmd, "@TASKTYPEID", ParseInt(TaskTypeld));
            AddParam(cmd, "@HISTURL", HistUrl);
            AddParam(cmd, "@DIAL50URL", Dial50Url);
            AddParam(cmd, "@COMPLAINTCONTACT", ComplaintContact);
            AddParam(cmd, "@SHORTNAME", ShortName);
            AddParam(cmd, "@IMAGE", string.IsNullOrEmpty(Image) ? "Default.png" : Image);
            AddParam(cmd, "@CATEGORYDESCRIPTION", CategoryDescription ?? "");
            AddParam(cmd, "@DESCRIPTIONDETAILS", DescriptionDetails ?? "");
            AddParam(cmd, "@REDIRECTIONALURL", AdditionalUrl ?? "");
            AddParam(cmd, "@TITLE", Title ?? "");
            AddParam(cmd, "@DESCRIPTION", Description ?? "");
            AddParam(cmd, "@ISSIGNREQUIRED", ParseInt(IsSignRequired));
            AddParam(cmd, "@ISPHOTOREQUIRED", ParseInt(IsPhotoRequired));
            AddParam(cmd, "@ISTWOPORTERTASK", ParseInt(IsTwoPorterTask));
            AddParam(cmd, "@ISACTIVE", ParseBit(IsActive));
            AddParam(cmd, "@ACTION", Action);
            AddParam(cmd, "@ID", ID);
            AddParam(cmd, "@SERVICEID", ParseInt(ServiceID));

            cmd.CommandType = CommandType.StoredProcedure;

            Con.Open();
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_TASKTYPEMASTERINSERTUPDATE");
            dt = CreateErrorTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }

        return dt;
    }

    private static void AddParam(SqlCommand cmd, string name, object value)
    {
        if (value == null)
            cmd.Parameters.AddWithValue(name, DBNull.Value);
        else
            cmd.Parameters.AddWithValue(name, value);
    }

    private static object ParseInt(string value)
    {
        if (string.IsNullOrEmpty(value))
            return DBNull.Value;

        int result;
        if (int.TryParse(value, out result))
            return result;
        else
            return DBNull.Value;
    }

    private static object ParseBit(string value)
    {
        if (string.IsNullOrEmpty(value))
            return DBNull.Value;

        if (value == "1" || value.ToLower() == "true")
            return true;
        else if (value == "0" || value.ToLower() == "false")
            return false;

        return DBNull.Value;
    }

    private static DataTable CreateErrorTable()
    {
        DataTable dt = new DataTable();
        dt.Columns.Add("RESULT", typeof(string));
        dt.Columns.Add("MESSAGE", typeof(string));

        DataRow dr = dt.NewRow();
        dr["RESULT"] = "FALSE";
        dr["MESSAGE"] = "Database error";
        dt.Rows.Add(dr);

        return dt;
    }
    public static DataTable UpdatePorterNew(string PorterName, string UserID, string MID, string Password, string IsActive, string gpshort, string gpdevice, string ServiceID, string hospitalname, string allday)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_UPDATEPORTERS", Con);
            cmd.Parameters.AddWithValue("@ID", UserID);
            cmd.Parameters.AddWithValue("@PORTERNAME", PorterName);
            cmd.Parameters.AddWithValue("@USERID", MID);
            cmd.Parameters.AddWithValue("@PASSWORD", Password);


            cmd.Parameters.AddWithValue("@ISACTIVE", IsActive);
            cmd.Parameters.AddWithValue("@gpshort", gpshort);
            cmd.Parameters.AddWithValue("@gpdevice", gpdevice);
            cmd.Parameters.AddWithValue("@SERVICEID", ServiceID);
            cmd.Parameters.AddWithValue("@hospitalname", hospitalname);
            cmd.Parameters.AddWithValue("@ALLDAY", allday);



            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex) { InsertError(ex.Message, "SP_UPDATEPORTER"); dt = new DataTable(); }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }


    public static DataTable UpdateCategory(string Id, string Category, string TAT, string TStart, string TEnd, string Priority, string Routine, string PorterTask, string Heavy, string IsActive, string TwoPorter, string IsHaywood, string IsRoyalStoke, string IsNoPI,
                                           string IsPharmacy, string IsBP, string IsMGas, string IsWaste, string IsSupervisor, string IsSpeciman, string LightTask, string DeseasedPatient,
                                           string KPMK, string KP, string KPS, string KPR, string KPSA, string ISSIGN, string ISPHOTO, string ServiceID, string CHARGEGROUP)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_UPDATECATEGORY", Con);
            cmd.Parameters.AddWithValue("@ID", Id);
            cmd.Parameters.AddWithValue("@CATEGORY", Category);
            cmd.Parameters.AddWithValue("@TAT", TAT);
            cmd.Parameters.AddWithValue("@TSTART", TStart);
            cmd.Parameters.AddWithValue("@TEND", TEnd);
            cmd.Parameters.AddWithValue("@PRIORITY", Priority);
            cmd.Parameters.AddWithValue("@PORTERTASK", PorterTask);
            cmd.Parameters.AddWithValue("@ROUTINE", Routine);
            cmd.Parameters.AddWithValue("@HEAVY", Heavy);
            cmd.Parameters.AddWithValue("@TWOPORTER", TwoPorter);
            cmd.Parameters.AddWithValue("@ISHAYWOOD", IsHaywood);
            cmd.Parameters.AddWithValue("@ISROYALSTOKE", IsRoyalStoke);
            cmd.Parameters.AddWithValue("@ISNOPL", IsNoPI);


            cmd.Parameters.AddWithValue("@ISPHARMACY", IsPharmacy);
            cmd.Parameters.AddWithValue("@ISBLOODPRODUCT", IsBP);
            cmd.Parameters.AddWithValue("@ISMEDICALGASES", IsMGas);
            cmd.Parameters.AddWithValue("@ISWASTE", IsWaste);
            cmd.Parameters.AddWithValue("@ISSUPERVISOR", IsSupervisor);


            cmd.Parameters.AddWithValue("@KP_SUPERVISOR", KPS);
            cmd.Parameters.AddWithValue("@KP", KP);
            cmd.Parameters.AddWithValue("@KP_MAINKITCHEN", KPMK);
            cmd.Parameters.AddWithValue("@KP_RETAIL", KPR);
            cmd.Parameters.AddWithValue("@KP_SAFFRONADMIN", KPSA);

            cmd.Parameters.AddWithValue("@CHARGEGROUP", CHARGEGROUP);

            cmd.Parameters.AddWithValue("@KP_ISSIGN", ISSIGN);
            cmd.Parameters.AddWithValue("@KP_ISPHOTO", ISPHOTO);

            cmd.Parameters.AddWithValue("@SERVICEID", ServiceID);

            cmd.Parameters.AddWithValue("@ISLIGHTTASK", LightTask);
            cmd.Parameters.AddWithValue("@ISSPECIMEN", IsSpeciman);
            cmd.Parameters.AddWithValue("@ISDESEASEDPATIENT", DeseasedPatient);

            cmd.Parameters.AddWithValue("@ISACTIVE", IsActive);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex) { InsertError(ex.Message, "SP_UPDATECATEGORY"); dt = new DataTable(); }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable UpdateCategoryNew(string Id, string Category, string TAT, string TStart, string TEnd, string Priority, string Routine, string PorterTask, string Heavy, string IsActive, string TwoPorter, string IsHaywood, string IsRoyalStoke, string IsNoPI,
                                           string IsPharmacy, string IsBP, string IsMGas, string IsWaste, string IsSupervisor, string IsSpeciman, string LightTask, string DeseasedPatient,
                                           string KPMK, string KP, string KPS, string KPR, string KPSA, string ISSIGN, string ISPHOTO, string ServiceID, string CHARGEGROUP, string CLS, string CLRR)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_UPDATECATEGORY", Con);
            cmd.Parameters.AddWithValue("@ID", Id);
            cmd.Parameters.AddWithValue("@CATEGORY", Category);
            cmd.Parameters.AddWithValue("@TAT", TAT);
            cmd.Parameters.AddWithValue("@TSTART", TStart);
            cmd.Parameters.AddWithValue("@TEND", TEnd);
            cmd.Parameters.AddWithValue("@PRIORITY", Priority);
            cmd.Parameters.AddWithValue("@PORTERTASK", PorterTask);
            cmd.Parameters.AddWithValue("@ROUTINE", Routine);
            cmd.Parameters.AddWithValue("@HEAVY", Heavy);
            cmd.Parameters.AddWithValue("@TWOPORTER", TwoPorter);
            cmd.Parameters.AddWithValue("@ISHAYWOOD", IsHaywood);
            cmd.Parameters.AddWithValue("@ISROYALSTOKE", IsRoyalStoke);
            cmd.Parameters.AddWithValue("@ISNOPL", IsNoPI);


            cmd.Parameters.AddWithValue("@ISPHARMACY", IsPharmacy);
            cmd.Parameters.AddWithValue("@ISBLOODPRODUCT", IsBP);
            cmd.Parameters.AddWithValue("@ISMEDICALGASES", IsMGas);
            cmd.Parameters.AddWithValue("@ISWASTE", IsWaste);
            cmd.Parameters.AddWithValue("@ISSUPERVISOR", IsSupervisor);


            cmd.Parameters.AddWithValue("@KP_SUPERVISOR", KPS);
            cmd.Parameters.AddWithValue("@KP", KP);
            cmd.Parameters.AddWithValue("@KP_MAINKITCHEN", KPMK);
            cmd.Parameters.AddWithValue("@KP_RETAIL", KPR);
            cmd.Parameters.AddWithValue("@KP_SAFFRONADMIN", KPSA);

            cmd.Parameters.AddWithValue("@CHARGEGROUP", CHARGEGROUP);

            cmd.Parameters.AddWithValue("@KP_ISSIGN", ISSIGN);
            cmd.Parameters.AddWithValue("@KP_ISPHOTO", ISPHOTO);


            cmd.Parameters.AddWithValue("@CLS", CLS);
            cmd.Parameters.AddWithValue("@CLRR", CLRR);

            cmd.Parameters.AddWithValue("@SERVICEID", ServiceID);

            cmd.Parameters.AddWithValue("@ISLIGHTTASK", LightTask);
            cmd.Parameters.AddWithValue("@ISSPECIMEN", IsSpeciman);
            cmd.Parameters.AddWithValue("@ISDESEASEDPATIENT", DeseasedPatient);

            cmd.Parameters.AddWithValue("@ISACTIVE", IsActive);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex) { InsertError(ex.Message, "SP_UPDATECATEGORY"); dt = new DataTable(); }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    public static DataTable RoleMaster(string Id, string Role, bool Active, string Process, string TreeId)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_ROLEMASTER", Con);
            cmd.Parameters.AddWithValue("@ID", Id);
            cmd.Parameters.AddWithValue("@ROLE", Role);
            cmd.Parameters.AddWithValue("@PROCESS", Process);
            cmd.Parameters.AddWithValue("@TREEID", TreeId);
            cmd.Parameters.AddWithValue("@ACTIVE", Active);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex) { InsertError(ex.Message, "SP_ROLEMASTER"); dt = new DataTable(); }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    public static DataTable FloorMaster(string Id, string Floor, bool Active, string Process)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_FLOORMASTER", Con);
            cmd.Parameters.AddWithValue("@ID", Id);
            cmd.Parameters.AddWithValue("@FLOOR", Floor);
            cmd.Parameters.AddWithValue("@PROCESS", Process);
            cmd.Parameters.AddWithValue("@ACTIVE", Active);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex) { InsertError(ex.Message, "SP_FLOORMASTER"); dt = new DataTable(); }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    public static DataTable FloorMasterUpdate(string Id, string Floor, string FloorOrder, bool Active, string Process)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_FLOORMASTER", Con);
            cmd.Parameters.AddWithValue("@ID", Id);
            cmd.Parameters.AddWithValue("@FLOOR", Floor);
            cmd.Parameters.AddWithValue("@FLOORORDER", FloorOrder);
            cmd.Parameters.AddWithValue("@PROCESS", Process);
            cmd.Parameters.AddWithValue("@ACTIVE", Active);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex) { InsertError(ex.Message, "SP_FLOORMASTER"); dt = new DataTable(); }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    public static DataTable UserMaster(string Id, string user, string EId, string Password, string Role, bool Active, string Process)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_USERMASTER", Con);
            cmd.Parameters.AddWithValue("@ID", Id);
            cmd.Parameters.AddWithValue("@USERNAME", user);
            cmd.Parameters.AddWithValue("@PASSWORD", Password);
            cmd.Parameters.AddWithValue("@EMPID", EId);
            cmd.Parameters.AddWithValue("@ROLE", Role);
            cmd.Parameters.AddWithValue("@PROCESS", Process);
            cmd.Parameters.AddWithValue("@ACTIVE", Active);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex) { InsertError(ex.Message, "SP_USERMASTER"); dt = new DataTable(); }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    public static DataTable MailMaster(string frommail, string tomail, string ccmail, string TATTo, string TATCC, string Dailytomail, string Dailyccmail, string server, string Port, string Process)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_MAILMASTER", Con);
            cmd.Parameters.AddWithValue("@MAILFROM", frommail);
            cmd.Parameters.AddWithValue("@MAILTO", tomail);
            cmd.Parameters.AddWithValue("@MAILTOCC", ccmail);
            cmd.Parameters.AddWithValue("@TATMAILTO", TATTo);
            cmd.Parameters.AddWithValue("@TATMAILCC", TATCC);
            cmd.Parameters.AddWithValue("@DAILYMAILTO", Dailytomail);
            cmd.Parameters.AddWithValue("@DAILYMAILTOCC", Dailyccmail);
            cmd.Parameters.AddWithValue("@SERVER", server);
            cmd.Parameters.AddWithValue("@PORT", Port);
            cmd.Parameters.AddWithValue("@PROCESS", Process);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex) { InsertError(ex.Message, "SP_MAILMASTER"); dt = new DataTable(); }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    //public static DataTable PorterMaster(byte[] Image, string Id, string Name, string EmpId, string Shift, bool Active, string Process)
    //{
    //    DataTable dt = new DataTable();
    //    SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
    //    try
    //    {
    //        SqlCommand cmd = new SqlCommand("SP_PORTERMASTER", Con);
    //        cmd.Parameters.AddWithValue("@ID", Id);
    //        cmd.Parameters.AddWithValue("@NAME", Name);
    //        cmd.Parameters.AddWithValue("@EMPLOYEEID", EmpId);
    //        cmd.Parameters.AddWithValue("@SHIFT", Shift);
    //        cmd.Parameters.AddWithValue("@PROCESS", Process);
    //        cmd.Parameters.AddWithValue("@ACTIVE", Active);
    //        if (Image != null)
    //            cmd.Parameters.AddWithValue("@PHOTO", Image);
    //        cmd.CommandType = CommandType.StoredProcedure;
    //        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
    //        Con.Open();
    //        adpt.Fill(dt);
    //    }
    //    catch (Exception ex) { InsertError(ex.Message, "SP_PORTERMASTER"); }
    //    finally
    //    {
    //        if (Con.State == ConnectionState.Open)
    //            Con.Close();
    //    }
    //    return dt;
    //}
    public static DataTable PorterMaster(byte[] Image, string Id, string Name, string EmpId, string Shift, bool Active, string Process)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_PORTERMASTER", Con);
            cmd.Parameters.AddWithValue("@ID", Id);
            cmd.Parameters.AddWithValue("@NAME", Name);
            cmd.Parameters.AddWithValue("@EMPLOYEEID", EmpId);
            cmd.Parameters.AddWithValue("@SHIFT", Shift);
            cmd.Parameters.AddWithValue("@PROCESS", Process);
            cmd.Parameters.AddWithValue("@ACTIVE", Active);
            if (Image != null)
                cmd.Parameters.AddWithValue("@PHOTO", Image);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex) { InsertError(ex.Message, "SP_PORTERMASTER"); dt = new DataTable(); }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable PorterMasterGL(byte[] Image, string Id, string Name, string EmpId, string Shift, bool Active, string Process, string ServiceID)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_PORTERMASTER", Con);
            cmd.Parameters.AddWithValue("@ID", Id);
            cmd.Parameters.AddWithValue("@NAME", Name);
            cmd.Parameters.AddWithValue("@EMPLOYEEID", EmpId);
            cmd.Parameters.AddWithValue("@SHIFT", Shift);
            cmd.Parameters.AddWithValue("@PROCESS", Process);
            cmd.Parameters.AddWithValue("@SERVICEID", ServiceID);
            cmd.Parameters.AddWithValue("@ACTIVE", Active);
            if (Image != null)
                cmd.Parameters.AddWithValue("@PHOTO", Image);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex) { InsertError(ex.Message, "SP_PORTERMASTER"); dt = new DataTable(); }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }


    public static DataTable ShiftMaster(string Id, string Name, string Stime, string ETime, bool Active, string Process)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_SHIFTMASTER", Con);
            cmd.Parameters.AddWithValue("@ID", Id);
            cmd.Parameters.AddWithValue("@NAME", Name);
            cmd.Parameters.AddWithValue("@STARTTIME", Stime);
            cmd.Parameters.AddWithValue("@ENDTIME", ETime);
            cmd.Parameters.AddWithValue("@PROCESS", Process);
            cmd.Parameters.AddWithValue("@ACTIVE", Active);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex) { InsertError(ex.Message, "SP_SHIFTMASTER"); dt = new DataTable(); }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    public static DataTable ReportMaster(string Process, string From, string To, string PorterId,
                                          string Search, string Pagesize, string PageIndex,
                                          string ServiceId, string HospitalLoc,
                                          string UserId, string LocationId = "", string DepartmentId = "")
    {
        DataTable ds = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETREPORT1", Con);
            cmd.CommandTimeout = 1000;

            cmd.Parameters.AddWithValue("@PROCESS", Process);
            cmd.Parameters.AddWithValue("@FROM", From);
            cmd.Parameters.AddWithValue("@TO", To);
            cmd.Parameters.AddWithValue("@PORTERID", PorterId);
            cmd.Parameters.AddWithValue("@SEARCH", Search);
            cmd.Parameters.AddWithValue("@PAGEINDEX", PageIndex);
            cmd.Parameters.AddWithValue("@PAGESIZE", Pagesize);
            cmd.Parameters.AddWithValue("@SERVICEID", ServiceId);
            cmd.Parameters.AddWithValue("@HOSPITALLOC", HospitalLoc);
            cmd.Parameters.AddWithValue("@USERID", UserId);
            cmd.Parameters.AddWithValue("@LOCATIONID", string.IsNullOrEmpty(LocationId) ? "" : LocationId);
            cmd.Parameters.AddWithValue("@DEPARTMENTID", string.IsNullOrEmpty(DepartmentId) ? "" : DepartmentId);


            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(ds);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETREPORT1");
            ds = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return ds;
    }

    public static DataTable ReportMaster1(string Process, string From, string To, string PorterId,
                                         string Search, string Pagesize, string PageIndex,
                                         string ServiceId, string HospitalLoc,
                                         string UserId = "0", string LocationId = "", string DepartmentId = "")
    {
        DataTable ds = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETREPORT1", Con);
            cmd.CommandTimeout = 1000;

            cmd.Parameters.AddWithValue("@PROCESS", Process);
            cmd.Parameters.AddWithValue("@FROM", From);
            cmd.Parameters.AddWithValue("@TO", To);
            cmd.Parameters.AddWithValue("@PORTERID", PorterId);
            cmd.Parameters.AddWithValue("@SEARCH", Search);
            cmd.Parameters.AddWithValue("@PAGEINDEX", PageIndex);
            cmd.Parameters.AddWithValue("@PAGESIZE", Pagesize);
            cmd.Parameters.AddWithValue("@SERVICEID", ServiceId);
            cmd.Parameters.AddWithValue("@HOSPITALLOC", HospitalLoc);
            cmd.Parameters.AddWithValue("@USERID", string.IsNullOrEmpty(UserId) ? "0" : UserId);
            cmd.Parameters.AddWithValue("@LOCATIONID", string.IsNullOrEmpty(LocationId) ? "" : LocationId);
            cmd.Parameters.AddWithValue("@DEPARTMENTID", string.IsNullOrEmpty(DepartmentId) ? "" : DepartmentId);


            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(ds);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETREPORT1");
            ds = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return ds;
    }
    public static DataTable DateWiseExport(string Status, string From, string To, string Search, string ServiceID, int UserId = 0, string LocationId = null, string DepartmentId = null)
    {
        DataSet ds = new DataSet();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETREQUESTS_EXPORT", Con);
            cmd.CommandTimeout = 1000;
            cmd.Parameters.AddWithValue("@STATUS", Status);
            cmd.Parameters.AddWithValue("@FROM", From);
            cmd.Parameters.AddWithValue("@TO", To);
            cmd.Parameters.AddWithValue("@SEARCH", Search);
            cmd.Parameters.AddWithValue("@SERVICEID", ServiceID);
            cmd.Parameters.AddWithValue("@UserId", UserId);
            cmd.Parameters.AddWithValue("@LocationId", LocationId ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@DepartmentId", DepartmentId ?? (object)DBNull.Value);

            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(ds, Status);
        }
        catch (Exception ex) { InsertError(ex.Message, "SP_GETREQUESTS_EXPORT"); ds = new DataSet(); }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return ds.Tables[0];
    }

    public static DataTable ExportTrac(string Status, string From, string To, string Search, string ServiceID, int UserId = 0, string LocationId = null, string DepartmentId = null)
    {
        DataSet ds = new DataSet();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_ExportTrac_EXPORT", Con);
            cmd.CommandTimeout = 1000;
            cmd.Parameters.AddWithValue("@STATUS", Status);
            cmd.Parameters.AddWithValue("@FROM", From);
            cmd.Parameters.AddWithValue("@TO", To);

            cmd.Parameters.AddWithValue("@SEARCH", Search);

            cmd.Parameters.AddWithValue("@SERVICEID", ServiceID);
            cmd.Parameters.AddWithValue("@UserId", UserId);
            cmd.Parameters.AddWithValue("@LocationId", LocationId ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@DepartmentId", DepartmentId ?? (object)DBNull.Value);

            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(ds, Status);
        }
        catch (Exception ex) { InsertError(ex.Message, "SP_ExportTrac_EXPORT"); ds = new DataSet(); }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return ds.Tables[0];
    }

    public static DataTable PorterTrackr(string Status, string From, string To, string Search, string Pagesize, string PageIndex, string ServiceID)
    {
        DataSet ds = new DataSet();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETPORTERTRAC_REPORT", Con);
            cmd.CommandTimeout = 1000;
            cmd.Parameters.AddWithValue("@STATUS", Status);
            cmd.Parameters.AddWithValue("@FROM", From);
            cmd.Parameters.AddWithValue("@TO", To);
            cmd.Parameters.AddWithValue("@SEARCH", Search);
            cmd.Parameters.AddWithValue("@SERVICEID", ServiceID);
            cmd.Parameters.AddWithValue("@PAGEINDEX", PageIndex);
            cmd.Parameters.AddWithValue("@PAGESIZE", Pagesize);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(ds);
        }
        catch (SqlException ex) { InsertError(ex.Message, "SP_GETREQUESTS_REPORT"); ds = new DataSet(); }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return ds.Tables[0];
    }

    public static DataTable DateWise(string Status, string From, string To, string Search, string Pagesize, string PageIndex, string ServiceID, string UserId, string NurseLocation, string Department)
    {
        DataSet ds = new DataSet();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_GETREQUESTS_REPORT1", Con);
            cmd.CommandTimeout = 1000;
            cmd.Parameters.AddWithValue("@STATUS", Status);
            cmd.Parameters.AddWithValue("@FROM", From);
            cmd.Parameters.AddWithValue("@TO", To);
            cmd.Parameters.AddWithValue("@SEARCH", Search);
            cmd.Parameters.AddWithValue("@SERVICEID", ServiceID);
            cmd.Parameters.AddWithValue("@PAGEINDEX", PageIndex);
            cmd.Parameters.AddWithValue("@PAGESIZE", Pagesize);
            cmd.Parameters.AddWithValue("@UserId", UserId);


            cmd.Parameters.AddWithValue("@LocationId", NurseLocation);
            cmd.Parameters.AddWithValue("@DepartmentId", Department);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(ds);
        }
        catch (SqlException ex) { InsertError(ex.Message, "SP_GETREQUESTS_REPORT1"); ds = new DataSet(); }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return ds.Tables[0];
    }

    //public static string CheckUser(string User, string Password)
    //{
    //    DataTable dt = new DataTable();
    //    SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
    //    try
    //    {
    //        SqlCommand cmd = new SqlCommand("SP_CHECKUSER_WEB", Con);
    //        cmd.Parameters.AddWithValue("@USERNAME", User);
    //        cmd.Parameters.AddWithValue("@PASSWORD", Password);
    //        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
    //        cmd.CommandType = CommandType.StoredProcedure;
    //        Con.Open();
    //        adpt.Fill(dt);
    //    }
    //    catch (Exception ex) { InsertError(ex.Message, "SP_CHECKUSER_WEB"); dt = new DataTable(); }
    //    finally
    //    {
    //        if (Con.State == ConnectionState.Open)
    //            Con.Close();
    //    }
    //    return dt.Rows[0]["RESULT"].ToString();
    //}


    public static string GetHospitalConnectionString(string hospitalCode)
    {
        string centralConn = ConfigurationManager.ConnectionStrings["CentralDB"].ConnectionString;
        string connStr = null;

        using (SqlConnection cn = new SqlConnection(centralConn))
        using (SqlCommand cmd = new SqlCommand("SP_GET_HOSPITAL_CONNECTION", cn))
        {
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@HospitalCode", hospitalCode);
            cn.Open();
            object result = cmd.ExecuteScalar();
            if (result != null && result != DBNull.Value)
                connStr = result.ToString();
        }

        if (string.IsNullOrEmpty(connStr))
            throw new Exception("Hospital '" + hospitalCode + "' is not configured.");

        return connStr;
    }

    public static string CheckUser(string User, string Password, string hospitalCode)
    {
        DataTable dt = new DataTable();

        try
        {
            string connStr;
            if (string.IsNullOrEmpty(hospitalCode))
            {

                connStr = Tenant.ConnectionString;
            }
            else
            {
                connStr = GetHospitalConnectionString(hospitalCode);
            }

            using (SqlConnection Con = new SqlConnection(connStr))
            using (SqlCommand cmd = new SqlCommand("SP_CHECKUSER_WEB", Con))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@USERNAME", User);
                cmd.Parameters.AddWithValue("@PASSWORD", Password);
                using (SqlDataAdapter adpt = new SqlDataAdapter(cmd))
                {
                    Con.Open();
                    adpt.Fill(dt);
                }
            }
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_CHECKUSER_WEB");
            dt = new DataTable();
        }

        return (dt.Rows.Count > 0) ? dt.Rows[0]["RESULT"].ToString() : "FALSE";
    }


    public static string CheckHISUser(string User, string Password, string MID)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_HISGETUSER", Con);
            cmd.Parameters.AddWithValue("@USERNAME", User);
            cmd.Parameters.AddWithValue("@PASSWORD", Password);
            cmd.Parameters.AddWithValue("@EMPID", MID);
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            cmd.CommandType = CommandType.StoredProcedure;
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex) { InsertError(ex.Message, "SP_HISGETUSER"); dt = new DataTable(); }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt.Rows[0]["RESULT"].ToString().ToUpper();
    }
    public static DataTable TagMaster(string Process, string TagId, string MacId, bool Active)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_TAGMASTER", Con);
            cmd.Parameters.AddWithValue("@PROCESS", Process);
            cmd.Parameters.AddWithValue("@MACID", MacId);
            cmd.Parameters.AddWithValue("@ID", TagId);
            cmd.Parameters.AddWithValue("@ACTIVE", Active);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex) { InsertError(ex.Message, "SP_TAGMASTER"); dt = new DataTable(); }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    public static XmlDocument xmlPopulate(string SQLStr)
    {
        XmlDocument tempDoc = new XmlDocument();
        try
        {
            SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
            XmlReader xmlreader;
            SqlCommand dbCommand = new SqlCommand(SQLStr, Con);
            dbCommand.CommandType = CommandType.Text;
            Con.Open();
            xmlreader = dbCommand.ExecuteXmlReader();
            tempDoc.Load(xmlreader);

            dbCommand.Dispose();
            Con.Close();
            Con.Dispose();
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "XMLPOPULATE"); tempDoc = new XmlDocument();
        }
        return tempDoc;
    }

    public static DataTable ReportExport(string Process, string From, string To)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand("SP_GETREPORTEXPORT", Con);
        cmd.CommandTimeout = 1000;
        cmd.Parameters.AddWithValue("@PROCESS", Process);
        cmd.Parameters.AddWithValue("@FROM", From);
        cmd.Parameters.AddWithValue("@TO", To);
        cmd.CommandType = CommandType.StoredProcedure;
        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
        try
        {
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {

            if (Con.State != ConnectionState.Closed)
                Con.Close();
            try
            {
                Con.Open();
                adpt.Fill(dt);
            }
            catch (Exception ex1)
            {
                InsertError(ex1.Message, "SP_GETREPORT");
                dt = new DataTable();
            }
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable GetAssignRecords(string Proc, string Param)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand(Proc, Con);
        if (!string.IsNullOrEmpty(Param))
            cmd.Parameters.AddWithValue("@REQID", Param);
        cmd.CommandType = CommandType.StoredProcedure;
        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
        try
        {
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETASSIGNRECORDS");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable AssignTask(string Proc, string RequestID, string PorterId)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand(Proc, Con);
        cmd.Parameters.AddWithValue("@REQID", RequestID);
        cmd.Parameters.AddWithValue("@ASSIGNTO", PorterId);
        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
        cmd.CommandType = CommandType.StoredProcedure;
        try
        {
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {

            InsertError(ex.Message, Proc);
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    public static DataTable updateLocation(string RequestId, string DLocID, string Dloc, string TagID, string User, string RQuery, string Category, string CCategory)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_UPDATELOCATION", Con);
            cmd.Parameters.AddWithValue("@REQID", RequestId);
            cmd.Parameters.AddWithValue("@DESTID", DLocID);
            cmd.Parameters.AddWithValue("@TAGID", TagID);
            cmd.Parameters.AddWithValue("@DLOC", Dloc);
            cmd.Parameters.AddWithValue("@USERID", User);
            cmd.Parameters.AddWithValue("@RQUERY", RQuery);
            cmd.Parameters.AddWithValue("@CATEGORY", Category);
            cmd.Parameters.AddWithValue("@CCATEGORY", CCategory);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_UPDATELOCATION");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    public static DataTable ResumeHoldTask(string RequestID, string UserID)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand("SP_RELEASEONHOLD", Con);
        cmd.Parameters.AddWithValue("@REQUESTID", RequestID);
        cmd.Parameters.AddWithValue("@USERID", UserID);
        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
        cmd.CommandType = CommandType.StoredProcedure;
        try
        {
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {

            InsertError(ex.Message, "SP_RELEASEONHOLD");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable SetHoldTask(string RequestID, string PorterId, string Reason, string UserID, string MIndex)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand("SP_SETONHOLD", Con);
        cmd.Parameters.AddWithValue("@REQUESTID", RequestID);
        cmd.Parameters.AddWithValue("@ONHOLDREMARKS", Reason);
        cmd.Parameters.AddWithValue("@USERID", UserID);
        cmd.Parameters.AddWithValue("@PORTERIDS", PorterId);
        cmd.Parameters.AddWithValue("@MIINDEX", MIndex);
        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
        cmd.CommandType = CommandType.StoredProcedure;
        try
        {
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {

            InsertError(ex.Message, "SP_SETONHOLD");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable CancelTaskN(string RequestID, string PorterId, string PreBook, string Reason, string UserID, string MIndex, string Occurrence)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand("SP_CANCELREQUEST", Con);
        cmd.Parameters.AddWithValue("@REQUESTID", RequestID);
        cmd.Parameters.AddWithValue("@PREBOOK", PreBook);
        cmd.Parameters.AddWithValue("@REASON", Reason);
        cmd.Parameters.AddWithValue("@PORTERIDS", PorterId);
        cmd.Parameters.AddWithValue("@USERID", UserID);
        cmd.Parameters.AddWithValue("@MIINDEX", MIndex);
        cmd.Parameters.AddWithValue("@OCCURRENCE", Occurrence);
        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
        cmd.CommandType = CommandType.StoredProcedure;
        try
        {
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {

            InsertError(ex.Message, "SP_CANCELREQUEST");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    public static DataTable CancelTask(string RequestID, string PorterId, string PreBook, string Reason, string UserID, string MIndex)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand("SP_CANCELREQUEST", Con);
        cmd.Parameters.AddWithValue("@REQUESTID", RequestID);
        cmd.Parameters.AddWithValue("@PREBOOK", PreBook);
        cmd.Parameters.AddWithValue("@REASON", Reason);
        cmd.Parameters.AddWithValue("@PORTERIDS", PorterId);
        cmd.Parameters.AddWithValue("@USERID", UserID);
        cmd.Parameters.AddWithValue("@MIINDEX", MIndex);
        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
        cmd.CommandType = CommandType.StoredProcedure;
        try
        {
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {

            InsertError(ex.Message, "SP_CANCELREQUEST");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable AddCompleteRemarks(string RequestID, string Remarks, string UserID, string IsMitigation)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand("SP_COMPLETETASK_REMARKS", Con);
        cmd.Parameters.AddWithValue("@REQUESTID", RequestID);
        cmd.Parameters.AddWithValue("@REMARKS", Remarks);
        cmd.Parameters.AddWithValue("@USERID", UserID);
        cmd.Parameters.AddWithValue("@ISMITIGATION", IsMitigation);

        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
        cmd.CommandType = CommandType.StoredProcedure;
        try
        {
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {

            InsertError(ex.Message, "SP_COMPLETETASK_REMARKS");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable AddRequestLog(string RequestID, string Remarks, string UserID, string IsMitigation)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand("SP_REQUEST_LOGS", Con);
        cmd.Parameters.AddWithValue("@REQUESTID", RequestID);
        cmd.Parameters.AddWithValue("@REMARKS", Remarks);
        cmd.Parameters.AddWithValue("@USERID", UserID);
        cmd.Parameters.AddWithValue("@ISMITIGATION", IsMitigation);

        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
        cmd.CommandType = CommandType.StoredProcedure;
        try
        {
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {

            InsertError(ex.Message, "SP_COMPLETETASK_REMARKS");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable CompleteTask(string RequestID, string PorterId, string TagID, string Reason, string UserID, string MIndex)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand("SP_COMPLETECURRENTTASK_START", Con);
        cmd.Parameters.AddWithValue("@REQUESTID", RequestID);
        cmd.Parameters.AddWithValue("@TAGID", TagID);
        cmd.Parameters.AddWithValue("@REASON", Reason);
        cmd.Parameters.AddWithValue("@PORTERIDS", PorterId);
        cmd.Parameters.AddWithValue("@MIINDEX", MIndex);
        cmd.Parameters.AddWithValue("@USERID", UserID);
        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
        cmd.CommandType = CommandType.StoredProcedure;
        try
        {
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {

            InsertError(ex.Message, "SP_COMPLETECURRENTTASK_START");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    public static DataTable CompleteTask(string RequestID, string Reason, string UserID, string MIndex)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand("SP_COMPLETECURRENTTASK_START", Con);
        cmd.Parameters.AddWithValue("@REQUESTID", RequestID);
        cmd.Parameters.AddWithValue("@REASON", Reason);
        cmd.Parameters.AddWithValue("@USER", UserID);
        cmd.Parameters.AddWithValue("@MIINDEX", MIndex);
        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
        cmd.CommandType = CommandType.StoredProcedure;
        try
        {
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {

            InsertError(ex.Message, "SP_COMPLETECURRENTTASK_START");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static DataTable StartTask(string RequestID, string Reason, string MIndex, string UserID)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand("SP_STARTCURRENTTASK", Con);
        cmd.Parameters.AddWithValue("@REQUESTID", RequestID);
        cmd.Parameters.AddWithValue("@REASON", Reason);
        cmd.Parameters.AddWithValue("@USER", UserID);
        cmd.Parameters.AddWithValue("@MIINDEX", MIndex);
        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
        cmd.CommandType = CommandType.StoredProcedure;
        try
        {
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {

            InsertError(ex.Message, "SP_STARTCURRENTTASK");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }


    public static DataTable AssignPorter(string RequestID)
    {
        DataTable dt = new DataTable();
        try
        {
            string PorterId = DataAccess.GetPorter(RequestID);
            if (PorterId != "0" && PorterId != "1001")
                dt = DataAccess.AssignTask("SP_ASSIGNPORTER", RequestID, PorterId);
        }
        catch (Exception ex)
        {

            InsertError(ex.Message, "SP_ASSIGNPORTER");
            dt = new DataTable();
        }
        return dt;
    }
    public static string GetPorter(string RequestID)
    {
        DataTable dt = new DataTable();
        try
        {
            dt = DataAccess.GetAssignRecords("SP_GETPORTERID", RequestID);
        }
        catch (Exception ex)
        {

            InsertError(ex.Message, "SP_GETPORTERID");
            dt = new DataTable();
        }
        return (dt.Rows.Count > 0) ? (dt.Rows[0]["MULTIPORTER"].ToString() == "YES") ? (dt.Rows.Count > 1) ? dt.Rows[0]["Id"].ToString() + "_" + dt.Rows[1]["Id"].ToString() : "1001" : dt.Rows[0]["Id"].ToString() : "0";
    }

    public static DataTable GetCategorywisePerformance(string From, string To)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand("SP_PORTERPERFORMANCECATEGORYWISE", Con);
        cmd.CommandTimeout = 1000;
        cmd.Parameters.AddWithValue("@FROM", From);
        cmd.Parameters.AddWithValue("@TO", To);
        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
        cmd.CommandType = CommandType.StoredProcedure;
        try
        {
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {

            InsertError(ex.Message, "SP_PORTERPERFORMANCECATEGORYWISE");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }
    public static DataTable PorterDetails(string ReqNo, string User, string Process)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand("SP_GETPOPUPPORTDETAILS", Con);
        cmd.CommandTimeout = 1000;
        cmd.Parameters.AddWithValue("@REQUESTID", ReqNo);
        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
        cmd.CommandType = CommandType.StoredProcedure;
        try
        {
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETPOPUPPORTDETAILS");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;

    }

    public static DataTable GetPopDetails(string ReqNo, string User, string Process)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand("SP_GETPOPUPDETAILS", Con);
        cmd.CommandTimeout = 1000;
        cmd.Parameters.AddWithValue("@REQNO", ReqNo);
        cmd.Parameters.AddWithValue("@USER", User);
        cmd.Parameters.AddWithValue("@PROCESS", Process);
        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
        cmd.CommandType = CommandType.StoredProcedure;
        try
        {
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {

            InsertError(ex.Message, "SP_GETPOPUPDETAILS");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;

    }
    public static DataTable GetDeptPorters(string PorterName, string IsInitiate, string Porter1, string Porter2)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand("SP_GETPORTERSBYNAME_ADHOC", Con);
        cmd.CommandTimeout = 1000;
        cmd.Parameters.AddWithValue("@PORTERNAME", PorterName);
        cmd.Parameters.AddWithValue("@ISINITIATE", IsInitiate);
        cmd.Parameters.AddWithValue("@PORTERID1", Porter1);
        cmd.Parameters.AddWithValue("@PORTERID2", Porter2);
        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
        cmd.CommandType = CommandType.StoredProcedure;
        try
        {
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {

            InsertError(ex.Message, "SP_GETPORTERSBYNAME_ADHOC");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;

    }
    public static DataTable ManualAssign(string ReqID, string Porter1, string Porter2)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand("SP_MANUALASSIGN", Con);
        cmd.CommandTimeout = 1000;
        cmd.Parameters.AddWithValue("@REQUESTID", ReqID);
        cmd.Parameters.AddWithValue("@PORTERID1", Porter1);
        cmd.Parameters.AddWithValue("@PORTERID2", Porter2);
        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
        cmd.CommandType = CommandType.StoredProcedure;
        try
        {
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_MANUALASSIGN");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;

    }



    public static DataSet GetRecord(string ProcedureName, string ParamName, string ParamValue)
    {
        DataSet ds = new DataSet();
        string constr = Tenant.ConnectionString;
        try
        {
            using (SqlConnection con = new SqlConnection(constr))
            {
                SqlCommand cmd = new SqlCommand(ProcedureName, con);
                cmd.Parameters.AddWithValue(ParamName, ParamValue);
                cmd.CommandType = CommandType.StoredProcedure;
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(ds);
            }

        }
        catch (Exception ex)
        {
            InsertError(ex.Message, ProcedureName);
            ds = new DataSet();
        }
        return ds;
    }

    public static DataSet getRecord(string SpName, SqlParameter[] prms)
    {
        DataSet ds = new DataSet();

        using (SqlConnection con = new SqlConnection(Tenant.ConnectionString))
        using (SqlCommand cmd = new SqlCommand(SpName, con))
        {
            cmd.CommandType = CommandType.StoredProcedure;

            if (prms != null && prms.Length > 0)
                cmd.Parameters.AddRange(prms);

            try
            {
                SqlDataAdapter adpt = new SqlDataAdapter(cmd);
                con.Open();
                adpt.Fill(ds);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, SpName);
                return new DataSet();
            }
        }

        return ds;
    }

    public static DataTable GetRecords(string ProcedureName, string ParamName, string ParamValue)
    {
        DataTable ds = new DataTable();
        string constr = Tenant.ConnectionString;

        try
        {
            using (SqlConnection con = new SqlConnection(constr))
            {
                SqlCommand cmd = new SqlCommand(ProcedureName, con);
                cmd.Parameters.AddWithValue(ParamName, ParamValue);
                cmd.CommandType = CommandType.StoredProcedure;
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(ds);
            }

        }
        catch (Exception ex)
        {
            InsertError(ex.Message, ProcedureName);
            ds = new DataTable();
        }
        return ds;
    }

    public static DataSet GetRecordss(string ProcedureName, string ParamName, string ParamValue, string ParamName1, string ParamValue1)
    {
        DataSet ds = new DataSet();
        string constr = Tenant.ConnectionString;
        try
        {
            using (SqlConnection con = new SqlConnection(constr))
            {
                SqlCommand cmd = new SqlCommand(ProcedureName, con);
                cmd.Parameters.AddWithValue(ParamName, ParamValue);
                cmd.Parameters.AddWithValue(ParamName1, ParamValue1);
                cmd.CommandType = CommandType.StoredProcedure;
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(ds);
            }

        }
        catch (Exception ex)
        {
            InsertError(ex.Message, ProcedureName);
            ds = new DataSet();
        }
        return ds;
    }

    public static DataSet GetRecordss(string ProcedureName, string ParamName, string ParamValue, string ParamName1, string ParamValue1, string ParamName2, string ParamValue2)
    {
        DataSet ds = new DataSet();
        string constr = Tenant.ConnectionString;
        try
        {
            using (SqlConnection con = new SqlConnection(constr))
            {
                SqlCommand cmd = new SqlCommand(ProcedureName, con);
                cmd.Parameters.AddWithValue(ParamName, ParamValue);
                cmd.Parameters.AddWithValue(ParamName1, ParamValue1);
                cmd.Parameters.AddWithValue(ParamName2, ParamValue2);
                cmd.CommandType = CommandType.StoredProcedure;
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(ds);
            }

        }
        catch (Exception ex)
        {
            InsertError(ex.Message, ProcedureName);
            ds = new DataSet();
        }
        return ds;
    }

    public static DataSet GetRecordss(string ProcedureName, string ParamName, string ParamValue, string ParamName1, string ParamValue1, string ParamName2, string ParamValue2, string ParamName3, string ParamValue3)
    {
        DataSet ds = new DataSet();
        string constr = Tenant.ConnectionString;

        try
        {
            using (SqlConnection con = new SqlConnection(constr))
            {
                SqlCommand cmd = new SqlCommand(ProcedureName, con);
                cmd.Parameters.AddWithValue(ParamName, ParamValue);
                cmd.Parameters.AddWithValue(ParamName1, ParamValue1);
                cmd.Parameters.AddWithValue(ParamName2, ParamValue2);
                cmd.Parameters.AddWithValue(ParamName3, ParamValue3);
                cmd.CommandType = CommandType.StoredProcedure;
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(ds);
            }

        }
        catch (Exception ex)
        {
            InsertError(ex.Message, ProcedureName);
            ds = new DataSet();
        }
        return ds;
    }

    public static DataTable UpdateSchBreak(string porterid, string dur, string starttim, string action, string Id, string updatedby, string PorterName, string ServiceID)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        try
        {
            SqlCommand cmd = new SqlCommand("SP_BREAKINSERTUPDATE", Con);
            cmd.Parameters.AddWithValue("@PORTERID", porterid);
            cmd.Parameters.AddWithValue("@DURATION", dur);
            cmd.Parameters.AddWithValue("@STARTTIME", starttim);
            cmd.Parameters.AddWithValue("@PORTERNAME", PorterName);
            cmd.Parameters.AddWithValue("@UPDATEDBY", updatedby);
            cmd.Parameters.AddWithValue("@ACTION", action);
            cmd.Parameters.AddWithValue("@SERVICEID", ServiceID);
            cmd.Parameters.AddWithValue("@ID", Id);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (Con.State == ConnectionState.Closed)
                Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_BREAKINSERTUPDATE");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;
    }

    public static void Execute(string TableName, string Column1, string Value1, string Column2, string Value2, string whereColumn1, string whereValue1)
    {
        try
        {
            SqlConnection TmpCon = new SqlConnection(Tenant.ConnectionString);
            SqlCommand cmd = new SqlCommand("SP_EXECUTEUPDATE", TmpCon);
            cmd.Parameters.AddWithValue("@TABLENAME", TableName);

            cmd.Parameters.AddWithValue("@COLUMN1", Column1);
            cmd.Parameters.AddWithValue("@VALUE1", Value1);
            if (Column2.Length > 0)
            {
                cmd.Parameters.AddWithValue("@COLUMN2", Column2);
                cmd.Parameters.AddWithValue("@VALUE2", Value2);
            }
            cmd.Parameters.AddWithValue("@WHERECOLUMN1", whereColumn1);
            cmd.Parameters.AddWithValue("@WHEREVALUE1", whereValue1);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataAdapter adpt = new SqlDataAdapter(cmd);
            if (TmpCon.State == ConnectionState.Closed)
                TmpCon.Open();
            cmd.ExecuteNonQuery();
            TmpCon.Close();
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_EXECUTEUPDATE");
        }
    }
    public static DataTable MultiTasking(string ReqID, string Porter, string Dept)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand("SP_MULTITASKING", Con);
        cmd.CommandTimeout = 1000;
        cmd.Parameters.AddWithValue("@REQUESTID", ReqID);
        cmd.Parameters.AddWithValue("@PORTERID", Porter);
        cmd.Parameters.AddWithValue("@DEPT", Dept);
        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
        cmd.CommandType = CommandType.StoredProcedure;
        try
        {
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_MULTITASKING");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;

    }

    public static DataTable GetRecords(string ProcedureName)
    {
        DataTable ds = new DataTable();
        string constr = Tenant.ConnectionString;
        try
        {
            using (SqlConnection con = new SqlConnection(constr))
            {
                SqlCommand cmd = new SqlCommand(ProcedureName, con);
                cmd.CommandType = CommandType.StoredProcedure;
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(ds);
            }
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, ProcedureName);
            ds = new DataTable();
        }
        return ds;

    }

    public static DataTable GetRecords(string ProcedureName, string ParamName, string ParamValue, string ParamName1, string ParamValue1, string ParamName2, string ParamValue2)
    {
        DataTable ds = new DataTable();
        string constr = Tenant.ConnectionString;
        try
        {
            using (SqlConnection con = new SqlConnection(constr))
            {
                SqlCommand cmd = new SqlCommand(ProcedureName, con);
                cmd.Parameters.AddWithValue(ParamName, ParamValue);
                cmd.Parameters.AddWithValue(ParamName1, ParamValue1);
                cmd.Parameters.AddWithValue(ParamName2, ParamValue2);
                cmd.CommandType = CommandType.StoredProcedure;
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(ds);
            }
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, ProcedureName);
            ds = new DataTable();
        }
        return ds;

    }


    public static DataTable RGSearch(string ProcedureName, string ParamName, string ParamValue, string ParamName1, string ParamValue1, string ParamName2, string ParamValue2, string ParamName3, string ParamValue3)
    {
        DataTable ds = new DataTable();
        string constr = Tenant.ConnectionString;
        try
        {
            using (SqlConnection con = new SqlConnection(constr))
            {
                SqlCommand cmd = new SqlCommand(ProcedureName, con);
                cmd.Parameters.AddWithValue(ParamName, ParamValue);
                cmd.Parameters.AddWithValue(ParamName1, ParamValue1);
                cmd.Parameters.AddWithValue(ParamName2, ParamValue2);
                cmd.Parameters.AddWithValue(ParamName3, ParamValue3);
                cmd.CommandType = CommandType.StoredProcedure;
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(ds);
            }
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, ProcedureName);
            ds = new DataTable();
        }
        return ds;
    }
    public static DataTable GetRecords(string ProcedureName, string ParamName, string ParamValue, string ParamName1, string ParamValue1)
    {
        DataTable ds = new DataTable();
        string constr = Tenant.ConnectionString;
        try
        {

            using (SqlConnection con = new SqlConnection(constr))
            {
                SqlCommand cmd = new SqlCommand(ProcedureName, con);
                cmd.Parameters.AddWithValue(ParamName, ParamValue);
                cmd.Parameters.AddWithValue(ParamName1, ParamValue1);
                cmd.CommandType = CommandType.StoredProcedure;
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(ds);
            }
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, ProcedureName);
            ds = new DataTable();
        }
        return ds;
    }
    public static DataTable GetEscalationRecords(string from, string To, string Porter)
    {
        DataTable ds = new DataTable();
        string constr = Tenant.ConnectionString;
        try
        {

            using (SqlConnection con = new SqlConnection(constr))
            {
                SqlCommand cmd = new SqlCommand("SP_GETESCALATIONPERCENTAGE", con);
                cmd.Parameters.AddWithValue("@FROM", from);
                cmd.Parameters.AddWithValue("@TO", To);
                cmd.Parameters.AddWithValue("@ASSIGNTO", Porter);
                cmd.CommandType = CommandType.StoredProcedure;
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(ds);
            }
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_GETESCALATIONPERCENTAGE");
            ds = new DataTable();
        }
        return ds;
    }
    public static string GetResult(string Proc, string Param, string Value)
    {
        DataTable ds = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand(Proc, Con);
        cmd.Parameters.AddWithValue(Param, Value);
        cmd.CommandType = CommandType.StoredProcedure;
        try
        {
            SqlDataAdapter adpt = new SqlDataAdapter(cmd); Con.Open();
            adpt.Fill(ds);
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, Proc);
            ds = new DataTable();
        }
        finally
        {
            while (ds.Rows.Count == 0)
            {
                SqlDataAdapter adpt = new SqlDataAdapter(cmd);
                if (Con.State == ConnectionState.Closed)
                    Con.Open();
                adpt.Fill(ds);
            }
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return (ds.Rows.Count > 0) ? ds.Rows[0]["RESULT"].ToString() : "";
    }

    public static DataSet PersetMaster(string ProcedureName, string Msg, string GroupName, string ID, string process, string ServiceID)
    {
        DataSet ds = new DataSet();
        string constr = Tenant.ConnectionString;
        try
        {
            using (SqlConnection con = new SqlConnection(constr))
            {
                SqlCommand cmd = new SqlCommand(ProcedureName, con);
                cmd.Parameters.AddWithValue("@MSG", Msg);
                cmd.Parameters.AddWithValue("@ID", ID);
                cmd.Parameters.AddWithValue("@GROUPNAME", GroupName);
                cmd.Parameters.AddWithValue("@PROCESS", process);
                cmd.Parameters.AddWithValue("@SERVICEID", ServiceID);
                cmd.CommandType = CommandType.StoredProcedure;
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(ds);
            }
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, ProcedureName);
            ds = new DataSet();
        }
        return ds;
    }

    public static DataSet Departmentmaster(string ProcedureName, string Dept, string Is24Hrs, string ID, string process)
    {
        DataSet ds = new DataSet();
        string constr = Tenant.ConnectionString;
        try
        {
            using (SqlConnection con = new SqlConnection(constr))
            {
                SqlCommand cmd = new SqlCommand(ProcedureName, con);
                cmd.Parameters.AddWithValue("@DEPARTMENT", Dept);
                cmd.Parameters.AddWithValue("@ID", ID);
                cmd.Parameters.AddWithValue("@IS24HRS", Is24Hrs);
                cmd.Parameters.AddWithValue("@PROCESS", process);
                cmd.CommandType = CommandType.StoredProcedure;
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(ds);
            }
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, ProcedureName);
            ds = new DataSet();
        }
        return ds;
    }
    public static DataSet RequestGroup(string Group, string IsActive, string ID, string process)
    {
        DataSet ds = new DataSet();
        string constr = Tenant.ConnectionString;
        try
        {
            using (SqlConnection con = new SqlConnection(constr))
            {
                SqlCommand cmd = new SqlCommand("SP_REQUESTGROUP", con);
                cmd.Parameters.AddWithValue("@GROUPNAME", Group);
                cmd.Parameters.AddWithValue("@ID", ID);
                cmd.Parameters.AddWithValue("@ISACTIVE", IsActive);
                cmd.Parameters.AddWithValue("@PROCESS", process);
                cmd.CommandType = CommandType.StoredProcedure;
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(ds);

            }
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_REQUESTGROUP");
            ds = new DataSet();
        }
        return ds;
    }
    public static DataTable GetDeptIdlePorters(string PorterName, string Dept, string IsInitiate, string Porter1, string Porter2)
    {
        DataTable dt = new DataTable();
        SqlConnection Con = new SqlConnection(Tenant.ConnectionString);
        SqlCommand cmd = new SqlCommand("SP_GETIDLEPORTERSBYNAME_ADHOC", Con);
        cmd.CommandTimeout = 1000;
        cmd.Parameters.AddWithValue("@PORTERNAME", PorterName);
        cmd.Parameters.AddWithValue("@DEPT", Dept);
        cmd.Parameters.AddWithValue("@ISINITIATE", IsInitiate);
        cmd.Parameters.AddWithValue("@PORTERID1", Porter1);
        cmd.Parameters.AddWithValue("@PORTERID2", Porter2);
        SqlDataAdapter adpt = new SqlDataAdapter(cmd);
        cmd.CommandType = CommandType.StoredProcedure;
        try
        {
            Con.Open();
            adpt.Fill(dt);
        }
        catch (Exception ex)
        {

            InsertError(ex.Message, "[SP_GETIDLEPORTERSBYNAME_ADHOC]");
            dt = new DataTable();
        }
        finally
        {
            if (Con.State == ConnectionState.Open)
                Con.Close();
        }
        return dt;

    }

    public static DataTable getResorceUsage(string from, string To, string Porter, string GroupBy,
                                           string Serviceid, string Hospitalloc,
                                           string UserId = "0", string LocationId = "", string DepartmentId = "")
    {
        string constr = Tenant.ConnectionString;
        DataTable ds = new DataTable();
        using (SqlConnection con = new SqlConnection(constr))
        {
            SqlCommand cmd = new SqlCommand("SP_REPORT_RESOURCEUSEAGE1", con);
            cmd.Parameters.AddWithValue("@FROM", from);
            cmd.Parameters.AddWithValue("@TO", To);
            cmd.Parameters.AddWithValue("@PORTERID", Porter);
            cmd.Parameters.AddWithValue("@GROUPBY", GroupBy);
            cmd.Parameters.AddWithValue("@SERVICEID", Serviceid);
            cmd.Parameters.AddWithValue("@HOSPITALLOC", Hospitalloc);
            cmd.Parameters.AddWithValue("@USERID", string.IsNullOrEmpty(UserId) ? "0" : UserId);
            cmd.Parameters.AddWithValue("@LOCATIONID", string.IsNullOrEmpty(LocationId) ? "" : LocationId);
            cmd.Parameters.AddWithValue("@DEPARTMENTID", string.IsNullOrEmpty(DepartmentId) ? "" : DepartmentId);

            cmd.CommandType = CommandType.StoredProcedure;
            try
            {
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(ds);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_REPORT_RESOURCEUSEAGE");
                ds = new DataTable();
            }
        }
        return ds;
    }
    public static DataTable getEmpOpportunity(string from, string To, string GroupBy)
    {
        string constr = Tenant.ConnectionString;
        DataTable ds = new DataTable();
        using (SqlConnection con = new SqlConnection(constr))
        {
            SqlCommand cmd = new SqlCommand("SP_REPORT_EMPOPPORTUNITY", con);
            cmd.Parameters.AddWithValue("@FROM", from);
            cmd.Parameters.AddWithValue("@TO", To);
            cmd.Parameters.AddWithValue("@GROUPBY", GroupBy);
            cmd.CommandType = CommandType.StoredProcedure;
            try
            {
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(ds);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_REPORT_EMPOPPORTUNITY");
            }
        }
        return ds;

    }
    public static DataTable getDurationOverruns(string from, string To, string Porter, string GroupBy,
                                               string Serviceid, string Hospitalloc,
                                               string UserId = "0", string LocationId = "", string DepartmentId = "")
    {
        string constr = Tenant.ConnectionString;
        DataTable ds = new DataTable();
        using (SqlConnection con = new SqlConnection(constr))
        {
            SqlCommand cmd = new SqlCommand("SP_REPORT_DURATIONOVERRUNSCOUNT1", con);
            cmd.Parameters.AddWithValue("@FROM", from);
            cmd.Parameters.AddWithValue("@TO", To);
            cmd.Parameters.AddWithValue("@PORTERID", Porter);
            cmd.Parameters.AddWithValue("@GROUPBY", GroupBy);
            cmd.Parameters.AddWithValue("@SERVICEID", Serviceid);
            cmd.Parameters.AddWithValue("@HOSPITALLOC", Hospitalloc);
            cmd.Parameters.AddWithValue("@USERID", string.IsNullOrEmpty(UserId) ? "0" : UserId);
            cmd.Parameters.AddWithValue("@LOCATIONID", string.IsNullOrEmpty(LocationId) ? "" : LocationId);
            cmd.Parameters.AddWithValue("@DEPARTMENTID", string.IsNullOrEmpty(DepartmentId) ? "" : DepartmentId);
            cmd.CommandType = CommandType.StoredProcedure;
            try
            {
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(ds);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_REPORT_DURATIONOVERRUNSCOUNT");
                ds = new DataTable();
            }
        }
        return ds;
    }

    public static DataTable getResponseOverruns(string from, string To, string Porter, string GroupBy,
                                               string Serviceid, string Hospitalloc,
                                               string UserId = "0", string LocationId = "", string DepartmentId = "")
    {
        string constr = Tenant.ConnectionString;
        DataTable ds = new DataTable();
        using (SqlConnection con = new SqlConnection(constr))
        {
            SqlCommand cmd = new SqlCommand("SP_REPORT_RESPONSEOVERRUNSCOUNT1", con);
            cmd.Parameters.AddWithValue("@FROM", from);
            cmd.Parameters.AddWithValue("@TO", To);
            cmd.Parameters.AddWithValue("@PORTERID", Porter);
            cmd.Parameters.AddWithValue("@GROUPBY", GroupBy);
            cmd.Parameters.AddWithValue("@SERVICEID", Serviceid);
            cmd.Parameters.AddWithValue("@HOSPITALLOC", Hospitalloc);
            cmd.Parameters.AddWithValue("@USERID", string.IsNullOrEmpty(UserId) ? "0" : UserId);
            cmd.Parameters.AddWithValue("@LOCATIONID", string.IsNullOrEmpty(LocationId) ? "" : LocationId);
            cmd.Parameters.AddWithValue("@DEPARTMENTID", string.IsNullOrEmpty(DepartmentId) ? "" : DepartmentId);
            cmd.CommandType = CommandType.StoredProcedure;
            try
            {
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(ds);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_REPORT_RESPONSEOVERRUNSCOUNT");
                ds = new DataTable();
            }
        }
        return ds;
    }

    public static DataTable getDurationOverruns(string from, string To, string Porter, string GroupBy,
                                               string UserId = "0", string LocationId = "", string DepartmentId = "")
    {
        string constr = Tenant.ConnectionString;
        DataTable ds = new DataTable();
        using (SqlConnection con = new SqlConnection(constr))
        {
            SqlCommand cmd = new SqlCommand("SP_REPORT_DURATIONOVERRUNSCOUNT", con);
            cmd.Parameters.AddWithValue("@FROM", from);
            cmd.Parameters.AddWithValue("@TO", To);
            cmd.Parameters.AddWithValue("@PORTERID", Porter);
            cmd.Parameters.AddWithValue("@GROUPBY", GroupBy);
            cmd.Parameters.AddWithValue("@USERID", string.IsNullOrEmpty(UserId) ? "0" : UserId);
            cmd.Parameters.AddWithValue("@LOCATIONID", string.IsNullOrEmpty(LocationId) ? "" : LocationId);
            cmd.Parameters.AddWithValue("@DEPARTMENTID", string.IsNullOrEmpty(DepartmentId) ? "" : DepartmentId);
            cmd.CommandType = CommandType.StoredProcedure;
            try
            {
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(ds);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_REPORT_DURATIONOVERRUNSCOUNT");
                ds = new DataTable();
            }
        }
        return ds;
    }

    public static DataTable getResponseOverruns(string from, string To, string Porter, string GroupBy,
                                               string UserId = "0", string LocationId = "", string DepartmentId = "")
    {
        string constr = Tenant.ConnectionString;
        DataTable ds = new DataTable();
        using (SqlConnection con = new SqlConnection(constr))
        {
            SqlCommand cmd = new SqlCommand("SP_REPORT_RESPONSEOVERRUNSCOUNT", con);
            cmd.Parameters.AddWithValue("@FROM", from);
            cmd.Parameters.AddWithValue("@TO", To);
            cmd.Parameters.AddWithValue("@PORTERID", Porter);
            cmd.Parameters.AddWithValue("@GROUPBY", GroupBy);
            cmd.Parameters.AddWithValue("@USERID", string.IsNullOrEmpty(UserId) ? "0" : UserId);
            cmd.Parameters.AddWithValue("@LOCATIONID", string.IsNullOrEmpty(LocationId) ? "" : LocationId);
            cmd.Parameters.AddWithValue("@DEPARTMENTID", string.IsNullOrEmpty(DepartmentId) ? "" : DepartmentId);
            cmd.CommandType = CommandType.StoredProcedure;
            try
            {
                SqlDataAdapter da = new SqlDataAdapter(cmd);
                da.Fill(ds);
            }
            catch (Exception ex)
            {
                InsertError(ex.Message, "SP_REPORT_RESPONSEOVERRUNSCOUNT");
                ds = new DataTable();
            }
        }
        return ds;
    }
    public static DataSet GroupDetails(string groupid, string groupname, string userids, string locationids, string process)
    {
        DataSet ds = new DataSet();
        try
        {
            SqlDataAdapter dbAdap = new SqlDataAdapter();
            dbAdap.SelectCommand = new SqlCommand();
            dbAdap.SelectCommand.CommandText = "SP_GETGROUPUPDATE";
            dbAdap.SelectCommand.CommandType = CommandType.StoredProcedure;
            dbAdap.SelectCommand.Parameters.AddWithValue("@GROUPID", groupid);
            dbAdap.SelectCommand.Parameters.AddWithValue("@GROUPNAME", groupname);
            dbAdap.SelectCommand.Parameters.AddWithValue("@USERIDS", userids);
            dbAdap.SelectCommand.Parameters.AddWithValue("@LOCATIONIDS", locationids);
            dbAdap.SelectCommand.Parameters.AddWithValue("@PROCESS", process);
            dbAdap.SelectCommand.Connection = AcquireConnection();
            dbAdap.SelectCommand.Connection.Close();
            dbAdap.Fill(ds, "data");
            dbAdap.Dispose();
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, "SP_REPORT_RESPONSEOVERRUNSCOUNT");
            ds = new DataSet();
        }

        return ds;
    }

    public static SqlConnection AcquireConnection()
    {
        SqlConnection dbCon = new SqlConnection(Tenant.ConnectionString.ToString());
        dbCon.Open();

        return dbCon;

    }

    public static DataSet GetGlobalAllRecords(string spName, string tabName, string tmptbl)
    {
        DataSet ds = new DataSet();
        try
        {
            SqlDataAdapter dbAdap = new SqlDataAdapter();
            dbAdap.SelectCommand = new SqlCommand();
            dbAdap.SelectCommand.CommandText = spName;
            dbAdap.SelectCommand.CommandType = CommandType.StoredProcedure;
            dbAdap.SelectCommand.Parameters.AddWithValue("@BulkUploadTableName", tabName);
            dbAdap.SelectCommand.Connection = AcquireConnection();
            dbAdap.SelectCommand.Connection.Close();
            dbAdap.Fill(ds, tmptbl);
            dbAdap.Dispose();
        }
        catch (Exception ex)
        {
            InsertError(ex.Message, spName);
            ds = new DataSet();
        }
        return ds;
    }


    public static DataRow ExecuteQuery(string Id, string Process)
    {
        DataTable dt = new DataTable(); string Query = string.Empty;
        SqlDataAdapter dbAdap = new SqlDataAdapter();
        switch (Process)
        {
            case "LOCATIONMASTER":
                Query = "SELECT * FROM " + Process + " WHERE LOCATIONCODE = '" + Id + "'";
                break;

        }
        dbAdap.SelectCommand = new SqlCommand(Query);
        dbAdap.SelectCommand.CommandType = CommandType.Text;
        dbAdap.SelectCommand.Connection = DataAccess.AcquireConnection();
        dbAdap.SelectCommand.Connection.Close();
        try
        {
            dbAdap.Fill(dt);
        }
        catch (SqlException sqex)
        {
            DataAccess.InsertError(sqex.Message, "logerror");
            return (dt.Rows.Count > 0) ? dt.Rows[0] : null;
        }
        finally
        {
            dbAdap.Dispose();
        }
        return (dt.Rows.Count > 0) ? dt.Rows[0] : null;
    }
    public static bool BulkInsertUpdate(string spName, string qry, string mode, string ourprimarykey, string checkExistVar1, string @checkExistVar2, string tblname)
    {
        SqlCommand dbCmd = new SqlCommand();
        SqlConnection con = AcquireConnection();
        SqlTransaction Trans;
        Trans = con.BeginTransaction();

        dbCmd.Connection = con;
        dbCmd.Transaction = Trans;
        dbCmd.CommandType = CommandType.StoredProcedure;
        dbCmd.CommandText = spName;
        dbCmd.Parameters.AddWithValue("@qry", qry);
        //  dbCmd.Parameters.AddWithValue("@UpdatedBankId", logData);
        dbCmd.Parameters.AddWithValue("@mode", mode);
        dbCmd.Parameters.AddWithValue("@cliPrimaryKey", ourprimarykey);
        dbCmd.Parameters.AddWithValue("@checkExistVar1", checkExistVar1);
        dbCmd.Parameters.AddWithValue("@checkExistVar2", checkExistVar2);
        dbCmd.Parameters.AddWithValue("@tableName", tblname);

        try
        {
            bool retBoolVal = ((string)dbCmd.ExecuteScalar()).ToUpper() == "TRUE" ? true : false;
            Trans.Commit();
            return retBoolVal;
        }
        catch (Exception ex1)
        {
            DataAccess.InsertError(ex1.Message, "logerror");
            return false;
        }
        finally
        {
            con.Close();
        }
    }


    public static DataTable ReportMaster(string Type, string From, string To, string PorterId, string p)
    {
        return new DataTable();
    }




}