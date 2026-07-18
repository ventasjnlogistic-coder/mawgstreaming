const AppsScriptSiteSettingStore = require("./appsScriptSiteSettingStore");
const JsonSiteSettingStore = require("./jsonSiteSettingStore");

function hasAppsScriptConfig(env) {
  return Boolean(String(env.APPS_SCRIPT_CATALOG_URL || "").trim() && String(env.APPS_SCRIPT_ADMIN_TOKEN || "").trim());
}

function createSiteSettingStore(env = process.env) {
  if (env.CATALOG_STORAGE === "apps-script" && hasAppsScriptConfig(env)) {
    return new AppsScriptSiteSettingStore({
      endpointUrl: String(env.APPS_SCRIPT_CATALOG_URL || "").trim(),
      adminToken: String(env.APPS_SCRIPT_ADMIN_TOKEN || "").trim(),
      timeoutMs: env.APPS_SCRIPT_TIMEOUT_MS,
    });
  }

  return new JsonSiteSettingStore(env.SITE_SETTINGS_JSON_PATH || "configuracion-sitio.json");
}

module.exports = {
  createSiteSettingStore,
};
