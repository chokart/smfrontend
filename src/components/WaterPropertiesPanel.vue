<template>
  <div v-if="modelValue" class="properties-panel">
    <div class="panel-header">
      <h3>Propiedades del {{ isNode ? 'Nodo' : 'Flujo' }} (Agua)</h3>
      <button @click="$emit('update:modelValue', null)" class="close-button">&times;</button>
    </div>

    <div class="panel-content">
      <!-- CONFIGURACIÓN DE NODO -->
      <div v-if="isNode">
        <div class="form-group">
          <label>Nombre:</label>
          <input v-model="localData.label" type="text" @input="update" />
        </div>
        <div class="form-group">
          <label>Tipo:</label>
          <select v-model="localData.node_type" @change="update">
            <option value="initial">Alimento</option>
            <option value="process">Proceso (Cajón)</option>
            <option value="product">Producto</option>
            <option value="water_source">💧 Fuente de Agua (Tanque / Suministro)</option>
          </select>
        </div>
        <div class="section-title">Puntos de Conexión del Nodo</div>
        <div class="form-group" v-if="localData.node_type !== 'initial' && localData.node_type !== 'water_source'">
          <label>Punto de Ingreso (i):</label>
          <select v-model="localData.targetPosition" @change="update">
            <option value="left">Izquierda (Left) ⬅️</option>
            <option value="top">Arriba (Top) ⬆️</option>
            <option value="right">Derecha (Right) ➡️</option>
            <option value="bottom">Abajo (Bottom) ⬇️</option>
          </select>
        </div>
        <div class="form-group" v-if="localData.node_type === 'initial' || localData.node_type === 'process' || localData.node_type === 'water_source'">
          <label>Punto de Salida (s):</label>
          <select v-model="localData.sourcePosition" @change="update">
            <option value="right">Derecha (Right) ➡️</option>
            <option value="bottom">Abajo (Bottom) ⬇️</option>
            <option value="left">Izquierda (Left) ⬅️</option>
            <option value="top">Arriba (Top) ⬆️</option>
          </select>
        </div>
      </div>

      <!-- CONFIGURACIÓN DE FLUJO (AGUA O PULPA) -->
      <div v-else>
        <!-- SELECTOR DE TIPO DE FLUJO: AGUA PURA O PULPA MINERAL -->
        <div class="checkbox-group highlight-water-checkbox">
          <input id="chk-is-water-only" v-model="localData.is_water_only" type="checkbox" @change="onWaterOnlyChange" />
          <label for="chk-is-water-only"><strong>💧 Corriente de Solo Agua</strong> (Dilución / Agua Fresca)</label>
        </div>

        <!-- CASO 1: FLUJO DE SOLO AGUA PURA -->
        <div v-if="localData.is_water_only" class="water-only-container">
          <div class="unmeasured-badge water-badge-info">
            ℹ️ <strong>Agua Pura (0% Sólidos):</strong> Esta tubería transporta agua limpia/fresca para dilución o lavado en cajones.
          </div>

          <div class="checkbox-group highlight-checkbox">
            <input id="chk-water-only-not-measured" v-model="localData.not_measured" type="checkbox" @change="onWaterNotMeasuredChange" />
            <label for="chk-water-only-not-measured"><strong>🚫 Flujo No Medido</strong> (deducir agua por balance)</label>
          </div>

          <div v-if="localData.not_measured" class="unmeasured-badge">
            ℹ️ <strong>Sin medidor:</strong> El reconciliador calculará exactamente cuánta agua de dilución se requiere agregar.
          </div>

          <div class="form-group" :class="{ 'is-disabled-group': localData.not_measured }">
            <label>Caudal de Agua (tph):</label>
            <input 
              v-model.number="localData.tonelaje_agua" 
              type="number" 
              step="0.1" 
              :disabled="localData.not_measured"
              :placeholder="localData.not_measured ? 'Deducido por balance' : 'tph'"
              @input="update" 
            />
          </div>

          <div class="form-group" :class="{ 'is-disabled-group': localData.not_measured }">
            <div class="label-with-presets">
              <label>Error Agua:</label>
              <div v-if="!localData.not_measured && localData.tonelaje_agua > 0" class="preset-buttons">
                <span class="preset-label">%:</span>
                <button type="button" class="preset-btn" @click="applyRelError('tonelaje_agua', 0.01)" title="Asignar 1% de error">1%</button>
                <button type="button" class="preset-btn" @click="applyRelError('tonelaje_agua', 0.02)" title="Asignar 2% de error">2%</button>
                <button type="button" class="preset-btn" @click="applyRelError('tonelaje_agua', 0.05)" title="Asignar 5% de error">5%</button>
              </div>
            </div>
            <input 
              v-model.number="localData.tonelaje_agua_error" 
              type="number" 
              step="0.1" 
              :disabled="localData.not_measured"
              :placeholder="localData.not_measured ? 'N/A' : '± tph'"
              @input="update" 
            />
            <small v-if="!localData.not_measured && localData.tonelaje_agua > 0 && localData.tonelaje_agua_error > 0" class="rel-hint">
              Equivale a: <strong>±{{ ((localData.tonelaje_agua_error / localData.tonelaje_agua) * 100).toFixed(1) }}%</strong> relativo
            </small>
          </div>

          <div v-if="!localData.not_measured" class="checkbox-group">
            <input v-model="localData.tonelaje_agua_fixed" type="checkbox" @change="update" />
            <label>No ajustar caudal (Fijo)</label>
          </div>

          <!-- RESULTADOS CALCULADOS TRAS RECONCILIACIÓN PARA AGUA PURA -->
          <div v-if="localData.corrected_data" class="results-section">
            <div class="section-title">Resultados Reconciliados</div>
            <div class="result-item highlight" style="color: #0284c7;">
              <span>Agua Pura Reconciliada:</span> 
              <strong>
                {{ (localData.corrected_data.tonelaje_agua_calculado ?? 0).toFixed(2) }} tph
                <small v-if="localData.corrected_data.tonelaje_agua_error != null">± {{ localData.corrected_data.tonelaje_agua_error.toFixed(2) }}</small>
              </strong>
            </div>
          </div>
        </div>

        <!-- CASO 2: FLUJO ESTÁNDAR DE PULPA MINERAL -->
        <div v-else>
          <div class="section-title">Sólido Seco</div>

          <div class="checkbox-group highlight-checkbox">
            <input id="chk-water-not-measured" v-model="localData.not_measured" type="checkbox" @change="onNotMeasuredChange" />
            <label for="chk-water-not-measured"><strong>🚫 Flujo No Medido</strong> (deducir por balance)</label>
          </div>

          <div v-if="localData.not_measured" class="unmeasured-badge">
            ℹ️ <strong>Flujo sin medidor:</strong> Se deducirá automáticamente por conservación de masa de sólidos y agua en los nodos.
          </div>

          <div class="form-group" :class="{ 'is-disabled-group': localData.not_measured }">
            <label>Tonelaje Sólido Seco (tph):</label>
            <input 
              v-model.number="localData.tonelaje_solido" 
              type="number" 
              step="0.1" 
              :disabled="localData.not_measured"
              :placeholder="localData.not_measured ? 'Deducido por balance' : 'tph'"
              @input="update" 
            />
          </div>

          <div class="form-group" :class="{ 'is-disabled-group': localData.not_measured }">
            <div class="label-with-presets">
              <label>Error Sólido:</label>
              <div v-if="!localData.not_measured && localData.tonelaje_solido > 0" class="preset-buttons">
                <span class="preset-label">%:</span>
                <button type="button" class="preset-btn" @click="applyRelError('tonelaje_solido', 0.01)" title="Asignar 1% de error relativo">1%</button>
                <button type="button" class="preset-btn" @click="applyRelError('tonelaje_solido', 0.02)" title="Asignar 2% de error relativo">2%</button>
                <button type="button" class="preset-btn" @click="applyRelError('tonelaje_solido', 0.05)" title="Asignar 5% de error relativo">5%</button>
              </div>
            </div>
            <input 
              v-model.number="localData.tonelaje_solido_error" 
              type="number" 
              step="0.1" 
              :disabled="localData.not_measured"
              :placeholder="localData.not_measured ? 'N/A' : '± tph'"
              @input="update" 
            />
            <small v-if="!localData.not_measured && localData.tonelaje_solido > 0 && localData.tonelaje_solido_error > 0" class="rel-hint">
              Equivale a: <strong>±{{ ((localData.tonelaje_solido_error / localData.tonelaje_solido) * 100).toFixed(1) }}%</strong> relativo
            </small>
          </div>

          <div v-if="!localData.not_measured" class="checkbox-group">
            <input v-model="localData.tonelaje_solido_fixed" type="checkbox" @change="update" />
            <label>No ajustar (Fijo)</label>
          </div>

          <div class="section-title">% Sólidos (Cp)</div>
          <div class="form-group">
            <label>Porcentaje Sólidos (%):</label>
            <input v-model.number="localData.porcentaje_solidos" type="number" step="0.1" @input="update" />
          </div>
          <div class="form-group">
            <div class="label-with-presets">
              <label>Error % (Desv. Est.):</label>
              <div v-if="localData.porcentaje_solidos > 0" class="preset-buttons">
                <span class="preset-label">%:</span>
                <button type="button" class="preset-btn" @click="applyRelErrorCp(0.01)" title="Asignar 1% relativo de Cp">1%</button>
                <button type="button" class="preset-btn" @click="applyRelErrorCp(0.02)" title="Asignar 2% relativo de Cp">2%</button>
                <button type="button" class="preset-btn" @click="applyRelErrorCp(0.05)" title="Asignar 5% relativo de Cp">5%</button>
              </div>
            </div>
            <input v-model.number="localData.porcentaje_solidos_error" type="number" step="0.1" @input="update" />
            <small v-if="localData.porcentaje_solidos > 0 && localData.porcentaje_solidos_error > 0" class="rel-hint">
              Equivale a: <strong>±{{ ((localData.porcentaje_solidos_error / localData.porcentaje_solidos) * 100).toFixed(1) }}%</strong> relativo
            </small>
          </div>
          <div class="checkbox-group">
            <input v-model="localData.porcentaje_solidos_fixed" type="checkbox" @change="update" />
            <label>Fijo</label>
          </div>

          <!-- RESULTADOS CALCULADOS TRAS RECONCILIACIÓN -->
          <div v-if="localData.corrected_data" class="results-section">
            <div class="section-title">Resultados Ajustados</div>
            <div class="result-item">
              <span>Sólido Seco:</span> 
              <strong>
                {{ (localData.corrected_data.tonelaje_solido_corregido ?? localData.corrected_data.tonelaje_solido_calculado ?? 0).toFixed(2) }} 
                <small v-if="localData.corrected_data.tonelaje_solido_error != null">± {{ localData.corrected_data.tonelaje_solido_error.toFixed(2) }}</small>
              </strong>
            </div>
            <div class="result-item">
              <span>% Sólidos:</span> 
              <strong>
                {{ (localData.corrected_data.porcentaje_solidos_corregido ?? 0).toFixed(2) }}% 
                <small v-if="localData.corrected_data.porcentaje_solidos_error != null">± {{ localData.corrected_data.porcentaje_solidos_error.toFixed(2) }}</small>
              </strong>
            </div>
            <div class="result-item highlight">
              <span>Pulpa (Calc.):</span> 
              <strong>{{ (localData.corrected_data.tonelaje_pulpa_calculado ?? localData.corrected_data.tonelaje_pulpa_corregido ?? 0).toFixed(2) }} tph</strong>
            </div>
            <div class="result-item highlight">
              <span>Agua (Calc.):</span> 
              <strong>{{ (localData.corrected_data.tonelaje_agua_calculado ?? 0).toFixed(2) }} tph</strong>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-footer-actions">
        <button 
          type="button" 
          class="btn-delete-element"
          @click="$emit('delete', modelValue)"
        >
          🗑️ Eliminar {{ title }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: Object
})

const emit = defineEmits(['update:modelValue', 'delete'])

const isNode = computed(() => props.modelValue && props.modelValue.position)
const title = computed(() => isNode.value ? 'Nodo' : 'Flujo')
const localData = ref({})

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    localData.value = JSON.parse(JSON.stringify(newVal.data || {}))
    if (newVal.position) {
      if (!localData.value.targetPosition) localData.value.targetPosition = newVal.targetPosition || 'left'
      if (!localData.value.sourcePosition) localData.value.sourcePosition = newVal.sourcePosition || 'right'
    }
  }
}, { immediate: true, deep: true })

function onNotMeasuredChange() {
  if (localData.value.not_measured) {
    localData.value.tonelaje_solido_fixed = false
  }
  update()
}

function onWaterNotMeasuredChange() {
  if (localData.value.not_measured) {
    localData.value.tonelaje_agua_fixed = false
  }
  update()
}

function onWaterOnlyChange() {
  if (localData.value.is_water_only) {
    localData.value.tonelaje_solido = 0
    localData.value.tonelaje_solido_fixed = true
    localData.value.porcentaje_solidos = 0
    localData.value.porcentaje_solidos_fixed = true
    if (!localData.value.tonelaje_agua && localData.value.tonelaje_pulpa) {
      localData.value.tonelaje_agua = localData.value.tonelaje_pulpa
    } else if (!localData.value.tonelaje_agua) {
      localData.value.tonelaje_agua = 100.0
    }
  } else {
    if (localData.value.porcentaje_solidos === 0) {
      localData.value.porcentaje_solidos = 30.0
      localData.value.porcentaje_solidos_fixed = false
    }
    if (localData.value.tonelaje_solido === 0) {
      localData.value.tonelaje_solido = 30.0
      localData.value.tonelaje_solido_fixed = false
    }
  }
  update()
}

function applyRelError(field, ratio) {
  const val = Number(localData.value[field] || 0)
  if (val > 0) {
    localData.value[`${field}_error`] = Number((val * ratio).toFixed(2))
    update()
  }
}

function applyRelErrorCp(ratio) {
  const val = Number(localData.value.porcentaje_solidos || 0)
  if (val > 0) {
    localData.value.porcentaje_solidos_error = Number((val * ratio).toFixed(2))
    update()
  }
}

function update() {
  const updatedElement = {
    ...props.modelValue,
    targetPosition: localData.value.targetPosition,
    sourcePosition: localData.value.sourcePosition,
    data: { ...localData.value }
  }
  emit('update:modelValue', updatedElement)
}
</script>

<style scoped>
.properties-panel {
  position: absolute;
  top: 80px;
  right: 20px;
  width: 280px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.15);
  z-index: 100;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
}
.panel-header {
  padding: 15px;
  background: #2196F3;
  color: white;
  border-radius: 8px 8px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.panel-header h3 { margin: 0; font-size: 1.1rem; }
.close-button {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
}
.panel-content {
  padding: 15px;
  overflow-y: auto;
}
.section-title {
  font-weight: bold;
  margin: 15px 0 8px;
  color: #1976D2;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 4px;
}
.form-group {
  margin-bottom: 12px;
}
.form-group label {
  display: block;
  font-size: 0.85rem;
  margin-bottom: 4px;
  color: #555;
}
.form-group input, .form-group select {
  width: 100%;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}
.checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 0.85rem;
}
.results-section {
  margin-top: 15px;
  padding: 10px;
  background: #f0f7ff;
  border-radius: 6px;
  border: 1px solid #d1e3f5;
}
.result-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  margin-bottom: 4px;
}
.highlight {
  color: #0d47a1;
  font-weight: bold;
}

.panel-footer-actions {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #e2e8f0;
}

.btn-delete-element {
  width: 100%;
  padding: 9px 12px;
  background-color: #fee2e2;
  color: #dc2626;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn-delete-element:hover {
  background-color: #fecaca;
  color: #b91c1c;
}

/* ESTILOS PARA FLUJOS NO MEDIDOS Y PRESETS DE ERROR */
.highlight-checkbox {
  background: #f8fafc;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  margin-bottom: 10px;
}
.unmeasured-badge {
  background: #fef2f2;
  border: 1px dashed #fca5a5;
  color: #991b1b;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 0.78rem;
  margin-bottom: 12px;
  line-height: 1.35;
}
.label-with-presets {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.preset-buttons {
  display: flex;
  align-items: center;
  gap: 3px;
}
.preset-label {
  font-size: 0.7rem;
  color: #64748b;
  margin-right: 2px;
}
.preset-btn {
  padding: 1px 5px;
  font-size: 0.7rem;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 3px;
  cursor: pointer;
  color: #334155;
  font-weight: 600;
  line-height: 1.2;
  transition: all 0.15s;
}
.preset-btn:hover {
  background: #2563eb;
  color: white;
  border-color: #1d4ed8;
}
.rel-hint {
  display: block;
  font-size: 0.74rem;
  color: #64748b;
  margin-top: 3px;
}
.is-disabled-group label {
  color: #94a3b8;
}
input:disabled {
  background-color: #f1f5f9 !important;
  color: #94a3b8 !important;
  cursor: not-allowed;
  border-color: #e2e8f0 !important;
}

.highlight-water-checkbox {
  background: #f0f9ff;
  border: 1px solid #7dd3fc;
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 12px;
}
.highlight-water-checkbox label {
  color: #0369a1;
  font-weight: 600;
}
.water-only-container {
  padding-left: 2px;
}
.water-badge-info {
  background: #e0f2fe !important;
  color: #0369a1 !important;
  border-color: #bae6fd !important;
}
</style>
