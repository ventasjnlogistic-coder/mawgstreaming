const fs = require("node:fs/promises");
const path = require("node:path");
const session = require("express-session");

class FileSessionStore extends session.Store {
  constructor(options = {}) {
    super();
    this.directory = path.resolve(options.directory || ".sessions");
    this.ttlMs = Number(options.ttlMs || 1000 * 60 * 60 * 8);
    this.ready = fs.mkdir(this.directory, { recursive: true });
  }

  getFilePath(sessionId) {
    return path.join(this.directory, `${encodeURIComponent(sessionId)}.json`);
  }

  async readSession(sessionId) {
    await this.ready;
    const text = await fs.readFile(this.getFilePath(sessionId), "utf8");
    const record = JSON.parse(text);

    if (!record.expiresAt || record.expiresAt <= Date.now()) {
      await this.destroySession(sessionId);
      return null;
    }

    return record.session;
  }

  async writeSession(sessionId, sessionData) {
    await this.ready;
    const expiresAt = sessionData.cookie?.expires
      ? new Date(sessionData.cookie.expires).getTime()
      : Date.now() + this.ttlMs;

    await fs.writeFile(
      this.getFilePath(sessionId),
      `${JSON.stringify({ expiresAt, session: sessionData }, null, 2)}\n`,
      "utf8"
    );
  }

  async destroySession(sessionId) {
    await this.ready;
    await fs.rm(this.getFilePath(sessionId), { force: true });
  }

  get(sessionId, callback) {
    this.readSession(sessionId)
      .then((sessionData) => callback(null, sessionData))
      .catch((error) => {
        if (error.code === "ENOENT") {
          callback(null, null);
          return;
        }
        callback(error);
      });
  }

  set(sessionId, sessionData, callback) {
    this.writeSession(sessionId, sessionData)
      .then(() => callback?.(null))
      .catch((error) => callback?.(error));
  }

  destroy(sessionId, callback) {
    this.destroySession(sessionId)
      .then(() => callback?.(null))
      .catch((error) => callback?.(error));
  }

  touch(sessionId, sessionData, callback) {
    this.set(sessionId, sessionData, callback);
  }
}

module.exports = FileSessionStore;
