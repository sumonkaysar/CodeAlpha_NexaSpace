function roomRequest(method, path, body) {
  return api(path, { method, body: JSON.stringify(body) });
}

async function deriveFileKey(passphrase, salt) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptFile(file, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveFileKey(passphrase, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    await file.arrayBuffer(),
  );

  const output = new Uint8Array(
    salt.length + iv.length + ciphertext.byteLength,
  );

  output.set(salt, 0);
  output.set(iv, salt.length);
  output.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return new Blob([output], { type: "application/octet-stream" });
}

async function decryptFile(blob, passphrase) {
  const bytes = new Uint8Array(await blob.arrayBuffer());

  if (bytes.length < 29) throw new Error("Encrypted file is incomplete");

  const key = await deriveFileKey(passphrase, bytes.slice(0, 16));

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes.slice(16, 28) },
    key,
    bytes.slice(28),
  );

  return new Blob([plaintext]);
}

async function loadFiles() {
  if (!currentRoom) return;
  const files = await api(`/files?room=${encodeURIComponent(currentRoom._id)}`);

  const list = document.getElementById("file-list");

  list.innerHTML = files.length
    ? files
        .map(
          (file) =>
            `
              <div class="file-item">
                <span>${escapeHtml(file.originalName)}</span>
                <button
                  data-download="${file._id}"
                  data-name="${escapeHtml(file.originalName)}"
                  type="button"
                >
                  Download
                </button>
              </div>
            `,
        )
        .join("")
    : '<p class="empty-state">No files shared in this room.</p>';

  list.querySelectorAll("[data-download]").forEach((button) =>
    button.addEventListener("click", async () => {
      try {
        const passphrase = document.getElementById("file-key").value;
        if (!passphrase) throw new Error("Enter the shared passphrase first");

        const encrypted = await fetch(
          `${API}/files/${button.dataset.download}/download`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem(tokenKey)}`,
            },
          },
        );

        if (!encrypted.ok) throw new Error("Could not download file");

        const file = await decryptFile(await encrypted.blob(), passphrase);

        const link = document.createElement("a");
        link.href = URL.createObjectURL(file);
        link.download = button.dataset.name;
        link.click();

        URL.revokeObjectURL(link.href);
      } catch (error) {
        showToast(error.message);
      }
    }),
  );
}
