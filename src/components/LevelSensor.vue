<template>
  <div class="level-sensor-container">
    <!-- BARRA SUPERIOR DE TELEMETRÍA Y CONTROL -->
    <header class="telemetry-header">
      <div class="header-left">
        <div class="title-with-icon">
          <span class="sensor-icon">📶</span>
          <div>
            <h2>Monitor de Nivel de Tanque (ESP32)</h2>
            <p class="subtitle">Telemetría ultrasónica en tiempo real vía Wi-Fi</p>
          </div>
        </div>
      </div>

      <div class="header-right">
        <!-- ESTADO DE CONEXIÓN -->
        <div :class="['status-pill', isOnline ? 'online' : 'offline']">
          <span class="status-dot"></span>
          <span>{{ isOnline ? 'ESP32 CONECTADO' : 'ESP32 DESCONECTADO' }}</span>
          <span v-if="lastPingSeconds !== null" class="time-ago">
            ({{ lastPingSeconds < 60 ? `${Math.round(lastPingSeconds)}s` : `${Math.round(lastPingSeconds / 60)}m` }})
          </span>
        </div>

        <!-- CONTROL DE AUTO-REFRESCO -->
        <button 
          :class="['btn-toggle-polling', isPollingActive ? 'active' : '']"
          @click="togglePolling"
          :title="isPollingActive ? 'Pausar actualización automática' : 'Reanudar actualización automática'"
        >
          {{ isPollingActive ? '⏸️ Auto (1.5s)' : '▶️ Pausado' }}
        </button>

        <button class="btn btn-secondary" @click="fetchLatest" :disabled="isLoading">
          🔄 Actualizar
        </button>

        <button class="btn btn-primary" @click="isCodeModalOpen = true">
          💻 Código ESP32
        </button>
      </div>
    </header>

    <!-- MENSAJES DE ERROR O AVISO -->
    <div v-if="errorMessage" class="alert-banner">
      ⚠️ {{ errorMessage }}
    </div>

    <!-- CUADRO PRINCIPAL: TANQUE VISUAL + MÉTRICAS -->
    <div class="telemetry-grid">
      <!-- 1. TANQUE VISUAL ANIMADO 3D -->
      <section class="card tank-visual-card">
        <div class="card-header">
          <h3>Visualización del Tanque</h3>
          <span :class="['alert-tag', alertState.type]">{{ alertState.label }}</span>
        </div>

        <div class="tank-wrapper">
          <!-- SENSOR EN LA PARTE SUPERIOR -->
          <div class="sensor-mount">
            <div class="sensor-unit" :class="{ pinging: isOnline }">
              <span class="sensor-chip">HC-SR04</span>
              <div class="wave-emitter">
                <span class="wave wave-1"></span>
                <span class="wave wave-2"></span>
              </div>
            </div>
            <div class="measure-line-distance" :style="{ height: `${distancePercent}%` }">
              <span class="line-label">Distancia: {{ currentDistance.toFixed(1) }} cm</span>
            </div>
          </div>

          <!-- ESTRUCTURA DEL TANQUE -->
          <div class="tank-body">
            <!-- REGLA GRADUADA LATERAL -->
            <div class="tank-ruler">
              <span class="ruler-mark mark-100">100% - {{ tankHeightCm }}cm</span>
              <span class="ruler-mark mark-75">75% - {{ (tankHeightCm * 0.75).toFixed(0) }}cm</span>
              <span class="ruler-mark mark-50">50% - {{ (tankHeightCm * 0.50).toFixed(0) }}cm</span>
              <span class="ruler-mark mark-25">25% - {{ (tankHeightCm * 0.25).toFixed(0) }}cm</span>
              <span class="ruler-mark mark-0">0% - 0cm</span>
            </div>

            <!-- LÍQUIDO CON ANIMACIÓN DE ONDAS -->
            <div 
              class="liquid" 
              :class="liquidColorClass"
              :style="{ height: `${clampedPercentage}%` }"
            >
              <div class="water-surface">
                <div class="wave-layer wave-layer-1"></div>
                <div class="wave-layer wave-layer-2"></div>
              </div>
              <div class="liquid-glare"></div>
              
              <!-- ETIQUETA FLOTANTE DENTRO DEL LÍQUIDO -->
              <div class="liquid-info-badge" v-if="clampedPercentage > 12">
                <strong>{{ clampedPercentage.toFixed(1) }}%</strong>
                <small>{{ currentLevel.toFixed(1) }} cm</small>
              </div>
            </div>
          </div>

          <!-- BASE METÁLICA DEL TANQUE -->
          <div class="tank-base"></div>
        </div>
      </section>

      <!-- 2. TARJETAS DE MÉTRICAS Y TELEMETRÍA -->
      <section class="metrics-column">
        <!-- KPI 1: NIVEL Y PORCENTAJE -->
        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-title">NIVEL ACTUAL</span>
            <span class="metric-icon">🌊</span>
          </div>
          <div class="metric-value-row">
            <span class="metric-number">{{ currentLevel.toFixed(1) }}</span>
            <span class="metric-unit">cm</span>
          </div>
          <div class="metric-sub">
            De una altura útil de <strong>{{ tankHeightCm }} cm</strong>
          </div>
          <!-- BARRA DE PROGRESO -->
          <div class="progress-bar-bg">
            <div 
              class="progress-bar-fill" 
              :class="liquidColorClass" 
              :style="{ width: `${clampedPercentage}%` }"
            ></div>
          </div>
          <div class="progress-labels">
            <span>0%</span>
            <strong>{{ clampedPercentage.toFixed(1) }}%</strong>
            <span>100%</span>
          </div>
        </div>

        <!-- KPI 2: DISTANCIA SENSOR AL AGUA -->
        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-title">DISTANCIA AL AGUA</span>
            <span class="metric-icon">📏</span>
          </div>
          <div class="metric-value-row">
            <span class="metric-number">{{ currentDistance.toFixed(1) }}</span>
            <span class="metric-unit">cm</span>
          </div>
          <div class="metric-sub">
            Distancia sensor cuando lleno: <strong>{{ fullDistanceCm }} cm</strong>
          </div>
        </div>

        <!-- KPI 3: DISPOSITIVO Y ESTADO -->
        <div class="card metric-card info-card">
          <div class="metric-top">
            <span class="metric-title">DATOS DEL DISPOSITIVO</span>
            <span class="metric-icon">⚙️</span>
          </div>
          <ul class="device-details-list">
            <li>
              <span>ID Dispositivo:</span>
              <strong>{{ currentDeviceId || 'esp32_tanque_1' }}</strong>
            </li>
            <li>
              <span>Último Reporte:</span>
              <strong>{{ lastPingFormatted }}</strong>
            </li>
            <li>
              <span>Protocolo:</span>
              <strong class="protocol-badge">Wi-Fi HTTP REST</strong>
            </li>
            <li>
              <span>Umbral Alarma:</span>
              <span>Bajo &lt; 20% | Alto &gt; 85%</span>
            </li>
          </ul>
        </div>

        <!-- PANEL DE SIMULACIÓN PARA PRUEBAS -->
        <div class="card simulator-card">
          <div class="metric-top">
            <span class="metric-title">🧪 SIMULADOR (PRUEBA RÁPIDA)</span>
            <button class="btn-link" @click="sendSimulated(50.0)">Reset 50%</button>
          </div>
          <p class="sim-help">Prueba la animación y registro sin necesidad del ESP32 físico:</p>
          <div class="sim-controls">
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="1" 
              v-model.number="simulatedPercentage" 
              @input="onSimSliderChange"
              class="sim-slider"
            />
            <span class="sim-val">{{ simulatedPercentage }}%</span>
          </div>
          <div class="sim-buttons">
            <button class="btn-chip" @click="sendSimulated(15)">Nivel Bajo (15%)</button>
            <button class="btn-chip" @click="sendSimulated(65)">Normal (65%)</button>
            <button class="btn-chip" @click="sendSimulated(92)">Lleno / Alerta (92%)</button>
          </div>
        </div>
      </section>
    </div>

    <!-- 3. GRÁFICO HISTÓRICO EN TIEMPO REAL -->
    <section class="card history-card">
      <div class="card-header">
        <div class="header-left">
          <h3>📈 Historial de Nivel en Tiempo Real</h3>
          <span class="history-count">({{ historyReadings.length }} lecturas)</span>
        </div>
        <div class="history-stats" v-if="historyReadings.length > 0">
          <span>Mín: <strong>{{ minHistoricalLevel.toFixed(1) }}%</strong></span>
          <span>Máx: <strong>{{ maxHistoricalLevel.toFixed(1) }}%</strong></span>
          <span>Prom: <strong>{{ avgHistoricalLevel.toFixed(1) }}%</strong></span>
        </div>
      </div>

      <div class="chart-container" ref="chartContainerRef">
        <!-- GRÁFICO SVG VECTORIAL FLUIDO -->
        <svg 
          v-if="historyReadings.length > 1" 
          class="history-svg" 
          viewBox="0 0 800 220" 
          preserveAspectRatio="none"
        >
          <defs>
            <!-- DEGRADADO DEL ÁREA BAJO LA CURVA -->
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#0284c7" stop-opacity="0.45" />
              <stop offset="100%" stop-color="#0284c7" stop-opacity="0.0" />
            </linearGradient>
          </defs>

          <!-- LÍNEAS DE CUADRÍCULA HORIZONTALES (25%, 50%, 75%, 100%) -->
          <line x1="0" y1="20" x2="800" y2="20" class="grid-line" />
          <line x1="0" y1="65" x2="800" y2="65" class="grid-line" />
          <line x1="0" y1="110" x2="800" y2="110" class="grid-line" />
          <line x1="0" y1="155" x2="800" y2="155" class="grid-line" />
          <line x1="0" y1="200" x2="800" y2="200" class="grid-line-base" />

          <!-- ETIQUETAS DE EJE Y -->
          <text x="10" y="25" class="axis-label">100%</text>
          <text x="10" y="70" class="axis-label">75%</text>
          <text x="10" y="115" class="axis-label">50%</text>
          <text x="10" y="160" class="axis-label">25%</text>
          <text x="10" y="200" class="axis-label">0%</text>

          <!-- ÁREA RELLENA -->
          <path :d="svgAreaPath" fill="url(#areaGrad)" />

          <!-- LÍNEA DE TENDENCIA -->
          <path :d="svgLinePath" class="trend-line" />

          <!-- PUNTOS RECIENTES -->
          <circle 
            v-for="(pt, idx) in svgPoints" 
            :key="idx" 
            :cx="pt.x" 
            :cy="pt.y" 
            r="3.5" 
            class="trend-point"
          >
            <title>{{ pt.label }}</title>
          </circle>
        </svg>

        <div v-else class="empty-chart">
          <span>Esperando datos del ESP32 para graficar historial...</span>
        </div>
      </div>
    </section>

    <!-- MODAL DE CÓDIGO Y GUÍA DE CONEXIÓN PARA ESP32 -->
    <div v-if="isCodeModalOpen" class="modal-backdrop" @click.self="isCodeModalOpen = false">
      <div class="modal-box code-modal">
        <header class="modal-header">
          <h3>🔌 Código Wi-Fi para tu ESP32</h3>
          <button class="btn-close" @click="isCodeModalOpen = false">✕</button>
        </header>

        <div class="modal-body">
          <p class="modal-intro">
            Este código ya incluye la conexión Wi-Fi, la lectura de tu sensor ultrasónico y el envío automático por HTTP POST a este servidor en Suite Minerals.
          </p>

          <div class="config-reminder">
            <strong>Instrucciones rápidas:</strong>
            <ol>
              <li>Reemplaza <code>TU_RED_WIFI</code> y <code>TU_PASSWORD_WIFI</code> con los datos de tu red.</li>
              <li>Ingresa la dirección IP o dominio de tu servidor (ej. <code>http://192.168.1.50:8000/level/reading</code>).</li>
              <li>Copia el código en el Arduino IDE y súbelo a tu placa ESP32.</li>
            </ol>
          </div>

          <div class="code-wrapper">
            <button class="btn-copy-code" @click="copyEspCode">
              {{ isCopied ? '✅ ¡Copiado!' : '📋 Copiar Código C++' }}
            </button>
            <pre><code>{{ esp32CodeTemplate }}</code></pre>
          </div>
        </div>

        <footer class="modal-footer">
          <button class="btn btn-secondary" @click="isCodeModalOpen = false">Cerrar</button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '../services/api'

// CONFIGURACIÓN BASE DEL TANQUE
const tankHeightCm = ref(100.0)
const fullDistanceCm = ref(10.0)

// ESTADO DE TELEMETRÍA
const currentDistance = ref(30.0)
const currentLevel = ref(70.0)
const currentPercentage = ref(70.0)
const currentDeviceId = ref('esp32_tanque_1')
const isOnline = ref(false)
const lastPingSeconds = ref(null)
const lastPingFormatted = ref('Esperando lectura...')

const historyReadings = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

// POLLING AUTOMÁTICO
const isPollingActive = ref(true)
let pollTimer = null

// SIMULADOR
const simulatedPercentage = ref(70)

// MODAL DE CÓDIGO
const isCodeModalOpen = ref(false)
const isCopied = ref(false)

// CÁLCULOS REACTIVOS
const clampedPercentage = computed(() => {
  return Math.min(100.0, Math.max(0.0, currentPercentage.value))
})

const distancePercent = computed(() => {
  return Math.min(100.0, Math.max(0.0, 100.0 - clampedPercentage.value))
})

const liquidColorClass = computed(() => {
  if (clampedPercentage.value > 85) return 'liquid-high' // Alerta nivel alto
  if (clampedPercentage.value < 20) return 'liquid-low'  // Alerta nivel bajo
  return 'liquid-normal'
})

const alertState = computed(() => {
  if (!isOnline.value && lastPingSeconds.value !== null && lastPingSeconds.value > 15) {
    return { type: 'alert-offline', label: 'Sin Señal ESP32' }
  }
  if (clampedPercentage.value >= 85) {
    return { type: 'alert-high', label: '⚠️ Nivel Crítico Alto (>85%)' }
  }
  if (clampedPercentage.value <= 20) {
    return { type: 'alert-low', label: '⚠️ Nivel Crítico Bajo (<20%)' }
  }
  return { type: 'alert-ok', label: '✅ Nivel Normal' }
})

// HISTORIAL Y SVG PATHS
const minHistoricalLevel = computed(() => {
  if (historyReadings.value.length === 0) return 0
  return Math.min(...historyReadings.value.map(r => r.percentage))
})

const maxHistoricalLevel = computed(() => {
  if (historyReadings.value.length === 0) return 0
  return Math.max(...historyReadings.value.map(r => r.percentage))
})

const avgHistoricalLevel = computed(() => {
  if (historyReadings.value.length === 0) return 0
  const sum = historyReadings.value.reduce((acc, r) => acc + r.percentage, 0)
  return sum / historyReadings.value.length
})

const svgPoints = computed(() => {
  const list = historyReadings.value
  if (list.length === 0) return []
  const count = list.length
  return list.map((item, idx) => {
    const x = count === 1 ? 400 : (idx / (count - 1)) * 760 + 20
    const pct = Math.min(100, Math.max(0, item.percentage))
    // 0% -> y = 200, 100% -> y = 20
    const y = 200 - (pct / 100.0) * 180
    return {
      x,
      y,
      pct,
      label: `${pct.toFixed(1)}% (${item.level_cm.toFixed(1)} cm)`
    }
  })
})

const svgLinePath = computed(() => {
  const pts = svgPoints.value
  if (pts.length < 2) return ''
  return pts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ')
})

const svgAreaPath = computed(() => {
  const pts = svgPoints.value
  if (pts.length < 2) return ''
  const first = pts[0]
  const last = pts[pts.length - 1]
  const linePart = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ')
  return `${linePart} L ${last.x.toFixed(1)} 200 L ${first.x.toFixed(1)} 200 Z`
})

// MÉTODOS DE API
async function fetchLatest() {
  try {
    isLoading.value = true
    errorMessage.value = ''
    const latest = await api.getLatestLevel()
    if (latest) {
      currentDistance.value = latest.distance_cm
      currentLevel.value = latest.level_cm
      currentPercentage.value = latest.percentage
      currentDeviceId.value = latest.device_id
      isOnline.value = latest.is_online
      lastPingSeconds.value = latest.seconds_ago
      formatLastPing(latest.created_at)
    }

    const hist = await api.getLevelHistory(40)
    if (Array.isArray(hist)) {
      historyReadings.value = hist
    }
  } catch (err) {
    errorMessage.value = `Error de conexión: ${err.message}`
  } finally {
    isLoading.value = false
  }
}

function formatLastPing(isoString) {
  if (!isoString) return
  try {
    const d = new Date(isoString)
    lastPingFormatted.value = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch (_) {
    lastPingFormatted.value = isoString
  }
}

function togglePolling() {
  isPollingActive.value = !isPollingActive.value
  if (isPollingActive.value) {
    startPolling()
  } else {
    stopPolling()
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    fetchLatest()
  }, 1500)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// SIMULADOR
async function sendSimulated(pct) {
  simulatedPercentage.value = pct
  const lvl = (pct / 100.0) * tankHeightCm.value
  const dist = tankHeightCm.value - lvl + fullDistanceCm.value
  try {
    await api.simulateLevelReading({
      device_id: 'esp32_tanque_1',
      distance_cm: dist,
      level_cm: lvl,
      percentage: pct
    })
    await fetchLatest()
  } catch (err) {
    errorMessage.value = `Error en simulación: ${err.message}`
  }
}

function onSimSliderChange() {
  sendSimulated(simulatedPercentage.value)
}

// PLANTILLA DE CÓDIGO ESP32
const esp32CodeTemplate = computed(() => {
  const apiUrl = api.baseUrl ? `${api.baseUrl}/level/reading` : 'http://192.168.1.50:8000/level/reading'
  return `/*
  * SUITE MINERALS - MÓDULO SENSOR DE NIVEL ESP32
  * Envío de telemetría por Wi-Fi HTTP POST
  */

#include <WiFi.h>
#include <HTTPClient.h>

// ==========================================
// 1. CONFIGURACIÓN DE RED WI-FI
// ==========================================
const char* WIFI_SSID     = "TU_RED_WIFI";
const char* WIFI_PASSWORD = "TU_PASSWORD_WIFI";

// Dirección IP o dominio de tu servidor Suite Minerals:
const char* SERVER_URL    = "${apiUrl}";

// ==========================================
// 2. PINES DEL SENSOR ULTRASÓNICO
// ==========================================
const int ECHO_PIN = 7;
const int TRIG_PIN = 10;

// Medidas del tanque (calibración en cm):
const float ALTURA_UTIL_CM    = ${tankHeightCm.value.toFixed(1)};
const float DISTANCIA_LLENO_CM = ${fullDistanceCm.value.toFixed(1)};

// Intervalo de transmisión en milisegundos (ej. cada 2 segundos)
const unsigned long SEND_INTERVAL_MS = 2000;
unsigned long lastSendTime = 0;

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

  Serial.println("\\nIniciando Monitor de Nivel Suite Minerals...");
  
  // Conectar a la red Wi-Fi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando a Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\n✅ Conectado a Wi-Fi! IP: " + WiFi.localIP().toString());
}

void loop() {
  if (millis() - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = millis();

    // 1. Disparar pulso ultrasónico
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(3);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    // 2. Esperar respuesta del sensor (máx 30 ms)
    unsigned long duracion = pulseIn(ECHO_PIN, HIGH, 30000);

    if (duracion == 0) {
      Serial.println("⚠️ Sin lectura: verificar cables y sensor");
      return;
    }

    // 3. Cálculos físicos
    float distancia = duracion * 0.0343 / 2.0;
    float nivel = ALTURA_UTIL_CM - (distancia - DISTANCIA_LLENO_CM);
    nivel = constrain(nivel, 0.0, ALTURA_UTIL_CM);
    float porcentaje = (nivel / ALTURA_UTIL_CM) * 100.0;

    Serial.printf("Dist: %.1f cm | Nivel: %.1f cm | %%: %.1f %%\\n", distancia, nivel, porcentaje);

    // 4. Enviar datos al Backend Suite Minerals vía HTTP POST
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(SERVER_URL);
      http.addHeader("Content-Type", "application/json");

      String payload = "{\\"device_id\\":\\"esp32_tanque_1\\",\\"distance_cm\\":" + String(distancia, 2) + 
                       ",\\"level_cm\\":" + String(nivel, 2) + 
                       ",\\"percentage\\":" + String(porcentaje, 2) + "}";

      int httpResponseCode = http.POST(payload);
      if (httpResponseCode > 0) {
        Serial.printf("📡 Servidor respondió con código: %d\\n", httpResponseCode);
      } else {
        Serial.printf("❌ Error enviando HTTP POST: %s\\n", http.errorToString(httpResponseCode).c_str());
      }
      http.end();
    } else {
      Serial.println("⚠️ Wi-Fi desconectado. Reintentando...");
    }
  }
}`
})

function copyEspCode() {
  navigator.clipboard.writeText(esp32CodeTemplate.value)
  isCopied.value = true
  setTimeout(() => {
    isCopied.value = false
  }, 2500)
}

onMounted(() => {
  fetchLatest()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.level-sensor-container {
  padding: 24px;
  max-width: 1300px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #1e293b;
}

/* HEADER */
.telemetry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.title-with-icon {
  display: flex;
  align-items: center;
  gap: 12px;
}
.sensor-icon { font-size: 2.2rem; }
.telemetry-header h2 { margin: 0; font-size: 1.5rem; color: #0f172a; font-weight: 700; }
.subtitle { margin: 4px 0 0; color: #64748b; font-size: 0.88rem; }

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* STATUS PILL */
.status-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.status-pill.online {
  background: #dcfce7;
  color: #15803d;
  border: 1px solid #86efac;
}
.status-pill.offline {
  background: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fca5a5;
}
.status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
.online .status-dot { background: #16a34a; box-shadow: 0 0 6px #22c55e; }
.offline .status-dot { background: #dc2626; }
.time-ago { font-size: 0.75rem; opacity: 0.8; }

.btn-toggle-polling {
  padding: 7px 14px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #475569;
  transition: all 0.2s;
}
.btn-toggle-polling.active {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}
.btn-primary { background: #0284c7; color: white; }
.btn-primary:hover { background: #0369a1; }
.btn-secondary { background: #f1f5f9; color: #334155; border-color: #cbd5e1; }
.btn-secondary:hover { background: #e2e8f0; }

.alert-banner {
  background: #fffbeb;
  border: 1px solid #fef3c7;
  color: #b45309;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 0.9rem;
  margin-bottom: 20px;
}

/* CARDS GRID */
.telemetry-grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}
@media (max-width: 950px) {
  .telemetry-grid { grid-template-columns: 1fr; }
}

.card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}
.card-header h3 { margin: 0; font-size: 1.15rem; color: #0f172a; font-weight: 600; }

.alert-tag {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 700;
}
.alert-tag.alert-ok { background: #dcfce7; color: #15803d; }
.alert-tag.alert-high { background: #fee2e2; color: #dc2626; animation: pulse 2s infinite; }
.alert-tag.alert-low { background: #fef3c7; color: #b45309; }
.alert-tag.alert-offline { background: #f1f5f9; color: #64748b; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* TANQUE 3D VISUAL */
.tank-visual-card {
  display: flex;
  flex-direction: column;
}
.tank-wrapper {
  position: relative;
  width: 100%;
  max-width: 380px;
  margin: 10px auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* SENSOR */
.sensor-mount {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}
.sensor-unit {
  background: #1e293b;
  color: #38bdf8;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 10;
}
.sensor-unit.pinging .sensor-chip {
  color: #4ade80;
}

.wave-emitter {
  position: relative;
  width: 12px;
  height: 12px;
}
.wave {
  position: absolute;
  border: 2px solid #38bdf8;
  border-radius: 50%;
  opacity: 0;
  animation: radarWave 1.8s infinite;
}
.wave-2 { animation-delay: 0.9s; }

@keyframes radarWave {
  0% { width: 4px; height: 4px; top: 4px; left: 4px; opacity: 1; }
  100% { width: 28px; height: 28px; top: -8px; left: -8px; opacity: 0; }
}

.measure-line-distance {
  width: 2px;
  border-left: 2px dashed #94a3b8;
  position: relative;
  min-height: 8px;
  max-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.line-label {
  position: absolute;
  left: 10px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
}

/* CUERPO DEL TANQUE */
.tank-body {
  width: 260px;
  height: 280px;
  border: 4px solid #64748b;
  border-top: none;
  border-radius: 0 0 16px 16px;
  background: linear-gradient(to right, rgba(241, 245, 249, 0.4), rgba(255, 255, 255, 0.7), rgba(241, 245, 249, 0.4));
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 0 15px rgba(0,0,0,0.06), 0 8px 16px rgba(0,0,0,0.04);
}

.tank-ruler {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 6px;
  width: 100%;
  pointer-events: none;
  z-index: 5;
}
.ruler-mark {
  position: absolute;
  left: 0;
  font-size: 0.7rem;
  font-weight: 600;
  color: #64748b;
  border-top: 1px solid #cbd5e1;
  width: 35px;
  padding-left: 2px;
  transform: translateY(-50%);
}
.mark-100 { top: 4%; }
.mark-75  { top: 25%; }
.mark-50  { top: 50%; }
.mark-25  { top: 75%; }
.mark-0   { top: 96%; }

/* LÍQUIDO */
.liquid {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
}
.liquid-normal {
  background: linear-gradient(180deg, #38bdf8 0%, #0284c7 100%);
}
.liquid-high {
  background: linear-gradient(180deg, #f87171 0%, #dc2626 100%);
}
.liquid-low {
  background: linear-gradient(180deg, #fbbf24 0%, #d97706 100%);
}

.liquid-glare {
  position: absolute;
  top: 0;
  left: 10%;
  bottom: 0;
  width: 25%;
  background: linear-gradient(to right, rgba(255,255,255,0.35), rgba(255,255,255,0));
  pointer-events: none;
}

/* ONDAS SUPERFICIALES */
.water-surface {
  position: absolute;
  top: -12px;
  left: 0;
  right: 0;
  height: 14px;
  overflow: hidden;
}
.wave-layer {
  position: absolute;
  top: 0;
  width: 200%;
  height: 100%;
  background-repeat: repeat-x;
  background-size: 50% 100%;
  opacity: 0.7;
}
.wave-layer-1 {
  background-image: radial-gradient(circle at 10px 0, transparent 0, transparent 8px, #38bdf8 8px);
  animation: moveWaves 3s linear infinite;
}
.wave-layer-2 {
  background-image: radial-gradient(circle at 15px 0, transparent 0, transparent 8px, #0284c7 8px);
  animation: moveWaves 2s linear reverse infinite;
  opacity: 0.5;
}

@keyframes moveWaves {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.liquid-info-badge {
  margin: auto auto 12px;
  background: rgba(15, 23, 42, 0.65);
  color: white;
  padding: 4px 12px;
  border-radius: 999px;
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 0.85rem;
  z-index: 6;
  backdrop-filter: blur(2px);
}

.tank-base {
  width: 280px;
  height: 12px;
  background: #475569;
  border-radius: 4px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.15);
}

/* COLUMNA DE MÉTRICAS */
.metrics-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.metric-card {
  padding: 16px 20px;
}
.metric-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.metric-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.6px;
}
.metric-icon { font-size: 1.25rem; }

.metric-value-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 4px;
}
.metric-number {
  font-size: 2.2rem;
  font-weight: 800;
  color: #0f172a;
}
.metric-unit {
  font-size: 1.1rem;
  color: #64748b;
  font-weight: 600;
}
.metric-sub {
  font-size: 0.84rem;
  color: #64748b;
  margin-bottom: 12px;
}

.progress-bar-bg {
  width: 100%;
  height: 8px;
  background: #f1f5f9;
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 6px;
}
.progress-bar-fill {
  height: 100%;
  transition: width 0.4s ease;
}
.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: #64748b;
}

/* LISTA DISPOSITIVO */
.device-details-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.85rem;
}
.device-details-list li {
  display: flex;
  justify-content: space-between;
  padding-bottom: 6px;
  border-bottom: 1px dashed #f1f5f9;
}
.protocol-badge {
  background: #e0f2fe;
  color: #0369a1;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
}

/* SIMULADOR */
.simulator-card {
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
}
.btn-link {
  background: none;
  border: none;
  color: #0284c7;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}
.sim-help {
  font-size: 0.82rem;
  color: #64748b;
  margin: 0 0 10px;
}
.sim-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.sim-slider {
  flex: 1;
  accent-color: #0284c7;
  cursor: pointer;
}
.sim-val {
  font-weight: 700;
  font-size: 0.95rem;
  min-width: 48px;
  text-align: right;
}
.sim-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.btn-chip {
  padding: 5px 10px;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-chip:hover {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
}

/* HISTORIAL */
.history-card {
  margin-top: 8px;
}
.history-count {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 400;
  margin-left: 8px;
}
.history-stats {
  display: flex;
  gap: 16px;
  font-size: 0.85rem;
  color: #475569;
}

.chart-container {
  width: 100%;
  height: 220px;
  position: relative;
  margin-top: 10px;
}
.history-svg {
  width: 100%;
  height: 100%;
}
.grid-line {
  stroke: #f1f5f9;
  stroke-width: 1;
}
.grid-line-base {
  stroke: #cbd5e1;
  stroke-width: 1.5;
}
.axis-label {
  font-size: 10px;
  fill: #94a3b8;
  font-weight: 600;
}
.trend-line {
  fill: none;
  stroke: #0284c7;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.trend-point {
  fill: #0284c7;
  stroke: #ffffff;
  stroke-width: 2;
  cursor: pointer;
  transition: transform 0.2s;
}
.trend-point:hover {
  transform: scale(1.4);
  fill: #0369a1;
}

.empty-chart {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #94a3b8;
  font-size: 0.9rem;
}

/* MODAL DE CÓDIGO */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.modal-box {
  background: white;
  border-radius: 12px;
  max-width: 780px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e2e8f0;
}
.modal-header h3 { margin: 0; font-size: 1.2rem; color: #0f172a; }
.btn-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #64748b;
  cursor: pointer;
}
.modal-body {
  padding: 20px 24px;
  overflow-y: auto;
}
.modal-intro {
  font-size: 0.9rem;
  color: #475569;
  margin-top: 0;
}
.config-reminder {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 0.85rem;
  color: #166534;
  margin-bottom: 16px;
}
.config-reminder ol { margin: 6px 0 0; padding-left: 20px; }
.config-reminder code {
  background: #dcfce7;
  padding: 1px 4px;
  border-radius: 4px;
  font-family: monospace;
}

.code-wrapper {
  position: relative;
  background: #0f172a;
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
}
.btn-copy-code {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #334155;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-copy-code:hover { background: #475569; }
.code-wrapper pre {
  margin: 0;
  font-family: "Fira Code", Consolas, Monaco, monospace;
  font-size: 0.82rem;
  color: #e2e8f0;
  line-height: 1.45;
}
.modal-footer {
  padding: 14px 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
}
</style>
