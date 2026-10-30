const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../public/admin.js"), "utf8");
const code = source.slice(source.indexOf("function buildWhatsAppUrl(contact, message) {"), source.indexOf("\nfunction sumMoney("));
function build(navigator, contact = "51999999999", message = "Hola :check:\nRenovacion & pago + perfil") {
  const context = vm.createContext({
    navigator, URLSearchParams,
    normalizePhone: (value) => value,
    renderWhatsAppEmojis: (message) => message.replace(":check:", "✅"),
  });
  vm.runInContext(code, context);
  return context.buildWhatsAppUrl(contact, message);
}

for (const agent of ["Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "Mozilla/5.0 (X11; Linux x86_64)"]) {
  test(`escritorio usa enlace HTTPS de chat: ${agent}`, () => {
    const url = new URL(build({ userAgent: agent }));
    assert.equal(url.protocol, "https:");
    assert.equal(url.hostname, "web.whatsapp.com");
    assert.equal(url.pathname, "/send");
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
  test(`movil usa enlace HTTPS de chat: ${JSON.stringify(navigator)}`, () => {
    const url = new URL(build(navigator));
    assert.equal(url.protocol, "https:");
    assert.equal(url.hostname, "wa.me");
    assert.equal(url.pathname, "/51999999999");
    assert.equal(url.searchParams.get("text"), "Hola ✅\nRenovacion & pago + perfil");
  });
}
test("no genera enlace si falta el contacto", () => {
  assert.equal(build({ userAgent: "desktop" }, ""), "");
});

test("preserva emojis Unicode compuestos y tildes al crear enlace de WhatsApp", () => {
  const message = "⚠️ Alerta 👁️‍🗨️ renovación 🫰 🫱🏼‍🫲🏼";
  const url = new URL(build({ userAgent: "desktop" }, "51999999999", message));

  assert.equal(url.searchParams.get("text"), message);
  assert.equal(url.searchParams.get("text").includes("\uFFFD"), false);
});

function launchHarness(mode) {
  const notices = [];
  const popup = {};
  const element = () => ({ children: [], setAttribute() {}, addEventListener(type, fn) { this[type] = fn; },
    append(...children) { this.children.push(...children); }, focus() { this.focused = true; }, remove() { this.removed = true; } });
  const context = vm.createContext({
    window: { open: () => { if (mode === 'throws') throw new Error('blocked'); return mode === 'opens' ? popup : null; } },
    document: { querySelector: () => notices.find(notice => !notice.removed), createElement: element,
      body: { appendChild: notice => notices.push(notice) } },
  });
  const start = source.indexOf('function openWhatsAppLink(href) {');
  vm.runInContext(source.slice(start, source.indexOf('\nfunction renderAssignmentFinancials(', start)), context);
  return { context, notices, popup };
}
test('apertura normal elimina acceso al panel mediante opener', () => {
  const h = launchHarness('opens');
  assert.equal(h.context.openWhatsAppLink('https://wa.me/51999999999?text=Hola'), true);
  assert.equal(h.popup.opener, null);
  assert.equal(h.notices.length, 0);
});
for (const mode of ['blocked', 'throws']) {
  test(`ventana ${mode}: ofrece enlace con mensaje y permite cerrarlo`, () => {
    const h = launchHarness(mode);
    const url = 'https://wa.me/51999999999?text=Mi%20plantilla';
    assert.equal(h.context.openWhatsAppLink(url), true);
    const notice = h.notices[0], link = notice.children[1];
    assert.equal(link.href, url);
    assert.equal(link.target, '_blank');
    assert.equal(link.rel, 'noopener noreferrer');
    assert.equal(link.focused, true);
    h.context.openWhatsAppLink(url);
    assert.equal(notice.removed, true);
    h.notices[1].children[2].click();
    assert.equal(h.notices[1].removed, true);
  });
}
test('sin contacto no abre ventana ni muestra enlace', () => {
  const h = launchHarness('blocked');
  assert.equal(h.context.openWhatsAppLink(''), false);
  assert.equal(h.notices.length, 0);
});

test("sin informacion del dispositivo usa WhatsApp Web y conserva el mensaje", () => {
  const url = new URL(build(undefined));
  assert.equal(url.hostname, "web.whatsapp.com");
  assert.equal(url.searchParams.get("text"), "Hola ✅\nRenovacion & pago + perfil");
});
