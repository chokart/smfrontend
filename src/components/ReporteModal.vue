<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <button class="close-button" @click="$emit('close')">×</button>
      <h3>Informe de Reconciliación</h3>
      
      <div class="report-section">
        <h4>Metodología Aplicada</h4>
        <ul>
          <li v-for="(step, index) in report.methodology" :key="index">{{ step }}</li>
        </ul>
      </div>

      <div class="report-section">
        <h4>Ecuaciones de Balance (Última Iteración)</h4>
        <div class="equations-container">
          <pre v-for="(eq, index) in report.equations" :key="index">{{ eq }}</pre>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  visible: { type: Boolean, required: true },
  report: { type: Object, default: () => ({}) },
});

defineEmits(['close']);
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.modal-content {
  background: white;
  padding: 25px;
  border-radius: 8px;
  width: 80%;
  max-width: 900px;
  max-height: 85vh;
  overflow-y: auto;
  position: relative;
}
.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: none;
  font-size: 24px;
  cursor: pointer;
}
.report-section {
  margin-top: 20px;
}
.equations-container {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  padding: 15px;
  border-radius: 5px;
  max-height: 400px;
  overflow-y: auto;
}
pre {
  white-space: pre-wrap; 
  word-wrap: break-word; 
  margin: 0 0 10px 0;
  font-family: 'Courier New', Courier, monospace;
}
</style>
