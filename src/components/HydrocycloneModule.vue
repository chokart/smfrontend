<template>
  <div class="cyclone-module-container">
    <!-- CABECERA DEL MÓDULO -->
    <header class="cyclone-header">
      <div class="header-info">
        <span class="cyclone-icon">🌪️</span>
        <div>
          <h2>Módulo de Hidrociclones (Modelo Nageswararao)</h2>
          <p class="subtitle">Balance granulométrico, calibración de constantes JKMRC y simulación predictiva de clasificación</p>
        </div>
      </div>

      <!-- PESTAÑAS (TABS) -->
      <nav class="module-tabs">
        <button 
          :class="['tab-btn', { active: activeTab === 'balance' }]"
          @click="activeTab = 'balance'"
        >
          <span class="tab-badge">1</span> Balance Granulométrico
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'calibrate' }]"
          @click="activeTab = 'calibrate'"
        >
          <span class="tab-badge">2</span> Calibración Nageswararao
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'simulate' }]"
          @click="activeTab = 'simulate'"
        >
          <span class="tab-badge">3</span> Simulación y Roping
        </button>
      </nav>
    </header>

    <!-- MENSAJES DE ERROR O NOTIFICACIÓN -->
    <div v-if="errorMessage" class="alert-banner error">
      ⚠️ {{ errorMessage }}
      <button class="close-alert" @click="errorMessage = ''">✕</button>
    </div>
    <div v-if="successMessage" class="alert-banner success">
      ✅ {{ successMessage }}
      <button class="close-alert" @click="successMessage = ''">✕</button>
    </div>

    <!-- =================================================================== -->
    <!-- SUBMÓDULO 1: BALANCE GRANULOMÉTRICO (TWO-PRODUCT SURVEY RECONCILIATION) -->
    <!-- =================================================================== -->
    <div v-show="activeTab === 'balance'" class="tab-pane">
      <div class="pane-grid">
        <!-- FORMULARIO DE ENTRADA -->
        <section class="card input-card">
          <div class="card-header">
            <h3>📊 Datos de Muestreo (Survey Granulométrico)</h3>
            <button class="btn btn-secondary btn-sm" @click="loadTypicalSurveyPreset">
              🧪 Cargar Datos Típicos de Planta
            </button>
          </div>

          <div class="operating-conditions-row">
            <div class="form-group">
              <label>Sólidos Alim. (t/h):</label>
              <input type="number" v-model.number="balanceForm.feed_solids_tph" step="10" min="1" />
            </div>
            <div class="form-group">
              <label>% Sólidos Alim. (Cp):</label>
              <input type="number" v-model.number="balanceForm.feed_cp" step="1" min="5" max="85" />
            </div>
            <div class="form-group">
              <label>% Sólidos Over (Cp):</label>
              <input type="number" v-model.number="balanceForm.overflow_cp" step="1" min="5" max="75" />
            </div>
            <div class="form-group">
              <label>% Sólidos Under (Cp):</label>
              <input type="number" v-model.number="balanceForm.underflow_cp" step="1" min="40" max="88" />
            </div>
            <div class="form-group">
              <label>G.E. Sólido (t/m³):</label>
              <input type="number" v-model.number="balanceForm.solids_density" step="0.05" min="1.5" max="5.5" />
            </div>
          </div>

          <div class="table-container-sieves">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Abertura (µm)</th>
                  <th>Alimentación (% Pasante)</th>
                  <th>Rebose / Over (% Pasante)</th>
                  <th>Descarga / Under (% Pasante)</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in balanceForm.sieves" :key="idx">
                  <td>
                    <input type="number" v-model.number="row.size_microns" step="any" min="1" class="cell-input" />
                  </td>
                  <td>
                    <input type="number" v-model.number="row.feed_passing" step="0.1" min="0" max="100" class="cell-input" />
                  </td>
                  <td>
                    <input type="number" v-model.number="row.overflow_passing" step="0.1" min="0" max="100" class="cell-input" />
                  </td>
                  <td>
                    <input type="number" v-model.number="row.underflow_passing" step="0.1" min="0" max="100" class="cell-input" />
                  </td>
                  <td class="action-cell">
                    <button class="btn-icon" @click="removeSieveRow(idx)" title="Eliminar malla" :disabled="balanceForm.sieves.length <= 3">
                      🗑️
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="table-actions">
            <button class="btn btn-outline btn-sm" @click="addSieveRow">
              ➕ Añadir Malla
            </button>
            <button class="btn btn-primary" @click="executeCycloneBalance" :disabled="isLoading">
              ⚡ Reconciliar y Calcular Tromp
            </button>
          </div>
        </section>

        <!-- RESULTADOS DEL BALANCE -->
        <section v-if="balanceResult" class="card results-card">
          <div class="card-header">
            <h3>📈 Resultados de Balance y Curva Tromp</h3>
            <button class="btn btn-accent btn-sm" @click="transferBalanceToCalibration">
              ➡️ Transferir a Calibración
            </button>
          </div>

          <!-- KPIS CLAVE -->
          <div class="kpi-grid">
            <div class="kpi-card highlight">
              <span class="kpi-label">Tamaño de Corte (d50c)</span>
              <span class="kpi-value">{{ balanceResult.d50c_microns }} <small>µm</small></span>
              <span class="kpi-desc">Corte corregido centrífugo</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Agudeza (m)</span>
              <span class="kpi-value">{{ balanceResult.sharpness_m }}</span>
              <span class="kpi-desc">R² = {{ balanceResult.r_squared }}</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Recup. Sólidos a Under</span>
              <span class="kpi-value">{{ balanceResult.solids_split_underflow_pct }}%</span>
              <span class="kpi-desc">Split Underflow (β)</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Bypass de Finos (Rf)</span>
              <span class="kpi-value">{{ balanceResult.bypass_rf_pct }}%</span>
              <span class="kpi-desc">Arrastre con agua</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">P80 Alimentación</span>
              <span class="kpi-value">{{ balanceResult.feed.p80_microns }} <small>µm</small></span>
              <span class="kpi-desc">P50 = {{ balanceResult.feed.p50_microns }} µm</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">P80 Rebose (Over)</span>
              <span class="kpi-value">{{ balanceResult.overflow.p80_microns }} <small>µm</small></span>
              <span class="kpi-desc">P50 = {{ balanceResult.overflow.p50_microns }} µm</span>
            </div>
          </div>

          <!-- GRÁFICO SVG INTERACTIVO: CURVA TROMP -->
          <div class="chart-wrapper">
            <h4>Curva de Partición Tromp (% Reporte al Underflow)</h4>
            <div class="svg-chart-container">
              <svg viewBox="0 0 500 260" class="svg-chart">
                <!-- Ejes y grilla -->
                <line x1="50" y1="20" x2="50" y2="210" stroke="#cbd5e1" stroke-width="1.5" />
                <line x1="50" y1="210" x2="480" y2="210" stroke="#cbd5e1" stroke-width="1.5" />
                
                <!-- Líneas horizontales de referencia -->
                <line x1="50" y1="20" x2="480" y2="20" stroke="#f1f5f9" stroke-dasharray="3,3" />
                <text x="42" y="24" class="chart-axis-label" text-anchor="end">100%</text>

                <line x1="50" y1="115" x2="480" y2="115" stroke="#e2e8f0" stroke-dasharray="4,4" />
                <text x="42" y="119" class="chart-axis-label" text-anchor="end">50%</text>

                <text x="42" y="214" class="chart-axis-label" text-anchor="end">0%</text>

                <!-- Línea de Bypass Rf -->
                <line 
                  x1="50" 
                  :y1="210 - (balanceResult.bypass_rf_pct * 1.9)" 
                  x2="480" 
                  :y2="210 - (balanceResult.bypass_rf_pct * 1.9)" 
                  stroke="#f59e0b" 
                  stroke-dasharray="4,3" 
                  stroke-width="1.5" 
                />
                <text x="475" :y="205 - (balanceResult.bypass_rf_pct * 1.9)" class="chart-tag bypass" text-anchor="end">
                  Bypass Rf = {{ balanceResult.bypass_rf_pct }}%
                </text>

                <!-- Curva Tromp Real -->
                <polyline 
                  :points="generateTrompPoints(balanceResult.reconciled_sieves, 'partition_actual')" 
                  fill="none" 
                  stroke="#0284c7" 
                  stroke-width="2.5" 
                />
                <!-- Curva Tromp Corregida -->
                <polyline 
                  :points="generateTrompPoints(balanceResult.reconciled_sieves, 'partition_reduced')" 
                  fill="none" 
                  stroke="#10b981" 
                  stroke-width="2" 
                  stroke-dasharray="4,2" 
                />

                <!-- Puntos de datos -->
                <circle 
                  v-for="(pt, pIdx) in getTrompCoords(balanceResult.reconciled_sieves, 'partition_actual')" 
                  :key="`act-${pIdx}`"
                  :cx="pt.x" 
                  :cy="pt.y" 
                  r="3.5" 
                  fill="#0284c7" 
                />

                <!-- Marcador de d50c -->
                <circle 
                  :cx="sizeToXCoord(balanceResult.d50c_microns)" 
                  cy="115" 
                  r="5" 
                  fill="#ef4444" 
                />
                <text :x="sizeToXCoord(balanceResult.d50c_microns) + 8" y="110" class="chart-tag d50c">
                  d50c = {{ balanceResult.d50c_microns }} µm
                </text>
              </svg>
            </div>
            <div class="chart-legend">
              <span class="legend-item"><i class="dot blue"></i> Eficiencia Real Tromp</span>
              <span class="legend-item"><i class="dot green dashed"></i> Eficiencia Reducida (Corregida)</span>
              <span class="legend-item"><i class="dot orange"></i> Bypass Rf</span>
              <span class="legend-item"><i class="dot red"></i> d50c</span>
            </div>
          </div>

          <!-- TABLA DE BALANCE DE CORRIENTES -->
          <div class="streams-summary">
            <h4>Balance de Corrientes Reconciliado</h4>
            <table class="data-table compact">
              <thead>
                <tr>
                  <th>Corriente</th>
                  <th>Sólidos (t/h)</th>
                  <th>Agua (t/h)</th>
                  <th>Pulpa (t/h)</th>
                  <th>Caudal (m³/h)</th>
                  <th>% Sólidos (Cp)</th>
                  <th>P80 (µm)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Alimentación (Feed)</strong></td>
                  <td>{{ balanceResult.feed.solids_tph }}</td>
                  <td>{{ balanceResult.feed.water_tph }}</td>
                  <td>{{ balanceResult.feed.pulp_tph }}</td>
                  <td>{{ balanceResult.feed.pulp_flow_m3h }}</td>
                  <td>{{ balanceResult.feed.solids_cp }}%</td>
                  <td>{{ balanceResult.feed.p80_microns }}</td>
                </tr>
                <tr>
                  <td><strong>Rebose (Overflow)</strong></td>
                  <td>{{ balanceResult.overflow.solids_tph }}</td>
                  <td>{{ balanceResult.overflow.water_tph }}</td>
                  <td>{{ balanceResult.overflow.pulp_tph }}</td>
                  <td>{{ balanceResult.overflow.pulp_flow_m3h }}</td>
                  <td>{{ balanceResult.overflow.solids_cp }}%</td>
                  <td>{{ balanceResult.overflow.p80_microns }}</td>
                </tr>
                <tr>
                  <td><strong>Descarga (Underflow)</strong></td>
                  <td>{{ balanceResult.underflow.solids_tph }}</td>
                  <td>{{ balanceResult.underflow.water_tph }}</td>
                  <td>{{ balanceResult.underflow.pulp_tph }}</td>
                  <td>{{ balanceResult.underflow.pulp_flow_m3h }}</td>
                  <td>{{ balanceResult.underflow.solids_cp }}%</td>
                  <td>{{ balanceResult.underflow.p80_microns }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>

    <!-- =================================================================== -->
    <!-- SUBMÓDULO 2: CALIBRACIÓN DEL MODELO DE NAGESWARARAO -->
    <!-- =================================================================== -->
    <div v-show="activeTab === 'calibrate'" class="tab-pane">
      <div class="pane-grid">
        <!-- ENTRADAS DE GEOMETRÍA Y OPERACIÓN -->
        <section class="card input-card">
          <div class="card-header">
            <h3>⚙️ Geometría del Hidrociclón y Operación de Planta</h3>
            <button class="btn btn-secondary btn-sm" @click="loadStandardGeometryPreset">
              📐 Geometría Estándar (D500)
            </button>
          </div>

          <h4 class="section-subtitle">1. Dimensiones Físicas del Ciclón</h4>
          <div class="geometry-grid">
            <div class="form-group">
              <label>Diámetro Ciclón Dc (mm):</label>
              <input type="number" v-model.number="calibForm.geometry.dc_mm" step="10" min="50" />
            </div>
            <div class="form-group">
              <label>Entrada Di (mm):</label>
              <input type="number" v-model.number="calibForm.geometry.di_mm" step="5" min="10" />
            </div>
            <div class="form-group">
              <label>Vortex Finder Do (mm):</label>
              <input type="number" v-model.number="calibForm.geometry.do_mm" step="5" min="20" />
            </div>
            <div class="form-group">
              <label>Tobera / Apex Du (mm):</label>
              <input type="number" v-model.number="calibForm.geometry.du_mm" step="5" min="10" />
            </div>
            <div class="form-group">
              <label>Cuerpo Cilíndrico Lc (mm):</label>
              <input type="number" v-model.number="calibForm.geometry.lc_mm" step="50" min="50" />
            </div>
            <div class="form-group">
              <label>Ángulo del Cono θ (°):</label>
              <input type="number" v-model.number="calibForm.geometry.theta_deg" step="1" min="5" max="60" />
            </div>
          </div>

          <h4 class="section-subtitle">2. Datos Operacionales y Resultados de Muestreo</h4>
          <div class="geometry-grid">
            <div class="form-group">
              <label>Ciclones Operando:</label>
              <input type="number" v-model.number="calibForm.num_cyclones_operating" step="1" min="1" />
            </div>
            <div class="form-group">
              <label>Presión en Manifold (kPa):</label>
              <input type="number" v-model.number="calibForm.pressure_kpa" step="5" min="10" />
            </div>
            <div class="form-group">
              <label>Sólidos Totales (t/h):</label>
              <input type="number" v-model.number="calibForm.feed_solids_tph" step="10" min="1" />
            </div>
            <div class="form-group">
              <label>% Sólidos Alim. (Cp):</label>
              <input type="number" v-model.number="calibForm.feed_cp" step="0.5" min="5" max="75" />
            </div>
            <div class="form-group">
              <label>Corte d50c Medido (µm):</label>
              <input type="number" v-model.number="calibForm.d50c_microns" step="1" min="10" />
            </div>
            <div class="form-group">
              <label>Recuperación Agua Rw (%):</label>
              <input type="number" v-model.number="calibForm.water_recovery_underflow_pct" step="0.5" min="5" max="60" />
            </div>
            <div class="form-group">
              <label>% Sólidos Underflow (Cp):</label>
              <input type="number" v-model.number="calibForm.underflow_cp" step="0.5" min="40" max="88" />
            </div>
            <div class="form-group">
              <label>Agudeza m (Lynch):</label>
              <input type="number" v-model.number="calibForm.sharpness_m" step="0.1" min="1" max="5" />
            </div>
          </div>

          <div class="table-actions">
            <button class="btn btn-primary" @click="executeCycloneCalibration" :disabled="isLoading">
              📐 Calibrar Parámetros de Nageswararao
            </button>
          </div>
        </section>

        <!-- RESULTADOS DE CALIBRACIÓN -->
        <section v-if="calibResult" class="card results-card">
          <div class="card-header">
            <h3>🎯 Constantes Calibradas de Nageswararao (JKMRC)</h3>
            <button class="btn btn-accent btn-sm" @click="transferCalibrationToSimulation">
              ➡️ Transferir a Simulación
            </button>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card highlight">
              <span class="kpi-label">Constante de Corte (KD0)</span>
              <span class="kpi-value">{{ formatScientific(calibResult.kd0) }}</span>
              <span class="kpi-desc">Factor de escala de d50c</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Capacidad (KQ0)</span>
              <span class="kpi-value">{{ calibResult.kq0.toFixed(2) }}</span>
              <span class="kpi-desc">Relación Q vs P</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Agua a Under (KW0)</span>
              <span class="kpi-value">{{ calibResult.kw0.toFixed(3) }}</span>
              <span class="kpi-desc">Factor de arrastre hídrico</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Descarga Under (KS0)</span>
              <span class="kpi-value">{{ calibResult.ks0.toFixed(3) }}</span>
              <span class="kpi-desc">Factor empaque de sólidos</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Parámetro Reológico (λ)</span>
              <span class="kpi-value">{{ calibResult.lambda_param.toFixed(3) }}</span>
              <span class="kpi-desc">Efecto finos y viscosidad</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Caudal por Ciclón</span>
              <span class="kpi-value">{{ calibResult.q_per_cyclone_m3h }} <small>m³/h</small></span>
              <span class="kpi-desc">Por unidad individual</span>
            </div>
          </div>

          <!-- DIAGNÓSTICO DE ROPING -->
          <div :class="['roping-status-banner', calibResult.roping_risk ? 'danger' : 'safe']">
            <div class="status-icon">{{ calibResult.roping_risk ? '🚨' : '🟢' }}</div>
            <div>
              <strong>Diagnóstico de Régimen de Descarga (Apex):</strong>
              <p>{{ calibResult.roping_message }}</p>
              <small>Concentración volumétrica en Underflow: <strong>{{ calibResult.underflow_cv_pct }}% Cv</strong> (Límite crítico: 56% - 58%)</small>
            </div>
          </div>

          <div class="model-reference-card">
            <h4>Ecuaciones Calibradas para este Circuito</h4>
            <div class="equations-preview">
              <p>• <strong>d50c/Dc</strong> = {{ formatScientific(calibResult.kd0) }} · (Di/Dc)⁰·⁴⁵ · (Do/Dc)⁰·⁶⁸ · (Du/Dc)⁻¹·⁶⁰ · (Lc/Dc)⁰·²⁰ · θ⁻⁰·¹⁵ · (P/ρgDc)⁻⁰·²² · λ⁰·⁹³</p>
              <p>• <strong>Q/(Dc²√P/ρ)</strong> = {{ calibResult.kq0.toFixed(2) }} · (Di/Dc)⁰·⁴⁵ · (Do/Dc)⁰·⁸⁵ · (Lc/Dc)⁰·²⁰ · θ⁻⁰·¹⁰ · λ⁰·¹⁰</p>
              <p>• <strong>Rw</strong> = {{ calibResult.kw0.toFixed(3) }} · (Do/Dc)⁻¹·¹⁹ · (Du/Dc)²·⁴⁰ · (Lc/Dc)⁰·²² · θ⁻⁰·²⁴ · (P/ρgDc)⁻⁰·⁵³ · λ⁰·²⁷</p>
              <p>• <strong>Cvu</strong> = {{ calibResult.ks0.toFixed(3) }} · (Di/Dc)⁻⁰·⁵⁰ · (Do/Dc)⁻⁰·⁵⁰ · (Du/Dc)⁰·⁷⁵ · θ⁻⁰·¹⁵ · Cvf⁰·⁶⁵</p>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- =================================================================== -->
    <!-- SUBMÓDULO 3: SIMULACIÓN PREDICTIVA & ROPING CHECK -->
    <!-- =================================================================== -->
    <div v-show="activeTab === 'simulate'" class="tab-pane">
      <div class="pane-grid">
        <!-- FORMULARIO DE SIMULACIÓN -->
        <section class="card input-card">
          <div class="card-header">
            <h3>🌪️ Nuevas Condiciones de Operación y Geometría</h3>
            <button class="btn btn-secondary btn-sm" @click="syncSimPsdWithSurvey">
              📋 Copiar Granulometría de Entrada
            </button>
          </div>

          <h4 class="section-subtitle">1. Batería y Alimentación a Evaluar</h4>
          <div class="geometry-grid">
            <div class="form-group">
              <label>Ciclones en Operación:</label>
              <input type="number" v-model.number="simForm.num_cyclones_operating" step="1" min="1" />
            </div>
            <div class="form-group">
              <label>Nuevo Flujo Sólidos (t/h):</label>
              <input type="number" v-model.number="simForm.feed_solids_tph" step="25" min="10" />
            </div>
            <div class="form-group">
              <label>% Sólidos Alim. (Cp):</label>
              <input type="number" v-model.number="simForm.feed_cp" step="1" min="10" max="75" />
            </div>
            <div class="form-group">
              <label>G.E. Sólidos (t/m³):</label>
              <input type="number" v-model.number="simForm.solids_density" step="0.05" min="1.5" max="5.0" />
            </div>
            <div class="form-group">
              <label>Apex Du Modificado (mm):</label>
              <input type="number" v-model.number="simForm.geometry.du_mm" step="5" min="20" />
            </div>
            <div class="form-group">
              <label>Vortex Do Modificado (mm):</label>
              <input type="number" v-model.number="simForm.geometry.do_mm" step="5" min="50" />
            </div>
          </div>

          <h4 class="section-subtitle">2. Parámetros Calibrados Activos</h4>
          <div class="geometry-grid">
            <div class="form-group">
              <label>KD0 (Corte):</label>
              <input type="number" v-model.number="simForm.kd0" step="any" />
            </div>
            <div class="form-group">
              <label>KQ0 (Capacidad):</label>
              <input type="number" v-model.number="simForm.kq0" step="1" />
            </div>
            <div class="form-group">
              <label>KW0 (Agua):</label>
              <input type="number" v-model.number="simForm.kw0" step="0.01" />
            </div>
            <div class="form-group">
              <label>KS0 (Descarga):</label>
              <input type="number" v-model.number="simForm.ks0" step="0.01" />
            </div>
            <div class="form-group">
              <label>Agudeza m:</label>
              <input type="number" v-model.number="simForm.sharpness_m" step="0.1" />
            </div>
          </div>

          <div class="table-actions">
            <button class="btn btn-primary" @click="executeCycloneSimulation" :disabled="isLoading">
              🚀 Ejecutar Simulación Predictiva
            </button>
          </div>
        </section>

        <!-- RESULTADOS DE SIMULACIÓN -->
        <section v-if="simResult" class="card results-card">
          <div class="card-header">
            <h3>📊 Predicción de Comportamiento y Granulometría</h3>
            <span :class="['alert-tag', simResult.is_roping ? 'danger' : 'safe']">
              {{ simResult.roping_severity }}
            </span>
          </div>

          <!-- KPIS PREDICHOS -->
          <div class="kpi-grid">
            <div class="kpi-card highlight">
              <span class="kpi-label">Presión Requerida</span>
              <span class="kpi-value">{{ simResult.predicted_pressure_kpa }} <small>kPa</small></span>
              <span class="kpi-desc">En manifold de alimentación</span>
            </div>
            <div class="kpi-card highlight">
              <span class="kpi-label">Corte Predicho (d50c)</span>
              <span class="kpi-value">{{ simResult.d50c_microns }} <small>µm</small></span>
              <span class="kpi-desc">Tamaño de corte de operación</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">P80 Rebose (Over)</span>
              <span class="kpi-value">{{ simResult.overflow.p80_microns }} <small>µm</small></span>
              <span class="kpi-desc">Producto hacia flotación</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">P80 Descarga (Under)</span>
              <span class="kpi-value">{{ simResult.underflow.p80_microns }} <small>µm</small></span>
              <span class="kpi-desc">Carga circulante a molienda</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">% Sólidos Underflow</span>
              <span class="kpi-value">{{ simResult.underflow_cp_pct }}% <small>Cp</small></span>
              <span class="kpi-desc">{{ simResult.underflow_cv_pct }}% en volumen (Cv)</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Caudal por Ciclón</span>
              <span class="kpi-value">{{ simResult.q_per_cyclone_m3h }} <small>m³/h</small></span>
              <span class="kpi-desc">Total batería: {{ simResult.total_slurry_flow_m3h }} m³/h</span>
            </div>
          </div>

          <!-- ALERTA DE ROPING SI APLICA -->
          <div v-if="simResult.is_roping" class="roping-status-banner danger">
            <div class="status-icon">⚠️</div>
            <div>
              <strong>¡ALERTA DE ACODALAMIENTO (ROPING)!</strong>
              <p>La descarga supera el 56% de concentración volumétrica de sólidos ({{ simResult.underflow_cv_pct }}% Cv). Se recomienda agrandar la tobera/apex (Du) o aumentar la cantidad de ciclones operando para restituir el régimen en abanico (spray).</p>
            </div>
          </div>

          <!-- TABLA DE BALANCE PREDICHO -->
          <div class="streams-summary">
            <h4>Balance Másico Predicho por Corriente</h4>
            <table class="data-table compact">
              <thead>
                <tr>
                  <th>Corriente</th>
                  <th>Sólidos (t/h)</th>
                  <th>Agua (t/h)</th>
                  <th>Pulpa (t/h)</th>
                  <th>Caudal (m³/h)</th>
                  <th>% Sólidos (Cp)</th>
                  <th>P80 (µm)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Alimentación</strong></td>
                  <td>{{ simResult.feed.solids_tph }}</td>
                  <td>{{ simResult.feed.water_tph }}</td>
                  <td>{{ simResult.feed.pulp_tph }}</td>
                  <td>{{ simResult.feed.pulp_flow_m3h }}</td>
                  <td>{{ simResult.feed.solids_cp }}%</td>
                  <td>{{ simResult.feed.p80_microns }}</td>
                </tr>
                <tr>
                  <td><strong>Rebose (Over)</strong></td>
                  <td>{{ simResult.overflow.solids_tph }}</td>
                  <td>{{ simResult.overflow.water_tph }}</td>
                  <td>{{ simResult.overflow.pulp_tph }}</td>
                  <td>{{ simResult.overflow.pulp_flow_m3h }}</td>
                  <td>{{ simResult.overflow.solids_cp }}%</td>
                  <td>{{ simResult.overflow.p80_microns }}</td>
                </tr>
                <tr>
                  <td><strong>Descarga (Under)</strong></td>
                  <td>{{ simResult.underflow.solids_tph }}</td>
                  <td>{{ simResult.underflow.water_tph }}</td>
                  <td>{{ simResult.underflow.pulp_tph }}</td>
                  <td>{{ simResult.underflow.pulp_flow_m3h }}</td>
                  <td>{{ simResult.underflow.solids_cp }}%</td>
                  <td>{{ simResult.underflow.p80_microns }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- TABLA DE DISTRIBUCIÓN GRANULOMÉTRICA PREDICHA -->
          <div class="streams-summary">
            <h4>Distribución Granulométrica Predicha (% Pasante)</h4>
            <div class="table-container-sieves-small">
              <table class="data-table compact">
                <thead>
                  <tr>
                    <th>Malla (µm)</th>
                    <th>Alimentación (%)</th>
                    <th>Rebose Predicho (%)</th>
                    <th>Descarga Predicha (%)</th>
                    <th>Partición Real (%)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, sIdx) in simResult.predicted_sieves" :key="sIdx">
                    <td>{{ item.size_microns }}</td>
                    <td>{{ item.feed_passing }}%</td>
                    <td class="highlight-val">{{ item.overflow_passing }}%</td>
                    <td>{{ item.underflow_passing }}%</td>
                    <td>{{ item.partition_actual }}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { api } from '../services/api.js';

// Estado de pestañas
const activeTab = ref('balance');
const isLoading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

// -----------------------------------------------------------------------------
// SUBMÓDULO 1: ESTADO DEL BALANCE GRANULOMÉTRICO
// -----------------------------------------------------------------------------
const balanceForm = reactive({
  feed_solids_tph: 550.0,
  feed_cp: 56.0,
  overflow_cp: 34.0,
  underflow_cp: 74.5,
  solids_density: 2.75,
  liquid_density: 1.0,
  sieves: [
    { size_microns: 1180, feed_passing: 99.8, overflow_passing: 100.0, underflow_passing: 99.6 },
    { size_microns: 850,  feed_passing: 98.5, overflow_passing: 100.0, underflow_passing: 97.2 },
    { size_microns: 600,  feed_passing: 95.2, overflow_passing: 100.0, underflow_passing: 90.8 },
    { size_microns: 425,  feed_passing: 88.4, overflow_passing: 99.8,  underflow_passing: 78.2 },
    { size_microns: 300,  feed_passing: 79.1, overflow_passing: 98.9,  underflow_passing: 61.4 },
    { size_microns: 212,  feed_passing: 68.3, overflow_passing: 96.5,  underflow_passing: 43.1 },
    { size_microns: 150,  feed_passing: 57.2, overflow_passing: 91.2,  underflow_passing: 26.8 },
    { size_microns: 106,  feed_passing: 46.5, overflow_passing: 82.4,  underflow_passing: 14.5 },
    { size_microns: 75,   feed_passing: 37.1, overflow_passing: 70.8,  underflow_passing: 7.2  },
    { size_microns: 53,   feed_passing: 29.4, overflow_passing: 59.2,  underflow_passing: 2.8  },
    { size_microns: 38,   feed_passing: 22.8, overflow_passing: 48.6,  underflow_passing: 1.1  }
  ]
});

const balanceResult = ref(null);

function addSieveRow() {
  const lastSize = balanceForm.sieves.length > 0 
    ? balanceForm.sieves[balanceForm.sieves.length - 1].size_microns * 0.7 
    : 100;
  balanceForm.sieves.push({
    size_microns: Math.round(lastSize),
    feed_passing: 10.0,
    overflow_passing: 20.0,
    underflow_passing: 0.5
  });
}

function removeSieveRow(idx) {
  if (balanceForm.sieves.length > 3) {
    balanceForm.sieves.splice(idx, 1);
  }
}

function loadTypicalSurveyPreset() {
  balanceForm.feed_solids_tph = 550.0;
  balanceForm.feed_cp = 56.0;
  balanceForm.overflow_cp = 34.0;
  balanceForm.underflow_cp = 74.5;
  balanceForm.solids_density = 2.75;
  balanceForm.sieves = [
    { size_microns: 1180, feed_passing: 99.8, overflow_passing: 100.0, underflow_passing: 99.6 },
    { size_microns: 850,  feed_passing: 98.5, overflow_passing: 100.0, underflow_passing: 97.2 },
    { size_microns: 600,  feed_passing: 95.2, overflow_passing: 100.0, underflow_passing: 90.8 },
    { size_microns: 425,  feed_passing: 88.4, overflow_passing: 99.8,  underflow_passing: 78.2 },
    { size_microns: 300,  feed_passing: 79.1, overflow_passing: 98.9,  underflow_passing: 61.4 },
    { size_microns: 212,  feed_passing: 68.3, overflow_passing: 96.5,  underflow_passing: 43.1 },
    { size_microns: 150,  feed_passing: 57.2, overflow_passing: 91.2,  underflow_passing: 26.8 },
    { size_microns: 106,  feed_passing: 46.5, overflow_passing: 82.4,  underflow_passing: 14.5 },
    { size_microns: 75,   feed_passing: 37.1, overflow_passing: 70.8,  underflow_passing: 7.2  },
    { size_microns: 53,   feed_passing: 29.4, overflow_passing: 59.2,  underflow_passing: 2.8  },
    { size_microns: 38,   feed_passing: 22.8, overflow_passing: 48.6,  underflow_passing: 1.1  }
  ];
  successMessage.value = 'Muestreo de planta cargado correctamente.';
}

async function executeCycloneBalance() {
  errorMessage.value = '';
  successMessage.value = '';
  isLoading.value = true;
  try {
    const res = await api.reconcileCycloneBalance(balanceForm);
    balanceResult.value = res;
    successMessage.value = `Balance resuelto exitosamente. Corte d50c = ${res.d50c_microns} µm (m = ${res.sharpness_m}).`;
  } catch (err) {
    errorMessage.value = err.message || 'Error calculando balance de hidrociclón.';
  } finally {
    isLoading.value = false;
  }
}

function transferBalanceToCalibration() {
  if (!balanceResult.value) return;
  calibForm.feed_solids_tph = balanceResult.value.feed.solids_tph;
  calibForm.feed_cp = balanceResult.value.feed.solids_cp;
  calibForm.underflow_cp = balanceResult.value.underflow.solids_cp;
  calibForm.solids_density = balanceForm.solids_density;
  calibForm.d50c_microns = balanceResult.value.d50c_microns;
  calibForm.water_recovery_underflow_pct = balanceResult.value.water_recovery_underflow_pct;
  calibForm.sharpness_m = balanceResult.value.sharpness_m;
  
  // Buscar pasante 38 µm
  const f38 = balanceResult.value.reconciled_sieves.find(s => s.size_microns <= 45);
  if (f38) {
    calibForm.feed_fines_pct_minus_38um = f38.reconciled_feed_passing;
  }
  
  activeTab.value = 'calibrate';
  successMessage.value = 'Datos de balance transferidos al Submódulo 2 (Calibración).';
}

// -----------------------------------------------------------------------------
// SUBMÓDULO 2: ESTADO DE LA CALIBRACIÓN NAGESWARARAO
// -----------------------------------------------------------------------------
const calibForm = reactive({
  geometry: {
    dc_mm: 500,
    di_mm: 125,
    do_mm: 175,
    du_mm: 100,
    lc_mm: 1200,
    theta_deg: 20
  },
  num_cyclones_operating: 4,
  pressure_kpa: 110.0,
  feed_solids_tph: 550.0,
  feed_cp: 56.0,
  underflow_cp: 74.5,
  solids_density: 2.75,
  liquid_density: 1.0,
  d50c_microns: 145.0,
  water_recovery_underflow_pct: 26.5,
  sharpness_m: 2.45,
  feed_fines_pct_minus_38um: 22.8
});

const calibResult = ref(null);

function loadStandardGeometryPreset() {
  calibForm.geometry.dc_mm = 500;
  calibForm.geometry.di_mm = 125;
  calibForm.geometry.do_mm = 175;
  calibForm.geometry.du_mm = 100;
  calibForm.geometry.lc_mm = 1200;
  calibForm.geometry.theta_deg = 20;
  calibForm.pressure_kpa = 110.0;
  calibForm.num_cyclones_operating = 4;
}

async function executeCycloneCalibration() {
  errorMessage.value = '';
  successMessage.value = '';
  isLoading.value = true;
  try {
    const res = await api.calibrateCyclone(calibForm);
    calibResult.value = res;
    successMessage.value = 'Constantes KD0, KQ0, KW0, KS0 calibradas exitosamente.';
  } catch (err) {
    errorMessage.value = err.message || 'Error calibrando modelo de Nageswararao.';
  } finally {
    isLoading.value = false;
  }
}

function transferCalibrationToSimulation() {
  if (!calibResult.value) return;
  simForm.geometry = { ...calibForm.geometry };
  simForm.num_cyclones_operating = calibForm.num_cyclones_operating;
  simForm.kd0 = calibResult.value.kd0;
  simForm.kq0 = calibResult.value.kq0;
  simForm.kw0 = calibResult.value.kw0;
  simForm.ks0 = calibResult.value.ks0;
  simForm.sharpness_m = calibResult.value.sharpness_m;
  simForm.feed_solids_tph = calibForm.feed_solids_tph;
  simForm.feed_cp = calibForm.feed_cp;
  simForm.solids_density = calibForm.solids_density;
  
  syncSimPsdWithSurvey();
  activeTab.value = 'simulate';
  successMessage.value = 'Constantes transferidas al Submódulo 3 (Simulación).';
}

// -----------------------------------------------------------------------------
// SUBMÓDULO 3: ESTADO DE LA SIMULACIÓN Y ROPING
// -----------------------------------------------------------------------------
const simForm = reactive({
  geometry: {
    dc_mm: 500,
    di_mm: 125,
    do_mm: 175,
    du_mm: 100,
    lc_mm: 1200,
    theta_deg: 20
  },
  num_cyclones_operating: 4,
  kd0: 0.00045,
  kq0: 480.0,
  kw0: 9.8,
  ks0: 0.052,
  sharpness_m: 2.45,
  feed_solids_tph: 600.0,
  feed_cp: 55.0,
  solids_density: 2.75,
  liquid_density: 1.0,
  feed_psd: []
});

const simResult = ref(null);

function syncSimPsdWithSurvey() {
  if (balanceResult.value) {
    simForm.feed_psd = balanceResult.value.reconciled_sieves.map(s => ({
      size_microns: s.size_microns,
      passing_pct: s.reconciled_feed_passing
    }));
  } else {
    simForm.feed_psd = balanceForm.sieves.map(s => ({
      size_microns: s.size_microns,
      passing_pct: s.feed_passing
    }));
  }
}

async function executeCycloneSimulation() {
  errorMessage.value = '';
  successMessage.value = '';
  if (!simForm.feed_psd || simForm.feed_psd.length === 0) {
    syncSimPsdWithSurvey();
  }
  isLoading.value = true;
  try {
    const res = await api.simulateCyclone(simForm);
    simResult.value = res;
    successMessage.value = `Simulación completada. Presión: ${res.predicted_pressure_kpa} kPa, d50c: ${res.d50c_microns} µm.`;
  } catch (err) {
    errorMessage.value = err.message || 'Error en simulación predictiva.';
  } finally {
    isLoading.value = false;
  }
}

// -----------------------------------------------------------------------------
// UTILIDADES GRÁFICAS (SVG TROMP PLOT)
// -----------------------------------------------------------------------------
function sizeToXCoord(microns) {
  // Escala logarítmica entre 10 µm y 2000 µm -> X entre 50 y 480 px
  const minLog = Math.log10(15);
  const maxLog = Math.log10(1500);
  const curLog = Math.log10(Math.max(15, Math.min(1500, microns)));
  const frac = (curLog - minLog) / (maxLog - minLog);
  return 50 + frac * 430;
}

function getTrompCoords(sieves, key) {
  if (!sieves) return [];
  return sieves.map(s => ({
    x: sizeToXCoord(s.size_microns),
    y: 210 - (s[key] * 1.9)
  }));
}

function generateTrompPoints(sieves, key) {
  const coords = getTrompCoords(sieves, key);
  return coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
}

function formatScientific(val) {
  if (val === undefined || val === null) return '0.0';
  if (Math.abs(val) < 0.001 || Math.abs(val) > 10000) {
    return val.toExponential(4);
  }
  return val.toFixed(5);
}
</script>

<style scoped>
.cyclone-module-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  color: #1e293b;
}

.cyclone-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  background: white;
  padding: 18px 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.header-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cyclone-icon {
  font-size: 2.2rem;
}

.header-info h2 {
  margin: 0;
  font-size: 1.4rem;
  color: #0f172a;
}

.subtitle {
  margin: 4px 0 0 0;
  color: #64748b;
  font-size: 0.88rem;
}

.module-tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.tab-btn.active {
  background: #0284c7;
  color: white;
  border-color: #0284c7;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  font-size: 0.8rem;
}

.tab-btn.active .tab-badge {
  background: rgba(255, 255, 255, 0.25);
  color: white;
}

.alert-banner {
  padding: 12px 18px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.92rem;
}

.alert-banner.error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.alert-banner.success {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.close-alert {
  background: transparent;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: inherit;
}

.pane-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 12px;
}

.card-header h3 {
  margin: 0;
  font-size: 1.15rem;
  color: #0f172a;
}

.section-subtitle {
  margin: 16px 0 10px 0;
  font-size: 0.95rem;
  color: #475569;
  border-bottom: 1px dashed #e2e8f0;
  padding-bottom: 4px;
}

.operating-conditions-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
  background: #f8fafc;
  padding: 14px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.geometry-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #475569;
}

.form-group input {
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.form-group input:focus {
  border-color: #0284c7;
}

.table-container-sieves {
  max-height: 380px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.table-container-sieves-small {
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
  text-align: left;
}

.data-table th {
  background: #f1f5f9;
  padding: 10px 12px;
  font-weight: 600;
  color: #334155;
  position: sticky;
  top: 0;
  z-index: 2;
}

.data-table td {
  padding: 8px 12px;
  border-top: 1px solid #f1f5f9;
}

.data-table.compact th,
.data-table.compact td {
  padding: 6px 10px;
  font-size: 0.84rem;
}

.cell-input {
  width: 100%;
  padding: 5px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 0.88rem;
}

.cell-input:focus {
  border-color: #0284c7;
}

.action-cell {
  text-align: center;
  width: 50px;
}

.btn-icon {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1rem;
}

.table-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
}

.btn {
  padding: 9px 18px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.82rem;
}

.btn-primary {
  background: #0284c7;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0369a1;
}

.btn-secondary {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #cbd5e1;
}

.btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
}

.btn-outline {
  background: transparent;
  color: #0284c7;
  border: 1px solid #0284c7;
}

.btn-outline:hover:not(:disabled) {
  background: #e0f2fe;
}

.btn-accent {
  background: #10b981;
  color: white;
}

.btn-accent:hover:not(:disabled) {
  background: #059669;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.kpi-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
}

.kpi-card.highlight {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.kpi-label {
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 600;
}

.kpi-value {
  font-size: 1.35rem;
  font-weight: 700;
  color: #0f172a;
  margin: 4px 0;
}

.kpi-desc {
  font-size: 0.75rem;
  color: #94a3b8;
}

.chart-wrapper {
  margin: 20px 0;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
}

.chart-wrapper h4 {
  margin: 0 0 12px 0;
  font-size: 0.95rem;
  color: #334155;
}

.svg-chart-container {
  width: 100%;
  height: 240px;
}

.svg-chart {
  width: 100%;
  height: 100%;
}

.chart-axis-label {
  font-size: 11px;
  fill: #64748b;
}

.chart-tag {
  font-size: 11px;
  font-weight: 600;
}

.chart-tag.bypass {
  fill: #d97706;
}

.chart-tag.d50c {
  fill: #dc2626;
}

.chart-legend {
  display: flex;
  gap: 18px;
  margin-top: 10px;
  font-size: 0.82rem;
  color: #475569;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot.blue { background: #0284c7; }
.dot.green { background: #10b981; }
.dot.orange { background: #f59e0b; }
.dot.red { background: #ef4444; }

.streams-summary {
  margin-top: 20px;
}

.streams-summary h4 {
  margin: 0 0 10px 0;
  font-size: 0.95rem;
  color: #334155;
}

.roping-status-banner {
  display: flex;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 8px;
  margin: 16px 0;
  align-items: center;
}

.roping-status-banner.safe {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
}

.roping-status-banner.danger {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.status-icon {
  font-size: 2rem;
}

.roping-status-banner p {
  margin: 4px 0 2px 0;
  font-size: 0.88rem;
}

.model-reference-card {
  margin-top: 20px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
}

.model-reference-card h4 {
  margin: 0 0 10px 0;
  font-size: 0.92rem;
  color: #334155;
}

.equations-preview p {
  margin: 6px 0;
  font-family: monospace;
  font-size: 0.84rem;
  color: #0f172a;
}

.alert-tag {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.82rem;
  font-weight: 700;
}

.alert-tag.safe {
  background: #dcfce7;
  color: #166534;
}

.alert-tag.danger {
  background: #fee2e2;
  color: #991b1b;
}

.highlight-val {
  font-weight: 700;
  color: #0284c7;
}
</style>
