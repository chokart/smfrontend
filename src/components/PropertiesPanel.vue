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
      </div>

      <!-- CONFIGURACIÓN DE FLUJO -->
      <div v-else>
        <div class="section-title">Tonelaje Seco</div>
        <div class="form-group">
          <label>Valor Medido (tph):</label>
          <input v-model.number="localData.tonelaje" type="number" step="0.01" @input="update" />
        </div>
        <div class="form-group">
          <label>Error (Desv. Est.):</label>
          <input v-model.number="localData.tonelaje_error" type="number" step="0.01" @input="update" />
        </div>
        <div class="checkbox-group">
          <input v-model="localData.tonelaje_fixed" type="checkbox" @change="update" />
          <label>No ajustar (Fijo)</label>
        </div>
        <div class="checkbox-group">
          <input v-model="localData.not_measured" type="checkbox" @change="update" />
          <label>No medido</label>
        </div>

        <!-- RESULTADOS TONELAJE -->
        <div v-if="localData.corrected_tonelaje != null" class="results-section">
          <div class="result-item highlight">
            <span>Ton. Ajustado:</span> <strong>{{ localData.corrected_tonelaje.toFixed(2) }} tph</strong>
          </div>
        </div>

        <div class="section-title">Leyes de Elementos</div>
        <div v-for="(element, index) in localData.elementos" :key="index" class="element-block">
          <div class="element-header">{{ element.name }}</div>
          <div class="form-group">
            <label>Ley (%):</label>
            <input v-model.number="element.ley" type="number" step="0.001" @input="update" />
          </div>
          <div class="form-group">
            <label>Error Ley:</label>
            <input v-model.number="element.ley_error" type="number" step="0.001" @input="update" />
          </div>
          <div class="checkbox-group">
            <input v-model="element.ley_fixed" type="checkbox" @change="update" />
            <label>Fija</label>
            <input v-model="element.not_measured" type="checkbox" @change="update" style="margin-left: 10px;" />
            <label>No medida</label>
          </div>
          
          <!-- RESULTADOS LEY -->
          <div v-if="element.corrected_data" class="results-sub-section">
            <div class="result-item">
              <span>Ley Ajustada:</span> <strong>{{ element.corrected_data.ley_corregida.toFixed(3) }}%</strong>
            </div>
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
const title = computed(() => isNode.value ? 'Nodo' : 'Flujo')
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
</style>