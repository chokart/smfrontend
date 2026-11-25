<script setup>
import { computed } from 'vue'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@vue-flow/core'

const props = defineProps({
  id: { type: String, required: true },
  sourceX: { type: Number, required: true },
  sourceY: { type: Number, required: true },
  targetX: { type: Number, required: true },
  targetY: { type: Number, required: true },
  sourcePosition: { type: String, required: true },
  targetPosition: { type: String, required: true },
  data: { type: Object, required: false },
  markerEnd: { type: String, required: false },
  style: { type: Object, required: false },
  showOnlyReconciled: { type: Boolean, default: false },
})

const path = computed(() => getBezierPath(props))

const labelStyle = {
  position: 'absolute',
  pointerEvents: 'all',
  background: 'white',
  border: '1px solid #ccc',
  padding: '4px 6px',
  borderRadius: '4px',
  fontSize: '9.5px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  zIndex: 10,
  minWidth: '80px',
  textAlign: 'center'
}
function getSolidValue(d) {
  if (d.is_water_only) return 0
  if (d.tonelaje_solido != null) return Number(d.tonelaje_solido)
  if (d.tonelaje_pulpa != null && d.porcentaje_solidos != null) {
    return Number(d.tonelaje_pulpa) * (Number(d.porcentaje_solidos) / 100.0)
  }
  return 0
}

function getPulpValue(d) {
  if (d.is_water_only) return getWaterValue(d)
  const s = getSolidValue(d)
  const cp = Number(d.porcentaje_solidos || 0)
  if (cp > 0) return s / (cp / 100.0)
  return 0
}

function getWaterValue(d) {
  if (d.is_water_only) {
    return d.tonelaje_agua != null ? Number(d.tonelaje_agua) : 0
  }
  return Math.max(0, getPulpValue(d) - getSolidValue(d))
}

function getSpecificGravity(d) {
  return Number(d.gravedad_especifica) || 2.7
}

function getPulpFlowM3h(d) {
  if (d.is_water_only) return getWaterValue(d)
  const s = getSolidValue(d)
  const w = getWaterValue(d)
  const ge = getSpecificGravity(d)
  return (s / ge) + w
}

const ELEMENT_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#64748b']
function getElementColor(index) {
  return ELEMENT_COLORS[index % ELEMENT_COLORS.length]
}

const edgeStyle = computed(() => {
  if (props.data?.is_water_only) {
    return {
      fill: 'none',
      stroke: '#0284c7',
      strokeWidth: 2.5,
      ...props.style
    }
  }
  return {
    fill: 'none',
    stroke: '#64748b',
    strokeWidth: 2.5,
    ...props.style
  }
})
</script>

<template>
  <BaseEdge :id="id" :path="path[0]" :style="edgeStyle" :marker-end="markerEnd" />
  <EdgeLabelRenderer>
    <div
      v-if="data"
      :style="{
        ...labelStyle,
        transform: `translate(-50%, -50%) translate(${path[1]}px,${path[2]}px)`,
      }"
      class="nodrag nopan custom-edge-label"
    >
      <!-- FLUJO DE AGUA PURA (DILUCIÓN / ADICIÓN) -->
      <div v-if="data.is_water_only">
        <div class="edge-badges-container">
          <span class="edge-water-badge">💧 Solo Agua</span>
          <span v-if="data.tonelaje_agua_fixed" class="edge-fixed-badge">🔒 Fijo</span>
          <span v-else-if="data.not_measured" class="edge-unmeasured-badge">🚫 No med.</span>
        </div>
        <div class="edge-val-row" title="Flujo de Agua">
          <div class="val-left">
            <span class="val-bullet bullet-water"></span>
            <span v-if="data.not_measured && !data.corrected_data" class="val-number unmeasured">🚫 Deducir</span>
            <template v-else>
              <span v-if="!showOnlyReconciled || !data.corrected_data" class="val-number" :class="{ 'val-fixed': data.tonelaje_agua_fixed }">{{ (data.tonelaje_agua || 0).toFixed(2) }}</span>
              <span v-if="data.corrected_data" class="val-rec" :class="data.tonelaje_agua_fixed ? 'val-fixed' : 'water'">{{ showOnlyReconciled ? '' : '➔ ' }}{{ Number(data.corrected_data.tonelaje_agua_calculado ?? 0).toFixed(2) }}</span>
            </template>
          </div>
          <span class="val-unit">t/h</span>
        </div>
      </div>

      <!-- FLUJO DE PULPA MINERAL (BALANCE DE AGUA) -->
      <div v-else-if="'tonelaje_solido' in data || 'tonelaje_pulpa' in data">
        <div class="edge-badges-container">
          <span v-if="data.tonelaje_solido_fixed || data.tonelaje_pulpa_fixed" class="edge-fixed-badge">🔒 Sólido Fijo</span>
          <span v-else-if="data.not_measured" class="edge-unmeasured-badge">🚫 No med.</span>
          <span v-if="data.porcentaje_solidos_fixed" class="edge-solidos-badge">🔒 %S Fijo</span>
          <span class="edge-ge-badge" :title="'Gravedad Específica: ' + getSpecificGravity(data)">GE {{ getSpecificGravity(data).toFixed(1) }}</span>
        </div>

        <!-- 1. Sólido Seco -->
        <div class="edge-val-row" title="Sólido Seco (t/h)">
          <div class="val-left">
            <span class="val-bullet bullet-solid"></span>
            <span v-if="!showOnlyReconciled || !data.corrected_data" class="val-number" :class="{ 'val-fixed': data.tonelaje_solido_fixed || data.tonelaje_pulpa_fixed }">{{ getSolidValue(data).toFixed(2) }}</span>
            <span v-if="data.corrected_data" class="val-rec" :class="(data.tonelaje_solido_fixed || data.tonelaje_pulpa_fixed) ? 'val-fixed' : 'water'">{{ showOnlyReconciled ? '' : '➔ ' }}{{ Number(data.corrected_data.tonelaje_solido_corregido ?? data.corrected_data.tonelaje_solido_calculado ?? 0).toFixed(2) }}</span>
          </div>
          <span class="val-unit">t/h</span>
        </div>

        <!-- 2. % Sólidos -->
        <div class="edge-val-row" title="% Sólidos (%)">
          <div class="val-left">
            <span class="val-bullet bullet-cp"></span>
            <span v-if="!showOnlyReconciled || !data.corrected_data" class="val-number" :class="{ 'val-fixed': data.porcentaje_solidos_fixed }">{{ Number(data.porcentaje_solidos).toFixed(1) }}</span>
            <span v-if="data.corrected_data" class="val-rec" :class="data.porcentaje_solidos_fixed ? 'val-fixed' : 'water'">{{ showOnlyReconciled ? '' : '➔ ' }}{{ Number(data.corrected_data.porcentaje_solidos_corregido).toFixed(1) }}</span>
          </div>
          <span class="val-unit">%</span>
        </div>

        <!-- 3. Flujo Agua -->
        <div class="edge-val-row" title="Flujo Agua (t/h)">
          <div class="val-left">
            <span class="val-bullet bullet-water"></span>
            <span v-if="!showOnlyReconciled || !data.corrected_data" class="val-number">{{ getWaterValue(data).toFixed(2) }}</span>
            <span v-if="data.corrected_data" class="val-rec water">{{ showOnlyReconciled ? '' : '➔ ' }}{{ Number(data.corrected_data.tonelaje_agua_calculado).toFixed(2) }}</span>
          </div>
          <span class="val-unit">t/h</span>
        </div>

        <!-- 4. Flujo Pulpa -->
        <div class="edge-val-row" title="Flujo Pulpa (t/h)">
          <div class="val-left">
            <span class="val-bullet bullet-pulp"></span>
            <span v-if="!showOnlyReconciled || !data.corrected_data" class="val-number">{{ getPulpValue(data).toFixed(2) }}</span>
            <span v-if="data.corrected_data" class="val-rec water">{{ showOnlyReconciled ? '' : '➔ ' }}{{ Number(data.corrected_data.tonelaje_pulpa_calculado ?? data.corrected_data.tonelaje_pulpa_corregido ?? 0).toFixed(2) }}</span>
          </div>
          <span class="val-unit">t/h</span>
        </div>

        <!-- 5. Caudal Pulpa -->
        <div class="edge-val-row row-highlight-caudal" title="Caudal Pulpa (m³/h)">
          <div class="val-left">
            <span class="val-bullet bullet-flow"></span>
            <span v-if="!showOnlyReconciled || !data.corrected_data" class="val-number">{{ getPulpFlowM3h(data).toFixed(2) }}</span>
            <span v-if="data.corrected_data" class="val-rec water">{{ showOnlyReconciled ? '' : '➔ ' }}{{ Number(data.corrected_data.caudal_pulpa_m3h ?? getPulpFlowM3h({ ...data, tonelaje_solido: data.corrected_data.tonelaje_solido_corregido, porcentaje_solidos: data.corrected_data.porcentaje_solidos_corregido })).toFixed(2) }}</span>
          </div>
          <span class="val-unit">m³/h</span>
        </div>
      </div>

      <!-- FLUJO METALÚRGICO (LEYES) -->
      <div v-else-if="'tonelaje' in data">
        <div class="edge-badges-container">
          <span v-if="data.tonelaje_fixed" class="edge-fixed-badge">🔒 Fijo</span>
          <span v-else-if="data.not_measured" class="edge-unmeasured-badge">🚫 No med.</span>
        </div>

        <!-- Tonelaje Seco -->
        <div class="edge-val-row" title="Tonelaje Seco (t/h)">
          <div class="val-left">
            <span class="val-bullet bullet-ton"></span>
            <span v-if="!showOnlyReconciled || data.corrected_tonelaje == null" class="val-number" :class="{ 'val-fixed': data.tonelaje_fixed }">{{ Number(data.tonelaje).toFixed(2) }}</span>
            <span v-if="data.corrected_tonelaje != null" class="val-rec" :class="data.tonelaje_fixed ? 'val-fixed' : 'metal'">{{ showOnlyReconciled ? '' : '➔ ' }}{{ Number(data.corrected_tonelaje).toFixed(2) }}</span>
          </div>
          <span class="val-unit">t/h</span>
        </div>

        <!-- Leyes de Elementos -->
        <div 
          v-for="(el, idx) in (data.elementos || [])" 
          :key="el.name" 
          class="edge-val-row" 
          :title="`Ley ${el.name} (%)`"
        >
          <div class="val-left">
            <span class="val-bullet" :style="{ backgroundColor: getElementColor(idx) }"></span>
            <span v-if="!showOnlyReconciled || !el.corrected_data" class="val-number" :class="{ 'val-fixed': el.ley_fixed }">{{ Number(el.ley).toFixed(2) }}</span>
            <span v-if="el.corrected_data" class="val-rec" :class="el.ley_fixed ? 'val-fixed' : 'metal'">{{ showOnlyReconciled ? '' : '➔ ' }}{{ Number(el.corrected_data.ley_corregida).toFixed(2) }}</span>
          </div>
          <span class="val-unit">%</span>
        </div>
      </div>
    </div>
  </EdgeLabelRenderer>
</template>

<style scoped>
.custom-edge-label:hover {
  background-color: #f8f9fa;
  border-color: #007bff;
  cursor: pointer;
}

.edge-val-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  line-height: 1.35;
  padding: 1px 0;
  white-space: nowrap;
}

.val-left {
  display: flex;
  align-items: center;
  gap: 4px;
}

.val-bullet {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.bullet-ton { background-color: #4b5563; }
.bullet-solid { background-color: #8d6e63; }
.bullet-cp { background-color: #7c3aed; }
.bullet-pulp { background-color: #ea580c; }
.bullet-flow { background-color: #0284c7; }
.bullet-water { background-color: #06b6d4; }

.val-number {
  font-weight: 600;
  color: #1e293b;
}

.val-fixed {
  color: #16a34a !important;
  font-weight: 700;
}

.val-rec {
  font-weight: 700;
  margin-left: 2px;
}
.val-rec.water { color: #0284c7; }
.val-rec.metal { color: #16a34a; }

.val-unit {
  color: #64748b;
  font-size: 8.5px;
  font-weight: 500;
  margin-left: 2px;
}

.row-highlight-caudal .val-number,
.row-highlight-caudal .val-unit {
  color: #0284c7;
}

.unmeasured {
  color: #94a3b8;
  font-style: italic;
}

.edge-ge-badge {
  background: #f1f5f9;
  color: #475569;
  font-size: 8px;
  padding: 1px 4px;
  border-radius: 3px;
  border: 1px solid #cbd5e1;
  font-weight: 600;
}

.edge-badges-container {
  display: flex;
  gap: 3px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 2px;
}

.edge-fixed-badge {
  background: #dcfce7;
  color: #15803d;
  font-size: 8.5px;
  font-weight: bold;
  border-radius: 3px;
  padding: 1px 4px;
  display: inline-block;
  border: 1px solid #86efac;
}

.edge-unmeasured-badge {
  background: #f1f5f9;
  color: #64748b;
  font-size: 8.5px;
  font-weight: 500;
  border-radius: 3px;
  padding: 1px 4px;
  display: inline-block;
  border: 1px solid #cbd5e1;
}

.edge-solidos-badge {
  background: #dcfce7;
  color: #15803d;
  font-size: 8.5px;
  font-weight: bold;
  border-radius: 3px;
  padding: 1px 4px;
  display: inline-block;
  border: 1px solid #86efac;
}

.edge-water-badge {
  background: #e0f2fe;
  color: #0369a1;
  font-size: 8.5px;
  font-weight: bold;
  border-radius: 3px;
  padding: 1px 4px;
  display: inline-block;
  border: 1px solid #7dd3fc;
}
</style>
