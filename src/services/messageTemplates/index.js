const AppsScriptMessageTemplateStore = require("./appsScriptMessageTemplateStore");
const JsonMessageTemplateStore = require("./jsonMessageTemplateStore");

function hasAppsScriptConfig(env) {
  return Boolean(String(env.APPS_SCRIPT_CATALOG_URL || "").trim() && String(env.APPS_SCRIPT_ADMIN_TOKEN || "").trim());
}

function createMessageTemplateStore(env = process.env) {
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
