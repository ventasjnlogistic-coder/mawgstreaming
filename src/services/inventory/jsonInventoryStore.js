const fs = require("node:fs/promises");
const path = require("node:path");

class JsonInventoryStore {
  constructor(filePath) {
    this.filePath = path.resolve(filePath || "inventario-cuentas.json");
    this.queue = Promise.resolve();
  }

  enqueue(operation) {
    const next = this.queue.then(operation, operation);
    this.queue = next.catch(() => {});
    return next;
  }

  async readItems() {
    try {
      const text = await fs.readFile(this.filePath, "utf8");
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async writeItems(items) {
    await fs.writeFile(this.filePath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
    return items;
  }

  async listItems() {
    return this.readItems();
  }

  async createItem(item) {
    return this.enqueue(async () => {
      const items = await this.readItems();

      if (items.some((entry) => entry.inventario_id === item.inventario_id)) {
        const error = new Error("Ya existe una cuenta de inventario con ese ID.");
        error.statusCode = 409;
        throw error;
      }

      items.push(item);
      await this.writeItems(items);
      return item;
    });
  }

  async updateItem(id, patch) {
    return this.enqueue(async () => {
      const items = await this.readItems();
      const index = items.findIndex((entry) => entry.inventario_id === id);

      if (index < 0) {
        const error = new Error("Cuenta de inventario no encontrada.");
        error.statusCode = 404;
        throw error;
      }

      items[index] = {
        ...items[index],
        ...patch,
        inventario_id: items[index].inventario_id,
      };

      await this.writeItems(items);
      return items[index];
    });
  }

  itemMatchesFilters(item, filters = {}) {
    const product = String(filters.producto || "").trim().toLowerCase();
    const accountUser = String(filters.cuenta_usuario || "").trim().toLowerCase();
    const provider = String(filters.proveedor || "").trim().toLowerCase();
    const status = String(filters.estado || "").trim();
    const matchesProduct =
      !product ||
      String(item.producto_id || "").toLowerCase().includes(product) ||
      String(item.producto_nombre || "").toLowerCase().includes(product);
    const matchesUser = !accountUser || String(item.cuenta_usuario || "").toLowerCase().includes(accountUser);
    const matchesProvider = !provider || String(item.proveedor || "").toLowerCase().includes(provider);
    const matchesStatus = !status || item.estado === status;

    return matchesProduct && matchesUser && matchesProvider && matchesStatus;
  }

  async bulkUpdateItems(filters, patch) {
    return this.enqueue(async () => {
      const items = await this.readItems();
      const updatedItems = [];

      const nextItems = items.map((item) => {
        if (!this.itemMatchesFilters(item, filters)) {
          return item;
        }

        const updated = {
          ...item,
          ...patch,
          inventario_id: item.inventario_id,
        };
        updatedItems.push(updated);
        return updated;
      });

      await this.writeItems(nextItems);
      return updatedItems;
    });
  }
}

module.exports = JsonInventoryStore;
