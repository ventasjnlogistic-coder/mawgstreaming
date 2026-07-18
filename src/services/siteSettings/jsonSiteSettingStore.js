const fs = require("node:fs/promises");
const path = require("node:path");
const {
  getDefaultSiteSettings,
  normalizeSiteSetting,
} = require("./validation");

class JsonSiteSettingStore {
  constructor(filePath) {
    this.filePath = path.resolve(filePath || "configuracion-sitio.json");
    this.queue = Promise.resolve();
  }

  enqueue(operation) {
    const next = this.queue.then(operation, operation);
    this.queue = next.catch(() => {});
    return next;
  }

  async readSettings() {
    try {
      const text = await fs.readFile(this.filePath, "utf8");
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      if (error.code === "ENOENT") {
        return getDefaultSiteSettings();
      }
      throw error;
    }
  }

  async writeSettings(settings) {
    await fs.writeFile(this.filePath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
    return settings;
  }

  async listSettings() {
    const settings = (await this.readSettings()).map(normalizeSiteSetting);
    const defaults = getDefaultSiteSettings();
    const existingIds = new Set(settings.map((setting) => setting.id));
    const missingDefaults = defaults.filter((setting) => !existingIds.has(setting.id));

    return [...settings, ...missingDefaults].sort((left, right) => left.orden - right.orden);
  }

  async updateSetting(id, setting) {
    return this.enqueue(async () => {
      const settings = await this.listSettings();
      const normalized = normalizeSiteSetting({ ...setting, id: setting.id || id });
      const index = settings.findIndex((entry) => entry.id === id);

      if (index >= 0) {
        settings[index] = normalized;
      } else {
        settings.push(normalized);
      }

      await this.writeSettings(settings);
      return normalized;
    });
  }
}

module.exports = JsonSiteSettingStore;
