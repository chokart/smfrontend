<template>
  <div class="text-node-properties">
    <div class="form-group">
      <label>Texto:</label>
      <textarea
        v-model="localData.label"
        rows="3"
        placeholder="Escribe el texto aquí..."
        class="text-area-input"
        @input="$emit('update')"
      ></textarea>
      <small class="hint-text">Tip: también puedes hacer doble clic sobre el texto en el diagrama para editarlo directo.</small>
    </div>

    <div class="form-group">
      <label>Tamaño de letra (px):</label>
      <div class="font-size-row">
        <input
          v-model.number="localData.fontSize"
          type="number"
          min="10"
          max="72"
          step="1"
          @input="$emit('update')"
        />
        <div class="size-presets">
          <button
            v-for="sz in [12, 16, 20, 26]"
            :key="sz"
            type="button"
            class="preset-btn"
            :class="{ active: Number(localData.fontSize || 16) === sz }"
            @click="setFontSize(sz)"
          >
            {{ sz }}
          </button>
        </div>
      </div>
    </div>

    <div class="form-group">
      <label>Estilo y alineación:</label>
      <div class="style-buttons-row">
        <button
          type="button"
          class="style-toggle-btn"
          :class="{ active: isBold }"
          title="Negrita"
          @click="toggleBold"
        >
          <strong>N</strong>
        </button>
        <button
          type="button"
          class="style-toggle-btn"
          :class="{ active: localData.fontStyle === 'italic' }"
          title="Cursiva"
          @click="toggleItalic"
        >
          <em>K</em>
        </button>
        <span class="divider-v"></span>
        <button
          v-for="align in alignOptions"
          :key="align.value"
          type="button"
          class="style-toggle-btn"
          :class="{ active: (localData.textAlign || 'left') === align.value }"
          :title="align.title"
          @click="setAlign(align.value)"
        >
          {{ align.label }}
        </button>
      </div>
    </div>

    <div class="form-group">
      <label>Color del texto:</label>
      <div class="text-color-row">
        <button
          v-for="c in textColors"
          :key="c"
          type="button"
          class="color-dot"
          :class="{ active: (localData.textColor || '#0f172a').toLowerCase() === c.toLowerCase() }"
          :style="{ backgroundColor: c }"
          :title="c"
          @click="setTextColor(c)"
        ></button>
        <input
          v-model="localData.textColor"
          type="color"
          class="color-picker-native"
          title="Elegir otro color"
          @input="$emit('update')"
        />
      </div>
    </div>

    <div class="checkbox-group">
      <input
        id="chk-text-has-box"
        v-model="localData.hasBox"
        type="checkbox"
        @change="$emit('update')"
      />
      <label for="chk-text-has-box">Mostrar recuadro de fondo</label>
    </div>

    <NodeColorPicker
      v-if="localData.hasBox"
      v-model="localData.customColor"
      @update:modelValue="$emit('update')"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import NodeColorPicker from './NodeColorPicker.vue'

const props = defineProps({
  localData: { type: Object, required: true }
})

const emit = defineEmits(['update'])

const textColors = ['#0f172a', '#1e40af', '#047857', '#b91c1c', '#b45309', '#6d28d9', '#475569']
const alignOptions = [
  { value: 'left', label: 'Izq', title: 'Alinear a la izquierda' },
  { value: 'center', label: 'Cen', title: 'Centrar' },
  { value: 'right', label: 'Der', title: 'Alinear a la derecha' }
]

const isBold = computed(() => {
  const fw = props.localData.fontWeight
  return fw === 'bold' || fw === '700' || fw === '600' || Number(fw) >= 600
})

function setFontSize(sz) {
  props.localData.fontSize = sz
  emit('update')
}

function toggleBold() {
  props.localData.fontWeight = isBold.value ? '400' : '700'
  emit('update')
}

function toggleItalic() {
  props.localData.fontStyle = props.localData.fontStyle === 'italic' ? 'normal' : 'italic'
  emit('update')
}

function setAlign(val) {
  props.localData.textAlign = val
  emit('update')
}

function setTextColor(c) {
  props.localData.textColor = c
  emit('update')
}
</script>

<style scoped>
.text-area-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
  box-sizing: border-box;
}
.hint-text {
  display: block;
  margin-top: 4px;
  font-size: 0.74rem;
  color: #64748b;
  line-height: 1.3;
}
.font-size-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.font-size-row input {
  width: 68px;
  padding: 6px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
}
.size-presets {
  display: flex;
  gap: 4px;
  flex: 1;
}
.preset-btn {
  flex: 1;
  padding: 5px 4px;
  font-size: 0.75rem;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #334155;
  border-radius: 5px;
  cursor: pointer;
}
.preset-btn.active {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
  font-weight: 600;
}
.style-buttons-row {
  display: flex;
  gap: 5px;
  align-items: center;
}
.style-toggle-btn {
  padding: 5px 9px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #334155;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.8rem;
}
.style-toggle-btn.active {
  background: #eff6ff;
  border-color: #2563eb;
  color: #1d4ed8;
  font-weight: 600;
}
.divider-v {
  width: 1px;
  height: 20px;
  background: #e2e8f0;
  margin: 0 2px;
}
.text-color-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.color-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 1px #cbd5e1;
  cursor: pointer;
  padding: 0;
}
.color-dot.active {
  box-shadow: 0 0 0 2px #2563eb;
  transform: scale(1.1);
}
.color-picker-native {
  width: 26px;
  height: 24px;
  padding: 0;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
}
.checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 0;
}
.checkbox-group label {
  font-size: 0.85rem;
  color: #334155;
  cursor: pointer;
}
</style>
