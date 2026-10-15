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
  if (d.tonelaje_solido != null) return Number(d.tonelaje_solido)
  if (d.tonelaje_pulpa != null && d.porcentaje_solidos != null) {
    return Number(d.tonelaje_pulpa) * (Number(d.porcentaje_solidos) / 100.0)
  }
  return 0
}

function getPulpValue(d) {
  const s = getSolidValue(d)
  const cp = Number(d.porcentaje_solidos || 0)
  if (cp > 0) return s / (cp / 100.0)
  return 0
}

function getWaterValue(d) {
  return Math.max(0, getPulpValue(d) - getSolidValue(d))
}
</script>

<template>
  <BaseEdge :id="id" :path="path[0]" :style="style" :marker-end="markerEnd" />
  <EdgeLabelRenderer>
    <div
      v-if="data"
      :style="{
        ...labelStyle,
        transform: `translate(-50%, -50%) translate(${path[1]}px,${path[2]}px)`,
      }"
      class="nodrag nopan custom-edge-label"
    >
      <div v-if="'tonelaje_solido' in data || 'tonelaje_pulpa' in data">
        <div class="edge-badges-container">
          <span v-if="data.tonelaje_solido_fixed || data.tonelaje_pulpa_fixed" class="edge-fixed-badge">🔒 Sólido Fijo</span>
          <span v-else-if="data.not_measured" class="edge-unmeasured-badge">🚫 No med.</span>
          <span v-if="data.porcentaje_solidos_fixed" class="edge-solidos-badge">🔒 %S Fijo</span>
        </div>
        <template v-if="data.corrected_data">
          <div><strong>T.Sol:</strong> {{ getSolidValue(data).toFixed(2) }} <span style="color: #007bff;">➔ {{ Number(data.corrected_data.tonelaje_solido_corregido ?? data.corrected_data.tonelaje_solido_calculado ?? 0).toFixed(2) }}</span></div>
          <div><strong>%Sol:</strong> {{ Number(data.porcentaje_solidos).toFixed(1) }} <span style="color: #007bff;">➔ {{ Number(data.corrected_data.porcentaje_solidos_corregido).toFixed(1) }}</span></div>
          <div><strong>Pulpa:</strong> {{ getPulpValue(data).toFixed(2) }} <span style="color: #007bff;">➔ {{ Number(data.corrected_data.tonelaje_pulpa_calculado ?? data.corrected_data.tonelaje_pulpa_corregido ?? 0).toFixed(2) }}</span></div>
          <div><strong>T.Agua:</strong> {{ getWaterValue(data).toFixed(2) }} <span style="color: #007bff;">➔ {{ Number(data.corrected_data.tonelaje_agua_calculado).toFixed(2) }}</span></div>
        </template>
        <template v-else>
          <div><strong>T.Sol:</strong> {{ getSolidValue(data).toFixed(2) }} t/h</div>
          <div><strong>%Sol:</strong> {{ Number(data.porcentaje_solidos).toFixed(1) }} %</div>
          <div><strong>Pulpa:</strong> {{ getPulpValue(data).toFixed(2) }} t/h</div>
          <div><strong>T.Agua:</strong> {{ getWaterValue(data).toFixed(2) }} t/h</div>
        </template>
      </div>
      <div v-else-if="'tonelaje' in data">
        <div class="edge-badges-container">
          <span v-if="data.tonelaje_fixed" class="edge-fixed-badge">🔒 Fijo</span>
          <span v-else-if="data.not_measured" class="edge-unmeasured-badge">🚫 No med.</span>
        </div>
        <template v-if="data.corrected_tonelaje != null">
          <div><strong>Ton:</strong> {{ Number(data.tonelaje).toFixed(2) }} <span style="color: #28a745;">➔ {{ Number(data.corrected_tonelaje).toFixed(2) }}</span></div>
          <div v-for="el in (data.elementos || [])" :key="el.name">
            <strong>{{ el.name }}:</strong> {{ Number(el.ley).toFixed(2) }} <span v-if="el.corrected_data" style="color: #28a745;">➔ {{ Number(el.corrected_data.ley_corregida).toFixed(2) }}</span>
          </div>
        </template>
        <template v-else>
          <div><strong>Ton:</strong> {{ Number(data.tonelaje).toFixed(2) }} t/h</div>
          <div v-for="el in (data.elementos || [])" :key="el.name">
            <strong>{{ el.name }}:</strong> {{ Number(el.ley).toFixed(2) }} %
          </div>
        </template>
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

.edge-badges-container {
  display: flex;
  gap: 3px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 2px;
}

.edge-fixed-badge {
  background: #fef3c7;
  color: #92400e;
  font-size: 8.5px;
  font-weight: bold;
  border-radius: 3px;
  padding: 1px 4px;
  display: inline-block;
  border: 1px solid #fde68a;
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
  background: #e0e7ff;
  color: #3730a3;
  font-size: 8.5px;
  font-weight: bold;
  border-radius: 3px;
  padding: 1px 4px;
  display: inline-block;
  border: 1px solid #c7d2fe;
}
</style>
