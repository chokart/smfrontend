<template>
  <div class="pulp-calculator-container">
    <div class="header-section">
      <h2>Calculadora de Pulpa Metalúrgica</h2>
      <p>Ingrese al menos dos valores conocidos para calcular las propiedades completas del flujo.</p>
    </div>

    <div class="calculator-grid">
      <!-- PANEL DE ENTRADA -->
      <section class="card input-panel">
        <h3>Datos de Entrada</h3>
        <div class="input-grid">
          <div class="input-group">
            <label>Gs (Sólido):</label>
            <input type="number" v-model.number="form.rho_solid" step="0.01" />
          </div>
          <div class="input-group">
            <label>ρl (Líquido):</label>
            <input type="number" v-model.number="form.rho_liquid" step="0.01" />
          </div>
          <hr class="divider" />
          <div class="input-group">
            <label>Tonelaje Sólido (tph):</label>
            <input type="number" v-model.number="form.ton_solid" @input="clearCalculated('ton_solid')" />
          </div>
          <div class="input-group">
            <label>Tonelaje Líquido (tph):</label>
            <input type="number" v-model.number="form.ton_liquid" @input="clearCalculated('ton_liquid')" />
          </div>
          <div class="input-group">
            <label>Densidad Pulpa (kg/L):</label>
            <input type="number" v-model.number="form.rho_pulp" @input="clearCalculated('rho_pulp')" />
          </div>
          <div class="input-group">
            <label>% Sólidos (Peso):</label>
            <input type="number" v-model.number="form.percent_solid_w" @input="clearCalculated('percent_solid_w')" />
          </div>
          <div class="input-group">
            <label>Flujo Volumétrico (m³/h):</label>
            <input type="number" v-model.number="form.vol_pulp" @input="clearCalculated('vol_pulp')" />
          </div>
          <div class="input-group">
            <label>Tonelaje Pulpa (tph):</label>
            <input type="number" v-model.number="form.ton_pulp" @input="clearCalculated('ton_pulp')" />
          </div>
        </div>
        
        <div class="actions">
          <button @click="calculate" class="btn-calculate" :disabled="loading">
            {{ loading ? 'Calculando...' : 'Calcular Variables' }}
          </button>
          <button @click="resetForm" class="btn-reset">Limpiar</button>
        </div>
      </section>

      <!-- PANEL DE RESULTADOS -->
      <section class="card results-panel" v-if="results">
        <h3>Resultados del Flujo</h3>
        <div class="results-grid">
          <div class="result-item">
            <span class="label">Tonelaje Sólido:</span>
            <span class="value">{{ results.ton_solid }} tph</span>
          </div>
          <div class="result-item">
            <span class="label">Tonelaje Agua:</span>
            <span class="value">{{ results.ton_liquid }} tph</span>
          </div>
          <div class="result-item">
            <span class="label">Tonelaje Pulpa:</span>
            <span class="value">{{ results.ton_pulp }} tph</span>
          </div>
          <div class="result-item highlight">
            <span class="label">Densidad Pulpa:</span>
            <span class="value">{{ results.rho_pulp }} kg/L</span>
          </div>
          <div class="result-item highlight">
            <span class="label">% Sólidos (w/w):</span>
            <span class="value">{{ results.percent_solid_w }} %</span>
          </div>
          <div class="result-item">
            <span class="label">% Sólidos (v/v):</span>
            <span class="value">{{ results.percent_solid_v }} %</span>
          </div>
          <div class="result-item">
            <span class="label">Volumen Sólido:</span>
            <span class="value">{{ results.vol_solid }} m³/h</span>
          </div>
          <div class="result-item">
            <span class="label">Volumen Agua:</span>
            <span class="value">{{ results.vol_liquid }} m³/h</span>
          </div>
          <div class="result-item">
            <span class="label">Flujo Total:</span>
            <span class="value">{{ results.vol_pulp }} m³/h</span>
          </div>
          <div class="result-item">
            <span class="label">Relación L/S:</span>
            <span class="value">{{ results.liquid_solid_ratio }}</span>
          </div>
        </div>
      </section>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

const form = reactive({
  rho_solid: 2.7,
  rho_liquid: 1.0,
  ton_solid: null,
  ton_liquid: null,
  rho_pulp: null,
  percent_solid_w: null,
  vol_pulp: null,
  ton_pulp: null
})

const results = ref(null)
const loading = ref(false)
const error = ref(null)

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api.suiteminerals.com' : 'http://localhost:8000');

const calculate = async () => {
  loading.value = true
  error.value = null
  try {
    const response = await fetch(`${API_URL}/pulp-calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.detail || 'Error en el cálculo')
    }
    
    results.value = await response.json()
  } catch (e) {
    error.value = e.message
    results.value = null
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  Object.keys(form).forEach(key => {
    if (key === 'rho_solid') form[key] = 2.7
    else if (key === 'rho_liquid') form[key] = 1.0
    else form[key] = null
  })
  results.value = null
  error.value = null
}

// Opcional: limpiar otros campos si se desea un comportamiento más estricto
const clearCalculated = (field) => {
  error.value = null
}
</script>

<style scoped>
.pulp-calculator-container {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.header-section {
  text-align: center;
  margin-bottom: 30px;
}

.calculator-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 768px) {
  .calculator-grid {
    grid-template-columns: 1fr;
  }
}

.card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.input-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.input-group {
  display: flex;
  flex-direction: column;
}

.input-group label {
  font-size: 0.85rem;
  margin-bottom: 5px;
  color: #666;
}

.input-group input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.divider {
  grid-column: span 2;
  border: none;
  border-top: 1px solid #eee;
  margin: 10px 0;
}

.actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}

.btn-calculate {
  flex: 2;
  background: #007bff;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-reset {
  flex: 1;
  background: #f8f9fa;
  border: 1px solid #ddd;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
}

.results-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.result-item.highlight {
  background: #f0f7ff;
  font-weight: bold;
}

.value {
  color: #007bff;
}

.error-message {
  margin-top: 20px;
  padding: 15px;
  background: #f8d7da;
  color: #721c24;
  border-radius: 6px;
  text-align: center;
}
</style>
