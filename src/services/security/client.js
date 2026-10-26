const crypto = require("node:crypto");
async function callSecurityState(namespace, key, pathname, method = "GET", data) {
  const name = crypto.createHash("sha256").update(key).digest("hex");
  const stub = namespace.get(namespace.idFromName(name));
  const response = await stub.fetch(`https://security.internal${pathname}`, {
    method,
    ...(data ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) } : {}),
  });
  if (!response.ok) throw new Error("El servicio de seguridad no esta disponible.");
  return response.json();
}
module.exports = { callSecurityState };
