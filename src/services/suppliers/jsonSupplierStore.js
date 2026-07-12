const fs = require("node:fs/promises");
const path = require("node:path");

class JsonSupplierStore {
  constructor(config = {}) {
    this.providersPath = path.resolve(config.providersPath || "proveedores.json");
    this.purchasesPath = path.resolve(config.purchasesPath || "compras-proveedor.json");
    this.queue = Promise.resolve();
  }

  enqueue(operation) {
    const next = this.queue.then(operation, operation);
    this.queue = next.catch(() => {});
    return next;
  }

  async readFile(filePath) {
    try {
      const text = await fs.readFile(filePath, "utf8");
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async writeFile(filePath, rows) {
    await fs.writeFile(filePath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
    return rows;
  }

  listProviders() {
    return this.readFile(this.providersPath);
  }

  async createProvider(provider) {
    return this.enqueue(async () => {
      const providers = await this.listProviders();

      if (providers.some((entry) => entry.proveedor_id === provider.proveedor_id)) {
        const error = new Error("Ya existe un proveedor con ese ID.");
        error.statusCode = 409;
        throw error;
      }

      providers.push(provider);
      await this.writeFile(this.providersPath, providers);
      return provider;
    });
  }

  async updateProvider(id, patch) {
    return this.enqueue(async () => {
      const providers = await this.listProviders();
      const index = providers.findIndex((entry) => entry.proveedor_id === id);

      if (index < 0) {
        const error = new Error("Proveedor no encontrado.");
        error.statusCode = 404;
        throw error;
      }

      providers[index] = { ...providers[index], ...patch, proveedor_id: providers[index].proveedor_id };
      await this.writeFile(this.providersPath, providers);
      return providers[index];
    });
  }

  listPurchases() {
    return this.readFile(this.purchasesPath);
  }

  async createPurchase(purchase) {
    return this.enqueue(async () => {
      const purchases = await this.listPurchases();

      if (purchases.some((entry) => entry.compra_id === purchase.compra_id)) {
        const error = new Error("Ya existe una compra de proveedor con ese ID.");
        error.statusCode = 409;
        throw error;
      }

      purchases.push(purchase);
      await this.writeFile(this.purchasesPath, purchases);
      return purchase;
    });
  }

  async updatePurchase(id, patch) {
    return this.enqueue(async () => {
      const purchases = await this.listPurchases();
      const index = purchases.findIndex((entry) => entry.compra_id === id);

      if (index < 0) {
        const error = new Error("Compra de proveedor no encontrada.");
        error.statusCode = 404;
        throw error;
      }

      purchases[index] = { ...purchases[index], ...patch, compra_id: purchases[index].compra_id };
      await this.writeFile(this.purchasesPath, purchases);
      return purchases[index];
    });
  }
}

module.exports = JsonSupplierStore;
