const menuButton = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const paymentModal = document.querySelector("#paymentModal");
const productCatalog = document.querySelector("#productCatalog");
const closeModalButtons = document.querySelectorAll("[data-close-modal]");
let paymentTabs = document.querySelectorAll(".payment-tab");
let paymentPanels = document.querySelectorAll(".payment-panel");
const selectedProductText = document.querySelector("#selectedProductText");
const selectedOrderText = document.querySelector("#selectedOrderText");
const proofLinks = document.querySelectorAll(".whatsapp-proof");
const proofForm = document.querySelector("#proofForm");
const proofStatus = document.querySelector("#proofStatus");
const proofMessage = document.querySelector("#proofMessage");
const storefrontStatus = document.querySelector("#storefrontStatus");

const whatsappNumber = "51901125483";
let selectedProduct = "";
let selectedProductId = "";
let selectedPrice = "";
let selectedMethod = "yape";
let currentOrder = null;
let lastFocusedElement = null;
let paymentLabels = {
  yape: "Yape",
  plin: "Plin",
  transferencia: "Transferencia bancaria",
};

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

menuButton?.addEventListener("click", () => {
  const isOpen = navLinks?.classList.toggle("is-open") ?? false;
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

navLinks?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    navLinks.classList.remove("is-open");
    menuButton?.setAttribute("aria-expanded", "false");
  }
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizePaymentMethod(method) {
  return {
    id: String(method.id || method.nombre || "").trim(),
    nombre: String(method.nombre || method.id || "Metodo de pago").trim(),
    tipo: String(method.tipo || "billetera").trim(),
    titular: String(method.titular || "").trim(),
    numero: String(method.numero || "").trim(),
    cci: String(method.cci || "").trim(),
    banco: String(method.banco || "").trim(),
    qr_imagen: String(method.qr_imagen || "").trim(),
    instrucciones: String(method.instrucciones || "").trim(),
    orden: Number(method.orden || 999),
  };
}

function formatPrice(price) {
  if (typeof price === "number") {
    return `S/ ${price}`;
  }

  return price ? String(price) : "Consultar";
}

function normalizeState(state) {
  return String(state ?? "disponible").toLowerCase();
}

function showStorefrontMessage(message, isError = false) {
  if (!storefrontStatus) {
    return;
  }

  storefrontStatus.textContent = message;
  storefrontStatus.classList.toggle("is-error", isError);
}

function renderProductCard(product) {
  const estado = normalizeState(product.estado);
  const stock = Number(product.stock_disponible || 0);
  const venderSinStock = String(product.vender || "").trim().toLowerCase() === "si";
  const disponible = estado === "disponible" && (stock > 0 || venderSinStock);
  const precio = formatPrice(product.precio);
  const cta = product.cta || "Comprar";
  const estadoTexto = stock > 0 ? `Stock: ${stock}` : venderSinStock ? "Sin stock, venta activa" : "Agotado";
  const imagen = product.imagen
    ? `<img src="${escapeHtml(product.imagen)}" alt="${escapeHtml(product.nombre)}" loading="lazy" />`
    : `<div class="product-placeholder" aria-hidden="true">${escapeHtml(product.tipo || "Producto")}</div>`;

  return `
    <article class="product-card ${disponible ? "" : "is-sold-out"}" data-product-id="${escapeHtml(product.id)}">
      <div class="product-media">${imagen}</div>
      <div class="product-meta">
        ${product.badge ? `<span class="tag">${escapeHtml(product.badge)}</span>` : ""}
        <span class="status-pill product-status">${estadoTexto}</span>
      </div>
      <h3>${escapeHtml(product.nombre)}</h3>
      <p class="product-type">${escapeHtml(product.categoria || product.tipo || "Producto digital")}</p>
      <p>${escapeHtml(product.descripcion)}</p>
      <div class="price">${escapeHtml(precio)} <span>precio</span></div>
      <button
        class="button button-primary buy-button"
        type="button"
        data-product="${escapeHtml(product.nombre)}"
        data-product-id="${escapeHtml(product.id)}"
        data-price="${escapeHtml(precio)}"
        ${disponible ? "" : "disabled"}
      >
        ${disponible ? escapeHtml(cta) : "Agotado"}
      </button>
    </article>
  `;
}

function wireBuyButtons() {
  document.querySelectorAll(".buy-button").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) {
        return;
      }

      openPaymentModal({
        producto_id: button.dataset.productId ?? "",
        producto_nombre: button.dataset.product ?? "Producto",
        producto_precio: button.dataset.price ?? "",
        estado: "pendiente de pago",
      });
    });
  });
}

async function apiRequest(url, options = {}) {
  const headers = options.body instanceof FormData
    ? options.headers || {}
    : {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      };
  const response = await fetch(url, {
    headers,
    ...options,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "No se pudo completar la operacion.");
  }

  return response.json();
}

async function createOrder(payload) {
  return apiRequest("/api/pedidos", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function loadProducts() {
  if (!productCatalog) {
    return;
  }

  productCatalog.innerHTML = '<p class="catalog-message">Cargando productos...</p>';
  showStorefrontMessage("");

  try {
    const response = await fetch("/api/productos", { cache: "no-store" });

    if (!response.ok) {
      throw new Error("No se pudo cargar el catalogo");
    }

    const products = await response.json();

    if (!Array.isArray(products) || products.length === 0) {
      productCatalog.innerHTML = '<p class="catalog-message">No hay productos publicados por ahora.</p>';
      return;
    }

    productCatalog.innerHTML = products.map(renderProductCard).join("");
    showStorefrontMessage("");
    wireBuyButtons();
  } catch {
    productCatalog.innerHTML =
      '<p class="catalog-message">No se pudo cargar el catalogo. Revisa que el servidor local este activo.</p>';
    showStorefrontMessage("No pudimos actualizar los productos. Intenta recargar la pagina.", true);
  }
}

function buildWhatsAppMessage() {
  const productLine = selectedProduct
    ? `${selectedProduct}${selectedPrice ? ` - ${selectedPrice}` : ""}`
    : "Producto por confirmar";
  const orderLine = currentOrder?.pedido_id ? ` Pedido: ${currentOrder.pedido_id}.` : "";

  return `Hola, envie mi comprobante de pago por ${paymentLabels[selectedMethod]}. Producto: ${productLine}.${orderLine} Por favor validar mi pedido.`;
}

function openWhatsApp(message) {
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

function renderPaymentPanel(method) {
  const detailRows = [
    method.numero ? ["Numero", method.numero, true] : null,
    method.titular ? ["Titular", method.titular] : null,
    method.banco ? ["Banco", method.banco] : null,
    method.cci ? ["CCI", method.cci, true] : null,
  ]
    .filter(Boolean)
    .map(
      ([label, value, copyable]) => `
        <div class="payment-detail">
          <span>${escapeHtml(label)}</span>
          <strong ${copyable ? "data-payment-number" : ""}>${escapeHtml(value)}</strong>
        </div>
      `
    )
    .join("");
  const copyTarget = method.numero || method.cci || "";

  return `
    <article class="payment-panel" data-panel="${escapeHtml(method.id)}" aria-hidden="true">
      <div class="payment-card">
        <div>
          <p class="payment-label">Paga con ${escapeHtml(method.nombre)}</p>
          <h3>${escapeHtml(method.nombre)}</h3>
          <p class="payment-help">${escapeHtml(method.instrucciones || "Realiza el pago y adjunta tu comprobante para validarlo.")}</p>
        </div>
        ${method.qr_imagen ? `<img class="qr-image" src="${escapeHtml(method.qr_imagen)}" alt="QR ${escapeHtml(method.nombre)}" loading="lazy" />` : ""}
        ${detailRows}
        ${
          copyTarget
            ? `<div class="payment-actions">
                <button class="button button-secondary copy-payment" type="button" data-copy-number="${escapeHtml(copyTarget)}">
                  Copiar datos
                </button>
                <span class="copy-status" aria-live="polite"></span>
              </div>`
            : '<span class="copy-status" aria-live="polite"></span>'
        }
      </div>
    </article>
  `;
}

function wireCopyButtons() {
  document.querySelectorAll(".copy-payment").forEach((button) => {
    button.addEventListener("click", async () => {
      const number = button.dataset.copyNumber ?? "";
      const status = button.closest(".payment-card")?.querySelector(".copy-status");

      try {
        await navigator.clipboard.writeText(number);
        if (status) {
          status.textContent = "Datos copiados";
        }
      } catch {
        if (status) {
          status.textContent = "No se pudo copiar. Copia el dato visible.";
        }
      }
    });
  });
}

function wirePaymentTabs() {
  paymentTabs = document.querySelectorAll(".payment-tab");
  paymentPanels = document.querySelectorAll(".payment-panel");
  paymentTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setPaymentMethod(tab.dataset.method ?? selectedMethod);
    });
  });
}

function renderPaymentMethods(methods) {
  const normalized = methods.map(normalizePaymentMethod).filter((method) => method.id && method.nombre);
  const activeMethods = normalized.length ? normalized : Object.entries(paymentLabels).map(([id, nombre], index) => ({ id, nombre, orden: index + 1 }));
  const sortedMethods = activeMethods.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
  const tabsContainer = paymentModal?.querySelector(".payment-tabs");
  const panelsContainer = paymentModal?.querySelector(".payment-panels");

  paymentLabels = sortedMethods.reduce((labels, method) => {
    labels[method.id] = method.nombre;
    return labels;
  }, {});

  selectedMethod = sortedMethods[0]?.id || selectedMethod;

  if (tabsContainer && panelsContainer) {
    tabsContainer.innerHTML = sortedMethods
      .map(
        (method) => `
          <button class="payment-tab" type="button" data-method="${escapeHtml(method.id)}" role="tab" aria-selected="false">
            ${escapeHtml(method.nombre)}
          </button>
        `
      )
      .join("");
    panelsContainer.innerHTML = sortedMethods.map(renderPaymentPanel).join("");
  }

  wirePaymentTabs();
  wireCopyButtons();
  setPaymentMethod(selectedMethod);
}

async function loadPaymentMethods() {
  try {
    const methods = await apiRequest("/api/metodos-pago");
    renderPaymentMethods(Array.isArray(methods) ? methods : []);
  } catch {
    wirePaymentTabs();
    wireCopyButtons();
    setPaymentMethod(selectedMethod);
  }
}

function setPaymentMethod(method) {
  selectedMethod = method;

  paymentTabs.forEach((tab) => {
    const isActive = tab.dataset.method === method;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  paymentPanels.forEach((panel) => {
    const isActive = panel.dataset.panel === method;
    panel.classList.toggle("is-active", isActive);
    panel.setAttribute("aria-hidden", String(!isActive));
  });

  document.querySelectorAll(".copy-status").forEach((status) => {
    status.textContent = "";
  });

  if (proofStatus && currentOrder?.estado) {
    proofStatus.textContent = currentOrder.estado;
  }
}

function openPaymentModal(order) {
  lastFocusedElement = document.activeElement;
  currentOrder = order;
  selectedProductId = order.producto_id || "";
  selectedProduct = order.producto_nombre || "Producto";
  selectedPrice = formatPrice(order.producto_precio);

  if (selectedProductText) {
    selectedProductText.textContent = `${selectedProduct} | ${selectedPrice}`;
  }

  if (selectedOrderText) {
    selectedOrderText.textContent = "Completa tus datos y adjunta el pago para generar el pedido.";
  }

  if (proofForm) {
    proofForm.reset();
  }

  if (proofStatus) {
    proofStatus.textContent = "pendiente de registro";
  }

  if (proofMessage) {
    proofMessage.textContent = "";
  }

  setPaymentMethod(selectedMethod);
  paymentModal?.classList.add("is-open");
  paymentModal?.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  paymentModal?.querySelector(focusableSelector)?.focus();
}

function closePaymentModal() {
  paymentModal?.classList.remove("is-open");
  paymentModal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");

  if (lastFocusedElement instanceof HTMLElement) {
    lastFocusedElement.focus();
  }
}

function showProofForm() {
  if (!selectedProductId) {
    showStorefrontMessage("Primero elige un producto.", true);
    return;
  }

  proofForm?.scrollIntoView({ behavior: "smooth", block: "start" });
  proofForm?.querySelector("input, textarea")?.focus({ preventScroll: true });
}

closeModalButtons.forEach((button) => {
  button.addEventListener("click", closePaymentModal);
});

proofLinks.forEach((button) => {
  button.addEventListener("click", showProofForm);
});

proofForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedProductId) {
    if (proofMessage) {
      proofMessage.textContent = "Primero elige un producto.";
    }
    return;
  }

  const submitButton = proofForm.querySelector('button[type="submit"]');
  const formData = new FormData(proofForm);
  const file = formData.get("comprobante_archivo");

  if (!(file instanceof File) || !file.name) {
    if (proofMessage) {
      proofMessage.textContent = "Adjunta una imagen o PDF del comprobante.";
      proofMessage.classList.add("is-error");
    }
    return;
  }

  formData.set("metodo_pago", selectedMethod);

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Generando pedido...";
  }
  if (proofMessage) {
    proofMessage.textContent = "Guardando comprobante...";
    proofMessage.classList.remove("is-error");
  }

  try {
    const order = currentOrder?.pedido_id
      ? currentOrder
      : await createOrder({
          producto_id: selectedProductId,
          producto_nombre: selectedProduct,
          producto_precio: selectedPrice,
        });
    currentOrder = order;

    if (selectedOrderText) {
      selectedOrderText.textContent = `Pedido ${order.pedido_id}`;
    }

    currentOrder = await apiRequest(`/api/pedidos/${encodeURIComponent(order.pedido_id)}/comprobante`, {
      method: "POST",
      body: formData,
    });

    if (proofStatus) {
      proofStatus.textContent = currentOrder.estado;
    }

    if (proofMessage) {
      proofMessage.textContent = `Pedido ${currentOrder.pedido_id} generado y comprobante registrado.`;
      proofMessage.classList.remove("is-error");
    }

    openWhatsApp(buildWhatsAppMessage());
  } catch (error) {
    if (proofMessage) {
      proofMessage.textContent = error.message || "No se pudo guardar el comprobante.";
      proofMessage.classList.add("is-error");
    }
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Generar pedido y enviar comprobante";
    }
  }
});

document.addEventListener("keydown", (event) => {
  if (!paymentModal?.classList.contains("is-open")) {
    return;
  }

  if (event.key === "Escape") {
    closePaymentModal();
    return;
  }

  if (event.key === "Tab") {
    const focusable = [...paymentModal.querySelectorAll(focusableSelector)].filter((element) => element.offsetParent !== null);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!first || !last) {
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

loadPaymentMethods();
loadProducts();
