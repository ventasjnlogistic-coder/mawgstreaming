const crypto = require("node:crypto");

const LATENCY_BUCKETS = [
  { limit: 100, label: "le_100_ms" },
  { limit: 500, label: "le_500_ms" },
  { limit: 1000, label: "le_1000_ms" },
  { limit: 5000, label: "le_5000_ms" },
  { limit: Infinity, label: "gt_5000_ms" },
];

function createRequestMonitoring({ slowRequestMs = 1000, logger = console, clock = Date.now } = {}) {
  const metrics = {
    startedAt: new Date(clock()).toISOString(),
    totalRequests: 0,
    inFlight: 0,
    abortedRequests: 0,
    serverErrors: 0,
    slowRequests: 0,
    statusClasses: { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 },
    latencyBuckets: Object.fromEntries(LATENCY_BUCKETS.map(({ label }) => [label, 0])),
    lastServerErrorAt: null,
    lastSlowRequestAt: null,
  };

  function middleware(req, res, next) {
    const requestId = crypto.randomUUID();
    const startedAt = clock();
    let completed = false;

    res.setHeader("X-Request-Id", requestId);
    metrics.inFlight += 1;

    function finishRequest(aborted = false) {
      if (completed) return;
      completed = true;

      const durationMs = Math.max(0, clock() - startedAt);
      const statusCode = aborted ? 499 : res.statusCode;
      const statusClass = `${Math.floor(statusCode / 100)}xx`;
      metrics.totalRequests += 1;
      metrics.inFlight = Math.max(0, metrics.inFlight - 1);
      if (aborted) metrics.abortedRequests += 1;
      metrics.statusClasses[statusClass] = (metrics.statusClasses[statusClass] || 0) + 1;
      const bucket = LATENCY_BUCKETS.find(({ limit }) => durationMs <= limit);
      metrics.latencyBuckets[bucket.label] += 1;

      const isServerError = statusCode >= 500;
      const isSlow = durationMs >= slowRequestMs;
      if (isServerError) {
        metrics.serverErrors += 1;
        metrics.lastServerErrorAt = new Date(clock()).toISOString();
      }
      if (isSlow) {
        metrics.slowRequests += 1;
        metrics.lastSlowRequestAt = new Date(clock()).toISOString();
      }

      if (isServerError || isSlow) {
        const event = {
          event: isServerError ? "http_server_error" : "http_slow_request",
          request_id: requestId,
          method: req.method,
          status: statusCode,
          duration_ms: durationMs,
        };
        const writeLog = isServerError ? logger.error : logger.warn;
        if (typeof writeLog === "function") writeLog.call(logger, JSON.stringify(event));
      }
    }

    res.once("finish", () => finishRequest());
    res.once("close", () => {
      if (!res.writableFinished) finishRequest(true);
    });

    next();
  }

  function snapshot() {
    return {
      ...metrics,
      statusClasses: { ...metrics.statusClasses },
      latencyBuckets: { ...metrics.latencyBuckets },
    };
  }

  return { middleware, snapshot };
}

module.exports = { createRequestMonitoring };
