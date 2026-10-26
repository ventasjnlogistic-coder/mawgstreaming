const fs = require("node:fs/promises");
const path = require("node:path");
const { hashPassword, verifyPassword, isPasswordHash } = require("./passwords");
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

  async findUser(usuario) {
    const users = await this.readUsers();
    const user = users.find((entry) => entry.usuario === String(usuario || "").trim());
    return user ? publicAdminUser(user) : null;
  }

  async authenticate(usuario, password) {
    const users = await this.readUsers();
    const user = users.find((entry) => entry.usuario === String(usuario || "").trim() && entry.estado === "activo");

    if (!user || !(await verifyPassword(password, user.password))) {
      return null;
    }

    if (!isPasswordHash(user.password)) {
      const previousPassword = user.password;
      user.password = await hashPassword(password);
      // El archivo contiene todos los usuarios; serializamos migraciones concurrentes.
      this.pendingWrite = (this.pendingWrite || Promise.resolve()).catch(() => {}).then(async () => {
        const current = await this.readUsers();
        const index = current.findIndex((entry) => entry.usuario === user.usuario);
        if (index < 0 || current[index].estado !== "activo") throw new Error("Usuario no disponible.");
        if (!isPasswordHash(current[index].password)) {
          if (current[index].password !== previousPassword) throw new Error("Las credenciales cambiaron. Inicia sesion nuevamente.");
          current[index].password = user.password;
        } else if (!(await verifyPassword(password, current[index].password))) {
          throw new Error("Las credenciales cambiaron. Inicia sesion nuevamente.");
        }
        const temporaryPath = `${this.filePath}.tmp`;
        await fs.writeFile(temporaryPath, `${JSON.stringify(current, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
        await fs.rename(temporaryPath, this.filePath);
      });
      await this.pendingWrite;
    }
    return publicAdminUser(user);
  }
}

module.exports = JsonUserStore;
