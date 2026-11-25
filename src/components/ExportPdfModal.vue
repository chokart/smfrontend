<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h3>📄 Exportar PDF — Configurar Cajetín</h3>
        <button class="close-btn" @click="$emit('close')" :disabled="isGenerating">✕</button>
      </div>

      <div class="modal-body">
        <div v-if="printAreaActive" class="area-active-banner">
          📐 <strong>Zona A4 activa ({{ orientation === 'landscape' ? 'Horizontal' : 'Vertical' }}):</strong> se imprimirá el área dentro del recuadro seleccionado.
        </div>

        <!-- Orientación y Hoja -->
        <div class="two-cols">
          <div class="form-group">
            <label>Orientación</label>
            <div class="orientation-options">
              <button
                type="button"
                :class="['orient-btn', { active: orientation === 'landscape' }]"
                @click="orientation = 'landscape'"
              >
                ▭ Horizontal
              </button>
              <button
                type="button"
                :class="['orient-btn', { active: orientation === 'portrait' }]"
                @click="orientation = 'portrait'"
              >
                ▯ Vertical
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="pdf-format">Tamaño de Hoja</label>
            <select id="pdf-format" v-model="pageFormat" class="form-select">
              <option value="a4">A4 (210 × 297 mm)</option>
              <option value="letter">Carta / Letter</option>
              <option value="a3">A3 (297 × 420 mm)</option>
            </select>
          </div>
        </div>

        <!-- Datos editables del Cajetín -->
        <div class="cajetin-section">
          <div class="cajetin-section-title">Datos del Cajetín (Editables)</div>

          <div class="two-cols">
            <div class="form-group">
              <label for="caj-title">Título del Plano</label>
              <input id="caj-title" v-model="cajetin.title" type="text" class="form-input" />
            </div>
            <div class="form-group">
              <label for="caj-company">Proyecto / Empresa</label>
              <input id="caj-company" v-model="cajetin.company" type="text" class="form-input" />
            </div>
          </div>

          <div class="two-cols">
            <div class="form-group">
              <label for="caj-author">Elaborado por</label>
              <input id="caj-author" v-model="cajetin.author" type="text" class="form-input" />
            </div>
            <div class="form-group">
              <label for="caj-code">Código / Lámina</label>
              <input id="caj-code" v-model="cajetin.code" type="text" class="form-input" />
            </div>
          </div>

          <div class="two-cols">
            <div class="form-group">
              <label for="caj-notes">Datos / Subtítulo</label>
              <input id="caj-notes" v-model="cajetin.notes" type="text" class="form-input" />
            </div>
            <div class="form-group">
              <label for="caj-status">Estado</label>
              <input id="caj-status" v-model="cajetin.status" type="text" class="form-input" />
            </div>
          </div>

          <p class="fixed-note">
            ℹ️ La <strong>Leyenda</strong>, el <strong>Logo</strong>, la <strong>Fecha de Impresión</strong> y el texto <em>"DESARROLLADA EN LA HERRAMIENTA SUITEMINERALS.COM"</em> se incluyen automáticamente.
          </p>
        </div>

        <div v-if="errorMsg" class="error-box">{{ errorMsg }}</div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" @click="$emit('close')" :disabled="isGenerating">Cancelar</button>
        <button class="btn-export" @click="generatePdf()" :disabled="isGenerating">
          {{ isGenerating ? '⏳ Generando PDF...' : '📥 Descargar PDF' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { jsPDF } from 'jspdf'
import { toPng } from 'html-to-image'
import logoImgUrl from '../assets/logo.png'

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

const cajetin = reactive({
  title: 'BALANCE METALÚRGICO DE LEYES',
  company: 'PLANTA CONCENTRADORA',
  author: 'Ingeniería Metalúrgica',
  code: 'PFD-01',
  notes: '',
  status: 'RECONCILIADO'
})

watch(() => props.visible, (isVis) => {
  if (!isVis) return
  if (props.printAreaActive && props.printAreaOrientation) {
    orientation.value = props.printAreaOrientation
  }
  const isWater = props.activeModule === 'water'
  const hasReconciled = props.flows.some(f => f.data?.corrected_data || f.data?.corrected_tonelaje != null)
  const vistaLabel = props.showOnlyReconciled ? 'Solo Reconciliados' : 'Medido / Reconciliado'

  cajetin.title = isWater ? 'BALANCE HÍDRICO DE CIRCUITO' : 'BALANCE METALÚRGICO DE LEYES'
  cajetin.notes = `Nodos: ${props.nodes.length}  |  Flujos: ${props.flows.length}  |  Vista: ${vistaLabel}`
  cajetin.status = hasReconciled ? 'RECONCILIADO' : 'BORRADOR'
})

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la imagen.'))
    img.src = src
  })
}

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

    const diagramRect = diagramEl.getBoundingClientRect()
    const printFrameRect = props.printAreaActive ? props.diagramRef?.getPrintAreaRect?.() : null

    // Forzar fill="none" explícito en todas las rutas SVG para evitar rellenos negros al serializar
    const edgePaths = diagramEl.querySelectorAll('.vue-flow__edge-path')
    edgePaths.forEach(p => {
      savedPathStyles.push({ el: p, fill: p.style.fill, attrFill: p.getAttribute('fill') })
      p.style.fill = 'none'
      p.setAttribute('fill', 'none')
    })

    const maxContainerDim = Math.max(diagramRect.width, diagramRect.height, 1)
    const pixelRatio = Math.min(8, Math.max(4, Math.floor((9000 / maxContainerDim) * 10) / 10))

    const fullPng = await toPng(diagramEl, {
      pixelRatio,
      backgroundColor: '#ffffff',
      cacheBust: true,
      filter: (node) => {
        const cls = node?.classList
        if (!cls) return true
        return (
          !cls.contains('zoom-controls') &&
          !cls.contains('diagram-legend') &&
          !cls.contains('print-area-root')
        )
      }
    })

    let imgData = fullPng
    let boxW = diagramRect.width
    let boxH = diagramRect.height

    if (printFrameRect && printFrameRect.width > 10 && printFrameRect.height > 10) {
      const img = await loadImageElement(fullPng)
      const sx = Math.max(0, (printFrameRect.left - diagramRect.left) * pixelRatio)
      const sy = Math.max(0, (printFrameRect.top - diagramRect.top) * pixelRatio)
      const sw = Math.min(img.width - sx, printFrameRect.width * pixelRatio)
      const sh = Math.min(img.height - sy, printFrameRect.height * pixelRatio)

      const cropCanvas = document.createElement('canvas')
      cropCanvas.width = Math.max(1, Math.round(sw))
      cropCanvas.height = Math.max(1, Math.round(sh))
      const ctx = cropCanvas.getContext('2d')
      ctx.imageSmoothingEnabled = false
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height)
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cropCanvas.width, cropCanvas.height)

      imgData = cropCanvas.toDataURL('image/png')
      boxW = printFrameRect.width
      boxH = printFrameRect.height
    }

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
    const cajetinH = 28
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

    doc.addImage(imgData, 'PNG', offsetX, offsetY, drawW, drawH, undefined, 'NONE')

    // 2. Marco exterior de lámina técnica
    doc.setDrawColor(51, 65, 85)
    doc.setLineWidth(0.35)
    doc.rect(margin, margin, innerW, pageH - margin * 2)
    doc.line(margin, cajetinY, pageW - margin, cajetinY)

    // 3. Bloque Izquierdo: LEYENDA (automática)
    const leyendaW = targetOrientation === 'landscape' ? innerW * 0.42 : innerW * 0.40
    const cajetinX = margin + leyendaW
    const cajetinW = innerW - leyendaW

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
    doc.setFontSize(6.6)

    legendItems.slice(0, 6).forEach((item, idx) => {
      const col = idx % cols
      const row = Math.floor(idx / cols)
      const ix = margin + 4 + col * colWidth
      const iy = cajetinY + 9.5 + row * 5.6

      const hex = item.color.replace('#', '')
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)
      doc.setFillColor(r, g, b)
      doc.circle(ix, iy - 0.9, 1.05, 'F')

      doc.setTextColor(30, 41, 59)
      doc.text(item.label, ix + 2.6, iy, { maxWidth: colWidth - 4 })
    })

    // 4. Bloque Derecho: CAJETÍN TÉCNICO (Logo + Editables + Fijos)
    const logoColW = targetOrientation === 'landscape' ? 28 : 22
    const infoX = cajetinX + logoColW
    const infoW = cajetinW - logoColW

    doc.setDrawColor(148, 163, 184)
    doc.setLineWidth(0.25)
    doc.line(infoX, cajetinY, infoX, pageH - margin)

    // Celda del Logo oficial de SuiteMinerals
    try {
      const logoImg = await loadImageElement(logoImgUrl)
      const maxLW = logoColW - 4
      const maxLH = cajetinH - 6
      const lRatio = Math.min(maxLW / logoImg.width, maxLH / logoImg.height)
      const lW = logoImg.width * lRatio
      const lH = logoImg.height * lRatio
      const lX = cajetinX + (logoColW - lW) / 2
      const lY = cajetinY + (cajetinH - lH) / 2
      doc.addImage(logoImg, 'PNG', lX, lY, lW, lH)
    } catch (_e) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(180, 83, 9)
      doc.text('SUITE\nMINERALS', cajetinX + logoColW / 2, cajetinY + 13, { align: 'center' })
    }

    // Filas de información dentro del cajetín derecho
    const row1Y = cajetinY + 8.5
    const row2Y = cajetinY + 17.5
    const row3Y = cajetinY + 23.5
    doc.line(infoX, row1Y, pageW - margin, row1Y)
    doc.line(infoX, row2Y, pageW - margin, row2Y)
    doc.line(infoX, row3Y, pageW - margin, row3Y)

    // Fila 1: Proyecto/Empresa y Código/Lámina
    const codeColW = 24
    doc.line(pageW - margin - codeColW, cajetinY, pageW - margin - codeColW, row1Y)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    doc.setTextColor(100, 116, 139)
    doc.text('PROYECTO / EMPRESA', infoX + 2.2, cajetinY + 2.8)
    doc.text('LÁMINA', pageW - margin - codeColW + 2, cajetinY + 2.8)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(15, 23, 42)
    doc.text((cajetin.company || 'PLANTA CONCENTRADORA').toUpperCase(), infoX + 2.2, cajetinY + 6.7, { maxWidth: infoW - codeColW - 4 })
    doc.text((cajetin.code || 'PFD-01').toUpperCase(), pageW - margin - codeColW + 2, cajetinY + 6.7, { maxWidth: codeColW - 3 })

    // Fila 2: Título del Plano y Datos / Notas
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.2)
    doc.setTextColor(15, 23, 42)
    doc.text((cajetin.title || 'BALANCE').toUpperCase(), infoX + 2.2, row1Y + 4.1, { maxWidth: infoW - 4 })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(51, 65, 85)
    doc.text(cajetin.notes || '', infoX + 2.2, row1Y + 7.6, { maxWidth: infoW - 4 })

    // Fila 3: Elaborado por | Estado | Fecha de Impresión
    const c3W = infoW / 3
    doc.line(infoX + c3W, row2Y, infoX + c3W, row3Y)
    doc.line(infoX + c3W * 2, row2Y, infoX + c3W * 2, row3Y)

    const dateStr = new Date().toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.3)
    doc.setTextColor(100, 116, 139)
    doc.text('ELABORADO POR', infoX + 2, row2Y + 2.2)
    doc.text('ESTADO', infoX + c3W + 2, row2Y + 2.2)
    doc.text('FECHA DE IMPRESIÓN', infoX + c3W * 2 + 2, row2Y + 2.2)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.3)
    doc.setTextColor(15, 23, 42)
    doc.text(cajetin.author || '-', infoX + 2, row2Y + 5, { maxWidth: c3W - 3 })
    doc.text((cajetin.status || 'BORRADOR').toUpperCase(), infoX + c3W + 2, row2Y + 5, { maxWidth: c3W - 3 })
    doc.text(dateStr, infoX + c3W * 2 + 2, row2Y + 5, { maxWidth: c3W - 3 })

    // Fila 4 (Fija): Texto institucional requerido
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6)
    doc.setTextColor(180, 83, 9)
    doc.text('DESARROLLADA EN LA HERRAMIENTA SUITEMINERALS.COM', infoX + infoW / 2, row3Y + 3.2, { align: 'center' })

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
  max-width: 540px;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.25);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.02rem;
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
  padding: 18px 20px;
  overflow-y: auto;
}

.area-active-banner {
  margin: 0 0 14px 0;
  padding: 9px 12px;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  color: #92400e;
  border-radius: 8px;
  font-size: 0.82rem;
  line-height: 1.4;
}

.two-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: #334155;
  margin-bottom: 5px;
}

.orientation-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.orient-btn {
  padding: 8px 6px;
  border: 1.5px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.82rem;
  color: #334155;
  transition: all 0.15s;
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

.form-select,
.form-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  font-size: 0.85rem;
  color: #1e293b;
  background: #ffffff;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #b45309;
}

.cajetin-section {
  margin-top: 4px;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.cajetin-section-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.fixed-note {
  margin: 4px 0 0 0;
  font-size: 0.76rem;
  color: #64748b;
  line-height: 1.4;
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

@media (max-width: 520px) {
  .two-cols {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
