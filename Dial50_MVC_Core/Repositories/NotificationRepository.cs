using Dial50_MVC_Core.Data;
using Dial50_MVC_Core.Models;
using Dial50_MVC_Core.Services;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using System.Data;

namespace Dial50_MVC_Core.Repositories
{
    public class NotificationRepository : INotificationRepository
    {
        private readonly TenantProvider _tenantProvider;
        private readonly ILogger<NotificationRepository> _logger;

        public NotificationRepository(
            TenantProvider tenantProvider,
            ILogger<NotificationRepository> logger)
        {
            _tenantProvider = tenantProvider;
            _logger = logger;
        }

        private string GetCs() => _tenantProvider.GetConnectionString();

        public async Task<List<NotificationModel>> GetNotificationsByRoom(string roomNo, int maxCount)
        {
            var list = new List<NotificationModel>();
            using SqlConnection con = new SqlConnection(GetCs());
            using SqlCommand cmd = new SqlCommand("SP_MOB_NOTIFICATION", con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "GET");
            cmd.Parameters.AddWithValue("@RoomNo", roomNo);
            cmd.Parameters.AddWithValue("@NotificationID", DBNull.Value);
            cmd.Parameters.AddWithValue("@MaxCount", maxCount);

            await con.OpenAsync();
            using SqlDataReader reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                list.Add(new NotificationModel
                {
                    ID = reader["ID"] != DBNull.Value ? Convert.ToInt32(reader["ID"]) : 0,
                    ORDER_ID = reader["ORDER_ID"] != DBNull.Value ? reader["ORDER_ID"].ToString() : "",
                    ORDER_CODE = reader["ORDER_CODE"] != DBNull.Value ? reader["ORDER_CODE"].ToString() : "",
                    ORDER_TYPE = reader["ORDER_TYPE"] != DBNull.Value ? reader["ORDER_TYPE"].ToString() : "",
                    STATUS = reader["STATUS"] != DBNull.Value ? reader["STATUS"].ToString() : "",
                    ITEM_COUNT = reader["ITEM_COUNT"] != DBNull.Value ? Convert.ToInt32(reader["ITEM_COUNT"]) : 0,
                    ITEM_SUMMARY = reader["ITEM_SUMMARY"] != DBNull.Value ? reader["ITEM_SUMMARY"].ToString() : "",
                    IS_READ = reader["IS_READ"] != DBNull.Value ? Convert.ToBoolean(reader["IS_READ"]) : false,
                    CREATED_DATE = reader["CREATED_DATE"] != DBNull.Value ? reader["CREATED_DATE"].ToString() : "",
                    SERVICE = reader["SERVICE"] != DBNull.Value ? reader["SERVICE"].ToString() : ""
                });
            }

            return list;
        }


        public async Task<bool> MarkAllAsReadByRoomAsync(string roomNo)
        {
            try
            {
                using SqlConnection con = new SqlConnection(GetCs());
                using SqlCommand cmd = new SqlCommand("SP_MOB_NOTIFICATION", con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@Process", "MARK_ALL_READ");
                cmd.Parameters.AddWithValue("@RoomNo", roomNo);
                cmd.Parameters.AddWithValue("@NotificationID", DBNull.Value);
                cmd.Parameters.AddWithValue("@MaxCount", 0);
                await con.OpenAsync();
                using SqlDataReader reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    int updatedCount = reader["UPDATED_COUNT"] != DBNull.Value
                        ? Convert.ToInt32(reader["UPDATED_COUNT"])
                        : 0;
                    _logger.LogInformation(
                        "MarkAllAsRead: Room={RoomNo}, UpdatedCount={UpdatedCount}, Result={Result}",
                        roomNo,
                        updatedCount,
                        reader["RESULT"]?.ToString()
                    );
                    return updatedCount > 0;
                }
                _logger.LogWarning(
                    "MarkAllAsRead returned no result for Room {RoomNo}",
                    roomNo
                );
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error marking all notifications as read for Room {RoomNo}",
                    roomNo
                );
                throw;
            }
        }
        public async Task<int> GetUnreadCountByRoom(string roomNo)
        {
            try
            {
                using SqlConnection con = new SqlConnection(GetCs());
                using SqlCommand cmd = new SqlCommand("SP_MOB_NOTIFICATION", con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@Process", "COUNT");
                cmd.Parameters.AddWithValue("@RoomNo", roomNo);
                cmd.Parameters.AddWithValue("@NotificationID", DBNull.Value);
                cmd.Parameters.AddWithValue("@MaxCount", 1);

                await con.OpenAsync();
                using SqlDataReader reader = await cmd.ExecuteReaderAsync();

                if (await reader.ReadAsync())
                {
                    return reader["UNREAD_COUNT"] != DBNull.Value
                        ? Convert.ToInt32(reader["UNREAD_COUNT"])
                        : 0;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetUnreadCountByRoom");
                throw;
            }
            return 0;
        }

        public async Task<int> GetTotalCountByRoom(string roomNo)
        {
            int count = 0;
            using SqlConnection con = new SqlConnection(GetCs());
            using SqlCommand cmd = new SqlCommand("SP_MOB_NOTIFICATION", con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "TOTAL_COUNT");
            cmd.Parameters.AddWithValue("@RoomNo", roomNo);
            cmd.Parameters.AddWithValue("@NotificationID", DBNull.Value);
            cmd.Parameters.AddWithValue("@MaxCount", 1);

            await con.OpenAsync();
            using SqlDataReader reader = await cmd.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                count = reader["TOTAL_COUNT"] != DBNull.Value ? Convert.ToInt32(reader["TOTAL_COUNT"]) : 0;
            }

            return count;
        }

        public async Task<bool> MarkNotificationAsRead(string roomNo, string notificationId)
        {
            using SqlConnection con = new SqlConnection(GetCs());
            using SqlCommand cmd = new SqlCommand("SP_MOB_NOTIFICATION", con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Process", "MARK_READ");
            cmd.Parameters.AddWithValue("@RoomNo", roomNo);
            cmd.Parameters.AddWithValue("@NotificationID", notificationId);
            cmd.Parameters.AddWithValue("@MaxCount", 1);

            await con.OpenAsync();
            await cmd.ExecuteNonQueryAsync();
            return true;
        }
    }
}