using System.Globalization;
using Dial50_MVC_Core.Data;
using Dial50_MVC_Core.Models;
using Dial50_MVC_Core.Repositories;
using Dial50_MVC_Core.Services;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Localization;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(o =>
    o.ConfigureEndpointDefaults(l => l.Protocols = Microsoft.AspNetCore.Server.Kestrel.Core.HttpProtocols.Http1));

var keysFolder = Path.Combine(builder.Environment.ContentRootPath, "DataProtectionKeys");
Directory.CreateDirectory(keysFolder);

builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(keysFolder))
    .SetApplicationName("Dial50_MVC_Core");

builder.Services.AddHttpContextAccessor();
builder.Services.AddMemoryCache();
builder.Services.AddDistributedMemoryCache();
builder.Services.AddHttpClient();

builder.Services.AddControllersWithViews(options =>
{
    options.Filters.Add<BedContextFilter>();
});

builder.Services.AddAuthentication();
builder.Services.AddAuthorization();

builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(60);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.Name = ".Dial50.Session";
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
});

builder.Services.Configure<HospitalSettings>(builder.Configuration.GetSection("HospitalSettings"));
builder.Services.Configure<EncryptionSettings>(builder.Configuration.GetSection("EncryptionSettings"));
builder.Services.Configure<DepartmentSettings>(builder.Configuration.GetSection("Departments"));
builder.Services.Configure<LoocAISettings>(builder.Configuration.GetSection("LoocAI"));

builder.Services.AddScoped<TenantProvider>();
builder.Services.AddScoped<IBedContextAccessor, BedContextAccessor>();
builder.Services.AddScoped<LandingProtector>();

builder.Services.AddDbContext<ApplicationDbContext>((sp, options) =>
{
    var tenant = sp.GetRequiredService<TenantProvider>();
    options.UseSqlServer(tenant.GetConnectionString());
});

builder.Services.AddScoped<PushStore>();
builder.Services.AddScoped<PushSender>();
builder.Services.AddHostedService<NotificationPushWorker>();

builder.Services.AddScoped<IBedRepository, BedRepository>();
builder.Services.AddScoped<IBedService, BedService>();
builder.Services.AddScoped<ILogService, LogService>();
builder.Services.AddScoped<IPatientRepository, PatientRepository>();
builder.Services.AddHttpClient<IPatientRepository, PatientRepository>();
builder.Services.AddScoped<ITypeRepository, TypeRepository>();
builder.Services.AddScoped<IFoodRepository, FoodRepository>();
builder.Services.AddScoped<IFoodService, FoodService>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<INotificationService, NotificationService>();

builder.Services.AddSingleton<AiBridgeService>();
builder.Services.AddHttpClient<IGuestApiService, GuestApiService>();
builder.Services.AddScoped<ISmsService, LogSmsService>();
builder.Services.AddHttpClient<ISmsService, TextBeeSmsService>();

var languageSettings = builder.Configuration.GetSection("SupportedLanguages").Get<List<LanguageSetting>>() ?? new List<LanguageSetting>();
var supportedCultures = languageSettings.Count > 0
    ? languageSettings.Select(l => new CultureInfo(l.Culture)).ToArray()
    : new[] { new CultureInfo("en-IN") };

builder.Services.Configure<RequestLocalizationOptions>(options =>
{
    options.DefaultRequestCulture = new RequestCulture("en-IN");
    options.SupportedCultures = supportedCultures;
    options.SupportedUICultures = supportedCultures;
    options.RequestCultureProviders.Insert(0, new CookieRequestCultureProvider());
});

var app = builder.Build();

app.Use(async (context, next) =>
{
    if (context.Request.Path.Value!.EndsWith("/ws"))
    {
        Console.WriteLine($"[WS-DEBUG] {context.Request.Protocol} IsWS={context.WebSockets.IsWebSocketRequest} Upgrade='{context.Request.Headers["Upgrade"]}' Key='{context.Request.Headers["Sec-WebSocket-Key"]}'");
    }
    await next();
    if (context.Request.Path.Value!.EndsWith("/ws"))
        Console.WriteLine($"[WS-DEBUG] -> {context.Response.StatusCode}");
});

app.UseDeveloperExceptionPage();
app.UseHttpsRedirection();

app.UseWebSockets(new WebSocketOptions
{
    KeepAliveInterval = TimeSpan.FromSeconds(15)
});

var contentTypeProvider = new FileExtensionContentTypeProvider();
contentTypeProvider.Mappings[".onnx"] = "application/octet-stream";

app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = contentTypeProvider,
    OnPrepareResponse = ctx =>
    {
        if (ctx.File.Name.Equals("sw.js", StringComparison.OrdinalIgnoreCase))
        {
            ctx.Context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
            ctx.Context.Response.Headers["Service-Worker-Allowed"] = "/";
        }
    }
});

app.UseRequestLocalization(app.Services.GetRequiredService<IOptions<RequestLocalizationOptions>>().Value);

app.Use(async (context, next) =>
{
    if (string.Equals(context.Request.Headers["Sec-Fetch-Dest"].ToString(), "iframe", StringComparison.OrdinalIgnoreCase)
        && context.Request.Query["UnifiedAI"] != "1"
        && context.Request.Query["Unified"] != "1")
    {
        var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(context.Request.QueryString.Value);
        query["Unified"] = "1";
        query["UnifiedAI"] = "1";
        context.Request.QueryString = QueryString.Create(query);
    }

    await next();
});

app.UseRouting();
app.UseSession();

app.Use(async (context, next) =>
{
    if (context.Request.Cookies.ContainsKey(".Dial50.Session") && !context.Session.Keys.Any())
    {
        var queryTenant = context.Request.Query["XTenantID"].ToString();
        var headerTenant = context.Request.Headers["X-Tenant-ID"].ToString();
        var tenantId = !string.IsNullOrWhiteSpace(queryTenant) ? queryTenant : headerTenant;
        if (!string.IsNullOrWhiteSpace(tenantId))
        {
            context.Session.SetString("XTenantID", tenantId.Trim());
        }
    }

    await next();
});

app.UseAuthentication();
app.UseAuthorization();

app.Use(async (context, next) =>
{
    var path = (context.Request.Path.Value ?? "").TrimEnd('/').ToLowerInvariant();
    if (!path.StartsWith("/api/ai-bridge", StringComparison.OrdinalIgnoreCase))
    {
        var hasBedInfo = context.Request.Query.ContainsKey("BedInfo")
                         && !string.IsNullOrWhiteSpace(context.Request.Query["BedInfo"]);

        if ((path.Length == 0 || path == "/home" || path == "/home/index") && !hasBedInfo)
        {
            context.Response.Redirect("/PreLanding");
            return;
        }
    }

    await next();
});

app.MapControllers();
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();