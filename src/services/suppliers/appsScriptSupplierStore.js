class AppsScriptSupplierStore {
  constructor(config) {
    this.endpointUrl = config.endpointUrl;
    this.adminToken = config.adminToken;
    this.timeoutMs = Number(config.timeoutMs || 15000);
    this.fallbackStore = config.fallbackStore || null;
  }

  createResponseError(response, data) {
    const originalMessage = data.error || `Apps Script respondio con estado ${response.status}.`;
    const message = originalMessage.toLowerCase();
    const error = new Error(
      message.includes("accion no soportada")
        ? "El Apps Script publicado no esta actualizado para proveedores. Copia scripts/google-apps-script-catalogo.gs y publica una nueva version."
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
    } finally {
      clearTimeout(timeout);
    }
  }

  withToken(payload) {
    return { ...payload, token: this.adminToken };
  }

  canUseFallback(error) {
    const message = String(error?.message || "").toLowerCase();
    return error?.name === "AbortError" || message.includes("fetch failed") || message.includes("no esta actualizado");
  }

  async listProviders() {
    try {
      const data = await this.request(this.withToken({ action: "providers.list" }));
      return Array.isArray(data.providers) ? data.providers : [];
    } catch (error) {
      if (this.fallbackStore && this.canUseFallback(error)) {
        return this.fallbackStore.listProviders();
      }
      throw error;
    }
  }

  async createProvider(provider) {
    try {
      const data = await this.request(this.withToken({ action: "providers.create", provider }));
      return data.provider || provider;
    } catch (error) {
      if (this.fallbackStore && this.canUseFallback(error)) {
        return this.fallbackStore.createProvider(provider);
      }
      throw error;
    }
  }

  async updateProvider(id, provider) {
    try {
      const data = await this.request(this.withToken({ action: "providers.update", id, provider }));
      return data.provider || provider;
    } catch (error) {
      if (this.fallbackStore && this.canUseFallback(error)) {
        return this.fallbackStore.updateProvider(id, provider);
      }
      throw error;
    }
  }

  async listPurchases() {
    try {
      const data = await this.request(this.withToken({ action: "providerpurchases.list" }));
      return Array.isArray(data.provider_purchases) ? data.provider_purchases : [];
    } catch (error) {
      if (this.fallbackStore && this.canUseFallback(error)) {
        return this.fallbackStore.listPurchases();
      }
      throw error;
    }
  }

  async createPurchase(purchase) {
    try {
      const data = await this.request(this.withToken({ action: "providerpurchases.create", purchase }));
      return data.provider_purchase || purchase;
    } catch (error) {
      if (this.fallbackStore && this.canUseFallback(error)) {
        return this.fallbackStore.createPurchase(purchase);
      }
      throw error;
    }
  }

  async updatePurchase(id, purchase) {
    try {
      const data = await this.request(this.withToken({ action: "providerpurchases.update", id, purchase }));
      return data.provider_purchase || purchase;
    } catch (error) {
      if (this.fallbackStore && this.canUseFallback(error)) {
        return this.fallbackStore.updatePurchase(id, purchase);
      }
      throw error;
    }
  }
}

module.exports = AppsScriptSupplierStore;
