using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Dial50_MVC_Core.Services;
using Microsoft.AspNetCore.Mvc;

namespace Dial50_MVC_Core.Controllers
{
    [ApiController]
    [Route("api/ai-bridge")]
    public class AiBridgeController : ControllerBase
    {
        private const int MaxFoods = 60;

        private static readonly string[] AllowedActionPrefixes = { "ui.", "video.", "food.", "request.", "notification.", "feedback." };
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

        private static readonly Regex BlockedLabelRegex = new(
            @"\b(log\s*out|logout|log\s*off|sign\s*out|signout|sign\s*off|end\s*(the\s*)?(call|session)|hang\s*up|disconnect\s*call|delete\s*account|exit\s*app)\b",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex BlockedHintRegex = new(
            @"log-?out|sign-?out|log-?off|end-?call|hang-?up",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex BlockedRouteRegex = new(
            @"^/(?:account/)?(?:log-?out|log-?off|sign-?out|log-?in|prelanding)(?:/|\?|$)",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex SubmitLabelRegex = new(
            @"\b(place\s*order|submit|confirm|send\s*request|raise\s*request|checkout|order\s*now|request\s*now)\b",
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

        public AiBridgeController(AiBridgeService bridge, IConfiguration config, IWebHostEnvironment env, ILogger<AiBridgeController> logger)
        {
            _bridge = bridge;
            _config = config;
            _env = env;
            _logger = logger;
        }

        [HttpGet("health")]
        public IActionResult Health()
        {
            return Ok(new Dictionary<string, object> { ["ok"] = true, ["sessions"] = _bridge.List(null).Count });
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

            var delivered = 0;
            foreach (var json in actionJson) delivered = _bridge.Publish(session, "action", json);

            if (delivered == 0 && actionJson.Count > 0)
            {
                var reconnectDeadline = Stopwatch.StartNew();
                while (reconnectDeadline.ElapsedMilliseconds < 1000 && session.SubscriberCount == 0 && !cancellationToken.IsCancellationRequested)
                {
                    await Task.Delay(50, cancellationToken);
                }
                if (session.SubscriberCount > 0)
                {
                    delivered = 0;
                    foreach (var json in actionJson) delivered = _bridge.Publish(session, "action", json);
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
                delivered = _bridge.Publish(session, "suggestions", JsonSerializer.Serialize(payload));
            }

            var waitMs = body.WaitMs.HasValue ? Math.Clamp(body.WaitMs.Value, 0, 8000) : (actionJson.Count > 0 ? 3000 : 0);
            var includeScreen = body.IncludeScreen ?? (actionJson.Count > 0 && waitMs > 0);

            var result = new Dictionary<string, object>
            {
                ["accepted"] = true,
                ["request_id"] = requestId,
                ["actions"] = actionJson.Count,
                ["suggestions"] = suggestionRows.Count,
                ["delivered_to_streams"] = delivered
            };

            if (warnings.Count > 0) result["warnings"] = warnings;

            if (requiresConfirmation)
            {
                result["confirmation"] = new Dictionary<string, object> { ["required"] = true, ["confirmed"] = false, ["rule"] = UnconfirmedRule };
            }

            if (delivered == 0)
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
                var maxSettle = (containsNavigation || containsClick) ? 1400 : 400;
                var settleMs = Math.Clamp(waitMs - (int)sw.ElapsedMilliseconds, 0, maxSettle);
                if (settleMs > 50)
                {
                    await _bridge.WaitForScreenUpdateAsync(session, startScreenVersion, TimeSpan.FromMilliseconds(settleMs), cancellationToken);
                }
            }

            if (requiresConfirmation)
            {
                var confirmMs = anySuccess ? Math.Clamp(body.ConfirmWaitMs ?? 4000, 0, 8000) : 0;
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

        [HttpPut("sessions/{sessionId}/screen")]
        [RequestSizeLimit(524288)]
        public IActionResult PutScreen(string sessionId, [FromBody] AiScreenPush? body)
        {
            if (!AiBridgeService.IsValidSessionId(sessionId)) return BadRequest(new Dictionary<string, object> { ["error"] = "Invalid session id." });
            if (body == null || body.Screen.ValueKind != JsonValueKind.Object)
                return BadRequest(new Dictionary<string, object> { ["error"] = "screen must be a JSON object." });

            var session = _bridge.GetOrCreate(sessionId);
            if (session == null) return StatusCode(429, new Dictionary<string, object> { ["error"] = "Too many open sessions." });

            _bridge.UpdateScreen(session, Trim(body.BedId, 64), Trim(body.DeviceId, 64), body.CallActive, body.Screen);
            return Ok(new Dictionary<string, object> { ["ok"] = true, ["screen_version"] = _bridge.GetScreenVersion(session) });
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
        public IActionResult PostConfirmation(string sessionId, [FromBody] AiConfirmationPost? body)
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
            catch (OperationCanceledException)
            {
            }
            finally
            {
                _bridge.Unsubscribe(session, subscription.Channel);
            }
        }

        private async Task WriteEvent(AiBridgeEvent evt, CancellationToken cancellationToken)
        {
            await Response.WriteAsync("id: " + evt.Id + "\nevent: " + evt.Type + "\ndata: " + evt.Json + "\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }

        private IActionResult? RequireApiKey()
        {
            var expected = _config["AiBridge:ApiKey"]?.Trim();
            if (string.IsNullOrWhiteSpace(expected))
            {
                if (_env.IsDevelopment()) return null;
                return StatusCode(503, new Dictionary<string, object> { ["error"] = "AiBridge:ApiKey is not configured on the server." });
            }

            if (!Request.Headers.TryGetValue("X-Api-Key", out var headerValues) || headerValues.Count == 0)
            {
                _logger.LogWarning("AiBridge: rejected request with missing X-Api-Key.");
                return Unauthorized(new Dictionary<string, object> { ["error"] = "Invalid or missing X-Api-Key." });
            }

            if (headerValues.Count > 1)
            {
                _logger.LogWarning("AiBridge: rejected request with multiple X-Api-Key headers ({Count}).", headerValues.Count);
                return Unauthorized(new Dictionary<string, object> { ["error"] = "Invalid or missing X-Api-Key." });
            }

            var supplied = headerValues[0]?.Trim() ?? "";
            var a = Encoding.UTF8.GetBytes(expected);
            var b = Encoding.UTF8.GetBytes(supplied);
            if (a.Length == b.Length && CryptographicOperations.FixedTimeEquals(a, b)) return null;

            _logger.LogWarning("AiBridge: rejected request with wrong X-Api-Key (expected len {ExpectedLen}, supplied len {SuppliedLen}).", a.Length, b.Length);
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
            {
                trimmed = trimmed.TrimEnd('/');
            }
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

        private static bool IsBlockedLabel(string? label)
        {
            return !string.IsNullOrWhiteSpace(label) && BlockedLabelRegex.IsMatch(label);
        }

        private static bool IsBlockedRoute(string? route)
        {
            return !string.IsNullOrWhiteSpace(route) && BlockedRouteRegex.IsMatch(route.Trim());
        }

        private static bool IsBlockedScreenAction(JsonElement a)
        {
            return IsBlockedLabel(ReadString(a, "label"))
                || IsBlockedRoute(ReadString(a, "route"))
                || BlockedHintRegex.IsMatch(ReadString(a, "id") + " " + ReadString(a, "action") + " " + ReadString(a, "targetId"));
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
            var allowed = name == "navigate" || AllowedActionPrefixes.Any(prefix => name.StartsWith(prefix, StringComparison.Ordinal));
            if (!allowed)
            {
                error = "action \"" + name + "\" is not allowed. Use navigate, ui.*, video.*, food.*, request.*, notification.* or feedback.*.";
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

            if (name == "ui.click" || name == "ui.fill" || name == "ui.set_choice")
            {
                isClick = name == "ui.click";
                var suppliedLabel = StringField(fields, "label");
                var targetId = StringField(fields, "targetId");

                if (targetId.Length == 0 && suppliedLabel.Length == 0)
                {
                    error = name + " needs \"targetId\" (the id of an entry from options) or a \"label\". Do not use \"path\" for clicks.";
                    return false;
                }
                if (name == "ui.fill" && !fields.ContainsKey("value"))
                {
                    error = "ui.fill needs a \"value\".";
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

                var found = false;
                if (targetId.Length > 0)
                {
                    foreach (var a in ArrayItems(currentScreen, "actions"))
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
                    foreach (var a in ArrayItems(currentScreen, "actions"))
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
                {
                    continue;
                }

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
                var targetId = ReadString(field, "targetId");
                if (targetId.Length == 0) continue;
                var label = CleanLabel(ReadString(field, "label"), 80);

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

            var room = Math.Max(limit - otherOptions.Count, 20);
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