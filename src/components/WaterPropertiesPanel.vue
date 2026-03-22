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
            <option value="process">Proceso</option>
            <option value="product">Producto</option>
          </select>
        </div>
      </div>

      <!-- CONFIGURACIÓN DE FLUJO (AGUA) -->
      <div v-else>
        <div class="section-title">Caudales de Pulpa</div>
        <div class="form-group">
          <label>Tonelaje Pulpa (tph):</label>
          <input v-model.number="localData.tonelaje_pulpa" type="number" step="0.1" @input="update" />
        </div>
        <div class="form-group">
          <label>Error (Desv. Est.):</label>
          <input v-model.number="localData.tonelaje_pulpa_error" type="number" step="0.1" @input="update" />
        </div>
        <div class="checkbox-group">
          <input v-model="localData.tonelaje_pulpa_fixed" type="checkbox" @change="update" />
          <label>No ajustar (Fijo)</label>
        </div>
        <div class="checkbox-group">
          <input v-model="localData.not_measured" type="checkbox" @change="update" />
          <label>No medido</label>
        </div>

        <div class="section-title">% Sólidos (Cp)</div>
        <div class="form-group">
          <label>Porcentaje Sólidos (%):</label>
          <input v-model.number="localData.porcentaje_solidos" type="number" step="0.1" @input="update" />
        </div>
        <div class="form-group">
          <label>Error %:</label>
          <input v-model.number="localData.porcentaje_solidos_error" type="number" step="0.1" @input="update" />
        </div>
        <div class="checkbox-group">
          <input v-model="localData.porcentaje_solidos_fixed" type="checkbox" @change="update" />
          <label>Fijo</label>
        </div>

        <!-- RESULTADOS CALCULADOS TRAS RECONCILIACIÓN -->
        <div v-if="localData.corrected_data" class="results-section">
          <div class="section-title">Resultados Ajustados</div>
          <div class="result-item">
            <span>Pulpa:</span> <strong>{{ localData.corrected_data.tonelaje_pulpa_corregido.toFixed(2) }}</strong>
          </div>
          <div class="result-item">
            <span>% Sólidos:</span> <strong>{{ localData.corrected_data.porcentaje_solidos_corregido.toFixed(2) }}%</strong>
          </div>
          <div class="result-item highlight">
            <span>Agua:</span> <strong>{{ localData.corrected_data.tonelaje_agua_calculado.toFixed(2) }} tph</strong>
          </div>
          <div class="result-item highlight">
            <span>Sólido Seco:</span> <strong>{{ localData.corrected_data.tonelaje_solido_calculado.toFixed(2) }} tph</strong>
          </div>
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

const emit = defineEmits(['update:modelValue'])

const isNode = computed(() => props.modelValue && props.modelValue.position)
const localData = ref({})

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    localData.value = JSON.parse(JSON.stringify(newVal.data))
  }
}, { immediate: true, deep: true })

function update() {
  const updatedElement = {
    ...props.modelValue,
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
</style>
