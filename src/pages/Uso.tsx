import { useEffect, useRef, useState } from 'react';

const htmlContent = `<nav>
  <span class="nav-brand">Planificador de Tareas</span>
  <div class="nav-tabs">
    <button class="nav-tab active" data-tab="privacidad">Privacidad</button>
    <button class="nav-tab" data-tab="condiciones">Condiciones</button>
  </div>
</nav>

<div class="hero">
  <span class="hero-tag">Documentos legales</span>
  <h1>Tu privacidad,<br><em>nuestra prioridad</em></h1>
  <div class="hero-meta">
    <span>📅 Última actualización: abril 2026</span>
    <span>🌐 Aplicable a: Planificador de Tareas</span>
    <span>🇪🇸 Jurisdicción: España / UE</span>
  </div>
</div>

<div class="content-wrapper">
  <section id="privacidad" class="visible">
    <div class="section-block">
      <div class="section-number">01 — Introducción</div>
      <h2>¿Quién trata tus datos?</h2>
      <p>Planificador de Tareas es una aplicación web que te permite gestionar tus tareas y sincronizarlas con Google Classroom. El responsable del tratamiento de tus datos es el desarrollador de la aplicación.</p>
      <div class="highlight-box"><p>Esta política cumple con el Reglamento General de Protección de Datos (RGPD) de la Unión Europea y la Ley Orgánica de Protección de Datos (LOPDGDD) de España.</p></div>
    </div>
    <div class="section-block">
      <div class="section-number">02 — Datos que recopilamos</div>
      <h2>¿Qué información usamos?</h2>
      <h3>Datos que tú introduces</h3>
      <ul><li>Tareas: título, descripción y fecha de vencimiento</li><li>Preferencias de configuración de la aplicación</li></ul>
      <h3>Datos de Google Classroom (solo si sincronizas)</h3>
      <ul><li>Nombre de tus cursos y asignaturas</li><li>Títulos, descripciones y fechas de entrega de tus tareas</li><li>Token de acceso OAuth de Google (guardado en tu dispositivo)</li></ul>
      <h3>Datos técnicos</h3>
      <ul><li>Preferencias almacenadas en localStorage de tu navegador</li><li>No utilizamos cookies de rastreo ni analítica de terceros</li></ul>
    </div>
    <div class="section-block">
      <div class="section-number">03 — Uso de los datos</div>
      <h2>¿Para qué usamos tu información?</h2>
      <ul><li>Mostrar y gestionar tus tareas dentro de la aplicación</li><li>Sincronizar y actualizar tareas desde Google Classroom</li><li>Recordar tu preferencia de sincronización entre sesiones</li><li>Mejorar la experiencia de uso de la aplicación</li></ul>
      <p>No vendemos, alquilamos ni compartimos tus datos con terceros para fines comerciales.</p>
    </div>
    <div class="section-block">
      <div class="section-number">04 — Google Classroom</div>
      <h2>Integración con Google</h2>
      <p>Cuando usas la sincronización con Google Classroom, la aplicación accede a tu cuenta de Google únicamente con los siguientes permisos:</p>
      <ul><li><strong>classroom.courses.readonly</strong> — Ver tus cursos</li><li><strong>classroom.coursework.me.readonly</strong> — Ver tus tareas asignadas</li></ul>
      <p>El acceso a Google se realiza mediante OAuth 2.0. Tu contraseña de Google nunca es accesible por esta aplicación. El token de acceso se almacena únicamente en tu navegador (localStorage) y no se envía a ningún servidor externo.</p>
      <div class="highlight-box"><p>Puedes revocar el acceso en cualquier momento desde tu cuenta de Google en myaccount.google.com/permissions</p></div>
    </div>
    <div class="section-block">
      <div class="section-number">05 — Tus derechos</div>
      <h2>Control total sobre tus datos</h2>
      <p>Conforme al RGPD, tienes derecho a:</p>
      <ul><li>Acceder a los datos que tenemos sobre ti</li><li>Rectificar datos incorrectos o incompletos</li><li>Eliminar tus datos (derecho al olvido)</li><li>Oponerte al tratamiento de tus datos</li><li>Revocar el consentimiento en cualquier momento</li></ul>
      <p>Dado que los datos se almacenan localmente en tu navegador, puedes eliminarlos en cualquier momento limpiando el localStorage desde los ajustes de tu navegador o usando la opción "Desconectar" dentro de la app.</p>
    </div>
    <div class="section-block">
      <div class="section-number">06 — Contacto</div>
      <h2>¿Tienes preguntas?</h2>
      <p>Si tienes cualquier duda sobre esta política de privacidad, puedes contactarnos:</p>
      <div class="contact-card"><strong>Planificador de Tareas</strong><p>Para cualquier consulta sobre privacidad o protección de datos, contacta con el desarrollador de la aplicación a través de los canales disponibles en la app.</p></div>
    </div>
  </section>

  <section id="condiciones">
    <div class="section-block">
      <div class="section-number">01 — Aceptación</div>
      <h2>Condiciones de uso</h2>
      <p>Al acceder y usar Planificador de Tareas, aceptas quedar vinculado por estas Condiciones de Servicio. Si no estás de acuerdo con alguna de ellas, te pedimos que no uses la aplicación.</p>
      <div class="highlight-box"><p>El uso continuado de la aplicación implica la aceptación de las condiciones vigentes en cada momento.</p></div>
    </div>
    <div class="section-block">
      <div class="section-number">02 — Descripción del servicio</div>
      <h2>¿Qué es Planificador de Tareas?</h2>
      <p>Planificador de Tareas es una aplicación web que permite a los usuarios:</p>
      <ul><li>Crear, editar y organizar tareas personales</li><li>Sincronizar tareas con Google Classroom</li><li>Gestionar fechas de entrega y prioridades</li></ul>
      <p>El servicio se ofrece de forma gratuita. Nos reservamos el derecho de modificar, suspender o discontinuar cualquier parte del servicio en cualquier momento.</p>
    </div>
    <div class="section-block">
      <div class="section-number">03 — Uso aceptable</div>
      <h2>Normas de uso</h2>
      <p>Al usar la aplicación, te comprometes a:</p>
      <ul><li>Usar el servicio únicamente para fines personales y legítimos</li><li>No intentar acceder a datos de otros usuarios</li><li>No usar la aplicación para actividades ilegales o dañinas</li><li>No intentar manipular, hackear o interferir con el funcionamiento de la app</li><li>Respetar los términos de uso de Google al sincronizar con Classroom</li></ul>
    </div>
    <div class="section-block">
      <div class="section-number">04 — Propiedad intelectual</div>
      <h2>Derechos de autor</h2>
      <p>Todo el código, diseño, logotipos y contenido de Planificador de Tareas son propiedad del desarrollador y están protegidos por las leyes de propiedad intelectual aplicables.</p>
      <p>Se te concede una licencia limitada, no exclusiva e intransferible para usar la aplicación exclusivamente para tus fines personales.</p>
    </div>
    <div class="section-block">
      <div class="section-number">05 — Limitación de responsabilidad</div>
      <h2>Exención de responsabilidad</h2>
      <p>Planificador de Tareas se proporciona "tal cual", sin garantías de ningún tipo. No nos hacemos responsables de:</p>
      <ul><li>Pérdida de datos almacenados en el navegador</li><li>Interrupciones del servicio de Google Classroom</li><li>Daños derivados del uso o la imposibilidad de uso de la aplicación</li><li>Errores de sincronización con servicios de terceros</li></ul>
      <div class="highlight-box"><p>Recomendamos no usar esta aplicación como único sistema de gestión para tareas críticas o de alto impacto.</p></div>
    </div>
    <div class="section-block">
      <div class="section-number">06 — Modificaciones</div>
      <h2>Cambios en las condiciones</h2>
      <p>Nos reservamos el derecho de actualizar estas condiciones en cualquier momento. Los cambios entrarán en vigor desde el momento de su publicación en esta página. Te notificaremos los cambios relevantes a través de la propia aplicación.</p>
      <p>La fecha de última actualización siempre estará visible en la parte superior de este documento.</p>
    </div>
    <div class="section-block">
      <div class="section-number">07 — Legislación aplicable</div>
      <h2>Jurisdicción</h2>
      <p>Estas condiciones se rigen por la legislación española y de la Unión Europea. Cualquier disputa derivada del uso de la aplicación se someterá a la jurisdicción de los tribunales competentes de España.</p>
      <div class="contact-card"><strong>Planificador de Tareas</strong><p>Para cualquier consulta sobre estas condiciones, contacta con el desarrollador a través de los canales disponibles en la aplicación.</p></div>
    </div>
  </section>
</div>

<footer>© 2026 Planificador de Tareas — Todos los derechos reservados</footer>`;

const styles = `
  :host {
    all: initial;
    display: block;
  }
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
  :root {
    --bg: #F7F5F0; --surface: #FFFFFF; --ink: #1A1A1A; --ink-light: #6B6B6B;
    --accent: #2D5BE3; --accent-soft: #EEF2FF; --border: #E5E2DB;
    --tag-bg: #1A1A1A; --tag-fg: #F7F5F0;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :host { background: var(--bg); color: var(--ink); font-family: 'DM Sans', sans-serif; font-weight: 300; line-height: 1.75; font-size: 16px; min-height: 100vh; }
  nav { position: sticky; top: 0; z-index: 100; background: var(--bg); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 1rem 2.5rem; }
  .nav-brand { font-family: 'DM Serif Display', serif; font-size: 1.1rem; color: var(--ink); text-decoration: none; }
  .nav-tabs { display: flex; gap: 0.25rem; background: var(--border); border-radius: 999px; padding: 4px; }
  .nav-tab { padding: 0.35rem 1.1rem; border-radius: 999px; font-size: 0.85rem; font-weight: 500; cursor: pointer; border: none; background: transparent; color: var(--ink-light); transition: all 0.2s; }
  .nav-tab.active, .nav-tab:hover { background: var(--surface); color: var(--ink); box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  .hero { padding: 5rem 2.5rem 3rem; max-width: 780px; margin: 0 auto; }
  .hero-tag { display: inline-block; background: var(--tag-bg); color: var(--tag-fg); font-size: 0.7rem; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; padding: 0.3rem 0.8rem; border-radius: 999px; margin-bottom: 1.5rem; }
  .hero h1 { font-family: 'DM Serif Display', serif; font-size: clamp(2.2rem, 5vw, 3.2rem); line-height: 1.15; margin-bottom: 1rem; color: var(--ink); }
  .hero h1 em { font-style: italic; color: var(--accent); }
  .hero-meta { font-size: 0.875rem; color: var(--ink-light); display: flex; gap: 1.5rem; flex-wrap: wrap; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border); }
  .content-wrapper { max-width: 780px; margin: 0 auto; padding: 0 2.5rem 6rem; }
  section { display: none; }
  section.visible { display: block; }
  .section-block { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 2.5rem; margin-bottom: 1.5rem; }
  .section-number { font-size: 0.7rem; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-light); margin-bottom: 0.75rem; }
  h2 { font-family: 'DM Serif Display', serif; font-size: 1.5rem; margin-bottom: 1rem; color: var(--ink); }
  h3 { font-size: 0.95rem; font-weight: 500; margin: 1.5rem 0 0.5rem; color: var(--ink); }
  p { color: var(--ink-light); margin-bottom: 0.75rem; font-size: 0.95rem; }
  ul { list-style: none; padding: 0; margin-bottom: 0.75rem; }
  ul li { color: var(--ink-light); font-size: 0.95rem; padding: 0.3rem 0 0.3rem 1.25rem; position: relative; }
  ul li::before { content: '—'; position: absolute; left: 0; color: var(--accent); font-weight: 500; }
  .highlight-box { background: var(--accent-soft); border-left: 3px solid var(--accent); border-radius: 0 8px 8px 0; padding: 1rem 1.25rem; margin: 1rem 0; }
  .highlight-box p { color: var(--accent); margin: 0; font-weight: 500; font-size: 0.9rem; }
  .contact-card { background: var(--tag-bg); color: var(--tag-fg); border-radius: 12px; padding: 1.5rem 2rem; margin-top: 1rem; }
  .contact-card p { color: rgba(247,245,240,0.7); margin: 0; font-size: 0.9rem; }
  .contact-card strong { color: var(--tag-fg); display: block; font-size: 1rem; margin-bottom: 0.35rem; }
  footer { border-top: 1px solid var(--border); text-align: center; padding: 2rem; font-size: 0.8rem; color: var(--ink-light); }
  @media (max-width: 600px) { nav { padding: 1rem 1.25rem; } .hero, .content-wrapper { padding-left: 1.25rem; padding-right: 1.25rem; } .section-block { padding: 1.5rem; } }
`;

const Uso = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const shadow = containerRef.current.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = styles;
    shadow.appendChild(style);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = htmlContent;
    shadow.appendChild(wrapper);

    // Tab switching
    shadow.querySelectorAll('.nav-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        shadow.querySelectorAll('section').forEach(s => s.classList.remove('visible'));
        shadow.getElementById(tab!)?.classList.add('visible');
        shadow.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }, []);

  return <div ref={containerRef} style={{ minHeight: '100vh', background: '#F7F5F0' }} />;
};

export default Uso;
