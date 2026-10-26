const AppsScriptUserStore = require("./appsScriptUserStore");
const JsonUserStore = require("./jsonUserStore");
const { enabled: d1Enabled, D1UserStore } = require("../d1/d1OperationalStores");

function hasAppsScriptConfig(env) {
  return Boolean(String(env.APPS_SCRIPT_CATALOG_URL || "").trim());
}

function createUserStore(env = process.env) {
  if (d1Enabled(env)) {
    return new D1UserStore(env.DB);
  }

  if (env.CATALOG_STORAGE === "apps-script" && hasAppsScriptConfig(env)) {
    return new AppsScriptUserStore({
      endpointUrl: String(env.APPS_SCRIPT_CATALOG_URL || "").trim(),
      adminToken: String(env.APPS_SCRIPT_ADMIN_TOKEN || "").trim(),
      timeoutMs: env.APPS_SCRIPT_TIMEOUT_MS,
    });
  }

  return new JsonUserStore({
    filePath: env.USERS_JSON_PATH || "usuarios-admin.json",
    defaultUser: {
      usuario: env.ADMIN_USER,
      nombre: "Administrador",
      rol: "admin",
      password: env.ADMIN_PASSWORD,
      estado: "activo",
      permisos: "*",
    },
  });
}

module.exports = {
  createUserStore,
};
