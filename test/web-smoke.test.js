const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

process.env.NODE_ENV = "test";
process.env.ADMIN_USER = "web-admin";
process.env.ADMIN_PASSWORD = "web-secret";
process.env.SESSION_SECRET = "web-smoke-session-secret-with-enough-length";
process.env.CATALOG_STORAGE = "json";
process.env.SESSION_STORE = "memory";

let server;
let baseUrl;
let tempDir;
let authCookie;

async function fetchText(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    redirect: "manual",
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });
  return { response, text: await response.text() };
}

function extractLocalAssetReferences(html) {
  const refs = [];
  const patterns = [
    /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g,
    /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g,
    /<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/g,
  ];
  let match;

  for (const pattern of patterns) {
    while ((match = pattern.exec(html))) {
      const value = match[1];

      if (!value || value.startsWith("http://") || value.startsWith("https://")) {
        continue;
      }

      refs.push(value.startsWith("/") ? value : `/${value}`);
    }
  }

  return [...new Set(refs)];
}

test.before(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "streamhub-web-"));
  process.env.CATALOG_JSON_PATH = path.join(tempDir, "productos.json");
  process.env.ORDERS_JSON_PATH = path.join(tempDir, "pedidos.json");
  process.env.INVENTORY_JSON_PATH = path.join(tempDir, "inventario.json");
  process.env.RENEWALS_JSON_PATH = path.join(tempDir, "renovaciones.json");

  await fs.writeFile(
    process.env.CATALOG_JSON_PATH,
    `${JSON.stringify(
      [
        {
          id: "netflix",
          nombre: "Netflix Premium",
          precio: 20,
          estado: "disponible",
          imagen: "assets/images/Netflix.jpg",
        },
        {
          id: "disney",
          nombre: "Disney Premium",
          precio: 25,
          estado: "disponible",
          imagen: "assets/images/DisneyPre.jpg",
        },
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
          inventario_id: "INV-NETFLIX-1",
          producto_id: "netflix",
          producto_nombre: "Netflix Premium",
          proveedor: "Proveedor",
          estado: "disponible",
        },
        {
          inventario_id: "INV-DISNEY-1",
          producto_id: "disney",
          producto_nombre: "Disney Premium",
          proveedor: "Proveedor",
          estado: "disponible",
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

  const loginResponse = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario: "web-admin", password: "web-secret" }),
  });
  authCookie = loginResponse.headers.get("set-cookie").split(";")[0];
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await fs.rm(tempDir, { recursive: true, force: true });
});

test("no hay recursos publicos rotos en tienda, login y admin", async () => {
  const pages = [
    { path: "/", cookie: "" },
    { path: "/login.html", cookie: "" },
    { path: "/admin.html", cookie: authCookie },
  ];

  for (const page of pages) {
    const { response, text } = await fetchText(page.path, page.cookie ? { headers: { Cookie: page.cookie } } : {});
    assert.equal(response.status, 200, `${page.path} debe cargar`);

    for (const ref of extractLocalAssetReferences(text)) {
      const headers = page.cookie && ref === "/admin.js" ? { Cookie: page.cookie } : {};
      const resource = await fetch(`${baseUrl}${ref}`, { headers });
      assert.equal(resource.status, 200, `${page.path} referencia ${ref}`);
    }
  }
});

test("scripts publicos cargan y la tienda no usa alert", async () => {
  const script = await fetchText("/script.js");
  const loginScript = await fetchText("/login.js");
  const adminScript = await fetchText("/admin.js", { headers: { Cookie: authCookie } });

  assert.equal(script.response.status, 200);
  assert.equal(loginScript.response.status, 200);
  assert.equal(adminScript.response.status, 200);
  assert.doesNotMatch(script.text, /\balert\s*\(/);
});

test("imagenes configuradas en catalogo existen en public/assets", async () => {
  const response = await fetch(`${baseUrl}/api/productos`);
  const products = await response.json();

  assert.equal(response.status, 200);
  assert.ok(products.length >= 2);

  for (const product of products) {
    if (!product.imagen || product.imagen.startsWith("http")) {
      continue;
    }

    const imageResponse = await fetch(`${baseUrl}/${product.imagen.replace(/^\/+/, "")}`);
    assert.equal(imageResponse.status, 200, `${product.imagen} debe existir`);
    assert.match(imageResponse.headers.get("content-type") || "", /^image\//);
  }
});
