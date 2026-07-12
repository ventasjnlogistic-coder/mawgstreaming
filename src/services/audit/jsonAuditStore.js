const fs = require("node:fs/promises");
const path = require("node:path");

class JsonAuditStore {
  constructor(filePath) {
    this.filePath = path.resolve(filePath || "auditoria.json");
    this.queue = Promise.resolve();
  }

  enqueue(operation) {
    const next = this.queue.then(operation, operation);
    this.queue = next.catch(() => {});
    return next;
  }

  async readEvents() {
    try {
      const text = await fs.readFile(this.filePath, "utf8");
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async writeEvents(events) {
    await fs.writeFile(this.filePath, `${JSON.stringify(events, null, 2)}\n`, "utf8");
    return events;
  }

  async listEvents({ limit = 100 } = {}) {
    const events = await this.readEvents();
    return events.slice(-limit).reverse();
  }

  async appendEvent(event) {
    return this.enqueue(async () => {
      const events = await this.readEvents();
      events.push(event);
      await this.writeEvents(events.slice(-1000));
      return event;
    });
  }
}

module.exports = JsonAuditStore;
