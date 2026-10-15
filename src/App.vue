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
        <button 
          :class="{ active: activeModule === 'pulp' }" 
          @click="switchModule('pulp')"
        >
          <span class="icon">🧪</span> Cálculo de Pulpa
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
      <div class="app-header" v-if="activeModule !== 'pulp'">
        <Toolbar 
          @add-node="addNewNode" 
          @export="reconcile" 
          @open-config="isConfigPanelVisible = true" 
          @save-diagram="handleSaveDiagram"
          @load-diagram="handleLoadDiagram"
          @open-diagrams="isDiagramsModalVisible = true"
          @view-report="isReportModalVisible = true"
          @verify-equations="handleVerifyEquations"
          @open-excel="isExcelModalVisible = true"
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
        @delete="handleDeleteSelected"
      />
      <WaterPropertiesPanel 
        v-if="activeModule === 'water'"
        :modelValue="selectedElement" 
        @update:modelValue="handlePropertiesUpdate"
        @delete="handleDeleteSelected"
      />
      
      <div class="main-content">
        <PulpCalculator v-if="activeModule === 'pulp'" />
        <MetallurgicalDiagram 
          v-else
          ref="diagramRef"
          :key="`${activeModule}-${diagramKey}`"
          :nodes="initialNodes" 
          :edges="initialEdges"
          @connect="onConnect"
          @element-click="handleSelection"
        />
      </div>
      
      <div v-if="activeModule !== 'pulp'" class="summary-footer" :class="{ 'is-expanded': isSummaryExpanded }">
        <button @click="toggleSummaryExpansion" class="summary-toggle-button">
          {{ isSummaryExpanded ? '▼ Contraer' : '▲ Expandir' }}
        </button>
        
        <!-- TABLAS DE RESUMEN DINÁMICAS -->
        <template v-if="activeModule === 'metallurgical'">
          <FlowsSummaryTable 
            :nodes="currentNodes" 
            :flows="currentEdges" 
            :element-names="elementNames" 
            @open-excel="isExcelModalVisible = true"
            @update-flow="handleFlowUpdate"
          />
          <NodesSummaryTable :nodes="currentNodes" :flows="currentEdges" :element-names="elementNames" />
        </template>
        <template v-else>
          <WaterFlowsSummaryTable 
            :nodes="currentNodes" 
            :flows="currentEdges" 
            @open-excel="isExcelModalVisible = true"
            @update-flow="handleFlowUpdate"
          />
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
      <DiagramsModal
        v-if="isDiagramsModalVisible"
        :current-module="activeModule"
        :current-nodes-count="currentNodes ? currentNodes.length : 0"
        :current-edges-count="currentEdges ? currentEdges.length : 0"
        :current-diagram-data="getDiagramExportData()"
        @close="isDiagramsModalVisible = false"
        @load-diagram-data="handleLoadDiagramFromModal"
        @export-json="handleSaveDiagram"
        @import-json="handleJsonFileImport"
      />

      <!-- EXCEL FLOWS MODAL -->
      <ExcelFlowsModal
        :visible="isExcelModalVisible"
        :active-module="activeModule"
        :nodes="currentNodes"
        :flows="currentEdges"
        :element-names="elementNames"
        @close="isExcelModalVisible = false"
        @apply="handleApplyExcelData"
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
import PulpCalculator from './components/PulpCalculator.vue'
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
import DiagramsModal from './components/DiagramsModal.vue'
import ExcelFlowsModal from './components/ExcelFlowsModal.vue'
import api from './services/api'

// --- ESTADO REACTIVO PRINCIPAL ---
const activeModule = ref('metallurgical') // 'metallurgical' | 'water'
let id = 5
const diagramKey = ref(0)
const elementNames = ref(['Cu'])
const isConfigPanelVisible = ref(false)
const isDiagramsModalVisible = ref(false)
const isExcelModalVisible = ref(false)
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
      tonelaje_solido: 30.0,
      tonelaje_solido_error: 1.0,
      tonelaje_solido_fixed: false,
      not_measured: false,
      porcentaje_solidos: 30.0,
      porcentaje_solidos_error: 0.5,
      porcentaje_solidos_fixed: false,
      corrected_data: null,
      tonelaje_pulpa: 100.0,
      tonelaje_pulpa_error: 1.0,
      tonelaje_pulpa_fixed: false
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

// Funciones auxiliares para gestión robusta de IDs y nombres de nodos
function updateNextNodeId(nodesList) {
  let maxId = 0;
  if (nodesList && Array.isArray(nodesList)) {
    nodesList.forEach(n => {
      const num = parseInt(n.id, 10);
      if (!isNaN(num) && num > maxId) {
        maxId = num;
      }
    });
  }
  id = Math.max(maxId + 1, 5);
}

function getNextNodeId() {
  const current = getNodes() || [];
  let maxId = 0;
  current.forEach(n => {
    const num = parseInt(n.id, 10);
    if (!isNaN(num) && num > maxId) {
      maxId = num;
    }
  });
  const nextId = Math.max(maxId + 1, id);
  id = nextId + 1;
  return String(nextId);
}

function getNextNodeLabel(prefix) {
  const current = getNodes() || [];
  let maxNum = 0;
  current.forEach(n => {
    const label = n.data?.label || '';
    if (label.startsWith(prefix)) {
      const match = label.match(new RegExp(`^${prefix}\\s*(\\d+)`));
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  });
  return `${prefix} ${maxNum + 1}`;
}

// Inicialización
function initDefaultDiagram() {
  if (activeModule.value === 'water') {
    initialNodes.value = [
      { id: '1', type: 'initial', data: { label: 'Alimento', node_type: 'initial', sourcePosition: 'right' }, position: { x: 50, y: 200 }, sourcePosition: 'right' },
      { id: '2', type: 'process', data: { label: 'Cajón 1', node_type: 'process', sourcePosition: 'right', targetPosition: 'left' }, position: { x: 400, y: 200 }, sourcePosition: 'right', targetPosition: 'left' },
      { id: '3', type: 'product', data: { label: 'Producto 1', node_type: 'product', targetPosition: 'left' }, position: { x: 800, y: 100 }, targetPosition: 'left' },
      { id: '4', type: 'product', data: { label: 'Producto 2', node_type: 'product', targetPosition: 'left' }, position: { x: 800, y: 300 }, targetPosition: 'left' },
    ]
    initialEdges.value = [
      { id: 'e1-2', source: '1', target: '2', type: 'custom', animated: true, data: createDefaultFlowData() },
      { id: 'e2-3', source: '2', target: '3', type: 'custom', animated: true, data: createDefaultFlowData() },
      { id: 'e2-4', source: '2', target: '4', type: 'custom', animated: true, data: createDefaultFlowData() },
    ]
  } else {
    // Default Metallurgical Diagram
    initialNodes.value = [
      { id: '1', type: 'initial', data: { label: 'Alimento', node_type: 'initial', sourcePosition: 'right' }, position: { x: 50, y: 200 }, sourcePosition: 'right' },
      { id: '2', type: 'concentrate', data: { label: 'Concentrado', node_type: 'concentrate', targetPosition: 'left' }, position: { x: 800, y: 100 }, targetPosition: 'left' },
      { id: '3', type: 'tailing', data: { label: 'Relave', node_type: 'tailing', targetPosition: 'left' }, position: { x: 800, y: 300 }, targetPosition: 'left' },
      { id: '4', type: 'process', data: { label: 'Celda 1', node_type: 'process', sourcePosition: 'right', targetPosition: 'left' }, position: { x: 400, y: 200 }, sourcePosition: 'right', targetPosition: 'left' },
    ]
    initialEdges.value = [
      { id: 'e1-4', source: '1', target: '4', type: 'custom', animated: true, data: createDefaultFlowData() },
      { id: 'e4-2', source: '4', target: '2', type: 'custom', animated: true, data: createDefaultFlowData() },
      { id: 'e4-3', source: '4', target: '3', type: 'custom', animated: true, data: createDefaultFlowData() },
    ]
  }
  updateNextNodeId(initialNodes.value);
}
initDefaultDiagram()

function switchModule(module) {
  if (confirm(`Al cambiar de módulo se reiniciará el diagrama actual. ¿Deseas continuar?`)) {
    diagramRef.value = null; // Clear ref immediately to prevent stale data usage
    activeModule.value = module
    clearDiagram()
    initDefaultDiagram()
    diagramKey.value++
  }
}

// --- MANEJADORES DE EVENTOS DEL DIAGRAMA ---
function onConnect(connection) {
  const newEdge = {
    id: `e${connection.source}-${connection.target}-${Date.now()}`,
    ...connection,
    type: 'custom',
    animated: true,
    data: createDefaultFlowData(),
  }
  // Add edge via diagram ref if available
  if (diagramRef.value && diagramRef.value.addEdges) {
    diagramRef.value.addEdges([newEdge]);
  }
  initialEdges.value.push(newEdge);
}

function addNewNode() {
  const labelPrefix = activeModule.value === 'water' ? 'Cajón' : 'Celda';
  const newId = getNextNodeId();
  const newLabel = getNextNodeLabel(labelPrefix);
  const newNode = {
    id: newId,
    type: 'process',
    data: { 
      label: newLabel, 
      node_type: 'process', 
      sourcePosition: 'right', 
      targetPosition: 'left' 
    },
    position: { x: Math.random() * 300 + 250, y: Math.random() * 200 + 100 },
    sourcePosition: 'right',
    targetPosition: 'left'
  }
  if (diagramRef.value && diagramRef.value.addNode) {
    diagramRef.value.addNode(newNode);
  }
  const exists = initialNodes.value.some(n => n.id === newNode.id);
  if (!exists) {
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
    selectedElement.value.data = payload.data;
    if (payload.position) {
      if (payload.data.targetPosition) {
        selectedElement.value.targetPosition = payload.data.targetPosition;
      }
      if (payload.data.sourcePosition) {
        selectedElement.value.sourcePosition = payload.data.sourcePosition;
      }
      if (diagramRef.value && diagramRef.value.updateNodeInternals) {
        nextTick(() => {
          diagramRef.value.updateNodeInternals([payload.id]);
        });
      }
    }
  }
}

function handleDeleteSelected(element) {
  const elem = element || selectedElement.value;
  if (!elem) return;
  const isNode = !!elem.position;
  const label = elem.data ? (elem.data.label || (isNode ? 'Nodo' : 'Flujo')) : (isNode ? 'Nodo' : 'Flujo');
  if (confirm(`¿Deseas eliminar "${label}"?`)) {
    if (diagramRef.value) {
      if (isNode) {
        diagramRef.value.removeNodes([elem.id]);
      } else {
        diagramRef.value.removeEdges([elem.id]);
      }
    }
    if (isNode) {
      initialNodes.value = initialNodes.value.filter(n => n.id !== elem.id);
    } else {
      initialEdges.value = initialEdges.value.filter(e => e.id !== elem.id);
    }
    selectedElement.value = null;
  }
}

// --- LÓGICA DE NEGOCIO ---
async function reconcile() {
  isLoading.value = true;
  reconciliationReport.value = null;

  const currentNodes = getNodes();
  const currentEdges = getEdges();

  try {
    let data;
    if (activeModule.value === 'metallurgical') {
      const body = {
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
      data = await api.reconcile(body);
    } else {
      const body = {
        nodes: currentNodes.map(n => ({ id: n.id, label: n.data.label, node_type: n.data.node_type })),
        flows: currentEdges.map(f => {
          const sVal = f.data.tonelaje_solido != null
            ? f.data.tonelaje_solido
            : (f.data.tonelaje_pulpa && f.data.porcentaje_solidos ? (f.data.tonelaje_pulpa * f.data.porcentaje_solidos / 100) : 30.0);
          const sErr = f.data.tonelaje_solido_error != null
            ? f.data.tonelaje_solido_error
            : (f.data.tonelaje_pulpa_error ? f.data.tonelaje_pulpa_error * 0.3 : 1.0);
          const sFixed = f.data.tonelaje_solido_fixed !== undefined
            ? f.data.tonelaje_solido_fixed
            : !!f.data.tonelaje_pulpa_fixed;

          return {
            id: f.id, source: f.source, target: f.target,
            data: {
              tonelaje_solido: sVal,
              tonelaje_solido_error: sErr,
              tonelaje_solido_fixed: sFixed,
              not_measured: f.data.not_measured,
              porcentaje_solidos: f.data.porcentaje_solidos,
              porcentaje_solidos_error: f.data.porcentaje_solidos_error,
              porcentaje_solidos_fixed: f.data.porcentaje_solidos_fixed,
              tonelaje_pulpa: f.data.tonelaje_pulpa,
              tonelaje_pulpa_error: f.data.tonelaje_pulpa_error,
              tonelaje_pulpa_fixed: sFixed
            }
          };
        })
      };
      data = await api.reconcileWater(body);
    }

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
  } catch (err) {
    alert(`Error: ${err.message}`);
  } finally {
    isLoading.value = false;
  }
}

async function handleVerifyEquations() {
  if (activeModule.value === 'metallurgical' && elementNames.value.length === 0) {
    alert('Por favor, configure al menos un elemento antes de verificar las ecuaciones.');
    return;
  }

  isLoading.value = true;
  equationsList.value = [];

  const currentNodes = getNodes();
  const currentEdges = getEdges();

  try {
    let data;
    if (activeModule.value === 'metallurgical') {
      const exportObject = {
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
      data = await api.previewEquations(exportObject);
    } else {
      const exportObject = {
        nodes: currentNodes.map(n => ({ id: n.id, label: n.data.label, node_type: n.data.node_type })),
        flows: currentEdges.map(f => {
          const sVal = f.data.tonelaje_solido != null
            ? f.data.tonelaje_solido
            : (f.data.tonelaje_pulpa && f.data.porcentaje_solidos ? (f.data.tonelaje_pulpa * f.data.porcentaje_solidos / 100) : 30.0);
          const sErr = f.data.tonelaje_solido_error != null
            ? f.data.tonelaje_solido_error
            : (f.data.tonelaje_pulpa_error ? f.data.tonelaje_pulpa_error * 0.3 : 1.0);
          const sFixed = f.data.tonelaje_solido_fixed !== undefined
            ? f.data.tonelaje_solido_fixed
            : !!f.data.tonelaje_pulpa_fixed;

          return {
            id: f.id,
            source: f.source,
            target: f.target,
            data: {
              tonelaje_solido: sVal,
              tonelaje_solido_error: sErr,
              tonelaje_solido_fixed: sFixed,
              not_measured: f.data.not_measured,
              porcentaje_solidos: f.data.porcentaje_solidos,
              porcentaje_solidos_error: f.data.porcentaje_solidos_error,
              porcentaje_solidos_fixed: f.data.porcentaje_solidos_fixed,
              porcentaje_solidos_not_measured: f.data.porcentaje_solidos_not_measured || false,
              tonelaje_pulpa: f.data.tonelaje_pulpa,
              tonelaje_pulpa_error: f.data.tonelaje_pulpa_error,
              tonelaje_pulpa_fixed: sFixed
            },
          };
        }),
      };
      data = await api.previewWaterEquations(exportObject);
    }

    equationsList.value = data.equations;
    isEquationsModalVisible.value = true;
  } catch (error) {
    console.error(`Error al verificar ecuaciones:`, error);
    alert(`Error al verificar ecuaciones: ${error.message}`);
  } finally {
    isLoading.value = false;
  }
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

function getDiagramExportData() {
  const currentNodes = getNodes();
  const currentEdges = getEdges();
  return {
    nodes: currentNodes,
    edges: currentEdges,
    activeModule: activeModule.value,
    elementNames: elementNames.value
  };
}

function handleLoadDiagramFromModal(data) {
  handleLoadDiagram(data);
  isDiagramsModalVisible.value = false;
}

function handleJsonFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      handleLoadDiagram(data);
      isDiagramsModalVisible.value = false;
    } catch (err) {
      alert('Error: El archivo no es un JSON válido.');
    }
  };
  reader.readAsText(file);
}

function handleLoadDiagram(data) {
  if (data && data.nodes && data.edges) {
    const newModule = data.activeModule || 'metallurgical';
    activeModule.value = newModule;
    
    // Clonación profunda de los nodos y flujos para evitar retener referencias o proxies
    const cleanNodes = JSON.parse(JSON.stringify(data.nodes));
    const cleanEdges = JSON.parse(JSON.stringify(data.edges));
    
    if (newModule === 'water') {
      cleanEdges.forEach(edge => {
        if (edge.data) {
          if (edge.data.tonelaje_solido == null && edge.data.tonelaje_pulpa != null) {
            const cp = Number(edge.data.porcentaje_solidos || 30.0);
            edge.data.tonelaje_solido = Number(edge.data.tonelaje_pulpa) * (cp / 100);
          }
          if (edge.data.tonelaje_solido_error == null && edge.data.tonelaje_pulpa_error != null) {
            edge.data.tonelaje_solido_error = Number(edge.data.tonelaje_pulpa_error) * 0.3;
          }
          if (edge.data.tonelaje_solido_fixed === undefined && edge.data.tonelaje_pulpa_fixed !== undefined) {
            edge.data.tonelaje_solido_fixed = !!edge.data.tonelaje_pulpa_fixed;
          }
        }
      });
    }

    initialNodes.value = cleanNodes;
    initialEdges.value = cleanEdges;
    elementNames.value = data.elementNames || ['Cu'];
    
    // Sincronizar el generador de IDs para evitar que nuevos nodos colisionen con los existentes
    updateNextNodeId(cleanNodes);
    
    selectedElement.value = null;
    reconciliationReport.value = null;
    
    // Forzar el re-montaje limpio del componente del diagrama
    diagramKey.value++;
    
    nextTick(() => {
      if (diagramRef.value && diagramRef.value.fitView) {
        diagramRef.value.fitView();
      }
    });
    
    alert('Diagrama cargado con éxito.');
  } else {
    alert('Error: El archivo no tiene el formato de diagrama esperado.');
  }
}

function clearDiagram() {
  initialNodes.value = [];
  initialEdges.value = [];
  selectedElement.value = null;
  reconciliationReport.value = null;
  id = 1;
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

function handleFlowUpdate(payload) {
  const edges = getEdges();
  const edge = edges.find(e => e.id === payload.id);
  if (edge) {
    edge.data = {
      ...edge.data,
      ...payload,
      corrected_tonelaje: null,
      corrected_data: null
    };
    if (selectedElement.value && selectedElement.value.id === edge.id) {
      selectedElement.value.data = { ...edge.data };
    }
    reconciliationReport.value = null;
  }
}

function handleApplyExcelData(updates) {
  const edges = getEdges();
  let updatedCount = 0;

  updates.forEach(item => {
    const edge = edges.find(e => e.id === item.id);
    if (edge) {
      updatedCount++;
      if (activeModule.value === 'water') {
        const newData = {
          ...edge.data,
          tonelaje_solido: item.tonelaje_solido !== undefined && item.tonelaje_solido !== null ? item.tonelaje_solido : edge.data.tonelaje_solido,
          porcentaje_solidos: item.porcentaje_solidos !== undefined && item.porcentaje_solidos !== null ? item.porcentaje_solidos : edge.data.porcentaje_solidos,
          tonelaje_solido_fixed: item.tonelaje_solido_fixed !== undefined ? item.tonelaje_solido_fixed : edge.data.tonelaje_solido_fixed,
          not_measured: item.not_measured !== undefined ? item.not_measured : edge.data.not_measured,
          porcentaje_solidos_fixed: item.porcentaje_solidos_fixed !== undefined ? item.porcentaje_solidos_fixed : edge.data.porcentaje_solidos_fixed,
          corrected_data: null
        };
        if (item.tonelaje_solido_error !== undefined && item.tonelaje_solido_error !== null) {
          newData.tonelaje_solido_error = item.tonelaje_solido_error;
        }
        if (item.porcentaje_solidos_error !== undefined && item.porcentaje_solidos_error !== null) {
          newData.porcentaje_solidos_error = item.porcentaje_solidos_error;
        }
        if (item.tonelaje_pulpa !== undefined && item.tonelaje_pulpa !== null) {
          newData.tonelaje_pulpa = item.tonelaje_pulpa;
        }
        if (item.tonelaje_pulpa_fixed !== undefined) {
          newData.tonelaje_pulpa_fixed = item.tonelaje_pulpa_fixed;
        }
        edge.data = newData;
      } else {
        // Balance Metalúrgico de Leyes
        const updatedElementos = (edge.data?.elementos || []).map(el => {
          const parsedEl = (item.elementos || []).find(pe => pe.name === el.name);
          if (parsedEl && parsedEl.ley !== undefined && parsedEl.ley !== null) {
            return {
              ...el,
              ley: parsedEl.ley,
              ley_error: parsedEl.ley_error !== undefined && parsedEl.ley_error !== null ? parsedEl.ley_error : el.ley_error,
              corrected_data: null
            };
          }
          return el;
        });

        const newData = {
          ...edge.data,
          tonelaje: item.tonelaje !== undefined && item.tonelaje !== null ? item.tonelaje : edge.data.tonelaje,
          tonelaje_fixed: item.tonelaje_fixed !== undefined ? item.tonelaje_fixed : edge.data.tonelaje_fixed,
          not_measured: item.not_measured !== undefined ? item.not_measured : edge.data.not_measured,
          elementos: updatedElementos,
          corrected_tonelaje: null
        };
        if (item.tonelaje_error !== undefined && item.tonelaje_error !== null) {
          newData.tonelaje_error = item.tonelaje_error;
        }
        edge.data = newData;
      }

      // Sincronizar reactivamente si este flujo está seleccionado en el panel de propiedades
      if (selectedElement.value && selectedElement.value.id === edge.id) {
        selectedElement.value.data = { ...edge.data };
      }
    }
  });

  reconciliationReport.value = null;
  alert(`¡${updatedCount} flujo(s) actualizados correctamente desde Excel!`);
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
  height: 100vh; /* Altura de la ventana completa */
  overflow: hidden; /* Mantener hidden para el layout total */
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
  overflow-y: auto; /* PERMITIR SCROLL VERTICAL */
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