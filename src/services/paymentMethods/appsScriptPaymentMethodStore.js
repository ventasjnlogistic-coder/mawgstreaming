const { getDefaultPaymentMethods, normalizePaymentMethod } = require("./validation");

class AppsScriptPaymentMethodStore {
  constructor(config) {
    this.endpointUrl = config.endpointUrl;
    this.adminToken = config.adminToken;
    this.timeoutMs = Number(config.timeoutMs || 15000);
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
        throw new Error(data.error || "No se pudieron cargar los metodos de pago.");
      }

      return data;
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

  async listMethods() {
    try {
      const data = await this.request(this.withToken({ action: "paymentMethods.list" }));
      const methods = Array.isArray(data.payment_methods) ? data.payment_methods : [];
      const active = methods.map(normalizePaymentMethod).filter((method) => method.estado === "activo");
      return active.length ? active : getDefaultPaymentMethods();
    } catch {
      return getDefaultPaymentMethods();
    }
  }
}

module.exports = AppsScriptPaymentMethodStore;
