<template>
  <div class="home-container">
    <!-- HERO SECTION -->
    <section class="hero-section">
      <div class="hero-logo-box">
        <img src="@/assets/logo.png" alt="SuiteMinerals Logo" class="hero-logo" />
      </div>
      <div class="hero-badge">Ingeniería Metalúrgica & Procesamiento de Minerales</div>
      <h1 class="hero-title">SUITE MINERALS</h1>
      <p class="hero-subtitle">
        Plataforma técnica especializada en balance de materia, modelamiento de clasificación y cálculo reológico de pulpas para optimización en plantas concentradoras.
      </p>
      <div class="hero-actions">
        <button class="btn-primary" @click="$emit('open-tool', 'metallurgical')">
          Comenzar con Balance de Leyes →
        </button>
      </div>
    </section>

    <!-- HERRAMIENTAS DISPONIBLES -->
    <section class="section">
      <div class="section-header">
        <span class="section-tag">Módulos de Cálculo</span>
        <h2>Herramientas Integradas</h2>
        <p>Soluciones computacionales diseñadas para balancear, auditar y simular circuitos industriales.</p>
      </div>

      <div class="tools-grid">
        <!-- 1. Balance de Leyes -->
        <div class="tool-card" @click="$emit('open-tool', 'metallurgical')">
          <div class="tool-icon">⚖️</div>
          <div class="tool-info">
            <h3>Balance de Leyes</h3>
            <p>Reconciliación de balances metalúrgicos mediante mínimos cuadrados ponderados en diagramas de flujo interactivos con análisis de consistencia.</p>
          </div>
          <span class="tool-action">Abrir herramienta ↗</span>
        </div>

        <!-- 2. Balance de Agua -->
        <div class="tool-card" @click="$emit('open-tool', 'water')">
          <div class="tool-icon">💧</div>
          <div class="tool-info">
            <h3>Balance de Agua</h3>
            <p>Balance hídrico global y por nodos en circuitos cerrados con cálculo de flujo de pulpa, % sólidos, caudal y dilución por nodo.</p>
          </div>
          <span class="tool-action">Abrir herramienta ↗</span>
        </div>

        <!-- 3. Cálculo de Pulpa -->
        <div class="tool-card" @click="$emit('open-tool', 'pulp')">
          <div class="tool-icon">🧪</div>
          <div class="tool-info">
            <h3>Cálculo de Pulpa</h3>
            <p>Calculadora instantánea de variables de pulpa: densidades, porcentajes de sólidos en peso y volumen, flujos másicos y volumétricos.</p>
          </div>
          <span class="tool-action">Abrir herramienta ↗</span>
        </div>

        <!-- 4. Hidrociclones -->
        <div class="tool-card" @click="$emit('open-tool', 'cyclone')">
          <div class="tool-icon">🌪️</div>
          <div class="tool-info">
            <h3>Hidrociclones</h3>
            <p>Reconciliación de surveys granulométricos y calibración/simulación de baterías de hidrociclones aplicando el modelo de Nageswararao.</p>
          </div>
          <span class="tool-action">Abrir herramienta ↗</span>
        </div>
      </div>
    </section>

    <!-- SECCIÓN INTERACTIVA: DESARROLLO DE HERRAMIENTAS Y CURSOS A MEDIDA -->
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
            ></textarea>
          </div>
          <button class="btn-action" @click="contactForProject">
            Consultar sobre este proyecto ↗
          </button>
        </div>

        <!-- Tarjeta 2: Cursos de un tema específico -->
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
              placeholder="Escribe el tema que te interesa (ej. Flotación, Molienda, JKMRC...)"
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

function contactForProject() {
  window.open(companyUrl, '_blank');
}

function contactForCourse() {
  window.open(companyUrl, '_blank');
}
</script>

<style scoped>
.home-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 24px 60px 24px;
  color: #1e293b;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

/* HERO */
.hero-section {
  text-align: center;
  padding: 40px 20px 40px 20px;
  max-width: 800px;
  margin: 0 auto;
}

.hero-logo-box {
  margin-bottom: 24px;
}

.hero-logo {
  max-height: 150px;
  width: auto;
  border-radius: 12px;
  background-color: #ffffff;
  padding: 8px;
  box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.08);
}

.hero-badge {
  display: inline-block;
  padding: 6px 14px;
  background-color: #f1f5f9;
  color: #475569;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 20px;
}

.hero-title {
  font-size: 2.8rem;
  font-weight: 800;
  letter-spacing: -1px;
  color: #0f172a;
  margin: 0 0 16px 0;
}

.hero-subtitle {
  font-size: 1.15rem;
  line-height: 1.6;
  color: #64748b;
  margin: 0 0 32px 0;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-primary {
  background: #0f172a;
  color: #ffffff;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: #1e293b;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #ffffff;
  color: #334155;
  border: 1px solid #cbd5e1;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

/* SECTIONS */
.section {
  margin-top: 60px;
}

.section-header {
  text-align: center;
  max-width: 600px;
  margin: 0 auto 36px auto;
}

.section-tag {
  color: #2563eb;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.section-header h2 {
  font-size: 1.8rem;
  font-weight: 700;
  color: #0f172a;
  margin: 8px 0 10px 0;
}

.section-header p {
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0;
}

/* TOOLS GRID */
.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.tool-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tool-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);
  transform: translateY(-2px);
}

.tool-icon {
  font-size: 2rem;
  margin-bottom: 16px;
}

.tool-info h3 {
  font-size: 1.15rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 10px 0;
}

.tool-info p {
  font-size: 0.88rem;
  color: #64748b;
  line-height: 1.5;
  margin: 0 0 20px 0;
}

.tool-action {
  font-size: 0.85rem;
  font-weight: 600;
  color: #2563eb;
  display: inline-flex;
  align-items: center;
}

/* INTERACTION SECTION */
.interaction-section {
  margin-top: 70px;
}

.interaction-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
}

.interaction-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 28px;
  display: flex;
  flex-direction: column;
}

.card-icon {
  font-size: 1.8rem;
  margin-bottom: 12px;
}

.interaction-card h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 10px 0;
}

.interaction-card p {
  font-size: 0.9rem;
  color: #64748b;
  line-height: 1.5;
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
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.9rem;
  color: #1e293b;
  background: #ffffff;
  transition: border-color 0.2s;
}

.form-group textarea:focus,
.form-group input:focus {
  outline: none;
  border-color: #2563eb;
}

.btn-action {
  background: #0f172a;
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
}

/* FOOTER */
.home-footer {
  margin-top: 80px;
  padding-top: 30px;
  border-top: 1px solid #e2e8f0;
  text-align: center;
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
  color: #0f172a;
  margin: 0;
}

.footer-content .developer {
  font-size: 0.88rem;
  color: #64748b;
  margin: 0;
}

.footer-content a {
  color: #2563eb;
  text-decoration: none;
  font-weight: 600;
}

.footer-content a:hover {
  text-decoration: underline;
}

@media (max-width: 640px) {
  .hero-title {
    font-size: 2.1rem;
  }
  .footer-content {
    flex-direction: column;
    text-align: center;
  }
}
</style>
