import React, { useState } from 'react';
import { Rocket, ShieldCheck, BookOpen, ListChecks, ArrowRight } from 'lucide-react';
import { MenuTemas } from './components/MenuTemas'; 
import CompetenceAssessment from './components/CompetenceAssessment';
import EstrategiasPedagogicas from './components/EstrategiasPedagogicas';

interface CompetenceAssessmentProps {
  onVoltar?: () => void;
}

type MenuState = 'home' | 'assessment' | 'strategies' | 'exercises';

export default function App({ onVoltar }: CompetenceAssessmentProps) {
  const [currentMenu, setCurrentMenu] = useState<MenuState>('home');

  return (
    <div className="min-h-screen bg-sky-100 font-sans flex flex-col">
      
      {/* CABEÇALHO (NAVBAR) */}
      <header className="bg-[#1e1b4b] text-white px-8 py-4 flex items-center justify-between shadow-md z-10 relative">
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          onClick={() => setCurrentMenu('home')}
        >
          <Rocket className="w-8 h-8 text-indigo-400" />
          <h1 className="text-xl font-bold tracking-wide">acelera Professor</h1>
        </div>
        
        {/* Menu superior (só aparece se não estiver na Home) */}
        {currentMenu !== 'home' && (
          <nav className="flex items-center gap-8 text-sm font-semibold">
            <button 
              onClick={() => setCurrentMenu('assessment')} 
              className={`transition-colors pb-1 border-b-2 ${currentMenu === 'assessment' ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
            >
              Competência
            </button>
            <button 
              onClick={() => setCurrentMenu('strategies')} 
              className={`transition-colors pb-1 border-b-2 ${currentMenu === 'strategies' ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
            >
              Estratégias
            </button>
            <button 
              onClick={() => setCurrentMenu('exercises')} 
              className={`transition-colors pb-1 border-b-2 ${currentMenu === 'exercises' ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
            >
              Exercícios
            </button>
          </nav>
        )}
      </header>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 w-full flex flex-col items-center">
        
        {/* TELA INICIAL */}
        {currentMenu === 'home' && (
          <div className="flex flex-col items-center justify-center p-8 w-full min-h-[calc(100vh-80px)]">
            
            

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl w-full">
              
              {/* Card 1: Competência */}
              <div className="bg-white p-8 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-lg transition-all border border-slate-100 flex flex-col">
                <div className="w-12 h-12 bg-slate-50 text-slate-700 rounded-2xl flex items-center justify-center mb-6 border border-slate-100">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">Competência Digital</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-8 flex-1">
                  Avalie seu nível de conhecimentos, habilidades e atitudes digitais no ensino de Física.
                </p>
                <button 
                  onClick={() => setCurrentMenu('assessment')}
                  className="text-sm font-bold text-slate-800 flex items-center gap-2 hover:text-indigo-600 transition-colors w-fit"
                >
                  Avaliar Nível <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Card 2: Estratégias */}
              <div className="bg-white p-8 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-lg transition-all border border-slate-100 flex flex-col">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 border border-indigo-100">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">Estratégia Pedagógica</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-8 flex-1">
                  Crie roteiros de aula completos, com metodologias ativas, experimentos e materiais visuais.
                </p>
                <button 
                  onClick={() => setCurrentMenu('strategies')}
                  className="text-sm font-bold text-indigo-600 flex items-center gap-2 hover:text-indigo-800 transition-colors w-fit"
                >
                  Criar Roteiro <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Card 3: Lista de Exercícios */}
              <div className="bg-white p-8 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-lg transition-all border border-slate-100 flex flex-col">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100">
                  <ListChecks className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">Lista de Exercícios</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-8 flex-1">
                  Gere listas de questões progressivas com resoluções detalhadas e gabarito interativo.
                </p>
                <button 
                  onClick={() => setCurrentMenu('exercises')}
                  className="text-sm font-bold text-emerald-600 flex items-center gap-2 hover:text-emerald-800 transition-colors w-fit"
                >
                  Gerar Lista <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        )}

        {/* TELA DA AUTOAVALIAÇÃO */}
        {currentMenu === 'assessment' && (
          <div className="flex justify-center p-8 w-full animate-in fade-in duration-500">
            <div className="w-full max-w-5xl">
              <CompetenceAssessment onVoltar={() => setCurrentMenu('home')} /> 
            </div>
          </div>
        )}

        {/* TELA DE ESTRATÉGIAS PEDAGÓGICAS */}
        {currentMenu === 'strategies' && (
          <div className="flex justify-center p-8 w-full animate-in fade-in duration-500">
            <div className="w-full max-w-6xl">
              <EstrategiasPedagogicas /> 
            </div>
          </div>
        )}

        {/* TELA EM CONSTRUÇÃO (Apenas Exercícios agora) */}
        {currentMenu === 'exercises' && (
          <div className="flex flex-col items-center justify-center p-8 min-h-[50vh] animate-in fade-in duration-500">
            <ListChecks className="w-16 h-16 text-slate-600 mb-4 opacity-50" />
            <p className="text-slate-700 font-bold text-xl">Integração da tela de Exercícios em andamento...</p>
          </div>
        )}

      </main>
    </div>
  );
}