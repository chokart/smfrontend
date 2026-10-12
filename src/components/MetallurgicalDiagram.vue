<script setup>
import { Handle, Position, VueFlow, useVueFlow } from '@vue-flow/core'
import { ref } from 'vue'
import CustomEdge from './CustomEdge.vue'

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  edges: { type: Array, default: () => [] },
})

const emit = defineEmits(['element-click', 'connect'])

const { nodes: flowNodes, edges: flowEdges, addNodes, addEdges, fitView, onPaneReady, zoomIn, zoomOut } = useVueFlow()
const vueFlowInstance = ref(null)

onPaneReady((instance) => {
  vueFlowInstance.value = instance
  instance.fitView()
})

function onEdgeClick({ edge }) {
  emit('element-click', edge)
}

function onNodeClick({ node }) {
  emit('element-click', node)
}

function onConnect(params) {
  emit('connect', params)
}

// Expose reactive methods and state to the parent
defineExpose({
  addNode: (node) => addNodes(node),
  addEdges: (edges) => addEdges(edges),
  getNodes: () => flowNodes.value,
  getEdges: () => flowEdges.value,
  nodes: flowNodes,
  edges: flowEdges,
  fitView: () => fitView(),
  zoomIn: () => zoomIn(),
  zoomOut: () => zoomOut()
})

const getPosition = (posStr) => {
  switch (posStr) {
    case 'top': return Position.Top
    case 'right': return Position.Right
    case 'bottom': return Position.Bottom
    case 'left':
    default: return Position.Left
  }
}

const rotatePosition = (current, defaultPos = 'left') => {
  const order = ['left', 'top', 'right', 'bottom']
  const cur = current || defaultPos
  const idx = order.indexOf(cur)
  return order[(idx + 1) % order.length]
}

const handleRotateIn = (nodeData, event) => {
  if (event) event.stopPropagation()
  nodeData.targetPosition = rotatePosition(nodeData.targetPosition, 'left')
}

const handleRotateOut = (nodeData, event) => {
  if (event) event.stopPropagation()
  nodeData.sourcePosition = rotatePosition(nodeData.sourcePosition, 'right')
}

const getNodeStyle = (node) => {
  const baseStyle = {
    border: '2px solid',
    borderRadius: '8px',
    padding: '12px 24px',
    background: '#fff', 
    color: '#000', 
    minWidth: '90px',
    textAlign: 'center',
    position: 'relative'
  };

  const type = node.data ? node.data.node_type : 'process';

  switch (type) {
    case 'initial':
      return { ...baseStyle, borderColor: '#007bff', background: '#cce5ff' };
    case 'concentrate':
      return { ...baseStyle, borderColor: '#28a745', background: '#d4edda' };
    case 'tailing':
      return { ...baseStyle, borderColor: '#dc3545', background: '#f8d7da' };
    case 'product':
      return { ...baseStyle, borderColor: '#28a745', background: '#d4edda' };
    case 'process':
    default:
      return { ...baseStyle, borderColor: '#6c757d', background: '#f8f9fa' };
  }
};
</script>

<template>
  <div style="height: 100%; width: 100%; position: relative;">
    <VueFlow 
      :nodes="nodes" 
      :edges="edges"
      :delete-key-code="['Delete', 'Backspace']"
      @edge-click="onEdgeClick"
      @node-click="onNodeClick"
      @connect="onConnect"
    >
      <!-- PLANTILLA GENÉRICA REUTILIZABLE PARA TODOS LOS TIPOS DE NODOS -->
      <template 
        v-for="nodeSlot in ['initial', 'concentrate', 'tailing', 'product', 'process']" 
        :key="nodeSlot"
        #[`node-${nodeSlot}`]="{ data, ...rest }"
      >
        <div class="custom-diagram-node" :style="getNodeStyle({ data, ...rest })">
          <!-- PUNTO DE INGRESO (i) -->
          <Handle 
            type="target" 
            :position="getPosition(data.targetPosition || 'left')" 
            class="custom-handle handle-in"
            title="Punto de Ingreso (i)"
          >
            <span class="handle-letter">i</span>
          </Handle>

          <span class="node-label-text">{{ data.label }}</span>

          <!-- CONTROLES FLOTANTES PARA MOVER PUNTOS (i y s) -->
          <div class="node-rotate-controls">
            <button 
              type="button" 
              class="rotate-btn btn-in" 
              title="Mover punto de ingreso (i) de posición" 
              @click.stop="handleRotateIn(data, $event)"
            >
              ⟳ i
            </button>
            <button 
              type="button" 
              class="rotate-btn btn-out" 
              title="Mover punto de salida (s) de posición" 
              @click.stop="handleRotateOut(data, $event)"
            >
              ⟳ s
            </button>
          </div>

          <!-- PUNTO DE SALIDA (s) -->
          <Handle 
            type="source" 
            :position="getPosition(data.sourcePosition || 'right')" 
            class="custom-handle handle-out"
            title="Punto de Salida (s)"
          >
            <span class="handle-letter">s</span>
          </Handle>
        </div>
      </template>

      <template #edge-custom="props">
        <CustomEdge v-bind="props" @click="onEdgeClick({ edge: props })" />
      </template>
    </VueFlow>

    <!-- BOTONES DE ZOOM -->
    <div class="zoom-controls">
      <button @click="zoomIn" class="zoom-btn" title="Aumentar zoom">+</button>
      <button @click="zoomOut" class="zoom-btn" title="Reducir zoom">-</button>
      <button @click="fitView" class="zoom-btn" title="Ajustar vista">⛶</button>
    </div>
  </div>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';

.custom-diagram-node {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.node-label-text {
  font-weight: 600;
  font-size: 0.95rem;
  letter-spacing: -0.2px;
}

.custom-diagram-node:hover .node-rotate-controls {
  opacity: 1;
  pointer-events: auto;
}

.node-rotate-controls {
  position: absolute;
  top: -26px;
  right: 0;
  display: flex;
  gap: 4px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 40;
}

.rotate-btn {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
  background: white;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  gap: 2px;
  transition: transform 0.1s ease, background 0.15s ease;
}
.rotate-btn:hover {
  transform: translateY(-1px);
}
.rotate-btn.btn-in {
  color: #059669;
  border-color: #6ee7b7;
}
.rotate-btn.btn-in:hover {
  background: #ecfdf5;
}
.rotate-btn.btn-out {
  color: #ea580c;
  border-color: #fdba74;
}
.rotate-btn.btn-out:hover {
  background: #fff7ed;
}

/* ESTILOS DE LOS PUNTOS DE CONEXIÓN i y s */
.custom-handle {
  width: 20px !important;
  height: 20px !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border: 2px solid #ffffff !important;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25) !important;
  cursor: crosshair !important;
  transition: transform 0.15s ease, box-shadow 0.15s ease !important;
  z-index: 30 !important;
}

.custom-handle:hover {
  transform: scale(1.25) !important;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35) !important;
}

.handle-in {
  background-color: #10b981 !important; /* Verde Esmeralda para Ingreso (i) */
}

.handle-out {
  background-color: #f97316 !important; /* Naranja Vibrante para Salida (s) */
}

.handle-letter {
  color: #ffffff !important;
  font-size: 12px !important;
  font-weight: 800 !important;
  line-height: 1 !important;
  text-transform: lowercase !important;
  user-select: none !important;
  pointer-events: none !important;
}

.zoom-controls {
  position: absolute;
  bottom: 20px;
  left: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 50;
}

.zoom-btn {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background: white;
  color: #333;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  transition: all 0.2s;
}

.zoom-btn:hover {
  background: #f0f0f0;
  border-color: #999;
}

.zoom-btn:active {
  background: #e0e0e0;
  transform: translateY(1px);
}
</style>
