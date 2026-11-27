using Dial50_MVC_Core.Models;

namespace Dial50_MVC_Core.Services
{
    public interface INotificationService
    {
        Task<List<NotificationModel>> GetNotificationsByRoomAsync(string roomNo, int maxCount);
        Task<int> GetUnreadCountByRoomAsync(string roomNo);
        Task<bool> MarkNotificationAsReadAsync(string roomNo, string notificationId);

        Task<bool> MarkAllNotificationsAsReadByRoomAsync(string roomNo);
        Task<int> GetTotalCountByRoomAsync(string roomNo);
    }
}

