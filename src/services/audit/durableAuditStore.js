const { callSecurityState } = require("../security/client");
class DurableAuditStore {
  constructor(namespace) { this.namespace = namespace; }
  async listEvents({ limit = 100 } = {}) {
    const data = await callSecurityState(this.namespace, "audit", `/audit?limit=${Math.min(300, Math.max(1, Number(limit) || 100))}`);
    return data.events;
  }
  async appendEvent(event) {
    await callSecurityState(this.namespace, "audit", "/audit", "POST", { event });
    return event;
  }
}
module.exports = DurableAuditStore;
