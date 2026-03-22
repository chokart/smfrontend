<script setup>
import { Handle, Position, VueFlow, useVueFlow } from '@vue-flow/core'
import { ref, nextTick } from 'vue'

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  edges: { type: Array, default: () => [] },
})

const emit = defineEmits(['element-click', 'connect'])

const { nodes: flowNodes, edges: flowEdges, addNodes, addEdges, fitView, onPaneReady } = useVueFlow()
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
  fitView: () => fitView()
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
  <div style="height: 100%; width: 100%;">
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
    </VueFlow>
  </div>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
</style>
