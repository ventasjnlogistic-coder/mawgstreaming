function normalizePermissions(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeAdminUser(user = {}) {
  return {
    usuario: String(user.usuario || user.user || "").trim(),
    nombre: String(user.nombre || user.name || "").trim(),
    rol: String(user.rol || user.role || "admin").trim(),
    password: String(user.password || "").trim(),
    estado: user.estado === "inactivo" ? "inactivo" : "activo",
    permisos: normalizePermissions(user.permisos || user.permissions || "*"),
  };
}

function publicAdminUser(user = {}) {
  const normalized = normalizeAdminUser(user);
  return {
    usuario: normalized.usuario,
    nombre: normalized.nombre || normalized.usuario,
    rol: normalized.rol,
    estado: normalized.estado,
    permisos: normalized.permisos,
  };
}

module.exports = {
  normalizeAdminUser,
  publicAdminUser,
};
