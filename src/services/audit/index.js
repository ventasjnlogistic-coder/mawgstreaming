const DurableAuditStore = require("./durableAuditStore");
const JsonAuditStore = require("./jsonAuditStore");
const { enabled: d1Enabled, D1AuditStore } = require("../d1/d1OperationalStores");

function createAuditStore(env = process.env, securityNamespace = env.SECURITY_STATE) {
  if (d1Enabled(env)) {
    return new D1AuditStore(env.DB);
  }

  if (securityNamespace) return new DurableAuditStore(securityNamespace);

  return new JsonAuditStore(env.AUDIT_LOG_JSON_PATH || "auditoria.json");
}

module.exports = {
  createAuditStore,
};
