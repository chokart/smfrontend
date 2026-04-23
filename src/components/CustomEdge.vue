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
  padding: '6px',
  borderRadius: '4px',
  fontSize: '11px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  zIndex: 10,
  minWidth: '100px',
  textAlign: 'center'
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
      <div v-if="'tonelaje_pulpa' in data">
        <strong style="color: #007bff;">Flujo de Agua</strong>
        <template v-if="data.corrected_data">
          <div style="margin-top: 4px;"><strong>Pulpa:</strong> {{ Number(data.corrected_data.tonelaje_pulpa_corregido).toFixed(2) }} t/h</div>
          <div><strong>%S:</strong> {{ Number(data.corrected_data.porcentaje_solidos_corregido).toFixed(2) }} %</div>
          <div><strong>Agua:</strong> {{ Number(data.corrected_data.tonelaje_agua_calculado).toFixed(2) }} t/h</div>
          <div><strong>Sólido:</strong> {{ Number(data.corrected_data.tonelaje_solido_calculado).toFixed(2) }} t/h</div>
        </template>
        <template v-else>
          <div style="margin-top: 4px;"><strong>Pulpa:</strong> {{ Number(data.tonelaje_pulpa).toFixed(2) }} t/h</div>
          <div><strong>%S:</strong> {{ Number(data.porcentaje_solidos).toFixed(2) }} %</div>
          <div><strong>Agua:</strong> {{ (Number(data.tonelaje_pulpa) * (1 - Number(data.porcentaje_solidos) / 100)).toFixed(2) }} t/h</div>
          <div><strong>Sólido:</strong> {{ (Number(data.tonelaje_pulpa) * (Number(data.porcentaje_solidos) / 100)).toFixed(2) }} t/h</div>
        </template>
      </div>
      <div v-else-if="'tonelaje' in data">
        <strong style="color: #28a745;">Flujo de Sólidos</strong>
        <div style="margin-top: 4px;"><strong>T:</strong> {{ Number(data.tonelaje).toFixed(2) }} t/h</div>
        <div v-for="el in (data.elementos || [])" :key="el.name">
          <strong>{{ el.name }}:</strong> {{ Number(el.ley).toFixed(2) }} %
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
</style>
