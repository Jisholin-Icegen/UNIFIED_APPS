using System.Collections.Concurrent;
using System.Diagnostics;
using System.Linq;
using System.Net.WebSockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading.Channels;
using System.Runtime.CompilerServices;
using Dial50_MVC_Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Dial50_MVC_Core.Controllers
{
    [ApiController]
    [AllowAnonymous]
    [Route("api/ai-bridge")]
    public class AiBridgeController : ControllerBase, IAsyncActionFilter
    {
        private const int MaxFoods = 60;
        private const int DeviceReconnectWaitMs = 5000;
        private const int StepWaitMs = 5000;
        private const int SuccessPopupMs = 2000;
        private static readonly TimeSpan SendTimeout = TimeSpan.FromSeconds(10);

        private static readonly ConditionalWeakTable<WebSocket, SemaphoreSlim> SendLocks = new();
        private static readonly ConcurrentDictionary<string, SemaphoreSlim> IntentLocks = new(StringComparer.Ordinal);

        private static readonly string[] IntentProperties =
        {
            "department", "category", "items", "remarks", "steps", "selects",
            "submit", "place_order", "submit_label", "close_modal", "intents"
        };

        private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, WebSocket>> AgentSockets = new(StringComparer.Ordinal);
        private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, WebSocket>> DeviceSockets = new(StringComparer.Ordinal);

        private static readonly HashSet<string> AllowedExactActions = new(StringComparer.Ordinal)
        {
            "navigate",
            "ui.click",
            "ui.fill",
            "ui.set_choice",
            "ui.select",
            "video.play",
            "video.stop",
            "video.pause",
            "food.intent",
            "food.add",
            "food.remove",
            "food.order",
            "request.create",
            "request.cancel",
            "notification.read",
            "notification.dismiss",
            "feedback.submit"
        };

        private static readonly string[] TargetAliases = { "target_id", "targetid", "option_id", "optionId", "id", "path", "target" };

        private static readonly HashSet<string> GlobalShellRoutes = new(StringComparer.OrdinalIgnoreCase)
        {
            "/Home", "/Home/Index", "/MyDailyCare", "/RoomComfort", "/FoodDining", "/Logisitics", "/DischargeFeedback"
        };

        private static readonly HashSet<string> GlobalShellLabels = new(StringComparer.OrdinalIgnoreCase)
        {
            "Video Tutorial", "Communication", "My Daily Care", "Room & Comfort",
            "Food & Dining", "Logistics", "Feedback", "My Requests", "Talk to AI", "Support"
        };

        private static readonly HashSet<string> IgnoredSelectControls = new(StringComparer.OrdinalIgnoreCase)
        {
            "languageSelector", "Choose Your Language"
        };

        private static readonly Regex BlockedLabelRegex = new(
            @"\b(log\s*out|logout|log\s*off|sign\s*out|signout|sign\s*off|end\s*(the\s*)?(call|session)|hang\s*up|disconnect\s*call|delete\s*account|exit\s*app|password|passcode|pin|otp|ssn|token|secret)\b",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex BlockedHintRegex = new(
            @"log-?out|sign-?out|log-?off|end-?call|hang-?up|password|otp|token",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex BlockedRouteRegex = new(
            @"^/(?:account/)?(?:log-?out|log-?off|sign-?out|log-?in|prelanding)(?:/|\?|$)",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex SubmitLabelRegex = new(
            @"\b(place\s*order|submit\s*order|submit\s*request|confirm\s*order|confirm\s*request|send\s*request|raise\s*request|checkout)\b",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex WhitespaceRegex = new(@"\s+", RegexOptions.Compiled);

        private const string UnconfirmedRule = "Not confirmed by the system. Do not tell the patient the order or request was placed. Check confirmations or the screen first.";
        private const string ConfirmedRule = "Confirmed by the system. It is safe to tell the patient it was placed.";

        private readonly AiBridgeService _bridge;
        private readonly IConfiguration _config;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<AiBridgeController> _logger;

        private sealed class OptionsView
        {
            public List<Dictionary<string, object>> Options { get; } = new();
            public List<Dictionary<string, object>> Foods { get; } = new();
            public List<Dictionary<string, object>> Selects { get; } = new();
            public HashSet<string> NavRoutes { get; set; } = new(StringComparer.Ordinal);
            public bool Truncated { get; set; }
            public string Signature { get; set; } = "";
        }

        private readonly record struct DynamicNavTarget(string? Route, string? TargetId, string Label);
        private readonly record struct DynamicSelectTarget(string ControlId, string OptionValue);
        private readonly record struct DynamicFoodTarget(string FoodId, string Name, string? PlusTargetId, string PlusLabel);

        public AiBridgeController(AiBridgeService bridge, IConfiguration config, IWebHostEnvironment env, ILogger<AiBridgeController> logger)
        {
            _bridge = bridge;
            _config = config;
            _env = env;
            _logger = logger;
        }

        [NonAction]
        public Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            return next();
        }

        [HttpGet("health")]
        public IActionResult Health()
        {
            return Ok(new Dictionary<string, object> { ["ok"] = true, ["sessions"] = _bridge.List(null).Count });
        }

        [HttpGet("bed/{bedId}/ws")]
        public async Task BedWebSocket(
            string bedId,
            [FromQuery(Name = "api_key")] string? apiKey,
            [FromQuery(Name = "tenant_id")] string? tenantId,
            CancellationToken cancellationToken)
        {
            if (!HttpContext.WebSockets.IsWebSocketRequest)
            {
                HttpContext.Response.StatusCode = 400;
                return;
            }
            if (!IsValidWebSocketApiKey(apiKey) || !IsValidWebSocketTenantId(tenantId))
            {
                HttpContext.Response.StatusCode = 401;
                return;
            }
            if (string.IsNullOrWhiteSpace(bedId))
            {
                HttpContext.Response.StatusCode = 400;
                return;
            }

            var ws = await HttpContext.WebSockets.AcceptWebSocketAsync(new WebSocketAcceptContext
            {
                KeepAliveInterval = TimeSpan.FromSeconds(20)
            });
            using (ws)
            {
                var connId = Guid.NewGuid().ToString("N");
                var bucket = AgentSockets.GetOrAdd(bedId.Trim(), _ => new ConcurrentDictionary<string, WebSocket>());
                bucket[connId] = ws;

                try
                {
                    var initialSession = ResolveBedSession(bedId);
                    if (initialSession != null)
                    {
                        await SendTextAsync(ws, BuildScreenPushEnvelope(initialSession, true), cancellationToken);
                    }
                    else
                    {
                        await SendTextAsync(ws, JsonSerializer.Serialize(new Dictionary<string, object>
                        {
                            ["type"] = "waiting",
                            ["bed_id"] = bedId,
                            ["message"] = "Waiting for device screen."
                        }), cancellationToken);
                    }

                    var queue = Channel.CreateBounded<string>(32);
                    var worker = ProcessAgentMessagesAsync(ws, bedId, queue.Reader, cancellationToken);
                    try
                    {
                        await ReceiveLoopAsync(ws, async text =>
                        {
                            using (var doc = JsonDocument.Parse(text))
                            {
                                if (ReadString(doc.RootElement, "type") == "ping")
                                {
                                    await SendTextAsync(ws, "{\"type\":\"pong\"}", cancellationToken);
                                    return;
                                }
                            }
                            if (!queue.Writer.TryWrite(text))
                            {
                                await SendErrorAsync(ws, "Too many pending messages. Wait for a response before sending more.", cancellationToken);
                            }
                        }, cancellationToken);
                    }
                    finally
                    {
                        queue.Writer.TryComplete();
                        await worker;
                    }
                }
                finally
                {
                    bucket.TryRemove(connId, out _);
                }
            }
        }

        private async Task ProcessAgentMessagesAsync(WebSocket ws, string bedId, ChannelReader<string> reader, CancellationToken cancellationToken)
        {
            try
            {
                await foreach (var text in reader.ReadAllAsync(cancellationToken))
                {
                    try
                    {
                        await HandleAgentMessageAsync(ws, bedId, text, cancellationToken);
                    }
                    catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
                    {
                        _logger.LogWarning(ex, "AiBridge: failed handling agent message for bed {BedId}.", bedId);
                        await TrySendErrorAsync(ws, ex, cancellationToken);
                    }
                }
            }
            catch (OperationCanceledException) { }
        }

        private async Task HandleAgentMessageAsync(WebSocket ws, string bedId, string text, CancellationToken cancellationToken)
        {
            using var doc = JsonDocument.Parse(text);
            var root = doc.RootElement;
            var msgType = ReadString(root, "type");

            AiBridgeSession? session = null;
            var reqSessionId = ReadString(root, "session_id");
            if (AiBridgeService.IsValidSessionId(reqSessionId))
            {
                var candidate = _bridge.Find(reqSessionId.Trim());
                if (candidate != null && candidate.SubscriberCount > 0 && (string.IsNullOrWhiteSpace(candidate.BedId) || candidate.BedId == bedId))
                {
                    session = candidate;
                }
            }
            session ??= ResolveBedSession(bedId);

            if (session == null)
            {
                await SendErrorAsync(ws, "No active device for bed_id " + bedId, cancellationToken);
                return;
            }

            if (msgType == "get_screen")
            {
                await SendTextAsync(ws, BuildScreenPushEnvelope(session, true), cancellationToken);
                return;
            }

            if (msgType == "run_intent" || IntentProperties.Any(name => root.TryGetProperty(name, out _)))
            {
                var intentReq = JsonSerializer.Deserialize<AiRunIntentPost>(root.GetRawText()) ?? new AiRunIntentPost();
                intentReq.BedId = bedId;
                var result = await ExecuteIntentRequestAsync(session, intentReq, cancellationToken);
                result["type"] = "intent_response";
                await SendTextAsync(ws, JsonSerializer.Serialize(result), cancellationToken);
                return;
            }

            if (msgType == "actions" || root.TryGetProperty("actions", out _) || root.TryGetProperty("suggestions", out _))
            {
                var responseJson = await ExecuteWsActionsAsync(session, root, cancellationToken);
                await SendTextAsync(ws, responseJson, cancellationToken);
                return;
            }

            await SendErrorAsync(ws, "Unrecognized message.", cancellationToken);
        }

        [HttpGet("sessions/{sessionId}/ws")]
        public async Task SessionWebSocket(
            string sessionId,
            [FromQuery(Name = "bed_id")] string? bedId,
            [FromQuery(Name = "device_id")] string? deviceId,
            CancellationToken cancellationToken)
        {
            if (!HttpContext.WebSockets.IsWebSocketRequest)
            {
                HttpContext.Response.StatusCode = 400;
                return;
            }
            if (!AiBridgeService.IsValidSessionId(sessionId))
            {
                HttpContext.Response.StatusCode = 400;
                return;
            }

            var session = _bridge.GetOrCreate(sessionId);
            if (session == null)
            {
                HttpContext.Response.StatusCode = 429;
                return;
            }

            var ws = await HttpContext.WebSockets.AcceptWebSocketAsync(new WebSocketAcceptContext
            {
                KeepAliveInterval = TimeSpan.FromSeconds(20)
            });
            using (ws)
            {
                var connId = Guid.NewGuid().ToString("N");
                var bucket = DeviceSockets.GetOrAdd(session.SessionId, _ => new ConcurrentDictionary<string, WebSocket>());
                bucket[connId] = ws;

                var sub = _bridge.Subscribe(session, 0);
                using var linked = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);

                var writerTask = Task.Run(async () =>
                {
                    try
                    {
                        await foreach (var evt in sub.Channel.Reader.ReadAllAsync(linked.Token))
                        {
                            var envelope = "{\"type\":\"" + evt.Type + "\",\"id\":" + evt.Id + ",\"data\":" + evt.Json + "}";
                            await SendTextAsync(ws, envelope, linked.Token);
                        }
                    }
                    catch (OperationCanceledException) { }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "AiBridge: device WebSocket writer stopped for session {SessionId}.", session.SessionId);
                    }
                }, linked.Token);

                try
                {
                    await ReceiveLoopAsync(ws, async text =>
                    {
                        using var doc = JsonDocument.Parse(text);
                        var root = doc.RootElement;
                        var type = ReadString(root, "type");

                        if (type == "screen")
                        {
                            var bId = Trim(ReadString(root, "bed_id"), 64);
                            if (string.IsNullOrEmpty(bId)) bId = Trim(bedId, 64);
                            var dId = Trim(ReadString(root, "device_id"), 64);
                            if (string.IsNullOrEmpty(dId)) dId = Trim(deviceId, 64);
                            var callActive = ReadBool(root, "call_active");
                            if (root.TryGetProperty("screen", out var screenEl) && screenEl.ValueKind == JsonValueKind.Object)
                            {
                                var prevVersion = _bridge.GetScreenVersion(session);
                                _bridge.UpdateScreen(session, bId, dId, callActive, screenEl);
                                var newVersion = _bridge.GetScreenVersion(session);
                                if (newVersion != prevVersion && !string.IsNullOrWhiteSpace(session.BedId))
                                {
                                    var payload = BuildScreenPushEnvelope(session, true);
                                    await BroadcastToAgentsAsync(session.BedId, payload, cancellationToken);
                                }
                            }
                        }
                        else if (type == "result")
                        {
                            var reqId = Trim(ReadString(root, "request_id"), 80);
                            var act = Trim(ReadString(root, "action"), 100);
                            var ok = ReadBool(root, "success");
                            var err = Trim(ReadString(root, "error"), 500);
                            string? resJson = null;
                            if (root.TryGetProperty("result", out var rEl) && rEl.ValueKind != JsonValueKind.Undefined && rEl.ValueKind != JsonValueKind.Null)
                            {
                                var raw = rEl.GetRawText();
                                if (raw.Length <= 8000) resJson = raw;
                            }
                            _bridge.AddResult(session, reqId, act, ok, err, resJson);
                        }
                        else if (type == "confirmation")
                        {
                            var src = Trim(ReadString(root, "source"), 40);
                            var path = Trim(ReadString(root, "path"), 200);
                            var status = Trim(ReadString(root, "status"), 60);
                            var orderId = Trim(ReadString(root, "order_id"), 80);
                            var msg = Trim(ReadString(root, "message"), 300);
                            string? detJson = null;
                            if (root.TryGetProperty("detail", out var dEl) && dEl.ValueKind != JsonValueKind.Undefined && dEl.ValueKind != JsonValueKind.Null)
                            {
                                var raw = dEl.GetRawText();
                                if (raw.Length <= 4000) detJson = raw;
                            }
                            _bridge.AddConfirmation(session, src, path, status, orderId, msg, detJson);
                            if (!string.IsNullOrWhiteSpace(session.BedId))
                            {
                                var confirmMsg = JsonSerializer.Serialize(new Dictionary<string, object>
                                {
                                    ["type"] = "confirmation",
                                    ["session_id"] = session.SessionId,
                                    ["bed_id"] = session.BedId,
                                    ["order_id"] = orderId,
                                    ["status"] = status,
                                    ["path"] = path,
                                    ["message"] = msg,
                                    ["rule"] = ConfirmedRule
                                });
                                await BroadcastToAgentsAsync(session.BedId, confirmMsg, cancellationToken);
                            }
                        }
                        else if (type == "ping")
                        {
                            _bridge.Touch(session);
                            await SendTextAsync(ws, "{\"type\":\"pong\"}", cancellationToken);
                        }
                    }, cancellationToken);
                }
                finally
                {
                    linked.Cancel();
                    bucket.TryRemove(connId, out _);
                    _bridge.Unsubscribe(session, sub.Channel);
                    try { await writerTask; } catch { }
                }
            }
        }

        [HttpGet("bed/{bedId}/options")]
        public IActionResult BedOptions(
            string bedId,
            [FromQuery(Name = "include_raw")] bool includeRaw,
            [FromQuery(Name = "after_seq")] long? afterSeq,
            [FromQuery(Name = "compact")] bool? compact,
            [FromQuery(Name = "since_version")] long? sinceVersion,
            [FromQuery(Name = "limit")] int? limit,
            [FromQuery(Name = "include_items")] bool includeItems)
        {
            var denied = RequireApiKey();
            if (denied != null) return denied;

            var session = ResolveBedSession(bedId);
            if (session == null) return NotFound(new Dictionary<string, object> { ["error"] = "No device has published a screen for bed_id " + bedId + " yet." });
            return OptionsFor(session, includeRaw, afterSeq, compact ?? true, sinceVersion, limit, includeItems);
        }

        [HttpGet("bed/{bedId}/confirmations")]
        public IActionResult BedConfirmations(string bedId, [FromQuery(Name = "after_seq")] long? afterSeq)
        {
            var denied = RequireApiKey();
            if (denied != null) return denied;

            var session = ResolveBedSession(bedId);
            if (session == null) return NotFound(new Dictionary<string, object> { ["error"] = "No device has published a screen for bed_id " + bedId + " yet." });

            var rows = FormatConfirmationRows(_bridge.GetConfirmations(session, afterSeq ?? 0));
            return Ok(new Dictionary<string, object>
            {
                ["session_id"] = session.SessionId,
                ["confirmations"] = rows,
                ["last_confirm_seq"] = session.LastConfirmSeq
            });
        }

        [HttpPost("bed/{bedId}/actions")]
        [RequestSizeLimit(65536)]
        public async Task<IActionResult> BedActions(string bedId, [FromBody] AiActionsPost? body, CancellationToken cancellationToken)
        {
            var denied = RequireApiKey();
            if (denied != null) return denied;

            AiBridgeSession? session = null;
            if (body != null && AiBridgeService.IsValidSessionId(body.SessionId))
            {
                var candidate = _bridge.Find(body.SessionId!.Trim());
                if (candidate != null && !string.IsNullOrWhiteSpace(candidate.BedId)
                    && !string.IsNullOrWhiteSpace(bedId) && candidate.BedId != bedId)
                {
                    return Conflict(new Dictionary<string, object> { ["error"] = "session_id belongs to bed_id " + candidate.BedId + ", not " + bedId + "." });
                }
                if (candidate != null && candidate.SubscriberCount > 0)
                {
                    session = candidate;
                }
            }
            session ??= ResolveBedSession(bedId);
            if (session == null) return NotFound(new Dictionary<string, object> { ["error"] = "No device has published a screen for bed_id " + bedId + " yet." });
            return await ActionsForAsync(session, body, cancellationToken);
        }

        [HttpPost("run-intent")]
        [RequestSizeLimit(65536)]
        public async Task<IActionResult> RunIntent([FromBody] AiRunIntentPost? body, CancellationToken cancellationToken)
        {
            var denied = RequireApiKey();
            if (denied != null) return denied;

            if (body == null || string.IsNullOrWhiteSpace(body.BedId))
                return BadRequest(new Dictionary<string, object> { ["error"] = "bed_id is required." });

            var session = ResolveBedSession(body.BedId.Trim());
            if (session == null)
                return NotFound(new Dictionary<string, object> { ["error"] = "No active session found for bed_id " + body.BedId });

            if (body.Intents != null && body.Intents.Count == 0)
                return BadRequest(new Dictionary<string, object> { ["error"] = "intents must contain at least one intent." });

            if (body.Intents != null && body.Intents.Count > 20)
                return BadRequest(new Dictionary<string, object> { ["error"] = "A maximum of 20 intents is allowed per request." });

            var result = await ExecuteIntentRequestAsync(session, body, cancellationToken);
            return Ok(result);
        }

        private async Task<Dictionary<string, object>> ExecuteIntentRequestAsync(
            AiBridgeSession session,
            AiRunIntentPost request,
            CancellationToken cancellationToken)
        {
            var gate = IntentLocks.GetOrAdd(session.SessionId, _ => new SemaphoreSlim(1, 1));
            await gate.WaitAsync(cancellationToken);
            try
            {
                if (request.Intents == null)
                    return await ExecuteIntentCoreAsync(session, request, cancellationToken);

                if (request.Intents.Count == 0)
                {
                    return new Dictionary<string, object>
                    {
                        ["ok"] = false,
                        ["error"] = "intents must contain at least one intent."
                    };
                }

                if (request.Intents.Count > 20)
                {
                    return new Dictionary<string, object>
                    {
                        ["ok"] = false,
                        ["error"] = "A maximum of 20 intents is allowed per request."
                    };
                }

                var results = new List<Dictionary<string, object>>();
                for (var i = 0; i < request.Intents.Count; i++)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    var intent = request.Intents[i];
                    if (intent == null)
                    {
                        results.Add(new Dictionary<string, object>
                        {
                            ["intent_index"] = i,
                            ["ok"] = false,
                            ["error"] = "Intent cannot be null."
                        });
                        break;
                    }

                    intent.BedId = session.BedId;
                    intent.Intents = null;
                    var result = await ExecuteIntentCoreAsync(session, intent, cancellationToken);
                    result["intent_index"] = i;
                    result["department"] = intent.Department ?? "";
                    results.Add(result);

                    if (!result.TryGetValue("ok", out var okValue) || okValue is not true)
                        break;

                    var submitted = intent.Submit == true || intent.PlaceOrder == true || !string.IsNullOrWhiteSpace(intent.SubmitLabel);
                    if (submitted && i < request.Intents.Count - 1)
                        await DismissSuccessPopupAsync(session, intent.PlaceOrder == true, cancellationToken);
                }

                return new Dictionary<string, object>
                {
                    ["ok"] = results.Count == request.Intents.Count
                        && results.All(x => x.TryGetValue("ok", out var value) && value is true),
                    ["bed_id"] = session.BedId,
                    ["total_intents"] = request.Intents.Count,
                    ["completed_intents"] = results.Count,
                    ["stopped_on_failure"] = results.Count < request.Intents.Count,
                    ["results"] = results
                };
            }
            finally
            {
                gate.Release();
            }
        }

        private async Task<Dictionary<string, object>> ExecuteIntentCoreAsync(
            AiBridgeSession session,
            AiRunIntentPost body,
            CancellationToken cancellationToken)
        {
            var swTotal = Stopwatch.StartNew();
            var executed = new List<Dictionary<string, object>>();
            var snap = _bridge.GetSnapshot(session);

            if (body.CloseModal == true)
            {
                var closeMatch = FindDynamicCloseModalAction(_bridge.GetSnapshot(session).ScreenJson);
                if (closeMatch == null || string.IsNullOrEmpty(closeMatch.Value.TargetId))
                {
                    return new Dictionary<string, object>
                    {
                        ["ok"] = false,
                        ["error"] = "No close/cancel button found on current screen.",
                        ["route"] = session.Route,
                        ["available_options"] = ListAllAvailable(_bridge.GetSnapshot(session).ScreenJson)
                    };
                }

                var prevVer = _bridge.GetScreenVersion(session);
                executed.Add(await DispatchAndWaitAsync(
                    session,
                    new Dictionary<string, object>
                    {
                        ["action"] = "ui.click",
                        ["targetId"] = closeMatch.Value.TargetId,
                        ["label"] = closeMatch.Value.Label
                    },
                    1500,
                    cancellationToken));
                await _bridge.WaitForScreenUpdateAsync(session, prevVer, TimeSpan.FromMilliseconds(1500), cancellationToken);
            }
            var steps = body.Steps?.Where(s => !string.IsNullOrWhiteSpace(s)).ToList() ?? new List<string>();

            var startScreen = _bridge.GetSnapshot(session).ScreenJson;
            var categoryOnScreen = !string.IsNullOrWhiteSpace(body.Category)
                && FindDynamicRouteOrAction(startScreen, NormalizeKey(body.Category)) != null;

            if (!string.IsNullOrWhiteSpace(body.Department)
                && !categoryOnScreen
                && !IsLaterTargetVisible(startScreen, steps, 0, body.Items))
            {
                var deptMatch = await WaitForScreenValueAsync(
                    session,
                    s => FindDynamicRouteOrAction(s, NormalizeKey(body.Department)),
                    2000,
                    cancellationToken);

                if (deptMatch == null)
                {
                    return new Dictionary<string, object>
                    {
                        ["ok"] = false,
                        ["error"] = $"Department '{body.Department}' not found on current screen.",
                        ["route"] = session.Route,
                        ["elapsed_ms"] = swTotal.ElapsedMilliseconds,
                        ["available_options"] = ListAllAvailable(_bridge.GetSnapshot(session).ScreenJson)
                    };
                }

                var sameRoute = !string.IsNullOrEmpty(deptMatch.Value.Route)
                    && PageKey(session.Route) == PageKey(deptMatch.Value.Route);

                if (!sameRoute)
                {
                    var prevVer = _bridge.GetScreenVersion(session);
                    var navPayload = !string.IsNullOrEmpty(deptMatch.Value.Route)
                        ? new Dictionary<string, object> { ["action"] = "navigate", ["path"] = deptMatch.Value.Route }
                        : new Dictionary<string, object> { ["action"] = "ui.click", ["targetId"] = deptMatch.Value.TargetId!, ["label"] = deptMatch.Value.Label };

                    executed.Add(await DispatchAndWaitAsync(session, navPayload, 1500, cancellationToken));
                    await WaitForDepartmentAsync(session, deptMatch.Value.Route, prevVer, cancellationToken);
                }
            }

            for (var i = 0; i < steps.Count; i++)
            {
                var step = steps[i];
                var next = i + 1;
                var wantStep = NormalizeKey(step);
                var stepMatch = await WaitForScreenValueAsync(
                    session,
                    s => FindDynamicRouteOrAction(s, wantStep),
                    StepWaitMs,
                    cancellationToken,
                    stopEarlyWhen: s => IsLaterTargetVisible(s, steps, next, body.Items));

                if (stepMatch == null)
                {
                    if (IsLaterTargetVisible(_bridge.GetSnapshot(session).ScreenJson, steps, next, body.Items)) continue;

                    return new Dictionary<string, object>
                    {
                        ["ok"] = false,
                        ["error"] = $"Step '{step}' not found on current screen.",
                        ["route"] = session.Route,
                        ["elapsed_ms"] = swTotal.ElapsedMilliseconds,
                        ["executed"] = executed,
                        ["available_options"] = ListAllAvailable(_bridge.GetSnapshot(session).ScreenJson)
                    };
                }

                var prevVer = _bridge.GetScreenVersion(session);
                var stepPayload = !string.IsNullOrEmpty(stepMatch.Value.TargetId)
                    ? new Dictionary<string, object> { ["action"] = "ui.click", ["targetId"] = stepMatch.Value.TargetId, ["label"] = stepMatch.Value.Label }
                    : new Dictionary<string, object> { ["action"] = "navigate", ["path"] = stepMatch.Value.Route! };

                executed.Add(await DispatchAndWaitAsync(session, stepPayload, 1500, cancellationToken));
                await _bridge.WaitForScreenUpdateAsync(session, prevVer, TimeSpan.FromMilliseconds(2500), cancellationToken);
            }

            if (!string.IsNullOrWhiteSpace(body.Category))
            {
                var wantCat = NormalizeKey(body.Category);
                var catMatch = await WaitForScreenValueAsync(
                    session,
                    s => FindDynamicRouteOrAction(s, wantCat),
                    2500,
                    cancellationToken);

                if (catMatch == null || string.IsNullOrEmpty(catMatch.Value.TargetId))
                {
                    return new Dictionary<string, object>
                    {
                        ["ok"] = false,
                        ["error"] = $"Category '{body.Category}' not found on current screen.",
                        ["route"] = session.Route,
                        ["elapsed_ms"] = swTotal.ElapsedMilliseconds,
                        ["executed"] = executed,
                        ["available_options"] = ListAllAvailable(_bridge.GetSnapshot(session).ScreenJson)
                    };
                }

                var prevVer = _bridge.GetScreenVersion(session);
                executed.Add(await DispatchAndWaitAsync(
                    session,
                    new Dictionary<string, object>
                    {
                        ["action"] = "ui.click",
                        ["targetId"] = catMatch.Value.TargetId,
                        ["label"] = catMatch.Value.Label
                    },
                    1500,
                    cancellationToken));
                await _bridge.WaitForScreenUpdateAsync(session, prevVer, TimeSpan.FromMilliseconds(2000), cancellationToken);
            }

            if (body.Selects != null)
            {
                foreach (var sel in body.Selects)
                {
                    if (string.IsNullOrWhiteSpace(sel.Control) || string.IsNullOrWhiteSpace(sel.Value)) continue;
                    var resolved = await WaitForScreenValueAsync(
                        session,
                        s => ResolveDynamicSelect(s, NormalizeKey(sel.Control), NormalizeKey(sel.Value)),
                        2000,
                        cancellationToken);

                    if (resolved == null)
                    {
                        return new Dictionary<string, object>
                        {
                            ["ok"] = false,
                            ["error"] = $"Dropdown '{sel.Control}' or option '{sel.Value}' not found.",
                            ["route"] = session.Route,
                            ["elapsed_ms"] = swTotal.ElapsedMilliseconds,
                            ["executed"] = executed
                        };
                    }

                    var prevVer = _bridge.GetScreenVersion(session);
                    executed.Add(await DispatchAndWaitAsync(
                        session,
                        new Dictionary<string, object>
                        {
                            ["action"] = "ui.select",
                            ["controlId"] = resolved.Value.ControlId,
                            ["optionValue"] = resolved.Value.OptionValue
                        },
                        1500,
                        cancellationToken));
                    await _bridge.WaitForScreenUpdateAsync(session, prevVer, TimeSpan.FromMilliseconds(1500), cancellationToken);
                }
            }

            if (body.Items != null)
            {
                foreach (var item in body.Items.Where(i => !string.IsNullOrWhiteSpace(i.Name)))
                {
                    var wantItem = NormalizeKey(item.Name!);

                    var foodMatch = await WaitForScreenValueAsync(
                        session,
                        s => ResolveDynamicFoodAction(s, wantItem),
                        3000,
                        cancellationToken,
                        stopEarlyWhen: s => HasAnyFoodCards(s));

                    if (foodMatch == null)
                    {
                        var browseOpt = FindDynamicRouteOrAction(_bridge.GetSnapshot(session).ScreenJson, "browse other meal menus");
                        if (browseOpt != null && !string.IsNullOrEmpty(browseOpt.Value.TargetId))
                        {
                            var prevVer = _bridge.GetScreenVersion(session);
                            executed.Add(await DispatchAndWaitAsync(
                                session,
                                new Dictionary<string, object>
                                {
                                    ["action"] = "ui.click",
                                    ["targetId"] = browseOpt.Value.TargetId,
                                    ["label"] = browseOpt.Value.Label
                                },
                                1500,
                                cancellationToken));
                            await _bridge.WaitForScreenUpdateAsync(session, prevVer, TimeSpan.FromMilliseconds(1500), cancellationToken);

                            foodMatch = await WaitForScreenValueAsync(
                                session,
                                s => ResolveDynamicFoodAction(s, wantItem),
                                2000,
                                cancellationToken);
                        }
                    }

                    if (foodMatch == null || string.IsNullOrEmpty(foodMatch.Value.PlusTargetId))
                    {
                        return new Dictionary<string, object>
                        {
                            ["ok"] = false,
                            ["error"] = $"Item '{item.Name}' not found on current screen.",
                            ["route"] = session.Route,
                            ["elapsed_ms"] = swTotal.ElapsedMilliseconds,
                            ["executed"] = executed,
                            ["available_options"] = ListAllAvailable(_bridge.GetSnapshot(session).ScreenJson)
                        };
                    }

                    var clicks = Math.Clamp(item.Qty, 1, 20);
                    for (var c = 0; c < clicks; c++)
                    {
                        var prevVer = _bridge.GetScreenVersion(session);
                        executed.Add(await DispatchAndWaitAsync(
                            session,
                            new Dictionary<string, object>
                            {
                                ["action"] = "ui.click",
                                ["targetId"] = foodMatch.Value.PlusTargetId,
                                ["label"] = foodMatch.Value.PlusLabel
                            },
                            1200,
                            cancellationToken));

                        if (c + 1 < clicks)
                        {
                            await _bridge.WaitForScreenUpdateAsync(session, prevVer, TimeSpan.FromMilliseconds(1000), cancellationToken);
                            var refreshed = ResolveDynamicFoodAction(_bridge.GetSnapshot(session).ScreenJson, wantItem);
                            if (refreshed != null && !string.IsNullOrEmpty(refreshed.Value.PlusTargetId))
                                foodMatch = refreshed;
                        }
                    }
                }
            }

            var submitting = body.Submit == true || body.PlaceOrder == true || !string.IsNullOrWhiteSpace(body.SubmitLabel);
            var reviewOpened = false;

            if (!string.IsNullOrWhiteSpace(body.Remarks))
            {
                if (submitting && ResolveRemarksField(_bridge.GetSnapshot(session).ScreenJson, body.FieldTarget) == null)
                {
                    reviewOpened = await OpenReviewScreenAsync(session, body.SubmitLabel, executed, cancellationToken);
                }

                var fieldId = await WaitForScreenRefAsync(
                    session,
                    s => ResolveRemarksField(s, body.FieldTarget),
                    1500,
                    cancellationToken)
                    ?? ResolveFirstOrMatchingField(_bridge.GetSnapshot(session).ScreenJson, body.FieldTarget);

                if (string.IsNullOrEmpty(fieldId))
                {
                    return new Dictionary<string, object>
                    {
                        ["ok"] = false,
                        ["error"] = "No input field available on current screen for remarks.",
                        ["route"] = session.Route,
                        ["elapsed_ms"] = swTotal.ElapsedMilliseconds,
                        ["executed"] = executed
                    };
                }

                executed.Add(await DispatchAndWaitAsync(
                    session,
                    new Dictionary<string, object>
                    {
                        ["action"] = "ui.fill",
                        ["targetId"] = fieldId,
                        ["value"] = body.Remarks.Trim()
                    },
                    1200,
                    cancellationToken));
            }

            if (submitting)
            {
                if (!reviewOpened)
                {
                    await OpenReviewScreenAsync(session, body.SubmitLabel, executed, cancellationToken);
                }

                var submitMatch = await WaitForScreenValueAsync(
                    session,
                    s => FindDynamicSubmitAction(s, body.SubmitLabel),
                    StepWaitMs,
                    cancellationToken);

                if (submitMatch == null || string.IsNullOrEmpty(submitMatch.Value.TargetId))
                {
                    return new Dictionary<string, object>
                    {
                        ["ok"] = false,
                        ["error"] = "Submit / Confirm Order button did not appear or cart count was 0.",
                        ["route"] = session.Route,
                        ["elapsed_ms"] = swTotal.ElapsedMilliseconds,
                        ["executed"] = executed,
                        ["available_options"] = ListAllAvailable(_bridge.GetSnapshot(session).ScreenJson)
                    };
                }

                var submitPrevVer = _bridge.GetScreenVersion(session);
                executed.Add(await DispatchAndWaitAsync(
                    session,
                    new Dictionary<string, object>
                    {
                        ["action"] = "ui.click",
                        ["targetId"] = submitMatch.Value.TargetId,
                        ["label"] = submitMatch.Value.Label
                    },
                    2500,
                    cancellationToken));
                await _bridge.WaitForScreenUpdateAsync(session, submitPrevVer, TimeSpan.FromMilliseconds(2500), cancellationToken);
            }

            snap = _bridge.GetSnapshot(session);
            return new Dictionary<string, object>
            {
                ["ok"] = executed.All(e => e.TryGetValue("success", out var s) && s is true),
                ["bed_id"] = session.BedId,
                ["route"] = session.Route,
                ["screen_version"] = snap.Version,
                ["elapsed_ms"] = swTotal.ElapsedMilliseconds,
                ["executed"] = executed
            };
        }

        private async Task DismissSuccessPopupAsync(AiBridgeSession session, bool isOrder, CancellationToken cancellationToken)
        {
            var popup = await WaitForScreenValueAsync(
                session,
                s => FindDynamicRouteOrAction(s, "track status"),
                isOrder ? 0 : StepWaitMs,
                cancellationToken);

            await Task.Delay(SuccessPopupMs, cancellationToken);
            if (popup == null) return;

            var timer = Stopwatch.StartNew();
            while (FindDynamicRouteOrAction(_bridge.GetSnapshot(session).ScreenJson, "track status") != null
                && timer.ElapsedMilliseconds < 1500)
            {
                await _bridge.WaitForScreenUpdateAsync(session, _bridge.GetScreenVersion(session), TimeSpan.FromMilliseconds(250), cancellationToken);
            }

            var screen = _bridge.GetSnapshot(session).ScreenJson;
            if (FindDynamicRouteOrAction(screen, "track status") == null) return;

            var close = FindDynamicCloseModalAction(screen);
            if (close == null || string.IsNullOrEmpty(close.Value.TargetId)) return;

            var prevVer = _bridge.GetScreenVersion(session);
            await DispatchAndWaitAsync(
                session,
                new Dictionary<string, object>
                {
                    ["action"] = "ui.click",
                    ["targetId"] = close.Value.TargetId,
                    ["label"] = close.Value.Label
                },
                1500,
                cancellationToken);
            await _bridge.WaitForScreenUpdateAsync(session, prevVer, TimeSpan.FromMilliseconds(1500), cancellationToken);
        }

        private async Task<bool> OpenReviewScreenAsync(
            AiBridgeSession session,
            string? submitLabel,
            List<Dictionary<string, object>> executed,
            CancellationToken cancellationToken)
        {
            await WaitForScreenValueAsync(
                session,
                s => FindDynamicRouteOrAction(s, "review order") ?? FindDynamicSubmitAction(s, submitLabel),
                StepWaitMs,
                cancellationToken);

            var review = FindDynamicRouteOrAction(_bridge.GetSnapshot(session).ScreenJson, "review order");
            if (review == null || string.IsNullOrEmpty(review.Value.TargetId)) return false;

            var prevVer = _bridge.GetScreenVersion(session);
            executed.Add(await DispatchAndWaitAsync(
                session,
                new Dictionary<string, object>
                {
                    ["action"] = "ui.click",
                    ["targetId"] = review.Value.TargetId,
                    ["label"] = review.Value.Label
                },
                1500,
                cancellationToken));
            await _bridge.WaitForScreenUpdateAsync(session, prevVer, TimeSpan.FromMilliseconds(2500), cancellationToken);
            return true;
        }

        private async Task WaitForDepartmentAsync(AiBridgeSession session, string? route, long previousVersion, CancellationToken cancellationToken)
        {
            if (string.IsNullOrEmpty(route))
            {
                await _bridge.WaitForScreenUpdateAsync(session, previousVersion, TimeSpan.FromMilliseconds(2500), cancellationToken);
                return;
            }

            var department = PageKey(route).Split('/')[0];
            var timer = Stopwatch.StartNew();
            while (PageKey(session.Route).Split('/')[0] != department && timer.ElapsedMilliseconds < StepWaitMs)
            {
                await _bridge.WaitForScreenUpdateAsync(session, _bridge.GetScreenVersion(session), TimeSpan.FromMilliseconds(250), cancellationToken);
            }
        }

        private static string PageKey(string? route)
        {
            var parts = (route ?? "").Split('?')[0].ToLowerInvariant()
                .Split('/', StringSplitOptions.RemoveEmptyEntries).ToList();
            if (parts.Count > 1 && (parts[^1] == "index" || parts[^1] == parts[^2])) parts.RemoveAt(parts.Count - 1);
            return string.Join("/", parts);
        }

        private static bool IsLaterTargetVisible(string screenJson, List<string> steps, int fromStep, List<AiDynamicItem>? items)
        {
            for (var i = fromStep; i < steps.Count; i++)
            {
                if (FindDynamicRouteOrAction(screenJson, NormalizeKey(steps[i])) != null) return true;
            }
            var firstItem = items?.FirstOrDefault(x => !string.IsNullOrWhiteSpace(x.Name));
            return firstItem != null && ResolveDynamicFoodAction(screenJson, NormalizeKey(firstItem.Name!)) != null;
        }

        private static string? ResolveRemarksField(string screenJson, string? explicitTarget)
        {
            if (!string.IsNullOrWhiteSpace(explicitTarget)) return ResolveFirstOrMatchingField(screenJson, explicitTarget);

            using var doc = JsonDocument.Parse(screenJson);
            foreach (var f in ArrayItems(doc.RootElement, "fields"))
            {
                if (IsBlockedScreenField(f)) continue;
                var targetId = ReadString(f, "targetId");
                var text = ReadString(f, "label") + " " + ReadString(f, "placeholder");
                if (targetId.Length > 0 && Regex.IsMatch(text, @"remark|note|instruction|comment|special", RegexOptions.IgnoreCase))
                    return targetId;
            }
            return null;
        }

        private async Task<T?> WaitForScreenValueAsync<T>(
            AiBridgeSession session,
            Func<string, T?> selector,
            int timeoutMs,
            CancellationToken ct,
            Func<string, bool>? stopEarlyWhen = null) where T : struct
        {
            var deadline = Stopwatch.StartNew();
            while (!ct.IsCancellationRequested)
            {
                var snap = _bridge.GetSnapshot(session);
                var found = selector(snap.ScreenJson);
                if (found.HasValue) return found;
                if (stopEarlyWhen != null && stopEarlyWhen(snap.ScreenJson)) return null;

                var remaining = timeoutMs - (int)deadline.ElapsedMilliseconds;
                if (remaining <= 0) break;

                await _bridge.WaitForScreenUpdateAsync(session, snap.Version, TimeSpan.FromMilliseconds(remaining), ct);
            }
            return selector(_bridge.GetSnapshot(session).ScreenJson);
        }

        private async Task<T?> WaitForScreenRefAsync<T>(
            AiBridgeSession session,
            Func<string, T?> selector,
            int timeoutMs,
            CancellationToken ct) where T : class
        {
            var deadline = Stopwatch.StartNew();
            while (!ct.IsCancellationRequested)
            {
                var snap = _bridge.GetSnapshot(session);
                var found = selector(snap.ScreenJson);
                if (found != null) return found;

                var remaining = timeoutMs - (int)deadline.ElapsedMilliseconds;
                if (remaining <= 0) break;

                await _bridge.WaitForScreenUpdateAsync(session, snap.Version, TimeSpan.FromMilliseconds(remaining), ct);
            }
            return selector(_bridge.GetSnapshot(session).ScreenJson);
        }

        private static bool HasAnyFoodCards(string screenJson)
        {
            using var doc = JsonDocument.Parse(screenJson);
            return ArrayItems(doc.RootElement, "actions").Any(a => !string.IsNullOrEmpty(ReadString(a, "foodId")));
        }

        [HttpPut("sessions/{sessionId}/screen")]
        [RequestSizeLimit(524288)]
        public async Task<IActionResult> PutScreen(string sessionId, [FromBody] AiScreenPush? body, CancellationToken cancellationToken)
        {
            if (!AiBridgeService.IsValidSessionId(sessionId)) return BadRequest(new Dictionary<string, object> { ["error"] = "Invalid session id." });
            if (body == null || body.Screen.ValueKind != JsonValueKind.Object)
                return BadRequest(new Dictionary<string, object> { ["error"] = "screen must be a JSON object." });

            var session = _bridge.GetOrCreate(sessionId);
            if (session == null) return StatusCode(429, new Dictionary<string, object> { ["error"] = "Too many open sessions." });

            var prevVersion = _bridge.GetScreenVersion(session);
            _bridge.UpdateScreen(session, Trim(body.BedId, 64), Trim(body.DeviceId, 64), body.CallActive, body.Screen);
            var newVersion = _bridge.GetScreenVersion(session);
            if (newVersion != prevVersion && !string.IsNullOrWhiteSpace(session.BedId))
            {
                await BroadcastToAgentsAsync(session.BedId, BuildScreenPushEnvelope(session, true), cancellationToken);
            }
            return Ok(new Dictionary<string, object> { ["ok"] = true, ["screen_version"] = newVersion });
        }

        [HttpPost("sessions/{sessionId}/results")]
        [RequestSizeLimit(65536)]
        public IActionResult PostResult(string sessionId, [FromBody] AiResultPost? body)
        {
            if (!AiBridgeService.IsValidSessionId(sessionId)) return BadRequest(new Dictionary<string, object> { ["error"] = "Invalid session id." });
            var session = _bridge.Find(sessionId);
            if (session == null || body == null) return NotFound(new Dictionary<string, object> { ["error"] = "Unknown session." });

            string? resultJson = null;
            if (body.Result.ValueKind != JsonValueKind.Undefined && body.Result.ValueKind != JsonValueKind.Null)
            {
                var raw = body.Result.GetRawText();
                resultJson = raw.Length <= 8000 ? raw : null;
            }
            _bridge.AddResult(session, Trim(body.RequestId, 80), Trim(body.Action, 100), body.Success, Trim(body.Error, 500), resultJson);
            return Ok(new Dictionary<string, object> { ["ok"] = true });
        }

        [HttpPost("sessions/{sessionId}/confirmations")]
        [RequestSizeLimit(65536)]
        public async Task<IActionResult> PostConfirmation(string sessionId, [FromBody] AiConfirmationPost? body, CancellationToken cancellationToken)
        {
            if (!AiBridgeService.IsValidSessionId(sessionId)) return BadRequest(new Dictionary<string, object> { ["error"] = "Invalid session id." });
            var session = _bridge.Find(sessionId);
            if (session == null || body == null) return NotFound(new Dictionary<string, object> { ["error"] = "Unknown session." });

            string? detailJson = null;
            if (body.Detail.ValueKind != JsonValueKind.Undefined && body.Detail.ValueKind != JsonValueKind.Null)
            {
                var raw = body.Detail.GetRawText();
                detailJson = raw.Length <= 4000 ? raw : null;
            }
            _bridge.AddConfirmation(session, Trim(body.Source, 40), Trim(body.Path, 200), Trim(body.Status, 60), Trim(body.OrderId, 80), Trim(body.Message, 300), detailJson);
            if (!string.IsNullOrWhiteSpace(session.BedId))
            {
                var confirmMsg = JsonSerializer.Serialize(new Dictionary<string, object>
                {
                    ["type"] = "confirmation",
                    ["session_id"] = session.SessionId,
                    ["bed_id"] = session.BedId,
                    ["order_id"] = Trim(body.OrderId, 80),
                    ["status"] = Trim(body.Status, 60),
                    ["path"] = Trim(body.Path, 200),
                    ["message"] = Trim(body.Message, 300),
                    ["rule"] = ConfirmedRule
                });
                await BroadcastToAgentsAsync(session.BedId, confirmMsg, cancellationToken);
            }
            return Ok(new Dictionary<string, object> { ["ok"] = true });
        }

        [HttpGet("sessions/{sessionId}/events")]
        public async Task Events(string sessionId, CancellationToken cancellationToken)
        {
            if (!AiBridgeService.IsValidSessionId(sessionId))
            {
                Response.StatusCode = 400;
                return;
            }

            var session = _bridge.GetOrCreate(sessionId);
            if (session == null)
            {
                Response.StatusCode = 429;
                return;
            }

            long.TryParse(Request.Headers["Last-Event-ID"].ToString(), out var lastEventId);

            Response.StatusCode = 200;
            Response.ContentType = "text/event-stream";
            Response.Headers["Cache-Control"] = "no-cache";
            Response.Headers["X-Accel-Buffering"] = "no";

            var subscription = _bridge.Subscribe(session, lastEventId);
            try
            {
                await Response.WriteAsync("retry: 2000\n: connected\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);

                foreach (var replayed in subscription.Replay) await WriteEvent(replayed, cancellationToken);

                while (!cancellationToken.IsCancellationRequested)
                {
                    using var wait = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                    wait.CancelAfter(TimeSpan.FromSeconds(15));
                    try
                    {
                        if (!await subscription.Channel.Reader.WaitToReadAsync(wait.Token)) break;
                        while (subscription.Channel.Reader.TryRead(out var evt)) await WriteEvent(evt, cancellationToken);
                    }
                    catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
                    {
                        await Response.WriteAsync(": ping\n\n", cancellationToken);
                        await Response.Body.FlushAsync(cancellationToken);
                        _bridge.Touch(session);
                    }
                }
            }
            catch (OperationCanceledException) { }
            finally
            {
                _bridge.Unsubscribe(session, subscription.Channel);
            }
        }

        private async Task<Dictionary<string, object>> DispatchAndWaitAsync(
            AiBridgeSession session,
            Dictionary<string, object> actionObj,
            int waitMs,
            CancellationToken cancellationToken)
        {
            var reqId = "intent-" + Guid.NewGuid().ToString("N")[..10];
            actionObj["request_id"] = reqId;
            var json = JsonSerializer.Serialize(actionObj);

            var reconnect = Stopwatch.StartNew();
            while (session.SubscriberCount == 0 && reconnect.ElapsedMilliseconds < DeviceReconnectWaitMs)
            {
                await Task.Delay(50, cancellationToken);
            }

            var (startSeq, _, _) = _bridge.GetWatermarks(session);
            var deliveries = _bridge.Publish(session, "action", json);

            if (deliveries == 0)
            {
                return new Dictionary<string, object>
                {
                    ["request_id"] = reqId,
                    ["deliveries"] = 0,
                    ["success"] = false,
                    ["error"] = "No connected device stream."
                };
            }

            var (results, completed) = await _bridge.WaitForResultsAsync(
                session,
                startSeq,
                new List<string> { reqId },
                TimeSpan.FromMilliseconds(waitMs),
                cancellationToken);

            var first = results.FirstOrDefault();
            return new Dictionary<string, object>
            {
                ["request_id"] = reqId,
                ["deliveries"] = deliveries,
                ["completed"] = completed,
                ["success"] = first?.Success ?? false,
                ["error"] = first?.Error ?? ""
            };
        }

        private static string NormalizeKey(string value)
        {
            var cleaned = Regex.Replace(value.ToLowerInvariant(), @"[^a-z0-9 ]+", " ");
            return Regex.Replace(cleaned, @"\s+", " ").Trim();
        }

        private static DynamicNavTarget? FindDynamicCloseModalAction(string screenJson)
        {
            using var doc = JsonDocument.Parse(screenJson);
            foreach (var a in ArrayItems(doc.RootElement, "actions"))
            {
                if (ReadBool(a, "disabled") || IsBlockedScreenAction(a)) continue;
                var label = CleanLabel(ReadString(a, "label"), 80);
                var targetId = ReadString(a, "targetId");
                if (string.IsNullOrEmpty(targetId) || string.IsNullOrEmpty(label)) continue;

                if (Regex.IsMatch(label, @"^(\u00D7|x|close|cancel|dismiss|back|‹\s*back|←\s*back)$", RegexOptions.IgnoreCase))
                    return new DynamicNavTarget(null, targetId, label);
            }
            return null;
        }
        private static DynamicNavTarget? FindDynamicRouteOrAction(string screenJson, string normalizedQuery)
        {
            if (string.IsNullOrEmpty(normalizedQuery)) return null;
            using var doc = JsonDocument.Parse(screenJson);
            var root = doc.RootElement;

            DynamicNavTarget? partial = null;
            foreach (var a in ArrayItems(root, "actions"))
            {
                if (ReadBool(a, "disabled") || IsBlockedScreenAction(a)) continue;
                var label = CleanLabel(ReadString(a, "label"), 120);
                var group = CleanLabel(ReadString(a, "group"), 80);
                var route = ReadString(a, "route");
                var targetId = ReadString(a, "targetId");
                if (string.IsNullOrEmpty(label) && string.IsNullOrEmpty(group)) continue;

                var normLabel = NormalizeKey(label);
                var normGroup = NormalizeKey(group);

                if (normLabel == normalizedQuery || normGroup == normalizedQuery)
                    return new DynamicNavTarget(string.IsNullOrEmpty(route) ? null : route, targetId, label);

                if (partial == null && (normLabel.Contains(normalizedQuery) || normGroup.Contains(normalizedQuery)))
                    partial = new DynamicNavTarget(string.IsNullOrEmpty(route) ? null : route, targetId, label);
            }

            if (partial != null) return partial;

            foreach (var item in ArrayItems(root, "items"))
            {
                if (ReadBool(item, "disabled")) continue;
                var name = CleanLabel(ReadString(item, "name"), 120);
                var label = CleanLabel(ReadString(item, "label"), 120);
                var route = ReadString(item, "route");
                if (string.IsNullOrEmpty(route) || IsBlockedRoute(route)) continue;

                if (NormalizeKey(name).Contains(normalizedQuery) || NormalizeKey(label).Contains(normalizedQuery))
                    return new DynamicNavTarget(route, null, string.IsNullOrEmpty(name) ? label : name);
            }

            return null;
        }

        private static DynamicSelectTarget? ResolveDynamicSelect(string screenJson, string normalizedControl, string normalizedOption)
        {
            using var doc = JsonDocument.Parse(screenJson);
            foreach (var ctrl in ArrayItems(doc.RootElement, "controls"))
            {
                var id = ReadString(ctrl, "id");
                var lbl = CleanLabel(ReadString(ctrl, "label"), 80);
                if (IgnoredSelectControls.Contains(id) || IgnoredSelectControls.Contains(lbl)) continue;

                if (!NormalizeKey(id).Contains(normalizedControl) && !NormalizeKey(lbl).Contains(normalizedControl))
                    continue;

                var effectiveControlId = string.IsNullOrEmpty(id) ? lbl : id;
                foreach (var opt in ArrayItems(ctrl, "options"))
                {
                    if (ReadBool(opt, "disabled")) continue;
                    var optVal = ReadString(opt, "value");
                    var optLbl = CleanLabel(ReadString(opt, "label"), 80);
                    if (NormalizeKey(optVal) == normalizedOption || NormalizeKey(optLbl).Contains(normalizedOption))
                        return new DynamicSelectTarget(effectiveControlId, optVal);
                }
            }
            return null;
        }

        private static string? ResolveFirstOrMatchingField(string screenJson, string? explicitTarget)
        {
            using var doc = JsonDocument.Parse(screenJson);
            var want = string.IsNullOrWhiteSpace(explicitTarget) ? "" : NormalizeKey(explicitTarget);

            foreach (var f in ArrayItems(doc.RootElement, "fields"))
            {
                if (IsBlockedScreenField(f)) continue;
                var targetId = ReadString(f, "targetId");
                if (string.IsNullOrEmpty(targetId)) continue;

                if (string.IsNullOrEmpty(want))
                    return targetId;

                var label = CleanLabel(ReadString(f, "label"), 100);
                var placeholder = CleanLabel(ReadString(f, "placeholder"), 100);
                if (NormalizeKey(targetId) == want
                    || NormalizeKey(label).Contains(want)
                    || NormalizeKey(placeholder).Contains(want))
                {
                    return targetId;
                }
            }
            return null;
        }

        private static DynamicFoodTarget? ResolveDynamicFoodAction(string screenJson, string normalizedItem)
        {
            using var doc = JsonDocument.Parse(screenJson);
            foreach (var a in ArrayItems(doc.RootElement, "actions"))
            {
                if (ReadBool(a, "disabled") || IsBlockedScreenAction(a)) continue;
                var foodId = ReadString(a, "foodId");
                if (string.IsNullOrEmpty(foodId)) continue;

                var group = CleanLabel(ReadString(a, "group"), 80);
                var label = CleanLabel(ReadString(a, "label"), 120);
                var targetId = ReadString(a, "targetId");
                if (string.IsNullOrEmpty(targetId)) continue;

                var hay = NormalizeKey(group + " " + label);
                if (!hay.Contains(normalizedItem)) continue;

                if (label.TrimStart().StartsWith("+", StringComparison.Ordinal))
                {
                    return new DynamicFoodTarget(foodId, string.IsNullOrEmpty(group) ? label : group, targetId, label);
                }
            }
            return null;
        }

        private static DynamicNavTarget? FindDynamicSubmitAction(string screenJson, string? customSubmitLabel)
        {
            if (!string.IsNullOrWhiteSpace(customSubmitLabel))
                return FindDynamicRouteOrAction(screenJson, NormalizeKey(customSubmitLabel));

            using var doc = JsonDocument.Parse(screenJson);
            foreach (var a in ArrayItems(doc.RootElement, "actions"))
            {
                if (ReadBool(a, "disabled") || IsBlockedScreenAction(a)) continue;
                var label = CleanLabel(ReadString(a, "label"), 120);
                var targetId = ReadString(a, "targetId");
                if (string.IsNullOrEmpty(targetId) || string.IsNullOrEmpty(label)) continue;

                if (SubmitLabelRegex.IsMatch(label) || Regex.IsMatch(label, @"\b(submit|confirm|send|place|save)\b", RegexOptions.IgnoreCase))
                {
                    if (Regex.IsMatch(label, @"\(\s*0\s*items?\s*\)", RegexOptions.IgnoreCase))
                        continue;

                    return new DynamicNavTarget(null, targetId, label);
                }
            }
            return null;
        }

        private static List<string> ListAllAvailable(string screenJson)
        {
            using var doc = JsonDocument.Parse(screenJson);
            return ArrayItems(doc.RootElement, "actions")
                .Where(a => !ReadBool(a, "disabled") && !IsBlockedScreenAction(a))
                .Select(a => CleanLabel(ReadString(a, "label"), 80))
                .Where(l => !string.IsNullOrEmpty(l))
                .Distinct()
                .ToList();
        }

        private async Task<string> ExecuteWsActionsAsync(AiBridgeSession session, JsonElement body, CancellationToken cancellationToken)
        {
            var requestId = Trim(ReadString(body, "request_id"), 80);
            if (string.IsNullOrEmpty(requestId)) requestId = "ai-" + Guid.NewGuid().ToString("N").Substring(0, 12);

            var compact = !body.TryGetProperty("compact", out var cEl) || cEl.ValueKind != JsonValueKind.False;
            var snap = _bridge.GetSnapshot(session);

            if (body.TryGetProperty("screen_version", out var svEl) && svEl.ValueKind == JsonValueKind.Number && svEl.TryGetInt64(out var expectedVersion))
            {
                if (expectedVersion != snap.Version)
                {
                    return JsonSerializer.Serialize(new Dictionary<string, object>
                    {
                        ["type"] = "action_response",
                        ["accepted"] = false,
                        ["conflict"] = true,
                        ["request_id"] = requestId,
                        ["error"] = "Screen changed before action ran.",
                        ["screen_version"] = snap.Version,
                        ["screen"] = BuildScreenSnapshot(session, compact, "", "", true, expectedVersion)
                    });
                }
            }

            var actions = new List<JsonElement>();
            if (body.TryGetProperty("actions", out var aEl) && aEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in aEl.EnumerateArray()) actions.Add(item.Clone());
            }

            var suggestions = new List<JsonElement>();
            if (body.TryGetProperty("suggestions", out var sEl) && sEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in sEl.EnumerateArray()) suggestions.Add(item.Clone());
            }

            if (actions.Count == 0 && suggestions.Count == 0)
            {
                return JsonSerializer.Serialize(new Dictionary<string, object>
                {
                    ["type"] = "action_response",
                    ["accepted"] = false,
                    ["request_id"] = requestId,
                    ["error"] = "Send at least one action or suggestion."
                });
            }

            if (actions.Count > 10)
            {
                return JsonSerializer.Serialize(new Dictionary<string, object>
                {
                    ["type"] = "action_response",
                    ["accepted"] = false,
                    ["request_id"] = requestId,
                    ["error"] = "At most 10 actions per call."
                });
            }

            using var screenDoc = JsonDocument.Parse(snap.ScreenJson);
            var currentScreen = screenDoc.RootElement;
            var knownIds = CollectTargetIds(currentScreen);
            var startView = BuildView(currentScreen, compact, compact ? 40 : 200);
            var startRoute = session.Route;

            var actionJson = new List<string>();
            var expectedRequestIds = new List<string>();
            var warnings = new List<string>();
            var containsNavigation = false;
            var containsClick = false;
            var requiresConfirmation = false;

            for (var i = 0; i < actions.Count; i++)
            {
                var itemRequestId = requestId + "-" + (i + 1);
                if (!TryBuildAction(actions[i], itemRequestId, currentScreen, knownIds, out var json, out var effectiveRequestId, out var isNavigate, out var isClick, out var needsConfirm, out var warning, out var error))
                {
                    return JsonSerializer.Serialize(new Dictionary<string, object>
                    {
                        ["type"] = "action_response",
                        ["accepted"] = false,
                        ["request_id"] = requestId,
                        ["error"] = "actions[" + i + "]: " + error,
                        ["screen_version"] = snap.Version
                    });
                }
                actionJson.Add(json);
                expectedRequestIds.Add(effectiveRequestId);
                if (isNavigate) containsNavigation = true;
                if (isClick) containsClick = true;
                if (needsConfirm) requiresConfirmation = true;
                if (!string.IsNullOrEmpty(warning)) warnings.Add("actions[" + i + "]: " + warning);
            }

            var suggestionRows = new List<Dictionary<string, object>>();
            for (var i = 0; i < suggestions.Count; i++)
            {
                var label = CleanLabel(ReadString(suggestions[i], "label"), 80);
                if (label.Length == 0 || IsBlockedLabel(label)) continue;
                if (!suggestions[i].TryGetProperty("action", out var sugAct)) continue;
                if (!TryBuildAction(sugAct, requestId + "-s" + (i + 1), currentScreen, knownIds, out var json, out _, out _, out _, out _, out _, out _)) continue;
                using var parsed = JsonDocument.Parse(json);
                suggestionRows.Add(new Dictionary<string, object> { ["label"] = label, ["action"] = parsed.RootElement.Clone() });
            }

            var (startResultSeq, startScreenVersion, startConfirmSeq) = _bridge.GetWatermarks(session);

            var actionDelivered = 0;
            var suggestionsDelivered = 0;
            var publishedOnce = false;

            if (actionJson.Count > 0 && session.SubscriberCount > 0)
            {
                foreach (var json in actionJson) actionDelivered += _bridge.Publish(session, "action", json);
                publishedOnce = true;
            }

            if (!publishedOnce && actionJson.Count > 0)
            {
                var swReconnect = Stopwatch.StartNew();
                while (swReconnect.ElapsedMilliseconds < 800 && session.SubscriberCount == 0 && !cancellationToken.IsCancellationRequested)
                {
                    await Task.Delay(25, cancellationToken);
                }
                if (session.SubscriberCount > 0)
                {
                    foreach (var json in actionJson) actionDelivered += _bridge.Publish(session, "action", json);
                    publishedOnce = true;
                }
            }

            if (suggestionRows.Count > 0)
            {
                var transcript = Trim(ReadString(body, "transcript"), 300);
                var payload = JsonSerializer.Serialize(new Dictionary<string, object>
                {
                    ["request_id"] = requestId,
                    ["transcript"] = transcript,
                    ["suggestions"] = suggestionRows
                });
                suggestionsDelivered = _bridge.Publish(session, "suggestions", payload);
            }

            var delivered = actionDelivered + suggestionsDelivered;
            var activeStreams = session.SubscriberCount;

            var waitMs = 2500;
            if (body.TryGetProperty("wait_ms", out var wEl) && wEl.ValueKind == JsonValueKind.Number && wEl.TryGetInt32(out var customWait))
            {
                waitMs = Math.Clamp(customWait, 0, 8000);
            }

            var response = new Dictionary<string, object>
            {
                ["type"] = "action_response",
                ["accepted"] = true,
                ["request_id"] = requestId,
                ["actions"] = actionJson.Count,
                ["action_deliveries"] = actionDelivered,
                ["suggestion_deliveries"] = suggestionsDelivered,
                ["delivered_to_streams"] = activeStreams
            };
            if (warnings.Count > 0) response["warnings"] = warnings;

            if ((actionJson.Count > 0 && actionDelivered == 0) || actionJson.Count == 0 || waitMs == 0)
            {
                response["completed"] = delivered > 0 && actionJson.Count == 0;
                return JsonSerializer.Serialize(response);
            }

            var sw = Stopwatch.StartNew();
            var (matchedResults, completed) = await _bridge.WaitForResultsAsync(
                session,
                startResultSeq,
                expectedRequestIds,
                TimeSpan.FromMilliseconds(waitMs),
                cancellationToken);

            var anySuccess = matchedResults.Any(r => r.Success);

            if (anySuccess && _bridge.GetScreenVersion(session) == startScreenVersion)
            {
                var maxSettle = (containsNavigation || containsClick) ? 900 : 250;
                var settleMs = Math.Clamp(waitMs - (int)sw.ElapsedMilliseconds, 0, maxSettle);
                if (settleMs > 30)
                {
                    await _bridge.WaitForScreenUpdateAsync(session, startScreenVersion, TimeSpan.FromMilliseconds(settleMs), cancellationToken);
                }
            }

            if (requiresConfirmation)
            {
                var confirmMs = anySuccess ? 2500 : 0;
                var (confirms, confirmed) = await _bridge.WaitForConfirmationAsync(session, startConfirmSeq, TimeSpan.FromMilliseconds(confirmMs), cancellationToken);
                response["confirmation"] = new Dictionary<string, object>
                {
                    ["required"] = true,
                    ["confirmed"] = confirmed,
                    ["items"] = FormatConfirmationRows(confirms),
                    ["rule"] = confirmed ? ConfirmedRule : UnconfirmedRule
                };
            }

            response["completed"] = completed;
            if (!completed)
            {
                response["timed_out"] = true;
                response["error"] = "Action timed out waiting for device.";
            }
            response["results"] = FormatResultRows(matchedResults);
            response["last_seq"] = session.LastResultSeq;
            response["last_confirm_seq"] = session.LastConfirmSeq;
            response["screen"] = BuildScreenSnapshot(session, compact, startView.Signature, startRoute, true, startScreenVersion);

            return JsonSerializer.Serialize(response);
        }

        private string BuildScreenPushEnvelope(AiBridgeSession session, bool compact)
        {
            var snap = _bridge.GetSnapshot(session);
            using var doc = JsonDocument.Parse(snap.ScreenJson);
            var screen = doc.RootElement;
            var view = BuildView(screen, compact, compact ? 40 : 200);

            var envelope = new Dictionary<string, object>
            {
                ["type"] = "screen_update",
                ["session_id"] = session.SessionId,
                ["bed_id"] = session.BedId,
                ["call_active"] = session.CallActive,
                ["route"] = session.Route,
                ["title"] = session.Title,
                ["screen_version"] = snap.Version,
                ["options_signature"] = view.Signature,
                ["headings"] = ReadArrayOrEmpty(screen, "headings").EnumerateArray().Take(4).Select(h => h.Clone()).ToList(),
                ["last_seq"] = session.LastResultSeq,
                ["last_confirm_seq"] = session.LastConfirmSeq
            };
            AttachView(envelope, view);

            if (TryReadCart(screen, out var cart))
            {
                envelope["cart"] = cart;
                envelope["cart_signature"] = CartSignature(cart);
            }

            return JsonSerializer.Serialize(envelope);
        }

        private async Task BroadcastToAgentsAsync(string bedId, string text, CancellationToken cancellationToken)
        {
            if (!AgentSockets.TryGetValue(bedId, out var bucket) || bucket.IsEmpty) return;
            foreach (var pair in bucket)
            {
                if (pair.Value.State == WebSocketState.Open)
                {
                    try
                    {
                        await SendTextAsync(pair.Value, text, CancellationToken.None);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "AiBridge: failed broadcasting to agent socket {ConnId} for bed {BedId}.", pair.Key, bedId);
                    }
                }
            }
        }

        private static async Task SendTextAsync(WebSocket ws, string text, CancellationToken cancellationToken)
        {
            var bytes = Encoding.UTF8.GetBytes(text);
            var gate = SendLocks.GetValue(ws, _ => new SemaphoreSlim(1, 1));
            await gate.WaitAsync(cancellationToken);
            try
            {
                if (ws.State != WebSocketState.Open) return;
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                timeout.CancelAfter(SendTimeout);
                await ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, timeout.Token);
            }
            finally
            {
                gate.Release();
            }
        }

        private static Task SendErrorAsync(WebSocket ws, string error, CancellationToken cancellationToken)
        {
            return SendTextAsync(ws, JsonSerializer.Serialize(new Dictionary<string, object>
            {
                ["type"] = "error",
                ["error"] = error
            }), cancellationToken);
        }

        private async Task TrySendErrorAsync(WebSocket ws, Exception cause, CancellationToken cancellationToken)
        {
            var error = cause is JsonException
                ? "Invalid JSON message. Send one JSON object per message."
                : "The message could not be processed. Check the server log.";
            try { await SendErrorAsync(ws, error, cancellationToken); }
            catch (Exception ex) { _logger.LogWarning(ex, "AiBridge: could not send error to WebSocket."); }
        }

        private static async Task CloseSafelyAsync(WebSocket ws, WebSocketCloseStatus status)
        {
            var gate = SendLocks.GetValue(ws, _ => new SemaphoreSlim(1, 1));
            await gate.WaitAsync();
            try
            {
                using var timeout = new CancellationTokenSource(SendTimeout);
                await ws.CloseOutputAsync(status, "", timeout.Token);
            }
            catch { }
            finally
            {
                gate.Release();
            }
        }

        private async Task ReceiveLoopAsync(WebSocket ws, Func<string, Task> onMessage, CancellationToken cancellationToken)
        {
            var buffer = new byte[16384];
            using var ms = new MemoryStream();
            while (ws.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
            {
                ms.SetLength(0);
                WebSocketReceiveResult result;
                do
                {
                    try
                    {
                        result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), cancellationToken);
                    }
                    catch (OperationCanceledException) { return; }
                    catch (WebSocketException ex)
                    {
                        _logger.LogWarning(ex, "AiBridge: WebSocket receive error.");
                        return;
                    }

                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        _logger.LogInformation(
                            "AiBridge: WebSocket close received. Status: {Status}; Description: {Description}.",
                            result.CloseStatus,
                            result.CloseStatusDescription);
                        await CloseSafelyAsync(ws, result.CloseStatus ?? WebSocketCloseStatus.NormalClosure);
                        return;
                    }
                    if (result.Count > 0) ms.Write(buffer, 0, result.Count);
                    if (ms.Length > 524288)
                    {
                        await CloseSafelyAsync(ws, WebSocketCloseStatus.MessageTooBig);
                        return;
                    }
                }
                while (!result.EndOfMessage);

                if (result.MessageType == WebSocketMessageType.Text && ms.Length > 0)
                {
                    var text = Encoding.UTF8.GetString(ms.GetBuffer(), 0, (int)ms.Length);
                    try
                    {
                        await onMessage(text);
                    }
                    catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
                    {
                        _logger.LogWarning(ex, "AiBridge: failed handling WebSocket message.");
                        await TrySendErrorAsync(ws, ex, cancellationToken);
                    }
                }
            }
        }

        private bool IsValidWebSocketApiKey(string? suppliedQueryKey)
        {
            var expected = _config["AiBridge:ApiKey"]?.Trim();
            if (string.IsNullOrWhiteSpace(expected)) return _env.IsDevelopment();

            var supplied = "";
            if (Request.Headers.TryGetValue("X-Api-Key", out var headerValues) && headerValues.Count == 1)
            {
                supplied = headerValues[0]?.Trim() ?? "";
            }
            if (string.IsNullOrEmpty(supplied))
            {
                supplied = suppliedQueryKey?.Trim() ?? "";
            }
            var a = Encoding.UTF8.GetBytes(expected);
            var b = Encoding.UTF8.GetBytes(supplied);
            return a.Length == b.Length && CryptographicOperations.FixedTimeEquals(a, b);
        }

        private bool IsValidWebSocketTenantId(string? suppliedQueryTenant)
        {
            var expected = _config["AiBridge:TenantId"]?.Trim();
            if (string.IsNullOrWhiteSpace(expected)) return _env.IsDevelopment();

            var supplied = "";
            if (Request.Headers.TryGetValue("X-Tenant-ID", out var headerValues) && headerValues.Count == 1)
            {
                supplied = headerValues[0]?.Trim() ?? "";
            }
            if (string.IsNullOrEmpty(supplied))
            {
                supplied = suppliedQueryTenant?.Trim() ?? "";
            }
            return SecretEquals(expected, supplied);
        }

        private static bool SecretEquals(string expected, string supplied)
        {
            var a = Encoding.UTF8.GetBytes(expected);
            var b = Encoding.UTF8.GetBytes(supplied);
            return a.Length == b.Length && CryptographicOperations.FixedTimeEquals(a, b);
        }

        private AiBridgeSession? ResolveBedSession(string bedId)
        {
            var sessions = _bridge.List(bedId);
            return sessions.FirstOrDefault(s => s.CallActive && s.SubscriberCount > 0)
                ?? sessions.FirstOrDefault(s => s.SubscriberCount > 0)
                ?? sessions.FirstOrDefault(s => s.CallActive)
                ?? sessions.FirstOrDefault();
        }

        private static void AttachView(Dictionary<string, object> target, OptionsView view)
        {
            target["options"] = view.Options;
            if (view.Foods.Count > 0) target["foods"] = view.Foods;
            if (view.Selects.Count > 0) target["selects"] = view.Selects;
            if (view.Truncated) target["truncated"] = true;
        }

        private IActionResult OptionsFor(AiBridgeSession session, bool includeRaw, long? afterSeq, bool compact, long? sinceVersion, int? limit, bool includeItems)
        {
            var snap = _bridge.GetSnapshot(session);

            if (sinceVersion.HasValue && sinceVersion.Value == snap.Version && !includeRaw)
            {
                var unchanged = new Dictionary<string, object>
                {
                    ["session_id"] = session.SessionId,
                    ["call_active"] = session.CallActive,
                    ["screen_version"] = snap.Version,
                    ["unchanged"] = true,
                    ["last_seq"] = session.LastResultSeq
                };
                if (afterSeq.HasValue) unchanged["results"] = BuildResultRows(session, afterSeq.Value);
                return Content(JsonSerializer.Serialize(unchanged), "application/json");
            }

            using var doc = JsonDocument.Parse(snap.ScreenJson);
            var screen = doc.RootElement;
            var effectiveLimit = Math.Clamp(limit ?? (compact ? 40 : 200), 10, 300);
            var view = BuildView(screen, compact, effectiveLimit);

            List<Dictionary<string, object>> recentResults;
            if (afterSeq.HasValue)
            {
                recentResults = BuildResultRows(session, afterSeq.Value);
            }
            else if (compact)
            {
                recentResults = new List<Dictionary<string, object>>();
            }
            else
            {
                var allResults = BuildResultRows(session, 0);
                recentResults = allResults.Count > 5 ? allResults.GetRange(allResults.Count - 5, 5) : allResults;
            }

            var headings = ReadArrayOrEmpty(screen, "headings");
            var response = new Dictionary<string, object>
            {
                ["session_id"] = session.SessionId,
                ["bed_id"] = session.BedId,
                ["call_active"] = session.CallActive,
                ["route"] = session.Route,
                ["title"] = session.Title,
                ["screen_version"] = snap.Version,
                ["options_signature"] = view.Signature,
                ["headings"] = compact ? headings.EnumerateArray().Take(4).Select(h => h.Clone()).ToList() : headings.EnumerateArray().Select(h => h.Clone()).ToList(),
                ["results"] = recentResults,
                ["last_seq"] = session.LastResultSeq,
                ["last_confirm_seq"] = session.LastConfirmSeq
            };
            AttachView(response, view);

            if (!compact)
            {
                response["device_id"] = session.DeviceId;
                response["updated_utc"] = snap.Updated == default ? "" : snap.Updated.ToString("o");
            }
            if (!compact || includeItems) response["items"] = BuildFilteredItems(screen, view.NavRoutes);

            if (TryReadCart(screen, out var cart))
            {
                response["cart"] = cart;
                response["cart_signature"] = CartSignature(cart);
            }
            if (includeRaw) response["raw_screen"] = screen.Clone();

            return Content(JsonSerializer.Serialize(response), "application/json");
        }

        private async Task<IActionResult> ActionsForAsync(AiBridgeSession session, AiActionsPost? body, CancellationToken cancellationToken)
        {
            if (body == null) return BadRequest(new Dictionary<string, object> { ["error"] = "A JSON body is required." });

            var actions = body.Actions ?? new List<JsonElement>();
            var suggestions = body.Suggestions ?? new List<AiSuggestionPost>();
            if (actions.Count == 0 && suggestions.Count == 0)
                return BadRequest(new Dictionary<string, object> { ["error"] = "Send at least one action or one suggestion." });
            if (actions.Count > 10) return BadRequest(new Dictionary<string, object> { ["error"] = "At most 10 actions per call." });
            if (suggestions.Count > 8) return BadRequest(new Dictionary<string, object> { ["error"] = "At most 8 suggestions per call." });

            var requestId = string.IsNullOrWhiteSpace(body.RequestId) ? "ai-" + Guid.NewGuid().ToString("N").Substring(0, 12) : body.RequestId.Trim();
            if (requestId.Length > 80) requestId = requestId.Substring(0, 80);

            var snap = _bridge.GetSnapshot(session);
            var compact = body.Compact ?? true;

            if (body.ScreenVersion.HasValue && body.ScreenVersion.Value != snap.Version)
            {
                var freshSnapshot = BuildScreenSnapshot(session, compact, "", "", true, body.ScreenVersion.Value);
                return Conflict(new Dictionary<string, object>
                {
                    ["error"] = "Screen changed before action ran. Use the updated screen options.",
                    ["screen_version"] = snap.Version,
                    ["screen"] = freshSnapshot
                });
            }

            using var screenDoc = JsonDocument.Parse(snap.ScreenJson);
            var currentScreen = screenDoc.RootElement;
            var knownIds = CollectTargetIds(currentScreen);
            var startView = BuildView(currentScreen, compact, compact ? 40 : 200);
            var startRoute = session.Route;

            var actionJson = new List<string>();
            var expectedRequestIds = new List<string>();
            var warnings = new List<string>();
            var containsNavigation = false;
            var containsClick = false;
            var requiresConfirmation = false;

            for (var i = 0; i < actions.Count; i++)
            {
                var itemRequestId = requestId + "-" + (i + 1);
                if (!TryBuildAction(actions[i], itemRequestId, currentScreen, knownIds, out var json, out var effectiveRequestId, out var isNavigate, out var isClick, out var needsConfirm, out var warning, out var error))
                    return BadRequest(new Dictionary<string, object> { ["error"] = "actions[" + i + "]: " + error, ["screen_version"] = snap.Version });
                actionJson.Add(json);
                expectedRequestIds.Add(effectiveRequestId);
                if (isNavigate) containsNavigation = true;
                if (isClick) containsClick = true;
                if (needsConfirm) requiresConfirmation = true;
                if (!string.IsNullOrEmpty(warning)) warnings.Add("actions[" + i + "]: " + warning);
            }

            var suggestionRows = new List<Dictionary<string, object>>();
            for (var i = 0; i < suggestions.Count; i++)
            {
                var label = CleanLabel(suggestions[i].Label ?? "", 80);
                if (label.Length == 0) return BadRequest(new Dictionary<string, object> { ["error"] = "suggestions[" + i + "]: label is required." });
                if (IsBlockedLabel(label))
                    return BadRequest(new Dictionary<string, object> { ["error"] = "suggestions[" + i + "]: blocked action label." });

                if (!TryBuildAction(suggestions[i].Action, requestId + "-s" + (i + 1), currentScreen, knownIds, out var json, out _, out _, out _, out _, out _, out var error))
                    return BadRequest(new Dictionary<string, object> { ["error"] = "suggestions[" + i + "].action: " + error });

                using var parsed = JsonDocument.Parse(json);
                suggestionRows.Add(new Dictionary<string, object> { ["label"] = label, ["action"] = parsed.RootElement.Clone() });
            }

            var (startResultSeq, startScreenVersion, startConfirmSeq) = _bridge.GetWatermarks(session);

            var actionDelivered = 0;
            var suggestionsDelivered = 0;
            var publishedOnce = false;

            if (actionJson.Count > 0 && session.SubscriberCount > 0)
            {
                foreach (var json in actionJson) actionDelivered += _bridge.Publish(session, "action", json);
                publishedOnce = true;
            }

            if (!publishedOnce && actionJson.Count > 0)
            {
                var reconnectDeadline = Stopwatch.StartNew();
                while (reconnectDeadline.ElapsedMilliseconds < 800 && session.SubscriberCount == 0 && !cancellationToken.IsCancellationRequested)
                {
                    await Task.Delay(25, cancellationToken);
                }
                if (session.SubscriberCount > 0)
                {
                    foreach (var json in actionJson) actionDelivered += _bridge.Publish(session, "action", json);
                    publishedOnce = true;
                }
            }

            if (suggestionRows.Count > 0)
            {
                var transcript = body.Transcript ?? "";
                var payload = new Dictionary<string, object>
                {
                    ["request_id"] = requestId,
                    ["transcript"] = transcript.Length > 300 ? transcript.Substring(0, 300) : transcript,
                    ["suggestions"] = suggestionRows
                };
                suggestionsDelivered = _bridge.Publish(session, "suggestions", JsonSerializer.Serialize(payload));
            }

            var delivered = actionDelivered + suggestionsDelivered;
            var activeStreams = session.SubscriberCount;

            var waitMs = body.WaitMs.HasValue ? Math.Clamp(body.WaitMs.Value, 0, 8000) : (actionJson.Count > 0 ? 2500 : 0);
            var includeScreen = body.IncludeScreen ?? (actionJson.Count > 0 && waitMs > 0);

            var result = new Dictionary<string, object>
            {
                ["accepted"] = true,
                ["request_id"] = requestId,
                ["actions"] = actionJson.Count,
                ["suggestions"] = suggestionRows.Count,
                ["action_deliveries"] = actionDelivered,
                ["suggestion_deliveries"] = suggestionsDelivered,
                ["delivered_to_streams"] = activeStreams
            };

            if (warnings.Count > 0) result["warnings"] = warnings;

            if (requiresConfirmation)
            {
                result["confirmation"] = new Dictionary<string, object> { ["required"] = true, ["confirmed"] = false, ["rule"] = UnconfirmedRule };
            }

            if ((actionJson.Count > 0 && actionDelivered == 0) || delivered == 0)
            {
                result["warning"] = "The device has no open event stream right now. Events are kept for a few seconds and are delivered if it reconnects.";
                return StatusCode(202, result);
            }

            if (actionJson.Count == 0 || waitMs == 0)
            {
                return StatusCode(202, result);
            }

            var sw = Stopwatch.StartNew();
            var (matchedResults, completed) = await _bridge.WaitForResultsAsync(
                session,
                startResultSeq,
                expectedRequestIds,
                TimeSpan.FromMilliseconds(waitMs),
                cancellationToken);

            var anySuccess = matchedResults.Any(r => r.Success);

            if (anySuccess && _bridge.GetScreenVersion(session) == startScreenVersion)
            {
                var maxSettle = (containsNavigation || containsClick) ? 900 : 300;
                var settleMs = Math.Clamp(waitMs - (int)sw.ElapsedMilliseconds, 0, maxSettle);
                if (settleMs > 40)
                {
                    await _bridge.WaitForScreenUpdateAsync(session, startScreenVersion, TimeSpan.FromMilliseconds(settleMs), cancellationToken);
                }
            }

            if (requiresConfirmation)
            {
                var confirmMs = anySuccess ? Math.Clamp(body.ConfirmWaitMs ?? 2500, 0, 8000) : 0;
                var (confirms, confirmed) = await _bridge.WaitForConfirmationAsync(session, startConfirmSeq, TimeSpan.FromMilliseconds(confirmMs), cancellationToken);
                result["confirmation"] = new Dictionary<string, object>
                {
                    ["required"] = true,
                    ["confirmed"] = confirmed,
                    ["items"] = FormatConfirmationRows(confirms),
                    ["rule"] = confirmed ? ConfirmedRule : UnconfirmedRule
                };
            }

            result["completed"] = completed;
            if (!completed)
            {
                result["timed_out"] = true;
                result["error"] = matchedResults.Count == 0
                    ? "The device did not report a result in time. The target may be invalid or the page was busy. Re-read the screen before retrying."
                    : "Some actions did not report a result in time.";
            }
            result["results"] = FormatResultRows(matchedResults);
            result["last_seq"] = session.LastResultSeq;
            result["last_confirm_seq"] = session.LastConfirmSeq;

            if (includeScreen)
            {
                var baseline = string.IsNullOrWhiteSpace(body.KnownSignature) ? startView.Signature : body.KnownSignature.Trim();
                result["screen"] = BuildScreenSnapshot(session, compact, baseline, startRoute, body.IncludeOptions ?? true, startScreenVersion);
            }

            return StatusCode(completed ? 200 : 202, result);
        }

        private Dictionary<string, object> BuildScreenSnapshot(AiBridgeSession session, bool compact, string baselineSignature, string startRoute, bool forceOptions, long startVersion)
        {
            var snap = _bridge.GetSnapshot(session);
            using var doc = JsonDocument.Parse(snap.ScreenJson);
            var screen = doc.RootElement;
            var view = BuildView(screen, compact, compact ? 40 : 200);
            var routeChanged = !string.Equals(startRoute, session.Route, StringComparison.OrdinalIgnoreCase);
            var includeOptions = forceOptions || routeChanged || !string.Equals(view.Signature, baselineSignature, StringComparison.Ordinal);

            var snapshot = new Dictionary<string, object>
            {
                ["route"] = session.Route,
                ["title"] = session.Title,
                ["screen_version"] = snap.Version,
                ["changed"] = snap.Version != startVersion,
                ["options_signature"] = view.Signature
            };

            if (includeOptions)
            {
                snapshot["headings"] = ReadArrayOrEmpty(screen, "headings").EnumerateArray().Take(4).Select(h => h.Clone()).ToList();
                AttachView(snapshot, view);
            }
            else
            {
                snapshot["options_unchanged"] = true;
            }

            if (TryReadCart(screen, out var cart))
            {
                snapshot["cart"] = cart;
                snapshot["cart_signature"] = CartSignature(cart);
            }

            return snapshot;
        }

        private List<Dictionary<string, object>> BuildResultRows(AiBridgeSession session, long after)
        {
            return FormatResultRows(_bridge.GetResults(session, after));
        }

        private static List<Dictionary<string, object>> FormatResultRows(IEnumerable<AiBridgeResult> results)
        {
            var rows = new List<Dictionary<string, object>>();
            foreach (var r in results)
            {
                var row = new Dictionary<string, object>
                {
                    ["seq"] = r.Seq,
                    ["request_id"] = r.RequestId ?? "",
                    ["action"] = r.Action ?? "",
                    ["success"] = r.Success
                };
                if (!string.IsNullOrEmpty(r.Error)) row["error"] = r.Error;
                if (!string.IsNullOrEmpty(r.ResultJson))
                {
                    try { row["result"] = JsonSerializer.Deserialize<JsonElement>(r.ResultJson); } catch (JsonException) { }
                }
                rows.Add(row);
            }
            return rows;
        }

        private static List<Dictionary<string, object>> FormatConfirmationRows(IEnumerable<AiBridgeConfirmation> items)
        {
            var rows = new List<Dictionary<string, object>>();
            foreach (var c in items)
            {
                var row = new Dictionary<string, object>
                {
                    ["seq"] = c.Seq,
                    ["source"] = c.Source,
                    ["path"] = c.Path,
                    ["status"] = c.Status,
                    ["order_id"] = c.OrderId,
                    ["message"] = c.Message,
                    ["at_utc"] = c.AtUtc.ToString("o")
                };
                if (!string.IsNullOrEmpty(c.DetailJson))
                {
                    try { row["detail"] = JsonSerializer.Deserialize<JsonElement>(c.DetailJson); } catch (JsonException) { }
                }
                rows.Add(row);
            }
            return rows;
        }

        private async Task WriteEvent(AiBridgeEvent evt, CancellationToken cancellationToken)
        {
            await Response.WriteAsync("id: " + evt.Id + "\nevent: " + evt.Type + "\ndata: " + evt.Json + "\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }

        private IActionResult? RequireApiKey() => CheckApiKey() ?? CheckTenantId();

        private IActionResult? CheckTenantId()
        {
            var expected = _config["AiBridge:TenantId"]?.Trim();
            if (string.IsNullOrWhiteSpace(expected))
            {
                if (_env.IsDevelopment()) return null;
                return StatusCode(503, new Dictionary<string, object> { ["error"] = "AiBridge:TenantId is not configured on the server." });
            }

            if (Request.Headers.TryGetValue("X-Tenant-ID", out var headerValues) && headerValues.Count == 1
                && SecretEquals(expected, headerValues[0]?.Trim() ?? ""))
                return null;

            return Unauthorized(new Dictionary<string, object> { ["error"] = "Invalid or missing X-Tenant-ID." });
        }

        private IActionResult? CheckApiKey()
        {
            var expected = _config["AiBridge:ApiKey"]?.Trim();
            if (string.IsNullOrWhiteSpace(expected))
            {
                if (_env.IsDevelopment()) return null;
                return StatusCode(503, new Dictionary<string, object> { ["error"] = "AiBridge:ApiKey is not configured on the server." });
            }

            if (!Request.Headers.TryGetValue("X-Api-Key", out var headerValues) || headerValues.Count == 0)
                return Unauthorized(new Dictionary<string, object> { ["error"] = "Invalid or missing X-Api-Key." });

            if (headerValues.Count > 1)
                return Unauthorized(new Dictionary<string, object> { ["error"] = "Invalid or missing X-Api-Key." });

            var supplied = headerValues[0]?.Trim() ?? "";
            var a = Encoding.UTF8.GetBytes(expected);
            var b = Encoding.UTF8.GetBytes(supplied);
            if (a.Length == b.Length && CryptographicOperations.FixedTimeEquals(a, b)) return null;

            return Unauthorized(new Dictionary<string, object> { ["error"] = "Invalid or missing X-Api-Key." });
        }

        private static string Trim(string? value, int max)
        {
            if (string.IsNullOrEmpty(value)) return "";
            value = value.Trim();
            return value.Length > max ? value.Substring(0, max) : value;
        }

        private static string CleanLabel(string value, int maxLength)
        {
            if (string.IsNullOrWhiteSpace(value)) return "";
            var cleaned = WhitespaceRegex.Replace(value, " ").Trim();
            return cleaned.Length > maxLength ? cleaned.Substring(0, maxLength).TrimEnd() : cleaned;
        }

        private static string NormalizeRouteKey(string route)
        {
            var trimmed = route.Trim();
            if (trimmed.Length > 1 && trimmed.EndsWith("/", StringComparison.Ordinal))
                trimmed = trimmed.TrimEnd('/');
            return trimmed.ToLowerInvariant();
        }

        private static string CartSignature(JsonElement cart)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(cart.GetRawText()));
            return Convert.ToHexString(bytes.AsSpan(0, 6)).ToLowerInvariant();
        }

        private static string TextSignature(string value)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
            return Convert.ToHexString(bytes.AsSpan(0, 5)).ToLowerInvariant();
        }

        private static bool IsBlockedLabel(string? label) => !string.IsNullOrWhiteSpace(label) && BlockedLabelRegex.IsMatch(label);
        private static bool IsBlockedRoute(string? route) => !string.IsNullOrWhiteSpace(route) && BlockedRouteRegex.IsMatch(route.Trim());

        private static bool IsBlockedScreenAction(JsonElement a)
        {
            return IsBlockedLabel(ReadString(a, "label"))
                || IsBlockedRoute(ReadString(a, "route"))
                || BlockedHintRegex.IsMatch(ReadString(a, "id") + " " + ReadString(a, "action") + " " + ReadString(a, "targetId"));
        }

        private static bool IsBlockedScreenField(JsonElement f)
        {
            var type = ReadString(f, "type");
            if (string.Equals(type, "password", StringComparison.OrdinalIgnoreCase)
                || string.Equals(type, "hidden", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
            return IsBlockedLabel(ReadString(f, "label"))
                || IsBlockedLabel(ReadString(f, "placeholder"))
                || BlockedHintRegex.IsMatch(ReadString(f, "targetId") + " " + ReadString(f, "label"));
        }

        private static HashSet<string> CollectTargetIds(JsonElement screen)
        {
            var ids = new HashSet<string>(StringComparer.Ordinal);
            foreach (var name in new[] { "actions", "fields", "choices" })
            {
                foreach (var item in ArrayItems(screen, name))
                {
                    var id = ReadString(item, "targetId");
                    if (id.Length > 0) ids.Add(id);
                }
            }
            return ids;
        }

        private static string StringField(Dictionary<string, JsonElement> fields, string key)
        {
            return fields.TryGetValue(key, out var element) && element.ValueKind == JsonValueKind.String ? element.GetString() ?? "" : "";
        }

        private static void NormalizeActionAliases(Dictionary<string, JsonElement> fields, HashSet<string> knownIds)
        {
            var name = StringField(fields, "action");
            if (name != "ui.click" && name != "ui.fill" && name != "ui.set_choice") return;

            if (StringField(fields, "targetId").Length == 0)
            {
                foreach (var alias in TargetAliases)
                {
                    var value = StringField(fields, alias).Trim();
                    if (value.Length == 0) continue;
                    var loose = alias == "path" || alias == "target";
                    if (loose && !knownIds.Contains(value) && !value.StartsWith("nav:", StringComparison.Ordinal) && !value.StartsWith("select:", StringComparison.Ordinal)) continue;
                    fields["targetId"] = JsonSerializer.SerializeToElement(value);
                    fields.Remove(alias);
                    break;
                }
            }

            var targetId = StringField(fields, "targetId");
            if (targetId.StartsWith("nav:", StringComparison.Ordinal))
            {
                fields["action"] = JsonSerializer.SerializeToElement("navigate");
                fields["path"] = JsonSerializer.SerializeToElement(targetId.Substring(4));
                fields.Remove("targetId");
            }
            else if (targetId.StartsWith("select:", StringComparison.Ordinal) && name == "ui.click")
            {
                var parts = targetId.Split(':', 3);
                if (parts.Length == 3)
                {
                    fields["action"] = JsonSerializer.SerializeToElement("ui.select");
                    fields["controlId"] = JsonSerializer.SerializeToElement(parts[1]);
                    fields["optionValue"] = JsonSerializer.SerializeToElement(parts[2]);
                    fields.Remove("targetId");
                }
            }
        }

        private static bool TryBuildAction(
            JsonElement element,
            string defaultRequestId,
            JsonElement currentScreen,
            HashSet<string> knownIds,
            out string json,
            out string effectiveRequestId,
            out bool isNavigate,
            out bool isClick,
            out bool requiresConfirmation,
            out string? warning,
            out string error)
        {
            json = "";
            effectiveRequestId = defaultRequestId;
            isNavigate = false;
            isClick = false;
            requiresConfirmation = false;
            warning = null;
            error = "";

            if (element.ValueKind != JsonValueKind.Object)
            {
                error = "must be a JSON object.";
                return false;
            }

            var fields = new Dictionary<string, JsonElement>();
            foreach (var property in element.EnumerateObject()) fields[property.Name] = property.Value.Clone();

            if (!fields.TryGetValue("action", out var nameElement) || nameElement.ValueKind != JsonValueKind.String)
            {
                error = "needs a string \"action\" property (for example \"navigate\" or \"ui.click\").";
                return false;
            }

            NormalizeActionAliases(fields, knownIds);

            var name = StringField(fields, "action");
            if (!AllowedExactActions.Contains(name))
            {
                error = "action \"" + name + "\" is not allowed.";
                return false;
            }

            if (name == "navigate")
            {
                isNavigate = true;
                var path = StringField(fields, "path");
                var target = StringField(fields, "target");

                if (!string.IsNullOrEmpty(path))
                {
                    if (!path.StartsWith("/", StringComparison.Ordinal) || path.StartsWith("//", StringComparison.Ordinal) || path.Contains("://"))
                    {
                        error = "navigate needs \"path\" as a same-site path such as \"/RoomComfort/Index\".";
                        return false;
                    }
                    if (IsBlockedRoute(path))
                    {
                        error = "navigation to authentication or logout routes is blocked.";
                        return false;
                    }
                }
                else if (string.IsNullOrEmpty(target))
                {
                    error = "navigate needs \"path\" as a same-site path such as \"/RoomComfort/Index\".";
                    return false;
                }
            }

            if (name == "ui.select")
            {
                var controlId = StringField(fields, "controlId").Trim();
                if (controlId.Length == 0) controlId = StringField(fields, "control").Trim();
                var optionValue = StringField(fields, "optionValue");
                if (optionValue.Length == 0 && fields.ContainsKey("value")) optionValue = StringField(fields, "value");

                if (controlId.Length == 0 || (!fields.ContainsKey("optionValue") && !fields.ContainsKey("value")))
                {
                    error = "ui.select needs \"controlId\" and \"optionValue\".";
                    return false;
                }

                if (IgnoredSelectControls.Contains(controlId) || IsBlockedLabel(controlId) || IsBlockedLabel(optionValue))
                {
                    error = "selecting \"" + controlId + "\" is blocked.";
                    return false;
                }

                JsonElement matchedControl = default;
                var controlFound = false;
                foreach (var c in ArrayItems(currentScreen, "controls"))
                {
                    var id = ReadString(c, "id");
                    var lbl = CleanLabel(ReadString(c, "label"), 60);
                    if (string.Equals(id, controlId, StringComparison.Ordinal) || string.Equals(lbl, controlId, StringComparison.OrdinalIgnoreCase))
                    {
                        matchedControl = c;
                        controlFound = true;
                        break;
                    }
                }

                if (!controlFound)
                {
                    error = "control \"" + controlId + "\" is not on the current screen.";
                    return false;
                }

                var optionFound = false;
                foreach (var opt in ArrayItems(matchedControl, "options"))
                {
                    var val = ReadString(opt, "value");
                    var optLbl = CleanLabel(ReadString(opt, "label"), 70);
                    if (!string.Equals(val, optionValue, StringComparison.Ordinal) && !string.Equals(optLbl, optionValue, StringComparison.OrdinalIgnoreCase)) continue;
                    if (ReadBool(opt, "disabled") || IsBlockedLabel(optLbl))
                    {
                        error = "option \"" + optionValue + "\" is disabled or blocked.";
                        return false;
                    }
                    fields["optionValue"] = JsonSerializer.SerializeToElement(val);
                    optionFound = true;
                    break;
                }

                if (!optionFound)
                {
                    error = "option \"" + optionValue + "\" is not valid for control \"" + controlId + "\".";
                    return false;
                }
            }

            if (name == "ui.fill")
            {
                var suppliedLabel = StringField(fields, "label");
                var targetId = StringField(fields, "targetId");

                if (targetId.Length == 0 && suppliedLabel.Length == 0)
                {
                    error = "ui.fill needs \"targetId\" or \"label\".";
                    return false;
                }
                if (!fields.ContainsKey("value"))
                {
                    error = "ui.fill needs a \"value\".";
                    return false;
                }
                if (IsBlockedLabel(suppliedLabel))
                {
                    error = "filling \"" + suppliedLabel + "\" is blocked for patient session safety.";
                    return false;
                }

                var fieldFound = false;
                foreach (var f in ArrayItems(currentScreen, "fields"))
                {
                    var fId = ReadString(f, "targetId");
                    var fLabel = CleanLabel(ReadString(f, "label"), 80);
                    if ((targetId.Length > 0 && fId == targetId) || (targetId.Length == 0 && suppliedLabel.Length > 0 && string.Equals(fLabel, suppliedLabel, StringComparison.OrdinalIgnoreCase)))
                    {
                        if (IsBlockedScreenField(f))
                        {
                            error = "target field is blocked for patient session safety.";
                            return false;
                        }
                        if (targetId.Length == 0) fields["targetId"] = JsonSerializer.SerializeToElement(fId);
                        fieldFound = true;
                        break;
                    }
                }

                if (!fieldFound)
                {
                    error = "target field is not available on the current screen.";
                    return false;
                }
            }

            if (name == "ui.click" || name == "ui.set_choice")
            {
                isClick = name == "ui.click";
                var suppliedLabel = StringField(fields, "label");
                var targetId = StringField(fields, "targetId");

                if (targetId.Length == 0 && suppliedLabel.Length == 0)
                {
                    error = name + " needs \"targetId\" (the id of an entry from options) or a \"label\". Do not use \"path\" for clicks.";
                    return false;
                }
                if (name == "ui.set_choice" && !fields.ContainsKey("checked"))
                {
                    error = "ui.set_choice needs \"checked\" (true or false).";
                    return false;
                }

                if (IsBlockedLabel(suppliedLabel))
                {
                    error = "clicking \"" + suppliedLabel + "\" is blocked for patient session safety.";
                    return false;
                }

                var collectionName = name == "ui.set_choice" ? "choices" : "actions";
                var found = false;
                if (targetId.Length > 0)
                {
                    foreach (var a in ArrayItems(currentScreen, collectionName))
                    {
                        if (ReadString(a, "targetId") != targetId) continue;
                        found = true;
                        if (IsBlockedScreenAction(a))
                        {
                            error = "target \"" + targetId + "\" is blocked for patient session safety.";
                            return false;
                        }
                        var screenLabel = ReadString(a, "label");
                        if (suppliedLabel.Length == 0 && !string.IsNullOrWhiteSpace(screenLabel))
                        {
                            suppliedLabel = CleanLabel(screenLabel, 90);
                            fields["label"] = JsonSerializer.SerializeToElement(suppliedLabel);
                        }
                        break;
                    }
                    if (!found && knownIds.Contains(targetId)) found = true;
                }

                if (!found && suppliedLabel.Length > 0)
                {
                    var wanted = CleanLabel(suppliedLabel, 90).ToLowerInvariant();
                    var matchCount = 0;
                    var remapped = "";
                    foreach (var a in ArrayItems(currentScreen, collectionName))
                    {
                        if (ReadBool(a, "disabled") || IsBlockedScreenAction(a)) continue;
                        var candidate = CleanLabel(ReadString(a, "label"), 90).ToLowerInvariant();
                        if (candidate != wanted && !candidate.StartsWith(wanted, StringComparison.Ordinal)) continue;
                        matchCount++;
                        remapped = ReadString(a, "targetId");
                    }
                    if (matchCount == 1 && remapped.Length > 0)
                    {
                        fields["targetId"] = JsonSerializer.SerializeToElement(remapped);
                        found = true;
                        warning = "targetId was not on the current screen and was replaced by the control with the same label.";
                    }
                }

                if (!found && targetId.Length > 0 && warning == null)
                {
                    warning = "targetId \"" + targetId + "\" is not on the current screen. The device will try to match it to a control that changed.";
                }

                if (name == "ui.click" && SubmitLabelRegex.IsMatch(suppliedLabel)) requiresConfirmation = true;
            }

            if (name.StartsWith("request.", StringComparison.Ordinal)
                || (name.StartsWith("food.", StringComparison.Ordinal) && name != "food.intent"))
            {
                requiresConfirmation = true;
            }

            var hasRequestId = fields.TryGetValue("request_id", out var rid)
                               && rid.ValueKind == JsonValueKind.String
                               && !string.IsNullOrWhiteSpace(rid.GetString());
            if (hasRequestId)
            {
                effectiveRequestId = rid.GetString()!.Trim();
                if (effectiveRequestId.Length > 80) effectiveRequestId = effectiveRequestId.Substring(0, 80);
                fields["request_id"] = JsonSerializer.SerializeToElement(effectiveRequestId);
            }
            else
            {
                fields["request_id"] = JsonSerializer.SerializeToElement(defaultRequestId);
                effectiveRequestId = defaultRequestId;
            }

            json = JsonSerializer.Serialize(fields);
            return true;
        }

        private static string FoodActionKind(string label, string name)
        {
            var text = label.TrimStart();
            if (text.StartsWith("+", StringComparison.Ordinal)) return "plus";
            if (text.StartsWith("-", StringComparison.Ordinal) || text.StartsWith("\u2212", StringComparison.Ordinal) || text.StartsWith("\u2013", StringComparison.Ordinal)) return "minus";
            var rest = name.Length > 0 ? text.Replace(name, "", StringComparison.OrdinalIgnoreCase).Trim() : text;
            return rest.Length > 0 && rest.Length <= 24 ? "info" : "open";
        }

        private static Dictionary<string, int> ReadCartQuantities(JsonElement screen)
        {
            var map = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            if (screen.ValueKind == JsonValueKind.Object
                && screen.TryGetProperty("cart", out var cart)
                && cart.ValueKind == JsonValueKind.Object)
            {
                foreach (var line in ArrayItems(cart, "lines"))
                {
                    var key = ReadString(line, "foodId") + "|" + ReadString(line, "meal");
                    if (line.TryGetProperty("qty", out var qty) && qty.ValueKind == JsonValueKind.Number && qty.TryGetInt32(out var n)) map[key] = n;
                }
            }
            return map;
        }

        private static OptionsView BuildView(JsonElement screen, bool compact, int limit)
        {
            var view = new OptionsView();
            var actionOptions = new List<Dictionary<string, object>>();
            var otherOptions = new List<Dictionary<string, object>>();
            var foodIndex = new Dictionary<string, Dictionary<string, object>>(StringComparer.Ordinal);
            var navRoutes = new HashSet<string>(StringComparer.Ordinal);
            var seenClickSignatures = new HashSet<string>(StringComparer.Ordinal);
            var quantities = ReadCartQuantities(screen);
            var signature = new StringBuilder();
            var currentRoute = NormalizeRouteKey(ReadString(screen, "route"));

            foreach (var a in ArrayItems(screen, "actions"))
            {
                if (ReadBool(a, "disabled") || IsBlockedScreenAction(a)) continue;
                var label = CleanLabel(ReadString(a, "label"), compact ? 40 : 90);
                if (label.Length == 0) continue;

                var targetId = ReadString(a, "targetId");
                var route = ReadString(a, "route");
                var group = CleanLabel(ReadString(a, "group"), 40);
                var foodId = ReadString(a, "foodId");
                var meal = ReadString(a, "meal");

                if (compact && GlobalShellLabels.Contains(label) && currentRoute != "/home/index" && currentRoute != "/home" && currentRoute != "")
                    continue;

                if (route.Length > 0)
                {
                    var routeKey = NormalizeRouteKey(route);
                    if (compact && GlobalShellRoutes.Contains(route) && currentRoute != "/home/index" && currentRoute != "/home" && currentRoute != "") continue;
                    if (!navRoutes.Add(routeKey)) continue;

                    var entry = new Dictionary<string, object>
                    {
                        ["id"] = "nav:" + route,
                        ["type"] = "navigate",
                        ["label"] = label,
                        ["route"] = route
                    };
                    if (!compact)
                    {
                        entry["action"] = new Dictionary<string, object> { ["action"] = "navigate", ["path"] = route };
                    }
                    signature.Append("n:").Append(routeKey).Append(';');
                    actionOptions.Add(entry);
                }
                else if (targetId.Length > 0)
                {
                    if (compact && foodId.Length > 0)
                    {
                        var foodKey = foodId + "|" + meal;
                        if (!foodIndex.TryGetValue(foodKey, out var food))
                        {
                            if (foodIndex.Count >= MaxFoods)
                            {
                                view.Truncated = true;
                                continue;
                            }
                            quantities.TryGetValue(foodKey, out var qty);
                            food = new Dictionary<string, object>
                            {
                                ["name"] = group.Length > 0 ? group : label,
                                ["food_id"] = foodId,
                                ["qty"] = qty
                            };
                            if (meal.Length > 0) food["meal"] = meal;
                            foodIndex[foodKey] = food;
                            view.Foods.Add(food);
                        }
                        var kind = FoodActionKind(label, group);
                        if (!food.ContainsKey(kind))
                        {
                            food[kind] = targetId;
                            signature.Append(targetId).Append(';');
                        }
                        continue;
                    }

                    var dedupeKey = (group + "|" + label).ToLowerInvariant();
                    if (label.Length >= 4 && !seenClickSignatures.Add(dedupeKey)) continue;

                    var click = new Dictionary<string, object>
                    {
                        ["id"] = targetId,
                        ["type"] = "click",
                        ["label"] = label
                    };
                    if (!string.IsNullOrEmpty(group)) click["group"] = group;
                    if (!compact)
                    {
                        click["action"] = new Dictionary<string, object>
                        {
                            ["action"] = "ui.click",
                            ["targetId"] = targetId,
                            ["label"] = label
                        };
                    }
                    signature.Append(targetId).Append('|').Append(label).Append(';');
                    actionOptions.Add(click);
                }
            }

            foreach (var control in ArrayItems(screen, "controls"))
            {
                var controlId = ReadString(control, "id");
                var controlLabel = CleanLabel(ReadString(control, "label"), 60);
                var key = controlId.Length > 0 ? controlId : controlLabel;
                if (key.Length == 0) continue;
                if (compact && (IgnoredSelectControls.Contains(controlId) || IgnoredSelectControls.Contains(controlLabel))) continue;

                if (compact)
                {
                    var values = new Dictionary<string, string>(StringComparer.Ordinal);
                    foreach (var option in ArrayItems(control, "options"))
                    {
                        if (ReadBool(option, "disabled")) continue;
                        var optionLabel = CleanLabel(ReadString(option, "label"), 40);
                        if (IsBlockedLabel(optionLabel) || values.Count >= 20) continue;
                        var optionValue = ReadString(option, "value");
                        if (!values.ContainsKey(optionValue)) values[optionValue] = optionLabel;
                    }
                    if (values.Count <= 1) continue;

                    var select = new Dictionary<string, object>
                    {
                        ["control"] = key,
                        ["label"] = controlLabel,
                        ["values"] = values
                    };
                    if (control.TryGetProperty("selected", out var selected) && selected.ValueKind == JsonValueKind.Object)
                    {
                        select["selected"] = ReadString(selected, "value");
                    }
                    signature.Append("s:").Append(key).Append(':').Append(string.Join(",", values.Keys)).Append(';');
                    view.Selects.Add(select);
                    continue;
                }

                foreach (var option in ArrayItems(control, "options"))
                {
                    if (ReadBool(option, "disabled")) continue;
                    var value = ReadString(option, "value");
                    var optionLabel = CleanLabel(ReadString(option, "label"), 70);
                    if (IsBlockedLabel(optionLabel)) continue;

                    otherOptions.Add(new Dictionary<string, object>
                    {
                        ["id"] = "select:" + key + ":" + value,
                        ["type"] = "select",
                        ["label"] = optionLabel,
                        ["group"] = controlLabel,
                        ["action"] = new Dictionary<string, object>
                        {
                            ["action"] = "ui.select",
                            ["controlId"] = key,
                            ["optionValue"] = value
                        }
                    });
                }
            }

            foreach (var choice in ArrayItems(screen, "choices"))
            {
                if (ReadBool(choice, "disabled")) continue;
                var targetId = ReadString(choice, "targetId");
                if (targetId.Length == 0) continue;
                var label = CleanLabel(ReadString(choice, "label"), 90);
                if (IsBlockedLabel(label)) continue;

                var entry = new Dictionary<string, object>
                {
                    ["id"] = targetId,
                    ["type"] = "choice",
                    ["label"] = label,
                    ["checked"] = ReadBool(choice, "checked")
                };
                if (!compact)
                {
                    entry["action"] = new Dictionary<string, object>
                    {
                        ["action"] = "ui.set_choice",
                        ["targetId"] = targetId,
                        ["checked"] = true
                    };
                }
                signature.Append(targetId).Append(';');
                otherOptions.Add(entry);
            }

            foreach (var field in ArrayItems(screen, "fields"))
            {
                if (IsBlockedScreenField(field)) continue;
                var targetId = ReadString(field, "targetId");
                if (targetId.Length == 0) continue;
                var label = CleanLabel(ReadString(field, "label"), 80);
                if (IsBlockedLabel(label)) continue;

                var entry = new Dictionary<string, object>
                {
                    ["id"] = targetId,
                    ["type"] = "fill",
                    ["label"] = label,
                    ["needs_value"] = true
                };
                if (!compact)
                {
                    entry["action"] = new Dictionary<string, object>
                    {
                        ["action"] = "ui.fill",
                        ["targetId"] = targetId,
                        ["value"] = "<text the patient said>"
                    };
                }
                signature.Append(targetId).Append(';');
                otherOptions.Add(entry);
            }

            if (otherOptions.Count > limit)
            {
                view.Truncated = true;
                otherOptions = otherOptions.GetRange(0, limit);
            }

            var room = Math.Max(limit - otherOptions.Count, 0);
            if (actionOptions.Count > room)
            {
                view.Truncated = true;
                actionOptions = actionOptions.GetRange(0, room);
            }

            view.NavRoutes = navRoutes;
            view.Options.AddRange(actionOptions);
            view.Options.AddRange(otherOptions);
            view.Signature = TextSignature(signature.ToString());
            return view;
        }

        private static List<JsonElement> BuildFilteredItems(JsonElement screen, HashSet<string> includedNavRoutes)
        {
            var filtered = new List<JsonElement>();
            foreach (var item in ArrayItems(screen, "items"))
            {
                var label = ReadString(item, "label");
                var route = ReadString(item, "route");
                if (IsBlockedLabel(label) || IsBlockedRoute(route)) continue;
                if (!string.IsNullOrEmpty(route) && includedNavRoutes.Contains(NormalizeRouteKey(route))) continue;
                filtered.Add(item.Clone());
            }
            return filtered;
        }

        private static bool TryReadCart(JsonElement screen, out JsonElement cart)
        {
            if (screen.ValueKind == JsonValueKind.Object
                && screen.TryGetProperty("cart", out var value)
                && value.ValueKind == JsonValueKind.Object)
            {
                cart = value.Clone();
                return true;
            }
            cart = default;
            return false;
        }

        private static IEnumerable<JsonElement> ArrayItems(JsonElement element, string name)
        {
            if (element.ValueKind == JsonValueKind.Object
                && element.TryGetProperty(name, out var array)
                && array.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in array.EnumerateArray()) yield return item;
            }
        }

        private static JsonElement ReadArrayOrEmpty(JsonElement element, string name)
        {
            if (element.ValueKind == JsonValueKind.Object
                && element.TryGetProperty(name, out var array)
                && array.ValueKind == JsonValueKind.Array)
            {
                return array;
            }
            return JsonSerializer.Deserialize<JsonElement>("[]");
        }

        private static string ReadString(JsonElement element, string name)
        {
            if (element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value))
            {
                if (value.ValueKind == JsonValueKind.String) return value.GetString() ?? "";
                if (value.ValueKind == JsonValueKind.Number || value.ValueKind == JsonValueKind.True || value.ValueKind == JsonValueKind.False)
                    return value.ToString() ?? "";
            }
            return "";
        }

        private static bool ReadBool(JsonElement element, string name)
        {
            return element.ValueKind == JsonValueKind.Object
                   && element.TryGetProperty(name, out var value)
                   && value.ValueKind == JsonValueKind.True;
        }
    }

    public sealed class AiRunIntentPost
    {
        [JsonPropertyName("bed_id")] public string? BedId { get; set; }
        [JsonPropertyName("department")] public string? Department { get; set; }
        [JsonPropertyName("category")] public string? Category { get; set; }
        [JsonPropertyName("remarks")] public string? Remarks { get; set; }
        [JsonPropertyName("field_target")] public string? FieldTarget { get; set; }
        [JsonPropertyName("submit")] public bool? Submit { get; set; }
        [JsonPropertyName("place_order")] public bool? PlaceOrder { get; set; }
        [JsonPropertyName("close_modal")] public bool? CloseModal { get; set; }
        [JsonPropertyName("submit_label")] public string? SubmitLabel { get; set; }
        [JsonPropertyName("steps")] public List<string>? Steps { get; set; }
        [JsonPropertyName("selects")] public List<AiDynamicSelect>? Selects { get; set; }
        [JsonPropertyName("items")] public List<AiDynamicItem>? Items { get; set; }
        [JsonPropertyName("intents")] public List<AiRunIntentPost>? Intents { get; set; }
    }

    public sealed class AiDynamicSelect
    {
        [JsonPropertyName("control")] public string? Control { get; set; }
        [JsonPropertyName("value")] public string? Value { get; set; }
    }

    public sealed class AiDynamicItem
    {
        [JsonPropertyName("name")] public string? Name { get; set; }
        [JsonPropertyName("qty")] public int Qty { get; set; } = 1;
    }

    public sealed class AiScreenPush
    {
        [JsonPropertyName("bed_id")] public string? BedId { get; set; }
        [JsonPropertyName("device_id")] public string? DeviceId { get; set; }
        [JsonPropertyName("call_active")] public bool CallActive { get; set; }
        [JsonPropertyName("screen")] public JsonElement Screen { get; set; }
    }

    public sealed class AiActionsPost
    {
        [JsonPropertyName("request_id")] public string? RequestId { get; set; }
        [JsonPropertyName("transcript")] public string? Transcript { get; set; }
        [JsonPropertyName("session_id")] public string? SessionId { get; set; }
        [JsonPropertyName("device_id")] public string? DeviceId { get; set; }
        [JsonPropertyName("screen_version")] public long? ScreenVersion { get; set; }
        [JsonPropertyName("wait_ms")] public int? WaitMs { get; set; }
        [JsonPropertyName("confirm_wait_ms")] public int? ConfirmWaitMs { get; set; }
        [JsonPropertyName("include_screen")] public bool? IncludeScreen { get; set; }
        [JsonPropertyName("include_options")] public bool? IncludeOptions { get; set; }
        [JsonPropertyName("known_signature")] public string? KnownSignature { get; set; }
        [JsonPropertyName("compact")] public bool? Compact { get; set; }
        [JsonPropertyName("actions")] public List<JsonElement>? Actions { get; set; }
        [JsonPropertyName("suggestions")] public List<AiSuggestionPost>? Suggestions { get; set; }
    }

    public sealed class AiSuggestionPost
    {
        [JsonPropertyName("label")] public string? Label { get; set; }
        [JsonPropertyName("action")] public JsonElement Action { get; set; }
    }

    public sealed class AiResultPost
    {
        [JsonPropertyName("request_id")] public string? RequestId { get; set; }
        [JsonPropertyName("action")] public string? Action { get; set; }
        [JsonPropertyName("success")] public bool Success { get; set; }
        [JsonPropertyName("error")] public string? Error { get; set; }
        [JsonPropertyName("result")] public JsonElement Result { get; set; }
    }

    public sealed class AiConfirmationPost
    {
        [JsonPropertyName("source")] public string? Source { get; set; }
        [JsonPropertyName("path")] public string? Path { get; set; }
        [JsonPropertyName("status")] public string? Status { get; set; }
        [JsonPropertyName("order_id")] public string? OrderId { get; set; }
        [JsonPropertyName("message")] public string? Message { get; set; }
        [JsonPropertyName("detail")] public JsonElement Detail { get; set; }
    }
}