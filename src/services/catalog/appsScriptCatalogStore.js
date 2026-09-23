class AppsScriptCatalogStore {
  constructor(config) {
    this.endpointUrl = config.endpointUrl;
    this.adminToken = config.adminToken;
    this.timeoutMs = Number(config.timeoutMs || 30000);
    this.retryDelayMs = 800;
  }

  createResponseError(response, data) {
    const originalMessage = data.error || `Apps Script respondio con estado ${response.status}.`;
    const message = originalMessage.toLowerCase();
    const error = new Error(
      message.includes("accion no soportada")
        ? "El Apps Script publicado no esta actualizado para catalogo. Copia scripts/google-apps-script-catalogo.gs en Google Apps Script y publica una nueva version del Web App."
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
    } catch (error) {
      if (error?.name === "AbortError") {
        const timeoutError = new Error("Google Apps Script demoro demasiado en responder.");
        timeoutError.statusCode = 504;
        throw timeoutError;
      }
      throw error;
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

  isRetryableReadError(error) {
    const statusCode = Number(error?.statusCode || 0);
    const message = String(error?.message || "").toLowerCase();
    return (
      error?.name === "AbortError" ||
      statusCode === 500 ||
      statusCode === 502 ||
      statusCode === 503 ||
      statusCode === 504 ||
      message.includes("fetch failed") ||
      message.includes("network") ||
      message.includes("demoro demasiado")
    );
  }

  async requestReadWithRetry(payload = {}, options = {}) {
    try {
      return await this.request(payload, options);
    } catch (error) {
      if (!this.isRetryableReadError(error)) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
      return this.request(payload, options);
    }
  }

  async listProducts() {
    const data = await this.requestReadWithRetry({ action: "list" }, { method: "GET" });
    return Array.isArray(data.products) ? data.products : [];
  }

  async createProduct(product) {
    const data = await this.request(this.withToken({ action: "create", product }));
    return data.product || product;
  }

  async updateProduct(id, product) {
    const data = await this.request(this.withToken({ action: "update", id, product }));
    return data.product || product;
  }

  async deleteProduct(id) {
    await this.request(this.withToken({ action: "delete", id }));
    return true;
  }

  async saveProducts(products) {
    const data = await this.request(this.withToken({ action: "replace", products }));
    return Array.isArray(data.products) ? data.products : products;
  }
}

module.exports = AppsScriptCatalogStore;
