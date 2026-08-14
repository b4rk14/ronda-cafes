// ============================================
// DATA SERVICE - Abstracción de datos
// ============================================
// Interfaz agnóstica que encapsula toda comunicación
// con la capa de persistencia. Permite cambiar de backend
// (Google Sheets → Firestore/Supabase) sin tocar app.js

const API_URL = "https://script.google.com/macros/s/AKfycbycHv1h_dSBfkMiW4D2I4CBvYOt6mrZtbpQZ55v5xNIXuqZTzBd2KR4-Kwg1fvxEdjLMA/exec";

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
    // Convertir estructura interna a formato DataService
    const grupos = Object.values(this.GROUPS_STATIC);
    
    // Si hay grupos guardados en localStorage (creados después), agregarlos
    const customGroups = JSON.parse(localStorage.getItem("customGroups") || "[]");
    
    return [...grupos, ...customGroups];
  },

  async createGroup(nombre, miembros) {
    // Validar
    if (!nombre || nombre.trim().length === 0) {
      throw new Error("Nombre del grupo requerido");
    }
    if (miembros.length < 2) {
      throw new Error("Mínimo 2 miembros requeridos");
    }

    // Generar ID único (UUID simple)
    const id = "grp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

    const grupo = {
      id,
      nombre: nombre.trim(),
      miembros: miembros.map(m => m.trim()),
      createdAt: new Date().toISOString()
    };

    // Guardar en localStorage (temporal, hasta migración a Sheets)
    const customGroups = JSON.parse(localStorage.getItem("customGroups") || "[]");
    customGroups.push(grupo);
    localStorage.setItem("customGroups", JSON.stringify(customGroups));

    return grupo;
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
