const AppsScriptPaymentMethodStore = require("./appsScriptPaymentMethodStore");
const { getDefaultPaymentMethods } = require("./validation");
const { enabled: d1Enabled, D1PaymentMethodStore } = require("../d1/d1OperationalStores");

function hasAppsScriptConfig(env) {
  return Boolean(String(env.APPS_SCRIPT_CATALOG_URL || "").trim() && String(env.APPS_SCRIPT_ADMIN_TOKEN || "").trim());
}

function createPaymentMethodStore(env = process.env) {
  if (d1Enabled(env)) return new D1PaymentMethodStore(env.DB);
  if (env.CATALOG_STORAGE === "apps-script" && hasAppsScriptConfig(env)) {
    return new AppsScriptPaymentMethodStore({
      endpointUrl: String(env.APPS_SCRIPT_CATALOG_URL || "").trim(),
      adminToken: String(env.APPS_SCRIPT_ADMIN_TOKEN || "").trim(),
      timeoutMs: env.APPS_SCRIPT_TIMEOUT_MS,
    });
  }

  return {
    async listMethods() {
      return getDefaultPaymentMethods();
    },
  };
}

module.exports = {
  createPaymentMethodStore,
};
