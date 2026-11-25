<template>
  <div v-if="visible" ref="overlayRootRef" class="print-area-root">
    <div
      ref="frameRef"
      class="a4-frame"
      :style="frameStyle"
    >
      <!-- Barra superior de control y arrastre -->
      <div
        class="a4-toolbar"
        @pointerdown.stop="startDrag"
        title="Arrastra para mover el área de impresión A4"
      >
        <span class="a4-badge">📐 A4 {{ orientation === 'landscape' ? 'Horizontal' : 'Vertical' }}</span>
        <div class="a4-actions" @pointerdown.stop>
          <button
            type="button"
            :class="['a4-btn', { active: orientation === 'landscape' }]"
            @click="setOrientation('landscape')"
            title="Cambiar a A4 Horizontal"
          >
            ▭ H
          </button>
          <button
            type="button"
            :class="['a4-btn', { active: orientation === 'portrait' }]"
            @click="setOrientation('portrait')"
            title="Cambiar a A4 Vertical"
          >
            ▯ V
          </button>
          <button
            type="button"
            class="a4-btn a4-btn-export"
            @click="$emit('export-pdf')"
            title="Exportar esta zona A4 a PDF"
          >
            📥 PDF
          </button>
          <button
            type="button"
            class="a4-btn a4-btn-close"
            @click="$emit('close')"
            title="Cerrar selector de área A4"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Bordes arrastrables -->
      <div class="a4-edge edge-bottom" @pointerdown.stop="startDrag"></div>
      <div class="a4-edge edge-left" @pointerdown.stop="startDrag"></div>
      <div class="a4-edge edge-right" @pointerdown.stop="startDrag"></div>

      <!-- Esquina inferior derecha para redimensionar manteniendo proporción A4 -->
      <div
        class="a4-resize-handle"
        @pointerdown.stop="startResize"
        title="Arrastra para cambiar el tamaño manteniendo la proporción A4"
      >
        ↘
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  orientation: { type: String, default: 'landscape' } // 'landscape' | 'portrait'
})

const emit = defineEmits(['update:orientation', 'close', 'export-pdf'])

const overlayRootRef = ref(null)
const frameRef = ref(null)

const A4_LANDSCAPE_RATIO = 297 / 210
const A4_PORTRAIT_RATIO = 210 / 297

const box = ref({ x: 80, y: 60, width: 594, height: 420 })

const aspectRatio = computed(() =>
  props.orientation === 'landscape' ? A4_LANDSCAPE_RATIO : A4_PORTRAIT_RATIO
)

const frameStyle = computed(() => ({
  left: `${box.value.x}px`,
  top: `${box.value.y}px`,
  width: `${box.value.width}px`,
  height: `${box.value.height}px`
}))

function initBoxForContainer() {
  const root = overlayRootRef.value
  if (!root) return
  const rw = root.clientWidth || 900
  const rh = root.clientHeight || 600
  const ratio = aspectRatio.value

  const maxW = rw * 0.72
  const maxH = rh * 0.72
  let w = maxW
  let h = w / ratio
  if (h > maxH) {
    h = maxH
    w = h * ratio
  }

  box.value = {
    x: Math.max(12, Math.round((rw - w) / 2)),
    y: Math.max(42, Math.round((rh - h) / 2)),
    width: Math.round(w),
    height: Math.round(h)
  }
}

watch(() => props.visible, (val) => {
  if (val) {
    nextTick(() => initBoxForContainer())
  }
})

function setOrientation(newOrient) {
  if (newOrient === props.orientation) return
  emit('update:orientation', newOrient)

  const root = overlayRootRef.value
  const rw = root?.clientWidth || 1000
  const rh = root?.clientHeight || 700
  const newRatio = newOrient === 'landscape' ? A4_LANDSCAPE_RATIO : A4_PORTRAIT_RATIO

  // Mantener área aproximada y centro al girar entre Horizontal y Vertical
  const cx = box.value.x + box.value.width / 2
  const cy = box.value.y + box.value.height / 2
  const area = box.value.width * box.value.height
  let newW = Math.sqrt(area * newRatio)
  let newH = newW / newRatio

  if (newW > rw - 24) {
    newW = rw - 24
    newH = newW / newRatio
  }
  if (newH > rh - 52) {
    newH = rh - 52
    newW = newH * newRatio
  }

  box.value = {
    x: Math.max(12, Math.min(rw - newW - 12, Math.round(cx - newW / 2))),
    y: Math.max(40, Math.min(rh - newH - 12, Math.round(cy - newH / 2))),
    width: Math.round(newW),
    height: Math.round(newH)
  }
}

let mode = null // 'drag' | 'resize'
let startPointer = { x: 0, y: 0 }
let startBox = { x: 0, y: 0, width: 0, height: 0 }

function startDrag(e) {
  mode = 'drag'
  startPointer = { x: e.clientX, y: e.clientY }
  startBox = { ...box.value }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', stopInteraction)
}

function startResize(e) {
  mode = 'resize'
  startPointer = { x: e.clientX, y: e.clientY }
  startBox = { ...box.value }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', stopInteraction)
}

function onPointerMove(e) {
  const root = overlayRootRef.value
  const rw = root?.clientWidth || 1200
  const rh = root?.clientHeight || 800
  const dx = e.clientX - startPointer.x
  const dy = e.clientY - startPointer.y

  if (mode === 'drag') {
    const nx = Math.max(4, Math.min(rw - startBox.width - 4, startBox.x + dx))
    const ny = Math.max(38, Math.min(rh - startBox.height - 4, startBox.y + dy))
    box.value = { ...startBox, x: Math.round(nx), y: Math.round(ny) }
  } else if (mode === 'resize') {
    const ratio = aspectRatio.value
    let newW = Math.max(80, startBox.width + dx)
    let newH = newW / ratio

    if (startBox.x + newW > rw - 6) {
      newW = rw - 6 - startBox.x
      newH = newW / ratio
    }
    if (startBox.y + newH > rh - 6) {
      newH = rh - 6 - startBox.y
      newW = newH * ratio
    }

    if (newW >= 80 && newH >= 60) {
      box.value = {
        ...startBox,
        width: Math.round(newW),
        height: Math.round(newH)
      }
    }
  }
}

function stopInteraction() {
  mode = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', stopInteraction)
}

onBeforeUnmount(() => {
  stopInteraction()
})

defineExpose({
  getFrameRect: () => frameRef.value?.getBoundingClientRect?.() || null
})
</script>

<style scoped>
.print-area-root {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 40;
}

.a4-frame {
  position: absolute;
  border: 2.5px dashed #b45309;
  box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.22);
  border-radius: 4px;
  pointer-events: none;
  box-sizing: border-box;
}

.a4-toolbar {
  position: absolute;
  top: -36px;
  left: -2px;
  right: -2px;
  height: 34px;
  background: #0f172a;
  color: #ffffff;
  border-radius: 6px 6px 0 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  gap: 8px;
  pointer-events: auto;
  cursor: move;
  user-select: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.a4-badge {
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
  color: #fed7aa;
}

.a4-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.a4-btn {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  font-size: 0.74rem;
  font-weight: 600;
  padding: 3px 7px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.a4-btn:hover {
  background: rgba(255, 255, 255, 0.18);
}

.a4-btn.active {
  background: #b45309;
  border-color: #d97706;
  color: #ffffff;
}

.a4-btn-export {
  background: #16a34a;
  border-color: #22c55e;
  color: #ffffff;
}

.a4-btn-export:hover {
  background: #15803d;
}

.a4-btn-close {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
  color: #fecaca;
}

.a4-btn-close:hover {
  background: #dc2626;
  color: #ffffff;
}

.a4-edge {
  position: absolute;
  pointer-events: auto;
  cursor: move;
}

.edge-bottom {
  bottom: -4px;
  left: 0;
  right: 16px;
  height: 8px;
}

.edge-left {
  top: 0;
  bottom: 0;
  left: -4px;
  width: 8px;
}

.edge-right {
  top: 0;
  bottom: 16px;
  right: -4px;
  width: 8px;
}

.a4-resize-handle {
  position: absolute;
  right: -10px;
  bottom: -10px;
  width: 22px;
  height: 22px;
  background: #b45309;
  color: #ffffff;
  border: 2px solid #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
  cursor: nwse-resize;
  pointer-events: auto;
  user-select: none;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}
</style>
