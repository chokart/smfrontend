<script setup>
import { computed, ref, onBeforeUnmount } from 'vue'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useVueFlow } from '@vue-flow/core'

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

const emit = defineEmits(['click', 'edge-moved'])
const { getViewport } = useVueFlow()

function evalCubicBezier(sx, sy, c1x, c1y, c2x, c2y, tx, ty, t) {
  const mt = 1 - t
  const mt2 = mt * mt
  const t2 = t * t
  const a = mt2 * mt
  const b = 3 * mt2 * t
  const c = 3 * mt * t2
  const d = t2 * t
  return {
    x: a * sx + b * c1x + c * c2x + d * tx,
    y: a * sy + b * c1y + c * c2y + d * ty
  }
}

const curveData = computed(() => {
  const [rawPath, defX, defY] = getBezierPath(props)
  const nums = rawPath.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g)
  if (!nums || nums.length < 8) {
    return { d: rawPath, lx: defX, ly: defY, pts: null }
  }
  const [sx, sy, c1x, c1y, c2x, c2y, tx, ty] = nums.map(Number)
  const ox = Number(props.data?.pathOffset?.x || 0)
  const oy = Number(props.data?.pathOffset?.y || 0)
  const factor = 1.3333
  const nc1x = c1x + ox * factor
  const nc1y = c1y + oy * factor
  const nc2x = c2x + ox * factor
  const nc2y = c2y + oy * factor

  const d = (ox === 0 && oy === 0)
    ? rawPath
    : `M ${sx},${sy} C ${nc1x},${nc1y} ${nc2x},${nc2y} ${tx},${ty}`

  const t = props.data?.labelT != null ? Number(props.data.labelT) : 0.5
  const clampedT = Math.max(0.06, Math.min(0.94, t))
  const pt = evalCubicBezier(sx, sy, nc1x, nc1y, nc2x, nc2y, tx, ty, clampedT)

  return {
    d,
    lx: pt.x,
    ly: pt.y,
    pts: { sx, sy, c1x: nc1x, c1y: nc1y, c2x: nc2x, c2y: nc2y, tx, ty }
  }
})

// --- ARRASTRE DE TARJETA A LO LARGO DE LA LÍNEA ---
const isDraggingCard = ref(false)
let cardStartClient = { x: 0, y: 0 }
let cardStartWorld = { x: 0, y: 0 }
let suppressNextClick = false

function onCardPointerDown(e) {
  if (e.button !== 0 || !props.data || !curveData.value.pts) return
  isDraggingCard.value = false
  cardStartClient = { x: e.clientX, y: e.clientY }
  cardStartWorld = { x: curveData.value.lx, y: curveData.value.ly }

  window.addEventListener('pointermove', onCardPointerMove)
  window.addEventListener('pointerup', onCardPointerUp)
}

function onCardPointerMove(e) {
  const dxClient = e.clientX - cardStartClient.x
  const dyClient = e.clientY - cardStartClient.y
  if (!isDraggingCard.value && Math.hypot(dxClient, dyClient) < 4) return

  isDraggingCard.value = true
  const zoom = getViewport().zoom || 1
  const targetWx = cardStartWorld.x + dxClient / zoom
  const targetWy = cardStartWorld.y + dyClient / zoom

  const pts = curveData.value.pts
  if (!pts) return

  // Buscar el parámetro t ∈ [0.06, 0.94] más cercano al puntero sobre la curva
  let bestT = 0.5
  let bestDist = Infinity
  for (let i = 0; i <= 60; i++) {
    const t = 0.06 + (0.88 * i) / 60
    const p = evalCubicBezier(pts.sx, pts.sy, pts.c1x, pts.c1y, pts.c2x, pts.c2y, pts.tx, pts.ty, t)
    const dist = (p.x - targetWx) ** 2 + (p.y - targetWy) ** 2
    if (dist < bestDist) {
      bestDist = dist
      bestT = t
    }
  }

  props.data.labelT = Number(bestT.toFixed(4))
}

function onCardPointerUp() {
  window.removeEventListener('pointermove', onCardPointerMove)
  window.removeEventListener('pointerup', onCardPointerUp)
  if (isDraggingCard.value) {
    suppressNextClick = true
    setTimeout(() => { suppressNextClick = false }, 50)
    emit('edge-moved')
  }
  isDraggingCard.value = false
}

function onCardClick(e) {
  if (suppressNextClick) {
    e.stopPropagation()
    return
  }
  emit('click', e)
}

// --- ARRASTRE PARA MOVER LA LÍNEA DE CONEXIÓN ---
const isDraggingLine = ref(false)
let lineStartClient = { x: 0, y: 0 }
let lineStartOffset = { x: 0, y: 0 }

function onLinePointerDown(e) {
  if (e.button !== 0 || !props.data) return
  isDraggingLine.value = true
  lineStartClient = { x: e.clientX, y: e.clientY }
  lineStartOffset = {
    x: Number(props.data.pathOffset?.x || 0),
    y: Number(props.data.pathOffset?.y || 0)
  }
  window.addEventListener('pointermove', onLinePointerMove)
  window.addEventListener('pointerup', onLinePointerUp)
}

function onLinePointerMove(e) {
  if (!isDraggingLine.value || !props.data) return
  const zoom = getViewport().zoom || 1
  const dx = (e.clientX - lineStartClient.x) / zoom
  const dy = (e.clientY - lineStartClient.y) / zoom
  props.data.pathOffset = {
    x: Math.round(lineStartOffset.x + dx),
    y: Math.round(lineStartOffset.y + dy)
  }
}

function onLinePointerUp() {
  window.removeEventListener('pointermove', onLinePointerMove)
  window.removeEventListener('pointerup', onLinePointerUp)
  if (isDraggingLine.value) {
    emit('edge-moved')
  }
  isDraggingLine.value = false
}

function resetLineOffset() {
  if (!props.data) return
  props.data.pathOffset = { x: 0, y: 0 }
  emit('edge-moved')
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onCardPointerMove)
  window.removeEventListener('pointerup', onCardPointerUp)
  window.removeEventListener('pointermove', onLinePointerMove)
  window.removeEventListener('pointerup', onLinePointerUp)
})

const labelStyle = {
  position: 'absolute',
  pointerEvents: 'all',
  background: 'white',
  border: '1px solid #ccc',
  padding: '4px 7px',
  borderRadius: '4px',
  fontSize: '10.8px',
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
  <BaseEdge :id="id" :path="curveData.d" :style="edgeStyle" :marker-end="markerEnd" />
  <path
    :d="curveData.d"
    fill="none"
    stroke="transparent"
    stroke-width="16"
    style="fill: none; stroke: transparent;"
    class="edge-hit-path nopan"
    @pointerdown.stop="onLinePointerDown"
    @dblclick.stop="resetLineOffset"
  >
    <title>Arrastra para mover la línea (doble clic para restaurar)</title>
  </path>
  <EdgeLabelRenderer>
    <div
      v-if="data"
      :style="{
        ...labelStyle,
        transform: `translate(-50%, -50%) translate(${curveData.lx}px,${curveData.ly}px)`,
      }"
      :class="['nodrag', 'nopan', 'custom-edge-label', { 'is-dragging-card': isDraggingCard }]"
      @pointerdown.stop="onCardPointerDown"
      @click="onCardClick"
      title="Clic para editar propiedades • Arrastra para deslizar sobre la línea"
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
          <span v-if="data.not_measured" class="edge-unmeasured-badge">🚫 No med.</span>
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
.edge-hit-path {
  fill: none !important;
  stroke: transparent;
  stroke-width: 16px;
  cursor: grab;
  pointer-events: stroke;
}
.edge-hit-path:active {
  cursor: grabbing;
}
.custom-edge-label {
  user-select: none;
  cursor: grab;
}
.custom-edge-label.is-dragging-card {
  cursor: grabbing;
  border-color: #b45309 !important;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.18) !important;
}
.custom-edge-label:hover {
  background-color: #f8f9fa;
  border-color: #007bff;
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
  font-weight: 700;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
}

.val-fixed {
  color: #16a34a !important;
  font-weight: 700;
}

.val-rec {
  font-weight: 700;
  margin-left: 2px;
  font-variant-numeric: tabular-nums;
}
.val-rec.water { color: #0284c7; }
.val-rec.metal { color: #16a34a; }

.val-unit {
  color: #475569;
  font-size: 9.5px;
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
