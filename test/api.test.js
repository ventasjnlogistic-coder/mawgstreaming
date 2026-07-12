const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

process.env.NODE_ENV = "test";
process.env.ADMIN_USER = "admin-test";
process.env.ADMIN_PASSWORD = "secret-test";
process.env.SESSION_SECRET = "test-session-secret-with-enough-length";
process.env.CATALOG_STORAGE = "json";
process.env.SESSION_STORE = "memory";

let server;
let baseUrl;
let tempDir;

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    redirect: "manual",
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { response, data };
}

test.before(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "streamhub-api-"));
  process.env.CATALOG_JSON_PATH = path.join(tempDir, "productos.json");
  process.env.ORDERS_JSON_PATH = path.join(tempDir, "pedidos.json");
  process.env.INVENTORY_JSON_PATH = path.join(tempDir, "inventario.json");
  process.env.RENEWALS_JSON_PATH = path.join(tempDir, "renovaciones.json");
  process.env.PROVIDERS_JSON_PATH = path.join(tempDir, "proveedores.json");
  process.env.PROVIDER_PURCHASES_JSON_PATH = path.join(tempDir, "compras-proveedor.json");
  process.env.AUDIT_LOG_JSON_PATH = path.join(tempDir, "auditoria.json");
  process.env.MESSAGE_TEMPLATES_JSON_PATH = path.join(tempDir, "plantillas-mensajes.json");
  process.env.USERS_JSON_PATH = path.join(tempDir, "usuarios-admin.json");

  await fs.writeFile(
    process.env.CATALOG_JSON_PATH,
    `${JSON.stringify(
      [
        { id: "disney", nombre: "Disney Premium", precio: 25, estado: "disponible" },
        { id: "netflix", nombre: "Netflix Premium", precio: 20, estado: "disponible" },
        {
          id: "combo-stream",
          nombre: "Combo Streaming",
          precio: 36,
          estado: "disponible",
          componentes: [
            { id: "netflix", nombre: "Netflix Premium", producto_id: "netflix" },
            { id: "disney", nombre: "Disney Premium", producto_id: "disney" },
          ],
        },
        { id: "agotado", nombre: "Producto Agotado", precio: 10, estado: "agotado" },
      ],
      null,
      2
    )}\n`,
    "utf8"
  );
  await fs.writeFile(
    process.env.INVENTORY_JSON_PATH,
    `${JSON.stringify(
      [
        {
          inventario_id: "INV-DISNEY-1",
          producto_id: "disney",
          producto_nombre: "Disney Premium",
          proveedor: "Proveedor",
          estado: "disponible",
          costo_proveedor: 9,
        },
        {
          inventario_id: "INV-NETFLIX-1",
          producto_id: "netflix",
          producto_nombre: "Netflix Premium",
          proveedor: "Proveedor",
          estado: "disponible",
          costo_proveedor: 8,
        },
        {
          inventario_id: "INV-DISNEY-3",
          producto_id: "disney",
          producto_nombre: "Disney Premium",
          proveedor: "Proveedor",
          estado: "disponible",
          costo_proveedor: 7,
        },
        {
          inventario_id: "INV-NETFLIX-2",
          producto_id: "netflix",
          producto_nombre: "Netflix Premium",
          proveedor: "Proveedor",
          estado: "disponible",
          costo_proveedor: 9,
        },
        {
          inventario_id: "INV-DISNEY-2",
          producto_id: "disney",
          producto_nombre: "Disney Premium",
          proveedor: "Proveedor",
          estado: "ocupado",
          pedido_id: "PED-REN-1",
          cliente_nombre: "Ana",
          cliente_contacto: "999111222",
          fecha_vencimiento_cliente: "2026-07-10",
          precio_venta_sugerido: 22,
        },
      ],
      null,
      2
    )}\n`,
    "utf8"
  );
  await fs.writeFile(
    process.env.ORDERS_JSON_PATH,
    `${JSON.stringify(
      [
        {
          pedido_id: "PED-REN-1",
          producto_id: "disney",
          producto_nombre: "Disney Premium",
          producto_precio: 25,
          cliente_nombre: "Ana",
          cliente_contacto: "999111222",
          estado: "entregado",
          inventario_id: "INV-DISNEY-2",
          fecha_vencimiento_cliente: "2026-07-10",
        },
      ],
      null,
      2
    )}\n`,
    "utf8"
  );
  await fs.writeFile(
    process.env.USERS_JSON_PATH,
    `${JSON.stringify(
      [
        {
          usuario: "admin-test",
          nombre: "Admin Test",
          rol: "admin",
          password: "secret-test",
          estado: "activo",
          permisos: "*",
        },
        {
          usuario: "operador-test",
          nombre: "Operador Test",
          rol: "operaciones",
          password: "operator-secret",
          estado: "activo",
          permisos: "compras,inventario,renovaciones",
        },
      ],
      null,
      2
    )}\n`,
    "utf8"
  );

  const { app } = require("../server");
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await fs.rm(tempDir, { recursive: true, force: true });
});

test("sirve paginas publicas y bloquea archivos internos", async () => {
  const home = await request("/");
  const env = await request("/.env");
  const serverFile = await request("/server.js");

  assert.equal(home.response.status, 200);
  assert.equal(home.response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(env.response.status, 404);
  assert.equal(serverFile.response.status, 404);
});

test("protege recursos de admin hasta iniciar sesion", async () => {
  const adminPage = await request("/admin.html");
  const adminScript = await request("/admin.js");
  const login = await request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ usuario: "admin-test", password: "secret-test" }),
  });
  const cookie = login.response.headers.get("set-cookie").split(";")[0];
  const authedAdminScript = await request("/admin.js", { headers: { Cookie: cookie } });

  assert.equal(adminPage.response.status, 302);
  assert.equal(adminPage.response.headers.get("location"), "/login.html");
  assert.equal(adminScript.response.status, 401);
  assert.equal(login.response.status, 200);
  assert.equal(login.data.user.rol, "admin");
  assert.equal(authedAdminScript.response.status, 200);
});

test("permite iniciar sesion con usuario de roles administrables", async () => {
  const login = await request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ usuario: "operador-test", password: "operator-secret" }),
  });
  const cookie = login.response.headers.get("set-cookie").split(";")[0];
  const session = await request("/api/admin/session", { headers: { Cookie: cookie } });

  assert.equal(login.response.status, 200);
  assert.equal(login.data.user.usuario, "operador-test");
  assert.equal(login.data.user.rol, "operaciones");
  assert.deepEqual(login.data.user.permisos, ["compras", "inventario", "renovaciones"]);
  assert.equal(session.data.user.nombre, "Operador Test");
});

test("bloquea escrituras fuera de permisos del rol", async () => {
  const login = await request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ usuario: "operador-test", password: "operator-secret" }),
  });
  const cookie = login.response.headers.get("set-cookie").split(";")[0];
  const denied = await request("/api/admin/productos", {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify({ id: "nuevo", nombre: "Nuevo", precio: 10 }),
  });

  assert.equal(denied.response.status, 403);
  assert.equal(denied.data.error, "No tienes permisos para realizar esta accion.");
});

test("publica stock disponible junto al catalogo", async () => {
  const products = await request("/api/productos");
  const disney = products.data.find((product) => product.id === "disney");
  const soldOut = products.data.find((product) => product.id === "agotado");

  assert.equal(products.response.status, 200);
  assert.equal(disney.stock_disponible, 2);
  assert.equal(disney.estado, "disponible");
  assert.equal(soldOut.stock_disponible, 0);
  assert.equal(soldOut.estado, "agotado");
});

test("publica metodos de pago administrables con respaldo local", async () => {
  const methods = await request("/api/metodos-pago");

  assert.equal(methods.response.status, 200);
  assert.ok(Array.isArray(methods.data));
  assert.ok(methods.data.some((method) => method.id === "yape"));
  assert.ok(methods.data.every((method) => method.estado === "activo"));
});

test("administra plantillas de mensajes", async () => {
  const login = await request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ usuario: "admin-test", password: "secret-test" }),
  });
  const cookie = login.response.headers.get("set-cookie").split(";")[0];
  const templates = await request("/api/admin/plantillas", { headers: { Cookie: cookie } });
  const updated = await request("/api/admin/plantillas/entrega", {
    method: "PUT",
    headers: { Cookie: cookie },
    body: JSON.stringify({
      id: "entrega",
      nombre: "Entrega",
      asunto: "Datos actualizados",
      contenido: "Hola {{cliente_nombre}}, aqui van tus datos.",
      estado: "activo",
      orden: 1,
    }),
  });

  assert.equal(templates.response.status, 200);
  assert.ok(templates.data.some((template) => template.id === "entrega"));
  assert.equal(updated.response.status, 200);
  assert.equal(updated.data.asunto, "Datos actualizados");
});

test("crea pedidos solo para productos publicados y disponibles", async () => {
  const missing = await request("/api/pedidos", {
    method: "POST",
    body: JSON.stringify({ producto_id: "no-existe" }),
  });
  const soldOut = await request("/api/pedidos", {
    method: "POST",
    body: JSON.stringify({ producto_id: "agotado" }),
  });
  const valid = await request("/api/pedidos", {
    method: "POST",
    body: JSON.stringify({ producto_id: "disney", producto_nombre: "Manipulado", producto_precio: 999 }),
  });

  assert.equal(missing.response.status, 404);
  assert.equal(soldOut.response.status, 400);
  assert.equal(valid.response.status, 201);
  assert.equal(valid.data.producto_nombre, "Disney Premium");
  assert.equal(valid.data.producto_precio, 25);
});

test("crea y confirma renovaciones sincronizando inventario", async () => {
  const login = await request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ usuario: "admin-test", password: "secret-test" }),
  });
  const cookie = login.response.headers.get("set-cookie").split(";")[0];
  const created = await request("/api/admin/renovaciones", {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify({
      inventario_id: "INV-DISNEY-2",
      metodo_pago: "Yape",
      vencimiento_nuevo: "2026-08-10",
    }),
  });
  const formData = new FormData();
  formData.set("vencimiento_nuevo", "2026-08-10");
  formData.set("comprobante_archivo", new Blob(["renovacion"], { type: "image/png" }), "renovacion.png");
  const confirmed = await request(`/api/admin/renovaciones/${created.data.renovacion_id}/confirmar`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: formData,
  });
  const inventory = await request("/api/admin/inventario", { headers: { Cookie: cookie } });
  const updatedItem = inventory.data.find((item) => item.inventario_id === "INV-DISNEY-2");

  assert.equal(created.response.status, 201);
  assert.equal(created.data.pedido_id, "PED-REN-1");
  assert.equal(created.data.monto, 22);
  assert.equal(created.data.vencimiento_anterior, "2026-07-10");
  assert.equal(confirmed.response.status, 200);
  assert.equal(confirmed.data.renewal.estado, "renovado");
  assert.match(confirmed.data.renewal.comprobante_referencia, /renovacion\.png/);
  assert.equal(updatedItem.fecha_vencimiento_cliente, "2026-08-10");
});

test("administra proveedores y compras de proveedor", async () => {
  const login = await request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ usuario: "admin-test", password: "secret-test" }),
  });
  const cookie = login.response.headers.get("set-cookie").split(";")[0];
  const provider = await request("/api/admin/proveedores", {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify({
      nombre: "Proveedor Uno",
      contacto: "999111222",
      producto_principal: "Netflix",
      costo_referencial: 8,
    }),
  });
  const purchase = await request("/api/admin/compras-proveedor", {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify({
      proveedor_id: provider.data.proveedor_id,
      producto_id: "netflix",
      producto_nombre: "Netflix Premium",
      cantidad: 4,
      costo_total: 32,
      cuenta_usuario: "cuenta@proveedor.com",
      cuenta_clave: "clave-proveedor",
      fecha_compra: "2026-07-06",
      fecha_vencimiento_proveedor: "2026-08-06",
      estado: "pagado",
    }),
  });
  const providers = await request("/api/admin/proveedores", { headers: { Cookie: cookie } });
  const purchases = await request("/api/admin/compras-proveedor", { headers: { Cookie: cookie } });
  const received = await request(`/api/admin/compras-proveedor/${purchase.data.compra_id}`, {
    method: "PUT",
    headers: { Cookie: cookie },
    body: JSON.stringify({ ...purchase.data, estado: "recibido" }),
  });
  const receivedAgain = await request(`/api/admin/compras-proveedor/${purchase.data.compra_id}`, {
    method: "PUT",
    headers: { Cookie: cookie },
    body: JSON.stringify({ ...received.data, estado: "recibido" }),
  });
  const inventory = await request("/api/admin/inventario", { headers: { Cookie: cookie } });
  const audit = await request("/api/admin/auditoria", { headers: { Cookie: cookie } });
  const purchaseItems = inventory.data.filter((item) => item.compra_id === purchase.data.compra_id);
  const purchaseAudit = audit.data.find((event) => event.entidad === "compra_proveedor" && event.entidad_id === purchase.data.compra_id && event.accion === "cambiar_estado");

  assert.equal(provider.response.status, 201);
  assert.match(provider.data.proveedor_id, /^PROV-/);
  assert.equal(purchase.response.status, 201);
  assert.equal(purchase.data.proveedor_nombre, "Proveedor Uno");
  assert.equal(purchase.data.costo_unitario, 8);
  assert.equal(providers.data.length, 1);
  assert.equal(purchases.data.length, 1);
  assert.equal(received.response.status, 200);
  assert.equal(received.data.inventario_generado, 4);
  assert.equal(receivedAgain.data.inventario_generado, 0);
  assert.equal(purchaseItems.length, 4);
  assert.equal(purchaseItems[0].estado, "pendiente_revision");
  assert.equal(purchaseItems[0].costo_proveedor, 8);
  assert.equal(purchaseItems[0].cuenta_usuario, "cuenta@proveedor.com");
  assert.equal(purchaseItems[0].cuenta_clave, "clave-proveedor");
  assert.equal(purchaseItems[0].referencia_compra, purchase.data.compra_id);
  assert.equal(audit.response.status, 200);
  assert.equal(purchaseAudit.estado_anterior, "pagado");
  assert.equal(purchaseAudit.estado_nuevo, "recibido");
  assert.equal(purchaseAudit.usuario, "admin-test");
});

test("crea ventas manuales desde admin con canal de venta", async () => {
  const login = await request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ usuario: "admin-test", password: "secret-test" }),
  });
  const cookie = login.response.headers.get("set-cookie").split(";")[0];
  const form = new FormData();
  form.set("producto_id", "netflix");
  form.set("producto_precio", "18");
  form.set("cliente_nombre", "Venta Directa");
  form.set("cliente_contacto", "955555555");
  form.set("metodo_pago", "yape");
  form.set("comprobante_referencia", "MANUAL-1");
  form.set("canal_venta", "whatsapp");
  form.set("estado", "pagado");
  form.set("comprobante_archivo", new Blob(["comprobante"], { type: "application/pdf" }), "manual.pdf");
  const created = await request("/api/admin/pedidos", {
    method: "POST",
    headers: { Cookie: cookie },
    body: form,
  });
  const orders = await request("/api/admin/pedidos", { headers: { Cookie: cookie } });
  const audit = await request("/api/admin/auditoria", { headers: { Cookie: cookie } });
  const savedOrder = orders.data.find((order) => order.pedido_id === created.data.pedido_id);
  const auditEvent = audit.data.find((event) => event.entidad === "pedido" && event.entidad_id === created.data.pedido_id);

  assert.equal(created.response.status, 201);
  assert.equal(created.data.producto_nombre, "Netflix Premium");
  assert.equal(created.data.producto_precio, 18);
  assert.equal(created.data.estado, "pagado");
  assert.equal(created.data.canal_venta, "whatsapp");
  assert.match(created.data.comprobante_notas, /Archivo recibido localmente: manual.pdf/);
  assert.equal(savedOrder.canal_venta, "whatsapp");
  assert.equal(auditEvent.accion, "crear_venta_manual");
});

test("asigna combo guardando precio de venta individual por cuenta", async () => {
  const login = await request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ usuario: "admin-test", password: "secret-test" }),
  });
  const cookie = login.response.headers.get("set-cookie").split(";")[0];
  const orderResponse = await request("/api/pedidos", {
    method: "POST",
    body: JSON.stringify({ producto_id: "combo-stream" }),
  });
  const proofResponse = await request(`/api/pedidos/${orderResponse.data.pedido_id}/comprobante`, {
    method: "POST",
    body: JSON.stringify({
      cliente_nombre: "Luis",
      cliente_contacto: "900000000",
      metodo_pago: "Yape",
      comprobante_referencia: "OP-COMBO",
    }),
  });
  await request(`/api/admin/pedidos/${orderResponse.data.pedido_id}`, {
    method: "PUT",
    headers: { Cookie: cookie },
    body: JSON.stringify({ estado: "pagado" }),
  });
  const assigned = await request(`/api/admin/pedidos/${orderResponse.data.pedido_id}/asignar-inventario`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify({
      asignaciones_inventario: [
        {
          componente_id: "netflix",
          componente_nombre: "Netflix Premium",
          producto_id: "netflix",
          inventario_id: "INV-NETFLIX-1",
          fecha_vencimiento_cliente: "2026-08-10",
        },
        {
          componente_id: "disney",
          componente_nombre: "Disney Premium",
          producto_id: "disney",
          inventario_id: "INV-DISNEY-1",
          fecha_vencimiento_cliente: "2026-08-10",
        },
      ],
    }),
  });
  const assignments = assigned.data.order.asignaciones_inventario;

  assert.equal(proofResponse.response.status, 200);
  assert.equal(assigned.response.status, 200);
  assert.equal(assigned.data.order.costo_proveedor, 17);
  assert.equal(assignments[0].precio_lista, 20);
  assert.equal(assignments[0].precio_venta, 16);
  assert.equal(assignments[0].margen_estimado, 8);
  assert.equal(assignments[1].precio_lista, 25);
  assert.equal(assignments[1].precio_venta, 20);
  assert.equal(assignments[1].margen_estimado, 11);
});

test("respeta precio de venta manual por componente al asignar combo", async () => {
  const login = await request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ usuario: "admin-test", password: "secret-test" }),
  });
  const cookie = login.response.headers.get("set-cookie").split(";")[0];
  const orderResponse = await request("/api/pedidos", {
    method: "POST",
    body: JSON.stringify({ producto_id: "combo-stream" }),
  });
  await request(`/api/pedidos/${orderResponse.data.pedido_id}/comprobante`, {
    method: "POST",
    body: JSON.stringify({
      cliente_nombre: "Mia",
      cliente_contacto: "911111111",
      metodo_pago: "Yape",
      comprobante_referencia: "OP-MANUAL",
    }),
  });
  await request(`/api/admin/pedidos/${orderResponse.data.pedido_id}`, {
    method: "PUT",
    headers: { Cookie: cookie },
    body: JSON.stringify({ estado: "pagado" }),
  });
  const assigned = await request(`/api/admin/pedidos/${orderResponse.data.pedido_id}/asignar-inventario`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify({
      asignaciones_inventario: [
        {
          componente_id: "netflix",
          componente_nombre: "Netflix Premium",
          producto_id: "netflix",
          inventario_id: "INV-NETFLIX-2",
          precio_venta: 14,
          fecha_vencimiento_cliente: "2026-08-10",
        },
        {
          componente_id: "disney",
          componente_nombre: "Disney Premium",
          producto_id: "disney",
          inventario_id: "INV-DISNEY-3",
          precio_venta: 22,
          fecha_vencimiento_cliente: "2026-08-10",
        },
      ],
    }),
  });
  const assignments = assigned.data.order.asignaciones_inventario;
  const inventory = await request("/api/admin/inventario", { headers: { Cookie: cookie } });
  const netflixItem = inventory.data.find((item) => item.inventario_id === "INV-NETFLIX-2");
  const disneyItem = inventory.data.find((item) => item.inventario_id === "INV-DISNEY-3");

  assert.equal(assigned.response.status, 200);
  assert.equal(assignments[0].precio_venta, 14);
  assert.equal(assignments[0].margen_estimado, 5);
  assert.equal(assignments[1].precio_venta, 22);
  assert.equal(assignments[1].margen_estimado, 15);
  assert.equal(netflixItem.precio_venta_sugerido, 14);
  assert.equal(disneyItem.precio_venta_sugerido, 22);
});
