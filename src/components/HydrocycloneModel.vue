<template>
  <div class="hydrocyclone-container">
    <div class="header-section">
      <div class="header-main">
        <h2>Módulo de Hidrociclones (Balance Dual)</h2>
      </div>
      <p class="subtitle">Balance simultáneo por Mallas y por Sólidos</p>
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
          <label>% Sólidos OF:</label>
          <input type="number" v-model="overflow_p_solids" step="0.1" />
        </div>
        <div class="input-group">
          <label>% Sólidos UF:</label>
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
      </section>

      <!-- 2. DATOS DE MALLAS -->
      <section class="card sieves" @paste="handlePaste">
        <div class="card-header-flex">
          <h3>2. Distribución Granulométrica (Pesos en gramos)</h3>
          <span class="paste-hint">💡 Puedes pegar datos desde Excel aquí</span>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Malla [µm]</th>
                <th>Alimento</th>
                <th>OverFlow</th>
                <th>UnderFlow</th>
                <th></th>
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
                <td>Fondo (Pan)</td>
                <td><input type="number" v-model="pan_weights.feed" /></td>
                <td><input type="number" v-model="pan_weights.overflow" /></td>
                <td><input type="number" v-model="pan_weights.underflow" /></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="table-actions">
          <button @click="addSieve" class="btn-add">+ Agregar Malla</button>
          <button @click="clearSieves" class="btn-clear">Limpiar Tabla</button>
        </div>
      </section>
    </div>

    <div class="actions">
      <button @click="calculate" :disabled="loading" class="btn-calculate">
        {{ loading ? 'Procesando...' : 'Ejecutar Balances' }}
      </button>
    </div>

    <template v-if="results">
      <section class="card table-card results-section">
        <h3 class="table-title">Resultados de Balances (Distribución %)</h3>
        <div class="table-container">
          <table class="comparison-table">
            <thead>
              <tr>
                <th rowspan="2">Fracción</th>
                <th colspan="3" class="header-real">REAL (Medido) [%]</th>
                <th colspan="4" class="header-mesh">BALANCE MALLAS [%]</th>
                <th colspan="4" class="header-solids">BALANCE SÓLIDOS [%]</th>
              </tr>
              <tr>
                <th>F</th><th>OF</th><th>UF</th>
                <th>F*</th><th>OF*</th><th>UF*</th><th>Ea</th>
                <th>F*</th><th>OF*</th><th>UF*</th><th>Ea</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in results.comparison_table" :key="row.size">
                <td class="size-col">{{ row.size }}</td>
                <!-- Real -->
                <td>{{ row.feed_pct_real.toFixed(1) }}</td>
                <td>{{ row.overflow_pct_real.toFixed(1) }}</td>
                <td>{{ row.underflow_pct_real.toFixed(1) }}</td>
                <!-- Bal Mallas -->
                <td class="bal-mesh">{{ row.feed_pct_mesh.toFixed(1) }}</td>
                <td class="bal-mesh">{{ row.overflow_pct_mesh.toFixed(1) }}</td>
                <td class="bal-mesh">{{ row.underflow_pct_mesh.toFixed(1) }}</td>
                <td class="bal-mesh rec">{{ (row.recovery_mesh * 100).toFixed(1) }}</td>
                <!-- Bal Solidos -->
                <td class="bal-solids">{{ row.feed_pct_solids.toFixed(1) }}</td>
                <td class="bal-solids">{{ row.overflow_pct_solids.toFixed(1) }}</td>
                <td class="bal-solids">{{ row.underflow_pct_solids.toFixed(1) }}</td>
                <td class="bal-solids rec">{{ (row.recovery_solids * 100).toFixed(1) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="card table-card results-section" style="margin-top: 20px;" v-if="results.mass_balance_table">
        <h3 class="table-title">Balance de Masa por Malla [tph]</h3>
        <div class="table-container">
          <table class="comparison-table">
            <thead>
              <tr>
                <th rowspan="2">Fracción</th>
                <th colspan="3" class="header-mesh">BALANCE MALLAS [tph]</th>
                <th colspan="3" class="header-solids">BALANCE SÓLIDOS [tph]</th>
              </tr>
              <tr>
                <th>F</th><th>OF</th><th>UF</th>
                <th>F</th><th>OF</th><th>UF</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in results.mass_balance_table" :key="row.size">
                <td class="size-col">{{ row.size }}</td>
                <td class="bal-mesh">{{ row.feed_tph_mesh.toFixed(2) }}</td>
                <td class="bal-mesh">{{ row.overflow_tph_mesh.toFixed(2) }}</td>
                <td class="bal-mesh">{{ row.underflow_tph_mesh.toFixed(2) }}</td>
                <td class="bal-solids">{{ row.feed_tph_solids.toFixed(2) }}</td>
                <td class="bal-solids">{{ row.overflow_tph_solids.toFixed(2) }}</td>
                <td class="bal-solids">{{ row.underflow_tph_solids.toFixed(2) }}</td>
              </tr>
              <tr style="font-weight: bold; background-color: #f9f9f9;">
                <td class="size-col">TOTAL (tph)</td>
                <td class="bal-mesh">{{ results.mass_balance_table.reduce((a, b) => a + b.feed_tph_mesh, 0).toFixed(2) }}</td>
                <td class="bal-mesh">{{ results.mass_balance_table.reduce((a, b) => a + b.overflow_tph_mesh, 0).toFixed(2) }}</td>
                <td class="bal-mesh">{{ results.mass_balance_table.reduce((a, b) => a + b.underflow_tph_mesh, 0).toFixed(2) }}</td>
                <td class="bal-solids">{{ results.mass_balance_table.reduce((a, b) => a + b.feed_tph_solids, 0).toFixed(2) }}</td>
                <td class="bal-solids">{{ results.mass_balance_table.reduce((a, b) => a + b.overflow_tph_solids, 0).toFixed(2) }}</td>
                <td class="bal-solids">{{ results.mass_balance_table.reduce((a, b) => a + b.underflow_tph_solids, 0).toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="card table-card results-section" style="margin-top: 20px;" v-if="results.global_flow_balance">
        <h3 class="table-title">Balance de Flujos Globales</h3>
        <div class="table-container">
          <table class="comparison-table">
            <thead>
              <tr>
                <th rowspan="2">Corriente</th>
                <th colspan="3" class="header-mesh">BALANCE MALLAS [tph]</th>
                <th colspan="3" class="header-solids">BALANCE SÓLIDOS [tph]</th>
              </tr>
              <tr>
                <th>Pulpa (Mineral)</th><th>Sólidos</th><th>Agua</th>
                <th>Pulpa (Mineral)</th><th>Sólidos</th><th>Agua</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stream in ['feed', 'overflow', 'underflow']" :key="stream">
                <td class="size-col">{{ stream === 'feed' ? 'Alimento' : stream === 'overflow' ? 'OverFlow' : 'UnderFlow' }}</td>
                <td class="bal-mesh">{{ results.global_flow_balance[stream].pulp_mesh.toFixed(2) }}</td>
                <td class="bal-mesh">{{ results.global_flow_balance[stream].solids_mesh.toFixed(2) }}</td>
                <td class="bal-mesh">{{ results.global_flow_balance[stream].water_mesh.toFixed(2) }}</td>
                <td class="bal-solids">{{ results.global_flow_balance[stream].pulp_solids.toFixed(2) }}</td>
                <td class="bal-solids">{{ results.global_flow_balance[stream].solids_solids.toFixed(2) }}</td>
                <td class="bal-solids">{{ results.global_flow_balance[stream].water_solids.toFixed(2) }}</td>
              </tr>
              <tr style="font-weight: bold; background-color: #f9f9f9; color: #333;">
                <td class="size-col">Suma (OF + UF)</td>
                <td class="bal-mesh">{{ (results.global_flow_balance.overflow.pulp_mesh + results.global_flow_balance.underflow.pulp_mesh).toFixed(2) }}</td>
                <td class="bal-mesh">{{ (results.global_flow_balance.overflow.solids_mesh + results.global_flow_balance.underflow.solids_mesh).toFixed(2) }}</td>
                <td class="bal-mesh">{{ (results.global_flow_balance.overflow.water_mesh + results.global_flow_balance.underflow.water_mesh).toFixed(2) }}</td>
                <td class="bal-solids">{{ (results.global_flow_balance.overflow.pulp_solids + results.global_flow_balance.underflow.pulp_solids).toFixed(2) }}</td>
                <td class="bal-solids">{{ (results.global_flow_balance.overflow.solids_solids + results.global_flow_balance.underflow.solids_solids).toFixed(2) }}</td>
                <td class="bal-solids">{{ (results.global_flow_balance.overflow.water_solids + results.global_flow_balance.underflow.water_solids).toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="charts-grid">
        <section class="card chart-card">
          <h3>Curvas de Partición</h3>
          <div class="chart-wrapper"><Line :data="partitionChartData" :options="partitionChartOptions" /></div>
        </section>
        <section class="card chart-card">
          <h3>Métricas Comparativas</h3>
          <div class="metrics-comparison-grid">
            <div class="m-card" v-for="m in displayMetrics" :key="m.label">
              <span class="m-lab">{{ m.label }}</span>
              <div class="m-vals">
                <div class="m-val mesh"><span>Mallas:</span> <strong>{{ m.mesh }}</strong></div>
                <div class="m-val solids"><span>Sólidos:</span> <strong>{{ m.solids }}</strong></div>
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
const results = ref(null);

const pressure = ref(55.0);
const feed_p_solids = ref(62.2);
const overflow_p_solids = ref(45.0);
const underflow_p_solids = ref(75.0);
const solid_density = ref(2.80);
const feed_flow_rate = ref(162.3);
const feed_flow_unit = ref('tph');

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

const clearSieves = () => {
  sieves.value = [];
  pan_weights.feed = 0;
  pan_weights.overflow = 0;
  pan_weights.underflow = 0;
};

const handlePaste = (event) => {
  const pasteData = event.clipboardData.getData('text');
  if (!pasteData.includes('\t')) return; // Solo procesar si parece venir de Excel (tabuladores)
  
  event.preventDefault();
  const rows = pasteData.split(/\r?\n/).filter(row => row.trim() !== "");
  
  const newSieves = [];
  const newPan = { feed: 0, overflow: 0, underflow: 0 };

  rows.forEach((row) => {
    const columns = row.split('\t');
    if (columns.length >= 4) {
      const cleanNum = (str) => {
        if (!str) return NaN;
        // Manejar formatos: "1.234,56" -> "1234.56" o "1,234.56" -> "1234.56"
        let s = str.trim();
        if (s.includes(',') && s.includes('.')) {
           if (s.indexOf(',') > s.indexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
           else s = s.replace(/,/g, '');
        } else {
           s = s.replace(',', '.');
        }
        return parseFloat(s);
      };
      
      const val0 = cleanNum(columns[0]);
      const w_f = cleanNum(columns[1]);
      const w_o = cleanNum(columns[2]);
      const w_u = cleanNum(columns[3]);

      if (!isNaN(val0)) {
        newSieves.push({ mesh_size: val0, weight_feed: w_f || 0, weight_overflow: w_o || 0, weight_underflow: w_u || 0 });
      } else {
        const label = columns[0].toLowerCase();
        if (label.includes('pan') || label.includes('fondo')) {
          newPan.feed = w_f || 0;
          newPan.overflow = w_o || 0;
          newPan.underflow = w_u || 0;
        }
      }
    }
  });

  if (newSieves.length > 0) {
    sieves.value = newSieves;
    if (newPan.feed || newPan.overflow || newPan.underflow) {
      pan_weights.feed = newPan.feed;
      pan_weights.overflow = newPan.overflow;
      pan_weights.underflow = newPan.underflow;
    }
  }
};

const displayMetrics = computed(() => {
  if (!results.value) return [];
  const m = results.value.metrics_mesh;
  const s = results.value.metrics_solids;
  return [
    { label: 'Corte d50c [µm]', mesh: m.d50c.toFixed(1), solids: s.d50c.toFixed(1) },
    { label: 'Bypass Rf [%]', mesh: m.bypass_rf.toFixed(2), solids: s.bypass_rf.toFixed(2) },
    { label: 'Rec. Sólidos (Split) [%]', mesh: m.solids_recovery_s.toFixed(2), solids: s.solids_recovery_s.toFixed(2) },
    { label: 'Corte d50 [µm]', mesh: m.d50.toFixed(1), solids: s.d50.toFixed(1) }
  ];
});

const partitionChartData = computed(() => {
  if (!results.value) return { labels: [], datasets: [] };
  const pts = [...results.value.partition_curve].sort((a,b) => a.size - b.size);
  const bypass_mesh = results.value.metrics_mesh.bypass_rf / 100;
  const bypass_solids = results.value.metrics_solids.bypass_rf / 100;
  return {
    labels: [1, ...pts.map(p => p.size)],
    datasets: [
      { label: 'Bal. Mallas', borderColor: '#4CAF50', data: [bypass_mesh, ...pts.map(p => p.adjusted_recovery_mesh)], tension: 0.4 },
      { label: 'Bal. Sólidos', borderColor: '#FF9800', data: [bypass_solids, ...pts.map(p => p.adjusted_recovery_solids)], tension: 0.4 }
    ]
  };
});

const partitionChartOptions = { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'logarithmic' }, y: { min: 0, max: 1.1 } } };

const calculate = async () => {
  loading.value = true;
  const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api.suiteminerals.com' : 'https://smbackend.onrender.com');
  try {
    const res = await fetch(`${API_URL}/model/hydrocyclone/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sieves: sieves.value, pan_feed: pan_weights.feed, pan_overflow: pan_weights.overflow, pan_underflow: pan_weights.underflow, pressure: pressure.value, solid_density: solid_density.value, feed_p_solids: feed_p_solids.value, overflow_p_solids: overflow_p_solids.value, underflow_p_solids: underflow_p_solids.value, feed_flow_rate: feed_flow_rate.value, feed_flow_unit: feed_flow_unit.value })
    });
    results.value = await res.json();
  } catch (e) { alert("Error: " + e.message); } finally { loading.value = false; }
};

</script>

<style scoped>
.hydrocyclone-container { padding: 20px; max-width: 1500px; margin: 0 auto; font-family: 'Segoe UI', sans-serif; background: #fcfcfc; }
.header-main { display: flex; justify-content: space-between; align-items: center; }
.grid-layout { display: grid; grid-template-columns: 380px 1fr; gap: 20px; margin: 20px 0; }
.card { background: #fff; border: 1px solid #ddd; border-radius: 10px; padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.input-group { display: flex; justify-content: space-between; margin-bottom: 10px; align-items: center; }
.input-group input { width: 80px; padding: 5px; border: 1px solid #ccc; border-radius: 4px; text-align: right; }
.btn-calculate { width: 100%; padding: 15px; background: #3f51b5; color: #fff; border: none; border-radius: 8px; font-size: 1.1rem; font-weight: bold; cursor: pointer; }
.comparison-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.comparison-table th, .comparison-table td { padding: 6px 8px; border: 1px solid #eee; text-align: center; }
.header-real { background: #f5f5f5; color: #555; }
.header-mesh { background: #e8f5e9; color: #2e7d32; }
.header-solids { background: #fff3e0; color: #e65100; }
.bal-mesh { background: #f1f8e9; }
.bal-solids { background: #fff8e1; }
.rec { font-weight: bold; }
.charts-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; margin-top: 20px; }
.metrics-comparison-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.m-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #3f51b5; }
.m-vals { margin-top: 10px; font-size: 0.9rem; }
.m-val.mesh { color: #2e7d32; }
.m-val.solids { color: #e65100; }
.chart-wrapper { height: 400px; }
.table-container { overflow-x: auto; }

/* Nuevos Estilos para Pegado desde Excel */
.card-header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.card-header-flex h3 { margin: 0; }
.paste-hint { font-size: 0.8rem; color: #666; background: #eef; padding: 4px 8px; border-radius: 4px; border: 1px dashed #3f51b5; }
.table-actions { display: flex; gap: 10px; margin-top: 15px; }
.btn-add { background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-clear { background: #fff1f0; color: #cf1322; border: 1px solid #ffa39e; padding: 8px 15px; border-radius: 4px; cursor: pointer; }
.btn-remove { background: none; border: none; color: #ff4d4f; font-size: 1.2rem; cursor: pointer; }
.btn-add:hover { background: #c8e6c9; }
.btn-clear:hover { background: #ffa39e; color: #fff; }
</style>