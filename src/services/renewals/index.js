const JsonRenewalStore = require("./jsonRenewalStore");
const AppsScriptRenewalStore = require("./appsScriptRenewalStore");

function hasAppsScriptConfig(env) {
  return Boolean(String(env.APPS_SCRIPT_CATALOG_URL || "").trim() && String(env.APPS_SCRIPT_ADMIN_TOKEN || "").trim());
}

function createRenewalStore(env = process.env) {
  const jsonStore = new JsonRenewalStore(env.RENEWALS_JSON_PATH || "renovaciones.json");

  if (env.RENEWALS_STORAGE === "json") {
    return jsonStore;
  }

  if (env.CATALOG_STORAGE === "apps-script") {
    if (!hasAppsScriptConfig(env)) {
      console.warn(
        "CATALOG_STORAGE=apps-script sin APPS_SCRIPT_CATALOG_URL o APPS_SCRIPT_ADMIN_TOKEN. Las renovaciones se guardaran en renovaciones.json."
      );
    } else {
      return new AppsScriptRenewalStore({
        endpointUrl: String(env.APPS_SCRIPT_CATALOG_URL || "").trim(),
        adminToken: String(env.APPS_SCRIPT_ADMIN_TOKEN || "").trim(),
        timeoutMs: env.APPS_SCRIPT_TIMEOUT_MS,
        proofDriveFolderId: String(env.APPS_SCRIPT_PROOF_DRIVE_FOLDER_ID || "").trim(),
        fallbackStore: jsonStore,
      });
    }
  }

  return jsonStore;
}

module.exports = {
  createRenewalStore,
};
