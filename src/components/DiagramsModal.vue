<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-content">
      <header class="modal-header">
        <h2>📁 Gestor de Diagramas</h2>
        <button class="close-button" @click="$emit('close')">✕</button>
      </header>

      <!-- PESTAÑAS -->
      <nav class="modal-tabs">
        <button 
          :class="{ active: activeTab === 'list' }" 
          @click="activeTab = 'list'; fetchDiagrams()"
        >
          📂 Mis Diagramas ({{ diagrams.length }})
        </button>
        <button 
          :class="{ active: activeTab === 'save' }" 
          @click="activeTab = 'save'"
        >
          💾 Guardar Actual
        </button>
        <button 
          :class="{ active: activeTab === 'file' }" 
          @click="activeTab = 'file'"
        >
          📄 Archivo JSON
        </button>
      </nav>

      <!-- MENSAJES DE ALERTA -->
      <div v-if="feedbackMessage" :class="['alert', feedbackType]">
        {{ feedbackMessage }}
      </div>

      <!-- CONTENIDO DE PESTAÑAS -->
      <main class="modal-body">
        <!-- PESTAÑA 1: LISTA DE DIAGRAMAS EN SQLITE -->
        <div v-if="activeTab === 'list'" class="tab-pane">
          <div v-if="isLoading" class="loading-state">
            <span class="spinner"></span> Cargando diagramas desde el servidor...
          </div>
          
          <div v-else-if="diagrams.length === 0" class="empty-state">
            <p>No tienes ningún diagrama guardado en el servidor todavía.</p>
            <button class="btn btn-primary" @click="activeTab = 'save'">
              💾 Guardar el diagrama actual
            </button>
          </div>

          <div v-else class="diagrams-list">
            <div 
              v-for="diag in diagrams" 
              :key="diag.id" 
              class="diagram-card"
            >
              <div class="diagram-info">
                <div class="diagram-title-row">
                  <h4 class="diagram-name">{{ diag.name }}</h4>
                  <span :class="['badge', `badge-${diag.module}`]">
                    {{ diag.module === 'water' ? '💧 Agua' : '⚖️ Leyes' }}
                  </span>
                </div>
                <p v-if="diag.description" class="diagram-desc">{{ diag.description }}</p>
                <span class="diagram-date">📅 {{ formatDate(diag.updated_at) }}</span>
              </div>
              <div class="diagram-actions">
                <button 
                  class="btn btn-load" 
                  @click="handleLoad(diag.id)"
                  :disabled="isLoading"
                >
                  📥 Cargar
                </button>
                <button 
                  class="btn btn-delete" 
                  @click="handleDelete(diag.id, diag.name)"
                  :disabled="isLoading"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- PESTAÑA 2: GUARDAR ACTUAL EN SQLITE -->
        <div v-if="activeTab === 'save'" class="tab-pane">
          <form @submit.prevent="handleSave">
            <div class="form-group">
              <label for="diagram-name">Nombre del Diagrama *</label>
              <input 
                id="diagram-name"
                v-model.trim="saveForm.name" 
                type="text" 
                placeholder="Ej. Circuito Flotación Rougher - Prueba A"
                required
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label for="diagram-desc">Descripción o notas (opcional)</label>
              <textarea 
                id="diagram-desc"
                v-model.trim="saveForm.description" 
                rows="3" 
                placeholder="Notas técnicas, fecha de campaña de muestreo, tonelaje esperado..."
                class="form-input"
              ></textarea>
            </div>

            <div class="summary-box">
              <p><strong>Módulo actual:</strong> {{ currentModule === 'water' ? '💧 Balance de Agua' : '⚖️ Balance de Leyes' }}</p>
              <p><strong>Elementos en circuito:</strong> {{ currentNodesCount }} celdas/nodos, {{ currentEdgesCount }} flujos.</p>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" @click="$emit('close')">
                Cancelar
              </button>
              <button type="submit" class="btn btn-primary" :disabled="isLoading || !saveForm.name">
                <span v-if="isLoading" class="spinner-small"></span>
                💾 Guardar en Servidor
              </button>
            </div>
          </form>
        </div>

        <!-- PESTAÑA 3: ARCHIVOS LOCALES (.JSON) -->
        <div v-if="activeTab === 'file'" class="tab-pane">
          <div class="file-options-grid">
            <div class="file-option-card">
              <h4>Descargar Archivo JSON</h4>
              <p>Guarda una copia de respaldo en tu computadora.</p>
              <button class="btn btn-primary" @click="$emit('export-json')">
                💾 Descargar .json
              </button>
            </div>

            <div class="file-option-card">
              <h4>Cargar desde Archivo JSON</h4>
              <p>Abre un diagrama guardado previamente en tu disco.</p>
              <label class="btn btn-secondary btn-file">
                📂 Seleccionar archivo .json
                <input 
                  type="file" 
                  accept=".json" 
                  @change="$emit('import-json', $event)" 
                  style="display: none;" 
                />
              </label>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../services/api'

const props = defineProps({
  currentModule: {
    type: String,
    default: 'metallurgical'
  },
  currentNodesCount: {
    type: Number,
    default: 0
  },
  currentEdgesCount: {
    type: Number,
    default: 0
  },
  currentDiagramData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'load-diagram-data', 'export-json', 'import-json'])

const activeTab = ref('list')
const diagrams = ref([])
const isLoading = ref(false)
const feedbackMessage = ref('')
const feedbackType = ref('info')

const saveForm = ref({
  name: '',
  description: ''
})

function showFeedback(msg, type = 'info') {
  feedbackMessage.value = msg
  feedbackType.value = type
  setTimeout(() => {
    feedbackMessage.value = ''
  }, 4000)
}

function formatDate(isoString) {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    return d.toLocaleString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  } catch (_) {
    return isoString
  }
}

async function fetchDiagrams() {
  isLoading.value = true
  try {
    diagrams.value = await api.getDiagrams()
  } catch (err) {
    showFeedback(`Error al cargar lista: ${err.message}`, 'error')
  } finally {
    isLoading.value = false
  }
}

async function handleSave() {
  if (!saveForm.value.name) return
  isLoading.value = true
  try {
    await api.saveDiagram({
      name: saveForm.value.name,
      description: saveForm.value.description,
      module: props.currentModule,
      data: props.currentDiagramData
    })
    showFeedback('¡Diagrama guardado exitosamente en el servidor!', 'success')
    saveForm.value.name = ''
    saveForm.value.description = ''
    await fetchDiagrams()
    activeTab.value = 'list'
  } catch (err) {
    showFeedback(`Error al guardar: ${err.message}`, 'error')
  } finally {
    isLoading.value = false
  }
}

async function handleLoad(id) {
  isLoading.value = true
  try {
    const fullDiagram = await api.getDiagram(id)
    emit('load-diagram-data', fullDiagram.data)
    emit('close')
  } catch (err) {
    showFeedback(`Error al abrir diagrama: ${err.message}`, 'error')
  } finally {
    isLoading.value = false
  }
}

async function handleDelete(id, name) {
  if (!confirm(`¿Estás seguro de que deseas eliminar el diagrama "${name}"?`)) return
  isLoading.value = true
  try {
    await api.deleteDiagram(id)
    showFeedback(`Diagrama "${name}" eliminado.`, 'success')
    await fetchDiagrams()
  } catch (err) {
    showFeedback(`Error al eliminar: ${err.message}`, 'error')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchDiagrams()
})
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.65);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(3px);
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 680px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #1e293b;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: #64748b;
  padding: 4px;
}
.close-button:hover { color: #0f172a; }

.modal-tabs {
  display: flex;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.modal-tabs button {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: none;
  font-weight: 500;
  font-size: 0.9rem;
  color: #64748b;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.modal-tabs button.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
  background: white;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.alert {
  margin: 12px 20px 0;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 0.875rem;
}
.alert.success { background: #dcfce7; color: #15803d; }
.alert.error { background: #fee2e2; color: #b91c1c; }
.alert.info { background: #e0f2fe; color: #0369a1; }

.diagrams-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.diagram-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  transition: box-shadow 0.2s;
}
.diagram-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.diagram-info { flex: 1; }
.diagram-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.diagram-name {
  margin: 0;
  font-size: 1rem;
  color: #0f172a;
}
.badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
}
.badge-metallurgical { background: #e0e7ff; color: #4338ca; }
.badge-water { background: #cffafe; color: #0891b2; }

.diagram-desc {
  margin: 0 0 4px;
  font-size: 0.85rem;
  color: #64748b;
}
.diagram-date {
  font-size: 0.75rem;
  color: #94a3b8;
}

.diagram-actions {
  display: flex;
  gap: 8px;
  margin-left: 12px;
}

.form-group {
  margin-bottom: 16px;
}
.form-group label {
  display: block;
  font-weight: 500;
  font-size: 0.875rem;
  color: #334155;
  margin-bottom: 6px;
}
.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.95rem;
  box-sizing: border-box;
}
.form-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.summary-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px 14px;
  font-size: 0.85rem;
  color: #475569;
  margin-bottom: 20px;
}
.summary-box p { margin: 4px 0; }

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}
.btn-primary { background: #2563eb; color: white; }
.btn-primary:hover { background: #1d4ed8; }
.btn-secondary { background: #f1f5f9; color: #334155; border-color: #cbd5e1; }
.btn-secondary:hover { background: #e2e8f0; }
.btn-load { background: #10b981; color: white; }
.btn-load:hover { background: #059669; }
.btn-delete { background: #fee2e2; color: #dc2626; padding: 8px 10px; }
.btn-delete:hover { background: #fecaca; }

.file-options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.file-option-card {
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  background: #f8fafc;
}
.file-option-card h4 { margin: 0 0 8px; color: #1e293b; }
.file-option-card p { font-size: 0.85rem; color: #64748b; margin-bottom: 16px; }
.btn-file { display: inline-block; cursor: pointer; }

.loading-state, .empty-state {
  text-align: center;
  padding: 30px;
  color: #64748b;
}
</style>
