<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h3>Configurar Elementos</h3>
      <div v-for="(element, index) in localElements" :key="index" class="element-input">
        <input type="text" v-model="localElements[index]" placeholder="Nombre del Elemento (ej. Cu)" />
        <button @click="removeElement(index)" class="remove-btn">×</button>
      </div>
      <div class="actions">
        <button @click="addElement">Añadir Elemento</button>
        <button @click="saveChanges" class="save-btn">Guardar Cambios</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({ 
  elements: { type: Array, required: true },
});
const emit = defineEmits(['close', 'save']);

const localElements = ref([]);

watch(() => props.elements, (newVal) => {
  localElements.value = [...newVal];
}, { immediate: true });

const addElement = () => {
  localElements.value.push('');
};

const removeElement = (index) => {
  localElements.value.splice(index, 1);
};

const saveChanges = () => {
  // Filtra nombres vacíos antes de guardar
  const validElements = localElements.value.filter(name => name.trim() !== '');
  emit('save', validElements);
  emit('close');
};
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
  z-index: 2000; /* Increased to stay above app-header */
}
.modal-content {
  background: white;
  padding: 25px;
  border-radius: 8px;
  width: 400px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
}
.element-input {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
.element-input input {
  flex-grow: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.remove-btn {
  margin-left: 10px;
  background: #ff4d4d;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-weight: bold;
}
.actions {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
}
.save-btn {
  background-color: #4CAF50;
  color: white;
}
</style>
