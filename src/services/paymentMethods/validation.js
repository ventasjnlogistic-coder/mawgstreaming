const DEFAULT_PAYMENT_METHODS = [
  {
    id: "yape",
    nombre: "Yape",
    tipo: "billetera",
    titular: "Eduardo Leoncio Lujan Romero",
    numero: "913344874",
    cci: "",
    banco: "",
    qr_imagen: "assets/images/pago.png",
    instrucciones: "Escanea el QR o usa el numero visible. Luego adjunta tu comprobante para validarlo.",
    estado: "activo",
    orden: 1,
  },
  {
    id: "plin",
    nombre: "Plin",
    tipo: "billetera",
    titular: "MAWG Streaming",
    numero: "988888888",
    cci: "",
    banco: "",
    qr_imagen: "",
    instrucciones: "Usa el numero afiliado y confirma el pago adjuntando tu captura o PDF.",
    estado: "activo",
    orden: 2,
  },
  {
    id: "transferencia",
    nombre: "Transferencia",
    tipo: "banco",
    titular: "MAWG Streaming",
    numero: "191-00000000-0-00",
    cci: "002-191-000000000000-00",
    banco: "BCP",
    qr_imagen: "",
    instrucciones: "Realiza la transferencia y envia el comprobante para validar tu pedido.",
    estado: "activo",
    orden: 3,
  },
];

function slugify(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePaymentMethod(method = {}) {
  const nombre = String(method.nombre || method.name || "").trim();
  const id = String(method.id || slugify(nombre)).trim();
  const orden = Number(method.orden);

  return {
    id,
    nombre,
    tipo: String(method.tipo || "billetera").trim(),
    titular: String(method.titular || "").trim(),
    numero: String(method.numero || "").trim(),
    cci: String(method.cci || "").trim(),
    banco: String(method.banco || "").trim(),
    qr_imagen: String(method.qr_imagen || method.imagen || "").trim(),
    instrucciones: String(method.instrucciones || "").trim(),
    estado: method.estado === "inactivo" ? "inactivo" : "activo",
    orden: Number.isFinite(orden) ? orden : 999,
  };
}

function getDefaultPaymentMethods() {
  return DEFAULT_PAYMENT_METHODS.map(normalizePaymentMethod);
}

module.exports = {
  DEFAULT_PAYMENT_METHODS,
  getDefaultPaymentMethods,
  normalizePaymentMethod,
};
