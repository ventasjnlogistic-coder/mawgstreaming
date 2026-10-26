const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../public/admin.js"), "utf8");
const code = source.slice(source.indexOf("function buildWhatsAppUrl(contact, message) {"), source.indexOf("\nfunction sumMoney("));
function build(navigator, contact = "51999999999") {
  const context = vm.createContext({
    navigator, URLSearchParams,
    normalizePhone: (value) => value,
    renderWhatsAppEmojis: (message) => message.replace(":check:", "✅"),
  });
  vm.runInContext(code, context);
  return context.buildWhatsAppUrl(contact, "Hola :check:\nRenovacion & pago + perfil");
}

for (const agent of ["Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "Mozilla/5.0 (X11; Linux x86_64)"]) {
  test(`escritorio abre la aplicacion: ${agent}`, () => {
    const url = new URL(build({ userAgent: agent }));
    assert.equal(url.protocol, "whatsapp:");
    assert.equal(url.hostname, "send");
    assert.equal(url.searchParams.get("phone"), "51999999999");
    assert.equal(url.searchParams.get("text"), "Hola ✅\nRenovacion & pago + perfil");
  });
}
for (const navigator of [
  { userAgent: "Mozilla/5.0 (Linux; Android 14)" },
  { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)" },
  { userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0)" },
  { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", maxTouchPoints: 5 },
  { userAgent: "", userAgentData: { mobile: true } },
]) {
  test(`movil abre la aplicacion: ${JSON.stringify(navigator)}`, () => {
    const url = new URL(build(navigator));
    assert.equal(url.protocol, "whatsapp:");
    assert.equal(url.hostname, "send");
    assert.equal(url.searchParams.get("phone"), "51999999999");
    assert.equal(url.searchParams.get("text"), "Hola ✅\nRenovacion & pago + perfil");
  });
}
test("no genera enlace si falta el contacto", () => {
  assert.equal(build({ userAgent: "desktop" }, ""), "");
});
