const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/admin.js'), 'utf8');
function element() {
  return { hidden: false, children: [], events: {}, setAttribute() {},
    append(...nodes) { this.children.push(...nodes); },
    insertAdjacentElement(position, node) { this.nav = node; },
    addEventListener(type, handler) { this.events[type] = handler; },
  };
}
function paging() {
  const timers = new Map(); let timerId = 0;
  const context = vm.createContext({ document: { createElement: element }, window: {
    setTimeout(fn) { timers.set(++timerId, fn); return timerId; },
    clearTimeout(id) { timers.delete(id); },
  } });
  vm.runInContext(source.slice(source.indexOf('const adminListPages ='), source.indexOf('function renderList()')), context);
  return { context, timers };
}
test('paginacion conserva todos los datos, cambia de pagina y reinicia al filtrar', () => {
  const { context: c } = paging(); const container = element();
  const items = Array.from({ length: 65 }, (_, i) => i); const filter = { value: '' }; let visible;
  const render = () => { visible = c.paginateAdminList(container, items, render, [filter]); };
  render(); assert.equal(visible.length, 30); assert.equal(items.length, 65);
  const [previous, label, next] = container.nav.children;
  assert.equal(previous.disabled, true);
  next.events.click(); assert.equal(visible[0], 30);
  next.events.click(); assert.equal(visible.length, 5); assert.equal(next.disabled, true);
  filter.value = 'cliente'; render(); assert.equal(visible[0], 0);
  assert.equal(label.textContent.includes('1/3'), true);
});
test('pagina se ajusta al reducir registros y oculta controles sin resultados', () => {
  const { context: c } = paging(); const container = element();
  let items = Array.from({ length: 40 }, (_, i) => i), visible;
  const render = () => { visible = c.paginateAdminList(container, items, render); };
  render(); container.nav.children[2].events.click();
  items = [1, 2]; render(); assert.equal(visible.length, 2); assert.equal(container.nav.hidden, true);
  items = []; render(); assert.equal(visible.length, 0); assert.equal(container.nav.hidden, true);
});
test('busqueda agrupa pulsaciones y procesa el ultimo valor', () => {
  const { context: c, timers } = paging(); const calls = [];
  const search = c.debounceAdminSearch(value => calls.push(value));
  search('n'); search('ne'); search('netflix');
  assert.equal(timers.size, 1); [...timers.values()][0]();
  assert.deepEqual(calls, ['netflix']);
});
test('reportes no descarga codigo estando oculto y permite reintentar errores', async () => {
  const scripts = [], view = { hidden: true }, errors = [];
  const window = {};
  const context = vm.createContext({ window, userCanView: () => true,
    document: { querySelector: () => view, createElement: () => ({}), head: { appendChild: script => scripts.push(script) } },
    setStatus: message => errors.push(message),
  });
  vm.runInContext(source.slice(source.indexOf('let adminReportsLoading ='), source.indexOf('async function runWithConcurrency(')), context);
  context.renderReports(); assert.equal(scripts.length, 0);
  const first = context.loadAdminReports(), shared = context.loadAdminReports();
  assert.equal(first, shared); assert.equal(scripts.length, 1);
  scripts[0].onerror(); await assert.rejects(first);
  const retry = context.loadAdminReports(); assert.equal(scripts.length, 2);
  let renders = 0; window.mawgReports = { render: () => renders++ };
  scripts[1].onload(); await retry;
  view.hidden = false; context.renderReports(); assert.equal(renders, 1);
});
for (const file of ['admin-reports.js', 'dist/admin-reports.js']) {
  test(`reportes calcula ventas y renovaciones con datos completos: ${file}`, () => {
    const summary = {}, table = {};
    const c = vm.createContext({ window: {},
      orders: [{ estado: 'entregado', producto_precio: 20, costo_proveedor: 4, creado_en: '2026-10-01', producto_nombre: 'Netflix' }],
      inventoryItems: [{ inventario_id: 'a', estado: 'ocupado', costo_proveedor: 3 }],
      renewals: [{ estado: 'renovado', inventario_id: 'a', monto: 10, producto_nombre: 'Netflix' }], products: [],
      normalizeInventoryOrder: x => x, normalizeRenewal: x => x, normalizeInventoryItem: x => x,
      normalizeOrderAssignments: () => [], toNumber: x => Number(x || 0), productValueMatches: () => false,
      sumMoney: values => values.reduce((a,b) => a+b, 0), formatReportMoney: String,
      renderDashboardCard: card => card.label + ':' + card.value,
      escapeHtml: String, getDateOnly: () => null,
      reportPeriodFilter: { value: 'all' }, reportStartDate: null, reportEndDate: null,
      reportProviderFilter: null, reportChannelFilter: null,
      reportsUpdated: {}, reportsSummary: summary,
      reportProductRows: table, reportChannelRows: null, reportProviderRows: null, reportRenewalRows: null, reportInventoryRows: null,
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../public', file), 'utf8'), c);
    c.window.mawgReports.render();
    assert.match(summary.innerHTML, /Ingresos periodo:30/);
    assert.match(summary.innerHTML, /Costos periodo:7/);
    assert.match(summary.innerHTML, /Margen periodo:23/);
    assert.match(table.innerHTML, /Netflix/);
  });
}
