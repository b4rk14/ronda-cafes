let allGroups = [];  // Grupos cargados desde DataService
let currentGroup = localStorage.getItem("coffeeGroup") || null;  // Se valida en initializeApp()

let members = [];
let history = [];

const nextPayerEl = document.getElementById("nextPayer");
const countersContainer = document.getElementById("countersContainer");
const historyContainer = document.querySelector(".card:last-of-type");
const registerButton = document.getElementById("registerButton");
const app = document.querySelector(".app");
const groupNameEl = document.getElementById("groupName");

// ==========================
// Inicializar aplicación
// ==========================

async function initializeApp() {
  try {
    allGroups = await DataService.getGroups();

    // Validar que currentGroup existe
    if (!currentGroup || !allGroups.find(g => g.id === currentGroup)) {
      currentGroup = allGroups[0]?.id || null;
      if (currentGroup) localStorage.setItem("coffeeGroup", currentGroup);
    }

    loadData();
  } catch (error) {
    console.error("Error inicializando:", error);
    alert("No se pudo cargar los grupos.");
  }
}

// ==========================
// Cargar datos del grupo actual
// ==========================

async function loadData() {
  const groupToLoad = currentGroup;

  if (!groupToLoad) {
    console.error("No hay grupo seleccionado");
    return;
  }

  try {
    // Usar DataService para obtener pagos
    const payments = await DataService.getPayments(groupToLoad);

    // Ignoramos respuestas de un grupo que ya no es el seleccionado.
    if (groupToLoad !== currentGroup) return;

    history = payments;

    // Obtener miembros del grupo desde allGroups
    const grupo = allGroups.find(g => g.id === groupToLoad);
    const memberNames = grupo?.miembros || [];

    members = memberNames.map(name => ({
      name,
      count: history.filter(h => h.nombre === name).length
    }));

    if (grupo?.nombre) {
      groupNameEl.textContent = grupo.nombre;
    }

    render();
  } catch (error) {
    console.error("Error cargando datos:", error);
    alert("No se pudo conectar con el servicio.");
  } finally {
    if (groupToLoad === currentGroup) {
      app.classList.remove("group-loading");
    }
  }
}

// ==========================
// Utilidades
// ==========================
// Nota: getTimestamp() está centralizado en DataService

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
      <span class="name">${item.nombre}</span>
      <div class="history-date-time">${date} ${hours}:${minutes}</div>
      <button
        class="delete-history"
        aria-label="Eliminar registro"
        ${item.pending ? "disabled" : ""}
      >🗑️</button>
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

  const minCount = Math.min(...members.map(m => m.count));
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

      list.querySelectorAll(".member-option").forEach(el => {
        el.classList.remove("selected");
        const star = el.querySelector(".star");
        if (star) star.remove();
      });

      button.classList.add("selected");

      // Solo mostramos la estrella si el seleccionado tiene el contador mínimo
      if (member.count === minCount) {
        const star = document.createElement("span");
        star.className = "star";
        star.textContent = "★";
        button.appendChild(star);
      }
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
    closeModal(overlay);
    registerPayment(selectedName);
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
    <div class="delete-name">${entry.nombre}</div>
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
    closeModal(overlay);
    deleteHistoryEntry(entry);
  });

  actions.append(cancel, confirm);
  modal.append(title, record, actions);
  overlay.appendChild(modal);

  document.body.appendChild(overlay);
}

// ==========================
// Selector de grupos
// ==========================

function openGroupModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal";

  const title = document.createElement("h3");
  title.textContent = "Seleccionar grupo";

  const list = document.createElement("div");
  list.className = "modal-list";

  allGroups.forEach(grupo => {
    const button = document.createElement("button");
    button.className = "member-option";

    if (grupo.id === currentGroup) {
      button.classList.add("selected");
    }

    button.textContent = grupo.nombre;

    button.addEventListener("click", () => {
      if (grupo.id === currentGroup) {
        closeModal(overlay);
        return;
      }

      currentGroup = grupo.id;
      localStorage.setItem("coffeeGroup", currentGroup);
      groupNameEl.textContent = grupo.nombre;
      app.classList.add("group-loading");
      closeModal(overlay);
      loadData();
    });

    list.appendChild(button);
  });

  modal.append(title, list);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// ==========================
// Acciones
// ==========================

async function registerPayment(name) {
  // Guardar timestamp usando DataService
  const timestamp = DataService.getTimestamp();

  // -------------------------
  // Actualización inmediata (optimista)
  // -------------------------

  // Añadir el registro al historial local
  history.push({
    id: Date.now(),
    nombre: name,
    date: timestamp,
    pending: true,
    groupId: currentGroup
  });

  // Incrementar el contador local
  const member = members.find(m => m.name === name);
  if (member) {
    member.count++;
  }

  // Redibujar la interfaz inmediatamente
  render();

  // -------------------------
  // Sincronización con DataService
  // -------------------------

  try {
    await DataService.addPayment(currentGroup, name);
    loadData();

  } catch (error) {
    console.error("Error sincronizando:", error);

    // Si algo falla, recargamos desde el servicio
    await loadData();

    alert("No se pudo sincronizar el registro.");
  }
}

async function deleteHistoryEntry(entry) {
  // Actualización inmediata
  history = history.filter(h => h.id !== entry.id);

  const member = members.find(m => m.name === entry.nombre);
  if (member && member.count > 0) {
    member.count--;
  }

  render();

  try {
    // Pasar metadata necesaria para que DataService pueda eliminar en Sheets
    const metadata = {
      groupId: entry.groupId,
      groupName: allGroups.find(g => g.id === entry.groupId)?.nombre
    };
    
    const result = await DataService.deletePayment(entry.id, metadata);
    
    if (!result.success) {
      throw new Error("No se pudo eliminar el registro");
    }

    loadData();

  } catch (error) {
    console.error(error);
    loadData();
  }
}

// ==========================
// Inicio
// ==========================

registerButton.addEventListener("click", openPayerModal);

document.querySelector(".menu-button")
  .addEventListener("click", openGroupModal);

initializeApp();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    loadData();
  }
});
