// Permisos de lectura necesarios para las dependencias de cada pantalla.
const READ_PERMISSIONS = {
  products: ["productos", "compras", "inventario", "proveedores", "renovaciones", "reportes"],
  orders: ["compras", "inventario", "renovaciones", "reportes"],
  inventory: ["inventario", "compras", "renovaciones", "reportes"],
  renewals: ["renovaciones", "inventario", "reportes"],
  providers: ["proveedores", "inventario", "reportes"],
  provider_purchases: ["proveedores", "inventario", "reportes"],
  payment_methods: ["compras", "inventario", "renovaciones", "proveedores", "reportes"],
  templates: ["plantillas", "compras", "inventario", "renovaciones"],
  settings: ["plantillas"],
  audit: ["auditoria"],
};
function canRead(permissions, resource) {
  return permissions.includes("*") || (READ_PERMISSIONS[resource] || []).some((value) => permissions.includes(value));
}
const CREDENTIAL_FIELDS = new Set(["cuenta_usuario", "cuenta_clave", "usuario_bot", "contrasena_bot", "pin", "datos_entrega", "notas_entrega", "notas", "comprobante_notas", "url_producto", "link_bot", "datos_entrega_json", "asignaciones_inventario_json"]);
function redactCredentials(value) {
  if (Array.isArray(value)) return value.map(redactCredentials);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !CREDENTIAL_FIELDS.has(key)).map(([key, entry]) => [key, redactCredentials(entry)]));
}
function filterOperationalData(permissions, value, resource) {
  if (!resource) return Object.fromEntries(Object.entries(value).map(([key, rows]) => [key, filterOperationalData(permissions, rows, key)]));
  const credentialPermissions = resource === "provider_purchases" ? ["proveedores", "inventario"] : ["compras", "inventario"];
  return permissions.includes("*") || credentialPermissions.some((permission) => permissions.includes(permission)) ? value : redactCredentials(value);
}
module.exports = { READ_PERMISSIONS, canRead, filterOperationalData };
