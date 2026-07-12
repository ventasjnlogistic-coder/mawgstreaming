const fs = require("node:fs/promises");
const path = require("node:path");
const { normalizeAdminUser, publicAdminUser } = require("./validation");

class JsonUserStore {
  constructor(config = {}) {
    this.filePath = path.resolve(config.filePath || "usuarios-admin.json");
    this.defaultUser = normalizeAdminUser(config.defaultUser || {});
  }

  async readUsers() {
    try {
      const text = await fs.readFile(this.filePath, "utf8");
      const data = JSON.parse(text);
      return Array.isArray(data) ? data.map(normalizeAdminUser) : [];
    } catch (error) {
      if (error.code === "ENOENT") {
        return this.defaultUser.usuario && this.defaultUser.password ? [this.defaultUser] : [];
      }
      throw error;
    }
  }

  async authenticate(usuario, password) {
    const users = await this.readUsers();
    const user = users.find((entry) => entry.usuario === String(usuario || "").trim() && entry.estado === "activo");

    if (!user || user.password !== String(password || "")) {
      return null;
    }

    return publicAdminUser(user);
  }
}

module.exports = JsonUserStore;
