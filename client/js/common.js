const API = "https://nexaspace-server.vercel.app/api";
const tokenKey = "nexaspace_token";
let currentRoom = null;
let socket = null;
let localStream = null;
let screenStream = null;
let cameraTrack = null;
const peers = new Map();
const rtcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
let toastTimeout;

function showToast(message) {
  let toast = document.querySelector(".toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.append(toast);
  }

  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(toastTimeout);

  toastTimeout = window.setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

function showConfirm(message) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "app-confirm-dialog";

    const content = document.createElement("div");
    content.className = "app-confirm-content";

    const title = document.createElement("h2");
    title.id = "app-confirm-title";
    title.textContent = "Confirm action";
    dialog.setAttribute("aria-labelledby", title.id);

    const description = document.createElement("p");
    description.textContent = message;

    const actions = document.createElement("div");
    actions.className = "app-confirm-actions";

    const cancel = document.createElement("button");
    cancel.className = "outline-button";
    cancel.type = "button";
    cancel.textContent = "Cancel";

    const confirm = document.createElement("button");
    confirm.className = "button";
    confirm.type = "button";
    confirm.textContent = "Confirm";

    cancel.addEventListener("click", () => dialog.close("cancel"));
    confirm.addEventListener("click", () => dialog.close("confirm"));

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close("cancel");
    });

    dialog.addEventListener(
      "close",
      () => {
        resolve(dialog.returnValue === "confirm");
        dialog.remove();
      },
      { once: true },
    );

    actions.append(cancel, confirm);
    content.append(title, description, actions);
    dialog.append(content);
    document.body.append(dialog);
    dialog.showModal();
  });
}

async function api(path, options = {}) {
  const headers = {
    ...(localStorage.getItem(tokenKey)
      ? { Authorization: `Bearer ${localStorage.getItem(tokenKey)}` }
      : {}),
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API}${path}`, { ...options, headers });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Request failed");
  }

  return response.status === 204 ? null : response.json();
}

async function uploadImage(file) {
  const formData = new FormData();
  formData.append("image", file);
  return api("/uploads/image", { method: "POST", body: formData });
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
}
