const PrivacyFooter = () => {
  return (
    <div className="w-full py-6 mt-8 text-center" style={{ fontFamily: 'sans-serif', fontSize: '12px' }}>
      <a
        href="https://planificadortareas.lovable.app/uso.html"
        rel="privacy-policy"
        className="text-muted-foreground hover:text-foreground underline mx-2 transition-colors"
      >
        Política de Privacidad
      </a>
      <a
        href="https://planificadortareas.lovable.app/uso.html"
        className="text-muted-foreground hover:text-foreground underline mx-2 transition-colors"
      >
        Términos de Servicio
      </a>
    </div>
  );
};

export default PrivacyFooter;
