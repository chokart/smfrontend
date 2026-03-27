<template>
  <div class="app-layout">
    <!-- BARRA LATERAL (SIDEBAR) -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h3>SUITE MINERALS</h3>
      </div>
      <nav class="sidebar-nav">
        <button 
          :class="{ active: activeModule === 'metallurgical' }" 
          @click="switchModule('metallurgical')"
        >
          <span class="icon">⚖️</span> Balance de Leyes
        </button>
        <button 
          :class="{ active: activeModule === 'water' }" 
          @click="switchModule('water')"
        >
          <span class="icon">💧</span> Balance de Agua
        </button>
      </nav>
      <div class="sidebar-footer">
        <p>Desarrollado por:</p>
        <a href="https://www.linkedin.com/in/lchoquehuancaa/" target="_blank" rel="noopener noreferrer">
          Luis Choquehuanca
        </a>
      </div>
    </aside>

    <!-- CONTENIDO PRINCIPAL -->
    <div class="content-wrapper" :class="`module-${activeModule}`">
      <LoadingSpinner v-if="isLoading" />
      
      <!-- CABECERA SUPERIOR (TOOLBAR) -->
      <div class="app-header">
        <Toolbar 
          @add-node="addNewNode" 
          @export="reconcile" 
          @open-config="isConfigPanelVisible = true" 
          @save-diagram="handleSaveDiagram"
          @load-diagram="handleLoadDiagram"
          @view-report="isReportModalVisible = true"
          @verify-equations="handleVerifyEquations"
          :reportAvailable="!!reconciliationReport"
          :showConfig="activeModule === 'metallurgical'"
          :addNodeLabel="activeModule === 'water' ? 'Añadir Cajón' : 'Añadir Celda'"
        />
      </div>
      
      <!-- PANELES DE PROPIEDADES DINÁMICOS -->
      <PropertiesPanel 
        v-if="activeModule === 'metallurgical'"
        :modelValue="selectedElement" 
        @update:modelValue="handlePropertiesUpdate"
      />
      <WaterPropertiesPanel 
        v-if="activeModule === 'water'"
        :modelValue="selectedElement" 
        @update:modelValue="handlePropertiesUpdate"
      />
      
      <div class="main-content">
        <MetallurgicalDiagram 
          ref="diagramRef"
          :key="activeModule"
          :nodes="initialNodes" 
          :edges="initialEdges"
          @connect="onConnect"
          @element-click="handleSelection"
        />
      </div>
      
      <div class="summary-footer" :class="{ 'is-expanded': isSummaryExpanded }">
        <button @click="toggleSummaryExpansion" class="summary-toggle-button">
          {{ isSummaryExpanded ? '▼ Contraer' : '▲ Expandir' }}
        </button>
        
        <!-- TABLAS DE RESUMEN DINÁMICAS -->
        <template v-if="activeModule === 'metallurgical'">
          <FlowsSummaryTable :nodes="currentNodes" :flows="currentEdges" :element-names="elementNames" />
          <NodesSummaryTable :nodes="currentNodes" :flows="currentEdges" :element-names="elementNames" />
        </template>
        <template v-else>
          <WaterFlowsSummaryTable :nodes="currentNodes" :flows="currentEdges" />
          <NodesSummaryTable :nodes="currentNodes" :flows="currentEdges" :element-names="[]" />
        </template>
      </div>

      <ReporteModal 
        :visible="isReportModalVisible" 
        :report="reconciliationReport" 
        @close="isReportModalVisible = false"
      />
      <EquationsModal
        :visible="isEquationsModalVisible"
        :equations="equationsList"
        @close="isEquationsModalVisible = false"
      />

      <!-- ELEMENT CONFIG PANEL -->
      <ElementConfigPanel 
        v-if="isConfigPanelVisible && activeModule === 'metallurgical'" 
        :elements="elementNames" 
        @close="isConfigPanelVisible = false" 
        @save="handleSaveElements" 
      />
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, computed } from 'vue'
import MetallurgicalDiagram from './components/MetallurgicalDiagram.vue'
import Toolbar from './components/Toolbar.vue'
import PropertiesPanel from './components/PropertiesPanel.vue'
import WaterPropertiesPanel from './components/WaterPropertiesPanel.vue'
import FlowsSummaryTable from './components/FlowsSummaryTable.vue'
import WaterFlowsSummaryTable from './components/WaterFlowsSummaryTable.vue'
import NodesSummaryTable from './components/NodesSummaryTable.vue'
import ElementConfigPanel from './components/ElementConfigPanel.vue'
import LoadingSpinner from './components/LoadingSpinner.vue'
import ReporteModal from './components/ReporteModal.vue'
import EquationsModal from './components/EquationsModal.vue'

// --- ESTADO REACTIVO PRINCIPAL ---
const activeModule = ref('metallurgical') // 'metallurgical' | 'water'
let id = 5
const elementNames = ref(['Cu'])
const isConfigPanelVisible = ref(false)
const isLoading = ref(false)
const isReportModalVisible = ref(false)
const reconciliationReport = ref(null)
const isEquationsModalVisible = ref(false);
const equationsList = ref([]);
const isSummaryExpanded = ref(false);

const diagramRef = ref(null); // Ref to the MetallurgicalDiagram component

const initialNodes = ref([])
const initialEdges = ref([])
const selectedElement = ref(null)

// Reactive state for summary tables, syncing with diagram store if available
const currentNodes = computed(() => {
  if (diagramRef.value && diagramRef.value.nodes) return diagramRef.value.nodes;
  return initialNodes.value;
});

const currentEdges = computed(() => {
  if (diagramRef.value && diagramRef.value.edges) return diagramRef.value.edges;
  return initialEdges.value;
});

// Helper functions (updated to use computed)
const getNodes = () => currentNodes.value;
const getEdges = () => currentEdges.value;

const createDefaultElementData = (name) => ({
  name,
  ley: 1.0,
  ley_error: 0.1,
  ley_fixed: false,
  not_measured: false,
  corrected_data: null,
})

const createDefaultFlowData = () => {
  if (activeModule.value === 'water') {
    return {
      tonelaje_pulpa: 100.0,
      tonelaje_pulpa_error: 1.0,
      tonelaje_pulpa_fixed: false,
      not_measured: false,
      porcentaje_solidos: 30.0,
      porcentaje_solidos_error: 0.5,
      porcentaje_solidos_fixed: false,
      corrected_data: null,
    }
  }
  return {
    tonelaje: 100.0,
    tonelaje_error: 1.0,
    tonelaje_fixed: false,
    not_measured: false,
    corrected_tonelaje: null,
    elementos: elementNames.value.map(name => createDefaultElementData(name)),
  }
}

// Inicialización
function initDefaultDiagram() {
  id = 5
  if (activeModule.value === 'water') {
    initialNodes.value = [
      { id: '1', type: 'initial', data: { label: 'Alimento', node_type: 'initial' }, position: { x: 50, y: 200 }, deletable: false },
      { id: '2', type: 'process', data: { label: 'Cajón 1', node_type: 'process' }, position: { x: 400, y: 200 } },
      { id: '3', type: 'product', data: { label: 'Producto 1', node_type: 'product' }, position: { x: 800, y: 100 }, deletable: false },
      { id: '4', type: 'product', data: { label: 'Producto 2', node_type: 'product' }, position: { x: 800, y: 300 }, deletable: false },
    ]
    initialEdges.value = [
      { id: 'e1-2', source: '1', target: '2', animated: true, data: createDefaultFlowData() },
      { id: 'e2-3', source: '2', target: '3', animated: true, data: createDefaultFlowData() },
      { id: 'e2-4', source: '2', target: '4', animated: true, data: createDefaultFlowData() },
    ]
  } else {
    // Default Metallurgical Diagram
    initialNodes.value = [
      { id: '1', type: 'initial', data: { label: 'Alimento', node_type: 'initial' }, position: { x: 50, y: 200 }, deletable: false },
      { id: '2', type: 'initial', data: { label: 'Concentrado', node_type: 'concentrate' }, position: { x: 800, y: 100 }, deletable: false },
      { id: '3', type: 'initial', data: { label: 'Relave', node_type: 'tailing' }, position: { x: 800, y: 300 }, deletable: false },
      { id: '4', type: 'process', data: { label: 'Celda 1', node_type: 'process' }, position: { x: 400, y: 200 } },
    ]
    initialEdges.value = [
      { id: 'e1-4', source: '1', target: '4', animated: true, data: createDefaultFlowData() },
      { id: 'e4-2', source: '4', target: '2', animated: true, data: createDefaultFlowData() },
      { id: 'e4-3', source: '4', target: '3', animated: true, data: createDefaultFlowData() },
    ]
  }
}
initDefaultDiagram()

function switchModule(module) {
  if (confirm(`Al cambiar de módulo se reiniciará el diagrama actual. ¿Deseas continuar?`)) {
    diagramRef.value = null; // Clear ref immediately to prevent stale data usage
    activeModule.value = module
    clearDiagram()
    initDefaultDiagram()
  }
}

// --- MANEJADORES DE EVENTOS DEL DIAGRAMA ---
function onConnect(connection) {
  const newEdge = {
    id: `e${connection.source}-${connection.target}-${Date.now()}`,
    ...connection,
    animated: true,
    data: createDefaultFlowData(),
  }
  // Add edge via diagram ref if available
  if (diagramRef.value && diagramRef.value.addEdges) {
    diagramRef.value.addEdges([newEdge]);
  } else {
    // Fallback for initial state (though this is less likely to work reactively without proper setup)
    initialEdges.value.push(newEdge);
  }
}

function addNewNode() {
  const labelPrefix = activeModule.value === 'water' ? 'Cajón' : 'Celda';
  const newNode = {
    id: `${id++}`,
    type: 'process',
    data: { label: `${labelPrefix} ${id - 4}`, node_type: 'process' },
    position: { x: Math.random() * 400 + 200, y: Math.random() * 200 + 100 },
  }
  if (diagramRef.value) {
    diagramRef.value.addNode(newNode);
  } else {
    initialNodes.value.push(newNode);
  }
}

function handleSelection(element) {
  selectedElement.value = element
}

function handlePropertiesUpdate(payload) {
  if (!payload) {
    selectedElement.value = null;
    return;
  }
  if (selectedElement.value) {
    // Ideally we should update the store node/edge directly.
    // Since selectedElement is likely a reference to the reactive object from the store (via getNodes/getEdges),
    // modifying it here should be fine.
    selectedElement.value.data = payload.data;
  }
}

// --- LÓGICA DE NEGOCIO ---
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
console.log('Usando API_URL:', API_URL);

function reconcile() {
  isLoading.value = true;
  reconciliationReport.value = null;

  const currentNodes = getNodes();
  const currentEdges = getEdges();

  let endpoint = `${API_URL}/reconcile`;
  console.log('Llamando a endpoint:', endpoint);
  let body = {};

  if (activeModule.value === 'metallurgical') {
    body = {
      nodes: currentNodes.map(n => ({ id: n.id, label: n.data.label, node_type: n.data.node_type })),
      flows: currentEdges.map(f => ({
        id: f.id, source: f.source, target: f.target,
        data: {
          tonelaje: f.data.tonelaje,
          tonelaje_error: f.data.tonelaje_error,
          tonelaje_fixed: f.data.tonelaje_fixed,
          not_measured: f.data.not_measured,
          elementos: f.data.elementos.map(el => ({ ...el }))
        }
      }))
    };
  } else {
    endpoint = `${API_URL}/reconcile/water`;
    body = {
      nodes: currentNodes.map(n => ({ id: n.id, label: n.data.label, node_type: n.data.node_type })),
      flows: currentEdges.map(f => ({
        id: f.id, source: f.source, target: f.target,
        data: {
          tonelaje_pulpa: f.data.tonelaje_pulpa,
          tonelaje_pulpa_error: f.data.tonelaje_pulpa_error,
          tonelaje_pulpa_fixed: f.data.tonelaje_pulpa_fixed,
          not_measured: f.data.not_measured,
          porcentaje_solidos: f.data.porcentaje_solidos,
          porcentaje_solidos_error: f.data.porcentaje_solidos_error,
          porcentaje_solidos_fixed: f.data.porcentaje_solidos_fixed
        }
      }))
    };
  }

  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  .then(res => res.ok ? res.json() : res.json().then(e => { throw new Error(e.detail) }))
  .then(data => {
    data.flows.forEach(rf => {
      const flow = currentEdges.find(e => e.id === rf.id);
      if (flow) {
        if (activeModule.value === 'metallurgical') {
          flow.data.corrected_tonelaje = rf.corrected_data.tonelaje_corregido;
          rf.corrected_data.elementos.forEach(re => {
            const el = flow.data.elementos.find(e => e.name === re.name);
            if (el) el.corrected_data = { ...re };
          });
        } else {
          flow.data.corrected_data = rf.corrected_data;
        }
      }
    });
    reconciliationReport.value = data.report;
    alert(`Reconciliación de ${activeModule.value === 'water' ? 'Agua' : 'Leyes'} completada.`);
  })
  .catch(err => alert(`Error: ${err.message}`))
  .finally(() => isLoading.value = false);
}

function handleVerifyEquations() {
  if (activeModule.value === 'metallurgical' && elementNames.value.length === 0) {
    alert('Por favor, configure al menos un elemento antes de verificar las ecuaciones.');
    return;
  }

  isLoading.value = true;
  equationsList.value = [];

  const currentNodes = getNodes();
  const currentEdges = getEdges();

  let endpoint = '';
  let exportObject = {};

  if (activeModule.value === 'metallurgical') {
    endpoint = `${API_URL}/preview-equations`;
    exportObject = {
      nodes: currentNodes.map(n => ({ id: n.id, label: n.data.label, node_type: n.data.node_type })),
      flows: currentEdges.map(f => ({
        id: f.id,
        source: f.source,
        target: f.target,
        data: {
          tonelaje: f.data.tonelaje,
          tonelaje_error: f.data.tonelaje_error,
          tonelaje_fixed: f.data.tonelaje_fixed,
          not_measured: f.data.not_measured,
          elementos: f.data.elementos.map(el => ({
            name: el.name,
            ley: el.ley,
            ley_error: el.ley_error,
            ley_fixed: el.ley_fixed,
            not_measured: el.not_measured,
          })),
        },
      })),
    };
  } else {
    endpoint = `${API_URL}/preview-water-equations`;
    exportObject = {
      nodes: currentNodes.map(n => ({ id: n.id, label: n.data.label, node_type: n.data.node_type })),
      flows: currentEdges.map(f => ({
        id: f.id,
        source: f.source,
        target: f.target,
        data: {
          tonelaje_pulpa: f.data.tonelaje_pulpa,
          tonelaje_pulpa_error: f.data.tonelaje_pulpa_error,
          tonelaje_pulpa_fixed: f.data.tonelaje_pulpa_fixed,
          not_measured: f.data.not_measured,
          porcentaje_solidos: f.data.porcentaje_solidos,
          porcentaje_solidos_error: f.data.porcentaje_solidos_error,
          porcentaje_solidos_fixed: f.data.porcentaje_solidos_fixed,
          porcentaje_solidos_not_measured: f.data.porcentaje_solidos_not_measured || false
        },
      })),
    };
  }

  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(exportObject),
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(err => { 
        throw new Error(err.detail || 'Error en la respuesta del servidor');
      });
    }
    return response.json();
  })
  .then(data => {
    equationsList.value = data.equations;
    isEquationsModalVisible.value = true;
  })
  .catch(error => {
    console.error(`Error al verificar ecuaciones:`, error);
    alert(`Error al verificar ecuaciones: ${error.message}`);
  })
  .finally(() => {
    isLoading.value = false;
  });
}

function handleSaveDiagram() {
  const currentNodes = getNodes();
  const currentEdges = getEdges();
  const data = { nodes: currentNodes, edges: currentEdges, activeModule: activeModule.value, elementNames: elementNames.value };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `diagrama-${activeModule.value}.json`;
  a.click();
}

function handleLoadDiagram(data) {
  if (data && data.nodes && data.edges) {
    activeModule.value = data.activeModule || 'metallurgical';
    initialNodes.value = data.nodes;
    initialEdges.value = data.edges;
    elementNames.value = data.elementNames || ['Cu'];
    alert('Diagrama cargado.');
  } else {
    alert('Error: El archivo no tiene el formato de diagrama esperado.');
  }
}

function clearDiagram() {
  initialNodes.value = [];
  initialEdges.value = [];
  selectedElement.value = null;
  reconciliationReport.value = null;
}

function handleSaveElements(newNames) {
  elementNames.value = newNames;
  const currentEdges = getEdges();
  // We need to update edges in the store.
  // We can iterate and update data.
  currentEdges.forEach(edge => {
    edge.data.elementos = newNames.map(name => {
      const ex = edge.data.elementos.find(el => el.name === name);
      return ex ? ex : createDefaultElementData(name);
    });
  });
}

function toggleSummaryExpansion() {
  isSummaryExpanded.value = !isSummaryExpanded.value;
}
</script>

<style>
body {
  margin: 0;
}
.app-layout {
  display: flex;
  flex-direction: row; /* Cambio a fila para el sidebar */
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: #f5f7fa;
}

/* --- ESTILOS DE LA BARRA LATERAL (SIDEBAR) --- */
.sidebar {
  width: 260px;
  background: #2c3e50;
  color: #ecf0f1;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-right: 1px solid #34495e;
  box-shadow: 2px 0 5px rgba(0,0,0,0.1);
}
.sidebar-header {
  padding: 20px;
  background: #34495e;
  text-align: center;
}
.sidebar-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #ffffff;
}
.sidebar-nav {
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 10px;
}
.sidebar-nav button {
  background: transparent;
  color: #bdc3c7;
  border: none;
  padding: 12px 15px;
  text-align: left;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 12px;
}
.sidebar-nav button:hover {
  background: #34495e;
  color: #fff;
}
.sidebar-nav button.active {
  background: #3498db;
  color: #fff;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
.sidebar-nav button.active .icon {
  transform: scale(1.1);
}

/* --- ESTILOS DEL PIE DE LA BARRA LATERAL --- */
.sidebar-footer {
  margin-top: auto;
  padding: 20px;
  background: #34495e;
  border-top: 1px solid #2c3e50;
  text-align: center;
  font-size: 0.85rem;
}
.sidebar-footer p {
  margin: 0 0 5px 0;
  color: #bdc3c7;
}
.sidebar-footer a {
  color: #3498db;
  text-decoration: none;
  font-weight: bold;
  transition: color 0.2s;
}
.sidebar-footer a:hover {
  color: #5dade2;
  text-decoration: underline;
}

/* --- ESTILOS DEL CONTENEDOR PRINCIPAL --- */
.content-wrapper {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.app-header {
  display: flex;
  align-items: center;
  background: #ffffff;
  padding: 10px 20px;
  border-bottom: 1px solid #e0e0e0;
  z-index: 1000;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.main-content {
  flex-grow: 1;
  position: relative;
  width: 100%;
  height: 100%;
  transition: height 0.4s ease-in-out;
  background-color: #ffffff;
}

/* Footer y otros estilos preexistentes */
.summary-footer {
  flex-shrink: 0;
  max-height: 300px;
  overflow-y: auto;
  background: #f9f9f9;
  box-shadow: 0 -2px 5px rgba(0,0,0,0.1);
  transition: max-height 0.4s ease-in-out;
  position: relative;
  border-top: 1px solid #e0e0e0;
}
.summary-footer.is-expanded {
  max-height: 80vh;
}
.summary-toggle-button {
  position: absolute;
  top: 10px;
  right: 20px;
  z-index: 20;
  padding: 5px 10px;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 20px;
  cursor: pointer;
  font-size: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.summary-toggle-button:hover {
  background-color: #f0f0f0;
}
.vue-flow__node {
  border-width: 2px !important;
}
.vue-flow__edge .vue-flow__edge-path {
  stroke-width: 2.5px !important;
}
.icon { font-size: 1.2rem; }

@media (max-width: 768px) {
  .app-layout {
    flex-direction: column;
  }
  .sidebar {
    width: 100%;
    height: auto;
    flex-direction: row;
    overflow-x: auto;
    border-right: none;
    border-bottom: 1px solid #34495e;
  }
  .sidebar-header {
    display: none; /* Ahorrar espacio en móvil */
  }
  .sidebar-nav {
    flex-direction: row;
    width: 100%;
  }
  .sidebar-nav button {
    flex: 1;
    justify-content: center;
    font-size: 0.9rem;
    padding: 10px;
  }
  .properties-panel {
    position: relative;
    width: 100%;
    top: 0;
    right: 0;
    margin-top: 10px;
    box-sizing: border-box;
  }
  .summary-footer {
    max-height: 250px;
  }
  .summary-footer.is-expanded {
    max-height: 70vh;
  }
}
</style>