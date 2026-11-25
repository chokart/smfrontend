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

        <div v-if="printAreaActive" class="area-active-banner">
          📐 <strong>Zona A4 activa:</strong> se exportará únicamente el área dentro del rectángulo seleccionado.
        </div>

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
import { ref, watch } from 'vue'
import { jsPDF } from 'jspdf'
import { toPng } from 'html-to-image'

const props = defineProps({
  visible: { type: Boolean, default: false },
  activeModule: { type: String, default: 'metallurgical' },
  nodes: { type: Array, default: () => [] },
  flows: { type: Array, default: () => [] },
  elementNames: { type: Array, default: () => ['Cu'] },
  showOnlyReconciled: { type: Boolean, default: false },
  diagramRef: { type: Object, default: null },
  printAreaActive: { type: Boolean, default: false },
  printAreaOrientation: { type: String, default: 'landscape' }
})

const emit = defineEmits(['close'])

const orientation = ref('landscape')
const pageFormat = ref('a4')
const isGenerating = ref(false)
const errorMsg = ref('')

watch(() => props.visible, (isVis) => {
  if (isVis && props.printAreaActive && props.printAreaOrientation) {
    orientation.value = props.printAreaOrientation
  }
})

async function generatePdf(overrideOrientation = null) {
  errorMsg.value = ''
  isGenerating.value = true

  const targetOrientation = typeof overrideOrientation === 'string'
    ? overrideOrientation
    : orientation.value

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

    const zoom = props.diagramRef?.getViewport?.()?.zoom || 1
    const vpRect = viewportEl.getBoundingClientRect()

    let minX = 0
    let minY = 0
    let boxW = 0
    let boxH = 0

    const printFrameRect = props.printAreaActive ? props.diagramRef?.getPrintAreaRect?.() : null

    if (printFrameRect && printFrameRect.width > 10 && printFrameRect.height > 10) {
      // Capturar exactamente el rectángulo A4 seleccionado por el usuario
      minX = Math.floor((printFrameRect.left - vpRect.left) / zoom)
      minY = Math.floor((printFrameRect.top - vpRect.top) / zoom)
      boxW = Math.ceil(printFrameRect.width / zoom)
      boxH = Math.ceil(printFrameRect.height / zoom)
    } else {
      // Calcular caja delimitadora exacta en coordenadas reales (1:1) del circuito completo
      const items = viewportEl.querySelectorAll('.vue-flow__node, .custom-edge-label')

      if (items.length === 0) {
        throw new Error('El diagrama no contiene nodos ni flujos para exportar.')
      }

      minX = Infinity
      minY = Infinity
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
      boxW = Math.ceil(maxX + pad - minX)
      boxH = Math.ceil(maxY + pad - minY)
    }

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
      orientation: targetOrientation,
      unit: 'mm',
      format: pageFormat.value,
      compress: true
    })

    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 6
    const innerW = pageW - margin * 2
    const cajetinH = 25
    const cajetinY = pageH - margin - cajetinH

    // 1. Área de dibujo del diagrama (arriba del cajetín)
    const diagPad = 2
    const diagAvailW = innerW - diagPad * 2
    const diagAvailH = (cajetinY - margin) - diagPad * 2
    const ratio = Math.min(diagAvailW / boxW, diagAvailH / boxH)
    const drawW = boxW * ratio
    const drawH = boxH * ratio
    const offsetX = margin + diagPad + (diagAvailW - drawW) / 2
    const offsetY = margin + diagPad + (diagAvailH - drawH) / 2

    doc.addImage(imgData, 'PNG', offsetX, offsetY, drawW, drawH, undefined, 'FAST')

    // 2. Marco exterior de lámina técnica
    doc.setDrawColor(51, 65, 85)
    doc.setLineWidth(0.35)
    doc.rect(margin, margin, innerW, pageH - margin * 2)

    // Línea divisoria superior del cajetín / leyenda
    doc.setLineWidth(0.35)
    doc.line(margin, cajetinY, pageW - margin, cajetinY)

    // 3. Bloque Izquierdo: LEYENDA
    const leyendaW = innerW * 0.48
    const cajetinX = margin + leyendaW
    const cajetinW = innerW - leyendaW

    // Divisor vertical entre Leyenda y Cajetín
    doc.line(cajetinX, cajetinY, cajetinX, pageH - margin)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.2)
    doc.setTextColor(71, 85, 105)
    doc.text('LEYENDA', margin + 3, cajetinY + 4.5)

    const isWater = props.activeModule === 'water'
    const ELEMENT_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#64748b']
    const legendItems = isWater
      ? [
          { color: '#8d6e63', label: 'Sólido Seco (t/h)' },
          { color: '#7c3aed', label: '% Sólidos (%)' },
          { color: '#06b6d4', label: 'Flujo Agua (t/h)' },
          { color: '#ea580c', label: 'Flujo Pulpa (t/h)' },
          { color: '#0284c7', label: 'Caudal Pulpa (m³/h)' },
          { color: '#16a34a', label: 'Valor Fijo (Verde)' }
        ]
      : [
          { color: '#4b5563', label: 'Tonelaje Seco (t/h)' },
          ...props.elementNames.map((el, idx) => ({
            color: ELEMENT_COLORS[idx % ELEMENT_COLORS.length],
            label: `Ley ${el} (%)`
          })),
          { color: '#16a34a', label: 'Valor Fijo (Verde)' }
        ]

    const cols = legendItems.length > 4 ? 2 : 1
    const colWidth = (leyendaW - 6) / cols
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.8)

    legendItems.slice(0, 6).forEach((item, idx) => {
      const col = idx % cols
      const row = Math.floor(idx / cols)
      const ix = margin + 4 + col * colWidth
      const iy = cajetinY + 9 + row * 5.2

      // Convertir hex a RGB
      const hex = item.color.replace('#', '')
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)
      doc.setFillColor(r, g, b)
      doc.circle(ix, iy - 0.9, 1.05, 'F')

      doc.setTextColor(30, 41, 59)
      doc.text(item.label, ix + 2.8, iy, { maxWidth: colWidth - 4 })
    })

    // 4. Bloque Derecho: CAJETÍN TÉCNICO Y DATOS
    const row1Y = cajetinY + 7.5
    const row2Y = cajetinY + 17.5

    doc.setDrawColor(148, 163, 184)
    doc.setLineWidth(0.25)
    doc.line(cajetinX, row1Y, pageW - margin, row1Y)
    doc.line(cajetinX, row2Y, pageW - margin, row2Y)

    // Fila 1: Marca y desarrollador
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(180, 83, 9) // Cobre institucional
    doc.text('SUITE MINERALS', cajetinX + 3, cajetinY + 5.2)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.8)
    doc.setTextColor(100, 116, 139)
    doc.text('SUITECH PERU  •  suitechpe.com', pageW - margin - 3, cajetinY + 5.2, { align: 'right' })

    // Fila 2: Título del plano y datos del circuito
    const planTitle = isWater ? 'BALANCE HÍDRICO DE CIRCUITO' : 'BALANCE METALÚRGICO DE LEYES'
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.2)
    doc.setTextColor(15, 23, 42)
    doc.text(planTitle, cajetinX + 3, row1Y + 4.3)

    const nodesCount = props.nodes.length
    const flowsCount = props.flows.length
    const vistaLabel = props.showOnlyReconciled ? 'Solo Reconciliados' : 'Medido / Reconciliado'
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.8)
    doc.setTextColor(51, 65, 85)
    doc.text(`Nodos: ${nodesCount}   |   Flujos: ${flowsCount}   |   Vista: ${vistaLabel}`, cajetinX + 3, row1Y + 8.3)

    // Fila 3: 3 celdas de metadatos (Estado, Fecha, Formato)
    const c3W = cajetinW / 3
    doc.line(cajetinX + c3W, row2Y, cajetinX + c3W, pageH - margin)
    doc.line(cajetinX + c3W * 2, row2Y, cajetinX + c3W * 2, pageH - margin)

    const hasReconciled = props.flows.some(f => f.data?.corrected_data || f.data?.corrected_tonelaje != null)
    const dateStr = new Date().toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    const formatLabel = `${pageFormat.value.toUpperCase()} ${targetOrientation === 'landscape' ? 'HORIZ.' : 'VERT.'}`

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6)
    doc.setTextColor(100, 116, 139)
    doc.text('ESTADO', cajetinX + 2.5, row2Y + 3)
    doc.text('FECHA', cajetinX + c3W + 2.5, row2Y + 3)
    doc.text('FORMATO', cajetinX + c3W * 2 + 2.5, row2Y + 3)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    doc.setTextColor(15, 23, 42)
    doc.text(hasReconciled ? 'RECONCILIADO' : 'BORRADOR', cajetinX + 2.5, row2Y + 6.2)
    doc.text(dateStr, cajetinX + c3W + 2.5, row2Y + 6.2)
    doc.text(formatLabel, cajetinX + c3W * 2 + 2.5, row2Y + 6.2)

    const fileSuffix = isWater ? 'Balance_Agua' : 'Balance_Leyes'
    const timestamp = new Date().toISOString().slice(0, 10)
    doc.save(`SuiteMinerals_${fileSuffix}_${targetOrientation}_${timestamp}.pdf`)

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

defineExpose({ generatePdf })
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

.area-active-banner {
  margin: 0 0 16px 0;
  padding: 10px 12px;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  color: #92400e;
  border-radius: 8px;
  font-size: 0.84rem;
  line-height: 1.4;
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
