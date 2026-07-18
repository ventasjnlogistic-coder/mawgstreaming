const {
  getDefaultSiteSettings,
  normalizeSiteSetting,
} = require("./validation");

class AppsScriptSiteSettingStore {
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
        throw new Error(data.error || "No se pudo cargar la configuracion del sitio.");
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

  async listSettings() {
    try {
      const data = await this.request(this.withToken({ action: "sitesettings.list" }));
      const settings = Array.isArray(data.site_settings) ? data.site_settings : [];
      const normalized = settings.map(normalizeSiteSetting);
      const defaults = getDefaultSiteSettings();
      const existingIds = new Set(normalized.map((setting) => setting.id));
      return [...normalized, ...defaults.filter((setting) => !existingIds.has(setting.id))].sort((left, right) => left.orden - right.orden);
    } catch {
      return getDefaultSiteSettings();
    }
  }

  async updateSetting(id, setting) {
    const data = await this.request(this.withToken({ action: "sitesettings.update", id, setting }));
    return normalizeSiteSetting(data.site_setting || setting);
  }
}

module.exports = AppsScriptSiteSettingStore;
