const crypto = require("node:crypto");
const { promisify } = require("node:util");
const scrypt = promisify(crypto.scrypt);
// Una derivacion por instancia evita multiplicar los 32 MB de scrypt
// cuando llegan varios inicios de sesion simultaneos a un Worker.
let passwordWork = Promise.resolve();
function derive(password, salt, options) {
  const result = passwordWork.then(() => scrypt(password, salt, 32, options));
  passwordWork = result.catch(() => {});
  return result;
}
const PREFIX = "scrypt$v1$";
const OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function isPasswordHash(value) { return String(value || "").startsWith(PREFIX); }
function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await derive(String(password), salt, OPTIONS);
  return `${PREFIX}${salt}$${key.toString("hex")}`;
}
async function verifyPassword(password, stored) {
  if (!password || typeof password !== "string" || password.length > 1024) return false;
  if (!isPasswordHash(stored)) {
    // Compatibilidad durante la migracion: el almacen reemplaza la clave al entrar.
    return !String(stored || "").startsWith("scrypt$") && safeEqual(password, stored || "");
  }
  const parts = stored.split("$");
  if (parts.length !== 4 || !/^[a-f0-9]{32}$/.test(parts[2]) || !/^[a-f0-9]{64}$/.test(parts[3])) return false;
  const key = await derive(password, parts[2], OPTIONS);
  return safeEqual(key.toString("hex"), parts[3]);
}
module.exports = { hashPassword, verifyPassword, isPasswordHash };
