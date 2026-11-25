<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h3>📄 Exportar Balance a PDF</h3>
        <button class="close-btn" @click="$emit('close')" :disabled="isGenerating">✕</button>
      </div>

      <div class="modal-body">
        <p class="modal-desc">
          Genera un reporte PDF de alta resolución (4× DPI) con el diagrama de flujo y sus tarjetas de datos.
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
              <small>Recomendado para diagramas</small>
            </button>
            <button
              type="button"
              :class="['orient-btn', { active: orientation === 'portrait' }]"
              @click="orientation = 'portrait'"
            >
              <span class="orient-icon">▯</span>
              <span>Vertical</span>
              <small>Formato reporte clásico</small>
            </button>
          </div>
        </div>

        <!-- Tamaño de Hoja -->
        <div class="form-group">
          <label for="pdf-format">Tamaño de Hoja</label>
          <select id="pdf-format" v-model="pageFormat" class="form-select">
            <option value="a4">A4 (210 × 297 mm)</option>
            <option value="letter">Carta / Letter (216 × 279 mm)</option>
            <option value="a3">A3 (297 × 420 mm — Ideal circuitos grandes)</option>
          </select>
        </div>

        <!-- Opciones adicionales -->
        <div class="options-group">
          <label class="checkbox-row">
            <input type="checkbox" v-model="autoFit" />
            <span>Encuadrar circuito automáticamente antes de exportar</span>
          </label>
          <label class="checkbox-row">
            <input type="checkbox" v-model="includeTables" />
            <span>Incluir tabla de flujos y balance por nodo (texto vectorial nítido)</span>
          </label>
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
const autoFit = ref(true)
const includeTables = ref(true)
const isGenerating = ref(false)
const errorMsg = ref('')

function getNodeLabel(nodeId) {
  const found = props.nodes.find(n => n.id === nodeId)
  return found?.data?.label || `Nodo ${nodeId}`
}

function getSolidVal(d) {
  if (d.is_water_only) return 0
  if (d.tonelaje_solido != null) return Number(d.tonelaje_solido)
  if (d.tonelaje_pulpa != null && d.porcentaje_solidos != null) {
    return Number(d.tonelaje_pulpa) * (Number(d.porcentaje_solidos) / 100)
  }
  return 0
}

function getWaterVal(d) {
  if (d.is_water_only) return Number(d.tonelaje_agua || 0)
  const s = getSolidVal(d)
  const cp = Number(d.porcentaje_solidos || 0)
  if (cp > 0 && cp < 100) return s * (100 - cp) / cp
  return 0
}

function getPulpVal(d) {
  return d.is_water_only ? getWaterVal(d) : getSolidVal(d) + getWaterVal(d)
}

function getPulpFlowM3h(d) {
  if (d.is_water_only) return getWaterVal(d)
  const s = getSolidVal(d)
  const w = getWaterVal(d)
  const ge = Number(d.gravedad_especifica) > 0 ? Number(d.gravedad_especifica) : 2.7
  return (s / ge) + w
}

function drawTable(doc, startY, headers, rows, margin, pageW, pageH) {
  let y = startY
  const usableW = pageW - margin * 2
  const colW = usableW / headers.length
  const rowH = 7

  const drawHeaders = () => {
    doc.setFillColor(15, 23, 42)
    doc.rect(margin, y, usableW, rowH + 1, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    headers.forEach((h, i) => {
      doc.text(String(h), margin + i * colW + 2, y + 5.2, { maxWidth: colW - 4 })
    })
    y += rowH + 1
  }

  drawHeaders()

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.8)
  rows.forEach((row, rIdx) => {
    if (y + rowH > pageH - 16) {
      doc.addPage()
      y = 18
      drawHeaders()
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.8)
    }

    if (rIdx % 2 === 0) {
      doc.setFillColor(248, 250, 252)
      doc.rect(margin, y, usableW, rowH, 'F')
    }

    doc.setDrawColor(226, 232, 240)
    doc.line(margin, y + rowH, margin + usableW, y + rowH)

    doc.setTextColor(30, 41, 59)
    row.forEach((cell, i) => {
      doc.text(String(cell), margin + i * colW + 2, y + 4.8, { maxWidth: colW - 4 })
    })
    y += rowH
  })

  return y
}

async function generatePdf() {
  errorMsg.value = ''
  isGenerating.value = true

  try {
    const diagramEl = props.diagramRef?.getContainerEl?.()
    if (!diagramEl) {
      throw new Error('No se encontró el contenedor del diagrama para exportar.')
    }

    if (autoFit.value && props.diagramRef?.fitView) {
      props.diagramRef.fitView({ padding: 0.08 })
      await new Promise(resolve => setTimeout(resolve, 220))
    }

    // Captura de ultra alta resolución (4x pixelRatio) excluyendo controles de zoom
    const imgData = await toPng(diagramEl, {
      pixelRatio: 4,
      backgroundColor: '#ffffff',
      cacheBust: true,
      filter: (node) => !(node?.classList && node.classList.contains('zoom-controls'))
    })

    const doc = new jsPDF({
      orientation: orientation.value,
      unit: 'mm',
      format: pageFormat.value,
      compress: true
    })

    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 12

    // Cabecera vectorial nítida
    const isWater = props.activeModule === 'water'
    const title = isWater ? 'Balance de Agua — Circuito de Planta' : 'Balance Metalúrgico de Leyes'
    const dateStr = new Date().toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42)
    doc.text('SUITE MINERALS', margin, 13)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(71, 85, 105)
    doc.text(title, margin, 19)

    doc.setFontSize(8.5)
    doc.setTextColor(100, 116, 139)
    const rightMeta = props.showOnlyReconciled
      ? `${dateStr}  |  Vista: Solo Reconciliados`
      : `${dateStr}  |  Vista: Medido / Reconciliado`
    doc.text(rightMeta, pageW - margin, 13, { align: 'right' })

    doc.setDrawColor(180, 83, 9) // Cobre institucional
    doc.setLineWidth(0.5)
    doc.line(margin, 22, pageW - margin, 22)

    // Insertar imagen del diagrama preservando relación de aspecto
    const imgProps = doc.getImageProperties(imgData)
    const availW = pageW - margin * 2
    const availH = pageH - 34 // Espacio entre header (24) y footer (10)
    const ratio = Math.min(availW / imgProps.width, availH / imgProps.height)
    const drawW = imgProps.width * ratio
    const drawH = imgProps.height * ratio
    const offsetX = margin + (availW - drawW) / 2
    const offsetY = 24 + (availH - drawH) / 2

    doc.addImage(imgData, 'PNG', offsetX, offsetY, drawW, drawH, undefined, 'FAST')

    // Pie de página
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text('Generado con SUITE MINERALS • Desarrollado por SUITECH PERU (suitechpe.com)', margin, pageH - 5)
    doc.text('Página 1', pageW - margin, pageH - 5, { align: 'right' })

    // Página 2: Tablas vectoriales con letras y números perfectamente nítidos
    if (includeTables.value && props.flows.length > 0) {
      doc.addPage()
      let y = 16

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(15, 23, 42)
      doc.text('Detalle Numérico de Flujos del Circuito', margin, y)
      y += 6

      if (isWater) {
        const headers = ['Flujo', 'Sólido (t/h)', '% Sólidos', 'Agua (t/h)', 'Pulpa (t/h)', 'Caudal (m³/h)']
        const rows = props.flows.map(f => {
          const d = f.data || {}
          const cd = d.corrected_data
          const label = `${getNodeLabel(f.source)} -> ${getNodeLabel(f.target)}`
          if (d.is_water_only) {
            const w = cd ? Number(cd.tonelaje_agua_calculado ?? 0) : Number(d.tonelaje_agua ?? 0)
            return [label + (d.tonelaje_agua_fixed ? ' [F]' : ''), '0.00', '0.0%', w.toFixed(2), w.toFixed(2), w.toFixed(2)]
          }
          const s = cd ? Number(cd.tonelaje_solido_corregido ?? cd.tonelaje_solido_calculado ?? 0) : getSolidVal(d)
          const cp = cd ? Number(cd.porcentaje_solidos_corregido ?? 0) : Number(d.porcentaje_solidos ?? 0)
          const w = cd ? Number(cd.tonelaje_agua_calculado ?? 0) : getWaterVal(d)
          const p = cd ? Number(cd.tonelaje_pulpa_calculado ?? cd.tonelaje_pulpa_corregido ?? 0) : getPulpVal(d)
          const q = cd ? Number(cd.caudal_pulpa_m3h ?? getPulpFlowM3h({ ...d, tonelaje_solido: s, porcentaje_solidos: cp })) : getPulpFlowM3h(d)
          return [
            label,
            s.toFixed(2) + (d.tonelaje_solido_fixed ? ' [F]' : ''),
            cp.toFixed(1) + '%' + (d.porcentaje_solidos_fixed ? ' [F]' : ''),
            w.toFixed(2),
            p.toFixed(2),
            q.toFixed(2)
          ]
        })
        y = drawTable(doc, y, headers, rows, margin, pageW, pageH)
      } else {
        const headers = ['Flujo', 'Ton. Med (t/h)', 'Ton. Rec (t/h)', ...props.elementNames.map(e => `${e} (%)`)]
        const rows = props.flows.map(f => {
          const d = f.data || {}
          const label = `${getNodeLabel(f.source)} -> ${getNodeLabel(f.target)}`
          const tMed = Number(d.tonelaje ?? 0).toFixed(2) + (d.tonelaje_fixed ? ' [F]' : '')
          const tRec = d.corrected_tonelaje != null ? Number(d.corrected_tonelaje).toFixed(2) : '--'
          const grades = props.elementNames.map(name => {
            const el = (d.elementos || []).find(e => e.name === name)
            if (!el) return '--'
            const val = el.corrected_data ? Number(el.corrected_data.ley_corregida) : Number(el.ley ?? 0)
            return val.toFixed(3) + (el.ley_fixed ? ' [F]' : '')
          })
          return [label, tMed, tRec, ...grades]
        })
        y = drawTable(doc, y, headers, rows, margin, pageW, pageH)
      }

      doc.setFontSize(7.5)
      doc.setTextColor(148, 163, 184)
      doc.text('[F] = Valor Fijo  |  Generado con SUITE MINERALS', margin, pageH - 5)
      doc.text('Página 2', pageW - margin, pageH - 5, { align: 'right' })
    }

    const fileSuffix = isWater ? 'Balance_Agua' : 'Balance_Leyes'
    const timestamp = new Date().toISOString().slice(0, 10)
    doc.save(`SuiteMinerals_${fileSuffix}_${orientation.value}_${timestamp}.pdf`)

    emit('close')
  } catch (err) {
    console.error('Error generando PDF:', err)
    errorMsg.value = err.message || 'Ocurrió un error al generar el PDF.'
  } finally {
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

.options-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #334155;
  cursor: pointer;
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
