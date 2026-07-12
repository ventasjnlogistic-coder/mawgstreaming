const JsonCatalogStore = require("./jsonCatalogStore");
const GoogleSheetsCatalogStore = require("./googleSheetsCatalogStore");
const AppsScriptCatalogStore = require("./appsScriptCatalogStore");

function hasAppsScriptConfig(env) {
  return Boolean(String(env.APPS_SCRIPT_CATALOG_URL || "").trim() && String(env.APPS_SCRIPT_ADMIN_TOKEN || "").trim());
}

function hasSheetsConfig(env) {
  return Boolean(
    env.GOOGLE_SHEETS_SPREADSHEET_ID &&
      env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      env.GOOGLE_PRIVATE_KEY
  );
}

function createCatalogStore(env = process.env) {
  if (env.CATALOG_STORAGE === "apps-script") {
    if (!hasAppsScriptConfig(env)) {
      console.warn(
        "CATALOG_STORAGE=apps-script sin APPS_SCRIPT_CATALOG_URL o APPS_SCRIPT_ADMIN_TOKEN. Se usara productos.json como respaldo local."
      );
    } else {
      return new AppsScriptCatalogStore({
        endpointUrl: String(env.APPS_SCRIPT_CATALOG_URL || "").trim(),
        adminToken: String(env.APPS_SCRIPT_ADMIN_TOKEN || "").trim(),
        timeoutMs: env.APPS_SCRIPT_TIMEOUT_MS,
      });
    }
  }

  if (env.CATALOG_STORAGE === "sheets") {
    if (!hasSheetsConfig(env)) {
      console.warn(
        "CATALOG_STORAGE=sheets sin credenciales completas. Se usara productos.json como respaldo local."
      );
    } else {
      return new GoogleSheetsCatalogStore({
        spreadsheetId: env.GOOGLE_SHEETS_SPREADSHEET_ID,
        range: env.GOOGLE_SHEETS_RANGE,
        clientEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        privateKey: env.GOOGLE_PRIVATE_KEY,
      });
    }
  }

  return new JsonCatalogStore(env.CATALOG_JSON_PATH || "productos.json");
}

module.exports = {
  createCatalogStore,
};
