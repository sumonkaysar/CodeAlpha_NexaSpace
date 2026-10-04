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

function renderChat() {
  const list = document.getElementById("chat-messages");
  if (!list) return;

  list.innerHTML = chatEntries.length
    ? chatEntries
        .map((entry) => {
          const isMine = entry.user?.id === currentUserId;
          const author = entry.user?.name || "Participant";
          const time = new Date(entry.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          if (entry.type === "file") {
            return `
              <article class="chat-message chat-file-message${isMine ? " mine" : ""}">
                <span class="chat-message-author">${escapeHtml(author)} shared a file</span>
                <button class="chat-file-button" data-chat-download="${escapeHtml(entry.id)}" data-name="${escapeHtml(entry.originalName)}" type="button">${escapeHtml(entry.originalName)}</button>
                <span class="chat-message-time">${escapeHtml(time)}</span>
              </article>
            `;
          }
          return `
            <article class="chat-message${isMine ? " mine" : ""}">
              <span class="chat-message-author">${escapeHtml(author)}</span>
              <p class="chat-message-text">${escapeHtml(entry.message)}</p>
              <span class="chat-message-time">${escapeHtml(time)}</span>
            </article>
          `;
        })
        .join("")
    : '<p class="empty-state">Messages and shared files appear here.</p>';

  list.querySelectorAll("[data-chat-download]").forEach((button) => {
    button.addEventListener("click", () =>
      downloadSharedFile(button.dataset.chatDownload, button.dataset.name),
    );
  });
  list.scrollTop = list.scrollHeight;
}

function addChatMessage(message) {
  chatEntries.push({ ...message, type: "message" });
  renderChat();
}

function announceSharedFile(file) {
  if (!file?.id || announcedFileIds.has(file.id)) return;
  announcedFileIds.add(file.id);
  chatEntries.push({
    ...file,
    user: file.user || file.uploader,
    type: "file",
  });
  renderChat();
}

function receiveChatMessage(message) {
  if (!message || typeof message.message !== "string") return;
  addChatMessage(message);
}

async function handleSharedFile(file) {
  if (file) announceSharedFile(file);
  try {
    await loadFiles();
  } catch (error) {
    showToast(
      `File shared, but the file list could not refresh: ${error.message}`,
    );
  }
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

  files.forEach((file) =>
    announceSharedFile({
      id: file._id,
      originalName: file.originalName,
      user: file.uploader
        ? { id: file.uploader._id, name: file.uploader.name }
        : null,
      createdAt: file.createdAt,
    }),
  );

  list.querySelectorAll("[data-download]").forEach((button) =>
    button.addEventListener("click", () =>
      downloadSharedFile(button.dataset.download, button.dataset.name),
    ),
  );
  renderChat();
}

async function downloadSharedFile(fileId, fileName) {
  try {
    const passphrase = document.getElementById("file-key").value;
    if (!passphrase) throw new Error("Enter the shared passphrase first");

    const response = await fetch(
      `${API}/files/${encodeURIComponent(fileId)}/download`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(tokenKey)}`,
        },
      },
    );
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || "Could not download file");
    }

    const decrypted = await decryptFile(await response.blob(), passphrase);
    const url = URL.createObjectURL(decrypted);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    showToast(error.message);
  }
}
