<template>
  <div class="hydrocyclone-container">
    <div class="header-section">
      <h2>Análisis de Funcionamiento de Hidrociclones</h2>
      <p class="subtitle">Balance de Masa, Eficiencia de Clasificación y Distribución Granulométrica</p>
    </div>

    <div class="grid-layout">
      <!-- Sección de Condiciones -->
      <section class="card parameters">
        <h3>1. Condiciones de la Prueba</h3>
        <div class="input-group">
          <label>Presión (P) [kPa]:</label>
          <input type="number" v-model="pressure" step="1" />
        </div>
        <div class="input-group">
          <label>Densidad Sólidos (ρs) [g/cm³]:</label>
          <input type="number" v-model="solid_density" step="0.01" />
        </div>
        <div class="input-group">
          <label>% Sólidos Alimento (%):</label>
          <input type="number" v-model="feed_p_solids" step="0.1" />
        </div>
        <div class="input-group">
          <label>% Sólidos Rebose (%):</label>
          <input type="number" v-model="overflow_p_solids" step="0.1" />
        </div>
        <div class="input-group">
          <label>% Sólidos Descarga (%):</label>
          <input type="number" v-model="underflow_p_solids" step="0.1" />
        </div>
        <div class="info-box">
          <p>Este módulo realiza una <strong>reconciliación de masa</strong> para ajustar tus datos experimentales y obtener curvas de eficiencia precisas.</p>
        </div>
      </section>

      <!-- Sección de Granulometría (Mallas) -->
      <section class="card sieves">
        <h3>2. Datos de Mallas y Pesos</h3>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Malla [µm]</th>
                <th>Alimento [g]</th>
                <th>Rebose (OF) [g]</th>
                <th>Descarga (UF) [g]</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(sieve, index) in sieves" :key="index">
                <td><input type="number" v-model="sieve.mesh_size" /></td>
                <td><input type="number" v-model="sieve.weight_feed" /></td>
                <td><input type="number" v-model="sieve.weight_overflow" /></td>
                <td><input type="number" v-model="sieve.weight_underflow" /></td>
                <td><button @click="removeSieve(index)" class="btn-remove" title="Eliminar">×</button></td>
              </tr>
              <tr class="pan-row">
                <td><strong>Fondo (Pan)</strong></td>
                <td><input type="number" v-model="pan_weights.feed" /></td>
                <td><input type="number" v-model="pan_weights.overflow" /></td>
                <td><input type="number" v-model="pan_weights.underflow" /></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        <button @click="addSieve" class="btn-add">+ Agregar Malla</button>
      </section>
    </div>

    <div class="actions">
      <button @click="calculate" :disabled="loading" class="btn-calculate">
        {{ loading ? 'Procesando...' : 'Analizar Funcionamiento' }}
      </button>
    </div>

    <!-- RESULTADOS DEL ANÁLISIS -->
    <template v-if="results">
      <div class="results-summary-grid">
        <section class="card result-card">
          <h4>Punto de Corte (d50c)</h4>
          <div class="stat">
            <span class="label">Ajustado:</span> 
            <span class="val">{{ results.d50c_adjusted.toFixed(2) }} µm</span>
          </div>
          <div class="stat-sub">Experimental: {{ results.d50c_experimental.toFixed(2) }} µm</div>
        </section>
        <section class="card result-card">
          <h4>Eficiencia y Bypass</h4>
          <div class="stat">
            <span class="label">Bypass (Rf):</span> 
            <span class="val">{{ results.water_balance.bypass_Rf.toFixed(2) }} %</span>
          </div>
          <div class="stat-sub" v-if="results.water_balance.water_recovery_Rw">Recup. Agua (Rw): {{ results.water_balance.water_recovery_Rw.toFixed(2) }} %</div>
        </section>
        <section class="card result-card">
          <h4>Recuperación de Sólidos</h4>
          <div class="stat">
            <span class="label">Sólidos (S):</span> 
            <span class="val">{{ results.water_balance.solids_recovery_S.toFixed(2) }} %</span>
          </div>
          <div class="stat-sub">Flujo UF: {{ results.water_balance.underflow_flow.toFixed(1) }} unidades</div>
        </section>
      </div>

      <div class="charts-grid">
        <section class="card chart-card">
          <h3>Curva de Partición (Eficiencia)</h3>
          <div class="chart-wrapper">
            <Line :data="partitionChartData" :options="partitionChartOptions" />
          </div>
        </section>
        <section class="card chart-card">
          <h3>Distribución Granulométrica</h3>
          <div class="chart-wrapper">
            <Line :data="granulometryChartData" :options="granulometryChartOptions" />
          </div>
        </section>
      </div>

      <section class="card table-card">
        <h3>Balance de Masa Detallado (Experimental vs Ajustado)</h3>
        <div class="table-container">
          <table class="balance-table">
            <thead>
              <tr>
                <th rowspan="2">Fracción</th>
                <th colspan="2">% Alimento</th>
                <th colspan="2">% Rebose (OF)</th>
                <th colspan="2">% Descarga (UF)</th>
                <th rowspan="2">Eficiencia (Ea)</th>
              </tr>
              <tr>
                <th>Exp.</th>
                <th>Adj.</th>
                <th>Exp.</th>
                <th>Adj.</th>
                <th>Exp.</th>
                <th>Adj.</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in results.balance_table" :key="row.size">
                <td>{{ row.size }}</td>
                <td class="exp">{{ row.feed_pct.toFixed(2) }}</td>
                <td class="adj">{{ row.feed_pct_adj.toFixed(2) }}</td>
                <td class="exp">{{ row.overflow_pct.toFixed(2) }}</td>
                <td class="adj">{{ row.overflow_pct_adj.toFixed(2) }}</td>
                <td class="exp">{{ row.underflow_pct.toFixed(2) }}</td>
                <td class="adj">{{ row.underflow_pct_adj.toFixed(2) }}</td>
                <td class="eff">{{ (row.recovery_underflow * 100).toFixed(2) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import {
  Chart as ChartJS, Title, Tooltip, Legend, LineElement, PointElement, 
  LinearScale, LogarithmicScale, CategoryScale, Filler
} from 'chart.js';
import { Line } from 'vue-chartjs';

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, LinearScale, LogarithmicScale, CategoryScale, Filler);

const loading = ref(false);
const results = ref(null);

// Estado de entrada
const pressure = ref(70);
const feed_p_solids = ref(30);
const overflow_p_solids = ref(15);
const underflow_p_solids = ref(70);
const solid_density = ref(2.65);

const pan_weights = reactive({ feed: 150, overflow: 300, underflow: 20 });
const sieves = ref([
  { mesh_size: 1000, weight_feed: 10, weight_overflow: 0, weight_underflow: 20 },
  { mesh_size: 500, weight_feed: 50, weight_overflow: 5, weight_underflow: 100 },
  { mesh_size: 250, weight_feed: 120, weight_overflow: 15, weight_underflow: 250 },
  { mesh_size: 150, weight_feed: 200, weight_overflow: 60, weight_underflow: 180 },
  { mesh_size: 75, weight_feed: 150, weight_overflow: 150, weight_underflow: 80 },
  { mesh_size: 37, weight_feed: 80, weight_overflow: 200, weight_underflow: 30 }
]);

const addSieve = () => sieves.value.push({ mesh_size: 0, weight_feed: 0, weight_overflow: 0, weight_underflow: 0 });
const removeSieve = (index) => sieves.value.splice(index, 1);

// Lógica de Gráficos
const partitionChartData = computed(() => {
  if (!results.value) return { labels: [], datasets: [] };
  const pts = [...results.value.partition_curve].sort((a,b) => a.size - b.size);
  return {
    labels: pts.map(p => p.size),
    datasets: [
      { label: 'Ec (Corregida)', borderColor: '#2196F3', data: pts.map(p => p.corrected_recovery), tension: 0.4, fill: true, backgroundColor: 'rgba(33, 150, 243, 0.1)' },
      { label: 'Ea (Ajustada)', borderColor: '#4CAF50', data: pts.map(p => p.adjusted_recovery), tension: 0.4 },
      { label: 'Ea (Experimental)', borderColor: '#f44336', borderDash: [5,5], data: pts.map(p => p.actual_recovery), tension: 0.4 }
    ]
  };
});

const granulometryChartData = computed(() => {
  if (!results.value) return { labels: [], datasets: [] };
  const pts = [...results.value.granulometry_curve].sort((a,b) => a.size - b.size);
  return {
    labels: pts.map(p => p.size),
    datasets: [
      { label: 'Alimento (Adj)', borderColor: '#4CAF50', data: pts.map(p => p.feed_passing_adj), tension: 0.3 },
      { label: 'Rebose (Adj)', borderColor: '#FF9800', data: pts.map(p => p.overflow_passing_adj), tension: 0.3 },
      { label: 'Descarga (Adj)', borderColor: '#9C27B0', data: pts.map(p => p.underflow_passing_adj), tension: 0.3 },
      { label: 'Alimento (Exp)', borderColor: '#4CAF50', borderDash: [2,2], data: pts.map(p => p.feed_passing), tension: 0.3, hidden: true }
    ]
  };
});

const partitionChartOptions = {
  responsive: true, maintainAspectRatio: false,
  scales: {
    x: { type: 'logarithmic', title: { display: true, text: 'Tamaño (µm)' } },
    y: { min: 0, max: 1.1, title: { display: true, text: 'Recuperación al UF (Fracción)' } }
  }
};

const granulometryChartOptions = {
  responsive: true, maintainAspectRatio: false,
  scales: {
    x: { type: 'logarithmic', title: { display: true, text: 'Tamaño (µm)' } },
    y: { min: 0, max: 100, title: { display: true, text: '% Pasante Acumulado' } }
  }
};

const calculate = async () => {
  loading.value = true;
  const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api.suiteminerals.com' : 'http://localhost:8000');
  
  try {
    const response = await fetch(`${API_URL}/model/hydrocyclone/rao-lynch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sieves: sieves.value,
        pan_feed: pan_weights.feed, pan_overflow: pan_weights.overflow, pan_underflow: pan_weights.underflow,
        pressure: pressure.value, solid_density: solid_density.value, 
        feed_p_solids: feed_p_solids.value,
        overflow_p_solids: overflow_p_solids.value,
        underflow_p_solids: underflow_p_solids.value
      })
    });
    if (!response.ok) throw new Error('Error en el servidor');
    results.value = await response.json();
  } catch (error) {
    alert("Error: " + error.message);
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.hydrocyclone-container { padding: 24px; max-width: 1300px; margin: 0 auto; font-family: 'Segoe UI', sans-serif; }
.header-section { margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
.header-section h2 { color: #1a237e; margin: 0; }
.subtitle { color: #666; margin: 5px 0 0; }

.grid-layout { display: grid; grid-template-columns: 350px 1fr; gap: 24px; margin-bottom: 24px; }
.card { background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.card h3 { color: #3f51b5; margin-top: 0; font-size: 1.1rem; border-left: 4px solid #3f51b5; padding-left: 10px; margin-bottom: 20px; }

.input-group { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.input-group label { font-size: 0.9rem; color: #555; }
.input-group input { width: 90px; padding: 6px; border-radius: 6px; border: 1px solid #ccc; text-align: right; }

.info-box { background: #e8eaf6; padding: 12px; border-radius: 8px; margin-top: 20px; font-size: 0.85rem; color: #3f51b5; }

.table-container { overflow-x: auto; margin-bottom: 15px; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px; border-bottom: 1px solid #eee; text-align: center; font-size: 0.9rem; }
th { background: #f8f9fa; color: #777; font-weight: 600; }
td input { width: 100%; border: 1px solid transparent; text-align: center; padding: 4px; border-radius: 4px; }
td input:focus { border-color: #3f51b5; outline: none; background: #f5f7ff; }

.pan-row { background: #f5f5f5; font-weight: bold; }
.btn-add { width: 100%; padding: 8px; background: #f1f8e9; color: #33691e; border: 1px dashed #33691e; border-radius: 6px; cursor: pointer; font-weight: 600; }
.btn-remove { background: #ffebee; color: #c62828; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; }

.actions { margin-bottom: 30px; }
.btn-calculate { width: 100%; padding: 16px; background: #3f51b5; color: #fff; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1.1rem; box-shadow: 0 4px 12px rgba(63, 81, 181, 0.3); }
.btn-calculate:hover { background: #303f9f; }

.results-summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 24px; }
.result-card { text-align: center; }
.result-card h4 { margin: 0 0 10px; color: #777; font-size: 0.9rem; text-transform: uppercase; }
.result-card .val { font-size: 1.4rem; font-weight: 800; color: #1a237e; }

.charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
.chart-wrapper { height: 380px; }

.balance-table tr:hover { background: #f5f7ff; }

.stat-sub { font-size: 0.8rem; color: #888; margin-top: 4px; }
.exp { color: #888; font-style: italic; background: #fafafa; }
.adj { font-weight: 600; color: #2e7d32; }
.eff { font-weight: bold; color: #1565c0; }

.balance-table th { font-size: 0.75rem; text-transform: uppercase; vertical-align: middle; }
</style>
