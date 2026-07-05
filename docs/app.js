const STORAGE_KEY = "myScanner.shortcuts.v1";
const playlistList = document.querySelector("#playlistList");
const emptyState = document.querySelector("#emptyState");
const playlistTemplate = document.querySelector("#playlistTemplate");
const shortcutDialog = document.querySelector("#shortcutDialog");
const shortcutForm = document.querySelector("#shortcutForm");
const formError = document.querySelector("#formError");
const nameInput = document.querySelector("#playlistName");
const urlInput = document.querySelector("#playlistUrl");
const installButton = document.querySelector("#installButton");
const installDialog = document.querySelector("#installDialog");
let deferredInstallPrompt = null;

function readShortcuts() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function writeShortcuts(shortcuts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
}

function parsePlaylistUrl(value) {
  try {
    const url = new URL(value.trim());
    const hostIsBroadcastify =
      url.hostname === "broadcastify.com" || url.hostname === "www.broadcastify.com";
    const pathIsPlaylist = url.pathname.replace(/\/+$/, "/") === "/calls/playlists/";
    const uuid = url.searchParams.get("uuid");

    if (!hostIsBroadcastify || !pathIsPlaylist || !uuid) {
      return null;
    }

    url.protocol = "https:";
    url.hostname = "www.broadcastify.com";
    return url.href;
  } catch {
    return null;
  }
}

function renderShortcuts() {
  const shortcuts = readShortcuts();
  playlistList.replaceChildren();
  emptyState.hidden = shortcuts.length > 0;

  shortcuts.forEach((shortcut) => {
    const card = playlistTemplate.content.firstElementChild.cloneNode(true);
    const link = card.querySelector(".playlist-link");
    const title = card.querySelector("strong");
    const removeButton = card.querySelector(".delete-button");

    link.href = shortcut.url;
    link.setAttribute("aria-label", `Open ${shortcut.name}`);
    title.textContent = shortcut.name;
    removeButton.setAttribute("aria-label", `Remove ${shortcut.name}`);
    removeButton.addEventListener("click", () => {
      const next = readShortcuts().filter((item) => item.id !== shortcut.id);
      writeShortcuts(next);
      renderShortcuts();
    });

    playlistList.append(card);
  });
}

function openShortcutDialog() {
  formError.textContent = "";
  shortcutForm.reset();
  shortcutDialog.showModal();
  window.setTimeout(() => nameInput.focus(), 50);
}

document.querySelector("#openAddButton").addEventListener("click", openShortcutDialog);
document.querySelector("#emptyAddButton").addEventListener("click", openShortcutDialog);

shortcutForm.addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") {
    return;
  }

  event.preventDefault();
  const name = nameInput.value.trim();
  const url = parsePlaylistUrl(urlInput.value);

  if (!name) {
    formError.textContent = "Enter a name for the playlist button.";
    nameInput.focus();
    return;
  }

  if (!url) {
    formError.textContent = "Paste an individual Broadcastify Calls playlist address.";
    urlInput.focus();
    return;
  }

  const shortcuts = readShortcuts();
  const existingIndex = shortcuts.findIndex((shortcut) => shortcut.url === url);
  const item = {
    id: existingIndex >= 0 ? shortcuts[existingIndex].id : crypto.randomUUID(),
    name,
    url,
  };

  if (existingIndex >= 0) {
    shortcuts[existingIndex] = item;
  } else {
    shortcuts.push(item);
  }

  shortcuts.sort((a, b) => a.name.localeCompare(b.name));
  writeShortcuts(shortcuts);
  shortcutDialog.close();
  renderShortcuts();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

installButton.addEventListener("click", async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    return;
  }

  installDialog.showModal();
});

document.querySelector("#closeInstallButton").addEventListener("click", () => {
  installDialog.close();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}

renderShortcuts();
