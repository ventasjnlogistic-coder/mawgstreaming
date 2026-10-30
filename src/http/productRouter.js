const express = require("express");

function createProductRouter({
  sendPublicApiJson,
  readProductsWithStock,
  getCachedAdminProducts,
  requireRead,
  requirePermission,
  normalizeProduct,
  validateProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  clearPublicApiCache,
  logUnexpectedError,
}) {
  const router = express.Router();

  router.get("/productos", async (req, res) => {
    try {
      await sendPublicApiJson(req, res, "products-with-stock", readProductsWithStock);
    } catch (error) {
      logUnexpectedError(error);
      res.status(500).json({ error: "No se pudo cargar el catalogo." });
    }
  });

  router.get("/admin/productos", requireRead("products"), async (_req, res) => {
    try {
      const products = await getCachedAdminProducts();
      res.setHeader("Cache-Control", "no-store");
      res.json(
        [...products].sort((left, right) => {
          const leftOrder = Number.isFinite(Number(left.orden)) ? Number(left.orden) : 999;
          const rightOrder = Number.isFinite(Number(right.orden)) ? Number(right.orden) : 999;
          return leftOrder - rightOrder || String(left.nombre || "").localeCompare(String(right.nombre || ""));
        })
      );
    } catch (error) {
      logUnexpectedError(error);
      res.status(500).json({ error: "No se pudo cargar el catalogo." });
    }
  });

  router.post("/admin/productos", requirePermission("productos"), async (req, res) => {
    try {
      const product = normalizeProduct(req.body);
      const validationError = validateProduct(product);

      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      const saved = await createProduct(product);
      await clearPublicApiCache("products-with-stock");
      res.status(201).json(saved);
    } catch (error) {
      logUnexpectedError(error);
      res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo crear el producto." });
    }
  });

  router.put("/admin/productos/:id", requirePermission("productos"), async (req, res) => {
    try {
      const product = normalizeProduct({ ...req.body, id: req.body?.id || req.params.id });
      const validationError = validateProduct(product);

      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      const saved = await updateProduct(req.params.id, product);
      await clearPublicApiCache("products-with-stock");
      res.json(saved);
    } catch (error) {
      logUnexpectedError(error);
      res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo actualizar el producto." });
    }
  });

  router.delete("/admin/productos/:id", requirePermission("productos"), async (req, res) => {
    try {
      await deleteProduct(req.params.id);
      await clearPublicApiCache("products-with-stock");
      res.status(204).end();
    } catch (error) {
      logUnexpectedError(error);
      res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo eliminar el producto." });
    }
  });

  return router;
}

module.exports = { createProductRouter };
