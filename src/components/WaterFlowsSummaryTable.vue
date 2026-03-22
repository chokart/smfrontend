<template>
  <div class="summary-table-container">
    <div class="summary-title">Resumen de Balance de Agua (Pulpa y Sólidos)</div>
    <table class="summary-table">
      <thead>
        <tr>
          <th>ID Flujo</th>
          <th>De -> A</th>
          <th>Pulpa (tph)</th>
          <th>% Sólidos (Cp)</th>
          <th>Sólido Seco (tph)</th>
          <th>Agua (tph)</th>
          <th class="status-col">Estado</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="flow in flows" :key="flow.id">
          <td class="id-cell">{{ flow.id }}</td>
          <td class="source-target-cell">
            <span class="node-label">{{ getNodeLabel(flow.source) }}</span>
            <span class="arrow">→</span>
            <span class="node-label">{{ getNodeLabel(flow.target) }}</span>
          </td>
          
          <!-- DATOS DE PULPA -->
          <td class="data-cell">
            <div class="measured">{{ (flow.data?.tonelaje_pulpa || 0).toFixed(2) }}</div>
            <div v-if="flow.data?.corrected_data" class="corrected">
              {{ flow.data.corrected_data.tonelaje_pulpa_corregido.toFixed(2) }}
            </div>
          </td>

          <!-- % SÓLIDOS -->
          <td class="data-cell">
            <div class="measured">{{ (flow.data?.porcentaje_solidos || 0).toFixed(1) }}%</div>
            <div v-if="flow.data?.corrected_data" class="corrected">
              {{ flow.data.corrected_data.porcentaje_solidos_corregido.toFixed(1) }}%
            </div>
          </td>

          <!-- SÓLIDO SECO (CALCULADO) -->
          <td class="data-cell highlight-s">
            <div v-if="flow.data?.corrected_data">
              {{ flow.data.corrected_data.tonelaje_solido_calculado.toFixed(2) }}
            </div>
            <div v-else>--</div>
          </td>

          <!-- AGUA (CALCULADO) -->
          <td class="data-cell highlight-w">
            <div v-if="flow.data?.corrected_data">
              {{ flow.data.corrected_data.tonelaje_agua_calculado.toFixed(2) }}
            </div>
            <div v-else>--</div>
          </td>

          <td class="status-col">
            <span v-if="flow.data?.corrected_data" class="badge-success">Ajustado</span>
            <span v-else class="badge-pending">Pendiente</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
const props = defineProps({
  nodes: Array,
  flows: Array
})

function getNodeLabel(nodeId) {
  const node = props.nodes.find(n => n.id === nodeId)
  return node ? node.data.label : nodeId
}
</script>

<style scoped>
.summary-table-container {
  padding: 15px;
}
.summary-title {
  font-weight: bold;
  margin-bottom: 12px;
  color: #1565C0;
  font-size: 1.1rem;
}
.summary-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.summary-table th {
  background: #f5f5f5;
  padding: 10px;
  text-align: left;
  border-bottom: 2px solid #e0e0e0;
}
.summary-table td {
  padding: 8px 10px;
  border-bottom: 1px solid #eee;
}
.node-label { font-weight: bold; color: #444; }
.arrow { color: #999; margin: 0 5px; }
.corrected {
  color: #2E7D32;
  font-weight: bold;
  font-size: 0.95rem;
  margin-top: 2px;
}
.highlight-s { color: #827717; font-weight: bold; }
.highlight-w { color: #0277BD; font-weight: bold; }
.badge-success { background: #E8F5E9; color: #2E7D32; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; }
.badge-pending { background: #FFF3E0; color: #EF6C00; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; }
</style>
