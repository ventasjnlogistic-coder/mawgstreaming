const express = require("express");

function createHealthRouter({
  monitoring,
  runtime,
  requireAdmin,
  checkReadiness,
  readProductsWithStock,
  userStore,
  maskValue,
  logUnexpectedError,
}) {
  const router = express.Router();

  router.get("/live", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true });
  });

  router.get("/ready", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      await checkReadiness();
      res.json({ ok: true });
    } catch (error) {
      logUnexpectedError(error);
      res.status(503).json({ ok: false, error: "El servicio no esta listo." });
    }
  });

  router.get("/metrics", requireAdmin, (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(monitoring.snapshot());
  });

  router.get("/productos", async (_req, res) => {
    try {
      const products = await readProductsWithStock();
      res.json({
        ok: true,
        count: products.length,
        sample: products.slice(0, 3).map((product) => ({
          id: product.id,
          nombre: product.nombre,
          estado: product.estado,
          stock_disponible: product.stock_disponible,
        })),
      });
    } catch (error) {
      logUnexpectedError(error);
      res.status(error.statusCode || 500).json({
        ok: false,
        error: error.message || "No se pudo cargar el catalogo.",
        name: error.name || "",
        statusCode: error.statusCode || 500,
      });
    }
  });

  router.get("/config", requireAdmin, (_req, res) => {
    const appsScriptUrl = String(runtime.APPS_SCRIPT_CATALOG_URL || "").trim();
    const adminToken = String(runtime.APPS_SCRIPT_ADMIN_TOKEN || "").trim();

    res.json({
      ok: true,
      runtime: {
        node_env: runtime.NODE_ENV || "",
        host: runtime.HOST || "",
        port: runtime.PORT || "",
        catalog_storage: runtime.CATALOG_STORAGE || "",
        operations_storage: runtime.OPERATIONS_STORAGE || "",
      },
      apps_script: {
        configured: Boolean(appsScriptUrl && adminToken),
        url_present: Boolean(appsScriptUrl),
        token_present: Boolean(adminToken),
        url_hint: maskValue(appsScriptUrl),
      },
    });
  });

  router.get("/users", requireAdmin, async (_req, res) => {
    try {
      const user = await userStore.authenticate("__healthcheck__", "__healthcheck__");
      res.json({
        ok: true,
        reachable: true,
        unexpected_match: Boolean(user),
      });
    } catch (error) {
      const message = String(error.message || "");
      const invalidCredentials = message.toLowerCase().includes("usuario") || message.toLowerCase().includes("contrasena");

      res.status(invalidCredentials ? 200 : error.statusCode || 500).json({
        ok: invalidCredentials,
        reachable: invalidCredentials,
        message: invalidCredentials ? "UsuariosAdmin responde correctamente." : "",
        error: invalidCredentials ? "" : message,
        name: error.name || "",
      });
    }
  });

  return router;
}

module.exports = { createHealthRouter };
