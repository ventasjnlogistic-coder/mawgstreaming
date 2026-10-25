const AppsScriptMessageTemplateStore = require("./appsScriptMessageTemplateStore");
const JsonMessageTemplateStore = require("./jsonMessageTemplateStore");
const { enabled: d1Enabled, D1TemplateStore } = require("../d1/d1OperationalStores");

function hasAppsScriptConfig(env) {
  return Boolean(String(env.APPS_SCRIPT_CATALOG_URL || "").trim() && String(env.APPS_SCRIPT_ADMIN_TOKEN || "").trim());
}

function createMessageTemplateStore(env = process.env) {
  if (d1Enabled(env)) return new D1TemplateStore(env.DB);
  if (env.CATALOG_STORAGE === "apps-script" && hasAppsScriptConfig(env)) {
    return new AppsScriptMessageTemplateStore({
      endpointUrl: String(env.APPS_SCRIPT_CATALOG_URL || "").trim(),
      adminToken: String(env.APPS_SCRIPT_ADMIN_TOKEN || "").trim(),
      timeoutMs: env.APPS_SCRIPT_TIMEOUT_MS,
    });
  }

  return new JsonMessageTemplateStore(env.MESSAGE_TEMPLATES_JSON_PATH || "plantillas-mensajes.json");
}

module.exports = {
  createMessageTemplateStore,
};
