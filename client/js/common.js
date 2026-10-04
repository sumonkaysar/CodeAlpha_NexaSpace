const API = "https://nexaspace-server.vercel.app/api";
const tokenKey = "nexaspace_token";
let currentRoom = null;
let socket = null;
let localStream = null;
let screenStream = null;
let whiteboardStream = null;
let cameraTrack = null;
const peers = new Map();
const pendingIceCandidates = new Map();
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

function showLeaveDialog(isOwner) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "app-confirm-dialog";
    dialog.setAttribute("aria-labelledby", "app-leave-title");

    const content = document.createElement("div");
    content.className = "app-confirm-content";

    const title = document.createElement("h2");
    title.id = "app-leave-title";
    title.textContent = isOwner ? "Leave this room?" : "Leave room?";

    const description = document.createElement("p");
    description.textContent = isOwner
      ? "You can leave the room open for others, or close it for everyone."
      : "You will leave the meeting and can rejoin while it remains open.";

    const actions = document.createElement("div");
    actions.className = "app-confirm-actions";

    const cancel = document.createElement("button");
    cancel.className = "outline-button";
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", () => dialog.close("cancel"));

    const leave = document.createElement("button");
    leave.className = "button";
    leave.type = "button";
    leave.textContent = "Leave";
    leave.addEventListener("click", () => dialog.close("leave"));

    actions.append(cancel, leave);
    if (isOwner) {
      const leaveForAll = document.createElement("button");
      leaveForAll.className = "leave-button";
      leaveForAll.type = "button";
      leaveForAll.textContent = "Leave for all";
      leaveForAll.addEventListener("click", () => dialog.close("close"));
      actions.append(leaveForAll);
    }

    dialog.addEventListener(
      "close",
      () => {
        resolve(dialog.returnValue === "cancel" ? null : dialog.returnValue);
        dialog.remove();
      },
      { once: true },
    );

    content.append(title, description, actions);
    dialog.append(content);
    document.body.append(dialog);
    dialog.showModal();
  });
}

function showInputDialog({ title, label, submitLabel }) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "app-confirm-dialog";
    dialog.setAttribute("aria-labelledby", "app-input-title");

    const content = document.createElement("div");
    content.className = "app-confirm-content";

    const heading = document.createElement("h2");
    heading.id = "app-input-title";
    heading.textContent = title;

    const form = document.createElement("form");
    form.className = "app-input-form";

    const inputLabel = document.createElement("label");
    inputLabel.textContent = label;

    const input = document.createElement("input");
    input.type = "text";
    input.required = true;
    input.autocomplete = "off";
    inputLabel.append(input);

    const actions = document.createElement("div");
    actions.className = "app-confirm-actions";

    const cancel = document.createElement("button");
    cancel.className = "outline-button";
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", () => dialog.close("cancel"));

    const submit = document.createElement("button");
    submit.className = "button";
    submit.type = "submit";
    submit.textContent = submitLabel;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = input.value.trim();
      if (!value) {
        input.setCustomValidity("Enter a room name");
        input.reportValidity();
        return;
      }
      dialog.close("submit");
    });
    input.addEventListener("input", () => input.setCustomValidity(""));

    dialog.addEventListener(
      "close",
      () => {
        resolve(dialog.returnValue === "submit" ? input.value.trim() : null);
        dialog.remove();
      },
      { once: true },
    );

    actions.append(cancel, submit);
    form.append(inputLabel, actions);
    content.append(heading, form);
    dialog.append(content);
    document.body.append(dialog);
    dialog.showModal();
    input.focus();
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
    if (response.status === 401) {
      localStorage.removeItem(tokenKey);
      throw new Error("Your session is invalid or expired. Please sign in again.");
    }
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
