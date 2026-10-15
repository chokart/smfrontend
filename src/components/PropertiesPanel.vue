<template>
  <div v-if="modelValue" class="properties-panel">
    <div class="panel-header">
      <h3>Propiedades del {{ title }}</h3>
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
            <option value="process">Proceso</option>
            <option value="concentrate">Concentrado</option>
            <option value="tailing">Relave</option>
          </select>
        </div>
        <div class="section-title">Puntos de Conexión</div>
        <div class="form-group" v-if="localData.node_type !== 'initial'">
          <label>Punto de Ingreso (i):</label>
          <select v-model="localData.targetPosition" @change="update">
            <option value="left">Izquierda (Left) ⬅️</option>
            <option value="top">Arriba (Top) ⬆️</option>
            <option value="right">Derecha (Right) ➡️</option>
            <option value="bottom">Abajo (Bottom) ⬇️</option>
          </select>
        </div>
        <div class="form-group" v-if="localData.node_type === 'initial' || localData.node_type === 'process'">
          <label>Punto de Salida (s):</label>
          <select v-model="localData.sourcePosition" @change="update">
            <option value="right">Derecha (Right) ➡️</option>
            <option value="bottom">Abajo (Bottom) ⬇️</option>
            <option value="left">Izquierda (Left) ⬅️</option>
            <option value="top">Arriba (Top) ⬆️</option>
          </select>
        </div>
      </div>

      <!-- CONFIGURACIÓN DE FLUJO -->
      <div v-else>
        <div class="section-title">Tonelaje Seco</div>
        
        <div class="checkbox-group highlight-checkbox">
          <input id="chk-not-measured" v-model="localData.not_measured" type="checkbox" @change="onNotMeasuredChange" />
          <label for="chk-not-measured"><strong>🚫 Flujo No Medido</strong> (deducir por balance)</label>
        </div>

        <div v-if="localData.not_measured" class="unmeasured-badge">
          ℹ️ <strong>Flujo sin medición:</strong> No entra en la función objetivo y se calculará por diferencia de masa en los nodos.
        </div>

        <div class="form-group" :class="{ 'is-disabled-group': localData.not_measured }">
          <label>Valor Medido (tph):</label>
          <input 
            v-model.number="localData.tonelaje" 
            type="number" 
            step="0.01" 
            :disabled="localData.not_measured" 
            :placeholder="localData.not_measured ? 'Deducido por balance' : 'tph'"
            @input="update" 
          />
        </div>

        <div class="form-group" :class="{ 'is-disabled-group': localData.not_measured }">
          <div class="label-with-presets">
            <label>Error (Desv. Est.):</label>
            <div v-if="!localData.not_measured && localData.tonelaje > 0" class="preset-buttons">
              <span class="preset-label">%:</span>
              <button type="button" class="preset-btn" @click="applyRelError('tonelaje', 0.01)" title="Asignar 1% de error relativo">1%</button>
              <button type="button" class="preset-btn" @click="applyRelError('tonelaje', 0.02)" title="Asignar 2% de error relativo">2%</button>
              <button type="button" class="preset-btn" @click="applyRelError('tonelaje', 0.05)" title="Asignar 5% de error relativo">5%</button>
            </div>
          </div>
          <input 
            v-model.number="localData.tonelaje_error" 
            type="number" 
            step="0.01" 
            :disabled="localData.not_measured" 
            :placeholder="localData.not_measured ? 'N/A' : '± tph'"
            @input="update" 
          />
          <small v-if="!localData.not_measured && localData.tonelaje > 0 && localData.tonelaje_error > 0" class="rel-hint">
            Equivale a: <strong>±{{ ((localData.tonelaje_error / localData.tonelaje) * 100).toFixed(1) }}%</strong> relativo
          </small>
        </div>

        <div v-if="!localData.not_measured" class="checkbox-group">
          <input v-model="localData.tonelaje_fixed" type="checkbox" @change="update" />
          <label>No ajustar (Fijo)</label>
        </div>

        <!-- RESULTADOS TONELAJE -->
        <div v-if="localData.corrected_tonelaje != null" class="results-section">
          <div class="result-item highlight">
            <span>Ton. Ajustado:</span> <strong>{{ localData.corrected_tonelaje.toFixed(2) }} tph</strong>
          </div>
        </div>

        <div class="section-title">Leyes de Elementos</div>
        <div v-for="(element, index) in localData.elementos" :key="index" class="element-block">
          <div class="element-header-row">
            <span class="element-header">{{ element.name }}</span>
            <div class="checkbox-group-inline">
              <label class="chk-lbl">
                <input v-model="element.not_measured" type="checkbox" @change="onElementNotMeasuredChange(element)" />
                No medida
              </label>
              <label v-if="!element.not_measured" class="chk-lbl">
                <input v-model="element.ley_fixed" type="checkbox" @change="update" />
                Fija
              </label>
            </div>
          </div>

          <div v-if="element.not_measured" class="unmeasured-badge-sm">
            ℹ️ Ley no medida (se deducirá por balance nodal).
          </div>

          <div class="form-group" :class="{ 'is-disabled-group': element.not_measured }">
            <label>Ley (%):</label>
            <input 
              v-model.number="element.ley" 
              type="number" 
              step="0.001" 
              :disabled="element.not_measured"
              :placeholder="element.not_measured ? 'Deducida por balance' : '%'"
              @input="update" 
            />
          </div>

          <div class="form-group" :class="{ 'is-disabled-group': element.not_measured }">
            <div class="label-with-presets">
              <label>Error Ley:</label>
              <div v-if="!element.not_measured && element.ley > 0" class="preset-buttons">
                <button type="button" class="preset-btn" @click="applyRelErrorElem(element, 0.01)">1%</button>
                <button type="button" class="preset-btn" @click="applyRelErrorElem(element, 0.02)">2%</button>
                <button type="button" class="preset-btn" @click="applyRelErrorElem(element, 0.05)">5%</button>
              </div>
            </div>
            <input 
              v-model.number="element.ley_error" 
              type="number" 
              step="0.001" 
              :disabled="element.not_measured"
              :placeholder="element.not_measured ? 'N/A' : '± %'"
              @input="update" 
            />
            <small v-if="!element.not_measured && element.ley > 0 && element.ley_error > 0" class="rel-hint">
              Equivale a: <strong>±{{ ((element.ley_error / element.ley) * 100).toFixed(1) }}%</strong> relativo
            </small>
          </div>
          
          <!-- RESULTADOS LEY -->
          <div v-if="element.corrected_data" class="results-sub-section">
            <div class="result-item">
              <span>Ley Ajustada:</span> <strong>{{ element.corrected_data.ley_corregida.toFixed(3) }}%</strong>
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
    localData.value.tonelaje_fixed = false
  }
  update()
}

function onElementNotMeasuredChange(element) {
  if (element.not_measured) {
    element.ley_fixed = false
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

function applyRelErrorElem(element, ratio) {
  const val = Number(element.ley || 0)
  if (val > 0) {
    element.ley_error = Number((val * ratio).toFixed(4))
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
.element-block {
  background: #f9f9f9;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 10px;
  border: 1px solid #eee;
}
.element-header {
  font-weight: bold;
  color: #444;
  margin-bottom: 8px;
  font-size: 0.95rem;
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
  gap: 5px;
  margin-bottom: 8px;
  font-size: 0.8rem;
  flex-wrap: wrap;
}
.results-section {
  margin-top: 10px;
  padding: 10px;
  background: #e3f2fd;
  border-radius: 6px;
  border: 1px solid #bbdefb;
}
.results-sub-section {
  margin-top: 8px;
  padding: 6px;
  background: #e8f5e9;
  border-radius: 4px;
  border: 1px solid #c8e6c9;
}
.result-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
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
.unmeasured-badge-sm {
  background: #fef2f2;
  color: #991b1b;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.72rem;
  margin-bottom: 8px;
  border: 1px dashed #fca5a5;
}
.element-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.checkbox-group-inline {
  display: flex;
  gap: 10px;
  align-items: center;
}
.chk-lbl {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  color: #475569;
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
</style>