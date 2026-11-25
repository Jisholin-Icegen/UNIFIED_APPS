using System.Collections.Concurrent;
using System.Text.Json;
using System.Threading.Channels;

namespace Dial50_MVC_Core.Services
{
    public sealed class AiBridgeEvent
    {
        public long Id { get; init; }
        public string Type { get; init; } = "action";
        public string Json { get; init; } = "{}";
        public DateTime AtUtc { get; init; } = DateTime.UtcNow;
    }

    public sealed class AiBridgeResult
    {
        public long Seq { get; init; }
        public string? RequestId { get; init; }
        public string? Action { get; init; }
        public bool Success { get; init; }
        public string? Error { get; init; }
        public string? ResultJson { get; init; }
        public DateTime AtUtc { get; init; } = DateTime.UtcNow;
    }

    public sealed class AiBridgeConfirmation
    {
        public long Seq { get; init; }
        public string Source { get; init; } = "";
        public string Path { get; init; } = "";
        public string Status { get; init; } = "";
        public string OrderId { get; init; } = "";
        public string Message { get; init; } = "";
        public string? DetailJson { get; init; }
        public DateTime AtUtc { get; init; } = DateTime.UtcNow;
    }

    internal sealed class PendingResultWaiter
    {
        public long SinceSeq { get; init; }
        public HashSet<string> ExpectedRequestIds { get; init; } = new(StringComparer.Ordinal);
        public TaskCompletionSource<bool> Completion { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
    }

    internal sealed class PendingScreenWaiter
    {
        public long AfterVersion { get; init; }
        public string? AfterSignature { get; init; }
        public string? AfterRoute { get; init; }
        public TaskCompletionSource<long> Completion { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
    }

    internal sealed class PendingConfirmWaiter
    {
        public long SinceSeq { get; init; }
        public TaskCompletionSource<bool> Completion { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
    }

    public sealed class AiBridgeSession
    {
        public string SessionId { get; init; } = "";
        public string BedId { get; set; } = "";
        public string DeviceId { get; set; } = "";
        public string Route { get; set; } = "";
        public string Title { get; set; } = "";
        public bool CallActive { get; set; }
        public string ScreenJson { get; set; } = "{}";
        public string ScreenSignature { get; set; } = "";
        public long ScreenVersion { get; set; }
        public DateTime CreatedUtc { get; init; } = DateTime.UtcNow;
        public DateTime LastSeenUtc { get; set; } = DateTime.UtcNow;
        public DateTime ScreenUpdatedUtc { get; set; }

        internal long NextEventId;
        internal long NextResultSeq;
        internal long NextConfirmSeq;
        internal readonly LinkedList<AiBridgeEvent> Backlog = new();
        internal readonly LinkedList<AiBridgeResult> Results = new();
        internal readonly LinkedList<AiBridgeConfirmation> Confirmations = new();
        internal readonly List<Channel<AiBridgeEvent>> Subscribers = new();
        internal readonly List<PendingResultWaiter> ResultWaiters = new();
        internal readonly List<PendingScreenWaiter> ScreenWaiters = new();
        internal readonly List<PendingConfirmWaiter> ConfirmWaiters = new();
        internal readonly object Gate = new();

        public int SubscriberCount
        {
            get { lock (Gate) { return Subscribers.Count; } }
        }

        public long LastResultSeq
        {
            get { lock (Gate) { return NextResultSeq; } }
        }

        public long LastConfirmSeq
        {
            get { lock (Gate) { return NextConfirmSeq; } }
        }
    }

    public sealed class AiBridgeService
    {
        private const int MaxSessions = 2000;
        private const int MaxBacklog = 100;
        private const int MaxResults = 200;
        private const int MaxConfirmations = 100;
        private static readonly TimeSpan IdleExpiry = TimeSpan.FromHours(6);
        private static readonly TimeSpan ReplayWindow = TimeSpan.FromSeconds(10);

        private readonly ConcurrentDictionary<string, AiBridgeSession> _sessions = new();
        private DateTime _lastCleanupUtc = DateTime.UtcNow;

        public static bool IsValidSessionId(string? id)
        {
            if (string.IsNullOrEmpty(id) || id.Length < 16 || id.Length > 64) return false;
            foreach (var c in id)
            {
                if (!(char.IsAsciiLetterOrDigit(c) || c == '-' || c == '_')) return false;
            }
            return true;
        }

        public AiBridgeSession? Find(string sessionId)
        {
            return _sessions.TryGetValue(sessionId, out var session) ? session : null;
        }

        public AiBridgeSession? GetOrCreate(string sessionId)
        {
            Cleanup();
            if (_sessions.TryGetValue(sessionId, out var existing)) return existing;
            if (_sessions.Count >= MaxSessions) return null;
            return _sessions.GetOrAdd(sessionId, id => new AiBridgeSession { SessionId = id });
        }

        public List<AiBridgeSession> List(string? bedId)
        {
            return _sessions.Values
                .Where(s => string.IsNullOrWhiteSpace(bedId) || s.BedId == bedId)
                .OrderByDescending(s => s.LastSeenUtc)
                .ToList();
        }

        public (long ResultSeq, long ScreenVersion, long ConfirmSeq) GetWatermarks(AiBridgeSession session)
        {
            lock (session.Gate)
            {
                return (session.NextResultSeq, session.ScreenVersion, session.NextConfirmSeq);
            }
        }

        public long GetScreenVersion(AiBridgeSession session)
        {
            lock (session.Gate)
            {
                return session.ScreenVersion;
            }
        }

        public (string ScreenJson, long Version, DateTime Updated) GetSnapshot(AiBridgeSession session)
        {
            lock (session.Gate)
            {
                return (session.ScreenJson, session.ScreenVersion, session.ScreenUpdatedUtc);
            }
        }

        public void UpdateScreen(AiBridgeSession session, string bedId, string deviceId, bool callActive, JsonElement screen)
        {
            List<PendingScreenWaiter>? readyWaiters = null;
            long version;
            var raw = screen.GetRawText();
            var route = ReadString(screen, "route");
            var title = ReadString(screen, "title");

            lock (session.Gate)
            {
                if (!string.IsNullOrWhiteSpace(bedId)) session.BedId = bedId;
                if (!string.IsNullOrWhiteSpace(deviceId)) session.DeviceId = deviceId;
                session.CallActive = callActive;
                session.LastSeenUtc = DateTime.UtcNow;

                var changed = !string.Equals(session.ScreenJson, raw, StringComparison.Ordinal)
                              || !string.Equals(session.Route, route, StringComparison.OrdinalIgnoreCase);

                if (!changed && session.ScreenVersion > 0)
                {
                    version = session.ScreenVersion;
                    return;
                }

                session.ScreenJson = raw;
                session.ScreenSignature = raw;
                session.Route = route;
                session.Title = title;
                session.ScreenVersion++;
                version = session.ScreenVersion;
                session.ScreenUpdatedUtc = DateTime.UtcNow;

                for (var i = session.ScreenWaiters.Count - 1; i >= 0; i--)
                {
                    var waiter = session.ScreenWaiters[i];
                    if (version > waiter.AfterVersion)
                    {
                        readyWaiters ??= new List<PendingScreenWaiter>();
                        readyWaiters.Add(waiter);
                        session.ScreenWaiters.RemoveAt(i);
                    }
                }
            }

            if (readyWaiters != null)
            {
                foreach (var waiter in readyWaiters)
                {
                    waiter.Completion.TrySetResult(version);
                }
            }
        }

        public int Publish(AiBridgeSession session, string type, string json)
        {
            lock (session.Gate)
            {
                var evt = new AiBridgeEvent { Id = ++session.NextEventId, Type = type, Json = json };
                session.Backlog.AddLast(evt);
                while (session.Backlog.Count > MaxBacklog) session.Backlog.RemoveFirst();
                foreach (var channel in session.Subscribers) channel.Writer.TryWrite(evt);
                return session.Subscribers.Count;
            }
        }

        public (Channel<AiBridgeEvent> Channel, List<AiBridgeEvent> Replay) Subscribe(AiBridgeSession session, long lastEventId)
        {
            var channel = Channel.CreateUnbounded<AiBridgeEvent>(new UnboundedChannelOptions { SingleReader = true });
            var replay = new List<AiBridgeEvent>();
            lock (session.Gate)
            {
                session.Subscribers.Add(channel);
                session.LastSeenUtc = DateTime.UtcNow;
                if (lastEventId > 0)
                {
                    var cutoff = DateTime.UtcNow - ReplayWindow;
                    replay = session.Backlog.Where(e => e.Id > lastEventId && e.AtUtc >= cutoff).ToList();
                }
            }
            return (channel, replay);
        }

        public void Unsubscribe(AiBridgeSession session, Channel<AiBridgeEvent> channel)
        {
            lock (session.Gate)
            {
                session.Subscribers.Remove(channel);
                session.LastSeenUtc = DateTime.UtcNow;
            }
            channel.Writer.TryComplete();
        }

        public void AddResult(AiBridgeSession session, string? requestId, string? action, bool success, string? error, string? resultJson)
        {
            List<PendingResultWaiter>? readyWaiters = null;

            lock (session.Gate)
            {
                session.Results.AddLast(new AiBridgeResult
                {
                    Seq = ++session.NextResultSeq,
                    RequestId = requestId,
                    Action = action,
                    Success = success,
                    Error = error,
                    ResultJson = resultJson
                });
                while (session.Results.Count > MaxResults) session.Results.RemoveFirst();
                session.LastSeenUtc = DateTime.UtcNow;

                if (session.ResultWaiters.Count > 0)
                {
                    for (var i = session.ResultWaiters.Count - 1; i >= 0; i--)
                    {
                        var waiter = session.ResultWaiters[i];
                        if (AreAllResultsPresentLocked(session, waiter.SinceSeq, waiter.ExpectedRequestIds))
                        {
                            readyWaiters ??= new List<PendingResultWaiter>();
                            readyWaiters.Add(waiter);
                            session.ResultWaiters.RemoveAt(i);
                        }
                    }
                }
            }

            if (readyWaiters != null)
            {
                foreach (var waiter in readyWaiters)
                {
                    waiter.Completion.TrySetResult(true);
                }
            }
        }

        public List<AiBridgeResult> GetResults(AiBridgeSession session, long after)
        {
            lock (session.Gate)
            {
                return session.Results.Where(r => r.Seq > after).ToList();
            }
        }

        public void AddConfirmation(AiBridgeSession session, string? source, string? path, string? status, string? orderId, string? message, string? detailJson)
        {
            List<PendingConfirmWaiter>? ready = null;
            long seq;

            lock (session.Gate)
            {
                seq = ++session.NextConfirmSeq;
                session.Confirmations.AddLast(new AiBridgeConfirmation
                {
                    Seq = seq,
                    Source = source ?? "",
                    Path = path ?? "",
                    Status = status ?? "",
                    OrderId = orderId ?? "",
                    Message = message ?? "",
                    DetailJson = detailJson
                });
                while (session.Confirmations.Count > MaxConfirmations) session.Confirmations.RemoveFirst();
                session.LastSeenUtc = DateTime.UtcNow;

                for (var i = session.ConfirmWaiters.Count - 1; i >= 0; i--)
                {
                    var waiter = session.ConfirmWaiters[i];
                    if (waiter.SinceSeq < seq)
                    {
                        ready ??= new List<PendingConfirmWaiter>();
                        ready.Add(waiter);
                        session.ConfirmWaiters.RemoveAt(i);
                    }
                }
            }

            if (ready != null)
            {
                foreach (var waiter in ready) waiter.Completion.TrySetResult(true);
            }
        }

        public List<AiBridgeConfirmation> GetConfirmations(AiBridgeSession session, long after)
        {
            lock (session.Gate)
            {
                return session.Confirmations.Where(c => c.Seq > after).ToList();
            }
        }

        public async Task<(List<AiBridgeConfirmation> Items, bool Confirmed)> WaitForConfirmationAsync(
            AiBridgeSession session,
            long sinceSeq,
            TimeSpan timeout,
            CancellationToken cancellationToken)
        {
            var waiter = new PendingConfirmWaiter { SinceSeq = sinceSeq };

            lock (session.Gate)
            {
                var existing = session.Confirmations.Where(c => c.Seq > sinceSeq).ToList();
                if (existing.Count > 0) return (existing, true);
                if (timeout <= TimeSpan.Zero) return (existing, false);
                session.ConfirmWaiters.Add(waiter);
            }

            try
            {
                using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                timeoutCts.CancelAfter(timeout);
                using var reg = timeoutCts.Token.Register(() => waiter.Completion.TrySetResult(false));
                await waiter.Completion.Task.ConfigureAwait(false);
            }
            finally
            {
                lock (session.Gate)
                {
                    session.ConfirmWaiters.Remove(waiter);
                }
            }

            lock (session.Gate)
            {
                var items = session.Confirmations.Where(c => c.Seq > sinceSeq).ToList();
                return (items, items.Count > 0);
            }
        }

        public async Task<(List<AiBridgeResult> Results, bool Completed)> WaitForResultsAsync(
            AiBridgeSession session,
            long sinceSeq,
            IReadOnlyCollection<string> expectedRequestIds,
            TimeSpan timeout,
            CancellationToken cancellationToken)
        {
            if (expectedRequestIds.Count == 0)
            {
                return (new List<AiBridgeResult>(), true);
            }

            var expectedSet = new HashSet<string>(expectedRequestIds, StringComparer.Ordinal);
            var waiter = new PendingResultWaiter
            {
                SinceSeq = sinceSeq,
                ExpectedRequestIds = expectedSet
            };

            lock (session.Gate)
            {
                if (AreAllResultsPresentLocked(session, sinceSeq, expectedSet))
                {
                    return (CollectMatchingResultsLocked(session, sinceSeq, expectedSet), true);
                }

                if (timeout <= TimeSpan.Zero)
                {
                    return (CollectMatchingResultsLocked(session, sinceSeq, expectedSet), false);
                }

                session.ResultWaiters.Add(waiter);
            }

            var completed = false;
            try
            {
                using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                timeoutCts.CancelAfter(timeout);
                using var reg = timeoutCts.Token.Register(() => waiter.Completion.TrySetResult(false));
                completed = await waiter.Completion.Task.ConfigureAwait(false);
            }
            finally
            {
                lock (session.Gate)
                {
                    session.ResultWaiters.Remove(waiter);
                }
            }

            lock (session.Gate)
            {
                var matched = CollectMatchingResultsLocked(session, sinceSeq, expectedSet);
                return (matched, completed || matched.Count >= expectedSet.Count);
            }
        }

        public async Task<bool> WaitForScreenUpdateAsync(
            AiBridgeSession session,
            long afterVersion,
            TimeSpan timeout,
            CancellationToken cancellationToken)
        {
            if (timeout <= TimeSpan.Zero) return false;

            var waiter = new PendingScreenWaiter { AfterVersion = afterVersion };
            lock (session.Gate)
            {
                if (session.ScreenVersion > afterVersion) return true;
                session.ScreenWaiters.Add(waiter);
            }

            try
            {
                using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                timeoutCts.CancelAfter(timeout);
                using var reg = timeoutCts.Token.Register(() => waiter.Completion.TrySetCanceled(timeoutCts.Token));
                await waiter.Completion.Task.ConfigureAwait(false);
                return true;
            }
            catch (OperationCanceledException)
            {
                return false;
            }
            finally
            {
                lock (session.Gate)
                {
                    session.ScreenWaiters.Remove(waiter);
                }
            }
        }

        public void Touch(AiBridgeSession session)
        {
            lock (session.Gate) { session.LastSeenUtc = DateTime.UtcNow; }
        }

        private static bool AreAllResultsPresentLocked(AiBridgeSession session, long sinceSeq, HashSet<string> expectedRequestIds)
        {
            var matchedIds = new HashSet<string>(StringComparer.Ordinal);
            foreach (var r in session.Results)
            {
                if (r.Seq > sinceSeq && !string.IsNullOrEmpty(r.RequestId) && expectedRequestIds.Contains(r.RequestId))
                {
                    if (matchedIds.Add(r.RequestId) && matchedIds.Count >= expectedRequestIds.Count) return true;
                }
            }
            return false;
        }

        private static List<AiBridgeResult> CollectMatchingResultsLocked(AiBridgeSession session, long sinceSeq, HashSet<string> expectedRequestIds)
        {
            return session.Results
                .Where(r => r.Seq > sinceSeq && !string.IsNullOrEmpty(r.RequestId) && expectedRequestIds.Contains(r.RequestId))
                .ToList();
        }

        private void Cleanup()
        {
            var now = DateTime.UtcNow;
            if (now - _lastCleanupUtc < TimeSpan.FromMinutes(1)) return;
            _lastCleanupUtc = now;
            var cutoff = now - IdleExpiry;
            foreach (var pair in _sessions)
            {
                if (pair.Value.LastSeenUtc < cutoff && pair.Value.SubscriberCount == 0)
                {
                    _sessions.TryRemove(pair.Key, out _);
                }
            }
        }

        private static string ReadString(JsonElement element, string name)
        {
            if (element.ValueKind == JsonValueKind.Object
                && element.TryGetProperty(name, out var value)
                && value.ValueKind == JsonValueKind.String)
            {
                return value.GetString() ?? "";
            }
            return "";
        }
    }
}