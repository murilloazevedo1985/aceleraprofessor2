import React from 'react';
import { BrainCircuit, FlaskConical, BookOpen } from 'lucide-react';

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
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-center p-4">
      <div className="max-w-lg">
        {/* O caminho para o GIF é relativo à pasta 'public' */}
        <img 
          src="assets/giphy (1)" 
          alt="Cérebro de IA processando informações" 
          className="w-64 h-64 mx-auto mb-8 rounded-full shadow-2xl"
        />
        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-4">
          Aguarde um momento...
        </h1>
        <div className="h-16 flex items-center justify-center">
          <div key={dicaAtual} className="flex items-center gap-3 text-indigo-600 animate-in fade-in duration-500">
            {dicas[dicaAtual].icone}
            <p className="text-lg font-medium">{dicas[dicaAtual].texto}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
