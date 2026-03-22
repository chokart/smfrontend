# Manual de Usuario: Balanceador Metalúrgico

**Por Luis Choquehuanca**

---

## 1. Introducción

Bienvenido al Balanceador Metalúrgico. Esta herramienta le permite modelar un circuito metalúrgico, ingresar datos de mediciones (tonelajes y leyes) y utilizar un potente motor de reconciliación de datos para obtener un balance metalúrgico consistente y preciso.

## 2. Interfaz Principal

La aplicación se divide en tres áreas principales:

1.  **Área del Diagrama:** El espacio central donde puede construir y visualizar su circuito.
2.  **Panel de Propiedades:** A la derecha, donde puede editar los detalles del nodo o flujo que haya seleccionado.
3.  **Tablas de Resumen:** En la parte inferior, donde puede ver los datos de todos los flujos y el balance de masa por nodo.

### 2.1. Barra de Herramientas

La barra de herramientas superior contiene todas las acciones principales, agrupadas por función:

*   **Edición del Diagrama:**
    *   `Añadir Celda`: Agrega un nuevo nodo de proceso al diagrama.
    *   `Configurar Elementos`: Abre una ventana para definir los elementos metálicos que se usarán en el balance (ej. Cu, Au, Pb).

*   **Gestión de Archivos:**
    *   `Guardar`: Descarga el estado actual de su diagrama (nodos, flujos y datos) como un archivo `.json`.
    *   `Cargar`: Abre un diálogo para cargar un diagrama previamente guardado desde un archivo `.json`.

*   **Análisis y Reconciliación:**
    *   `Reconciliar`: Ejecuta el motor de balance de datos. Esta es la acción principal de la aplicación.
    *   `Ver Informe`: (Se activa después de una reconciliación exitosa) Muestra el informe de Balance Metalúrgico completo.
    *   `Verificar Ecuaciones`: Muestra las ecuaciones de balance de masa que el sistema ha generado antes de resolverlas.

### 2.2. Modo Oscuro

Puede cambiar entre el modo claro y oscuro usando el interruptor en la esquina superior derecha para una mejor visualización según sus preferencias.

## 3. Construyendo un Diagrama

1.  **Añadir Nodos:** Use el botón `Añadir Celda` para crear nuevos nodos de proceso.
2.  **Conectar Nodos:** Haga clic en el círculo de un nodo y arrastre la línea hacia el círculo de otro nodo para crear un flujo (una flecha).
3.  **Eliminar Elementos:** Seleccione un nodo o un flujo y presione la tecla `Supr` o `Backspace` para eliminarlo.

## 4. Ingresando Datos

1.  **Seleccionar un Elemento:** Haga clic en un nodo o en un flujo en el diagrama.
2.  **Editar en el Panel de Propiedades:** El panel de la derecha se activará, mostrando las propiedades del elemento seleccionado.

### 4.1. Propiedades de un Flujo

*   **Tonelaje Seco:** El valor medido del tonelaje.
*   **Desv. Estándar Tonelaje:** La incertidumbre o error asociado a la medición del tonelaje.
*   **Ley:** El valor medido de la ley para cada elemento.
*   **Desv. Estándar Ley:** La incertidumbre o error asociado a la medición de la ley.
*   **No ajustar (checkbox):** Marque esta casilla si considera que el valor medido es 100% confiable y no quiere que el reconciliador lo modifique.
*   **No medido (checkbox):** Marque esta casilla si no tiene una medición para este valor. El reconciliador calculará su valor más probable.

### 4.2. Propiedades de un Nodo

*   **Nombre:** Puede cambiar el nombre del nodo (ej. "Celda Primaria").
*   **Tipo de Nodo:** Es crucial definir el tipo de nodo para que el balance se calcule correctamente. Las opciones son:
    *   `Alimento`: Marca el nodo como un punto de entrada al circuito.
    *   `Proceso`: Un nodo de operación interna.
    *   `Concentrado`: Marca el nodo como un punto de salida de producto.
    *   `Relave`: Marca el nodo como un punto de salida de relave.

## 5. Reconciliación e Informe

1.  **Ejecutar:** Una vez que su diagrama esté completo y los datos ingresados, haga clic en `Reconciliar`.
2.  **Ver Resultados:**
    *   **Tablas de Resumen:** Las tablas en la parte inferior se actualizarán. La tabla de "Resumen de Flujos" ahora mostrará los "Finos Ajustados" calculados.
    *   **Informe de Balance:** Haga clic en `Ver Informe` para abrir el Balance Metalúrgico completo. Este informe le mostrará el peso, las leyes, el contenido metálico y la recuperación para el alimento y los productos, todo basado en los datos reconciliados.

## 6. Consejos Útiles

*   **Expandir Tablas:** Si las tablas de resumen son muy grandes, puede usar el botón `▲ Expandir` para darles más espacio en la pantalla.
*   **Guardar Frecuentemente:** Es una buena práctica guardar su trabajo a menudo usando el botón `Guardar`.
