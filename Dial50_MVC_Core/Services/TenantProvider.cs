using Dial50_MVC_Core.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System;
using System.Data;

namespace Dial50_MVC_Core.Services
{
    public class TenantProvider
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IConfiguration _config;
        private readonly ILogger<TenantProvider> _logger;
        private readonly IMemoryCache _cache;

        public TenantProvider(
            IHttpContextAccessor httpContextAccessor,
            IConfiguration config,
            ILogger<TenantProvider> logger,
            IMemoryCache cache)
        {
            _httpContextAccessor = httpContextAccessor;
            _config = config;
            _logger = logger;
            _cache = cache;
        }

        public string GetConnectionString()
        {
            var context = _httpContextAccessor.HttpContext;
            if (context == null) return GetFallbackConnectionString();

            string centralConn = _config.GetConnectionString("CentralDB") ?? _config.GetConnectionString("Dial50");
            if (string.IsNullOrEmpty(centralConn)) return GetFallbackConnectionString();

            bool multiTenant = _cache.GetOrCreate("TenantProvider:MultiTenantMode", entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
                return IsMultiTenantApp(centralConn);
            });
            if (!multiTenant)
            {
                _logger.LogInformation("TenantProvider: App is in single-tenant mode (qr_app=0). Using Dial50.");
                return GetFallbackConnectionString();
            }

            string tenantId = "";

            if (context.Request.QueryString.HasValue)
            {
                var queryParams = System.Web.HttpUtility.ParseQueryString(context.Request.QueryString.Value);
                tenantId = queryParams["XTenantID"];
                if (string.IsNullOrWhiteSpace(tenantId))
                {
                    tenantId = queryParams["XTenentID"];
                }
            }

            if (string.IsNullOrWhiteSpace(tenantId))
            {
                tenantId = context.Session.GetString("XTenantID")
                    ?? context.Session.GetString("XTenentID");
            }

            if (string.IsNullOrWhiteSpace(tenantId))
            {
                tenantId = context.Request.Headers["X-Tenant-ID"].ToString();
            }

            if (string.IsNullOrWhiteSpace(tenantId))
            {
                tenantId = context.Request.Cookies["XTenantID"] ?? "";
            }

            if (string.IsNullOrWhiteSpace(tenantId))
            {
                throw new InvalidOperationException(
                    "A tenant ID is required while multi-tenant mode is enabled.");
            }

            context.Session.SetString("XTenantID", tenantId);
            context.Session.SetString("XTenentID", tenantId);

            string finalCode = tenantId;

            try
            {
                var protector = context.RequestServices.GetService(typeof(LandingProtector)) as LandingProtector;
                if (protector != null)
                {
                    string fixedEncryptedId = tenantId.Replace(" ", "+");
                    string decryptedCode = protector.DecryptAES(fixedEncryptedId);
                    if (!string.IsNullOrWhiteSpace(decryptedCode))
                    {
                        var separator = decryptedCode.IndexOf("$$", StringComparison.Ordinal);
                        finalCode = separator >= 0 ? decryptedCode[..separator] : decryptedCode;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "TenantProvider: Tenant ID could not be decrypted; trying it as a plain ID.");
            }

            if (int.TryParse(finalCode, out int hospitalId))
            {
                string cacheKey = "TenantProvider:Connection:" + hospitalId;
                return _cache.GetOrCreate(cacheKey, entry =>
                {
                    entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
                    try
                    {
                        using (var conn = new SqlConnection(centralConn))
                        using (var cmd = new SqlCommand("dbo.SP_GET_HOSPITAL_BY_ID", conn))
                        {
                            cmd.CommandType = CommandType.StoredProcedure;
                            cmd.Parameters.AddWithValue("@HospitalId", hospitalId);
                            conn.Open();
                            var result = cmd.ExecuteScalar();

                            if (result != null && result != DBNull.Value
                                && !string.IsNullOrWhiteSpace(result.ToString()))
                            {
                                _logger.LogInformation("TenantProvider: Resolved database for HospitalId {HospitalId}.", hospitalId);
                                return result.ToString();
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "TenantProvider: Failed to resolve the database for HospitalId {HospitalId}.", hospitalId);
                        throw new InvalidOperationException(
                            $"Could not resolve the database for tenant {hospitalId}.", ex);
                    }

                    throw new InvalidOperationException(
                        $"The requested tenant {hospitalId} could not be resolved. Refusing to use the default database.");
                });
            }
            else
            {
                _logger.LogError("TenantProvider: Could not parse tenant ID to an integer.");
            }

            throw new InvalidOperationException(
                "The requested tenant could not be resolved. Refusing to use the default database.");
        }

        private bool IsMultiTenantApp(string centralConn)
        {
            try
            {
                using (var conn = new SqlConnection(centralConn))
                using (var cmd = new SqlCommand("dbo.SP_GET_APP_CONFIG", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@APPNAME", "qr_app");
                    conn.Open();

                    var result = cmd.ExecuteScalar();
                    if (result != null && result != DBNull.Value)
                    {
                        return Convert.ToInt32(result) == 1;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "TenantProvider: Failed to read APP_CONFIG.");
                throw new InvalidOperationException(
                    "Could not determine whether multi-tenant mode is enabled.", ex);
            }
            return false;
        }

        private string GetFallbackConnectionString()
        {
            return _config.GetConnectionString("Dial50");
        }
    }
}