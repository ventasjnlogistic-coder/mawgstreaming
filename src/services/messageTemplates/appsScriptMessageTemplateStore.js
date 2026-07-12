const { getDefaultMessageTemplates, normalizeMessageTemplate } = require("./validation");

class AppsScriptMessageTemplateStore {
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
        throw new Error(data.error || "No se pudieron cargar las plantillas.");
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

  async listTemplates() {
    try {
      const data = await this.request(this.withToken({ action: "templates.list" }));
      const templates = Array.isArray(data.templates) ? data.templates : [];
      return templates.length ? templates.map(normalizeMessageTemplate) : getDefaultMessageTemplates();
    } catch {
      return getDefaultMessageTemplates();
    }
  }

  async updateTemplate(id, template) {
    const data = await this.request(this.withToken({ action: "templates.update", id, template }));
    return normalizeMessageTemplate(data.template || template);
  }
}

module.exports = AppsScriptMessageTemplateStore;
