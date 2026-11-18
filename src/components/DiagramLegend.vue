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
        <span class="legend-title-text">Leyenda de Tarjetas</span>
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
        <div class="legend-section-title">Orden de Parámetros (Flujo):</div>
        
        <div class="legend-row">
          <span class="legend-dot dot-ton"></span>
          <span class="legend-row-num">Fila 1:</span>
          <span class="legend-row-label">Tonelaje Seco</span>
          <span class="legend-row-unit">(t/h)</span>
        </div>

        <div 
          v-for="(el, idx) in elementNames" 
          :key="el" 
          class="legend-row"
        >
          <span class="legend-dot" :style="{ backgroundColor: getElementColor(idx) }"></span>
          <span class="legend-row-num">Fila {{ idx + 2 }}:</span>
          <span class="legend-row-label">Ley {{ el }}</span>
          <span class="legend-row-unit">(%)</span>
        </div>

        <div class="legend-divider"></div>

        <div class="legend-section-title">Reconciliación y Estados:</div>
        <div class="legend-row">
          <span class="legend-rec-arrow metal">➔</span>
          <span class="legend-rec-label">Valor Reconciliado</span>
        </div>
        <div class="legend-badges-group">
          <span class="badge-preview badge-fixed">🔒 Fijo</span>
          <span class="badge-preview badge-unmeasured">🚫 No med.</span>
        </div>
      </template>

      <!-- MÓDULO BALANCE DE AGUA -->
      <template v-else-if="module === 'water'">
        <div class="legend-section-title">Flujo de Pulpa (Orden):</div>

        <div class="legend-row">
          <span class="legend-dot dot-solid"></span>
          <span class="legend-row-num">Fila 1:</span>
          <span class="legend-row-label">Sólido Seco</span>
          <span class="legend-row-unit">(t/h)</span>
        </div>

        <div class="legend-row">
          <span class="legend-dot dot-cp"></span>
          <span class="legend-row-num">Fila 2:</span>
          <span class="legend-row-label">% Sólidos</span>
          <span class="legend-row-unit">(% Cp)</span>
        </div>

        <div class="legend-row">
          <span class="legend-dot dot-pulp"></span>
          <span class="legend-row-num">Fila 3:</span>
          <span class="legend-row-label">Flujo Pulpa</span>
          <span class="legend-row-unit">(t/h)</span>
        </div>

        <div class="legend-row">
          <span class="legend-dot dot-flow"></span>
          <span class="legend-row-num">Fila 4:</span>
          <span class="legend-row-label">Caudal Pulpa</span>
          <span class="legend-row-unit">(m³/h)</span>
        </div>

        <div class="legend-row">
          <span class="legend-dot dot-water"></span>
          <span class="legend-row-num">Fila 5:</span>
          <span class="legend-row-label">Flujo Agua</span>
          <span class="legend-row-unit">(t/h)</span>
        </div>

        <div class="legend-divider"></div>

        <div class="legend-section-title">Flujo Solo Agua (Dilución):</div>
        <div class="legend-row">
          <span class="badge-preview badge-water">💧 Solo Agua</span>
          <span class="legend-row-label">Agua</span>
          <span class="legend-row-unit">(t/h)</span>
        </div>

        <div class="legend-divider"></div>

        <div class="legend-section-title">Reconciliación y Estados:</div>
        <div class="legend-row">
          <span class="legend-rec-arrow water">➔</span>
          <span class="legend-rec-label">Valor Reconciliado</span>
        </div>
        <div class="legend-badges-group">
          <span class="badge-preview badge-fixed">🔒 Fijo</span>
          <span class="badge-preview badge-unmeasured">🚫 No med.</span>
          <span class="badge-preview badge-ge">GE 2.7</span>
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
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(8px);
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  z-index: 40;
  width: 220px;
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
  padding: 7px 10px;
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
  gap: 6px;
  font-weight: 700;
  font-size: 11.5px;
  color: #0f172a;
}

.legend-icon {
  font-size: 13px;
}

.legend-toggle-btn {
  background: transparent;
  border: none;
  font-size: 13px;
  font-weight: bold;
  color: #64748b;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
}

.legend-body {
  padding: 8px 10px 10px;
  max-height: 380px;
  overflow-y: auto;
}

.legend-section-title {
  font-weight: 700;
  font-size: 10px;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin: 4px 0 6px;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2.5px 0;
  font-size: 11px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

/* Colores de los bullets */
.dot-ton { background-color: #4b5563; }
.dot-solid { background-color: #8d6e63; }
.dot-cp { background-color: #7c3aed; }
.dot-pulp { background-color: #ea580c; }
.dot-flow { background-color: #0284c7; }
.dot-water { background-color: #06b6d4; }

.legend-row-num {
  color: #94a3b8;
  font-size: 9.5px;
  font-weight: 600;
  min-width: 32px;
}

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

.legend-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 7px 0 5px;
}

.legend-rec-arrow {
  font-weight: bold;
  font-size: 11px;
}
.legend-rec-arrow.metal { color: #16a34a; }
.legend-rec-arrow.water { color: #0284c7; }

.legend-rec-label {
  font-size: 10.5px;
  font-weight: 600;
  color: #334155;
}

.legend-badges-group {
  display: flex;
  gap: 4px;
  margin-top: 5px;
  flex-wrap: wrap;
}

.badge-preview {
  font-size: 8.5px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  display: inline-block;
}

.badge-fixed {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.badge-unmeasured {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #cbd5e1;
}

.badge-ge {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.badge-water {
  background: #e0f2fe;
  color: #0369a1;
  border: 1px solid #7dd3fc;
}
</style>
