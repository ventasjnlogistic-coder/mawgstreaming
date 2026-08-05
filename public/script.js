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
const salesContactLink = document.querySelector("#salesContactLink");
const supportContactLink = document.querySelector("#supportContactLink");
const orderWhatsappLink = document.querySelector("#orderWhatsappLink");
const scheduleTitle = document.querySelector("#scheduleTitle");
const scheduleLine1Title = document.querySelector("#scheduleLine1Title");
const scheduleLine1 = document.querySelector("#scheduleLine1");
const scheduleLine2Title = document.querySelector("#scheduleLine2Title");
const scheduleLine2 = document.querySelector("#scheduleLine2");
const scheduleNoteTitle = document.querySelector("#scheduleNoteTitle");
const scheduleNote = document.querySelector("#scheduleNote");
const heroShowcaseLabel = document.querySelector("#heroShowcaseLabel");
const heroShowcaseTitle = document.querySelector("#heroShowcaseTitle");
const heroShowcaseStatus = document.querySelector("#heroShowcaseStatus");
const heroShowcaseGrid = document.querySelector("#heroShowcaseGrid");
const categorySectionLabel = document.querySelector("#categorySectionLabel");
const categorySectionTitle = document.querySelector("#categorySectionTitle");
const categorySectionText = document.querySelector("#categorySectionText");
const categoryGrid = document.querySelector("#categoryGrid");

let whatsappNumber = "51921217484";
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

const whatsappEmojiMap = {
  ":estrella:": String.fromCodePoint(0x2b50),
  ":tv:": String.fromCodePoint(0x1f4fa),
  ":correo:": String.fromCodePoint(0x1f4e7),
  ":llave:": String.fromCodePoint(0x1f511),
  ":perfil:": String.fromCodePoint(0x1f464),
  ":candado:": String.fromCodePoint(0x1f510),
  ":link:": String.fromCodePoint(0x1f517),
  ":calendario:": String.fromCodePoint(0x1f5d3, 0xfe0f),
  ":alerta:": String.fromCodePoint(0x26a0, 0xfe0f),
  ":megafono:": String.fromCodePoint(0x1f4e2),
  ":pin_marcador:": String.fromCodePoint(0x1f4cc),
  ":laptop:": String.fromCodePoint(0x1f4bb),
  ":perfil_hombre:": String.fromCodePoint(0x1f9d4),
  ":pin_personal:": String.fromCodePoint(0x1fac6),
  ":telefono:": String.fromCodePoint(0x1f4f2),
  ":check:": String.fromCodePoint(0x2705),
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

function formatRichText(value) {
  const escaped = escapeHtml(String(value ?? "").replace(/\r\n/g, "\n"));

  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(?!\s)([^*\n]+?)(?<!\s)\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

function stripRichText(value) {
  return String(value ?? "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(?!\s)([^*\n]+?)(?<!\s)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function renderWhatsAppEmojis(message) {
  return Object.entries(whatsappEmojiMap).reduce(
    (current, [placeholder, emoji]) => current.split(placeholder).join(emoji),
    String(message || "")
  );
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

function sortProductsForDisplay(items = []) {
  return [...items].sort((left, right) => {
    const leftOrder = Number.isFinite(Number(left.orden)) ? Number(left.orden) : 999;
    const rightOrder = Number.isFinite(Number(right.orden)) ? Number(right.orden) : 999;
    return leftOrder - rightOrder || String(left.nombre || "").localeCompare(String(right.nombre || ""));
  });
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
    ? `<img src="${escapeHtml(product.imagen)}" alt="${escapeHtml(product.nombre)}" loading="lazy" decoding="async" />`
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
      <p class="product-description">${formatRichText(product.descripcion)}</p>
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

function toAbsoluteUrl(value) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value, window.location.origin).href;
  } catch {
    return "";
  }
}

function renderProductStructuredData(products = []) {
  const schemaProducts = sortProductsForDisplay(products)
    .filter((product) => product?.nombre)
    .slice(0, 30)
    .map((product) => {
      const price = Number(product.precio);
      const offer = {
        "@type": "Offer",
        "availability": normalizeState(product.estado) === "disponible" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "priceCurrency": "PEN",
        "url": `${window.location.origin}/#pedido`,
      };

      if (!Number.isNaN(price) && price > 0) {
        offer.price = price;
      }

      return {
        "@type": "Product",
        "name": product.nombre,
        "description": stripRichText(product.descripcion || product.categoria || product.tipo || "Producto digital"),
        "category": product.categoria || product.tipo || "Producto digital",
        ...(product.imagen ? { "image": toAbsoluteUrl(product.imagen) } : {}),
        "brand": {
          "@type": "Brand",
          "name": "MAWG Streaming",
        },
        "offers": offer,
      };
    });

  const existing = document.querySelector("#productStructuredData");

  if (existing) {
    existing.remove();
  }

  if (schemaProducts.length === 0) {
    return;
  }

  const script = document.createElement("script");
  script.id = "productStructuredData";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": schemaProducts,
  });
  document.head.appendChild(script);
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
    const response = await fetch("/api/productos");

    if (!response.ok) {
      throw new Error("No se pudo cargar el catalogo");
    }

    const products = await response.json();

    if (!Array.isArray(products) || products.length === 0) {
      productCatalog.innerHTML = '<p class="catalog-message">No hay productos publicados por ahora.</p>';
      return;
    }

    productCatalog.innerHTML = sortProductsForDisplay(products).map(renderProductCard).join("");
    renderProductStructuredData(products);
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
  const opened = window.open(buildWhatsAppUrl(whatsappNumber, message), "_blank");

  if (opened) {
    opened.opener = null;
  }
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
        ${method.qr_imagen ? `<img class="qr-image" src="${escapeHtml(method.qr_imagen)}" alt="QR ${escapeHtml(method.nombre)}" loading="lazy" decoding="async" />` : ""}
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

function normalizeSiteSetting(setting) {
  return {
    id: String(setting.id || "").trim(),
    valor: String(setting.valor || "").trim(),
    estado: setting.estado === "inactivo" ? "inactivo" : "activo",
  };
}

function settingsToMap(settings) {
  return settings.reduce((map, setting) => {
    if (setting.id && setting.estado !== "inactivo") {
      map[setting.id] = setting.valor;
    }
    return map;
  }, {});
}

function hasActiveSettingForPrefix(settings, prefix) {
  return settings.some((setting) => setting.id.startsWith(prefix) && setting.estado !== "inactivo");
}

function getConfiguredText(map, hasSettings, key, fallback = "") {
  return hasSettings ? map[key] || "" : fallback;
}

function buildWhatsAppUrl(number, message = "") {
  const normalizedNumber = String(number || "").replace(/\D/g, "");
  const params = new URLSearchParams({
    phone: normalizedNumber,
    text: renderWhatsAppEmojis(message),
  });

  return normalizedNumber ? `https://api.whatsapp.com/send?${params.toString()}` : "#";
}

function getDriveFileId(value) {
  const rawValue = String(value || "").trim();

  if (!rawValue || !/drive\.google\.com|docs\.google\.com/.test(rawValue)) {
    return "";
  }

  const patterns = [/\/file\/d\/([^/]+)/, /\/uc\?[^#]*\bid=([^&#]+)/, /[?&]id=([^&#]+)/, /\/open\?[^#]*\bid=([^&#]+)/];

  for (const pattern of patterns) {
    const match = rawValue.match(pattern);
    if (match?.[1]) {
      return decodeURIComponent(match[1]).trim();
    }
  }

  return "";
}

function normalizeShowcaseImage(value) {
  const image = String(value || "").trim();
  const driveFileId = getDriveFileId(image);

  return driveFileId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveFileId)}&sz=w800` : image;
}

function renderHeroShowcase(map, settings = []) {
  if (heroShowcaseLabel) {
    heroShowcaseLabel.textContent = map.hero_showcase_label || "Stock actualizado";
  }

  if (heroShowcaseTitle) {
    heroShowcaseTitle.textContent = map.hero_showcase_title || "Compra directa";
  }

  if (heroShowcaseStatus) {
    heroShowcaseStatus.textContent = map.hero_showcase_status || "Disponible";
  }

  if (!heroShowcaseGrid) {
    return;
  }

  const fallbackCards = [
    ["Streaming", "Netflix Perfil", "Entrega inmediata"],
    ["Cuenta", "Disney Premium", "Acceso activo"],
    ["Combo", "Netflix + Disney", "Precio especial"],
    ["Curso", "Ventas Digitales", "Acceso digital"],
  ];

  const hasShowcaseSettings = settings.some((setting) => setting.id.startsWith("hero_card_"));
  const visibleCards = fallbackCards
    .map((fallback, index) => ({ fallback, position: index + 1 }))
    .filter(({ position }) => !hasShowcaseSettings || hasActiveSettingForPrefix(settings, `hero_card_${position}_`));

  heroShowcaseGrid.innerHTML = visibleCards
    .map((fallback) => {
      const position = fallback.position;
      const cardFallback = fallback.fallback;
      const image = normalizeShowcaseImage(map[`hero_card_${position}_imagen`]);
      const imageMarkup = image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" decoding="async" />` : "";
      const category = getConfiguredText(map, hasShowcaseSettings, `hero_card_${position}_categoria`, cardFallback[0]);
      const title = getConfiguredText(map, hasShowcaseSettings, `hero_card_${position}_titulo`, cardFallback[1]);
      const text = getConfiguredText(map, hasShowcaseSettings, `hero_card_${position}_texto`, cardFallback[2]);

      return `
        <article class="poster-card ${image ? "has-image" : ""}" data-showcase-card="${position}">
          ${imageMarkup}
          ${category ? `<span>${escapeHtml(category)}</span>` : ""}
          ${title ? `<strong>${escapeHtml(title)}</strong>` : ""}
          ${text ? `<small>${escapeHtml(text)}</small>` : ""}
        </article>
      `;
    })
    .join("");
}

function renderCategorySection(map, settings = []) {
  if (categorySectionLabel) {
    categorySectionLabel.textContent = map.categorias_label || "Categorias";
  }

  if (categorySectionTitle) {
    categorySectionTitle.textContent = map.categorias_titulo || "Explora productos listos para compra en pocos pasos.";
  }

  if (categorySectionText) {
    categorySectionText.innerHTML = formatRichText(map.categorias_texto || "Revisa disponibilidad, compara precios y compra sin perder tiempo entre mensajes.");
  }

  if (!categoryGrid) {
    return;
  }

  const fallbackCards = [
    ["TV", "Cuentas de streaming", "Perfiles y cuentas completas para peliculas, series y deportes.", "Comprar ahora"],
    ["ED", "Cursos digitales", "Accesos educativos, herramientas y capacitaciones con entrega digital.", "Ver opciones"],
    ["PK", "Combos especiales", "Paquetes con varios servicios agrupados en una sola compra.", "Cotizar combo"],
  ];

  const hasCategorySettings = settings.some((setting) => setting.id.startsWith("categoria_card_"));
  const visibleCards = fallbackCards
    .map((fallback, index) => ({ fallback, position: index + 1 }))
    .filter(({ position }) => !hasCategorySettings || hasActiveSettingForPrefix(settings, `categoria_card_${position}_`));

  categoryGrid.innerHTML = visibleCards
    .map((fallback) => {
      const position = fallback.position;
      const cardFallback = fallback.fallback;
      const image = normalizeShowcaseImage(map[`categoria_card_${position}_imagen`]);
      const imageMarkup = image ? `<img class="category-card-image" src="${escapeHtml(image)}" alt="" loading="lazy" decoding="async" />` : "";
      const icon = getConfiguredText(map, hasCategorySettings, `categoria_card_${position}_icono`, cardFallback[0]);
      const title = getConfiguredText(map, hasCategorySettings, `categoria_card_${position}_titulo`, cardFallback[1]);
      const text = getConfiguredText(map, hasCategorySettings, `categoria_card_${position}_texto`, cardFallback[2]);
      const cta = getConfiguredText(map, hasCategorySettings, `categoria_card_${position}_cta`, cardFallback[3]);
      const link = getConfiguredText(map, hasCategorySettings, `categoria_card_${position}_link`, "#pedido");

      return `
        <article class="category-card ${image ? "has-image" : ""}" data-category-card="${position}">
          ${imageMarkup}
          ${icon ? `<div class="card-icon">${escapeHtml(icon)}</div>` : ""}
          ${title ? `<h3>${escapeHtml(title)}</h3>` : ""}
          ${text ? `<p>${formatRichText(text)}</p>` : ""}
          ${cta ? `<a href="${escapeHtml(link || "#pedido")}">${escapeHtml(cta)}</a>` : ""}
        </article>
      `;
    })
    .join("");
}

function renderSiteSettings(settings) {
  const normalizedSettings = settings.map(normalizeSiteSetting);
  const map = settingsToMap(normalizedSettings);
  const salesNumber = map.ventas_whatsapp || whatsappNumber;
  const salesMessage = map.ventas_mensaje || "Hola, quiero consultar productos disponibles";
  const supportNumber = map.soporte_whatsapp || salesNumber;
  const supportMessage = map.soporte_mensaje || "Hola, necesito soporte con mi cuenta";

  whatsappNumber = String(salesNumber || whatsappNumber).replace(/\D/g, "") || whatsappNumber;

  if (salesContactLink) {
    salesContactLink.href = buildWhatsAppUrl(salesNumber, salesMessage);
  }

  if (supportContactLink) {
    supportContactLink.href = buildWhatsAppUrl(supportNumber, supportMessage);
  }

  if (orderWhatsappLink) {
    orderWhatsappLink.href = buildWhatsAppUrl(salesNumber, salesMessage);
  }

  if (scheduleTitle && map.horario_titulo) {
    scheduleTitle.textContent = map.horario_titulo;
  }

  if (scheduleLine1Title && map.horario_linea_1_nombre) {
    scheduleLine1Title.textContent = map.horario_linea_1_nombre;
  }

  if (scheduleLine1 && map.horario_linea_1) {
    scheduleLine1.innerHTML = formatRichText(map.horario_linea_1);
  }

  if (scheduleLine2Title && map.horario_linea_2_nombre) {
    scheduleLine2Title.textContent = map.horario_linea_2_nombre;
  }

  if (scheduleLine2 && map.horario_linea_2) {
    scheduleLine2.innerHTML = formatRichText(map.horario_linea_2);
  }

  if (scheduleNoteTitle && map.horario_nota_nombre) {
    scheduleNoteTitle.textContent = map.horario_nota_nombre;
  }

  if (scheduleNote && map.horario_nota) {
    scheduleNote.innerHTML = formatRichText(map.horario_nota);
  }

  renderHeroShowcase(map, normalizedSettings);
  renderCategorySection(map, normalizedSettings);
}

async function loadSiteSettings() {
  try {
    const settings = await apiRequest("/api/configuracion-sitio");
    renderSiteSettings(Array.isArray(settings) ? settings : []);
  } catch {
    renderSiteSettings([]);
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
loadSiteSettings();
loadProducts();
