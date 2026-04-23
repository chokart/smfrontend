<script setup>
import { Handle, Position, VueFlow, useVueFlow } from '@vue-flow/core'
import { ref, nextTick } from 'vue'
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
  getNodes: () => flowNodes.value, // Return reactive value
  getEdges: () => flowEdges.value, // Return reactive value
  nodes: flowNodes, // Expose ref directly
  edges: flowEdges, // Expose ref directly
  fitView: () => fitView(),
  zoomIn: () => zoomIn(),
  zoomOut: () => zoomOut()
})

const getNodeStyle = (node) => {
  const baseStyle = {
    border: '2px solid',
    borderRadius: '8px',
    padding: '10px 20px',
    background: '#fff', 
    color: '#000', 
    minWidth: '80px',
    textAlign: 'center'
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
      return { ...baseStyle, borderColor: '#28a745', background: '#d4edda' }; // Green for product
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
      <template #node-initial="{ data, ...rest }">
        <div :style="getNodeStyle({ data, ...rest })">
          <Handle type="target" :position="Position.Left" />
          {{ data.label }}
          <Handle type="source" :position="Position.Right" />
        </div>
      </template>

      <template #node-concentrate="{ data, ...rest }">
        <div :style="getNodeStyle({ data, ...rest })">
          <Handle type="target" :position="Position.Left" />
          {{ data.label }}
          <Handle type="source" :position="Position.Right" />
        </div>
      </template>

      <template #node-tailing="{ data, ...rest }">
        <div :style="getNodeStyle({ data, ...rest })">
          <Handle type="target" :position="Position.Left" />
          {{ data.label }}
          <Handle type="source" :position="Position.Right" />
        </div>
      </template>

      <template #node-product="{ data, ...rest }">
        <div :style="getNodeStyle({ data, ...rest })">
          <Handle type="target" :position="Position.Left" />
          {{ data.label }}
          <Handle type="source" :position="Position.Right" />
        </div>
      </template>
      
      <template #node-process="{ data, ...rest }">
         <div :style="getNodeStyle({ data, ...rest })">
          <Handle type="target" :position="Position.Left" />
          {{ data.label }}
          <Handle type="source" :position="Position.Right" />
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
