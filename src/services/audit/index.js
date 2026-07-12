const JsonAuditStore = require("./jsonAuditStore");

function createAuditStore(env = process.env) {
  return new JsonAuditStore(env.AUDIT_LOG_JSON_PATH || "auditoria.json");
}

module.exports = {
  createAuditStore,
};
