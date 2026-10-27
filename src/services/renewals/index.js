const JsonRenewalStore = require("./jsonRenewalStore");
const AppsScriptRenewalStore = require("./appsScriptRenewalStore");
const { enabled: d1Enabled, D1RenewalStore } = require("../d1/d1OperationalStores");

function hasAppsScriptConfig(env) {
  return Boolean(String(env.APPS_SCRIPT_CATALOG_URL || "").trim() && String(env.APPS_SCRIPT_ADMIN_TOKEN || "").trim());
}

function createRenewalStore(env = process.env) {
  if (d1Enabled(env)) return new D1RenewalStore(env.DB);
  const jsonStore = new JsonRenewalStore(env.RENEWALS_JSON_PATH || "renovaciones.json");

  if (env.RENEWALS_STORAGE === "json") {
    return jsonStore;
  }

  if (env.CATALOG_STORAGE === "apps-script") {
    if (!hasAppsScriptConfig(env)) {
      throw new Error("Falta configurar Apps Script para renovaciones; no se utilizara almacenamiento local.");
    } else {
      return new AppsScriptRenewalStore({
        endpointUrl: String(env.APPS_SCRIPT_CATALOG_URL || "").trim(),
        adminToken: String(env.APPS_SCRIPT_ADMIN_TOKEN || "").trim(),
        timeoutMs: env.APPS_SCRIPT_TIMEOUT_MS,
        operationTimeoutMs: env.APPS_SCRIPT_OPERATION_TIMEOUT_MS,
        proofDriveFolderId: String(env.APPS_SCRIPT_PROOF_DRIVE_FOLDER_ID || "").trim(),

      });
    }
  }

  return jsonStore;
}

module.exports = {
  createRenewalStore,
};
