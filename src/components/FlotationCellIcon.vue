<template>
  <svg
    class="flotation-cell-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- Eje agitador y cabezal -->
    <path d="M9 2.5h6" />
    <path d="M12 2.5v13.5" />
    <!-- Impulsor en el fondo -->
    <path d="M8.5 16h7" />
    <path d="M8.5 14.8v2.4" />
    <path d="M15.5 14.8v2.4" />
    <!-- Tanque de celda y canaleta de rebose -->
    <path d="M4.5 7.5v10.5a2 2 0 0 0 2 2h9.5a2 2 0 0 0 2-2V9.5h2.5v2.8" />
    <!-- Nivel de espuma / pulpa -->
    <path d="M4.5 10c1.4-.8 2.8-.8 4.2 0s2.8.8 4.2 0 2.8-.8 5.1 0" />
    <!-- Burbujas de flotación -->
    <circle cx="7.5" cy="7" r="0.85" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="6.4" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="10" cy="5.5" r="0.65" fill="currentColor" stroke="none" />
  </svg>
</template>

<style scoped>
.flotation-cell-icon {
  width: 1em;
  height: 1em;
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
