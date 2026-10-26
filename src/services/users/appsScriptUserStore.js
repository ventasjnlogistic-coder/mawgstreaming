const { hashPassword, verifyPassword, isPasswordHash } = require("./passwords");
const { publicAdminUser } = require("./validation");

class AppsScriptUserStore {
  constructor(config = {}) {
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
        body: JSON.stringify({ ...payload, token: this.adminToken }),
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

  async findUser(usuario) {
    const data = await this.request({ action: "users.credentials", usuario });
    return data.user ? publicAdminUser(data.user) : null;
  }

  async authenticate(usuario, password) {
    const data = await this.request({ action: "users.credentials", usuario });
    const user = data.user;
    if (!user || user.estado !== "activo" || !(await verifyPassword(password, user.password))) return null;
    if (!isPasswordHash(user.password)) {
      try {
        await this.request({ action: "users.password-upgrade", usuario: user.usuario, previous: user.password, hash: await hashPassword(password) });
      } catch (error) {
        // Dos logins simultaneos pueden competir por la misma migracion.
        const current = (await this.request({ action: "users.credentials", usuario })).user;
        if (!current || current.estado !== "activo" || !isPasswordHash(current.password) || !(await verifyPassword(password, current.password))) throw error;
        return publicAdminUser(current);
      }
    }
    return publicAdminUser(user);
  }
}

module.exports = AppsScriptUserStore;
