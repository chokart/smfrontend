<template>
  <div class="summary-table-container">
    <div class="summary-title">Resumen de Balance Metalúrgico (Leyes)</div>
    <div class="table-wrapper">
      <table class="summary-table">
        <thead>
          <tr>
            <th>ID Flujo</th>
            <th>De -> A</th>
            <th>Tonelaje Seco (tph)</th>
            <!-- Generar columnas dinámicas por elemento -->
            <th v-for="name in elementNames" :key="name">Ley {{ name }} (%)</th>
            <th class="status-col">Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="processedFlows.length === 0">
            <td :colspan="4 + elementNames.length" style="text-align: center; color: #777;">
              No hay flujos definidos.
            </td>
          </tr>
          <tr v-for="flow in processedFlows" :key="flow.id">
            <td class="id-cell">{{ flow.id }}</td>
            <td class="source-target-cell">
              <span class="node-label">{{ flow.sourceLabel }}</span>
              <span class="arrow">→</span>
              <span class="node-label">{{ flow.targetLabel }}</span>
            </td>

            <!-- TONELAJE -->
            <td class="data-cell">
              <div :class="{ 'not-measured': flow.not_measured }">
                {{ flow.not_measured ? 'No Med.' : (flow.tonelaje != null && !isNaN(flow.tonelaje) ? Number(flow.tonelaje).toFixed(2) : '--') }}
              </div>
              <div v-if="flow.tonelaje_corregido != null" class="corrected">
                {{ Number(flow.tonelaje_corregido).toFixed(2) }}
              </div>
            </td>

            <!-- LEYES POR ELEMENTO -->
            <td v-for="el in flow.elements" :key="el.name" class="data-cell">
              <div :class="{ 'not-measured': el.not_measured }">
                {{ el.not_measured ? 'No Med.' : (el.ley != null && !isNaN(el.ley) ? Number(el.ley).toFixed(3) : '--') }}
              </div>
              <div v-if="el.ley_corregida != null" class="corrected">
                {{ Number(el.ley_corregida).toFixed(3) }}
              </div>
            </td>

            <!-- ESTADO -->
            <td class="status-col">
              <span v-if="flow.tonelaje_corregido != null" class="badge-success">Ajustado</span>
              <span v-else class="badge-pending">Pendiente</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  nodes: { type: Array, required: true },
  flows: { type: Array, required: true },
  elementNames: { type: Array, required: true },
});

const processedFlows = computed(() => {
  return props.flows.map(flow => {
    const sourceNode = props.nodes.find(n => n.id === flow.source);
    const targetNode = props.nodes.find(n => n.id === flow.target);
    const flowData = flow.data || {};
    
    // Check if corrected data exists (it might be directly on data or nested)
    const correctedTon = flowData.corrected_tonelaje; // From backend response mapping
    
    const elements = props.elementNames.map(name => {
      const el = (flowData.elementos || []).find(e => e && e.name === name) || {};
      const correctedEl = el.corrected_data || {};
      return {
        name,
        ley: el.ley,
        not_measured: el.not_measured,
        ley_corregida: correctedEl.ley_corregida
      };
    });

    return {
      id: flow.id,
      sourceLabel: sourceNode ? sourceNode.data.label : '?',
      targetLabel: targetNode ? targetNode.data.label : '?',
      tonelaje: flowData.tonelaje,
      not_measured: flowData.not_measured,
      tonelaje_corregido: correctedTon,
      elements
    };
  });
});
</script>

<style scoped>
.summary-table-container {
  padding: 15px;
  background: #f9f9f9;
}
.summary-title {
  font-weight: bold;
  margin-bottom: 12px;
  color: #1565C0;
  font-size: 1.1rem;
}
.table-wrapper {
  overflow-x: auto;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border-radius: 4px;
  background: white;
}
.summary-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  white-space: nowrap;
}
.summary-table th {
  background: #f5f5f5;
  padding: 10px 12px;
  text-align: left; /* Default alignment */
  border: 1px solid #dcdcdc; /* Visible borders for headers */
  color: #333;
  font-weight: 600;
}
/* Align numeric headers to the right */
.summary-table th:nth-child(n+3) {
  text-align: right;
}
.summary-table th.status-col {
  text-align: center;
}

.summary-table td {
  padding: 8px 12px;
  border: 1px solid #eee; /* Visible borders for cells */
  vertical-align: middle;
}
/* Ensure the last column border is visible */
.summary-table th:last-child,
.summary-table td:last-child {
  border-right: 1px solid #dcdcdc;
}

.node-label { font-weight: bold; color: #444; }
.arrow { color: #999; margin: 0 5px; }

.data-cell {
  text-align: right;
  font-family: 'Roboto Mono', monospace; /* Monospaced for number alignment */
  font-size: 0.9rem;
}
.measured {
  color: #333;
}
.corrected {
  color: #2E7D32;
  font-weight: bold;
  font-size: 0.95rem;
  margin-top: 4px;
  padding-top: 2px;
  border-top: 1px dashed #ccc; /* Dashed separator for measured/corrected */
}
.not-measured {
  color: #999;
  font-style: italic;
  font-size: 0.8rem;
}
.status-col {
  text-align: center;
}
.badge-success { background: #E8F5E9; color: #2E7D32; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; border: 1px solid #C8E6C9; font-weight: bold;}
.badge-pending { background: #FFF3E0; color: #EF6C00; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; border: 1px solid #FFE0B2; font-weight: bold;}
</style>