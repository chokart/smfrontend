<template>
  <div class="summary-table-container">
    <h3>Resumen de Balance por Nodo ({{ isWaterBalance ? 'Agua' : 'Leyes' }})</h3>
    <div class="table-wrapper">
      <table class="summary-table">
        <thead>
          <tr>
            <th>Nodo</th>
            <!-- HEADERS FOR WATER BALANCE -->
            <template v-if="isWaterBalance">
              <th>Bal. Pulpa (Medido)</th>
              <th>Bal. Pulpa (Reconciliado)</th>
              <th>Bal. Sólidos (Medido)</th>
              <th>Bal. Sólidos (Reconciliado)</th>
              <th>Bal. Agua (Medido)</th>
              <th>Bal. Agua (Reconciliado)</th>
            </template>
            <!-- HEADERS FOR METALLURGICAL BALANCE -->
            <template v-else>
              <th>Bal. Masa Total (Medido)</th>
              <th>Bal. Masa Total (Reconciliado)</th>
              <th v-for="name in elementNames" :key="name">Bal. Finos {{ name }} (Medido)</th>
              <th v-for="name in elementNames" :key="`${name}-rec`">Bal. Finos {{ name }} (Reconciliado)</th>
            </template>
          </tr>
        </thead>
        <tbody>
          <tr v-if="processNodes.length === 0">
            <td :colspan="isWaterBalance ? 5 : 3 + elementNames.length * 2" style="text-align: center; color: #777;">
              No hay nodos de proceso.
            </td>
          </tr>
          <tr v-for="node in processNodes" :key="node.id">
            <td class="node-label">{{ node.data.label }}</td>
            
            <!-- DATA FOR WATER BALANCE -->
            <template v-if="isWaterBalance">
              <!-- Pulpa -->
              <td>{{ calculateWaterBalance(node.id, 'pulpa', 'measured').toFixed(2) }}</td>
              <td :class="getBalanceClass(calculateWaterBalance(node.id, 'pulpa', 'reconciled'))">
                {{ calculateWaterBalance(node.id, 'pulpa', 'reconciled').toFixed(2) }}
              </td>
              <!-- Sólidos -->
              <td>{{ calculateWaterBalance(node.id, 'solidos', 'measured').toFixed(2) }}</td>
              <td :class="getBalanceClass(calculateWaterBalance(node.id, 'solidos', 'reconciled'))">
                {{ calculateWaterBalance(node.id, 'solidos', 'reconciled').toFixed(2) }}
              </td>
              <!-- Agua -->
              <td>{{ calculateWaterBalance(node.id, 'agua', 'measured').toFixed(2) }}</td>
              <td :class="getBalanceClass(calculateWaterBalance(node.id, 'agua', 'reconciled'))">
                {{ calculateWaterBalance(node.id, 'agua', 'reconciled').toFixed(2) }}
              </td>
            </template>

            <!-- DATA FOR METALLURGICAL BALANCE -->
            <template v-else>
              <td>{{ calculateTotalMassBalance(node.id, 'measured').toFixed(4) }}</td>
              <td :class="getBalanceClass(calculateTotalMassBalance(node.id, 'reconciled'))">
                {{ calculateTotalMassBalance(node.id, 'reconciled').toFixed(4) }}
              </td>
              <template v-for="(name, index) in elementNames" :key="name">
                <td>{{ calculateFinesBalance(node.id, index, 'measured').toFixed(4) }}</td>
                <td :class="getBalanceClass(calculateFinesBalance(node.id, index, 'reconciled'))">
                  {{ calculateFinesBalance(node.id, index, 'reconciled').toFixed(4) }}
                </td>
              </template>
            </template>
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

const isWaterBalance = computed(() => props.elementNames.length === 0);

const processNodes = computed(() => {
  return props.nodes.filter(n => n.data?.node_type === 'process');
});

function getFlowsForNode(nodeId) {
  const inputFlows = props.flows.filter(f => f.target === nodeId);
  const outputFlows = props.flows.filter(f => f.source === nodeId);
  return { inputFlows, outputFlows };
}

function getBalanceClass(value) {
  return Math.abs(value) < 0.001 ? 'balanced' : 'unbalanced';
}

// --- WATER BALANCE CALCULATIONS ---
function calculateWaterBalance(nodeId, type, state) {
  // type: 'pulpa', 'solidos', 'agua'
  // state: 'measured', 'reconciled'
  const { inputFlows, outputFlows } = getFlowsForNode(nodeId);

  const getFlowValue = (flow) => {
    const d = flow.data || {};
    const cd = d.corrected_data || {};
    
    if (state === 'reconciled') {
      // Si no hay datos corregidos, devolver 0 o el medido? 
      // Devolver 0 indicaría que "no hay resultado de reconciliación aún".
      if (!cd.tonelaje_pulpa_corregido && !cd.tonelaje_solido_calculado) return 0;
      
      if (type === 'pulpa') return Number(cd.tonelaje_pulpa_corregido || 0);
      if (type === 'solidos') return Number(cd.tonelaje_solido_calculado || 0);
      if (type === 'agua') return Number(cd.tonelaje_agua_calculado || 0);
    } else {
      // Measured calculation
      const tp = Number(d.tonelaje_pulpa || 0);
      const cp = Number(d.porcentaje_solidos || 0);

      if (type === 'pulpa') return tp;
      if (type === 'solidos') return (tp * cp / 100);
      if (type === 'agua') return (tp * (1 - cp / 100));
    }
    return 0;
  };

  const totalIn = inputFlows.reduce((sum, f) => sum + getFlowValue(f), 0);
  const totalOut = outputFlows.reduce((sum, f) => sum + getFlowValue(f), 0);

  return totalIn - totalOut;
}

// --- METALLURGICAL BALANCE CALCULATIONS ---
function calculateTotalMassBalance(nodeId, type) {
  const { inputFlows, outputFlows } = getFlowsForNode(nodeId);
  const useCorrected = type === 'reconciled';

  const getValue = (f) => {
    if (useCorrected) return f.data.corrected_tonelaje != null ? Number(f.data.corrected_tonelaje) : Number(f.data.tonelaje || 0);
    return Number(f.data.tonelaje || 0);
  };

  const totalIn = inputFlows.reduce((sum, f) => sum + getValue(f), 0);
  const totalOut = outputFlows.reduce((sum, f) => sum + getValue(f), 0);

  return totalIn - totalOut;
}

function calculateFinesBalance(nodeId, elementIndex, type) {
  const { inputFlows, outputFlows } = getFlowsForNode(nodeId);
  const useCorrected = type === 'reconciled';
  const name = props.elementNames[elementIndex];

  const getFines = (f) => {
    const ton = useCorrected ? (f.data.corrected_tonelaje != null ? Number(f.data.corrected_tonelaje) : Number(f.data.tonelaje || 0)) : Number(f.data.tonelaje || 0);
    
    const el = (f.data.elementos || []).find(e => e.name === name);
    if (!el) return 0;

    const ley = useCorrected ? (el.corrected_data ? Number(el.corrected_data.ley_corregida) : Number(el.ley || 0)) : Number(el.ley || 0);
    
    return (ton * ley) / 100;
  };

  const finesIn = inputFlows.reduce((sum, f) => sum + getFines(f), 0);
  const finesOut = outputFlows.reduce((sum, f) => sum + getFines(f), 0);

  return finesIn - finesOut;
}
</script>

<style scoped>
.summary-table-container {
  width: 100%;
  background: #f9f9f9;
  padding: 15px;
  box-sizing: border-box;
}
.table-wrapper {
  overflow-x: auto;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  background: white;
  border-radius: 4px;
}
.summary-table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
  font-size: 0.85rem;
}
.summary-table th {
  background: #f5f5f5;
  padding: 10px;
  text-align: center;
  border: 1px solid #dcdcdc;
  font-weight: 600;
  color: #333;
}
.summary-table td {
  border: 1px solid #eee;
  padding: 8px 10px;
  text-align: right;
  font-family: 'Roboto Mono', monospace;
}
.summary-table td.node-label {
  text-align: left;
  font-weight: bold;
}
.balanced {
  color: #2E7D32; /* Green for balanced nodes */
  font-weight: bold;
}
.unbalanced {
  color: #c62828; /* Red for unbalanced nodes */
  font-weight: bold;
}
h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #1565C0;
  font-size: 1.1rem;
}
</style>
