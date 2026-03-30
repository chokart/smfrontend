<template>
  <div class="hydrocyclone-container">
    <div class="header-section">
      <h2>Modelamiento de Hidrociclones - Rao y Lynch</h2>
      <p class="subtitle">Calibración y Simulación de Eficiencia de Clasificación</p>
    </div>

    <div class="grid-layout">
      <!-- Sección de Geometría y Operación -->
      <section class="card parameters">
        <h3>1. Parámetros de Simulación</h3>
        <div class="input-group">
          <label>Diámetro Ciclón (Dc) [mm]:</label>
          <input type="number" v-model="geometry.Dc" step="0.1" />
        </div>
        <div class="input-group">
          <label>Diámetro Entrada (Di) [mm]:</label>
          <input type="number" v-model="geometry.Di" step="0.1" />
        </div>
        <div class="input-group">
          <label>Vortex Finder (Do) [mm]:</label>
          <input type="number" v-model="geometry.Do" step="0.1" />
        </div>
        <div class="input-group">
          <label>Apex (Du) [mm]:</label>
          <input type="number" v-model="geometry.Du" step="0.1" />
        </div>
        <div class="input-group">
          <label>Presión (P) [kPa]:</label>
          <input type="number" v-model="pressure" step="1" />
        </div>
        <div class="input-group">
          <label>% Sólidos Alimento (%):</label>
          <input type="number" v-model="feed_p_solids" step="0.1" />
        </div>
        
        <div class="divider"></div>
        <h4>Constantes de Calibración</h4>
        <div class="input-group highlight">
          <label>K1 (Capacidad):</label>
          <input type="number" v-model="manual_k1" placeholder="Auto" step="0.01" />
        </div>
        <div class="input-group highlight">
          <label>K3 (Corte):</label>
          <input type="number" v-model="manual_k3" placeholder="Auto" step="0.01" />
        </div>
        <p class="info-text">* Deja vacío para usar calibración automática.</p>
      </section>

      <!-- Sección de Granulometría (Mallas) -->
      <section class="card sieves">
        <h3>2. Datos Experimentales (Mallas)</h3>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Malla [µm]</th>
                <th>Alimento [g]</th>
                <th>Rebose [g]</th>
                <th>Descarga [g]</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(sieve, index) in sieves" :key="index">
                <td><input type="number" v-model="sieve.mesh_size" /></td>
                <td><input type="number" v-model="sieve.weight_feed" /></td>
                <td><input type="number" v-model="sieve.weight_overflow" /></td>
                <td><input type="number" v-model="sieve.weight_underflow" /></td>
                <td><button @click="removeSieve(index)" class="btn-remove">×</button></td>
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
        {{ loading ? 'Procesando...' : 'Calcular y Calibrar Modelo' }}
      </button>
    </div>

    <!-- RESULTADOS Y GRÁFICOS -->
    <template v-if="results">
      <div class="results-summary-grid">
        <section class="card result-card">
          <h4>Calibración Hallada</h4>
          <div class="stat"><span class="label">K1 Calc:</span> <span class="val">{{ results.k1_calculated.toFixed(3) }}</span></div>
          <div class="stat"><span class="label">K3 Calc:</span> <span class="val">{{ results.k3_calculated.toFixed(3) }}</span></div>
        </section>
        <section class="card result-card">
          <h4>Corte (d50)</h4>
          <div class="stat"><span class="label">Experimental:</span> <span class="val">{{ results.d50c_experimental.toFixed(2) }} µm</span></div>
          <div class="stat"><span class="label">Predicho:</span> <span class="val">{{ results.d50c_predicted.toFixed(2) }} µm</span></div>
        </section>
        <section class="card result-card">
          <h4>Operación</h4>
          <div class="stat"><span class="label">Capacidad Q:</span> <span class="val">{{ results.capacity_Q.toFixed(2) }} m³/h</span></div>
          <div class="stat"><span class="label">Bypass (Rf):</span> <span class="val">{{ results.water_bypass_Rf.toFixed(2) }} %</span></div>
        </section>
      </div>

      <div class="charts-grid">
        <section class="card chart-card">
          <h3>Curva de Partición</h3>
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
        <h3>Tabla de Balance de Masa</h3>
        <div class="table-container">
          <table class="balance-table">
            <thead>
              <tr>
                <th>Fracción</th>
                <th>% Alimento</th>
                <th>% Rebose</th>
                <th>% Descarga</th>
                <th>Recup. Underflow (Ea)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in results.balance_table" :key="row.size">
                <td>{{ row.size }}</td>
                <td>{{ row.feed_pct.toFixed(2) }}%</td>
                <td>{{ row.overflow_pct.toFixed(2) }}%</td>
                <td>{{ row.underflow_pct.toFixed(2) }}%</td>
                <td>{{ (row.recovery_underflow * 100).toFixed(2) }}%</td>
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

const geometry = reactive({ Dc: 250, Di: 50, Do: 65, Du: 35 });
const pressure = ref(70);
const feed_p_solids = ref(30);
const solid_density = ref(2.65);
const manual_k1 = ref(null);
const manual_k3 = ref(null);

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
      { label: 'Ea (Real)', borderColor: '#f44336', borderDash: [5,5], data: pts.map(p => p.actual_recovery), tension: 0.4 }
    ]
  };
});

const granulometryChartData = computed(() => {
  if (!results.value) return { labels: [], datasets: [] };
  const pts = [...results.value.granulometry_curve].sort((a,b) => a.size - b.size);
  return {
    labels: pts.map(p => p.size),
    datasets: [
      { label: 'Alimento', borderColor: '#4CAF50', data: pts.map(p => p.feed_passing), tension: 0.3 },
      { label: 'Rebose (OF)', borderColor: '#FF9800', data: pts.map(p => p.overflow_passing), tension: 0.3 },
      { label: 'Descarga (UF)', borderColor: '#9C27B0', data: pts.map(p => p.underflow_passing), tension: 0.3 }
    ]
  };
});

const partitionChartOptions = {
  responsive: true, maintainAspectRatio: false,
  scales: {
    x: { type: 'logarithmic', title: { display: true, text: 'Tamaño (µm)' } },
    y: { min: 0, max: 1, title: { display: true, text: 'Recuperación al UF' } }
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
        geometry: geometry, pressure: pressure.value, solid_density: solid_density.value, feed_p_solids: feed_p_solids.value,
        k1: manual_k1.value, k3: manual_k3.value
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
.grid-layout { display: grid; grid-template-columns: 380px 1fr; gap: 24px; margin-bottom: 24px; }
.card { background: #fff; border: 1px solid #ddd; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.card h3 { color: #3f51b5; margin-top: 0; border-left: 4px solid #3f51b5; padding-left: 10px; }
.input-group { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.input-group input { width: 100px; padding: 6px; border-radius: 6px; border: 1px solid #ccc; text-align: right; }
.highlight { background: #f0f4ff; padding: 8px; border-radius: 6px; }
.divider { height: 1px; background: #eee; margin: 15px 0; }
.info-text { font-size: 0.75rem; color: #777; font-style: italic; }

.table-container { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px; border-bottom: 1px solid #eee; text-align: center; }
th { background: #f8f9fa; font-size: 0.8rem; color: #666; }
.pan-row { background: #f9f9f9; font-weight: bold; }

.btn-calculate { width: 100%; padding: 15px; background: #3f51b5; color: #fff; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1.1rem; }
.btn-calculate:hover { background: #303f9f; }

.results-summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 24px; }
.result-card .stat { display: flex; justify-content: space-between; margin-top: 8px; }
.result-card .val { font-weight: bold; color: #1a237e; font-size: 1.1rem; }

.charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
.chart-wrapper { height: 350px; }

.balance-table { font-size: 0.9rem; }
.balance-table tr:hover { background: #f5f7ff; }
</style>
