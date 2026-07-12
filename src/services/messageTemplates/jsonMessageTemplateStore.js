const fs = require("node:fs/promises");
const path = require("node:path");
const {
  getDefaultMessageTemplates,
  normalizeMessageTemplate,
} = require("./validation");

class JsonMessageTemplateStore {
  constructor(filePath) {
    this.filePath = path.resolve(filePath || "plantillas-mensajes.json");
    this.queue = Promise.resolve();
  }

  enqueue(operation) {
    const next = this.queue.then(operation, operation);
    this.queue = next.catch(() => {});
    return next;
  }

  async readTemplates() {
    try {
      const text = await fs.readFile(this.filePath, "utf8");
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      if (error.code === "ENOENT") {
        return getDefaultMessageTemplates();
      }
      throw error;
    }
  }

  async writeTemplates(templates) {
    await fs.writeFile(this.filePath, `${JSON.stringify(templates, null, 2)}\n`, "utf8");
    return templates;
  }

  async listTemplates() {
    return (await this.readTemplates()).map(normalizeMessageTemplate).sort((left, right) => left.orden - right.orden);
  }

  async updateTemplate(id, template) {
    return this.enqueue(async () => {
      const templates = await this.listTemplates();
      const normalized = normalizeMessageTemplate({ ...template, id: template.id || id });
      const index = templates.findIndex((entry) => entry.id === id);

      if (index >= 0) {
        templates[index] = normalized;
      } else {
        templates.push(normalized);
      }

      await this.writeTemplates(templates);
      return normalized;
    });
  }
}

module.exports = JsonMessageTemplateStore;
