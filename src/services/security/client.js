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
// El namespace puede no estar disponible durante la validacion de una primera
// publicacion. No capturarlo ni exigirlo al evaluar el modulo: resolverlo en
// cada operacion mantiene sesiones/limites compartidos y evita un fallback local.
function createSecurityNamespace(resolve, required = false) {
  if (!required) return resolve();
  function current() {
    const namespace = resolve();
    if (!namespace || typeof namespace.idFromName !== "function" || typeof namespace.get !== "function") {
      throw new Error("Falta el binding SECURITY_STATE para sesiones y limites compartidos.");
    }
    return namespace;
  }
  return {
    idFromName(name) { return current().idFromName(name); },
    get(id) { return current().get(id); },
  };
}
module.exports = { callSecurityState, createSecurityNamespace };
