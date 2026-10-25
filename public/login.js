const loginForm = document.querySelector("#loginForm");
const loginStatus = document.querySelector("#loginStatus");
const ADMIN_LAST_VIEW_STORAGE_KEY = "mawg.admin.lastView";

function getAdminDestination() {
  const next = new URLSearchParams(window.location.search).get("next");

  // Solo se permiten destinos internos del panel tras autenticar.
  if (next && /^\/admin(?:\.html)?(?:#[-a-z]+)?$/i.test(next)) {
    return next;
  }

  try {
    const lastView = window.sessionStorage.getItem(ADMIN_LAST_VIEW_STORAGE_KEY);
    if (lastView && /^[a-z]+$/.test(lastView)) {
      return `/admin.html#${lastView}`;
    }
  } catch {
    // Para una primera sesion, Dashboard es el destino esperado.
  }

  return "/admin.html#dashboard";
}

function setLoginStatus(message, isError = false) {
  if (!loginStatus) {
    return;
  }

  loginStatus.textContent = message;
  loginStatus.classList.toggle("is-error", isError);
}

async function checkSession() {
  const response = await fetch("/api/admin/session", { credentials: "same-origin" });
  const session = await response.json();

  if (session.authenticated) {
    window.location.href = getAdminDestination();
  }
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoginStatus("Validando acceso...");

  const payload = Object.fromEntries(new FormData(loginForm).entries());

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "No se pudo iniciar sesion.");
    }

    window.location.href = getAdminDestination();
  } catch (error) {
    setLoginStatus(error.message, true);
  }
});

checkSession().catch(() => {
  setLoginStatus("");
});
