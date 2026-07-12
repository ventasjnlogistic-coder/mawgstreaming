const { publicAdminUser } = require("./validation");

class AppsScriptUserStore {
  constructor(config = {}) {
    this.endpointUrl = config.endpointUrl;
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
        throw new Error(data.error || "No se pudo validar el usuario.");
      }

      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  async authenticate(usuario, password) {
    const data = await this.request({ action: "users.auth", usuario, password });
    return data.user ? publicAdminUser(data.user) : null;
  }
}

module.exports = AppsScriptUserStore;
