// ============================================
// DATA SERVICE - Abstracción de datos
// ============================================
// Interfaz agnóstica que encapsula toda comunicación
// con la capa de persistencia. Permite cambiar de backend
// (Google Sheets → Firestore/Supabase) sin tocar app.js

const API_URL = "https://script.google.com/macros/s/AKfycbwexvQa1BlnqcpFU4azAn-WPThDZJ5uEJ-wU2Dh45bTdXEevslpR2vGYRwHxrn-hbSqQw/exec";

const DataService = {
  async getGroups() {
    return impl.getGroups();
  },

  async createGroup(nombre, miembros) {
    return impl.createGroup(nombre, miembros);
  },

  async getPayments(groupId) {
    return impl.getPayments(groupId);
  },

  async addPayment(groupId, nombre) {
    return impl.addPayment(groupId, nombre);
  },

  async deletePayment(paymentId, metadata) {
    return impl.deletePayment(paymentId, metadata);
  },

  getTimestamp() {
    return impl.getTimestamp();
  }
};

// ============================================
// IMPLEMENTACIÓN: Google Sheets (actual)
// ============================================

const GoogleSheetsImpl = {
  // Datos hardcodeados (compatibles con versión actual)
  GROUPS_STATIC: {
    "Perenquenes": {
      id: "grp_001_perenquenes",
      nombre: "Perenquenes",
      miembros: ["Ana", "Iván", "Luis", "Breo"]
    },
    "Comando Café": {
      id: "grp_002_comandocafe",
      nombre: "Comando Café",
      miembros: ["Elena", "Monje", "Breo"]
    },
    "Naigan": {
      id: "grp_003_naigan",
      nombre: "Naigan",
      miembros: ["Breo", "Naira"]
    }
  },

  async getGroups() {
    try {
      const grupos = await this.getGroupsJsonp();
      if (!Array.isArray(grupos) || !grupos.every(this.isValidGroup)) {
        throw new Error("Respuesta de grupos no válida");
      }

      return grupos;
    } catch (error) {
      console.warn("No se pudieron cargar los grupos remotos; usando fallback local:", error);
      return this.getLocalGroups();
    }
  },

  getGroupsJsonp() {
    return new Promise((resolve, reject) => {
      const callbackName = "__coffeeGroupsCallback_" +
        Date.now() + "_" + Math.random().toString(36).slice(2, 11);
      const script = document.createElement("script");
      let timeoutId;

      const cleanup = () => {
        clearTimeout(timeoutId);
        script.remove();
        delete window[callbackName];
      };

      window[callbackName] = grupos => {
        cleanup();
        resolve(grupos);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error("No se pudieron cargar los grupos remotos"));
      };

      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("Tiempo de espera agotado al cargar los grupos"));
      }, 10000);

      script.src = `${API_URL}?action=groups&callback=${encodeURIComponent(callbackName)}`;
      document.head.appendChild(script);
    });
  },

  async createGroup(nombre, miembros) {
    // Validar
    if (!nombre || nombre.trim().length === 0) {
      throw new Error("Nombre del grupo requerido");
    }
    if (miembros.length < 2) {
      throw new Error("Mínimo 2 miembros requeridos");
    }

    const groupRequest = {
      id: this.createGroupId(),
      nombre: nombre.trim(),
      miembros: miembros.map(m => m.trim())
    };

    try {
      const response = await fetch(`${API_URL}?action=groups`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(groupRequest)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (!result.success || !this.isValidGroup(result.group)) {
        throw new Error(result.error || "Respuesta de creación no válida");
      }

      return result.group;
    } catch (error) {
      console.error("Error en createGroup:", error);
      throw new Error("No se pudo guardar el grupo. Inténtalo de nuevo.");
    }
  },

  isValidGroup(group) {
    return Boolean(
      group &&
      typeof group.id === "string" &&
      group.id.trim() &&
      typeof group.nombre === "string" &&
      group.nombre.trim() &&
      Array.isArray(group.miembros) &&
      group.miembros.length >= 2 &&
      group.miembros.every(member => typeof member === "string" && member.trim())
    );
  },

  getLocalGroups() {
    const grupos = Object.values(this.GROUPS_STATIC);

    try {
      const storedGroups = JSON.parse(localStorage.getItem("customGroups") || "[]");
      const customGroups = Array.isArray(storedGroups)
        ? storedGroups.filter(this.isValidGroup)
        : [];

      return [...grupos, ...customGroups];
    } catch (error) {
      console.warn("No se pudieron leer los grupos locales:", error);
      return grupos;
    }
  },

  createGroupId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return `grp_${crypto.randomUUID()}`;
    }

    return "grp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 11);
  },

  async getPayments(groupId) {
    // Encontrar nombre del grupo (lookup)
    const grupos = await this.getGroups();
    const grupo = grupos.find(g => g.id === groupId);

    if (!grupo) {
      throw new Error(`Grupo no encontrado: ${groupId}`);
    }

    // Llamar a Google Sheets con el nombre del grupo
    try {
      const response = await fetch(`${API_URL}?group=${encodeURIComponent(grupo.nombre)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const history = await response.json();

      // Transformar respuesta a formato DataService
      return history.map(h => ({
        id: h.id || (Date.now() + Math.random()), // Si no tiene ID, generar uno
        groupId: groupId,
        nombre: h.name,
        date: h.date,
        pending: h.pending || false
      }));
    } catch (error) {
      console.error("Error en getPayments:", error);
      throw error;
    }
  },

  async addPayment(groupId, nombre) {
    // Obtener grupo
    const grupos = await this.getGroups();
    const grupo = grupos.find(g => g.id === groupId);

    if (!grupo) {
      throw new Error(`Grupo no encontrado: ${groupId}`);
    }

    const timestamp = this.getTimestamp();
    const paymentId = Date.now();

    // Llamar a Google Sheets
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          group: grupo.nombre,
          name: nombre,
          date: timestamp
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return {
        id: paymentId,
        groupId,
        nombre,
        date: timestamp,
        pending: true
      };
    } catch (error) {
      console.error("Error en addPayment:", error);
      throw error;
    }
  },

  async deletePayment(paymentId, metadata) {
    // metadata contiene: { groupId, nombre, date }
    // Necesario porque Google Sheets necesita saber qué grupo/nombre eliminar
    
    if (!metadata || !metadata.groupId) {
      throw new Error("Metadata requerida para eliminar registro");
    }

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          _method: "DELETE",
          group: metadata.groupName,
          id: paymentId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error("Error en deletePayment:", error);
      return { success: false, error };
    }
  },

  getTimestamp() {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, "0");
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const y = now.getFullYear();
    const h = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const sec = String(now.getSeconds()).padStart(2, "0");

    return `${d}/${m}/${y} ${h}:${min}:${sec}`;
  }
};

// Usar la implementación actual
let impl = GoogleSheetsImpl;
