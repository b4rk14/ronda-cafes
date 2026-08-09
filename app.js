// ==========================
// Cafés & Desayunos - v1.0
// ==========================

// Datos iniciales (más adelante vendrán de Google Sheets)
const members = [
  { name: "Ana", count: 1 },
  { name: "Iván", count: 2 },
  { name: "Luis", count: 0 },
  { name: "Breo", count: 1 }
];

// Historial completo (la interfaz solo mostrará los últimos 5)
const history = [
  { name: "Breo", date: "07/08/2026 09:42" },
  { name: "Iván", date: "31/07/2026 09:18" },
  { name: "Ana", date: "23/07/2026 08:57" },
  { name: "Iván", date: "18/07/2026 09:31" }
];

let recommendedPayer = null;

// Referencias DOM
const nextPayerEl = document.getElementById("nextPayer");
const countersContainer = document.getElementById("countersContainer");
const historyContainer = document.querySelector(".card:last-of-type");
const registerButton = document.getElementById("registerButton");

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

  return `${d}/${m}/${y} ${h}:${min}`;
}

function chooseRecommendedPayer() {
  const min = Math.min(...members.map(m => m.count));
  const candidates = members.filter(m => m.count === min);

  recommendedPayer =
    candidates[Math.floor(Math.random() * candidates.length)];

  nextPayerEl.textContent = recommendedPayer.name;
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

  function renderHistory() {
  const oldRows = historyContainer.querySelectorAll(".history-row");
  oldRows.forEach(r => r.remove());

  const recent = [...history]
    .sort((a, b) => {
      const [dateA, timeA = "00:00"] = a.date.split(" ");
      const [dateB, timeB = "00:00"] = b.date.split(" ");

      const [da, ma, ya] = dateA.split("/").map(Number);
      const [db, mb, yb] = dateB.split("/").map(Number);

      const [ha, mina] = timeA.split(":").map(Number);
      const [hb, minb] = timeB.split(":").map(Number);

      const tsA = new Date(ya, ma - 1, da, ha, mina).getTime();
      const tsB = new Date(yb, mb - 1, db, hb, minb).getTime();

      return tsB - tsA;
    })
    .slice(0, 3);

  recent.forEach(item => {
    const row = document.createElement("div");
    row.className = "history-row";

    row.innerHTML = `
      <span class="name">${item.name}</span>
      <span class="date">${item.date}</span>
      <button class="delete-history" aria-label="Eliminar registro">🗑️</button>
    `;

    row.querySelector(".delete-history").addEventListener("click", () => {
      deleteHistoryEntry(item);
    });

    historyContainer.appendChild(row);
  });
}

function render() {
  renderCounters();
  renderHistory();
  chooseRecommendedPayer();
}

// ==========================
// Modal de selección
// ==========================

function openPayerModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal";

  const title = document.createElement("h3");
  title.textContent = "Registrar Café / Desayuno";

  const subtitle = document.createElement("p");
  subtitle.className = "modal-subtitle";
  subtitle.textContent = "Selecciona quién ha pagado";

  const list = document.createElement("div");
  list.className = "modal-list";

  let selected = recommendedPayer.name;

  members.forEach(member => {
    const button = document.createElement("button");
    button.className = "member-option";

    if (member.name === recommendedPayer.name) {
      button.classList.add("selected");
    }

    button.innerHTML = `
  <span>${member.name}</span>
  ${member.name === recommendedPayer.name ? '<span class="star">★</span>' : ''}
`;

    button.addEventListener("click", () => {
      selected = member.name;

      list.querySelectorAll(".member-option").forEach(b => {
        b.classList.remove("selected");
      });

      button.classList.add("selected");
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

confirm.addEventListener("click", () => {
  registerPayment(selected);
  closeModal(overlay);
});

  actions.append(cancel, confirm);
  modal.append(title, subtitle, list, actions);
  overlay.appendChild(modal);

  document.body.appendChild(overlay);
}

function closeModal(overlay) {
  overlay.classList.add("closing");
  setTimeout(() => overlay.remove(), 220);
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

  confirm.addEventListener("click", () => {
    // Buscar el registro real (desde el final por si hubiera duplicados)
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].name === entry.name && history[i].date === entry.date) {
        history.splice(i, 1);
        break;
      }
    }

    // Restar un café al contador correspondiente
    const member = members.find(m => m.name === entry.name);
    if (member && member.count > 0) {
      member.count -= 1;
    }

    render();
    closeModal(overlay);
  });

  actions.append(cancel, confirm);
  modal.append(title, record, actions);
  overlay.appendChild(modal);

  document.body.appendChild(overlay);
}

// ==========================
// Registro
// ==========================

function registerPayment(name) {
  const member = members.find(m => m.name === name);
  if (!member) return;

  member.count += 1;

  history.push({
  name,
  date: getTimestamp()
});

  render();
}

function deleteHistoryEntry(entry) {
  openDeleteModal(entry);
}

// ==========================
// Eventos
// ==========================

registerButton.addEventListener("click", openPayerModal);

// ==========================
// Inicio
// ==========================

render();
