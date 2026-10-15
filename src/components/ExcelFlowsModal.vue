<template>
  <div v-if="visible" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-content">
      <!-- CABECERA -->
      <header class="modal-header">
        <div class="header-title">
          <span class="header-icon">📊</span>
          <div>
            <h3>Copiar y Pegar Propiedades de Flujos desde Excel</h3>
            <p class="header-subtitle">
              {{ isWaterModule ? 'Balance de Agua (Sólido Seco y % Sólidos)' : 'Balance de Leyes Metalúrgicas (Tonelaje y Leyes)' }}
            </p>
          </div>
        </div>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </header>

      <!-- CUERPO DEL MODAL -->
      <div class="modal-body">
        <!-- GUÍA RÁPIDA / INSTRUCCIONES -->
        <div class="instructions-card">
          <div class="instruction-step">
            <span class="step-num">1</span>
            <span>Copia la plantilla con <strong>"Copiar Plantilla"</strong> y pégala en Excel con <strong>Ctrl+V</strong>.</span>
          </div>
          <div class="instruction-step">
            <span class="step-num">2</span>
            <span>Completa valores y define si cada flujo (y su % sólidos en agua) es <strong>Fijo o Ajustable</strong>.</span>
          </div>
          <div class="instruction-step">
            <span class="step-num">3</span>
            <span>Copia las celdas en Excel (Ctrl+C), pégalas aquí y haz clic en <strong>"Aplicar a Todos los Flujos"</strong>.</span>
          </div>
        </div>

        <!-- BARRA DE ACCIONES Y FORMATO -->
        <div class="toolbar-actions">
          <div class="btn-group">
            <button type="button" class="action-btn btn-copy" @click="copyTemplateToClipboard">
              📋 Copiar Plantilla / Datos a Excel
            </button>
            <button type="button" class="action-btn btn-paste" @click="pasteFromClipboard">
              📥 Pegar desde Portapapeles
            </button>
            <button v-if="rawPastedText" type="button" class="action-btn btn-clear" @click="clearPaste">
              🗑️ Limpiar
            </button>
          </div>

          <div class="format-selector">
            <label for="format-mode">Formato de columnas:</label>
            <select id="format-mode" v-model="formatMode" @change="reparse">
              <option value="auto">Auto-detectar (Encabezados o Valores)</option>
              <option value="values_only">Solo Valores (Tonelaje, Leyes...)</option>
              <option value="values_with_errors">Valores y Errores (Tonelaje, Error, Leyes...)</option>
              <option value="template_full">Plantilla Completa (ID, De, A, Ajustar, Tonelaje...)</option>
            </select>
          </div>
        </div>

        <!-- ÁREA DE PEGADO (TEXTAREA) -->
        <div class="paste-zone">
          <textarea
            ref="textareaRef"
            v-model="rawPastedText"
            class="paste-textarea"
            placeholder="Pega aquí los datos copiados desde Excel (Ctrl + V)..."
            rows="5"
            @input="reparse"
            @paste="handleTextareaPaste"
          ></textarea>
          <div v-if="toastMessage" :class="['toast-notice', toastType]">
            {{ toastMessage }}
          </div>
        </div>

        <!-- VISTA PREVIA DE DATOS PARSEADOS -->
        <div class="preview-section">
          <div class="preview-header">
            <h4>Vista Previa y Configuración de Ajuste</h4>
            <div class="preview-header-meta">
              <span class="badge-count" :class="{ 'has-matches': matchedCount > 0 }">
                {{ matchedCount }} de {{ flows.length }} flujos vinculados
              </span>
            </div>
          </div>

          <div class="table-container">
            <table class="preview-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Flujo (De ➔ A)</th>
                  <th class="col-adjustment">{{ isWaterModule ? '¿Ajustar Sólido?' : '¿Ajustar Flujo?' }}</th>
                  <template v-if="!isWaterModule">
                    <th>Tonelaje (tph)</th>
                    <th v-for="elem in elementNames" :key="elem">Ley {{ elem }} (%)</th>
                  </template>
                  <template v-else>
                    <th>Sólido Seco (tph)</th>
                    <th>% Sólidos (Cp)</th>
                  </template>
                  <th class="text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="flows.length === 0">
                  <td :colspan="isWaterModule ? 6 : 5 + elementNames.length" class="empty-cell">
                    No hay flujos creados en el circuito actualmente.
                  </td>
                </tr>
                <tr
                  v-for="(row, idx) in previewRows"
                  :key="row.id || idx"
                  :class="{ 'row-matched': row.matched, 'row-unmatched': !row.matched }"
                >
                  <td class="id-cell">{{ row.id }}</td>
                  <td class="flow-name-cell">
                    <span class="source-node">{{ row.sourceLabel }}</span>
                    <span class="arrow-sep">➔</span>
                    <span class="target-node">{{ row.targetLabel }}</span>
                  </td>

                  <!-- SELECTOR INTERACTIVO DE MODO DE AJUSTE -->
                  <td class="col-adjustment">
                    <select
                      v-model="adjustmentModes[row.id]"
                      class="select-mode"
                      :class="`mode-${adjustmentModes[row.id] || 'adjust'}`"
                    >
                      <option value="adjust">⚡ Ajustar</option>
                      <option value="fixed">🔒 Fijo (No ajustar)</option>
                      <option value="not_measured">🚫 No medido</option>
                    </select>
                  </td>

                  <!-- LEYES METALÚRGICAS -->
                  <template v-if="!isWaterModule">
                    <!-- TONELAJE -->
                    <td class="value-cell">
                      <div class="curr-val">{{ formatNumber(row.currentTonelaje, 2) }}</div>
                      <div v-if="row.hasNewTonelaje" class="new-val">
                        ➔ {{ formatNumber(row.newTonelaje, 2) }}
                        <span v-if="row.newTonelajeError != null" class="err-hint">±{{ formatNumber(row.newTonelajeError, 2) }}</span>
                      </div>
                    </td>

                    <!-- ELEMENTOS -->
                    <td v-for="elem in elementNames" :key="elem" class="value-cell">
                      <div class="curr-val">{{ formatNumber(row.currentLeyes[elem], 3) }}</div>
                      <div v-if="row.hasNewLeyes && row.newLeyes[elem] !== undefined" class="new-val">
                        ➔ {{ formatNumber(row.newLeyes[elem], 3) }}
                        <span v-if="row.newLeyesError && row.newLeyesError[elem] != null" class="err-hint">±{{ formatNumber(row.newLeyesError[elem], 3) }}</span>
                      </div>
                    </td>
                  </template>

                  <!-- BALANCE DE AGUA -->
                  <template v-else>
                    <!-- SÓLIDO SECO -->
                    <td class="value-cell">
                      <div class="curr-val">{{ formatNumber(row.currentSolido, 2) }}</div>
                      <div v-if="row.hasNewSolido" class="new-val">
                        ➔ {{ formatNumber(row.newSolido, 2) }}
                        <span v-if="row.newSolidoError != null" class="err-hint">±{{ formatNumber(row.newSolidoError, 2) }}</span>
                      </div>
                    </td>

                    <!-- % SÓLIDOS CON CONTROL DE FIJO/AJUSTAR -->
                    <td class="value-cell">
                      <div class="curr-val">
                        {{ formatNumber(row.currentSolidos, 1) }}%
                        <span v-if="row.currentSolidosFixed" class="badge-fixed-hint">🔒 Fijo</span>
                      </div>
                      <div v-if="row.hasNewSolidos" class="new-val">
                        ➔ {{ formatNumber(row.newSolidos, 1) }}%
                        <span v-if="row.newSolidosError != null" class="err-hint">±{{ formatNumber(row.newSolidosError, 1) }}</span>
                      </div>
                      <div class="solidos-fixed-toggle-row">
                        <button
                          type="button"
                          class="badge-toggle-solidos"
                          :class="solidosFixedModes[row.id] ? 'is-fixed' : 'is-adjust'"
                          :title="solidosFixedModes[row.id] ? '% Sólidos Fijo: no cambiará en la reconciliación. Clic para permitir ajuste.' : '% Sólidos Ajustable: el balance lo ajustará. Clic para fijarlo.'"
                          @click="solidosFixedModes[row.id] = !solidosFixedModes[row.id]"
                        >
                          {{ solidosFixedModes[row.id] ? '🔒 %S Fijo' : '⚡ %S Ajustar' }}
                        </button>
                      </div>
                    </td>
                  </template>

                  <!-- ESTADO DE LA FILA -->
                  <td class="text-center status-col">
                    <span v-if="row.matched && row.hasChanges" class="badge badge-success">Actualizar</span>
                    <span v-else-if="row.matched" class="badge badge-neutral">Sin cambios</span>
                    <span v-else class="badge badge-pending">Sin datos</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- PIE DEL MODAL -->
      <footer class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="$emit('close')">
          Cancelar
        </button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="matchedCount === 0 || !hasAnyChanges"
          @click="applyChanges"
        >
          💾 Aplicar a Todos los Flujos ({{ changedCount }})
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  activeModule: { type: String, default: 'metallurgical' },
  nodes: { type: Array, default: () => [] },
  flows: { type: Array, default: () => [] },
  elementNames: { type: Array, default: () => ['Cu'] }
})

const emit = defineEmits(['close', 'apply'])

const isWaterModule = computed(() => props.activeModule === 'water')
const rawPastedText = ref('')
const formatMode = ref('auto')
const toastMessage = ref('')
const toastType = ref('info')
const textareaRef = ref(null)

// Diccionario reactivo de modos de ajuste por flujo: { [flowId]: 'adjust' | 'fixed' | 'not_measured' }
const adjustmentModes = ref({})
// Diccionario reactivo de % sólidos fijo por flujo (agua): { [flowId]: boolean }
const solidosFixedModes = ref({})

let toastTimeout = null
function showToast(msg, type = 'info', duration = 3000) {
  toastMessage.value = msg
  toastType.value = type
  clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => {
    toastMessage.value = ''
  }, duration)
}

function getNodeLabel(nodeId) {
  const node = props.nodes.find(n => n.id === nodeId)
  return node?.data?.label || nodeId || '?'
}

// Inicializar diccionarios de modos de ajuste según datos actuales
function initAdjustmentModes() {
  const modes = {}
  const sFixed = {}
  props.flows.forEach(f => {
    const d = f.data || {}
    sFixed[f.id] = !!(d.porcentaje_solidos_fixed)
    if (isWaterModule.value) {
      if (d.not_measured) {
        modes[f.id] = 'not_measured'
      } else if (d.tonelaje_solido_fixed || d.tonelaje_pulpa_fixed) {
        modes[f.id] = 'fixed'
      } else {
        modes[f.id] = 'adjust'
      }
    } else {
      if (d.not_measured) {
        modes[f.id] = 'not_measured'
      } else if (d.tonelaje_fixed) {
        modes[f.id] = 'fixed'
      } else {
        modes[f.id] = 'adjust'
      }
    }
  })
  adjustmentModes.value = modes
  solidosFixedModes.value = sFixed
}

// Helper numérico robusto para formatos de Excel (comas, puntos, miles, porcentajes)
function parseExcelNumber(val) {
  if (val === null || val === undefined) return null
  let str = String(val).trim()
  if (!str || str === '-' || str === '--' || str.toLowerCase() === 'nd' || str.toLowerCase() === 'no medido') {
    return null
  }
  // Eliminar unidades y caracteres decorativos
  str = str.replace(/%|tph|t\/h/gi, '').trim()

  // Manejar separadores decimales y miles (ej. 1.234,56 o 1,234.56 o 12,5 o 12.5)
  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // Formato Europeo / Latinoamericano: 1.250,50
      str = str.replace(/\./g, '').replace(',', '.')
    } else {
      // Formato US: 1,250.50
      str = str.replace(/,/g, '')
    }
  } else if (str.includes(',')) {
    // Coma decimal: 12,5 -> 12.5
    str = str.replace(',', '.')
  }

  const num = parseFloat(str)
  return isNaN(num) ? null : num
}

function formatNumber(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(val)) return '--'
  return Number(val).toFixed(decimals)
}

function parseSolidosFixedFlag(val) {
  if (val === null || val === undefined) return null
  const lower = String(val).trim().toLowerCase()
  if (!lower) return null
  if (lower === 'si' || lower === 'sí' || lower === 'true' || lower === 'fijo' || lower === 'fixed' || lower === 'no ajustar') {
    return true
  }
  if (lower === 'no' || lower === 'false' || lower === 'ajustar' || lower === 'libre') {
    return false
  }
  return null
}

// 1. GENERAR PLANTILLA EN PORTAPAPELES
async function copyTemplateToClipboard() {
  try {
    let tsv = ''
    if (!isWaterModule.value) {
      // Cabecera Metalúrgica con columnas de ajuste
      const headers = ['ID Flujo', 'De', 'A', '¿Ajustar? (Sí/No)', '¿No Medido? (Sí/No)', 'Tonelaje Seco (tph)', 'Error Ton']
      props.elementNames.forEach(elem => {
        headers.push(`Ley ${elem} (%)`)
        headers.push(`Error Ley ${elem}`)
      })
      tsv += headers.join('\t') + '\n'

      // Filas por cada flujo
      props.flows.forEach(flow => {
        const flowData = flow.data || {}
        const row = [
          flow.id,
          getNodeLabel(flow.source),
          getNodeLabel(flow.target),
          flowData.tonelaje_fixed ? 'No (Fijo)' : 'Sí',
          flowData.not_measured ? 'Sí' : 'No',
          flowData.tonelaje != null ? flowData.tonelaje : 100,
          flowData.tonelaje_error != null ? flowData.tonelaje_error : 1.0
        ]
        props.elementNames.forEach(elemName => {
          const el = (flowData.elementos || []).find(e => e.name === elemName)
          row.push(el?.ley != null ? el.ley : 1.0)
          row.push(el?.ley_error != null ? el.ley_error : 0.1)
        })
        tsv += row.join('\t') + '\n'
      })
    } else {
      // Cabecera Agua con Sólido Seco y % Sólidos
      const headers = [
        'ID Flujo', 
        'De', 
        'A', 
        '¿Ajustar Sólido? (Sí/No)', 
        '¿No Medido? (Sí/No)', 
        'Sólido Seco (tph)', 
        'Error Sólido', 
        '¿% Sólidos Fijo? (Sí/No)', 
        '% Sólidos', 
        'Error % Sólidos'
      ]
      tsv += headers.join('\t') + '\n'

      props.flows.forEach(flow => {
        const flowData = flow.data || {}
        const isSolidFixed = flowData.tonelaje_solido_fixed || flowData.tonelaje_pulpa_fixed
        const solidVal = flowData.tonelaje_solido != null 
          ? flowData.tonelaje_solido 
          : (flowData.tonelaje_pulpa && flowData.porcentaje_solidos ? (flowData.tonelaje_pulpa * flowData.porcentaje_solidos / 100) : 30.0)
        const solidErr = flowData.tonelaje_solido_error != null 
          ? flowData.tonelaje_solido_error 
          : (flowData.tonelaje_pulpa_error ? flowData.tonelaje_pulpa_error * 0.3 : 1.0)
        const row = [
          flow.id,
          getNodeLabel(flow.source),
          getNodeLabel(flow.target),
          isSolidFixed ? 'No (Fijo)' : 'Sí',
          flowData.not_measured ? 'Sí' : 'No',
          solidVal,
          solidErr,
          flowData.porcentaje_solidos_fixed ? 'Sí (Fijo)' : 'No',
          flowData.porcentaje_solidos != null ? flowData.porcentaje_solidos : 30.0,
          flowData.porcentaje_solidos_error != null ? flowData.porcentaje_solidos_error : 0.5
        ]
        tsv += row.join('\t') + '\n'
      })
    }

    await navigator.clipboard.writeText(tsv)
    showToast('✅ ¡Plantilla copiada al portapapeles! Pégala en Excel con Ctrl+V.', 'success', 3500)
  } catch (err) {
    showToast('⚠️ No se pudo copiar automáticamente. Puedes seleccionar el texto de la tabla.', 'warning')
  }
}

// 2. PEGAR DEL PORTAPAPELES VÍA API
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      rawPastedText.value = text
      reparse()
      showToast('📋 Datos pegados desde el portapapeles con éxito.', 'info', 2500)
    } else {
      showToast('El portapapeles está vacío.', 'warning')
    }
  } catch (err) {
    if (textareaRef.value) {
      textareaRef.value.focus()
      showToast('Por favor presiona Ctrl + V dentro del recuadro para pegar.', 'info', 3500)
    }
  }
}

function handleTextareaPaste() {
  nextTick(() => {
    reparse()
  })
}

function clearPaste() {
  rawPastedText.value = ''
  reparse()
}

// 3. PARSEADOR INTELIGENTE DE TEXTO EXCEL
const parsedData = ref([])

function reparse() {
  const text = rawPastedText.value.trim()
  if (!text) {
    parsedData.value = []
    return
  }

  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0)
  if (lines.length === 0) {
    parsedData.value = []
    return
  }

  const matrix = lines.map(line => {
    if (line.includes('\t')) return line.split('\t').map(c => c.trim())
    if (line.includes(';')) return line.split(';').map(c => c.trim())
    return line.split(',').map(c => c.trim())
  })

  const firstRow = matrix[0]
  const isHeaderRow = firstRow.some(cell => {
    const lower = cell.toLowerCase()
    return isNaN(Number(cell.replace(',', '.'))) && (
      lower.includes('id') || lower.includes('flujo') || lower.includes('ton') ||
      lower.includes('pulpa') || lower.includes('solido') || lower.includes('sólido') ||
      lower.includes('ley') || lower.includes('de') || lower.includes('a') ||
      lower.includes('ajustar') || lower.includes('fijo') || lower.includes('medido') ||
      props.elementNames.some(el => lower.includes(el.toLowerCase()))
    )
  })

  let headers = null
  let dataRows = matrix
  if (isHeaderRow) {
    headers = firstRow.map(h => h.toLowerCase())
    dataRows = matrix.slice(1)
  }

  const results = []

  // Helper para interpretar ajuste / fijo / no medido
  function parseAdjustmentFlags(ajustarVal, noMedidoVal) {
    let mode = null
    if (noMedidoVal) {
      const lowerNm = noMedidoVal.toLowerCase()
      if (lowerNm === 'si' || lowerNm === 'sí' || lowerNm === 'true' || lowerNm === 'no medido' || lowerNm === 'nd') {
        return 'not_measured'
      }
    }
    if (ajustarVal) {
      const lowerAj = ajustarVal.toLowerCase()
      if (lowerAj === 'no' || lowerAj === 'false' || lowerAj === 'fijo' || lowerAj === 'no ajustar') {
        return 'fixed'
      } else if (lowerAj === 'si' || lowerAj === 'sí' || lowerAj === 'true' || lowerAj === 'ajustar') {
        return 'adjust'
      }
    }
    return mode
  }

  // MODALIDAD: BALANCE METALÚRGICO
  if (!isWaterModule.value) {
    dataRows.forEach((row, rowIdx) => {
      if (row.length === 0 || row.every(c => !c)) return

      let matchedFlowId = null
      let tonelaje = null
      let tonelaje_error = null
      let mode = null
      const elementos = {}
      const elementosError = {}

      if (headers) {
        const idCol = headers.findIndex(h => h.includes('id') || h.includes('flujo'))
        if (idCol !== -1 && row[idCol]) {
          const val = row[idCol].trim()
          const found = props.flows.find(f => f.id.toLowerCase() === val.toLowerCase())
          if (found) matchedFlowId = found.id
        }

        const ajCol = headers.findIndex(h => h.includes('ajustar') || h.includes('fijo'))
        const nmCol = headers.findIndex(h => h.includes('medido') || h.includes('no med'))
        const ajVal = ajCol !== -1 ? row[ajCol] : null
        const nmVal = nmCol !== -1 ? row[nmCol] : null
        mode = parseAdjustmentFlags(ajVal, nmVal)

        const tonCol = headers.findIndex(h => h.includes('ton') && !h.includes('error'))
        if (tonCol !== -1) tonelaje = parseExcelNumber(row[tonCol])

        const tonErrCol = headers.findIndex(h => (h.includes('ton') || h.includes('tph')) && h.includes('error'))
        if (tonErrCol !== -1) tonelaje_error = parseExcelNumber(row[tonErrCol])

        props.elementNames.forEach(elem => {
          const lowerElem = elem.toLowerCase()
          const leyCol = headers.findIndex(h => h.includes(lowerElem) && !h.includes('error'))
          if (leyCol !== -1) {
            elementos[elem] = parseExcelNumber(row[leyCol])
          }
          const leyErrCol = headers.findIndex(h => h.includes(lowerElem) && h.includes('error'))
          if (leyErrCol !== -1) {
            elementosError[elem] = parseExcelNumber(row[leyErrCol])
          }
        })
      }

      const effectiveMode = (formatMode.value === 'auto' && !headers) ? 'values_only' : formatMode.value

      if (effectiveMode === 'template_full' || (headers && matchedFlowId && tonelaje == null)) {
        if (!matchedFlowId && row[0]) {
          const found = props.flows.find(f => f.id.toLowerCase() === row[0].toLowerCase())
          if (found) matchedFlowId = found.id
        }
        if (row[3] !== undefined) mode = parseAdjustmentFlags(row[3], row[4])
        if (row[5] !== undefined) tonelaje = parseExcelNumber(row[5])
        if (row[6] !== undefined) tonelaje_error = parseExcelNumber(row[6])
        let colIdx = 7
        props.elementNames.forEach(elem => {
          if (row[colIdx] !== undefined) elementos[elem] = parseExcelNumber(row[colIdx])
          if (row[colIdx + 1] !== undefined) elementosError[elem] = parseExcelNumber(row[colIdx + 1])
          colIdx += 2
        })
      } else if (effectiveMode === 'values_with_errors') {
        if (row[0] !== undefined) tonelaje = parseExcelNumber(row[0])
        if (row[1] !== undefined) tonelaje_error = parseExcelNumber(row[1])
        let colIdx = 2
        props.elementNames.forEach(elem => {
          if (row[colIdx] !== undefined) elementos[elem] = parseExcelNumber(row[colIdx])
          if (row[colIdx + 1] !== undefined) elementosError[elem] = parseExcelNumber(row[colIdx + 1])
          colIdx += 2
        })
      } else if (effectiveMode === 'values_only') {
        if (row[0] !== undefined) tonelaje = parseExcelNumber(row[0])
        props.elementNames.forEach((elem, eIdx) => {
          if (row[1 + eIdx] !== undefined) {
            elementos[elem] = parseExcelNumber(row[1 + eIdx])
          }
        })
      }

      if (!matchedFlowId && rowIdx < props.flows.length) {
        matchedFlowId = props.flows[rowIdx].id
      }

      if (matchedFlowId) {
        if (mode) {
          adjustmentModes.value[matchedFlowId] = mode
        }
        results.push({
          flowId: matchedFlowId,
          tonelaje,
          tonelaje_error,
          elementos,
          elementosError,
          mode
        })
      }
    })
  } else {
    // MODALIDAD: BALANCE DE AGUA (Sólido Seco y % Sólidos)
    dataRows.forEach((row, rowIdx) => {
      if (row.length === 0 || row.every(c => !c)) return

      let matchedFlowId = null
      let tonelaje_solido = null
      let tonelaje_solido_error = null
      let porcentaje_solidos = null
      let porcentaje_solidos_error = null
      let mode = null
      let solidosFixed = null

      if (headers) {
        const idCol = headers.findIndex(h => h.includes('id') || h.includes('flujo'))
        if (idCol !== -1 && row[idCol]) {
          const found = props.flows.find(f => f.id.toLowerCase() === row[idCol].trim().toLowerCase())
          if (found) matchedFlowId = found.id
        }

        const ajCol = headers.findIndex(h => (h.includes('ajustar') || h.includes('fijo')) && (h.includes('solido') || h.includes('sólido') || h.includes('seco') || !h.includes('cp')))
        const nmCol = headers.findIndex(h => h.includes('medido') || h.includes('no med'))
        const ajVal = ajCol !== -1 ? row[ajCol] : null
        const nmVal = nmCol !== -1 ? row[nmCol] : null
        mode = parseAdjustmentFlags(ajVal, nmVal)

        // ¿% Sólidos Fijo?
        const solFixedCol = headers.findIndex(h => (h.includes('solido') || h.includes('sólido') || h.includes('cp')) && (h.includes('fijo') || h.includes('fixed') || h.includes('ajustar')) && (h.includes('%') || h.includes('cp') || h.includes('porc')))
        if (solFixedCol !== -1) {
          solidosFixed = parseSolidosFixedFlag(row[solFixedCol])
        }

        // Columna de Sólido Seco (o tonelaje seco / solido / tph)
        const solCol = headers.findIndex(h => (h.includes('solido') || h.includes('sólido') || h.includes('seco') || (h.includes('ton') && !h.includes('pulpa'))) && !h.includes('%') && !h.includes('error') && !h.includes('fijo') && !h.includes('fixed') && !h.includes('ajustar'))
        if (solCol !== -1) tonelaje_solido = parseExcelNumber(row[solCol])

        const solErrCol = headers.findIndex(h => (h.includes('solido') || h.includes('sólido') || h.includes('seco') || (h.includes('ton') && !h.includes('pulpa'))) && !h.includes('%') && h.includes('error'))
        if (solErrCol !== -1) tonelaje_solido_error = parseExcelNumber(row[solErrCol])

        // Columna de % Sólidos
        const cpCol = headers.findIndex(h => (h.includes('%') || h.includes('cp') || h.includes('porcentaje')) && !h.includes('error') && !h.includes('fijo') && !h.includes('fixed') && !h.includes('ajustar'))
        if (cpCol !== -1) porcentaje_solidos = parseExcelNumber(row[cpCol])

        const cpErrCol = headers.findIndex(h => (h.includes('%') || h.includes('cp') || h.includes('porcentaje')) && h.includes('error'))
        if (cpErrCol !== -1) porcentaje_solidos_error = parseExcelNumber(row[cpErrCol])
      }

      const effectiveMode = (formatMode.value === 'auto' && !headers) ? 'values_only' : formatMode.value

      if (effectiveMode === 'template_full' || (headers && matchedFlowId && tonelaje_solido == null)) {
        // [0: ID, 1: De, 2: A, 3: ¿Ajustar Sólido?, 4: ¿NoMedido?, 5: Sólido Seco, 6: ErrSólido, 7: ¿%S Fijo?, 8: %Sol, 9: Err%Sol]
        if (!matchedFlowId && row[0]) {
          const found = props.flows.find(f => f.id.toLowerCase() === row[0].toLowerCase())
          if (found) matchedFlowId = found.id
        }
        if (row[3] !== undefined) mode = parseAdjustmentFlags(row[3], row[4])
        if (row[5] !== undefined) tonelaje_solido = parseExcelNumber(row[5])
        if (row[6] !== undefined) tonelaje_solido_error = parseExcelNumber(row[6])
        if (row[7] !== undefined) solidosFixed = parseSolidosFixedFlag(row[7])
        if (row[8] !== undefined) porcentaje_solidos = parseExcelNumber(row[8])
        if (row[9] !== undefined) porcentaje_solidos_error = parseExcelNumber(row[9])
      } else if (effectiveMode === 'values_with_errors') {
        if (row[0] !== undefined) tonelaje_solido = parseExcelNumber(row[0])
        if (row[1] !== undefined) tonelaje_solido_error = parseExcelNumber(row[1])
        if (row[2] !== undefined) porcentaje_solidos = parseExcelNumber(row[2])
        if (row[3] !== undefined) porcentaje_solidos_error = parseExcelNumber(row[3])
      } else if (effectiveMode === 'values_only') {
        if (row[0] !== undefined) tonelaje_solido = parseExcelNumber(row[0])
        if (row[1] !== undefined) porcentaje_solidos = parseExcelNumber(row[1])
      }

      if (!matchedFlowId && rowIdx < props.flows.length) {
        matchedFlowId = props.flows[rowIdx].id
      }

      if (matchedFlowId) {
        if (mode) {
          adjustmentModes.value[matchedFlowId] = mode
        }
        if (solidosFixed !== null) {
          solidosFixedModes.value[matchedFlowId] = solidosFixed
        }
        results.push({
          flowId: matchedFlowId,
          tonelaje_solido,
          tonelaje_solido_error,
          porcentaje_solidos,
          porcentaje_solidos_error,
          solidosFixed,
          mode
        })
      }
    })
  }

  parsedData.value = results
}

// 4. GENERAR FILAS DE VISTA PREVIA
const previewRows = computed(() => {
  return props.flows.map(flow => {
    const flowData = flow.data || {}
    const parsed = parsedData.value.find(p => p.flowId === flow.id)
    const currentMode = isWaterModule.value
      ? (flowData.not_measured ? 'not_measured' : (flowData.tonelaje_solido_fixed || flowData.tonelaje_pulpa_fixed ? 'fixed' : 'adjust'))
      : (flowData.not_measured ? 'not_measured' : (flowData.tonelaje_fixed ? 'fixed' : 'adjust'))
    const selectedMode = adjustmentModes.value[flow.id] || currentMode
    const modeChanged = selectedMode !== currentMode

    if (!isWaterModule.value) {
      const currentLeyes = {}
      props.elementNames.forEach(name => {
        const el = (flowData.elementos || []).find(e => e.name === name)
        currentLeyes[name] = el?.ley
      })

      const hasNewTonelaje = parsed && parsed.tonelaje !== null && parsed.tonelaje !== undefined
      const newTonelaje = hasNewTonelaje ? parsed.tonelaje : flowData.tonelaje
      const newTonelajeError = parsed?.tonelaje_error != null ? parsed.tonelaje_error : flowData.tonelaje_error

      const newLeyes = {}
      const newLeyesError = {}
      let hasAnyElementChange = false

      props.elementNames.forEach(name => {
        if (parsed && parsed.elementos && parsed.elementos[name] !== null && parsed.elementos[name] !== undefined) {
          newLeyes[name] = parsed.elementos[name]
          hasAnyElementChange = true
        } else {
          newLeyes[name] = currentLeyes[name]
        }
        if (parsed && parsed.elementosError && parsed.elementosError[name] != null) {
          newLeyesError[name] = parsed.elementosError[name]
        }
      })

      const hasChanges = modeChanged ||
        (hasNewTonelaje && Number(newTonelaje) !== Number(flowData.tonelaje)) ||
        props.elementNames.some(name => newLeyes[name] !== undefined && Number(newLeyes[name]) !== Number(currentLeyes[name]))

      return {
        id: flow.id,
        sourceLabel: getNodeLabel(flow.source),
        targetLabel: getNodeLabel(flow.target),
        matched: !!parsed || modeChanged,
        currentTonelaje: flowData.tonelaje,
        hasNewTonelaje,
        newTonelaje,
        newTonelajeError,
        currentLeyes,
        hasNewLeyes: hasAnyElementChange,
        newLeyes,
        newLeyesError,
        hasChanges
      }
    } else {
      // Agua: Sólido Seco (tph) y % Sólidos
      const currentSolido = flowData.tonelaje_solido != null
        ? flowData.tonelaje_solido
        : (flowData.tonelaje_pulpa && flowData.porcentaje_solidos ? (flowData.tonelaje_pulpa * flowData.porcentaje_solidos / 100) : 30.0)
      const currentSolidoError = flowData.tonelaje_solido_error != null
        ? flowData.tonelaje_solido_error
        : (flowData.tonelaje_pulpa_error ? flowData.tonelaje_pulpa_error * 0.3 : 1.0)

      const hasNewSolido = parsed && parsed.tonelaje_solido !== null && parsed.tonelaje_solido !== undefined
      const newSolido = hasNewSolido ? parsed.tonelaje_solido : currentSolido
      const newSolidoError = parsed?.tonelaje_solido_error != null ? parsed.tonelaje_solido_error : currentSolidoError

      const hasNewSolidos = parsed && parsed.porcentaje_solidos !== null && parsed.porcentaje_solidos !== undefined
      const newSolidos = hasNewSolidos ? parsed.porcentaje_solidos : flowData.porcentaje_solidos
      const newSolidosError = parsed?.porcentaje_solidos_error != null ? parsed.porcentaje_solidos_error : flowData.porcentaje_solidos_error

      const currentSolidosFixed = !!flowData.porcentaje_solidos_fixed
      const selectedSolidosFixed = solidosFixedModes.value[flow.id] !== undefined ? solidosFixedModes.value[flow.id] : currentSolidosFixed
      const solidosFixedChanged = selectedSolidosFixed !== currentSolidosFixed

      const hasChanges = modeChanged || solidosFixedChanged ||
        (hasNewSolido && Number(newSolido) !== Number(currentSolido)) ||
        (hasNewSolidos && Number(newSolidos) !== Number(flowData.porcentaje_solidos))

      return {
        id: flow.id,
        sourceLabel: getNodeLabel(flow.source),
        targetLabel: getNodeLabel(flow.target),
        matched: !!parsed || modeChanged || solidosFixedChanged,
        currentSolido,
        hasNewSolido,
        newSolido,
        newSolidoError,
        currentSolidos: flowData.porcentaje_solidos,
        currentSolidosFixed,
        hasNewSolidos,
        newSolidos,
        newSolidosError,
        hasChanges
      }
    }
  })
})

const matchedCount = computed(() => {
  return previewRows.value.filter(r => r.matched).length
})

const changedCount = computed(() => {
  return previewRows.value.filter(r => r.hasChanges).length
})

const hasAnyChanges = computed(() => {
  return changedCount.value > 0 || matchedCount.value > 0
})

// 5. APLICAR CAMBIOS
function applyChanges() {
  const updates = []

  previewRows.value.forEach(row => {
    const mode = adjustmentModes.value[row.id] || 'adjust'
    const isFixed = mode === 'fixed'
    const isNotMeasured = mode === 'not_measured'

    if (!isWaterModule.value) {
      const elementosData = props.elementNames.map(name => {
        const val = row.hasNewLeyes && row.newLeyes[name] !== undefined ? row.newLeyes[name] : row.currentLeyes[name]
        const err = row.newLeyesError && row.newLeyesError[name] != null ? row.newLeyesError[name] : undefined
        return {
          name,
          ley: val,
          ley_error: err
        }
      })

      updates.push({
        id: row.id,
        tonelaje: row.hasNewTonelaje ? row.newTonelaje : row.currentTonelaje,
        tonelaje_error: row.newTonelajeError != null ? row.newTonelajeError : undefined,
        tonelaje_fixed: isFixed,
        not_measured: isNotMeasured,
        elementos: elementosData
      })
    } else {
      updates.push({
        id: row.id,
        tonelaje_solido: row.hasNewSolido ? row.newSolido : row.currentSolido,
        tonelaje_solido_error: row.newSolidoError != null ? row.newSolidoError : undefined,
        tonelaje_solido_fixed: isFixed,
        not_measured: isNotMeasured,
        porcentaje_solidos: row.hasNewSolidos ? row.newSolidos : row.currentSolidos,
        porcentaje_solidos_error: row.newSolidosError != null ? row.newSolidosError : undefined,
        porcentaje_solidos_fixed: !!solidosFixedModes.value[row.id]
      })
    }
  })

  emit('apply', updates)
  emit('close')
}

// Inicializar cuando se abre el modal
watch(() => props.visible, (val) => {
  if (val) {
    initAdjustmentModes()
    nextTick(() => {
      if (textareaRef.value) {
        textareaRef.value.focus()
      }
      reparse()
    })
  } else {
    rawPastedText.value = ''
    parsedData.value = []
    toastMessage.value = ''
  }
})
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 980px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalEnter 0.2s ease-out;
}

@keyframes modalEnter {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  padding: 16px 20px;
  background: #1e293b;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  font-size: 1.8rem;
}

.header-title h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.header-subtitle {
  margin: 2px 0 0 0;
  font-size: 0.8rem;
  color: #94a3b8;
}

.close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.6rem;
  line-height: 1;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.15s;
}

.close-btn:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

.modal-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* TARJETA DE INSTRUCCIONES */
.instructions-card {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
}

.instruction-step {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.82rem;
  color: #475569;
  line-height: 1.35;
}

.step-num {
  background: #3b82f6;
  color: white;
  font-weight: 700;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  flex-shrink: 0;
}

/* BARRA DE ACCIONES */
.toolbar-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.btn-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 7px 12px;
  border-radius: 6px;
  font-size: 0.825rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-copy {
  background-color: #eff6ff;
  color: #1d4ed8;
  border-color: #bfdbfe;
}
.btn-copy:hover {
  background-color: #dbeafe;
}

.btn-paste {
  background-color: #f0fdf4;
  color: #15803d;
  border-color: #bbf7d0;
}
.btn-paste:hover {
  background-color: #dcfce7;
}

.btn-clear {
  background-color: #fef2f2;
  color: #b91c1c;
  border-color: #fecaca;
}
.btn-clear:hover {
  background-color: #fee2e2;
}

.format-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.825rem;
  color: #475569;
}

.format-selector select {
  padding: 6px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.825rem;
  background: white;
  color: #1e293b;
}

/* ZONA DE PEGADO */
.paste-zone {
  position: relative;
}

.paste-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 2px dashed #94a3b8;
  border-radius: 8px;
  font-family: 'Roboto Mono', monospace;
  font-size: 0.825rem;
  line-height: 1.4;
  background-color: #fdfdfd;
  resize: vertical;
  min-height: 70px;
  transition: all 0.2s;
}

.paste-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  background-color: #ffffff;
  border-style: solid;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.toast-notice {
  position: absolute;
  bottom: 12px;
  right: 14px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  animation: fadeIn 0.2s ease;
}

.toast-notice.success { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
.toast-notice.warning { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.toast-notice.info { background: #e0f2fe; color: #075985; border: 1px solid #bae6fd; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* SECCIÓN DE VISTA PREVIA */
.preview-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-header h4 {
  margin: 0;
  font-size: 0.95rem;
  color: #1e293b;
  font-weight: 600;
}

.badge-count {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 12px;
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #cbd5e1;
}

.badge-count.has-matches {
  background: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
}

.table-container {
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.825rem;
  white-space: nowrap;
}

.preview-table th {
  position: sticky;
  top: 0;
  background: #f8fafc;
  padding: 8px 10px;
  text-align: left;
  border-bottom: 2px solid #cbd5e1;
  color: #475569;
  font-weight: 600;
  z-index: 2;
}

.preview-table td {
  padding: 6px 10px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.empty-cell {
  text-align: center;
  color: #94a3b8;
  padding: 20px;
}

.row-matched {
  background-color: #ffffff;
}

.row-unmatched {
  background-color: #fafafa;
  color: #94a3b8;
}

.id-cell {
  font-family: 'Roboto Mono', monospace;
  font-weight: 600;
  color: #3b82f6;
}

.flow-name-cell {
  font-weight: 500;
}

.source-node { color: #1e293b; }
.arrow-sep { color: #94a3b8; margin: 0 4px; }
.target-node { color: #1e293b; }

/* SELECTOR DE MODO DE AJUSTE */
.col-adjustment {
  width: 140px;
}

.select-mode {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.775rem;
  font-weight: 600;
  border: 1px solid #cbd5e1;
  cursor: pointer;
  outline: none;
  transition: all 0.15s;
}

.select-mode.mode-adjust {
  background-color: #eff6ff;
  color: #1d4ed8;
  border-color: #bfdbfe;
}

.select-mode.mode-fixed {
  background-color: #fef3c7;
  color: #92400e;
  border-color: #fde68a;
}

.select-mode.mode-not_measured {
  background-color: #f1f5f9;
  color: #475569;
  border-color: #cbd5e1;
}

.value-cell {
  font-family: 'Roboto Mono', monospace;
}

.curr-val {
  color: #64748b;
  font-size: 0.8rem;
}

.new-val {
  color: #16a34a;
  font-weight: 600;
  font-size: 0.825rem;
}

.err-hint {
  font-size: 0.7rem;
  color: #6b7280;
  font-weight: normal;
  margin-left: 2px;
}

.solidos-fixed-toggle-row {
  margin-top: 4px;
}

.badge-toggle-solidos {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.badge-toggle-solidos.is-fixed {
  background-color: #fef3c7;
  color: #92400e;
  border-color: #fde68a;
}

.badge-toggle-solidos.is-adjust {
  background-color: #eff6ff;
  color: #1d4ed8;
  border-color: #bfdbfe;
}

.badge-fixed-hint {
  font-size: 0.68rem;
  background-color: #fef3c7;
  color: #92400e;
  padding: 1px 4px;
  border-radius: 4px;
  margin-left: 4px;
  font-weight: bold;
}

.status-col {
  text-align: center;
}

.badge {
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

.badge-success { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
.badge-neutral { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }
.badge-pending { background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; }

/* PIE DEL MODAL */
.modal-footer {
  padding: 12px 20px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  border-color: #cbd5e1;
  color: #475569;
}
.btn-secondary:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.btn-primary {
  background: #2563eb;
  color: white;
}
.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}
</style>
