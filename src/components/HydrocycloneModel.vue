<template>
  <div class="hydrocyclone-container">
    <div class="header-section">
      <h2>Modelamiento de Hidrociclones - Modelo de Rao y Lynch</h2>
      <p class="subtitle">Análisis de eficiencia de clasificación y parámetros operacionales</p>
    </div>

    <div class="grid-layout">
      <!-- Sección de Geometría y Operación -->
      <section class="card parameters">
        <h3>Parámetros del Hidrociclón</h3>
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
          <label>Densidad Sólidos (ρs) [g/cm³]:</label>
          <input type="number" v-model="solid_density" step="0.01" />
        </div>
        <div class="input-group">
          <label>% Sólidos Alimento (%):</label>
          <input type="number" v-model="feed_p_solids" step="0.1" />
        </div>
      </section>

      <!-- Sección de Granulometría (Mallas) -->
      <section class="card sieves">
        <h3>Granulometría y Pesos</h3>
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
                <td><button @click="removeSieve(index)" class="btn-remove" title="Eliminar fila">×</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <button @click="addSieve" class="btn-add">+ Agregar Malla</button>
      </section>
    </div>

    <div class="actions">
      <button @click="calculate" :disabled="loading" class="btn-calculate">
        {{ loading ? 'Calculando...' : 'Calcular Modelo' }}
      </button>
    </div>

    <!-- Resultados y Gráfico -->
    <div v-if="results" class="results-layout">
      <section class="card results">
        <h3>Resultados Clave</h3>
        <div class="results-grid">
          <div class="result-item">
            <span class="label">d50c Predicho:</span>
            <span class="value">{{ results.d50c_predicted.toFixed(2) }} µm</span>
          </div>
          <div class="result-item">
            <span class="label">d50c Experimental:</span>
            <span class="value">{{ results.d50c_experimental.toFixed(2) }} µm</span>
          </div>
          <div class="result-item">
            <span class="label">Capacidad Q:</span>
            <span class="value">{{ results.capacity_Q.toFixed(2) }} m³/h</span>
          </div>
          <div class="result-item">
            <span class="label">Bypass Agua (Rf):</span>
            <span class="value">{{ (results.water_bypass_Rf).toFixed(2) }} %</span>
          </div>
        </div>
      </section>

      <section class="card chart-card">
        <h3>Curva de Partición</h3>
        <div class="chart-wrapper">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LinearScale,
  LogarithmicScale,
  CategoryScale,
  Filler
} from 'chart.js';
import { Line } from 'vue-chartjs';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LinearScale,
  LogarithmicScale,
  CategoryScale,
  Filler
);

const loading = ref(false);
const results = ref(null);

// Datos iniciales
const geometry = reactive({
  Dc: 250,
  Di: 50,
  Do: 65,
  Du: 35
});

const pressure = ref(70);
const solid_density = ref(2.65);
const feed_p_solids = ref(30);

const sieves = ref([
  { mesh_size: 1000, weight_feed: 10, weight_overflow: 0, weight_underflow: 20 },
  { mesh_size: 500, weight_feed: 50, weight_overflow: 5, weight_underflow: 100 },
  { mesh_size: 250, weight_feed: 120, weight_overflow: 15, weight_underflow: 250 },
  { mesh_size: 150, weight_feed: 200, weight_overflow: 60, weight_underflow: 180 },
  { mesh_size: 75, weight_feed: 150, weight_overflow: 150, weight_underflow: 80 },
  { mesh_size: 37, weight_feed: 80, weight_overflow: 200, weight_underflow: 30 }
]);

const addSieve = () => {
  sieves.value.push({ mesh_size: 0, weight_feed: 0, weight_overflow: 0, weight_underflow: 0 });
};

const removeSieve = (index) => {
  sieves.value.splice(index, 1);
};

// Lógica de Gráfico
const chartData = computed(() => {
  if (!results.value) return { labels: [], datasets: [] };
  
  // Ordenar puntos por tamaño para el gráfico
  const points = [...results.value.partition_curve].sort((a, b) => a.size - b.size);
  
  return {
    labels: points.map(p => p.size),
    datasets: [
      {
        label: 'Eficiencia Corregida (Ec)',
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        data: points.map(p => p.corrected_recovery),
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Eficiencia Real (Ea)',
        borderColor: '#f44336',
        borderDash: [5, 5],
        data: points.map(p => p.actual_recovery),
        tension: 0.4,
        pointRadius: 3
      }
    ]
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      type: 'logarithmic',
      title: { display: true, text: 'Tamaño de Partícula (µm)', font: { weight: 'bold' } },
      grid: { color: '#eee' }
    },
    y: {
      min: 0,
      max: 1,
      title: { display: true, text: 'Recuperación al Underflow (Fracción)', font: { weight: 'bold' } },
      ticks: { stepSize: 0.1 },
      grid: { color: '#eee' }
    }
  },
  plugins: {
    legend: { position: 'bottom' },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(3)}`
      }
    }
  }
};

const calculate = async () => {
  loading.value = true;
  results.value = null;
  
  const payload = {
    sieves: sieves.value,
    geometry: geometry,
    pressure: pressure.value,
    solid_density: solid_density.value,
    feed_p_solids: feed_p_solids.value
  };

  try {
    const response = await fetch('http://localhost:8000/model/hydrocyclone/rao-lynch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) throw new Error('Error en el servidor');
    
    results.value = await response.json();
  } catch (error) {
    alert("Error al calcular el modelo: " + error.message);
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.hydrocyclone-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  font-family: 'Segoe UI', Roboto, sans-serif;
  color: #333;
}

.header-section {
  margin-bottom: 30px;
  border-bottom: 2px solid #eee;
  padding-bottom: 10px;
}

.header-section h2 { margin: 0; color: #1a237e; }
.subtitle { color: #666; margin: 5px 0 0; }

.grid-layout {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.card {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.02);
}

.card h3 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.1rem;
  color: #3f51b5;
  border-left: 4px solid #3f51b5;
  padding-left: 10px;
}

.input-group {
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.input-group label { font-size: 0.85rem; font-weight: 500; color: #555; }
.input-group input { 
  width: 90px; 
  padding: 6px 10px; 
  border: 1px solid #ccc; 
  border-radius: 6px;
  text-align: right;
}

.table-container {
  overflow-x: auto;
  margin-bottom: 15px;
}

table { width: 100%; border-collapse: collapse; }
th, td { border-bottom: 1px solid #eee; padding: 10px; text-align: center; }
th { background: #f8f9fa; font-size: 0.8rem; text-transform: uppercase; color: #777; }
td input { 
  width: 100%; 
  border: 1px solid transparent; 
  padding: 4px; 
  text-align: center;
  border-radius: 4px;
}
td input:focus { border-color: #3f51b5; background: #f0f2ff; outline: none; }

.btn-add { 
  background: #e8f5e9; color: #2e7d32; border: 1px dashed #2e7d32; 
  padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;
  width: 100%; transition: all 0.2s;
}
.btn-add:hover { background: #c8e6c9; }

.btn-remove { 
  background: #ffebee; color: #c62828; border: none; 
  width: 24px; height: 24px; border-radius: 50%; cursor: pointer;
  line-height: 24px; font-weight: bold;
}

.actions { margin-bottom: 30px; }
.btn-calculate { 
  background: #3f51b5; color: white; border: none; 
  padding: 14px; border-radius: 8px; font-size: 1rem; font-weight: bold;
  cursor: pointer; width: 100%; box-shadow: 0 4px 12px rgba(63, 81, 181, 0.3);
  transition: transform 0.1s, background 0.2s;
}
.btn-calculate:hover { background: #303f9f; }
.btn-calculate:active { transform: scale(0.98); }
.btn-calculate:disabled { background: #9fa8da; cursor: not-allowed; }

.results-layout {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 24px;
}

.results-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.result-item { 
  background: #f1f3f9; padding: 12px; border-radius: 8px; 
  display: flex; flex-direction: column;
}
.result-item .label { font-size: 0.75rem; color: #5c6bc0; font-weight: 600; }
.result-item .value { font-size: 1.2rem; font-weight: 800; color: #1a237e; }

.chart-wrapper {
  height: 400px;
}

@media (max-width: 900px) {
  .grid-layout, .results-layout { grid-template-columns: 1fr; }
}
</style>
