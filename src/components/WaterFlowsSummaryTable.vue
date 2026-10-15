<template>
  <div class="summary-table-container">
    <div class="summary-header-row">
      <div class="summary-title">Resumen de Balance de Agua (Pulpa y Sólidos)</div>
      <div class="summary-actions">
        <button type="button" class="btn-table-action" @click="copyTableToClipboard" title="Copiar tabla de agua para Excel">
          📋 Copiar a Excel
        </button>
        <button type="button" class="btn-table-action btn-table-action-primary" @click="$emit('open-excel')" title="Pegar propiedades de flujos de agua desde Excel">
          📥 Pegar desde Excel
        </button>
      </div>
    </div>
    <table class="summary-table">
      <thead>
        <tr>
          <th>ID Flujo</th>
          <th>De -> A</th>
          <th>Sólido Seco (tph)</th>
          <th>% Sólidos (Cp)</th>
          <th>Pulpa (tph)</th>
          <th>Agua (tph)</th>
          <th class="status-col">¿Ajustar?</th>
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
          
          <!-- DATOS DE SÓLIDO SECO (MEDIDO / CORREGIDO) -->
          <td class="data-cell">
            <div class="measured">{{ getFlowSolidValue(flow).toFixed(2) }}</div>
            <div v-if="flow.data?.corrected_data" class="corrected">
              {{ (flow.data.corrected_data.tonelaje_solido_corregido ?? flow.data.corrected_data.tonelaje_solido_calculado ?? 0).toFixed(2) }}
              <span v-if="flow.data.corrected_data.tonelaje_solido_error != null" class="error-val">
                ±{{ flow.data.corrected_data.tonelaje_solido_error.toFixed(2) }}
              </span>
            </div>
          </td>

          <!-- % SÓLIDOS -->
          <td class="data-cell">
            <div class="solidos-cell-flex">
              <span class="measured">{{ (flow.data?.porcentaje_solidos || 0).toFixed(1) }}%</span>
              <button
                type="button"
                class="badge-solidos-btn"
                :class="flow.data?.porcentaje_solidos_fixed ? 'is-fixed' : 'is-adjust'"
                :title="flow.data?.porcentaje_solidos_fixed ? '% Sólidos Fijo: No cambiará en el balance. Clic para hacerlo ajustable.' : '% Sólidos Ajustable: Se reconciliará en el balance. Clic para fijarlo.'"
                @click="toggleSolidosFixed(flow)"
              >
                {{ flow.data?.porcentaje_solidos_fixed ? '🔒 Fijo' : '⚡ Ajustar' }}
              </button>
            </div>
            <div v-if="flow.data?.corrected_data" class="corrected">
              {{ flow.data.corrected_data.porcentaje_solidos_corregido.toFixed(1) }}%
              <span class="error-val">±{{ flow.data.corrected_data.porcentaje_solidos_error.toFixed(1) }}</span>
            </div>
          </td>

          <!-- PULPA (CALCULADO) -->
          <td class="data-cell highlight-p">
            <div v-if="flow.data?.corrected_data">
              {{ (flow.data.corrected_data.tonelaje_pulpa_calculado ?? flow.data.corrected_data.tonelaje_pulpa_corregido ?? 0).toFixed(2) }}
            </div>
            <div v-else-if="getEstimatedPulp(flow) != null">
              <span style="color: #64748b;">{{ getEstimatedPulp(flow).toFixed(2) }}</span>
            </div>
            <div v-else>--</div>
          </td>

          <!-- AGUA (CALCULADO) -->
          <td class="data-cell highlight-w">
            <div v-if="flow.data?.corrected_data">
              {{ (flow.data.corrected_data.tonelaje_agua_calculado ?? 0).toFixed(2) }}
            </div>
            <div v-else-if="getEstimatedWater(flow) != null">
              <span style="color: #64748b;">{{ getEstimatedWater(flow).toFixed(2) }}</span>
            </div>
            <div v-else>--</div>
          </td>

          <!-- MODO DE AJUSTE -->
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

const emit = defineEmits(['open-excel', 'update-flow'])

function getNodeLabel(nodeId) {
  const node = props.nodes.find(n => n.id === nodeId)
  return node ? node.data.label : nodeId
}

function getFlowSolidValue(flow) {
  if (flow.data?.tonelaje_solido != null) return Number(flow.data.tonelaje_solido)
  if (flow.data?.tonelaje_pulpa != null && flow.data?.porcentaje_solidos != null) {
    return Number(flow.data.tonelaje_pulpa) * (Number(flow.data.porcentaje_solidos) / 100.0)
  }
  return 0
}

function getEstimatedPulp(flow) {
  const s = getFlowSolidValue(flow)
  const cp = flow.data?.porcentaje_solidos
  if (s > 0 && cp > 0) {
    return s / (cp / 100.0)
  }
  return null
}

function getEstimatedWater(flow) {
  const p = getEstimatedPulp(flow)
  const s = getFlowSolidValue(flow)
  if (p != null && s >= 0) {
    return Math.max(0, p - s)
  }
  return null
}

function getAdjustmentMode(flow) {
  if (flow.data?.not_measured) return 'not_measured'
  if (flow.data?.tonelaje_solido_fixed || flow.data?.tonelaje_pulpa_fixed) return 'fixed'
  return 'adjust'
}

function getAdjustmentLabel(flow) {
  const mode = getAdjustmentMode(flow)
  if (mode === 'fixed') return '🔒 Fijo'
  if (mode === 'not_measured') return '🚫 No med.'
  return '⚡ Ajustar'
}

function getAdjustmentClass(flow) {
  const mode = getAdjustmentMode(flow)
  return `badge-adj-${mode}`
}

function getAdjustmentTitle(flow) {
  const mode = getAdjustmentMode(flow)
  if (mode === 'fixed') return 'Flujo Fijo (No se ajusta en balance). Clic para cambiar a No medido.'
  if (mode === 'not_measured') return 'Flujo No Medido (Se calcula por balance). Clic para cambiar a Ajustable.'
  return 'Flujo Ajustable (Se ajusta en balance). Clic para cambiar a Fijo.'
}

function toggleAdjustmentMode(flow) {
  const current = getAdjustmentMode(flow)
  let nextFixed = false
  let nextNotMeasured = false
  if (current === 'adjust') {
    nextFixed = true
    nextNotMeasured = false
  } else if (current === 'fixed') {
    nextFixed = false
    nextNotMeasured = true
  } else {
    nextFixed = false
    nextNotMeasured = false
  }

  emit('update-flow', {
    id: flow.id,
    tonelaje_solido_fixed: nextFixed,
    tonelaje_pulpa_fixed: nextFixed,
    not_measured: nextNotMeasured
  })
}

function toggleSolidosFixed(flow) {
  emit('update-flow', {
    id: flow.id,
    porcentaje_solidos_fixed: !flow.data?.porcentaje_solidos_fixed
  })
}

async function copyTableToClipboard() {
  if (!props.flows || props.flows.length === 0) return
  const headers = ['ID Flujo', 'De', 'A', '¿Ajustar Sólido?', 'Sólido Seco (tph)', '% Sólidos (Cp)', '¿% Sólidos Fijo?', 'Pulpa (tph)', 'Agua (tph)', 'Estado']
  let tsv = headers.join('\t') + '\n'

  props.flows.forEach(flow => {
    const sVal = getFlowSolidValue(flow)
    const pCalc = flow.data?.corrected_data ? (flow.data.corrected_data.tonelaje_pulpa_calculado ?? flow.data.corrected_data.tonelaje_pulpa_corregido).toFixed(2) : (getEstimatedPulp(flow)?.toFixed(2) ?? '--')
    const wCalc = flow.data?.corrected_data ? flow.data.corrected_data.tonelaje_agua_calculado.toFixed(2) : (getEstimatedWater(flow)?.toFixed(2) ?? '--')
    const row = [
      flow.id,
      getNodeLabel(flow.source),
      getNodeLabel(flow.target),
      getAdjustmentLabel(flow),
      sVal != null ? sVal : '',
      flow.data?.porcentaje_solidos != null ? flow.data.porcentaje_solidos : '',
      flow.data?.porcentaje_solidos_fixed ? 'Sí' : 'No',
      pCalc,
      wCalc,
      flow.data?.corrected_data ? 'Ajustado' : 'Pendiente'
    ]
    tsv += row.join('\t') + '\n'
  })

  try {
    await navigator.clipboard.writeText(tsv)
    alert('¡Tabla de balance de agua copiada al portapapeles! Puedes pegarla en Excel con Ctrl+V.')
  } catch (err) {
    console.error('Error al copiar al portapapeles:', err)
  }
}
</script>

<style scoped>
.summary-table-container {
  padding: 15px;
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
.error-val {
  font-size: 0.75rem;
  color: #666;
  font-weight: normal;
  margin-left: 4px;
}
.highlight-s { color: #827717; font-weight: bold; }
.highlight-p { color: #5b21b6; font-weight: bold; }
.highlight-w { color: #0277BD; font-weight: bold; }
.badge-success { background: #E8F5E9; color: #2E7D32; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; }
.badge-pending { background: #FFF3E0; color: #EF6C00; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; }

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

.solidos-cell-flex {
  display: flex;
  align-items: center;
  gap: 6px;
}

.badge-solidos-btn {
  border: 1px solid transparent;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.badge-solidos-btn.is-adjust {
  background-color: #f8fafc;
  color: #475569;
  border-color: #cbd5e1;
}
.badge-solidos-btn.is-adjust:hover {
  background-color: #f1f5f9;
  border-color: #94a3b8;
  color: #1e293b;
}
.badge-solidos-btn.is-fixed {
  background-color: #e0e7ff;
  color: #3730a3;
  border-color: #c7d2fe;
}
.badge-solidos-btn.is-fixed:hover {
  background-color: #c7d2fe;
}
</style>
