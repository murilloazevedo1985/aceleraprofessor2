import React from 'react';
import { BrainCircuit, FlaskConical, BookOpen } from 'lucide-react';
import loadingVideo from './src/assets/loading.mp4';

const dicas = [
  {
    icone: <BrainCircuit className="w-5 h-5" />,
    texto: "Personalizando a didática para o nível da sua turma...",
  },
  {
    icone: <FlaskConical className="w-5 h-5" />,
    texto: "Buscando experimentos e simulações interativas...",
  },
  {
    icone: <BookOpen className="w-5 h-5" />,
    texto: "Consultando a BNCC para alinhar as competências...",
  },
];

const LoadingScreen: React.FC = () => {
  const [dicaAtual, setDicaAtual] = React.useState(0);

  React.useEffect(() => {
    const intervalId = setInterval(() => {
      setDicaAtual((prev) => (prev + 1) % dicas.length);
    }, 3500); // Muda a dica a cada 3.5 segundos

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <div className="w-full max-w-lg">
        <video
          src={loadingVideo}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-label="Animação de carregamento"
          className="mx-auto mb-5 h-48 w-full max-w-sm rounded-xl object-contain sm:mb-8 sm:h-64"
        />
        <h1 className="mb-4 text-2xl font-black tracking-tight text-slate-800 sm:text-3xl">
          Aguarde um momento...
        </h1>
        <div className="flex min-h-16 items-center justify-center">
          <div key={dicaAtual} className="flex items-center justify-center gap-3 text-indigo-600 animate-in fade-in duration-500">
            {dicas[dicaAtual].icone}
            <p className="text-base font-medium sm:text-lg">{dicas[dicaAtual].texto}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
