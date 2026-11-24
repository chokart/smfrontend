<template>
  <div class="courses-container">
    <!-- CABECERA -->
    <header class="courses-header">
      <div class="header-badge">Capacitación Especializada</div>
      <h1>Cursos Técnicos</h1>
      <p class="header-description">
        Programas de formación práctica y avanzada en metalurgia de procesos, balances metalúrgicos, modelamiento computacional y optimización de plantas concentradoras.
      </p>
    </header>

    <!-- LISTA DE CURSOS -->
    <div class="courses-grid">
      <!-- Curso 1 -->
      <article class="course-card">
        <div class="course-header">
          <span class="course-level">Especialización</span>
          <span class="course-duration">24 Horas</span>
        </div>
        <h2 class="course-title">Balance de Materia y Reconciliación Metalúrgica Industrial</h2>
        <p class="course-summary">
          Fundamentos estadísticos y algoritmos de mínimos cuadrados ponderados para la reconciliación coherente de flujos y leyes en circuitos complejos de flotación y lixiviación.
        </p>
        <ul class="course-topics">
          <li>Teoría de muestreo y propagación de errores analíticos.</li>
          <li>Reconciliación nodal y balance global multicomponente.</li>
          <li>Detección de inconsistencias e instrumentación no calibrada.</li>
          <li>Casos prácticos industriales en SuiteMinerals y Excel Solver.</li>
        </ul>
        <div class="course-footer">
          <button class="btn-enroll" @click="consultCourse('Balance de Materia y Reconciliación')">
            Consultar Información ↗
          </button>
        </div>
      </article>

      <!-- Curso 2 -->
      <article class="course-card">
        <div class="course-header">
          <span class="course-level">Avanzado</span>
          <span class="course-duration">20 Horas</span>
        </div>
        <h2 class="course-title">Modelamiento, Calibración y Optimización de Hidrociclones</h2>
        <p class="course-summary">
          Metodología integral para el levantamiento de survey granulométrico, balance de masa por mallas, determinación de curvas de partición reales y corregidas, y calibración de Nageswararao.
        </p>
        <ul class="course-topics">
          <li>Curvas Tromp, d50c, bypass de finos e imperfección.</li>
          <li>Parámetros geométricos (vortex, apex, inclinación, presión).</li>
          <li>Ajuste no lineal de coeficientes de calibración.</li>
          <li>Simulación de cambios operativos para control de P80 y carga circulante.</li>
        </ul>
        <div class="course-footer">
          <button class="btn-enroll" @click="consultCourse('Modelamiento y Calibración de Hidrociclones')">
            Consultar Información ↗
          </button>
        </div>
      </article>

      <!-- Curso 3 -->
      <article class="course-card">
        <div class="course-header">
          <span class="course-level">Práctico</span>
          <span class="course-duration">16 Horas</span>
        </div>
        <h2 class="course-title">Balance Hídrico y Reología de Pulpas en Circuitos de Molienda</h2>
        <p class="course-summary">
          Cálculo riguroso de balances de agua, porcentaje de sólidos, caudales volumétricos y flujos de pulpa en cajones de bombeo, sumideros y etapas de dilución.
        </p>
        <ul class="course-topics">
          <li>Relaciones matemáticas fundamentales entre sólido, agua y pulpa.</li>
          <li>Balances de agua en circuitos cerrados con clasificación.</li>
          <li>Estimación de densidades y consumos específicos de agua de proceso.</li>
          <li>Uso eficiente del recurso hídrico y balance en espesadores.</li>
        </ul>
        <div class="course-footer">
          <button class="btn-enroll" @click="consultCourse('Balance Hídrico y Reología de Pulpas')">
            Consultar Información ↗
          </button>
        </div>
      </article>

      <!-- Curso 4 -->
      <article class="course-card">
        <div class="course-header">
          <span class="course-level">Especialización</span>
          <span class="course-duration">24 Horas</span>
        </div>
        <h2 class="course-title">Optimización y Control de Circuitos de Molienda y Clasificación</h2>
        <p class="course-summary">
          Diagnóstico de cuellos de botella en molienda SAG, bolas y chancado, evaluación de consumo energético (Bond Work Index) y balance operacional.
        </p>
        <ul class="course-topics">
          <li>Eficiencia energética en molienda y distribución granulométrica.</li>
          <li>Control de carga circulante y densidad de alimentación a flotación.</li>
          <li>Estrategias de control avanzado de molinos y baterías.</li>
          <li>Auditorías metalúrgicas y diseño de campañas de muestreo.</li>
        </ul>
        <div class="course-footer">
          <button class="btn-enroll" @click="consultCourse('Optimización de Circuitos de Molienda')">
            Consultar Información ↗
          </button>
        </div>
      </article>
    </div>

    <!-- PROPUESTA DE CURSOS A MEDIDA O IN-HOUSE -->
    <section class="custom-training-card">
      <div class="custom-training-content">
        <span class="custom-badge">In-House & Formación a Medida</span>
        <h2>¿Necesitas capacitar a tu equipo en un tema específico?</h2>
        <p>
          Diseñamos cursos adaptados a las condiciones operativas de tu planta concentradora, con datos y diagramas de flujo reales de tu unidad minera.
        </p>
        <div class="custom-input-box">
          <input 
            type="text" 
            v-model="customTopic" 
            placeholder="Indica el tema o requerimiento de tu equipo..."
          />
          <button class="btn-submit" @click="consultCustomCourse">
            Solicitar propuesta a medida ↗
          </button>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="courses-footer">
      <p>SUITE MINERALS • Formación técnica en procesamiento mineral</p>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const customTopic = ref('');
const linkedinUrl = 'https://www.linkedin.com/in/lchoquehuancaa/';

function consultCourse(courseName) {
  const msg = `Hola Luis, me gustaría recibir más información sobre el curso: ${courseName}.`;
  window.open(linkedinUrl, '_blank');
}

function consultCustomCourse() {
  const topic = customTopic.value.trim() 
    ? `Hola Luis, me gustaría solicitar una propuesta de capacitación in-house sobre: ${customTopic.value.trim()}`
    : 'Hola Luis, me gustaría consultar por capacitaciones personalizadas e in-house.';
  window.open(linkedinUrl, '_blank');
}
</script>

<style scoped>
.courses-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 24px 60px 24px;
  color: #1e293b;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.courses-header {
  text-align: center;
  max-width: 760px;
  margin: 0 auto 50px auto;
}

.header-badge {
  display: inline-block;
  padding: 5px 12px;
  background-color: #f1f5f9;
  color: #475569;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 16px;
}

.courses-header h1 {
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #0f172a;
  margin: 0 0 14px 0;
}

.header-description {
  font-size: 1.1rem;
  line-height: 1.6;
  color: #64748b;
  margin: 0;
}

/* GRID DE CURSOS */
.courses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  margin-bottom: 60px;
}

.course-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
}

.course-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.06);
}

.course-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.course-level {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #2563eb;
  background: #eff6ff;
  padding: 4px 10px;
  border-radius: 6px;
}

.course-duration {
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 500;
}

.course-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.4;
  margin: 0 0 12px 0;
}

.course-summary {
  font-size: 0.9rem;
  color: #64748b;
  line-height: 1.5;
  margin: 0 0 20px 0;
}

.course-topics {
  margin: 0 0 24px 0;
  padding-left: 20px;
  font-size: 0.88rem;
  color: #334155;
  line-height: 1.6;
  flex-grow: 1;
}

.course-topics li {
  margin-bottom: 6px;
}

.course-footer {
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}

.btn-enroll {
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #cbd5e1;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.btn-enroll:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

/* CUSTOM TRAINING */
.custom-training-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 40px 32px;
  text-align: center;
  max-width: 800px;
  margin: 0 auto 60px auto;
}

.custom-badge {
  color: #2563eb;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.custom-training-card h2 {
  font-size: 1.6rem;
  font-weight: 700;
  color: #0f172a;
  margin: 10px 0 12px 0;
}

.custom-training-card p {
  font-size: 0.95rem;
  color: #64748b;
  max-width: 600px;
  margin: 0 auto 24px auto;
  line-height: 1.5;
}

.custom-input-box {
  display: flex;
  gap: 12px;
  max-width: 550px;
  margin: 0 auto;
}

.custom-input-box input {
  flex-grow: 1;
  padding: 11px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.9rem;
  font-family: inherit;
  background: #ffffff;
}

.custom-input-box input:focus {
  outline: none;
  border-color: #2563eb;
}

.btn-submit {
  background: #0f172a;
  color: #ffffff;
  border: none;
  padding: 11px 20px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}

.btn-submit:hover {
  background: #1e293b;
}

/* FOOTER */
.courses-footer {
  text-align: center;
  font-size: 0.85rem;
  color: #94a3b8;
  padding-top: 20px;
  border-top: 1px solid #f1f5f9;
}

@media (max-width: 640px) {
  .custom-input-box {
    flex-direction: column;
  }
  .btn-submit {
    width: 100%;
  }
}
</style>
