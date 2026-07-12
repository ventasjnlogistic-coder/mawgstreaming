const fs = require("node:fs/promises");
const path = require("node:path");

class JsonOrderStore {
  constructor(filePath) {
    this.filePath = path.resolve(filePath || "pedidos.json");
    this.queue = Promise.resolve();
  }

  enqueue(operation) {
    const next = this.queue.then(operation, operation);
    this.queue = next.catch(() => {});
    return next;
  }

  async readOrders() {
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

  async writeOrders(orders) {
    await fs.writeFile(this.filePath, `${JSON.stringify(orders, null, 2)}\n`, "utf8");
    return orders;
  }

  async listOrders() {
    return this.readOrders();
  }

  async createOrder(order) {
    return this.enqueue(async () => {
      const orders = await this.readOrders();

      if (orders.some((item) => item.pedido_id === order.pedido_id)) {
        const error = new Error("Ya existe un pedido con ese ID.");
        error.statusCode = 409;
        throw error;
      }

      orders.push(order);
      await this.writeOrders(orders);
      return order;
    });
  }

  async updateOrder(id, patch) {
    return this.enqueue(async () => {
      const orders = await this.readOrders();
      const index = orders.findIndex((item) => item.pedido_id === id);

      if (index < 0) {
        const error = new Error("Pedido no encontrado.");
        error.statusCode = 404;
        throw error;
      }

      orders[index] = {
        ...orders[index],
        ...patch,
        pedido_id: orders[index].pedido_id,
      };

      await this.writeOrders(orders);
      return orders[index];
    });
  }
}

module.exports = JsonOrderStore;
