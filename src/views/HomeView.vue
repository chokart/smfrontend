<template>
  <div class="home-container">
    <!-- HERO SECTION -->
    <section class="hero-section">
      <div class="hero-logo-box">
        <img src="@/assets/logo.png" alt="SuiteMinerals Logo" class="hero-logo" />
      </div>
      <div class="hero-badge">Ingeniería Metalúrgica &amp; Procesamiento de Minerales</div>
      <h1 class="hero-title">SUITE MINERALS</h1>
      <p class="hero-subtitle">
        Plataforma técnica minimalista especializada en balance de materia, modelamiento de clasificación y cálculo reológico de pulpas para optimización en plantas concentradoras.
      </p>
      <div class="hero-actions">
        <button class="btn-primary" @click="$emit('open-tool', 'metallurgical')">
          Comenzar con Balance de Leyes
          <span class="btn-arrow" aria-hidden="true">→</span>
        </button>
        <button class="btn-secondary" @click="scrollToTools">
          Ver herramientas
        </button>
      </div>
    </section>

    <!-- HERRAMIENTAS DISPONIBLES -->
    <section id="tools-section" class="section">
      <div class="section-header">
        <span class="section-tag">Módulos de Cálculo</span>
        <h2>Herramientas Integradas</h2>
        <p>Soluciones computacionales diseñadas para balancear, auditar y simular circuitos industriales.</p>
      </div>

      <div class="tools-grid">
        <!-- 1. Balance de Leyes -->
        <article
          class="tool-card"
          role="button"
          tabindex="0"
          @click="$emit('open-tool', 'metallurgical')"
          @keydown.enter.prevent="$emit('open-tool', 'metallurgical')"
          @keydown.space.prevent="$emit('open-tool', 'metallurgical')"
        >
          <div class="tool-card-top">
            <div class="tool-header-row">
              <div class="tool-icon-badge">⚖️</div>
              <span class="tool-pill">Reconciliación</span>
            </div>
            <h3>Balance de Leyes</h3>
            <p>Reconciliación de balances metalúrgicos mediante mínimos cuadrados ponderados en diagramas de flujo interactivos con análisis de consistencia.</p>
          </div>
          <span class="tool-action">Abrir herramienta <span class="action-arrow" aria-hidden="true">↗</span></span>
        </article>

        <!-- 2. Balance de Agua -->
        <article
          class="tool-card"
          role="button"
          tabindex="0"
          @click="$emit('open-tool', 'water')"
          @keydown.enter.prevent="$emit('open-tool', 'water')"
          @keydown.space.prevent="$emit('open-tool', 'water')"
        >
          <div class="tool-card-top">
            <div class="tool-header-row">
              <div class="tool-icon-badge">💧</div>
              <span class="tool-pill">Hidráulica</span>
            </div>
            <h3>Balance de Agua</h3>
            <p>Balance hídrico global y por nodos en circuitos cerrados con cálculo de flujo de pulpa, % sólidos, caudal y dilución por nodo.</p>
          </div>
          <span class="tool-action">Abrir herramienta <span class="action-arrow" aria-hidden="true">↗</span></span>
        </article>

        <!-- 3. Cálculo de Pulpa -->
        <article
          class="tool-card"
          role="button"
          tabindex="0"
          @click="$emit('open-tool', 'pulp')"
          @keydown.enter.prevent="$emit('open-tool', 'pulp')"
          @keydown.space.prevent="$emit('open-tool', 'pulp')"
        >
          <div class="tool-card-top">
            <div class="tool-header-row">
              <div class="tool-icon-badge">🧪</div>
              <span class="tool-pill">Reología</span>
            </div>
            <h3>Cálculo de Pulpa</h3>
            <p>Calculadora instantánea de variables de pulpa: densidades, porcentajes de sólidos en peso y volumen, flujos másicos y volumétricos.</p>
          </div>
          <span class="tool-action">Abrir herramienta <span class="action-arrow" aria-hidden="true">↗</span></span>
        </article>

        <!-- 4. Hidrociclones -->
        <article
          class="tool-card"
          role="button"
          tabindex="0"
          @click="$emit('open-tool', 'cyclone')"
          @keydown.enter.prevent="$emit('open-tool', 'cyclone')"
          @keydown.space.prevent="$emit('open-tool', 'cyclone')"
        >
          <div class="tool-card-top">
            <div class="tool-header-row">
              <div class="tool-icon-badge">🌪️</div>
              <span class="tool-pill">Clasificación</span>
            </div>
            <h3>Hidrociclones</h3>
            <p>Reconciliación de surveys granulométricos y calibración/simulación de baterías de hidrociclones aplicando el modelo de Nageswararao.</p>
          </div>
          <span class="tool-action">Abrir herramienta <span class="action-arrow" aria-hidden="true">↗</span></span>
        </article>
      </div>
    </section>

    <!-- SECCIÓN INTERACTIVA: DESARROLLO DE HERRAMIENTAS Y CAPACITACIÓN -->
    <section class="section interaction-section">
      <div class="interaction-grid">
        <!-- Tarjeta 1: Proyecto / Herramienta a medida -->
        <div class="interaction-card">
          <div class="card-icon">💡</div>
          <h3>¿Deseas desarrollar una herramienta o proyecto?</h3>
          <p>
            Si tienes una necesidad operativa específica, algoritmo de proceso o quieres digitalizar una metodología de tu planta, podemos desarrollarla a medida.
          </p>
          <div class="form-group">
            <textarea 
              v-model="projectIdea" 
              placeholder="Cuéntanos brevemente qué herramienta, modelo o cálculo te gustaría implementar..."
              rows="3"
              aria-label="Describe la herramienta o proyecto que necesitas"
            ></textarea>
          </div>
          <button class="btn-action" @click="contactForProject">
            Consultar sobre este proyecto ↗
          </button>
        </div>

        <!-- Tarjeta 2: Capacitación de un tema específico -->
        <div class="interaction-card">
          <div class="card-icon">🎓</div>
          <h3>¿Necesitas un curso sobre algún tema particular?</h3>
          <p>
            Capacitaciones personalizadas para equipos de metalurgia de procesos, operaciones y control de calidad en plantas mineras.
          </p>
          <div class="form-group">
            <input 
              type="text" 
              v-model="courseTopic" 
              placeholder="Escribe el tema que te interesa (ej. Flotación, Molienda...)"
              aria-label="Tema de capacitación o curso de interés"
            />
          </div>
          <button class="btn-action" @click="contactForCourse">
            Solicitar información de curso ↗
          </button>
        </div>
      </div>
    </section>

    <!-- FOOTER MINIMALISTA -->
    <footer class="home-footer">
      <div class="footer-content">
        <div class="footer-brand-box">
          <img src="@/assets/logo.png" alt="SuiteMinerals" class="footer-logo" />
          <span class="brand">SUITE MINERALS</span>
        </div>
        <p class="developer">
          Desarrollado por 
          <a href="https://suitechpe.com" target="_blank" rel="noopener noreferrer">
            SUITECH PERU
          </a>
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue';

defineEmits(['open-tool']);

const projectIdea = ref('');
const courseTopic = ref('');

const companyUrl = 'https://suitechpe.com';

function scrollToTools() {
  const el = document.getElementById('tools-section');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function contactForProject() {
  window.open(companyUrl, '_blank', 'noopener,noreferrer');
}

function contactForCourse() {
  window.open(companyUrl, '_blank', 'noopener,noreferrer');
}
</script>

<style scoped>
.home-container {
  --copper: #b45309;
  --copper-soft: #fff7ed;
  --copper-border: #fed7aa;
  --ink: #0f172a;
  --muted: #64748b;
  --border: #e2e8f0;
  --surface: #f8fafc;

  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: clamp(20px, 4vw, 48px) clamp(16px, 3vw, 32px) clamp(36px, 5vw, 64px);
  box-sizing: border-box;
  color: #1e293b;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

/* HERO */
.hero-section {
  position: relative;
  text-align: center;
  padding: clamp(24px, 4vw, 48px) clamp(12px, 2vw, 24px) clamp(20px, 3vw, 36px);
  max-width: 780px;
  margin: 0 auto;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: min(520px, 90%);
  height: 220px;
  background: radial-gradient(circle, rgba(180, 83, 9, 0.08) 0%, rgba(255, 255, 255, 0) 70%);
  pointer-events: none;
  z-index: 0;
}

.hero-logo-box,
.hero-badge,
.hero-title,
.hero-subtitle,
.hero-actions {
  position: relative;
  z-index: 1;
}

.hero-logo-box {
  margin-bottom: clamp(16px, 2.5vw, 24px);
}

.hero-logo {
  max-height: clamp(96px, 14vw, 148px);
  width: auto;
  max-width: 100%;
  border-radius: 14px;
  background-color: #ffffff;
  padding: 8px 12px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 8px 24px -6px rgba(15, 23, 42, 0.08);
}

.hero-badge {
  display: inline-block;
  padding: 6px 14px;
  background-color: var(--copper-soft);
  color: var(--copper);
  border: 1px solid var(--copper-border);
  border-radius: 999px;
  font-size: clamp(0.7rem, 1.5vw, 0.78rem);
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  margin-bottom: 16px;
}

.hero-title {
  font-size: clamp(1.9rem, 4.5vw, 2.85rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--ink);
  margin: 0 0 14px 0;
  line-height: 1.1;
}

.hero-subtitle {
  font-size: clamp(0.98rem, 1.8vw, 1.12rem);
  line-height: 1.65;
  color: var(--muted);
  margin: 0 auto 28px auto;
  max-width: 640px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  background: var(--ink);
  color: #ffffff;
  border: 1px solid var(--ink);
  padding: 11px 22px;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: #1e293b;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px -4px rgba(15, 23, 42, 0.2);
}

.btn-primary:hover .btn-arrow {
  transform: translateX(3px);
}

.btn-arrow {
  transition: transform 0.2s ease;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  background: #ffffff;
  color: #334155;
  border: 1px solid #cbd5e1;
  padding: 11px 20px;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--surface);
  border-color: #94a3b8;
  color: var(--ink);
}

/* SECTIONS */
.section {
  margin-top: clamp(40px, 6vw, 68px);
}

.section-header {
  text-align: center;
  max-width: 600px;
  margin: 0 auto clamp(24px, 4vw, 36px) auto;
}

.section-tag {
  color: var(--copper);
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.9px;
}

.section-header h2 {
  font-size: clamp(1.4rem, 3vw, 1.85rem);
  font-weight: 700;
  color: var(--ink);
  margin: 8px 0 10px 0;
  letter-spacing: -0.02em;
}

.section-header p {
  color: var(--muted);
  font-size: 0.95rem;
  line-height: 1.55;
  margin: 0;
}

/* TOOLS GRID - RESPONSIVO SIN TARJETAS HUÉRFANAS */
.tools-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(14px, 2vw, 20px);
}

.tool-card {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: clamp(18px, 2.2vw, 24px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  outline: none;
}

.tool-card:hover,
.tool-card:focus-visible {
  border-color: var(--copper);
  box-shadow: 0 12px 28px -8px rgba(15, 23, 42, 0.1);
  transform: translateY(-2px);
}

.tool-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 16px;
}

.tool-icon-badge {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--copper-soft);
  border: 1px solid var(--copper-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.45rem;
  flex-shrink: 0;
}

.tool-pill {
  font-size: 0.72rem;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
  padding: 4px 10px;
  border-radius: 999px;
}

.tool-card-top h3 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 8px 0;
}

.tool-card-top p {
  font-size: 0.88rem;
  color: var(--muted);
  line-height: 1.55;
  margin: 0 0 20px 0;
}

.tool-action {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--copper);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.action-arrow {
  transition: transform 0.2s ease;
}

.tool-card:hover .action-arrow {
  transform: translate(2px, -2px);
}

/* INTERACTION SECTION */
.interaction-section {
  margin-top: clamp(44px, 6vw, 72px);
}

.interaction-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(16px, 2.5vw, 24px);
}

.interaction-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: clamp(20px, 3vw, 28px);
  display: flex;
  flex-direction: column;
}

.card-icon {
  font-size: 1.7rem;
  margin-bottom: 12px;
}

.interaction-card h3 {
  font-size: clamp(1.08rem, 2vw, 1.2rem);
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 10px 0;
}

.interaction-card p {
  font-size: 0.9rem;
  color: var(--muted);
  line-height: 1.55;
  margin: 0 0 18px 0;
  flex-grow: 1;
}

.form-group {
  margin-bottom: 16px;
}

.form-group textarea,
.form-group input {
  width: 100%;
  box-sizing: border-box;
  padding: 11px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.92rem;
  color: #1e293b;
  background: #ffffff;
  transition: border-color 0.2s, box-shadow 0.2s;
  resize: vertical;
}

.form-group textarea:focus,
.form-group input:focus {
  outline: none;
  border-color: var(--copper);
  box-shadow: 0 0 0 3px rgba(180, 83, 9, 0.12);
}

.btn-action {
  min-height: 44px;
  background: var(--ink);
  color: #ffffff;
  border: none;
  padding: 11px 18px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  align-self: flex-start;
}

.btn-action:hover {
  background: #1e293b;
  transform: translateY(-1px);
}

/* FOOTER */
.home-footer {
  margin-top: clamp(48px, 7vw, 80px);
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.footer-brand-box {
  display: flex;
  align-items: center;
  gap: 10px;
}

.footer-logo {
  height: 28px;
  width: auto;
  border-radius: 4px;
}

.footer-content .brand {
  font-weight: 800;
  letter-spacing: 0.5px;
  color: var(--ink);
  margin: 0;
}

.footer-content .developer {
  font-size: 0.88rem;
  color: var(--muted);
  margin: 0;
}

.footer-content a {
  color: var(--copper);
  text-decoration: none;
  font-weight: 600;
}

.footer-content a:hover {
  text-decoration: underline;
}

/* BREAKPOINTS: LAPTOPS PEQUEÑAS / TABLETS / CELULARES */
@media (max-width: 1180px) {
  .tools-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .interaction-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .tools-grid {
    grid-template-columns: 1fr;
  }
  .hero-actions {
    flex-direction: column;
    width: 100%;
  }
  .btn-primary,
  .btn-secondary,
  .btn-action {
    width: 100%;
  }
  .footer-content {
    flex-direction: column;
    text-align: center;
  }
}
</style>
