using Dial50_MVC_Core.Data;
using Dial50_MVC_Core.Models;
using Dial50_MVC_Core.Repositories;
using Dial50_MVC_Core.Services;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.StaticFiles;
using System.Globalization;
using Microsoft.AspNetCore.Localization;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

var keysFolder = Path.Combine(builder.Environment.ContentRootPath, "DataProtectionKeys");

builder.Services.AddControllersWithViews();
builder.Services.AddAuthentication();
builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddHttpClient();
builder.Services.AddMemoryCache();

builder.Services.AddScoped<PushStore>();
builder.Services.AddScoped<PushSender>();

builder.Services.AddHostedService<NotificationPushWorker>();
builder.Services.Configure<HospitalSettings>(builder.Configuration.GetSection("HospitalSettings"));

builder.Services.AddDbContext<ApplicationDbContext>((sp, options) =>
{
    var tenant = sp.GetRequiredService<TenantProvider>();
    options.UseSqlServer(tenant.GetConnectionString());
});

builder.Services.AddMemoryCache();
builder.Services.AddHttpClient();

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
builder.Services.AddHttpClient<IGuestApiService, GuestApiService>();
builder.Services.AddScoped<ISmsService, LogSmsService>();
builder.Services.AddHttpClient<ISmsService, TextBeeSmsService>();

builder.Services.Configure<EncryptionSettings>(builder.Configuration.GetSection("EncryptionSettings"));
builder.Services.Configure<DepartmentSettings>(builder.Configuration.GetSection("Departments"));
builder.Services.Configure<HospitalSettings>(builder.Configuration.GetSection("HospitalSettings"));
builder.Services.AddScoped<LandingProtector>();
builder.Services.Configure<LoocAISettings>(builder.Configuration.GetSection("LoocAI"));
builder.Services.AddScoped<LandingProtector>();
builder.Services.AddScoped<IBedContextAccessor, BedContextAccessor>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddControllersWithViews(o => o.Filters.Add<BedContextFilter>());

builder.Services.AddDistributedMemoryCache();
builder.Services.AddScoped<TenantProvider>();

builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(60);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.Name = ".Dial50.Session";
});

var languageSettings = builder.Configuration.GetSection("SupportedLanguages").Get<List<LanguageSetting>>();
var supportedCultures = languageSettings.Select(l => new CultureInfo(l.Culture)).ToArray();

builder.Services.Configure<RequestLocalizationOptions>(options =>
{
    options.DefaultRequestCulture = new RequestCulture("en-IN");
    options.SupportedCultures = supportedCultures;
    options.SupportedUICultures = supportedCultures;
    options.RequestCultureProviders.Insert(0, new CookieRequestCultureProvider());
});

var app = builder.Build();

app.UseDeveloperExceptionPage();

app.UseHttpsRedirection();

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

// Unified AI: a page that loads INSIDE the Home iframe must always behave as a Unified child page,
// even when a script navigation or a redirect dropped ?UnifiedAI=1 from the URL. Without the flag
// the page sends no context to the AI and cannot run voice actions. Browsers label such requests
// with "Sec-Fetch-Dest: iframe", so we put the flag back before the views read the query string.
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
app.UseAuthentication();
app.UseAuthorization();

app.Use(async (context, next) =>
{
    var path = (context.Request.Path.Value ?? "").TrimEnd('/').ToLowerInvariant();
    var hasBedInfo = context.Request.Query.ContainsKey("BedInfo")
                     && !string.IsNullOrWhiteSpace(context.Request.Query["BedInfo"]);

    if ((path == "/home" || path == "/home/index") && !hasBedInfo)
    {
        context.Response.Redirect("/PreLanding");
        return;
    }

    await next();
});

app.MapControllers();
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();