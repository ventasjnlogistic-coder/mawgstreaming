const loginForm = document.querySelector("#loginForm");
const loginStatus = document.querySelector("#loginStatus");

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
    window.location.href = "/admin.html";
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

    window.location.href = "/admin.html";
  } catch (error) {
    setLoginStatus(error.message, true);
  }
});

checkSession().catch(() => {
  setLoginStatus("");
});
