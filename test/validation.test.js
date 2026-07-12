const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeProduct, validateProduct } = require("../src/services/catalog/validation");
const { normalizeOrder, validateOrder, validateProof } = require("../src/services/orders/validation");
const { normalizeInventoryItem, validateInventoryItem } = require("../src/services/inventory/validation");
const { normalizeRenewal, validateRenewal, validateRenewalConfirmation } = require("../src/services/renewals/validation");
const { normalizeProvider, normalizeProviderPurchase, validateProvider, validateProviderPurchase } = require("../src/services/suppliers/validation");

test("normaliza productos y genera ID desde el nombre", () => {
  const product = normalizeProduct({ nombre: "Netflix Premium", precio: "12.50", plantilla_entrega: "Hola {{cliente_nombre}}" });

  assert.equal(product.id, "netflix-premium");
  assert.equal(product.precio, 12.5);
  assert.equal(product.plantilla_entrega, "Hola {{cliente_nombre}}");
  assert.equal(validateProduct(product), "");
});

test("normaliza enlaces de Drive para imagenes de productos", () => {
  const product = normalizeProduct({
    nombre: "Disney Premium",
    imagen: "https://drive.google.com/file/d/1AbC-DEF_123/view?usp=sharing",
  });

  assert.equal(product.imagen, "https://drive.google.com/thumbnail?id=1AbC-DEF_123&sz=w1200");
});

test("rechaza productos sin nombre", () => {
  assert.equal(validateProduct(normalizeProduct({ id: "sin-nombre" })), "El nombre es obligatorio.");
});

test("normaliza pedidos y exige producto", () => {
  const emptyOrder = normalizeOrder({ pedido_id: "PED-1" });
  const validOrder = normalizeOrder({ producto_id: "netflix-premium", plantilla_entrega: "Entrega" });

  assert.equal(validateOrder(emptyOrder), "El producto es obligatorio.");
  assert.equal(validateOrder(validOrder), "");
  assert.match(validOrder.pedido_id, /^PED-/);
  assert.equal(validOrder.canal_venta, "web");
  assert.equal(validOrder.plantilla_entrega, "Entrega");
  assert.equal(normalizeOrder({ producto_id: "netflix-premium", canal_venta: "whatsapp" }).canal_venta, "whatsapp");
});

test("conserva precio y margen por asignacion de inventario", () => {
  const order = normalizeOrder({
    producto_id: "combo",
    asignaciones_inventario: [
      {
        inventario_id: "INV-1",
        producto_id: "netflix",
        costo_proveedor: 8,
        precio_lista: 20,
        precio_venta: 15,
        margen_estimado: 7,
      },
    ],
  });

  assert.equal(order.asignaciones_inventario[0].precio_lista, 20);
  assert.equal(order.asignaciones_inventario[0].precio_venta, 15);
  assert.equal(order.asignaciones_inventario[0].margen_estimado, 7);
});

test("valida comprobantes con cliente, contacto y detalle de pago", () => {
  assert.equal(validateProof({ cliente_nombre: "", cliente_contacto: "900000000" }), "Ingresa tu nombre.");
  assert.equal(validateProof({ cliente_nombre: "Ana", cliente_contacto: "" }), "Ingresa tu WhatsApp o correo.");
  assert.equal(
    validateProof({ cliente_nombre: "Ana", cliente_contacto: "900000000" }),
    "Adjunta el archivo del comprobante o agrega un detalle del pago."
  );
  assert.equal(validateProof({ cliente_nombre: "Ana", cliente_contacto: "900000000", comprobante_referencia: "OP123" }), "");
});

test("valida inventario con producto, proveedor y estado permitido", () => {
  const item = normalizeInventoryItem({
    producto_id: "netflix-premium",
    proveedor: "Mayorista",
    celular_proveedor: "999111222",
    referencia_compra: "OP123",
    fecha_vencimiento_proveedor: "2026-08-01",
    estado: "reclamo",
  });

  assert.equal(validateInventoryItem(item), "");
  assert.equal(item.celular_proveedor, "999111222");
  assert.equal(item.referencia_compra, "OP123");
  assert.equal(item.fecha_vencimiento_proveedor, "2026-08-01");
  assert.equal(item.estado, "reclamo");
  assert.equal(validateInventoryItem(normalizeInventoryItem({ proveedor: "Mayorista" })), "El producto del inventario es obligatorio.");
  assert.equal(validateInventoryItem(normalizeInventoryItem({ producto_id: "netflix-premium" })), "El proveedor es obligatorio.");
  assert.equal(validateInventoryItem({ ...item, estado: "bloqueado" }), "Estado de inventario no soportado.");
});

test("valida renovaciones y confirmacion de pago", () => {
  const renewal = normalizeRenewal({ inventario_id: "INV-1", monto: "15.50" });

  assert.match(renewal.renovacion_id, /^REN-/);
  assert.equal(renewal.monto, 15.5);
  assert.equal(validateRenewal(renewal), "");
  assert.equal(validateRenewal(normalizeRenewal({})), "Selecciona la cuenta de inventario.");
  assert.equal(validateRenewalConfirmation(renewal), "Indica el nuevo vencimiento.");
  assert.equal(
    validateRenewalConfirmation({ ...renewal, vencimiento_nuevo: "2026-08-10" }),
    "Registra un comprobante, referencia o nota de pago."
  );
  assert.equal(validateRenewalConfirmation({ ...renewal, vencimiento_nuevo: "2026-08-10", comprobante_referencia: "OP1" }), "");
});

test("valida proveedores y compras a proveedor", () => {
  const provider = normalizeProvider({ nombre: "Proveedor Uno", costo_referencial: "8.50" });
  const purchase = normalizeProviderPurchase({
    proveedor_id: provider.proveedor_id,
    producto_nombre: "Netflix Premium",
    cantidad: "2",
    costo_total: "16",
    cuenta_usuario: "cuenta@proveedor.com",
    cuenta_clave: "clave",
    estado: "pagado",
  });

  assert.match(provider.proveedor_id, /^PROV-/);
  assert.equal(provider.costo_referencial, 8.5);
  assert.equal(validateProvider(provider), "");
  assert.equal(validateProvider(normalizeProvider({})), "El nombre del proveedor es obligatorio.");
  assert.match(purchase.compra_id, /^CPR-/);
  assert.equal(purchase.cantidad, 2);
  assert.equal(purchase.costo_total, 16);
  assert.equal(purchase.cuenta_usuario, "cuenta@proveedor.com");
  assert.equal(purchase.cuenta_clave, "clave");
  assert.equal(validateProviderPurchase(purchase), "");
  assert.equal(validateProviderPurchase(normalizeProviderPurchase({ producto_nombre: "Netflix" })), "Selecciona o ingresa el proveedor.");
});
