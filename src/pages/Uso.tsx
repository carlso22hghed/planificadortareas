import { useNavigate } from 'react-router-dom';

const Uso = () => {
  const navigate = useNavigate();

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', color: '#222222', fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: '16px', lineHeight: '1.8' }}>
      <div style={{ maxWidth: 750, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#4A90D9', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', marginBottom: '1.5rem', padding: 0 }}>
          ← Volver a la app
        </button>

        <div style={{ display: 'inline-block', background: '#F3F0FF', color: '#7C3AED', fontSize: '0.8rem', fontWeight: 600, padding: '0.3rem 0.9rem', borderRadius: 999, marginBottom: '2rem' }}>
          📅 Última actualización: abril 2026
        </div>

        <h1 style={{ color: '#111111', fontSize: '2rem', marginBottom: '0.5rem' }}>Privacidad y Términos de Servicio</h1>
        <p style={{ color: '#555', marginBottom: '2.5rem' }}>Planificador de Tareas — planificadortareas.lovable.app</p>

        <Section title="01 — ¿Quién trata tus datos?">
          <p>Planificador de Tareas es una aplicación web que te permite gestionar tus tareas y sincronizarlas con Google Classroom. El responsable del tratamiento de tus datos es el desarrollador de la aplicación.</p>
          <Highlight>Esta política cumple con el RGPD de la UE y la LOPDGDD de España.</Highlight>
        </Section>

        <Section title="02 — Datos que recopilamos">
          <h3 style={h3Style}>Datos que tú introduces</h3>
          <ul style={ulStyle}>
            <li>Tareas: título, descripción y fecha de vencimiento</li>
            <li>Preferencias de configuración de la aplicación</li>
          </ul>
          <h3 style={h3Style}>Datos de Google Classroom (solo si sincronizas)</h3>
          <ul style={ulStyle}>
            <li>Nombre de tus cursos y asignaturas</li>
            <li>Títulos, descripciones y fechas de entrega de tus tareas</li>
            <li>Token de acceso OAuth de Google (guardado en tu dispositivo)</li>
          </ul>
          <h3 style={h3Style}>Datos técnicos</h3>
          <ul style={ulStyle}>
            <li>Preferencias almacenadas en localStorage de tu navegador</li>
            <li>No utilizamos cookies de rastreo ni analítica de terceros</li>
          </ul>
        </Section>

        <Section title="03 — Uso de los datos">
          <ul style={ulStyle}>
            <li>Mostrar y gestionar tus tareas dentro de la aplicación</li>
            <li>Sincronizar y actualizar tareas desde Google Classroom</li>
            <li>Recordar tu preferencia de sincronización entre sesiones</li>
            <li>Mejorar la experiencia de uso de la aplicación</li>
          </ul>
          <p>No vendemos, alquilamos ni compartimos tus datos con terceros para fines comerciales.</p>
        </Section>

        <Section title="04 — Integración con Google Classroom">
          <p>Cuando usas la sincronización, la aplicación accede a tu cuenta de Google únicamente con los siguientes permisos:</p>
          <ul style={ulStyle}>
            <li><strong style={{ color: '#111' }}>classroom.courses.readonly</strong> — Ver tus cursos</li>
            <li><strong style={{ color: '#111' }}>classroom.coursework.me.readonly</strong> — Ver tus tareas asignadas</li>
          </ul>
          <p>El acceso se realiza mediante OAuth 2.0. Tu contraseña nunca es accesible. El token se almacena únicamente en tu navegador.</p>
          <Highlight>Puedes revocar el acceso desde <a href="https://myaccount.google.com/permissions" style={{ color: '#5B21B6' }}>myaccount.google.com/permissions</a></Highlight>
        </Section>

        <Section title="05 — Seguridad de los datos">
          <ul style={ulStyle}>
            <li>Todos los datos transmitidos entre la app y Google Classroom están cifrados mediante HTTPS/TLS</li>
            <li>Los tokens OAuth 2.0 se almacenan en localStorage y nunca se transmiten a servidores externos</li>
            <li>Los tokens caducan automáticamente tras 1 hora y deben ser renovados por el usuario</li>
            <li>La aplicación nunca almacena ni accede a contraseñas</li>
            <li>La app nunca almacena datos de usuario de Google en ninguna base de datos o servidor externo</li>
            <li>Todos los datos personales permanecen exclusivamente en el dispositivo del usuario</li>
          </ul>
        </Section>

        <Section title="06 — Control de acceso">
          <ul style={ulStyle}>
            <li>Solo el usuario autenticado puede acceder a sus propios datos</li>
            <li>La app utiliza OAuth 2.0 de Google para verificar la identidad</li>
            <li>Los menores de 14 años con cuentas personales son bloqueados en el registro</li>
            <li>Los menores de 14 solo pueden acceder usando una cuenta escolar verificada</li>
            <li>Las cuentas bloqueadas se desbloquean automáticamente al cumplir 14 años</li>
            <li>Las cuentas escolares se benefician de Google Workspace for Education (RGPD, COPPA, FERPA)</li>
          </ul>
        </Section>

        <Section title="07 — Almacenamiento seguro">
          <ul style={ulStyle}>
            <li>Las tareas y preferencias se almacenan localmente en localStorage del navegador</li>
            <li>No se envían ni almacenan datos en ningún servidor de terceros</li>
            <li>Los usuarios pueden eliminar todos sus datos limpiando localStorage o usando la opción de desconexión</li>
            <li>Al desconectar la cuenta de Google, todos los tokens y datos de Classroom se eliminan inmediatamente</li>
          </ul>
        </Section>

        <Section title="08 — Almacenamiento en la nube">
          <p>La aplicación utiliza un sistema de base de datos en la nube para guardar tus tareas, notas, ajustes y progreso de forma segura entre dispositivos.</p>
          <ul style={ulStyle}>
            <li>Cada usuario solo puede acceder a sus propios datos gracias a políticas de seguridad a nivel de fila (RLS)</li>
            <li>Las conversaciones con el asistente Nox se almacenan cifradas y asociadas exclusivamente a tu cuenta</li>
            <li>Ningún otro usuario, administrador ni tercero puede ver tus conversaciones ni datos personales</li>
            <li>Las claves de API y tokens de acceso a servicios de IA se almacenan en un vault seguro del servidor, nunca en el código fuente</li>
            <li>Toda la comunicación entre la app y la base de datos se realiza mediante HTTPS/TLS</li>
            <li>Puedes solicitar la eliminación completa de todos tus datos en cualquier momento</li>
          </ul>
        </Section>

        <Section title="09 — Tus derechos">
          <p>Conforme al RGPD, tienes derecho a:</p>
          <ul style={ulStyle}>
            <li>Acceder a los datos que tenemos sobre ti</li>
            <li>Rectificar datos incorrectos o incompletos</li>
            <li>Eliminar tus datos (derecho al olvido)</li>
            <li>Oponerte al tratamiento de tus datos</li>
            <li>Revocar el consentimiento en cualquier momento</li>
          </ul>
        </Section>

        <Section title="10 — Contacto">
          <p>Si tienes cualquier duda sobre esta política de privacidad, puedes contactarnos a través de los canales disponibles en la aplicación.</p>
        </Section>

        <hr style={{ border: 'none', borderTop: '1px solid #E5E5E5', margin: '2rem 0' }} />

        <Section title="Condiciones de uso">
          <p>Al acceder y usar Planificador de Tareas, aceptas estas condiciones. El servicio es gratuito y se ofrece "tal cual". No nos hacemos responsables de pérdida de datos ni interrupciones. Todo el contenido está protegido por propiedad intelectual. Legislación aplicable: España / UE.</p>
        </Section>

        <div style={{ textAlign: 'center', color: '#888', fontSize: '0.85rem', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #E5E5E5' }}>
          <p>© 2026 Planificador de Tareas — Todos los derechos reservados</p>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#4A90D9', cursor: 'pointer', marginTop: '0.5rem' }}>Volver a la app</button>
        </div>
      </div>
    </div>
  );
};

const sectionStyle: React.CSSProperties = {
  borderLeft: '4px solid #7C3AED',
  padding: '1.5rem 1.5rem 1.5rem 1.75rem',
  marginBottom: '2rem',
  background: '#FAFAFA',
  borderRadius: '0 8px 8px 0',
};

const h3Style: React.CSSProperties = { color: '#111', fontSize: '1.05rem', margin: '1.25rem 0 0.5rem' };
const ulStyle: React.CSSProperties = { paddingLeft: '1.25rem', marginBottom: '0.75rem', color: '#222' };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={sectionStyle}>
    <h2 style={{ color: '#111111', fontSize: '1.25rem', marginBottom: '0.75rem' }}>{title}</h2>
    {children}
  </div>
);

const Highlight = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: '#F3F0FF', borderRadius: 6, padding: '0.8rem 1rem', margin: '0.75rem 0', color: '#5B21B6', fontSize: '0.9rem' }}>
    {children}
  </div>
);

export default Uso;
