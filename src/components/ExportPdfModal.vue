<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h3>📄 Exportar Diagrama a PDF</h3>
        <button class="close-btn" @click="$emit('close')" :disabled="isGenerating">✕</button>
      </div>

      <div class="modal-body">
        <p class="modal-desc">
          Exporta únicamente el diagrama del balance en alta resolución para que todas las letras y números se lean con total claridad.
        </p>

        <!-- Orientación -->
        <div class="form-group">
          <label>Orientación de Página</label>
          <div class="orientation-options">
            <button
              type="button"
              :class="['orient-btn', { active: orientation === 'landscape' }]"
              @click="orientation = 'landscape'"
            >
              <span class="orient-icon">▭</span>
              <span>Horizontal</span>
              <small>Recomendado para circuitos anchos</small>
            </button>
            <button
              type="button"
              :class="['orient-btn', { active: orientation === 'portrait' }]"
              @click="orientation = 'portrait'"
            >
              <span class="orient-icon">▯</span>
              <span>Vertical</span>
              <small>Recomendado para circuitos altos</small>
            </button>
          </div>
        </div>

        <!-- Tamaño de Hoja -->
        <div class="form-group">
          <label for="pdf-format">Tamaño de Hoja</label>
          <select id="pdf-format" v-model="pageFormat" class="form-select">
            <option value="a4">A4 (210 × 297 mm)</option>
            <option value="letter">Carta / Letter (216 × 279 mm)</option>
            <option value="a3">A3 (297 × 420 mm — Máxima nitidez)</option>
          </select>
        </div>

        <div v-if="errorMsg" class="error-box">{{ errorMsg }}</div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" @click="$emit('close')" :disabled="isGenerating">Cancelar</button>
        <button class="btn-export" @click="generatePdf" :disabled="isGenerating">
          {{ isGenerating ? '⏳ Generando PDF...' : '📥 Descargar PDF' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { jsPDF } from 'jspdf'
import { toPng } from 'html-to-image'

const props = defineProps({
  visible: { type: Boolean, default: false },
  activeModule: { type: String, default: 'metallurgical' },
  nodes: { type: Array, default: () => [] },
  flows: { type: Array, default: () => [] },
  elementNames: { type: Array, default: () => ['Cu'] },
  showOnlyReconciled: { type: Boolean, default: false },
  diagramRef: { type: Object, default: null }
})

const emit = defineEmits(['close'])

const orientation = ref('landscape')
const pageFormat = ref('a4')
const isGenerating = ref(false)
const errorMsg = ref('')

async function generatePdf() {
  errorMsg.value = ''
  isGenerating.value = true

  const savedPathStyles = []
  try {
    const diagramEl = props.diagramRef?.getContainerEl?.()
    if (!diagramEl) {
      throw new Error('No se encontró el contenedor del diagrama para exportar.')
    }

    const viewportEl = diagramEl.querySelector('.vue-flow__viewport')
    if (!viewportEl) {
      throw new Error('No se encontró el lienzo interno del diagrama.')
    }

    // Calcular caja delimitadora exacta en coordenadas reales (1:1) del circuito
    const zoom = props.diagramRef?.getViewport?.()?.zoom || 1
    const vpRect = viewportEl.getBoundingClientRect()
    const items = viewportEl.querySelectorAll('.vue-flow__node, .custom-edge-label')

    if (items.length === 0) {
      throw new Error('El diagrama no contiene nodos ni flujos para exportar.')
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    items.forEach(el => {
      const r = el.getBoundingClientRect()
      const x1 = (r.left - vpRect.left) / zoom
      const y1 = (r.top - vpRect.top) / zoom
      const x2 = (r.right - vpRect.left) / zoom
      const y2 = (r.bottom - vpRect.top) / zoom
      if (x1 < minX) minX = x1
      if (y1 < minY) minY = y1
      if (x2 > maxX) maxX = x2
      if (y2 > maxY) maxY = y2
    })

    const pad = 32
    minX = Math.floor(minX - pad)
    minY = Math.floor(minY - pad)
    const boxW = Math.ceil(maxX + pad - minX)
    const boxH = Math.ceil(maxY + pad - minY)

    // Forzar fill="none" explícito en todas las rutas SVG para evitar rellenos negros al serializar
    const edgePaths = viewportEl.querySelectorAll('.vue-flow__edge-path')
    edgePaths.forEach(p => {
      savedPathStyles.push({ el: p, fill: p.style.fill, attrFill: p.getAttribute('fill') })
      p.style.fill = 'none'
      p.setAttribute('fill', 'none')
    })

    // Escala adaptativa de alta resolución sin exceder límites del canvas del navegador
    const maxDim = Math.max(boxW, boxH)
    const pixelRatio = Math.max(1.8, Math.min(3.5, Math.floor((6800 / maxDim) * 10) / 10))

    const imgData = await toPng(viewportEl, {
      width: boxW,
      height: boxH,
      pixelRatio,
      backgroundColor: '#ffffff',
      cacheBust: true,
      style: {
        transform: `translate(${-minX}px, ${-minY}px) scale(1)`,
        transformOrigin: '0 0',
        width: `${boxW}px`,
        height: `${boxH}px`
      }
    })

    const doc = new jsPDF({
      orientation: orientation.value,
      unit: 'mm',
      format: pageFormat.value,
      compress: true
    })

    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 6

    const availW = pageW - margin * 2
    const availH = pageH - margin * 2
    const ratio = Math.min(availW / boxW, availH / boxH)
    const drawW = boxW * ratio
    const drawH = boxH * ratio
    const offsetX = margin + (availW - drawW) / 2
    const offsetY = margin + (availH - drawH) / 2

    doc.addImage(imgData, 'PNG', offsetX, offsetY, drawW, drawH, undefined, 'FAST')

    const isWater = props.activeModule === 'water'
    const fileSuffix = isWater ? 'Balance_Agua' : 'Balance_Leyes'
    const timestamp = new Date().toISOString().slice(0, 10)
    doc.save(`SuiteMinerals_${fileSuffix}_${orientation.value}_${timestamp}.pdf`)

    emit('close')
  } catch (err) {
    console.error('Error generando PDF:', err)
    errorMsg.value = err.message || 'Ocurrió un error al generar el PDF.'
  } finally {
    // Restaurar estilos originales de las rutas SVG
    savedPathStyles.forEach(({ el, fill, attrFill }) => {
      el.style.fill = fill
      if (attrFill === null) {
        el.removeAttribute('fill')
      } else {
        el.setAttribute('fill', attrFill)
      }
    })
    isGenerating.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
}

.modal-card {
  background: #ffffff;
  border-radius: 12px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.25);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.05rem;
  color: #0f172a;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.1rem;
  color: #64748b;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}

.close-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.modal-body {
  padding: 20px;
}

.modal-desc {
  margin: 0 0 18px 0;
  font-size: 0.88rem;
  color: #475569;
  line-height: 1.5;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.orientation-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.orient-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 10px;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.15s;
  color: #334155;
}

.orient-btn:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}

.orient-btn.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
}

.orient-icon {
  font-size: 1.4rem;
  margin-bottom: 4px;
}

.orient-btn span {
  font-weight: 600;
  font-size: 0.9rem;
}

.orient-btn small {
  font-size: 0.72rem;
  color: #64748b;
  margin-top: 2px;
  text-align: center;
}

.form-select {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #1e293b;
  background: #ffffff;
}

.error-box {
  margin-top: 12px;
  padding: 10px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  border-radius: 6px;
  font-size: 0.85rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.btn-cancel {
  padding: 9px 16px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
}

.btn-export {
  padding: 9px 18px;
  border: none;
  background: #0f172a;
  color: #ffffff;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
}

.btn-export:hover:not(:disabled) {
  background: #1e293b;
}

.btn-export:disabled,
.btn-cancel:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
