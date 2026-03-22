<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h3>Ecuaciones de Balance Generadas</h3>
      <div class="equations-list">
        <p v-if="equations.length === 0">No se generaron ecuaciones de balance para este diagrama.</p>
        <p v-for="(equation, index) in equations" :key="index" class="equation-item">
          {{ equation }}
        </p>
      </div>
      <button @click="$emit('close')" class="close-button">Cerrar</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  equations: { type: Array, default: () => [] },
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
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 25px;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 700px;
  max-height: 80%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

h3 {
  margin-top: 0;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
  margin-bottom: 20px;
}

.equations-list {
  flex-grow: 1;
  overflow-y: auto;
  margin-bottom: 20px;
  padding-right: 10px; /* Para el scrollbar */
}

.equation-item {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 5px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9em;
  color: #495057;
  word-break: break-all; /* Para ecuaciones largas */
}

.close-button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  align-self: flex-end;
  margin-top: 10px;
}

.close-button:hover {
  background-color: #0056b3;
}
</style>