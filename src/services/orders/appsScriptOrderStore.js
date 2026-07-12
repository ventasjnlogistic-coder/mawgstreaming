class AppsScriptOrderStore {
  constructor(config) {
    this.endpointUrl = config.endpointUrl;
    this.adminToken = config.adminToken;
    this.proofDriveFolderId = config.proofDriveFolderId || "";
    this.timeoutMs = Number(config.timeoutMs || 15000);
  }

  createResponseError(response, data) {
    const originalMessage = data.error || `Apps Script respondio con estado ${response.status}.`;
    const message = originalMessage.toLowerCase();
    const error = new Error(
      message.includes("accion no soportada")
        ? "El Apps Script publicado no esta actualizado para pedidos. Copia scripts/google-apps-script-catalogo.gs en Google Apps Script y publica una nueva version del Web App."
        : originalMessage
    );

    if (message.includes("no encontrado")) {
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

  async request(payload = {}, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const method = options.method || "POST";
    const url = method === "GET" ? this.buildUrl(payload) : this.endpointUrl;

    try {
      const response = await fetch(url, {
        method,
        headers: method === "GET" ? undefined : { "Content-Type": "application/json" },
        body: method === "GET" ? undefined : JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.ok === false) {
        throw this.createResponseError(response, data);
      }

      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  buildUrl(params) {
    const url = new URL(this.endpointUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  }

  withToken(payload) {
    return {
      ...payload,
      token: this.adminToken,
    };
  }

  async listOrders() {
    const data = await this.request(this.withToken({ action: "orders.list" }));
    return Array.isArray(data.orders) ? data.orders : [];
  }

  async createOrder(order) {
    const data = await this.request({ action: "orders.create", order });
    return data.order || order;
  }

  async updateOrder(id, patch) {
    const data = await this.request(this.withToken({ action: "orders.update", id, order: patch }));
    return data.order || patch;
  }

  async submitProof(id, proof) {
    const data = await this.request({
      action: "orders.proof",
      id,
      proof,
      token: this.adminToken,
      proof_drive_folder_id: this.proofDriveFolderId,
    });
    return data.order || proof;
  }
}

module.exports = AppsScriptOrderStore;
