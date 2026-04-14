<template>
  <div class="hydrocyclone-container">
    <div class="header-section">
      <div class="header-main">
        <h2>Análisis de Funcionamiento de Hidrociclones</h2>
        <div class="mode-selector">
          <button :class="{ active: mode === 'analysis' }" @click="mode = 'analysis'">Análisis Experimental</button>
          <button :class="{ active: mode === 'simulation' }" @click="mode = 'simulation'">Simulación Predictiva</button>
        </div>
      </div>
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
          <label>Densidad Sólidos (ρs):</label>
          <input type="number" v-model="solid_density" step="0.01" />
        </div>
        <div class="input-group">
          <label>Densidad Líquido (ρl):</label>
          <input type="number" v-model="liquid_density" step="0.01" />
        </div>
        <div class="input-group">
          <label>% Sólidos Alim:</label>
          <input type="number" v-model="feed_p_solids" step="0.1" />
        </div>
        <div class="input-group">
          <label>% Sólidos Reb:</label>
          <input type="number" v-model="overflow_p_solids" step="0.1" />
        </div>
        <div class="input-group">
          <label>% Sólidos Desc:</label>
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

        <div class="geometry-section">
          <h3>2. Geometría (Plitt)</h3>
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
            <label>h (V-A) [cm]:</label>
            <input type="number" v-model="geometry.h" step="0.1" />
          </div>
        </div>

        <div class="advanced-toggle">
          <details>
            <summary>Constantes de Calibración</summary>
            <div class="plitt-params-grid">
              <div class="input-group mini">
                <label>F1 (d50c):</label>
                <input type="number" v-model="plittParams.F1" step="0.01" />
              </div>
              <div class="input-group mini">
                <label>F2 (Cap):</label>
                <input type="number" v-model="plittParams.F2" step="0.01" />
              </div>
              <div class="input-group mini">
                <label>F3 (Split):</label>
                <input type="number" v-model="plittParams.F3" step="0.01" />
              </div>
              <div class="input-group mini">
                <label>F4 (Sharp):</label>
                <input type="number" v-model="plittParams.F4" step="0.01" />
              </div>
            </div>
          </details>
        </div>
      </section>

      <!-- Sección de Granulometría (Mallas) -->
      <section class="card sieves">
        <h3>3. Datos de Mallas y Pesos</h3>
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
                <td><input type="number" v-model="sieve.weight_overflow" :disabled="mode === 'simulation'" :class="{ disabled: mode === 'simulation' }" /></td>
                <td><input type="number" v-model="sieve.weight_underflow" :disabled="mode === 'simulation'" :class="{ disabled: mode === 'simulation' }" /></td>
                <td><button @click="removeSieve(index)" class="btn-remove" title="Eliminar">×</button></td>
              </tr>
              <tr class="pan-row">
                <td><strong>Fondo (Pan)</strong></td>
                <td><input type="number" v-model="pan_weights.feed" /></td>
                <td><input type="number" v-model="pan_weights.overflow" :disabled="mode === 'simulation'" :class="{ disabled: mode === 'simulation' }" /></td>
                <td><input type="number" v-model="pan_weights.underflow" :disabled="mode === 'simulation'" :class="{ disabled: mode === 'simulation' }" /></td>
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
        {{ loading ? 'Procesando...' : (mode === 'simulation' ? 'Ejecutar Simulación' : 'Analizar Funcionamiento') }}
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
        <section class="card result-card">
          <h4>Separación Real (d50)</h4>
          <div class="stat">
            <span class="val">{{ currentMetrics.d50.toFixed(1) }} µm</span>
          </div>
          <div class="stat-sub">Basado en Ea Experimental</div>
        </section>
        
        <section class="card result-card destaque">
          <h4>Corte Corregido (d50c)</h4>
          <div class="stat-group">
            <div class="stat-item">
              <span class="val">{{ currentMetrics.d50c.toFixed(1) }} µm</span>
              <span class="lab">Exp</span>
            </div>
            <div class="stat-item plitt" v-if="plittMetrics">
              <span class="val">{{ plittMetrics.d50c_calc.toFixed(1) }} µm</span>
              <span class="lab">Plitt</span>
            </div>
          </div>
          <div class="stat-sub">Eficiencia Centrífuga (Ec)</div>
        </section>

        <section class="card result-card">
          <h4>Presión (P)</h4>
          <div class="stat-group">
            <div class="stat-item">
              <span class="val">{{ pressure }}</span>
              <span class="lab">Oper</span>
            </div>
            <div class="stat-item plitt" v-if="plittMetrics">
              <span class="val">{{ plittMetrics.p_calc.toFixed(1) }}</span>
              <span class="lab">Plitt</span>
            </div>
          </div>
          <div class="stat-sub">Unidad: kPa</div>
        </section>

        <section class="card result-card">
          <h4>Bypass (Rf)</h4>
          <div class="stat">
            <span class="val">{{ currentMetrics.bypass_rf.toFixed(2) }} %</span>
          </div>
          <div class="stat-sub">Agua/Finos al Underflow</div>
        </section>

        <section class="card result-card">
          <h4>División de Flujo (S)</h4>
          <div class="stat-group">
            <div class="stat-item">
              <span class="val">{{ currentMetrics.solids_recovery_s.toFixed(2) }} %</span>
              <span class="lab">Sol</span>
            </div>
            <div class="stat-item plitt" v-if="plittMetrics">
              <span class="val">{{ (plittMetrics.s_calc * 100).toFixed(2) }} %</span>
              <span class="lab">Plitt</span>
            </div>
          </div>
          <div class="stat-sub">Recuperación Volumétrica / Sólidos</div>
        </section>

        <section class="card result-card" v-if="plittMetrics">
          <h4>Parámetro Agudeza (m)</h4>
          <div class="stat">
            <span class="val">{{ plittMetrics.m_calc.toFixed(2) }}</span>
          </div>
          <div class="stat-sub">Pendiente de Plitt</div>
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
const mode = ref('analysis'); // 'analysis' o 'simulation'
const results = ref(null);
const activeTable = ref('experimental');

const currentMetrics = computed(() => {
  if (!results.value) return { d50: 0, d50c: 0, bypass_rf: 0, solids_recovery_s: 0 };
  if (activeTable.value === 'solids' && results.value.solids_metrics) return results.value.solids_metrics;
  return results.value.reconciled_metrics || { d50: 0, d50c: 0, bypass_rf: 0, solids_recovery_s: 0 };
});

const plittMetrics = computed(() => {
  if (!results.value?.reconciled_metrics) return null;
  const m = results.value.reconciled_metrics;
  return {
    d50c_calc: results.value.d50c_adjusted || 0,
    p_calc: m.p_plitt || 0,
    m_calc: m.m_plitt || 0,
    s_calc: m.s_plitt || 0
  };
});

const pressure = ref(70);
const feed_p_solids = ref(30);
const overflow_p_solids = ref(15);
const underflow_p_solids = ref(70);
const solid_density = ref(2.65);
const liquid_density = ref(1.0);
const feed_flow_rate = ref(100);
const feed_flow_unit = ref('tph');

// Geometría de Plitt (Valores por defecto típicos para un ciclón de 10" o similar)
const geometry = reactive({
  Dc: 25.0,  // Diámetro Ciclón (cm)
  Di: 6.5,   // Diámetro Entrada (cm)
  Do: 8.5,   // Vortex Finder (cm)
  Du: 4.5,   // Apex (cm)
  h: 80.0,   // Distancia Vortex-Apex (cm)
  alpha: 20.0 // Ángulo del cono
});

// Parámetros de Plitt (Valores estándar de la literatura)
const plittParams = reactive({
  F1: 50.5,
  F2: 1.88,
  F3: 18.8,
  F4: 1.58
});

const pan_weights = reactive({ feed: 305.76, overflow: 188.54, underflow: 117.22 });
const sieves = ref([
  { mesh_size: 12700, weight_feed: 18.17, weight_overflow: 0, weight_underflow: 18.17 },
  { mesh_size: 9500, weight_feed: 41.49, weight_overflow: 0, weight_underflow: 41.49 },
  { mesh_size: 6700, weight_feed: 40.76, weight_overflow: 0, weight_underflow: 40.76 },
  { mesh_size: 4750, weight_feed: 37.01, weight_overflow: 0, weight_underflow: 37.01 },
  { mesh_size: 3350, weight_feed: 38.53, weight_overflow: 0, weight_underflow: 38.53 },
  { mesh_size: 2360, weight_feed: 44.14, weight_overflow: 0, weight_underflow: 44.14 },
  { mesh_size: 1700, weight_feed: 51.21, weight_overflow: 0, weight_underflow: 51.21 },
  { mesh_size: 1180, weight_feed: 66.98, weight_overflow: 0, weight_underflow: 66.98 },
  { mesh_size: 850, weight_feed: 78.83, weight_overflow: 0, weight_underflow: 78.83 },
  { mesh_size: 600, weight_feed: 100.61, weight_overflow: 0.1, weight_underflow: 100.51 },
  { mesh_size: 425, weight_feed: 122.86, weight_overflow: 1.94, weight_underflow: 120.92 },
  { mesh_size: 300, weight_feed: 142.11, weight_overflow: 10.9, weight_underflow: 131.2 },
  { mesh_size: 212, weight_feed: 143.62, weight_overflow: 27.23, weight_underflow: 116.4 },
  { mesh_size: 150, weight_feed: 125.60, weight_overflow: 39.81, weight_underflow: 85.79 },
  { mesh_size: 106, weight_feed: 98.97, weight_overflow: 42.06, weight_underflow: 56.9 },
  { mesh_size: 75, weight_feed: 73.25, weight_overflow: 36.81, weight_underflow: 36.44 },
  { mesh_size: 53, weight_feed: 53.99, weight_overflow: 29.86, weight_underflow: 24.14 },
  { mesh_size: 38, weight_feed: 38.98, weight_overflow: 22.75, weight_underflow: 16.23 }
]);

const addSieve = () => sieves.value.push({ mesh_size: 0, weight_feed: 0, weight_overflow: 0, weight_underflow: 0 });
const removeSieve = (index) => sieves.value.splice(index, 1);

const partitionChartData = computed(() => {
  if (!results.value) return { labels: [], datasets: [] };
  const pts = [...results.value.partition_curve].sort((a,b) => a.size - b.size);
  const bypass = results.value.water_balance.bypass_Rf / 100;
  const labels = [1, ...pts.map(p => p.size)];
  const datasets = [
    { label: 'Ea (Exp)', borderColor: '#f44336', backgroundColor: '#f44336', data: [null, ...pts.map(p => p.actual_recovery)], showLine: false, pointRadius: 5, pointStyle: 'rectRot' },
    { label: 'Ea (Reconciliado)', borderColor: '#4CAF50', data: [bypass, ...pts.map(p => p.adjusted_recovery)], tension: 0.4 },
    { label: 'Bypass (Rf)', borderColor: '#ccc', borderDash: [2,2], data: labels.map(() => bypass), pointRadius: 0, fill: false }
  ];

  // Curva de Plitt (Teórica)
  if (pts[0].plitt_recovery !== undefined) {
    datasets.push({ 
      label: 'Plitt (Teórico)', 
      borderColor: '#2196F3', 
      borderDash: [5, 2],
      data: [bypass, ...pts.map(p => p.plitt_recovery)], 
      tension: 0.4,
      pointRadius: 0
    });
  }

  if (pts[0].solids_recovery !== undefined) datasets.push({ label: 'Ea (% Sól)', borderColor: '#9C27B0', borderDash: [5, 5], data: [null, ...pts.map(p => p.solids_recovery)], tension: 0.4 });
  return { labels, datasets };
});

const granulometryChartData = computed(() => {
  if (!results.value) return { labels: [], datasets: [] };
  const pts = [...results.value.granulometry_curve].sort((a,b) => a.size - b.size);
  
  const datasets = [
    // RECONCILIADOS (Líneas Continuas)
    { label: 'Alim (Adj)', borderColor: '#4CAF50', data: pts.map(p => p.feed_passing_adj), tension: 0.3, pointRadius: 0 },
    { label: 'Reb (Adj)', borderColor: '#FF9800', data: pts.map(p => p.overflow_passing_adj), tension: 0.3, pointRadius: 0 },
    { label: 'Des (Adj)', borderColor: '#9C27B0', data: pts.map(p => p.underflow_passing_adj), tension: 0.3, pointRadius: 0 },
    
    // EXPERIMENTALES (Solo Puntos)
    { label: 'Alim (Exp)', borderColor: '#4CAF50', backgroundColor: '#4CAF50', data: pts.map(p => p.feed_passing), showLine: false, pointRadius: 4, pointStyle: 'circle' },
    { label: 'Reb (Exp)', borderColor: '#FF9800', backgroundColor: '#FF9800', data: pts.map(p => p.overflow_passing), showLine: false, pointRadius: 4, pointStyle: 'triangle' },
    { label: 'Des (Exp)', borderColor: '#9C27B0', backgroundColor: '#9C27B0', data: pts.map(p => p.underflow_passing), showLine: false, pointRadius: 4, pointStyle: 'rect' }
  ];

  // POR SÓLIDOS (Líneas Discontinuas)
  if (pts.length > 0 && pts[0].feed_passing_sol !== undefined && pts[0].feed_passing_sol !== null) {
    datasets.push({ label: 'Alim (%Sól)', borderColor: '#4CAF50', borderDash: [5, 5], data: pts.map(p => p.feed_passing_sol), tension: 0.3, pointRadius: 0 });
    datasets.push({ label: 'Reb (%Sól)', borderColor: '#FF9800', borderDash: [5, 5], data: pts.map(p => p.overflow_passing_sol), tension: 0.3, pointRadius: 0 });
    datasets.push({ label: 'Des (%Sól)', borderColor: '#9C27B0', borderDash: [5, 5], data: pts.map(p => p.underflow_passing_sol), tension: 0.3, pointRadius: 0 });
  }

  return { labels: pts.map(p => p.size), datasets };
});

const partitionChartOptions = { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'logarithmic', title: { display: true, text: 'Tamaño (µm)' } }, y: { min: 0, max: 1.1, title: { display: true, text: 'Recuperación al Underflow (Ea)' } } } };
const granulometryChartOptions = { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'logarithmic', title: { display: true, text: 'Tamaño (µm)' } }, y: { min: 0, max: 100, title: { display: true, text: '% Pasante Acumulado' } } } };

const calculate = async () => {
  loading.value = true;
  const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api.suiteminerals.com' : 'http://localhost:8000');
  try {
    const res = await fetch(`${API_URL}/model/hydrocyclone/plitt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: mode.value,
        sieves: sieves.value, pan_feed: pan_weights.feed, pan_overflow: pan_weights.overflow, pan_underflow: pan_weights.underflow,
        pressure: pressure.value, solid_density: solid_density.value, liquid_density: liquid_density.value,
        feed_p_solids: feed_p_solids.value,
        overflow_p_solids: overflow_p_solids.value, underflow_p_solids: underflow_p_solids.value,
        feed_flow_rate: feed_flow_rate.value, feed_flow_unit: feed_flow_unit.value,
        geometry: geometry,
        plitt_params: plittParams
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
.header-main { display: flex; justify-content: space-between; align-items: center; }
.header-section h2 { color: #1a237e; margin: 0; }
.mode-selector { display: flex; background: #f5f5f5; padding: 4px; border-radius: 10px; border: 1px solid #ddd; }
.mode-selector button { padding: 8px 16px; border: none; background: transparent; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; color: #777; transition: all 0.3s; }
.mode-selector button.active { background: #fff; color: #3f51b5; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
.subtitle { color: #666; margin: 5px 0 0; }
.grid-layout { display: grid; grid-template-columns: 350px 1fr; gap: 24px; margin-bottom: 24px; }
.card { background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.card h3 { color: #3f51b5; margin-top: 0; font-size: 1.1rem; border-left: 4px solid #3f51b5; padding-left: 10px; margin-bottom: 20px; }
.input-group { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.input-group label { font-size: 0.9rem; color: #555; }
.input-group input { width: 90px; padding: 6px; border-radius: 6px; border: 1px solid #ccc; text-align: right; }
.input-group input.disabled { background: #f0f0f0; color: #aaa; cursor: not-allowed; border-color: #eee; }
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
.stat-group { display: flex; justify-content: space-around; align-items: center; margin: 10px 0; }
.stat-item { display: flex; flex-direction: column; align-items: center; }
.stat-item.plitt { border-left: 1px solid #eee; padding-left: 15px; }
.stat-item .lab { font-size: 0.7rem; color: #999; text-transform: uppercase; font-weight: bold; margin-top: 4px; }
.stat-item .val { font-size: 1.2rem; }
.stat-item.plitt .val { color: #2196F3; }
.geometry-section { margin-top: 25px; padding-top: 20px; border-top: 1px dashed #ddd; }
.advanced-toggle { margin-top: 15px; }
.advanced-toggle summary { font-size: 0.85rem; color: #3f51b5; cursor: pointer; font-weight: 600; outline: none; }
.plitt-params-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; background: #f9f9f9; padding: 10px; border-radius: 8px; }
.input-group.mini { margin-bottom: 5px; }
.input-group.mini label { font-size: 0.75rem; }
.input-group.mini input { width: 60px; padding: 4px; font-size: 0.8rem; }
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
