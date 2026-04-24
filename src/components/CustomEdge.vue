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
        <template v-if="data.corrected_data">
          <div><strong>Ton:</strong> {{ Number(data.tonelaje_pulpa).toFixed(2) }} <span style="color: #007bff;">➔ {{ Number(data.corrected_data.tonelaje_pulpa_corregido).toFixed(2) }}</span></div>
          <div><strong>%Sol:</strong> {{ Number(data.porcentaje_solidos).toFixed(1) }} <span style="color: #007bff;">➔ {{ Number(data.corrected_data.porcentaje_solidos_corregido).toFixed(1) }}</span></div>
          <div><strong>T.Agua:</strong> {{ (Number(data.tonelaje_pulpa) * (1 - Number(data.porcentaje_solidos) / 100)).toFixed(2) }} <span style="color: #007bff;">➔ {{ Number(data.corrected_data.tonelaje_agua_calculado).toFixed(2) }}</span></div>
          <div><strong>T.Sol:</strong> {{ (Number(data.tonelaje_pulpa) * (Number(data.porcentaje_solidos) / 100)).toFixed(2) }} <span style="color: #007bff;">➔ {{ Number(data.corrected_data.tonelaje_solido_calculado).toFixed(2) }}</span></div>
        </template>
        <template v-else>
          <div><strong>Ton:</strong> {{ Number(data.tonelaje_pulpa).toFixed(2) }} t/h</div>
          <div><strong>%Sol:</strong> {{ Number(data.porcentaje_solidos).toFixed(1) }} %</div>
          <div><strong>T.Agua:</strong> {{ (Number(data.tonelaje_pulpa) * (1 - Number(data.porcentaje_solidos) / 100)).toFixed(2) }} t/h</div>
          <div><strong>T.Sol:</strong> {{ (Number(data.tonelaje_pulpa) * (Number(data.porcentaje_solidos) / 100)).toFixed(2) }} t/h</div>
        </template>
      </div>
      <div v-else-if="'tonelaje' in data">
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
</style>
