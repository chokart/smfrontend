<template>
  <div class="toolbar">
    <button @click="$emit('add-node')">{{ addNodeLabel }}</button>
    <button v-if="showAddWater" @click="$emit('add-water-node')" class="water-button" title="Añadir fuente de agua limpia para dilución">💧 Añadir Agua</button>
    <button v-if="showConfig" @click="$emit('open-config')">Configurar Elementos</button>
    <button @click="$emit('open-diagrams')" class="diagrams-button">📁 Guardar / Cargar</button>
    <button @click="$emit('export')" class="export-button">Reconciliar</button>
    <button @click="$emit('verify-equations')" class="verify-button">Verificar Ecuaciones</button>
    <button @click="$emit('open-excel')" class="excel-button" title="Copiar y pegar propiedades de flujos desde Excel">📊 Copiar / Pegar Excel</button>
    <button @click="$emit('reset-circuit')" class="reset-button" title="Reiniciar circuito actual a valores por defecto">↺ Reiniciar</button>
  </div>
</template>

<script setup>
const emit = defineEmits([
  'add-node', 
  'add-water-node',
  'export', 
  'open-config', 
  'save-diagram', 
  'load-diagram', 
  'open-diagrams', 
  'view-report', 
  'verify-equations',
  'open-excel',
  'reset-circuit'
]);

const props = defineProps({
  reportAvailable: { type: Boolean, default: false },
  showConfig: { type: Boolean, default: true },
  showAddWater: { type: Boolean, default: false },
  addNodeLabel: { type: String, default: 'Añadir Celda' }
});
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
}

.toolbar button {
  padding: 8px 14px;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  color: #334155;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.toolbar button:hover {
  background-color: #f1f5f9;
  border-color: #94a3b8;
}

.diagrams-button {
  background-color: #f8fafc !important;
  color: #1e293b !important;
  font-weight: 600 !important;
  border-color: #94a3b8 !important;
}
.diagrams-button:hover {
  background-color: #e2e8f0 !important;
}

.water-button {
  background-color: #f0f9ff !important;
  color: #0284c7 !important;
  border-color: #7dd3fc !important;
  font-weight: 600 !important;
}
.water-button:hover {
  background-color: #e0f2fe !important;
  border-color: #38bdf8 !important;
}

.export-button {
  background-color: #2563eb !important;
  color: white !important;
  border-color: #1d4ed8 !important;
  font-weight: 600 !important;
}
.export-button:hover {
  background-color: #1d4ed8 !important;
}

.verify-button {
  background-color: #f0fdf4 !important;
  color: #166534 !important;
  border-color: #86efac !important;
}
.verify-button:hover {
  background-color: #dcfce7 !important;
}

.excel-button {
  background-color: #f0fdf4 !important;
  color: #15803d !important;
  border-color: #86efac !important;
  font-weight: 600 !important;
}
.excel-button:hover {
  background-color: #dcfce7 !important;
  border-color: #4ade80 !important;
}

.reset-button {
  background-color: #fff1f2 !important;
  color: #be123c !important;
  border-color: #fecdd3 !important;
  margin-left: 6px;
}
.reset-button:hover {
  background-color: #ffe4e6 !important;
  border-color: #fda4af !important;
}
</style>
