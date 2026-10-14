<template>
  <div class="summary-table-container">
    <div class="summary-header-row">
      <div class="summary-title">Resumen de Balance Metalúrgico (Leyes)</div>
      <div class="summary-actions">
        <button type="button" class="btn-table-action" @click="copyTableToClipboard" title="Copiar tabla al portapapeles para Excel">
          📋 Copiar a Excel
        </button>
        <button type="button" class="btn-table-action btn-table-action-primary" @click="$emit('open-excel')" title="Pegar propiedades de flujos desde Excel">
          📥 Pegar desde Excel
        </button>
      </div>
    </div>
    <div class="table-wrapper">
      <table class="summary-table">
        <thead>
          <tr>
            <th>ID Flujo</th>
            <th>De -> A</th>
            <th>Tonelaje Seco (tph)</th>
            <!-- Generar columnas dinámicas por elemento -->
            <th v-for="name in elementNames" :key="name">Ley {{ name }} (%)</th>
            <th class="status-col">¿Ajustar?</th>
            <th class="status-col">Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="processedFlows.length === 0">
            <td :colspan="5 + elementNames.length" style="text-align: center; color: #777;">
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

            <!-- MODO DE AJUSTE INTERACTIVO -->
            <td class="status-col">
              <button
                type="button"
                class="badge-adjustment"
                :class="getAdjustmentClass(flow)"
                :title="'Clic para cambiar: ' + getAdjustmentTitle(flow)"
                @click="toggleAdjustmentMode(flow)"
              >
                {{ getAdjustmentLabel(flow) }}
              </button>
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

const emit = defineEmits(['open-excel', 'update-flow']);

function getAdjustmentMode(flow) {
  if (flow.not_measured) return 'not_measured';
  if (flow.tonelaje_fixed) return 'fixed';
  return 'adjust';
}

function getAdjustmentLabel(flow) {
  const mode = getAdjustmentMode(flow);
  if (mode === 'fixed') return '🔒 Fijo';
  if (mode === 'not_measured') return '🚫 No med.';
  return '⚡ Ajustar';
}

function getAdjustmentClass(flow) {
  const mode = getAdjustmentMode(flow);
  return `badge-adj-${mode}`;
}

function getAdjustmentTitle(flow) {
  const mode = getAdjustmentMode(flow);
  if (mode === 'fixed') return 'Flujo Fijo (No se ajusta en balance). Clic para cambiar a No medido.';
  if (mode === 'not_measured') return 'Flujo No Medido (Se calcula por balance). Clic para cambiar a Ajustable.';
  return 'Flujo Ajustable (Se ajusta en balance). Clic para cambiar a Fijo.';
}

function toggleAdjustmentMode(flow) {
  const current = getAdjustmentMode(flow);
  let nextFixed = false;
  let nextNotMeasured = false;
  if (current === 'adjust') {
    nextFixed = true;
    nextNotMeasured = false;
  } else if (current === 'fixed') {
    nextFixed = false;
    nextNotMeasured = true;
  } else {
    nextFixed = false;
    nextNotMeasured = false;
  }

  emit('update-flow', {
    id: flow.id,
    tonelaje_fixed: nextFixed,
    not_measured: nextNotMeasured
  });
}

async function copyTableToClipboard() {
  if (processedFlows.value.length === 0) return;
  const headers = ['ID Flujo', 'De', 'A', '¿Ajustar?', 'Tonelaje Seco (tph)'];
  props.elementNames.forEach(elem => headers.push(`Ley ${elem} (%)`));
  headers.push('Estado');

  let tsv = headers.join('\t') + '\n';
  processedFlows.value.forEach(flow => {
    const row = [
      flow.id,
      flow.sourceLabel,
      flow.targetLabel,
      getAdjustmentLabel(flow),
      flow.not_measured ? 'No Med.' : (flow.tonelaje != null ? flow.tonelaje : '')
    ];
    flow.elements.forEach(el => {
      row.push(el.not_measured ? 'No Med.' : (el.ley != null ? el.ley : ''));
    });
    row.push(flow.tonelaje_corregido != null ? 'Ajustado' : 'Pendiente');
    tsv += row.join('\t') + '\n';
  });

  try {
    await navigator.clipboard.writeText(tsv);
    alert('¡Tabla copiada al portapapeles! Puedes pegarla en Excel con Ctrl+V.');
  } catch (err) {
    console.error('Error al copiar al portapapeles:', err);
  }
}

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
      tonelaje_fixed: flowData.tonelaje_fixed || false,
      not_measured: flowData.not_measured || false,
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
.summary-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 10px;
}
.summary-title {
  font-weight: bold;
  color: #1565C0;
  font-size: 1.1rem;
}
.summary-actions {
  display: flex;
  gap: 8px;
}
.btn-table-action {
  padding: 5px 11px;
  font-size: 0.8rem;
  font-weight: 500;
  border-radius: 5px;
  border: 1px solid #cbd5e1;
  background-color: white;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.btn-table-action:hover {
  background-color: #f1f5f9;
  border-color: #94a3b8;
}
.btn-table-action-primary {
  background-color: #f0fdf4;
  color: #15803d;
  border-color: #86efac;
  font-weight: 600;
}
.btn-table-action-primary:hover {
  background-color: #dcfce7;
  border-color: #4ade80;
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

.badge-adjustment {
  border: 1px solid transparent;
  padding: 4px 9px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.badge-adj-adjust {
  background-color: #eff6ff;
  color: #1d4ed8;
  border-color: #bfdbfe;
}
.badge-adj-adjust:hover {
  background-color: #dbeafe;
}
.badge-adj-fixed {
  background-color: #fef3c7;
  color: #92400e;
  border-color: #fde68a;
}
.badge-adj-fixed:hover {
  background-color: #fde68a;
}
.badge-adj-not_measured {
  background-color: #f1f5f9;
  color: #64748b;
  border-color: #cbd5e1;
}
.badge-adj-not_measured:hover {
  background-color: #e2e8f0;
}
</style>