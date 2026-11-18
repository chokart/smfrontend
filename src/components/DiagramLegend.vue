<script setup>
import { ref } from 'vue'

const props = defineProps({
  module: { type: String, default: 'metallurgical' },
  elementNames: { type: Array, default: () => ['Cu'] }
})

const isCollapsed = ref(false)

const ELEMENT_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#64748b']

function getElementColor(index) {
  return ELEMENT_COLORS[index % ELEMENT_COLORS.length]
}
</script>

<template>
  <div class="diagram-legend" :class="{ 'is-collapsed': isCollapsed }">
    <!-- CABECERA DE LA LEYENDA -->
    <div class="legend-header" @click="isCollapsed = !isCollapsed">
      <div class="legend-title">
        <span class="legend-icon">🏷️</span>
        <span class="legend-title-text">Leyenda</span>
      </div>
      <button 
        type="button" 
        class="legend-toggle-btn" 
        :title="isCollapsed ? 'Expandir leyenda' : 'Minimizar leyenda'"
      >
        {{ isCollapsed ? '▾' : '▴' }}
      </button>
    </div>

    <!-- CUERPO EXPANDIDO DE LA LEYENDA -->
    <div v-show="!isCollapsed" class="legend-body">
      <!-- MÓDULO METALÚRGICO (LEYES) -->
      <template v-if="module === 'metallurgical'">
        <div class="legend-row">
          <span class="legend-dot dot-ton"></span>
          <span class="legend-row-label">Tonelaje Seco</span>
          <span class="legend-row-unit">(t/h)</span>
        </div>

        <div 
          v-for="(el, idx) in elementNames" 
          :key="el" 
          class="legend-row"
        >
          <span class="legend-dot" :style="{ backgroundColor: getElementColor(idx) }"></span>
          <span class="legend-row-label">Ley {{ el }}</span>
          <span class="legend-row-unit">(%)</span>
        </div>
      </template>

      <!-- MÓDULO BALANCE DE AGUA -->
      <template v-else-if="module === 'water'">
        <!-- 1. Sólido Seco -->
        <div class="legend-row">
          <span class="legend-dot dot-solid"></span>
          <span class="legend-row-label">Sólido Seco</span>
          <span class="legend-row-unit">(t/h)</span>
        </div>

        <!-- 2. Flujo Agua -->
        <div class="legend-row">
          <span class="legend-dot dot-water"></span>
          <span class="legend-row-label">Flujo Agua</span>
          <span class="legend-row-unit">(t/h)</span>
        </div>

        <!-- 3. Flujo Pulpa -->
        <div class="legend-row">
          <span class="legend-dot dot-pulp"></span>
          <span class="legend-row-label">Flujo Pulpa</span>
          <span class="legend-row-unit">(t/h)</span>
        </div>

        <!-- 4. % Sólidos -->
        <div class="legend-row">
          <span class="legend-dot dot-cp"></span>
          <span class="legend-row-label">% Sólidos</span>
          <span class="legend-row-unit">(%)</span>
        </div>

        <!-- 5. Caudal Pulpa -->
        <div class="legend-row">
          <span class="legend-dot dot-flow"></span>
          <span class="legend-row-label">Caudal Pulpa</span>
          <span class="legend-row-unit">(m³/h)</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.diagram-legend {
  position: absolute;
  top: 15px;
  left: 15px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  z-index: 40;
  width: 195px;
  font-family: inherit;
  font-size: 11px;
  color: #1f2937;
  overflow: hidden;
  transition: all 0.25s ease;
  user-select: none;
}

.diagram-legend.is-collapsed {
  width: auto;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.legend-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
  gap: 8px;
}

.diagram-legend.is-collapsed .legend-header {
  border-bottom: none;
  padding: 6px 10px;
}

.legend-header:hover {
  background: #f1f5f9;
}

.legend-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 700;
  font-size: 11.5px;
  color: #0f172a;
}

.legend-icon {
  font-size: 12px;
}

.legend-toggle-btn {
  background: transparent;
  border: none;
  font-size: 12px;
  font-weight: bold;
  color: #64748b;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
}

.legend-body {
  padding: 6px 10px 8px;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2.5px 0;
  font-size: 11px;
}

.legend-dot {
  width: 7.5px;
  height: 7.5px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

/* Colores de los bullets */
.dot-ton { background-color: #4b5563; }
.dot-solid { background-color: #8d6e63; }
.dot-water { background-color: #06b6d4; }
.dot-pulp { background-color: #ea580c; }
.dot-cp { background-color: #7c3aed; }
.dot-flow { background-color: #0284c7; }

.legend-row-label {
  font-weight: 600;
  color: #334155;
  flex: 1;
}

.legend-row-unit {
  color: #64748b;
  font-size: 10px;
  font-weight: 500;
}
</style>
