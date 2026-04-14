<template>
  <div class="hydrocyclone-container">
    <div class="header-section">
      <div class="header-main">
        <h2>Módulo de Hidrociclones (Modelo CIMM)</h2>
        <div class="mode-selector">
          <button :class="{ active: mode === 'analysis' }" @click="mode = 'analysis'">Análisis Experimental</button>
          <button :class="{ active: mode === 'simulation' }" @click="mode = 'simulation'">Simulación Predictiva</button>
        </div>
      </div>
      <p class="subtitle">Predicción y Calibración según Modelo CIMM/Moly-Cop</p>
    </div>

    <div class="grid-layout">
      <!-- 1. PARÁMETROS OPERATIVOS -->
      <section class="card parameters">
        <h3>1. Condiciones Operativas</h3>
        <div class="input-group">
          <label>Presión (P) [kPa]:</label>
          <input type="number" v-model="pressure" step="1" />
        </div>
        <div class="input-group">
          <label>Densidad Sólidos (ρs):</label>
          <input type="number" v-model="solid_density" step="0.01" />
        </div>
        <div class="input-group">
          <label>% Sólidos Alim:</label>
          <input type="number" v-model="feed_p_solids" step="0.1" />
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

        <div class="geometry-section">
          <h3>2. Geometría del Ciclón</h3>
          <div class="input-group">
            <label>Dc (Ciclón) [cm]:</label>
            <input type="number" v-model="geometry.Dc" step="0.1" />
          </div>
          <div class="input-group">
            <label>Di (Entrada) [cm]:</label>
            <input type="number" v-model="geometry.Di" step="0.1" />
          </div>
          <div class="input-group">
            <label>Do (Vortex) [cm]:</label>
            <input type="number" v-model="geometry.Do" step="0.1" />
          </div>
          <div class="input-group">
            <label>Du (Apex) [cm]:</label>
            <input type="number" v-model="geometry.Du" step="0.1" />
          </div>
          <div class="input-group">
            <label>h (Altura Libre) [cm]:</label>
            <input type="number" v-model="geometry.h" step="0.1" />
          </div>
        </div>

        <div class="advanced-toggle">
          <details>
            <summary>Constantes de Calibración</summary>
            <div class="plitt-params-grid">
              <div class="input-group mini" v-for="key in ['a1', 'a2', 'a3', 'a4', 'l_const']" :key="key">
                <label>{{ key }}:</label>
                <input type="number" v-model="plittParams[key]" step="0.001" />
              </div>
            </div>
            <button @click="calibrateModel" class="btn-calibrate-auto" :disabled="loading">
              ✨ Calibrar con Datos Reales
            </button>
          </details>
        </div>
      </section>

      <!-- 2. DATOS DE MALLAS -->
      <section class="card sieves">
        <h3>3. Distribución Granulométrica</h3>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Malla [µm]</th>
                <th>Alimento [g]</th>
                <th>OF [g] (Exp)</th>
                <th>UF [g] (Exp)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(sieve, index) in sieves" :key="index">
                <td><input type="number" v-model="sieve.mesh_size" /></td>
                <td><input type="number" v-model="sieve.weight_feed" /></td>
                <td><input type="number" v-model="sieve.weight_overflow" :disabled="mode === 'simulation'" /></td>
                <td><input type="number" v-model="sieve.weight_underflow" :disabled="mode === 'simulation'" /></td>
                <td><button @click="removeSieve(index)" class="btn-remove">×</button></td>
              </tr>
              <tr class="pan-row">
                <td>Fondo (Pan)</td>
                <td><input type="number" v-model="pan_weights.feed" /></td>
                <td><input type="number" v-model="pan_weights.overflow" :disabled="mode === 'simulation'" /></td>
                <td><input type="number" v-model="pan_weights.underflow" :disabled="mode === 'simulation'" /></td>
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
        {{ loading ? 'Procesando...' : (mode === 'simulation' ? 'Ejecutar Simulación' : 'Analizar y Comparar') }}
      </button>
    </div>

    <!-- RESULTADOS UNIFICADOS -->
    <template v-if="results">
      
      <!-- TABLA COMPARATIVA ÚNICA -->
      <section class="card table-card results-section">
        <h3 class="table-title">Resultados: Reconciliado (Real) vs. Predicho (Modelo CIMM)</h3>
        <div class="table-container">
          <table class="comparison-table">
            <thead>
              <tr>
                <th rowspan="2">Fracción</th>
                <th colspan="3" class="header-real">REAL (Reconciliado) [%]</th>
                <th colspan="3" class="header-sim">SIMULADO (Modelo) [%]</th>
                <th colspan="2">Eficiencia (Ea)</th>
              </tr>
              <tr>
                <th>Alim</th><th>OF</th><th>UF</th>
                <th>Alim</th><th>OF</th><th>UF</th>
                <th>Real</th><th>Sim</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in results.comparison_table" :key="row.size">
                <td class="size-col">{{ row.size }}</td>
                <td>{{ row.feed_pct_real.toFixed(2) }}</td>
                <td>{{ row.overflow_pct_real.toFixed(2) }}</td>
                <td>{{ row.underflow_pct_real.toFixed(2) }}</td>
                <td class="sim-cell">{{ row.feed_pct_sim.toFixed(2) }}</td>
                <td class="sim-cell">{{ row.overflow_pct_sim.toFixed(2) }}</td>
                <td class="sim-cell">{{ row.underflow_pct_sim.toFixed(2) }}</td>
                <td class="rec-real">{{ (row.recovery_real * 100).toFixed(1) }}%</td>
                <td class="rec-sim">{{ (row.recovery_sim * 100).toFixed(1) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- GRÁFICOS Y MÉTRICAS -->
      <div class="charts-grid">
        <section class="card chart-card">
          <h3>Curva de Tromp (Eficiencia)</h3>
          <div class="chart-wrapper"><Line :data="partitionChartData" :options="partitionChartOptions" /></div>
        </section>
        <section class="card chart-card">
          <h3>Métricas Comparativas</h3>
          <div class="metrics-comparison-grid">
            <div class="m-card" v-for="m in displayMetrics" :key="m.label">
              <span class="m-lab">{{ m.label }}</span>
              <div class="m-vals">
                <div class="m-val real"><span>Real:</span> <strong>{{ m.real }}</strong></div>
                <div class="m-val sim"><span>Sim:</span> <strong>{{ m.sim }}</strong></div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, PointElement, LinearScale, LogarithmicScale, CategoryScale, Filler } from 'chart.js';
import { Line } from 'vue-chartjs';

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, LinearScale, LogarithmicScale, CategoryScale, Filler);

const loading = ref(false);
const mode = ref('analysis');
const results = ref(null);

const pressure = ref(55.0);
const feed_p_solids = ref(62.2);
const solid_density = ref(2.80);
const liquid_density = ref(1.0);
const feed_flow_rate = ref(162.3);
const feed_flow_unit = ref('tph');

const geometry = reactive({ Dc: 50.8, Di: 8.89, Do: 19.05, Du: 9.32, h: 190.5, alpha: 20.0 });
const plittParams = reactive({ a1: 9.68, a2: 1.401, a3: 54.95, a4: 0.523, l_const: 0.950 });

const pan_weights = reactive({ feed: 300.0, overflow: 180.0, underflow: 120.0 });
const sieves = ref([
  { mesh_size: 2000, weight_feed: 50.0, weight_overflow: 0.0, weight_underflow: 50.0 },
  { mesh_size: 1000, weight_feed: 80.0, weight_overflow: 2.0, weight_underflow: 78.0 },
  { mesh_size: 500, weight_feed: 120.0, weight_overflow: 15.0, weight_underflow: 105.0 },
  { mesh_size: 250, weight_feed: 150.0, weight_overflow: 45.0, weight_underflow: 105.0 },
  { mesh_size: 125, weight_feed: 100.0, weight_overflow: 60.0, weight_underflow: 40.0 },
  { mesh_size: 63, weight_feed: 60.0, weight_overflow: 45.0, weight_underflow: 15.0 },
  { mesh_size: 38, weight_feed: 40.0, weight_overflow: 32.0, weight_underflow: 8.0 }
]);

const addSieve = () => sieves.value.push({ mesh_size: 0, weight_feed: 0, weight_overflow: 0, weight_underflow: 0 });
const removeSieve = (index) => sieves.value.splice(index, 1);

const displayMetrics = computed(() => {
  if (!results.value) return [];
  const r = results.value.reconciled_metrics;
  return [
    { label: 'Corte d50c [µm]', real: r.d50c.toFixed(1), sim: results.value.d50c_adjusted.toFixed(1) },
    { label: 'Presión [kPa]', real: pressure.value, sim: r.p_plitt.toFixed(1) },
    { label: 'Bypass Rf [%]', real: r.bypass_rf.toFixed(2), sim: (r.s_plitt/(1+r.s_plitt)*plittParams.l_const*100).toFixed(2) },
    { label: 'Rec. Sólidos [%]', real: r.solids_recovery_s.toFixed(2), sim: ((r.s_plitt/(1+r.s_plitt))*100).toFixed(2) }
  ];
});

const partitionChartData = computed(() => {
  if (!results.value) return { labels: [], datasets: [] };
  const pts = [...results.value.partition_curve].sort((a,b) => a.size - b.size);
  return {
    labels: [1, ...pts.map(p => p.size)],
    datasets: [
      { label: 'Real (Reconciliado)', borderColor: '#4CAF50', data: [results.value.water_balance.bypass_Rf/100, ...pts.map(p => p.adjusted_recovery)], tension: 0.4 },
      { label: 'Simulado (Plitt)', borderColor: '#2196F3', borderDash: [5, 2], data: [results.value.water_balance.bypass_Rf/100, ...pts.map(p => p.plitt_recovery)], tension: 0.4, pointRadius: 0 }
    ]
  };
});

const partitionChartOptions = { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'logarithmic' }, y: { min: 0, max: 1.1 } } };

const calculate = async () => {
  loading.value = true;
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const res = await fetch(`${API_URL}/model/hydrocyclone/plitt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: mode.value, sieves: sieves.value, pan_feed: pan_weights.feed, pan_overflow: pan_weights.overflow, pan_underflow: pan_weights.underflow, pressure: pressure.value, solid_density: solid_density.value, feed_p_solids: feed_p_solids.value, feed_flow_rate: feed_flow_rate.value, feed_flow_unit: feed_flow_unit.value, geometry, plitt_params: plittParams })
    });
    results.value = await res.json();
  } catch (e) { alert("Error: " + e.message); } finally { loading.value = false; }
};

const calibrateModel = async () => {
  loading.value = true;
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const res = await fetch(`${API_URL}/model/hydrocyclone/calibrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sieves: sieves.value, pan_feed: pan_weights.feed, pan_overflow: pan_weights.overflow, pan_underflow: pan_weights.underflow, pressure: pressure.value, solid_density: solid_density.value, feed_p_solids: feed_p_solids.value, feed_flow_rate: feed_flow_rate.value, feed_flow_unit: feed_flow_unit.value, geometry, plitt_params: plittParams })
    });
    const newParams = await res.json();
    Object.assign(plittParams, newParams);
    alert("Calibración completada con éxito. Las constantes han sido actualizadas.");
  } catch (e) { alert("Error: " + e.message); } finally { loading.value = false; }
};
</script>

<style scoped>
.hydrocyclone-container { padding: 20px; max-width: 1400px; margin: 0 auto; font-family: 'Segoe UI', sans-serif; background: #fcfcfc; }
.header-main { display: flex; justify-content: space-between; align-items: center; }
.mode-selector { display: flex; background: #eee; padding: 4px; border-radius: 8px; }
.mode-selector button { border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: 600; }
.mode-selector button.active { background: #fff; color: #3f51b5; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.grid-layout { display: grid; grid-template-columns: 380px 1fr; gap: 20px; margin: 20px 0; }
.card { background: #fff; border: 1px solid #ddd; border-radius: 10px; padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.input-group { display: flex; justify-content: space-between; margin-bottom: 10px; align-items: center; }
.input-group input { width: 80px; padding: 5px; border: 1px solid #ccc; border-radius: 4px; text-align: right; }
.geometry-section { margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 15px; }
.plitt-params-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f9f9f9; padding: 10px; border-radius: 8px; margin: 10px 0; }
.btn-calibrate-auto { width: 100%; padding: 10px; background: #e8f5e9; color: #2e7d32; border: 1px solid #2e7d32; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-calculate { width: 100%; padding: 15px; background: #3f51b5; color: #fff; border: none; border-radius: 8px; font-size: 1.1rem; font-weight: bold; cursor: pointer; }
.comparison-table { width: 100%; border-collapse: collapse; }
.comparison-table th, .comparison-table td { padding: 10px; border: 1px solid #eee; text-align: center; }
.header-real { background: #e8f5e9; color: #2e7d32; }
.header-sim { background: #e3f2fd; color: #1565c0; }
.sim-cell { background: #f5faff; color: #1565c0; }
.rec-real { font-weight: bold; color: #2e7d32; }
.rec-sim { font-weight: bold; color: #1565c0; border-left: 2px solid #ddd; }
.charts-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; margin-top: 20px; }
.metrics-comparison-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.m-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #3f51b5; }
.m-vals { margin-top: 10px; font-size: 0.9rem; }
.m-val.real { color: #2e7d32; }
.m-val.sim { color: #1565c0; }
.chart-wrapper { height: 400px; }
</style>
