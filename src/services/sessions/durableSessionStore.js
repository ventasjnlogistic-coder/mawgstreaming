const session = require("express-session");
const { callSecurityState } = require("../security/client");
class DurableSessionStore extends session.Store {
  constructor({ namespace, ttlMs }) { super(); this.namespace = namespace; this.ttlMs = ttlMs; }
  call(id, method, data) { return callSecurityState(this.namespace, `session:${id}`, "/session", method, data); }
  get(id, callback) { this.call(id, "GET").then((value) => callback(null, value)).catch(callback); }
  set(id, value, callback) { this.write(id, value, false, callback); }
  touch(id, value, callback) { this.write(id, value, true, callback); }
  write(id, value, touch, callback) {
    const expiresAt = value.cookie?.expires ? new Date(value.cookie.expires).getTime() : Date.now() + this.ttlMs;
    this.call(id, "POST", { session: value, expiresAt, touch }).then(() => callback?.(null)).catch((error) => callback?.(error));
  }
  destroy(id, callback) { this.call(id, "DELETE").then(() => callback?.(null)).catch((error) => callback?.(error)); }
}
module.exports = DurableSessionStore;
