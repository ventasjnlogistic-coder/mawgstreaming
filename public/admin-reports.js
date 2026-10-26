window.mawgReports = (() => {
function getReportRows() {
  const inventoryById = new Map(inventoryItems.map((item) => [item.inventario_id, item]));
  const sales = [];
  const renewalSales = [];
  const unsoldInventory = [];

  orders
    .map(normalizeInventoryOrder)
    .filter((order) => order.estado === "entregado")
    .forEach((order) => {
      const assignments = normalizeOrderAssignments(order.asignaciones_inventario);
      const date = order.fecha_entrega || order.actualizado_en || order.creado_en;
      const channel = order.canal_venta || "web";

      if (assignments.length > 0) {
        assignments.forEach((assignment) => {
          const inventory = inventoryById.get(assignment.inventario_id);
          const revenue = toNumber(assignment.precio_venta);
          const cost = toNumber(assignment.costo_proveedor !== "" ? assignment.costo_proveedor : inventory?.costo_proveedor);
          const margin = assignment.margen_estimado !== "" ? toNumber(assignment.margen_estimado) : revenue - cost;

          sales.push({
            type: "venta",
            date,
            channel,
            product: assignment.componente_nombre || inventory?.producto_nombre || assignment.producto_id || order.producto_nombre || "Producto",
            provider: assignment.proveedor || inventory?.proveedor || order.proveedor || "Sin proveedor",
            revenue,
            cost,
            margin,
          });
        });
        return;
      }

      const revenue = toNumber(order.producto_precio);
      const cost = toNumber(order.costo_proveedor);
      sales.push({
        type: "venta",
        date,
        channel,
        product: order.producto_nombre || order.producto_id || "Producto",
        provider: order.proveedor || "Sin proveedor",
        revenue,
        cost,
        margin: revenue - cost,
      });
    });

  renewals
    .map(normalizeRenewal)
    .filter((renewal) => ["pagado", "renovado"].includes(renewal.estado))
    .forEach((renewal) => {
      const inventory = inventoryById.get(renewal.inventario_id);
      const revenue = toNumber(renewal.monto);
      const cost = toNumber(inventory?.costo_proveedor);

      renewalSales.push({
        type: "renovacion",
        date: renewal.fecha_confirmacion || renewal.fecha_pago || renewal.actualizado_en || renewal.creado_en,
        channel: "renovacion",
        product: renewal.producto_nombre || inventory?.producto_nombre || "Renovacion",
        provider: inventory?.proveedor || "Sin proveedor",
        revenue,
        cost,
        margin: revenue - cost,
      });
    });

  inventoryItems.map(normalizeInventoryItem).filter(isUnsoldInventoryItem).forEach((item) => {
    const product = products.find((entry) => productValueMatches(entry.id || entry.nombre, item.producto_id || item.producto_nombre));
    const cost = toNumber(item.costo_proveedor);
    const potentialRevenue = toNumber(item.precio_venta_sugerido !== "" ? item.precio_venta_sugerido : product?.precio);

    unsoldInventory.push({
      type: "inventario",
      date: item.fecha_compra || item.creado_en,
      channel: "stock",
      product: item.producto_nombre || product?.nombre || item.producto_id || "Producto",
      provider: item.proveedor || "Sin proveedor",
      revenue: potentialRevenue,
      cost,
      margin: potentialRevenue - cost,
      status: item.estado || "disponible",
    });
  });

  return { sales, renewalSales, unsoldInventory, all: [...sales, ...renewalSales] };
}

function isUnsoldInventoryItem(item) {
  const status = String(item.estado || "").toLowerCase();

  if (item.pedido_id || status === "ocupado" || status === "baja") {
    return false;
  }

  return true;
}

function groupReportRows(rows, keyGetter) {
  return rows.reduce((groups, row) => {
    const key = keyGetter(row) || "Sin dato";
    const current = groups.get(key) || { label: key, count: 0, revenue: 0, cost: 0, margin: 0 };
    current.count += 1;
    current.revenue += row.revenue;
    current.cost += row.cost;
    current.margin += row.margin;
    groups.set(key, current);
    return groups;
  }, new Map());
}

function sortReportGroups(groups) {
  return [...groups.values()].sort((left, right) => right.margin - left.margin || right.revenue - left.revenue || left.label.localeCompare(right.label));
}

function getMonthDateRange(offset = 0) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const end = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return { start, end };
}

function getReportFilters() {
  const period = reportPeriodFilter?.value || "current-month";
  let range = null;

  if (period === "current-month") {
    range = getMonthDateRange(0);
  } else if (period === "last-month") {
    range = getMonthDateRange(-1);
  } else if (period === "custom") {
    range = {
      start: getDateOnly(reportStartDate?.value),
      end: getDateOnly(reportEndDate?.value),
    };
  }

  return {
    period,
    range,
    provider: reportProviderFilter?.value || "",
    channel: reportChannelFilter?.value || "",
  };
}

function isReportDateInRange(value, range) {
  if (!range || (!range.start && !range.end)) {
    return true;
  }

  const date = getDateOnly(value);

  if (!date) {
    return false;
  }

  if (range.start && date < range.start) {
    return false;
  }

  if (range.end && date > range.end) {
    return false;
  }

  return true;
}

function filterReportMovementRows(rows, filters) {
  return rows.filter((row) => {
    const matchesDate = isReportDateInRange(row.date, filters.range);
    const matchesProvider = !filters.provider || row.provider === filters.provider;
    const matchesChannel = !filters.channel || row.channel === filters.channel;
    return matchesDate && matchesProvider && matchesChannel;
  });
}

function filterReportInventoryRows(rows, filters) {
  return rows.filter((row) => !filters.provider || row.provider === filters.provider);
}

function renderReportFilterOptions(rows) {
  const currentProvider = reportProviderFilter?.value || "";
  const currentChannel = reportChannelFilter?.value || "";
  const providers = [...new Set([...rows.sales, ...rows.renewalSales, ...rows.unsoldInventory].map((row) => row.provider).filter(Boolean))].sort();
  const channels = [...new Set([...rows.sales, ...rows.renewalSales].map((row) => row.channel).filter(Boolean))].sort();

  if (reportProviderFilter) {
    reportProviderFilter.innerHTML = [
      '<option value="">Todos los proveedores</option>',
      ...providers.map((provider) => `<option value="${escapeHtml(provider)}">${escapeHtml(provider)}</option>`),
    ].join("");
    reportProviderFilter.value = providers.includes(currentProvider) ? currentProvider : "";
  }

  if (reportChannelFilter) {
    reportChannelFilter.innerHTML = [
      '<option value="">Todos los canales</option>',
      ...channels.map((channel) => `<option value="${escapeHtml(channel)}">${escapeHtml(channel)}</option>`),
    ].join("");
    reportChannelFilter.value = channels.includes(currentChannel) ? currentChannel : "";
  }
}

function renderReportRows(container, groups, emptyMessage, columns) {
  if (!container) {
    return;
  }

  if (groups.length === 0) {
    container.innerHTML = `<tr><td colspan="${columns}" class="report-empty">${escapeHtml(emptyMessage)}</td></tr>`;
    return;
  }

  container.innerHTML = groups
    .map(
      (group) => `
        <tr>
          <td>${escapeHtml(group.label)}</td>
          <td>${escapeHtml(group.count)}</td>
          <td>${escapeHtml(formatReportMoney(group.revenue))}</td>
          ${columns >= 5 ? `<td>${escapeHtml(formatReportMoney(group.cost))}</td>` : ""}
          <td class="${group.margin < 0 ? "is-negative" : "is-positive"}">${escapeHtml(formatReportMoney(group.margin))}</td>
        </tr>
      `
    )
    .join("");
}

function renderReportView() {
  const rows = getReportRows();
  renderReportFilterOptions(rows);
  const filters = getReportFilters();
  const filteredSales = filterReportMovementRows(rows.sales, filters);
  const filteredRenewals = filterReportMovementRows(rows.renewalSales, filters);
  const filteredInventory = filterReportInventoryRows(rows.unsoldInventory, filters);
  const filteredMovements = [...filteredSales, ...filteredRenewals];
  const totalRevenue = sumMoney(filteredMovements.map((row) => row.revenue));
  const totalCost = sumMoney(filteredMovements.map((row) => row.cost));
  const totalMargin = sumMoney(filteredMovements.map((row) => row.margin));
  const unsoldInventoryCost = sumMoney(filteredInventory.map((row) => row.cost));
  const unsoldInventoryPotential = sumMoney(filteredInventory.map((row) => row.revenue));
  const unsoldInventoryMargin = sumMoney(filteredInventory.map((row) => row.margin));
  const realizedHistoricMargin = sumMoney(filteredMovements.map((row) => row.margin));
  const adjustedMargin = realizedHistoricMargin - unsoldInventoryCost;

  if (reportsUpdated) {
    reportsUpdated.textContent = `Actualizado ${new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`;
  }

  if (reportsSummary) {
    reportsSummary.innerHTML = [
      renderDashboardCard({ label: "Ingresos periodo", value: formatReportMoney(totalRevenue), hint: `${filteredMovements.length} movimientos`, target: "reportes", tone: "ok" }),
      renderDashboardCard({ label: "Costos periodo", value: formatReportMoney(totalCost), hint: "Costo proveedor estimado", target: "reportes", tone: totalCost ? "warning" : "neutral" }),
      renderDashboardCard({ label: "Margen periodo", value: formatReportMoney(totalMargin), hint: "Ventas + renovaciones", target: "reportes", tone: totalMargin >= 0 ? "ok" : "danger" }),
      renderDashboardCard({ label: "Stock no vendido", value: formatReportMoney(unsoldInventoryCost), hint: `${filteredInventory.length} cuentas actuales`, target: "inventario", tone: unsoldInventoryCost ? "warning" : "ok" }),
      renderDashboardCard({ label: "Venta potencial", value: formatReportMoney(unsoldInventoryPotential), hint: `Margen pot. ${formatReportMoney(unsoldInventoryMargin)}`, target: "inventario", tone: "neutral" }),
      renderDashboardCard({ label: "Margen ajustado", value: formatReportMoney(adjustedMargin), hint: "Margen periodo - stock actual", target: "reportes", tone: adjustedMargin >= 0 ? "ok" : "danger" }),
      renderDashboardCard({ label: "Ventas nuevas", value: filteredSales.length, hint: formatReportMoney(sumMoney(filteredSales.map((row) => row.revenue))), target: "compras", tone: "neutral" }),
      renderDashboardCard({ label: "Renovaciones", value: filteredRenewals.length, hint: formatReportMoney(sumMoney(filteredRenewals.map((row) => row.revenue))), target: "renovaciones", tone: "neutral" }),
      renderDashboardCard({ label: "Margen realizado", value: formatReportMoney(realizedHistoricMargin), hint: `${filteredMovements.length} movimientos filtrados`, target: "reportes", tone: "neutral" }),
    ].join("");
  }

  renderReportRows(reportProductRows, sortReportGroups(groupReportRows(filteredSales, (row) => row.product)).slice(0, 12), "No hay ventas entregadas con los filtros actuales.", 5);
  renderReportRows(reportChannelRows, sortReportGroups(groupReportRows(filteredSales, (row) => row.channel)).slice(0, 12), "No hay canales con ventas en los filtros actuales.", 4);
  renderReportRows(reportProviderRows, sortReportGroups(groupReportRows(filteredSales, (row) => row.provider)).slice(0, 12), "No hay proveedores vinculados a ventas con los filtros actuales.", 5);
  renderReportRows(reportRenewalRows, sortReportGroups(groupReportRows(filteredRenewals, (row) => row.product)).slice(0, 12), "No hay renovaciones pagadas o renovadas con los filtros actuales.", 4);
  renderReportRows(reportInventoryRows, sortReportGroups(groupReportRows(filteredInventory, (row) => row.product)).slice(0, 12), "No hay cuentas no vendidas para costear con los filtros actuales.", 5);
}

return { render: renderReportView };
})();
