import { useNavigate } from 'react-router-dom';

const PrivacyFooter = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full py-6 mt-8 text-center" style={{ fontSize: '12px' }}>
      <button
        onClick={() => navigate('/uso')}
        className="text-muted-foreground hover:text-foreground underline mx-2 transition-colors"
      >
        Política de Privacidad
      </button>
      <button
        onClick={() => navigate('/uso')}
        className="text-muted-foreground hover:text-foreground underline mx-2 transition-colors"
      >
        Términos de Servicio
      </button>
    </div>
  );
};

export default PrivacyFooter;
