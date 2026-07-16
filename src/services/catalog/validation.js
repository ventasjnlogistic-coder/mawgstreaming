const DEFAULT_DELIVERY_TEMPLATE = [
  ":estrella: *MAWG Streaming te da la bienvenida*",
  "",
  ":tv: *Producto:* {{producto_nombre}}",
  "",
  ":correo: *Correo:* {{cuenta_usuario}}",
  ":llave: *Clave:* {{cuenta_clave}}",
  "",
  ":perfil: *Perfil:* {{perfil_nombre}}",
  ":candado: *PIN:* {{pin}}",
  ":calendario: *Fecha de renovacion:* {{fecha_vencimiento_cliente}}",
  "",
  ":alerta: *IMPORTANTE:*",
  "- Usar solo en un dispositivo.",
  "- No cambiar la clave ni el metodo de facturacion.",
  "- Si no cumple, la garantia expirara sin reclamo.",
  "",
  "Gracias :check:",
].join("\n");

const DEFAULT_PRODUCT = {
  id: "",
  nombre: "",
  tipo: "",
  precio: "",
  descripcion: "",
  plantilla_entrega: DEFAULT_DELIVERY_TEMPLATE,
  imagen: "",
  estado: "disponible",
  vender: "no",
  categoria: "",
  badge: "",
  cta: "Comprar",
  orden: 999,
  componentes: [],
};

function slugify(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getDriveFileId(value) {
  const rawValue = String(value || "").trim();

  if (!rawValue || !/drive\.google\.com|docs\.google\.com/.test(rawValue)) {
    return "";
  }

  const patterns = [
    /\/file\/d\/([^/]+)/,
    /\/uc\?[^#]*\bid=([^&#]+)/,
    /[?&]id=([^&#]+)/,
    /\/open\?[^#]*\bid=([^&#]+)/,
  ];

  for (const pattern of patterns) {
    const match = rawValue.match(pattern);
    if (match?.[1]) {
      return decodeURIComponent(match[1]).trim();
    }
  }

  return "";
}

function normalizeProductImage(value) {
  const image = String(value || "").trim();
  const driveFileId = getDriveFileId(image);

  if (!driveFileId) {
    return image;
  }

  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveFileId)}&sz=w1200`;
}

function normalizeProduct(product = {}) {
  const componentes = normalizeComponents(product.componentes);
  const normalized = {
    ...DEFAULT_PRODUCT,
    ...product,
    estado: product.estado === "agotado" ? "agotado" : "disponible",
    vender: String(product.vender || DEFAULT_PRODUCT.vender).trim().toLowerCase() === "si" ? "si" : "no",
    cta: product.cta || "Comprar",
    orden: Number.isFinite(Number(product.orden)) ? Number(product.orden) : DEFAULT_PRODUCT.orden,
    plantilla_entrega: String(product.plantilla_entrega || DEFAULT_DELIVERY_TEMPLATE).trim(),
    componentes,
  };

  normalized.id = String(normalized.id || slugify(normalized.nombre)).trim();
  normalized.nombre = String(normalized.nombre || "").trim();
  normalized.imagen = normalizeProductImage(normalized.imagen);

  if (normalized.precio !== "" && normalized.precio !== null && normalized.precio !== undefined) {
    const price = Number(normalized.precio);
    normalized.precio = Number.isFinite(price) ? price : "";
  }

  return normalized;
}

function normalizeComponents(value) {
  if (!value) {
    return [];
  }

  let entries = value;
  if (typeof value === "string") {
    try {
      entries = JSON.parse(value);
    } catch {
      entries = value
        .split(/\r?\n|,/)
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  }

  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry, index) => {
      if (typeof entry === "string") {
        return {
          id: slugify(entry) || `componente-${index + 1}`,
          nombre: entry.trim(),
          producto_id: slugify(entry),
        };
      }

      const nombre = String(entry.nombre || entry.name || entry.producto_nombre || entry.producto_id || entry.id || "").trim();
      const productoId = String(entry.producto_id || entry.productId || entry.id || slugify(nombre)).trim();

      return {
        id: String(entry.id || productoId || `componente-${index + 1}`).trim(),
        nombre,
        producto_id: productoId,
      };
    })
    .filter((entry) => entry.nombre || entry.producto_id);
}

function validateProduct(product) {
  if (!product.id) {
    return "El ID es obligatorio.";
  }

  if (!product.nombre) {
    return "El nombre es obligatorio.";
  }

  return "";
}

module.exports = {
  DEFAULT_PRODUCT,
  DEFAULT_DELIVERY_TEMPLATE,
  normalizeProduct,
  normalizeProductImage,
  normalizeComponents,
  validateProduct,
};
