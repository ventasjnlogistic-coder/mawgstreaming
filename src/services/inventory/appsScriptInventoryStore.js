class AppsScriptInventoryStore {
  constructor(config) {
    this.endpointUrl = config.endpointUrl;
    this.adminToken = config.adminToken;
    this.timeoutMs = Number(config.timeoutMs || 45000);
  }

  createResponseError(response, data) {
    const originalMessage = data.error || `Apps Script respondio con estado ${response.status}.`;
    const message = originalMessage.toLowerCase();
    const error = new Error(
      message.includes("accion no soportada")
        ? "El Apps Script publicado no esta actualizado para inventario. Copia scripts/google-apps-script-catalogo.gs en Google Apps Script y publica una nueva version del Web App."
        : originalMessage
    );

    if (message.includes("no encontrad")) {
      error.statusCode = 404;
    } else if (message.includes("ya existe")) {
      error.statusCode = 409;
    } else if (message.includes("token")) {
      error.statusCode = 502;
    } else {
      error.statusCode = response.ok ? 502 : response.status;
    }

    return error;
  }

  async request(payload = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpointUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.ok === false) {
        throw this.createResponseError(response, data);
      }

      return data;
    } catch (error) {
      if (error?.name === "AbortError") {
        const timeoutError = new Error("Google Apps Script demoro demasiado en responder. Intenta con menos cuentas o aumenta APPS_SCRIPT_TIMEOUT_MS.");
        timeoutError.statusCode = 504;
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  withToken(payload) {
    return {
      ...payload,
      token: this.adminToken,
    };
  }

  isRetryableReadError(error) {
    const message = String(error?.message || "").toLowerCase();
    return error?.name === "AbortError" || message.includes("fetch failed") || message.includes("network");
  }

  async requestReadWithRetry(payload = {}) {
    try {
      return await this.request(payload);
    } catch (error) {
      if (!this.isRetryableReadError(error)) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 800));
      return this.request(payload);
    }
  }

  async listItems() {
    const data = await this.requestReadWithRetry(this.withToken({ action: "inventory.list" }));
    return Array.isArray(data.inventory) ? data.inventory : [];
  }

  async createItem(item) {
    const data = await this.request(this.withToken({ action: "inventory.create", item }));
    return data.item || item;
  }

  async updateItem(id, patch) {
    const data = await this.request(this.withToken({ action: "inventory.update", id, item: patch }));
    return data.item || patch;
  }

  async bulkUpdateItems(filters, patch) {
    const data = await this.request(this.withToken({ action: "inventory.bulkupdate", filters, patch }));
    return Array.isArray(data.items) ? data.items : [];
  }

  async assignToOrder(orderId, inventoryId, patch) {
    const data = await this.request(
      this.withToken({ action: "inventory.assign", order_id: orderId, inventory_id: inventoryId, assignment: patch })
    );
    return data;
  }

  async assignManyToOrder(orderId, assignments, patch) {
    const data = await this.request(
      this.withToken({ action: "inventory.assignMany", order_id: orderId, assignments, assignment: patch })
    );
    return data;
  }
}

module.exports = AppsScriptInventoryStore;
