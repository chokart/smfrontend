<template>
  <!-- Contenedor principal de la barra de herramientas -->
  <div class="toolbar">
    <!-- Botón para añadir una nueva celda de proceso -->
    <button @click="$emit('add-node')">{{ addNodeLabel }}</button>
    <button v-if="showConfig" @click="$emit('open-config')">Configurar Elementos</button>
    <button @click="$emit('save-diagram')" class="download-button">Guardar</button>
    <button @click="handleImportClick" class="import-button">Importar</button>
    <!-- <button @click="$emit('view-report')" :disabled="!reportAvailable" class="report-button">Ver Informe</button> -->
    <!-- Botón para exportar los datos del diagrama a JSON -->
    <button @click="$emit('export')" class="export-button">Reconciliar</button>
    <button @click="$emit('verify-equations')" class="verify-button">Verificar Ecuaciones</button>

    <!-- Input de archivo oculto para la importación -->
    <input type="file" ref="fileInput" @change="onFileSelected" accept=".json" style="display: none;" />
  </div>
</template>

<script setup>
import { ref } from 'vue';

// Define los eventos que este componente puede emitir a su padre
const emit = defineEmits(['add-node', 'export', 'open-config', 'save-diagram', 'load-diagram', 'view-report', 'verify-equations'])

const props = defineProps({
  reportAvailable: { type: Boolean, default: false },
  showConfig: { type: Boolean, default: true },
  addNodeLabel: { type: String, default: 'Añadir Celda' }
});

const fileInput = ref(null);

function handleImportClick() {
  fileInput.value.click();
}

function onFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      emit('load-diagram', data);
    } catch (error) {
      alert('Error: El archivo seleccionado no es un JSON válido.');
      console.error('Error parsing JSON:', error);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}
</script>

<style scoped>
/* Estilos para el contenedor de la barra de herramientas */
.toolbar {
  /* position: absolute; eliminada para permitir flujo en flexbox */
  /* top: 20px; eliminada */
  /* left: 20px; eliminada */
  /* z-index: 10; eliminada pues ya no flota */
  background: white;
  padding: 5px 10px; /* Reducido un poco el padding */
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); /* Sombra más sutil */
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap; /* Permitir que los botones bajen si no hay espacio */
}

/* Estilos generales para los botones */
button {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
}

/* Estilos para los botones al pasar el ratón por encima */
button:hover {
  background-color: #36a476;
}

/* Estilos específicos para el botón de exportar */
.export-button {
  background-color: #007bff;
}

/* Estilos para el botón de exportar al pasar el ratón por encima */
.export-button:hover {
  background-color: #0056b3;
}

.import-button {
  background-color: #17a2b8;
}

.import-button:hover {
  background-color: #117a8b;
}

.download-button {
  background-color: #ffc107;
}

.download-button:hover {
  background-color: #e0a800;
}

.report-button {
  background-color: #6c757d;
}

.report-button:hover:not(:disabled) {
  background-color: #5a6268;
}

.report-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
