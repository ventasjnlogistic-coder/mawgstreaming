const session = require("express-session");

class KvSessionStore extends session.Store {
  constructor(options = {}) {
    super();
    this.kv = options.kv;
    this.ttlMs = Number(options.ttlMs || 1000 * 60 * 60 * 8);

    if (!this.kv) {
      throw new Error("La vinculacion KV de sesiones no esta configurada.");
    }
  }

  get(sessionId, callback) {
    this.kv
      .get(`session:${sessionId}`, "json")
      .then((value) => callback(null, value || null))
      .catch((error) => callback(error));
  }

  set(sessionId, sessionData, callback) {
    const expiresAt = sessionData.cookie?.expires
      ? new Date(sessionData.cookie.expires).getTime()
      : Date.now() + this.ttlMs;
    const expirationTtl = Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000));

    this.kv
      .put(`session:${sessionId}`, JSON.stringify(sessionData), { expirationTtl })
      .then(() => callback?.(null))
      .catch((error) => callback?.(error));
  }

  destroy(sessionId, callback) {
    this.kv
      .delete(`session:${sessionId}`)
      .then(() => callback?.(null))
      .catch((error) => callback?.(error));
  }

  touch(sessionId, sessionData, callback) {
    this.set(sessionId, sessionData, callback);
  }
}

module.exports = KvSessionStore;
