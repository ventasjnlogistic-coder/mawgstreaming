const { callSecurityState } = require("./client");
function createRateLimiter({ scope, windowMs, max, message, namespace, workerRuntime = false, clock = Date.now }) {
  const attempts = new Map();
  return async (req, res, next) => {
    try {
      // CF-Connecting-IP solo es confiable dentro de Workers, donde lo fija Cloudflare.
      const ip = workerRuntime ? req.headers["cf-connecting-ip"] || req.ip : req.ip || req.socket?.remoteAddress || "unknown";
      let result;
      if (namespace) {
        result = await callSecurityState(namespace, `limit:${scope}:${ip}`, "/limit", "POST", { windowMs, max });
      } else {
        if (workerRuntime) throw new Error("Falta el binding SECURITY_STATE.");
        const now = clock();
        for (const [key, value] of attempts) if (value.resetAt <= now) attempts.delete(key);
        if (!attempts.has(ip)) {
          if (attempts.size >= 10000) { res.status(503).json({ error: "Intenta nuevamente en unos minutos." }); return; }
          attempts.set(ip, { count: 0, resetAt: now + windowMs });
        }
        const current = attempts.get(ip);
        result = { allowed: current.count < max, resetAt: current.resetAt };
        if (result.allowed) current.count += 1;
      }
      if (!result.allowed) {
        res.setHeader("Retry-After", String(Math.max(1, Math.ceil((result.resetAt - clock()) / 1000))));
        res.status(429).json({ error: message });
        return;
      }
      next();
    } catch (error) { next(error); }
  };
}
module.exports = { createRateLimiter };
