const fs = require("node:fs/promises");
const path = require("node:path");

class JsonCatalogStore {
  constructor(filePath) {
    this.filePath = path.resolve(filePath || "productos.json");
    this.queue = Promise.resolve();
  }

  enqueue(operation) {
    const next = this.queue.then(operation, operation);
    this.queue = next.catch(() => {});
    return next;
  }

  async listProducts() {
    const text = await fs.readFile(this.filePath, "utf8");
    const data = JSON.parse(text);

    if (!Array.isArray(data)) {
      throw new Error("El catalogo JSON debe ser un arreglo.");
    }

    return data;
  }

  async saveProducts(products) {
    return this.enqueue(async () => {
      await fs.writeFile(this.filePath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
      return products;
    });
  }
}

module.exports = JsonCatalogStore;
