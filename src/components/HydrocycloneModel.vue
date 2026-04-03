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
        <div class="input-group">
          <label>Flujo Alimento:</label>
          <div class="flow-input">
            <input type="number" v-model="feed_flow_rate" step="0.1" />
            <select v-model="feed_flow_unit">
              <option value="tph">tph (Sól)</option>
              <option value="m3h">m³/h (Pul)</option>
            </select>
          </div>
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
      
      <!-- 1. TABLAS DE BALANCE -->
      <section class="card table-card results-section">
        <div class="table-header-tabs">
          <button :class="{ active: activeTable === 'experimental' }" @click="activeTable = 'experimental'">Datos Experimentales</button>
          <button :class="{ active: activeTable === 'reconciled' }" @click="activeTable = 'reconciled'">Balance Reconciliado</button>
          <button v-if="results.balance_solids_table" :class="{ active: activeTable === 'solids' }" @click="activeTable = 'solids'">Balance por % de Sólidos</button>
        </div>

        <!-- TABLA EXPERIMENTAL -->
        <div v-if="activeTable === 'experimental'" class="table-container">
          <h3 class="table-title">Distribución Granulométrica Experimental</h3>
          <table class="balance-table experimental-mode">
            <thead>
              <tr>
                <th rowspan="2">Fracción</th>
                <th colspan="3">Alimento (Feed)</th>
                <th colspan="3">Rebose (Overflow)</th>
                <th colspan="3">Descarga (Underflow)</th>
              </tr>
              <tr>
                <th>Peso [g]</th>
                <th>% Ret.</th>
                <th>% Pas.</th>
                <th>Peso [g]</th>
                <th>% Ret.</th>
                <th>% Pas.</th>
                <th>Peso [g]</th>
                <th>% Ret.</th>
                <th>% Pas.</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in results.balance_table" :key="row.size" :class="{ 'total-row': row.size === 'TOTAL', 'pan-row-result': row.size === 'Fondo (Pan)' }">
                <td>{{ row.size }}</td>
                <td>{{ row.feed_w?.toFixed(1) }}</td>
                <td>{{ row.feed_pct.toFixed(2) }}</td>
                <td>{{ row.feed_pass?.toFixed(2) }}</td>
                <td>{{ row.overflow_w?.toFixed(1) }}</td>
                <td>{{ row.overflow_pct.toFixed(2) }}</td>
                <td>{{ row.overflow_pass?.toFixed(2) }}</td>
                <td>{{ row.underflow_w?.toFixed(1) }}</td>
                <td>{{ row.underflow_pct.toFixed(2) }}</td>
                <td>{{ row.underflow_pass?.toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- TABLA RECONCILIADA -->
        <div v-if="activeTable === 'reconciled'" class="table-container">
          <h3 class="table-title">Balance de Masa Reconciliado (Datos Ajustados)</h3>
          <table class="balance-table reconciled-mode">
            <thead>
              <tr>
                <th rowspan="2">Fracción</th>
                <th colspan="3">Alimento (Adj)</th>
                <th colspan="3">Rebose (Adj)</th>
                <th colspan="3">Descarga (Adj)</th>
                <th colspan="2">Eficiencia</th>
              </tr>
              <tr>
                <th>{{ feed_flow_unit === 'tph' ? 'tph' : 'g' }}</th>
                <th>% Ret.</th>
                <th>% Pas.</th>
                <th>{{ feed_flow_unit === 'tph' ? 'tph' : 'g' }}</th>
                <th>% Ret.</th>
                <th>% Pas.</th>
                <th>{{ feed_flow_unit === 'tph' ? 'tph' : 'g' }}</th>
                <th>% Ret.</th>
                <th>% Pas.</th>
                <th>Ea</th>
                <th>Ec</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in results.balance_table" :key="row.size" :class="{ 'total-row': row.size === 'TOTAL' }">
                <td>{{ row.size }}</td>
                <td class="adj">{{ row.feed_w_adj?.toFixed(2) }}</td>
                <td>{{ row.feed_pct_adj?.toFixed(2) }}</td>
                <td>{{ row.feed_pass_adj?.toFixed(2) }}</td>
                <td class="adj">{{ row.overflow_w_adj?.toFixed(2) }}</td>
                <td>{{ row.overflow_pct_adj?.toFixed(2) }}</td>
                <td>{{ row.overflow_pass_adj?.toFixed(2) }}</td>
                <td class="adj">{{ row.underflow_w_adj?.toFixed(2) }}</td>
                <td>{{ row.underflow_pct_adj?.toFixed(2) }}</td>
                <td>{{ row.underflow_pass_adj?.toFixed(2) }}</td>
                <td class="eff">{{ (row.recovery_underflow * 100).toFixed(2) }}%</td>
                <td class="eff cor">{{ row.recovery_corrected ? (row.recovery_corrected * 100).toFixed(2) + '%' : '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- TABLA POR SÓLIDOS -->
        <div v-if="activeTable === 'solids'" class="table-container">
          <h3 class="table-title">Balance por Porcentaje de Sólidos (Alimento Recalculado)</h3>
          <table class="balance-table solids-mode">
            <thead>
              <tr>
                <th rowspan="2">Fracción</th>
                <th colspan="3">Alimento (Calc)</th>
                <th colspan="3">Rebose (Exp)</th>
                <th colspan="3">Descarga (Exp)</th>
                <th colspan="2">Eficiencia</th>
              </tr>
              <tr>
                <th>{{ feed_flow_unit === 'tph' ? 'tph' : 'g' }}</th>
                <th>% Ret.</th>
                <th>% Pas.</th>
                <th>{{ feed_flow_unit === 'tph' ? 'tph' : 'g' }}</th>
                <th>% Ret.</th>
                <th>% Pas.</th>
                <th>{{ feed_flow_unit === 'tph' ? 'tph' : 'g' }}</th>
                <th>% Ret.</th>
                <th>% Pas.</th>
                <th>Ea</th>
                <th>Ec</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in results.balance_solids_table" :key="row.size" :class="{ 'total-row': row.size === 'TOTAL' }">
                <td>{{ row.size }}</td>
                <td class="adj">{{ row.feed_w_sol?.toFixed(2) }}</td>
                <td>{{ row.feed_pct.toFixed(2) }}</td>
                <td>{{ row.feed_pass?.toFixed(2) }}</td>
                <td class="adj">{{ row.overflow_w_sol?.toFixed(2) }}</td>
                <td>{{ row.overflow_pct.toFixed(2) }}</td>
                <td>{{ row.overflow_pass?.toFixed(2) }}</td>
                <td class="adj">{{ row.underflow_w_sol?.toFixed(2) }}</td>
                <td>{{ row.underflow_pct.toFixed(2) }}</td>
                <td>{{ row.underflow_pass?.toFixed(2) }}</td>
                <td class="eff">{{ (row.recovery_underflow * 100).toFixed(2) }}%</td>
                <td class="eff cor">{{ row.recovery_corrected ? (row.recovery_corrected * 100).toFixed(2) + '%' : '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 2. GRÁFICOS -->
      <div class="charts-grid results-section">
        <section class="card chart-card">
          <h3>Curva de Tromp (Eficiencia)</h3>
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

      <!-- 3. PARÁMETROS OPERATIVOS -->
      <div class="results-summary-grid results-section">
        <section class="card result-card destaque">
          <h4>Punto de Corte (d50 / d50c)</h4>
          <div class="stat">
            <span class="val">{{ currentMetrics.d50.toFixed(1) }} / {{ currentMetrics.d50c.toFixed(1) }} µm</span>
          </div>
          <div class="stat-sub">Basado en {{ activeTable === 'solids' ? '% Sólidos' : 'Reconciliación' }}</div>
        </section>
        <section class="card result-card">
          <h4>Bypass (Rf)</h4>
          <div class="stat">
            <span class="val">{{ currentMetrics.bypass_rf.toFixed(2) }} %</span>
          </div>
          <div class="stat-sub">Eficiencia en Fondo</div>
        </section>
        <section class="card result-card">
          <h4>Recup. Sólidos (S)</h4>
          <div class="stat">
            <span class="val">{{ currentMetrics.solids_recovery_s.toFixed(2) }} %</span>
          </div>
          <div class="stat-sub">Global a la Descarga</div>
        </section>
      </div>

      <!-- BALANCE GLOBAL -->
      <section class="card table-card results-section" v-if="results.water_balance.global_balance">
        <h3>Balance Global de Masa y Volumen ({{ activeTable === 'solids' ? 'Modo % Sólidos' : 'Modo Reconciliado' }})</h3>
        <div class="table-container">
          <table class="global-balance-table">
            <thead>
              <tr>
                <th>Corriente</th>
                <th>% Sólidos</th>
                <th>Masa Sól. [tph]</th>
                <th>Masa Agua [tph]</th>
                <th>Vol. Pulpa [m³/h]</th>
              </tr>
            </thead>
            <tbody v-if="activeTable !== 'solids' || !results.water_balance.global_balance_solids">
              <tr v-for="key in ['feed', 'overflow', 'underflow']" :key="key">
                <td><strong>{{ key === 'feed' ? 'Alimento (Feed)' : key === 'overflow' ? 'Rebose (Overflow)' : 'Descarga (Underflow)' }}</strong></td>
                <td>{{ results.water_balance.global_balance[key].p_solids.toFixed(1) }}%</td>
                <td>{{ results.water_balance.global_balance[key].mass_solids.toFixed(2) }}</td>
                <td>{{ results.water_balance.global_balance[key].mass_water.toFixed(2) }}</td>
                <td>{{ results.water_balance.global_balance[key].vol_pulp.toFixed(2) }}</td>
              </tr>
            </tbody>
            <tbody v-else>
              <tr v-for="key in ['feed', 'overflow', 'underflow']" :key="key">
                <td><strong>{{ key === 'feed' ? 'Alimento (Feed)' : key === 'overflow' ? 'Rebose (Overflow)' : 'Descarga (Underflow)' }}</strong></td>
                <td>{{ results.water_balance.global_balance_solids[key].p_solids.toFixed(1) }}%</td>
                <td>{{ results.water_balance.global_balance_solids[key].mass_solids.toFixed(2) }}</td>
                <td>{{ results.water_balance.global_balance_solids[key].mass_water.toFixed(2) }}</td>
                <td>{{ results.water_balance.global_balance_solids[key].vol_pulp.toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import {
  Chart as ChartJS, Title, Tooltip, Legend, LineElement, PointElement, 
  LinearScale, LogarithmicScale, CategoryScale, Filler
} from 'chart.js';
import { Line } from 'vue-chartjs';

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, LinearScale, LogarithmicScale, CategoryScale, Filler);

const loading = ref(false);
const results = ref(null);
const activeTable = ref('experimental');

const currentMetrics = computed(() => {
  if (!results.value) return { d50: 0, d50c: 0, bypass_rf: 0, solids_recovery_s: 0 };
  if (activeTable.value === 'solids' && results.value.solids_metrics) return results.value.solids_metrics;
  return results.value.reconciled_metrics || { d50: 0, d50c: 0, bypass_rf: 0, solids_recovery_s: 0 };
});

const pressure = ref(70);
const feed_p_solids = ref(30);
const overflow_p_solids = ref(15);
const underflow_p_solids = ref(70);
const solid_density = ref(2.65);
const feed_flow_rate = ref(100);
const feed_flow_unit = ref('tph');

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

const partitionChartData = computed(() => {
  if (!results.value) return { labels: [], datasets: [] };
  const pts = [...results.value.partition_curve].sort((a,b) => a.size - b.size);
  const bypass = results.value.water_balance.bypass_Rf / 100;
  const labels = [1, ...pts.map(p => p.size)];
  const datasets = [
    { label: 'Ea (Reconciliado)', borderColor: '#4CAF50', data: [bypass, ...pts.map(p => p.adjusted_recovery)], tension: 0.4 },
    { label: 'Ea (Exp)', borderColor: '#f44336', backgroundColor: '#f44336', data: [null, ...pts.map(p => p.actual_recovery)], showLine: false, pointRadius: 5, pointStyle: 'rectRot' },
    { label: 'Bypass (Rf)', borderColor: '#ccc', borderDash: [2,2], data: labels.map(() => bypass), pointRadius: 0, fill: false }
  ];
  if (pts[0].solids_recovery !== undefined) datasets.push({ label: 'Ea (% Sól)', borderColor: '#9C27B0', borderDash: [5, 5], data: [null, ...pts.map(p => p.solids_recovery)], tension: 0.4 });
  return { labels, datasets };
});

const granulometryChartData = computed(() => {
  if (!results.value) return { labels: [], datasets: [] };
  const pts = [...results.value.granulometry_curve].sort((a,b) => a.size - b.size);
  return {
    labels: pts.map(p => p.size),
    datasets: [
      { label: 'Alim (Adj)', borderColor: '#4CAF50', data: pts.map(p => p.feed_passing_adj), tension: 0.3 },
      { label: 'Reb (Adj)', borderColor: '#FF9800', data: pts.map(p => p.overflow_passing_adj), tension: 0.3 },
      { label: 'Des (Adj)', borderColor: '#9C27B0', data: pts.map(p => p.underflow_passing_adj), tension: 0.3 }
    ]
  };
});

const partitionChartOptions = { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'logarithmic' }, y: { min: 0, max: 1.1 } } };
const granulometryChartOptions = { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'logarithmic' }, y: { min: 0, max: 100 } } };

const calculate = async () => {
  loading.value = true;
  const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api.suiteminerals.com' : 'http://localhost:8000');
  try {
    const res = await fetch(`${API_URL}/model/hydrocyclone/rao-lynch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sieves: sieves.value, pan_feed: pan_weights.feed, pan_overflow: pan_weights.overflow, pan_underflow: pan_weights.underflow,
        pressure: pressure.value, solid_density: solid_density.value, feed_p_solids: feed_p_solids.value,
        overflow_p_solids: overflow_p_solids.value, underflow_p_solids: underflow_p_solids.value,
        feed_flow_rate: feed_flow_rate.value, feed_flow_unit: feed_flow_unit.value
      })
    });
    results.value = await res.json();
    setTimeout(() => { document.querySelector('.results-section')?.scrollIntoView({ behavior: 'smooth' }); }, 100);
  } catch (e) { alert("Error: " + e.message); } finally { loading.value = false; }
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
.flow-input { display: flex; gap: 5px; }
.flow-input input { width: 70px; }
.flow-input select { padding: 4px; border-radius: 6px; border: 1px solid #ccc; font-size: 0.8rem; }
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
.results-section { margin-top: 32px; border-top: 1px solid #eee; padding-top: 24px; }
.results-summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 24px; }
.result-card { text-align: center; }
.result-card h4 { margin: 0 0 10px; color: #777; font-size: 0.9rem; text-transform: uppercase; }
.result-card .val { font-size: 1.4rem; font-weight: 800; color: #1a237e; }
.charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
.chart-wrapper { height: 380px; }
.balance-table tr:hover { background: #f5f7ff; }
.adj { font-weight: 600; color: #2e7d32; background: #f1f8e9; }
.eff { font-weight: bold; color: #1565c0; }
.total-row { background: #e8eaf6 !important; font-weight: bold; color: #1a237e; border-top: 2px solid #3f51b5; }
.global-balance-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
.global-balance-table th, .global-balance-table td { padding: 12px; border: 1px solid #eee; text-align: right; }
.global-balance-table th { background: #f5f7ff; color: #1a237e; text-align: center; }
.global-balance-table td:first-child { text-align: left; background: #fafafa; }
.table-header-tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
.table-header-tabs button { padding: 10px 20px; border: none; background: #f5f5f5; color: #666; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s; }
.table-header-tabs button.active { background: #3f51b5; color: #fff; }
.table-title { font-size: 1.1rem; color: #1a237e; margin-bottom: 15px; }
@media (max-width: 1100px) { .results-summary-grid { grid-template-columns: 1fr; } .charts-grid { grid-template-columns: 1fr; } }
</style>
