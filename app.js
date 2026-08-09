const API_URL = "https://script.google.com/macros/s/AKfycbycHv1h_dSBfkMiW4D2I4CBvYOt6mrZtbpQZ55v5xNIXuqZTzBd2KR4-Kwg1fvxEdjLMA/exec";

const memberNames = ["Ana", "Iván", "Luis", "Breo"];

let members = [];
let history = [];

const nextPayerEl = document.getElementById("nextPayer");
const countersContainer = document.getElementById("countersContainer");
const historyContainer = document.querySelector(".card:last-of-type");
const registerButton = document.getElementById("registerButton");

// ==========================
// Cargar datos desde Google Sheets
// ==========================

async function loadData() {
  try {
    const response = await fetch(API_URL);
    history = await response.json();

    members = memberNames.map(name => ({
      name,
      count: history.filter(h => h.name === name).length
    }));

    render();
  } catch (error) {
    console.error("Error cargando datos:", error);
    alert("No se pudo conectar con Google Sheets.");
  }
}

// ==========================
// Utilidades
// ==========================

function getTimestamp() {
  const now = new Date();

  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();

  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const sec = String(now.getSeconds()).padStart(2, "0");

  return `${d}/${m}/${y} ${h}:${min}:${sec}`;
}

function getRecommendedPayer() {
  return members.reduce((lowest, current) =>
    current.count < lowest.count ? current : lowest
  );
}

// ==========================
// Render
// ==========================

function renderNextPayer() {
  const recommended = getRecommendedPayer();
  nextPayerEl.textContent = recommended.name;
}

function renderCounters() {
  countersContainer.innerHTML = "";

  members.forEach(member => {
    const row = document.createElement("div");
    row.className = "counter-row";

    row.innerHTML = `
      <span class="name">${member.name}</span>
      <span class="count">${member.count}</span>
    `;

    countersContainer.appendChild(row);
  });
}

function renderHistory() {
  const oldRows = historyContainer.querySelectorAll(".history-row");
  oldRows.forEach(r => r.remove());

  const recent = [...history]
    .sort((a, b) => {
      const [dateA, timeA = "00:00:00"] = a.date.split(" ");
      const [dateB, timeB = "00:00:00"] = b.date.split(" ");

      const [da, ma, ya] = dateA.split("/").map(Number);
      const [db, mb, yb] = dateB.split("/").map(Number);

      const [ha, mina, seca = 0] = timeA.split(":").map(Number);
      const [hb, minb, secb = 0] = timeB.split(":").map(Number);

      const tsA = new Date(ya, ma - 1, da, ha, mina, seca).getTime();
      const tsB = new Date(yb, mb - 1, db, hb, minb, secb).getTime();

      return tsB - tsA;
    })
    .slice(0, 3);

  recent.forEach(item => {
    const row = document.createElement("div");
    row.className = "history-row";

    const [date, time = "00:00:00"] = item.date.split(" ");
    const [hours, minutes] = time.split(":");

    row.innerHTML = `
      <span class="name">${item.name}</span>
      <div class="history-date-time">${date} ${hours}:${minutes}</div>
      <button class="delete-history" aria-label="Eliminar registro">🗑️</button>
    `;

row.querySelector(".delete-history").addEventListener("click", () => {
  openDeleteModal(item);
});

    historyContainer.appendChild(row);
  });
}

function render() {
  renderNextPayer();
  renderCounters();
  renderHistory();
}

// ==========================
// Modales
// ==========================

function closeModal(overlay) {
  overlay.classList.add("closing");
  overlay.addEventListener(
    "transitionend",
    () => overlay.remove(),
    { once: true }
  );
}

function openPayerModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal";

  const title = document.createElement("h3");
  title.textContent = "Registrar café / desayuno";

  const subtitle = document.createElement("p");
  subtitle.className = "modal-subtitle";
  subtitle.textContent = "Selecciona quién ha pagado hoy.";

  const list = document.createElement("div");
  list.className = "modal-list";

  let selectedName = getRecommendedPayer().name;

  members.forEach(member => {
    const button = document.createElement("button");
    button.className = "member-option";
    if (member.name === selectedName) button.classList.add("selected");

    button.innerHTML = `
      <span>${member.name}</span>
      ${member.name === selectedName ? '<span class="star">★</span>' : ''}
    `;

    button.addEventListener("click", () => {
      selectedName = member.name;
      list.querySelectorAll(".member-option").forEach(el => el.classList.remove("selected"));
      button.classList.add("selected");

      list.querySelectorAll(".star").forEach(el => el.remove());
      const star = document.createElement("span");
      star.className = "star";
      star.textContent = "★";
      button.appendChild(star);
    });

    list.appendChild(button);
  });

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const cancel = document.createElement("button");
  cancel.className = "secondary-button";
  cancel.textContent = "Cancelar";
  cancel.addEventListener("click", () => closeModal(overlay));

  const confirm = document.createElement("button");
  confirm.className = "primary-button";
  confirm.textContent = "Confirmar";
  confirm.addEventListener("click", async () => {
    await registerPayment(selectedName);
    closeModal(overlay);
  });

  actions.append(cancel, confirm);
  modal.append(title, subtitle, list, actions);
  overlay.appendChild(modal);

  document.body.appendChild(overlay);
}

function openDeleteModal(entry) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal";

  const title = document.createElement("h3");
  title.textContent = "Eliminar registro";

  const record = document.createElement("div");
  record.className = "delete-record";
  record.innerHTML = `
    <div class="delete-name">${entry.name}</div>
    <div class="delete-date">${entry.date}</div>
  `;

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const cancel = document.createElement("button");
  cancel.className = "secondary-button";
  cancel.textContent = "Cancelar";
  cancel.addEventListener("click", () => closeModal(overlay));

  const confirm = document.createElement("button");
  confirm.className = "danger-button";
  confirm.textContent = "Eliminar";
  confirm.addEventListener("click", async () => {
    await deleteHistoryEntry(entry);
    closeModal(overlay);
  });

  actions.append(cancel, confirm);
  modal.append(title, record, actions);
  overlay.appendChild(modal);

  document.body.appendChild(overlay);
}

// ==========================
// Acciones
// ==========================

async function registerPayment(name) {
  // Guardamos la fecha una sola vez
  const timestamp = getTimestamp();

  // -------------------------
  // Actualización inmediata
  // -------------------------

  // Añadir el registro al historial local
  history.push({
    id: Date.now(), // ID temporal
    name,
    date: timestamp
  });

  // Incrementar el contador local
  const member = members.find(m => m.name === name);
  if (member) {
    member.count++;
  }

  // Redibujar la interfaz inmediatamente
  render();

  // -------------------------
  // Sincronización con Google
  // -------------------------

  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        name,
        date: timestamp
      })
    });

setTimeout(() => {
  loadData();
}, 1500);

  } catch (error) {
    console.error("Error sincronizando con Google Sheets:", error);

    // Si algo falla, recargamos desde Google
    await loadData();

    alert("No se pudo sincronizar el registro.");
  }
}

async function deleteHistoryEntry(entry) {
  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({
      _method: "DELETE",
      id: entry.id
    })
  });

  await loadData();
}

// ==========================
// Inicio
// ==========================

registerButton.addEventListener("click", openPayerModal);

loadData();
