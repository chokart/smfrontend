<template>
  <div class="node-color-picker">
    <div class="color-header-row">
      <label>Color de Celda / Cajón:</label>
      <button
        v-if="modelValue"
        type="button"
        class="btn-reset-color"
        @click="$emit('update:modelValue', null)"
        title="Restaurar color por defecto según tipo de nodo"
      >
        ↺ Por defecto
      </button>
    </div>

    <div class="swatches-grid">
      <button
        v-for="preset in PRESETS"
        :key="preset.name"
        type="button"
        class="swatch-btn"
        :class="{ active: modelValue?.bg === preset.bg }"
        :style="{ backgroundColor: preset.bg, borderColor: preset.border }"
        :title="preset.name"
        @click="$emit('update:modelValue', { ...preset })"
      ></button>

      <label class="custom-color-btn" title="Elegir cualquier color personalizado">
        <span>🎨</span>
        <input
          type="color"
          :value="currentHex"
          @input="onCustomColorInput($event.target.value)"
        />
      </label>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: [Object, String, null], default: null }
})

const emit = defineEmits(['update:modelValue'])

const PRESETS = [
  { name: 'Gris', bg: '#f8fafc', border: '#64748b', text: '#0f172a' },
  { name: 'Azul', bg: '#dbeafe', border: '#2563eb', text: '#1e3a8a' },
  { name: 'Celeste', bg: '#e0f2fe', border: '#0284c7', text: '#0c4a6e' },
  { name: 'Verde', bg: '#dcfce7', border: '#16a34a', text: '#14532d' },
  { name: 'Ámbar', bg: '#fef3c7', border: '#d97706', text: '#78350f' },
  { name: 'Naranja', bg: '#ffedd5', border: '#ea580c', text: '#7c2d12' },
  { name: 'Rojo', bg: '#fee2e2', border: '#dc2626', text: '#7f1d1d' },
  { name: 'Morado', bg: '#f3e8ff', border: '#7c3aed', text: '#4c1d95' }
]

const currentHex = computed(() => {
  if (typeof props.modelValue === 'string') return props.modelValue
  return props.modelValue?.bg || '#f8fafc'
})

function darkenHex(hex, factor = 0.35) {
  const clean = hex.replace('#', '')
  const r = Math.max(0, Math.round(parseInt(clean.substring(0, 2), 16) * (1 - factor)))
  const g = Math.max(0, Math.round(parseInt(clean.substring(2, 4), 16) * (1 - factor)))
  const b = Math.max(0, Math.round(parseInt(clean.substring(4, 6), 16) * (1 - factor)))
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
}

function getContrastText(hex) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.58 ? '#0f172a' : '#ffffff'
}

function onCustomColorInput(hex) {
  emit('update:modelValue', {
    bg: hex,
    border: darkenHex(hex, 0.35),
    text: getContrastText(hex)
  })
}
</script>

<style scoped>
.node-color-picker {
  margin-bottom: 14px;
}

.color-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.color-header-row label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
  margin: 0;
}

.btn-reset-color {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #475569;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-reset-color:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.swatches-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.swatch-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 2px solid;
  cursor: pointer;
  padding: 0;
  transition: transform 0.12s, box-shadow 0.12s;
}

.swatch-btn:hover {
  transform: scale(1.1);
}

.swatch-btn.active {
  box-shadow: 0 0 0 2px #0f172a;
  transform: scale(1.1);
}

.custom-color-btn {
  position: relative;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px dashed #94a3b8;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  cursor: pointer;
  overflow: hidden;
}

.custom-color-btn:hover {
  border-color: #2563eb;
}

.custom-color-btn input[type="color"] {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
</style>
