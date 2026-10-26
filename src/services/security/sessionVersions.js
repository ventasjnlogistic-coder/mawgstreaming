const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { callSecurityState } = require("./client");
function createSessionVersions(namespace, directory) {
  const versions = new Map();
  const filePath = (user) => path.join(directory, `version-${crypto.createHash("sha256").update(user).digest("hex")}.json`);
  return {
    async get(user) {
      if (namespace) return (await callSecurityState(namespace, `user:${user}`, "/version")).version;
      if (directory) {
        try { return JSON.parse(await fs.readFile(filePath(user), "utf8")).version; }
        catch (error) { if (error.code !== "ENOENT") throw error; return ""; }
      }
      return versions.get(user) || "";
    },
    async revoke(user) {
      if (namespace) return (await callSecurityState(namespace, `user:${user}`, "/version", "POST", {})).version;
      const version = crypto.randomUUID();
      if (directory) {
        await fs.mkdir(directory, { recursive: true });
        const temporary = `${filePath(user)}.${crypto.randomUUID()}.tmp`;
        await fs.writeFile(temporary, JSON.stringify({ version }), { mode: 0o600 });
        await fs.rename(temporary, filePath(user));
      } else versions.set(user, version);
      return version;
    },
  };
}
module.exports = { createSessionVersions };
