const API_BASE_URL = 
  import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? 'https://apism.suiteminerals.com' : 'http://localhost:8000');

/**
 * Función genérica para peticiones JSON con extracción amigable de errores de FastAPI.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorMessage = `Error en el servidor (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string' 
            ? errorData.detail 
            : JSON.stringify(errorData.detail);
        }
      } catch (_) {
        // En caso de que la respuesta de error no sea JSON
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`No se pudo conectar con el servidor en ${API_BASE_URL}. Verifica tu conexión.`);
    }
    throw error;
  }
}

export const api = {
  baseUrl: API_BASE_URL,

  healthCheck() {
    return request('/health');
  },

  // --- RECONCILIACIÓN Y CÁLCULOS ---
  reconcile(body) {
    return request('/reconcile', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  reconcileWater(body) {
    return request('/reconcile/water', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  previewEquations(body) {
    return request('/preview-equations', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  previewWaterEquations(body) {
    return request('/preview-water-equations', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  calculatePulp(form) {
    return request('/pulp-calculate', {
      method: 'POST',
      body: JSON.stringify(form),
    });
  },

  // --- GESTOR DE DIAGRAMAS EN SQLITE ---
  getDiagrams(module = null) {
    const query = module ? `?module=${encodeURIComponent(module)}` : '';
    return request(`/diagrams${query}`);
  },

  getDiagram(id) {
    return request(`/diagrams/${id}`);
  },

  saveDiagram({ name, description = '', module = 'metallurgical', data }) {
    return request('/diagrams', {
      method: 'POST',
      body: JSON.stringify({ name, description, module, data }),
    });
  },

  updateDiagram(id, { name, description, data }) {
    return request(`/diagrams/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description, data }),
    });
  },

  deleteDiagram(id) {
    return request(`/diagrams/${id}`, {
      method: 'DELETE',
    });
  },

  // --- TELEMETRÍA SENSOR DE NIVEL (ESP32) ---
  sendLevelReading(data) {
    return request('/level/reading', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getLatestLevel(deviceId = null) {
    const query = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
    return request(`/level/latest${query}`);
  },

  getLevelHistory(limit = 40, deviceId = null) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (deviceId) params.append('device_id', deviceId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/level/history${query}`);
  },

  simulateLevelReading(data) {
    return request('/level/simulate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export default api;
