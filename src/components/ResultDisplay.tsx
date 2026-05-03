import React, { useState } from 'react';
import { LessonPlanResponse, ExerciseListResponse, WorkflowMode, Difficulty } from '../types';
import { Clock, Target, Box, CheckCircle, ArrowLeft, Download, Smartphone, Youtube, Star, Image as ImageIcon, ExternalLink, Eye, EyeOff, Book, Library, AlertCircle, Code, Copy, Check, PlayCircle, Video } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface ResultDisplayProps {
  mode: WorkflowMode;
  lessonPlan: LessonPlanResponse | null;
  exerciseList: ExerciseListResponse | null;
  generatedImageUrl: string | null;
  generatedAnimationSvg: string | null;
  onReset: () => void;
  onGenerateImage: (prompt: string, exerciseId?: string) => Promise<void>;
  onGenerateAnimation: (prompt: string) => Promise<void>;
  exerciseImages: Record<string, string>;
  isGeneratingImage: boolean;
  isGeneratingAnimation: boolean;
}

const CodeBlock: React.FC<{ code: string; label?: string }> = ({ code, label }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!code) return null;

  return (
    <div className="my-6 rounded-xl overflow-hidden border border-slate-700 shadow-2xl bg-[#1e1e1e]">
      <div className="bg-[#2d2d2d] px-4 py-2 flex justify-between items-center border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-black text-slate-300 uppercase tracking-widest">{label || 'Java Simulation Code'}</span>
        </div>
        <button onClick={handleCopy} className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-xs font-bold">
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
      <pre className="p-6 overflow-x-auto font-mono text-sm leading-relaxed text-slate-300">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const LatexText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$.*?\$)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          let content = part.slice(2, -2);
          
          if ((content.includes('\\\\') || content.includes('\\newline')) && !content.includes('\\begin{')) {
            content = `\\begin{aligned}\n${content}\n\\end{aligned}`;
          }

          try {
            return (
              <div 
                key={i} 
                className="my-4 overflow-x-auto" 
                dangerouslySetInnerHTML={{ 
                  __html: katex.renderToString(content, { 
                    displayMode: true, 
                    throwOnError: false, 
                    strict: () => "ignore", 
                    trust: true 
                  }) 
                }} 
              />
            );
          } catch (e) { return <span key={i}>{part}</span>; }
        } else if (part.startsWith('$') && part.endsWith('$')) {
          const content = part.slice(1, -1);
          try {
            return (
              <span 
                key={i} 
                dangerouslySetInnerHTML={{ 
                  __html: katex.renderToString(content, { 
                    displayMode: false, 
                    throwOnError: false, 
                    strict: () => "ignore", 
                    trust: true 
                  }) 
                }} 
              />
            );
          } catch (e) { return <span key={i}>{part}</span>; }
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
  mode, 
  lessonPlan, 
  exerciseList, 
  generatedImageUrl, 
  generatedAnimationSvg,
  onReset,
  onGenerateImage,
  onGenerateAnimation,
  exerciseImages,
  isGeneratingImage,
  isGeneratingAnimation
}) => {
  console.log("=== MODO ATUAL ===", mode);
  console.log("=== DADOS DO PLANO (CRU) ===", JSON.stringify(lessonPlan, null, 2));
  console.log("=== DADOS DOS EXERCÍCIOS (CRU) ===", JSON.stringify(exerciseList, null, 2));
  
  const [visibleSolutions, setVisibleSolutions] = useState<Record<string, boolean>>({});
  const toggleSolution = (id: string) => setVisibleSolutions(prev => ({ ...prev, [id]: !prev[id] }));

  const errorMsg = lessonPlan?.errorMsg || exerciseList?.errorMsg || "";
  const hasError = errorMsg.toLowerCase().includes("desculpe");

  // Garantindo compatibilidade de nomes com traduções possíveis do Gemini
  const safeApp = lessonPlan?.suggestedApp || (lessonPlan as any)?.aplicativoSugerido || (lessonPlan as any)?.aplicativo;
  const safeVideo = lessonPlan?.youtubeVideo || (lessonPlan as any)?.videoYoutube || (lessonPlan as any)?.video;

  if (hasError) {
    return (
      <div className="max-w-2xl mx-auto mt-20 animate-in fade-in zoom-in duration-500">
        <div className="bg-white p-12 rounded-3xl shadow-2xl border border-amber-100 text-center">
          <div className="bg-amber-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <AlertCircle className="w-12 h-12 text-amber-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-6">Restrição de Base de Dados</h2>
          <p className="text-slate-600 text-xl leading-relaxed mb-10 font-medium italic">
            "{errorMsg}"
          </p>
          <div className="bg-slate-50 p-6 rounded-2xl mb-8 text-left border border-slate-100">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Library className="w-4 h-4" /> Diretriz de Segurança
            </h4>
            <p className="text-slate-500 text-sm leading-relaxed">Este agente está configurado para acessar exclusivamente a pasta <strong>Agente de IA (Cérebro)</strong>. O tópico ou lógica Java solicitada não foi encontrado nos documentos curados.</p>
          </div>
          <button onClick={onReset} className="px-10 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center mx-auto gap-3 active:scale-95">
            <ArrowLeft className="w-5 h-5" /> Revisar Solicitação
          </button>
        </div>
      </div>
    );
  }

  const renderLessonPlan = (plan: LessonPlanResponse) => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl shadow-xl border-l-8 border-indigo-600 overflow-hidden">
        <div className="p-10">
          <div className="flex flex-col md:flex-row justify-between items-start mb-6">
            <div>
               <h1 className="text-4xl font-black text-slate-900 tracking-tight">{plan.title}</h1>
               <div className="flex gap-2 mt-3">
                 <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-black uppercase">{plan.methodology}</span>
                 <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-black uppercase tracking-wider">Fisica Computacional Java</span>
               </div>
            </div>
            <div className="flex items-center text-slate-500 mt-4 md:mt-0 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
              <Clock className="w-5 h-5 mr-3 text-indigo-500" /> <span className="font-bold text-lg">{plan.duration}</span>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mt-10">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <h3 className="flex items-center text-sm font-black text-slate-400 mb-4 uppercase tracking-widest">
                <Target className="w-5 h-5 mr-2 text-indigo-500" /> Objetivos de Aprendizado
              </h3>
              <ul className="space-y-3">
                {(plan.learningObjectives || []).map((obj, idx) => (
                  <li key={idx} className="whitespace-pre-wrap text-slate-700 flex gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-2 flex-shrink-0" />
                    <LatexText text={obj} />
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <h3 className="flex items-center text-sm font-black text-slate-400 mb-4 uppercase tracking-widest">
                <Box className="w-5 h-5 mr-2 text-indigo-500" /> Materiais & Simulação
              </h3>
              <ul className="space-y-3">
                {(plan.requiredMaterials || []).map((mat, idx) => (
                  <li key={idx} className="whitespace-pre-wrap text-slate-700 flex gap-2">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0" />
                    <LatexText text={mat} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {plan.javaFullCode && (
        <div className="animate-in slide-in-from-bottom-6">
           <CodeBlock code={plan.javaFullCode} label="Projeto Java Completo (Simulação Física)" />
        </div>
      )}

      {(generatedImageUrl || generatedAnimationSvg) && (
        <div className="bg-white rounded-2xl shadow-xl p-10 border border-slate-200">
          <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
            <ImageIcon className="w-8 h-8 text-indigo-600" /> Recurso Visual do Cérebro
          </h2>
          <div className="flex flex-col items-center justify-center">
            {generatedImageUrl && <img src={generatedImageUrl} alt="Visual da Aula" className="rounded-xl shadow-md max-w-full h-auto" />}
            {generatedAnimationSvg && <div dangerouslySetInnerHTML={{ __html: generatedAnimationSvg }} className="w-full mt-4 flex justify-center" />}
          </div>
        </div>
      )}

      {/* ROTEIRO DA AULA */}
      <div className="bg-white rounded-2xl shadow-xl p-10 border border-slate-200">
        <h2 className="text-2xl font-black text-slate-900 mb-10 border-b pb-6 flex items-center gap-3">
          <Book className="w-8 h-8 text-indigo-600" /> Roteiro de Aula Detalhado
        </h2>
        <div className="space-y-12">
          {(plan.steps || []).map((step, index) => (
            <div key={index} className="flex gap-10 group print:break-inside-avoid">
                <div className="w-24 flex-shrink-0 flex flex-col items-center">
                  <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg group-hover:scale-110 transition-transform">{step.time}</div>
                  <div className="w-1 h-full bg-slate-100 mt-4 rounded-full" />
                </div>
                <div className="flex-grow bg-slate-50 rounded-[2rem] p-8 border border-slate-100 group-hover:border-indigo-200 transition-colors">
                  <h3 className="text-2xl font-black text-slate-800 mb-4">{step.title}</h3>
                  <div className="whitespace-pre-wrap text-slate-600 text-lg mb-6 leading-relaxed">
                    <LatexText text={step.description} />
                  </div>
                  
                  {step.javaSnippet && (
                    <CodeBlock code={step.javaSnippet} label={`Fragmento Java: ${step.title}`} />
                  )}

                  <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <span className="block text-xs font-black text-indigo-500 mb-2 uppercase">Ação do Docente</span>
                      <p className="text-slate-700 text-sm font-medium">{step.teacherRole}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <span className="block text-xs font-black text-emerald-500 mb-2 uppercase">Ação do Estudante</span>
                      <p className="text-slate-700 text-sm font-medium">{step.studentRole}</p>
                    </div>
                  </div>
                </div>
            </div>
          ))}
        </div>
      </div>
{/* CARDS DE RECURSOS EXTERNOS */}
      {(safeApp || safeVideo) && (
        <div className="grid md:grid-cols-2 gap-6 mt-8 print:hidden">
          
          {/* CARD DO SIMULADOR - LINK DIRETO TRATADO */}
          {safeApp && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
              <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-4 text-lg border-b border-slate-100 pb-2">
                <Smartphone className="w-6 h-6 text-indigo-500" /> Simulador Educacional
              </h4>
              <div className="flex-1">
                <p className="font-bold text-indigo-600 text-lg mb-2">{safeApp.name || safeApp.nome}</p>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed">{safeApp.description || safeApp.descricao}</p>
              </div>
              
              {/* LINK DIRETO: Removemos espaços vazios para o navegador não jogar no Google */}
              {safeApp.link && safeApp.link !== "#" && (
                <a 
                  href={safeApp.link.replace(/\s+/g, '').startsWith('http') ? safeApp.link.replace(/\s+/g, '') : `https://${safeApp.link.replace(/\s+/g, '')}`}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="mt-auto text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-5 h-5" /> Abrir Simulação
                </a>
              )}
            </div>
          )}

          {/* CARD DO YOUTUBE - BUSCA AUTOMÁTICA */}
          {safeVideo && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
              <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-4 text-lg border-b border-slate-100 pb-2">
                <Video className="w-6 h-6 text-red-500" /> Vídeo Complementar
              </h4>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-lg mb-1">{safeVideo.title || safeVideo.titulo}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{safeVideo.channel || safeVideo.canal}</p>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed">{safeVideo.description || safeVideo.descricao}</p>
              </div>
              
              {/* LÓGICA DE BUSCA NO YOUTUBE */}
              <a 
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${safeVideo.title || safeVideo.titulo} ${safeVideo.channel || safeVideo.canal}`)}`} 
                target="_blank" 
                rel="noreferrer" 
                className="mt-auto text-center bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Youtube className="w-5 h-5" /> Buscar no YouTube
              </a>
            </div>
          )}

        </div>
      )}    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 print:pb-0">
      {mode === WorkflowMode.STRATEGY && lessonPlan && renderLessonPlan(lessonPlan)}
      {mode === WorkflowMode.EXERCISES && exerciseList && (
         <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white rounded-2xl shadow-xl p-10 border-l-8 border-emerald-600">
              <h1 className="text-4xl font-black text-slate-900">{exerciseList.title}</h1>
              <p className="text-slate-500 mt-3 font-bold flex items-center gap-2">
                <Library className="w-4 h-4 text-emerald-500" /> Fonte Exclusiva: Pasta Cérebro
              </p>
            </div>
            <div className="space-y-6">
              {(exerciseList.exercises || []).map((ex, idx) => (
                <div key={ex.id} className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
                  <div className="flex justify-between items-center mb-6">
                    <span className="bg-slate-100 text-slate-500 px-4 py-1.5 rounded-xl text-xs font-black uppercase">Questão {idx + 1}</span>
                    <span className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase ${ex.difficulty === Difficulty.EASY ? 'bg-emerald-100 text-emerald-700' : ex.difficulty === Difficulty.MEDIUM ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                      {ex.difficulty}
                    </span>
                  </div>
                  
                  <div className="whitespace-pre-wrap text-xl text-slate-800 mb-6 leading-relaxed font-medium">
                    <LatexText text={ex.question} />
                  </div>
                  
                  {ex.javaTemplate && (
                    <CodeBlock code={ex.javaTemplate} label="Template Java para Completar" />
                  )}

                  {exerciseImages[ex.id] && (
                    <div className="my-6">
                      <img src={exerciseImages[ex.id]} alt={`Visual Questão ${idx+1}`} className="rounded-xl shadow-md max-w-full h-auto mx-auto" />
                    </div>
                  )}

                  <div className="flex gap-4 items-center print:hidden">
                    <button onClick={() => toggleSolution(ex.id)} className="flex items-center gap-2 text-sm font-black text-emerald-600 hover:text-emerald-700 transition-all uppercase tracking-widest mt-4">
                      {visibleSolutions[ex.id] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      {visibleSolutions[ex.id] ? 'Ocultar Resposta' : 'Ver Gabarito do Cérebro'}
                    </button>
                    {ex.visualDescription && !exerciseImages[ex.id] && (
                      <button 
                        onClick={() => onGenerateImage(ex.visualDescription!, ex.id)} 
                        disabled={isGeneratingImage}
                        className="flex items-center gap-2 text-sm font-black text-indigo-600 hover:text-indigo-700 transition-all uppercase tracking-widest mt-4 disabled:opacity-50"
                      >
                        <ImageIcon className="w-5 h-5" /> 
                        {isGeneratingImage ? 'Gerando...' : 'Gerar Visual'}
                      </button>
                    )}
                  </div>

                  {visibleSolutions[ex.id] && (
                    <div className="bg-emerald-50 rounded-[1.5rem] p-8 border border-emerald-100 mt-6 animate-in slide-in-from-top-4">
                      <div className="mb-6">
                        <span className="block text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-2">Resposta Esperada</span>
                        <p className="text-3xl font-black text-emerald-900">{ex.correctAnswer}</p>
                      </div>
                      <div>
                        <span className="block text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-2">Resolução Pedagógica</span>
                        <div className="whitespace-pre-wrap text-emerald-800 text-lg leading-relaxed">
                          <LatexText text={ex.solution} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
         </div>
      )}
      <div className="flex justify-between pt-10 print:hidden">
        <button onClick={onReset} className="flex items-center px-8 py-4 bg-white border border-slate-300 rounded-2xl text-slate-700 font-black uppercase tracking-widest text-sm hover:bg-slate-50 transition-all active:scale-95"><ArrowLeft className="w-5 h-5 mr-3" /> Reiniciar Fluxo</button>
        <button onClick={() => window.print()} className={`flex items-center px-10 py-4 rounded-2xl shadow-xl text-white font-black uppercase tracking-widest text-sm transition-all active:scale-95 ${mode === WorkflowMode.EXERCISES ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}><Download className="w-5 h-5 mr-3" /> Imprimir / Exportar PDF</button>
      </div>
    </div>
  );
};

export default ResultDisplay;