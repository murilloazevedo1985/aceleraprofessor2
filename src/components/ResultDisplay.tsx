import React, { useState } from 'react';
import { LessonPlanResponse, ExerciseListResponse, WorkflowMode, Difficulty } from '../types';
import { Clock, Target, Box, CheckCircle, ArrowLeft, Download, Smartphone, Youtube, Star, Image as ImageIcon, ExternalLink, Eye, EyeOff, Book, Library, AlertCircle, Code, Copy, Check, PlayCircle, Video, Search, Sparkles, Info } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { LessonStep } from './EstrategiasPedagogicas';

// --- COMPONENTES AUXILIARES ---
// 1. Defina as regras APENAS para o cartãozinho
interface MediaCardProps {
  tipo: "simulacao" | "youtube";
  titulo: string;
}

interface AtividadeIA {
  titulo: string;
  descricao: string;
}

// 2. Aplique a regra na função do cartão
const MediaCard = ({ tipo, titulo, url }: MediaCardProps & { url?: string }) => {
  const isSimulacao = tipo === 'simulacao';

  // Segurança: se a IA não gerou título, o card não aparece
  if (!titulo || titulo.trim() === '') return null;

  // Lógica de Busca Dinâmica
  const termoDeBusca = encodeURIComponent(titulo);
  let rotulo: string;
  let icone: React.ReactNode;
  let corFundo: string;
  let corTexto: string;
  let corBotao: string;
  let urlFinal: string;

  if (isSimulacao) {
    rotulo = 'Laboratório Virtual';
    icone = <Smartphone className="w-5 h-5" />;
    corFundo = 'bg-indigo-50 border-indigo-200';
    corTexto = 'text-indigo-800';
    corBotao = 'bg-indigo-600 hover:bg-indigo-700';
    urlFinal = url?.trim() || '';
  } else {
    rotulo = 'Vídeo Sugerido';
    icone = <Youtube className="w-5 h-5" />;
    corFundo = 'bg-red-50 border-red-200';
    corTexto = 'text-red-800';
    corBotao = 'bg-red-600 hover:bg-red-700';
    // Para vídeos, sempre buscamos no YouTube com o título.
    urlFinal = `https://www.youtube.com/results?search_query=${termoDeBusca}`;
  }

  return (
    <div className={`flex flex-col p-6 rounded-2xl border-2 ${corFundo} shadow-sm transition-transform hover:-translate-y-1`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${corTexto} ${isSimulacao ? 'bg-indigo-100' : 'bg-red-100'}`}>{icone}</div>
        <h4 className={`font-black text-lg ${corTexto}`}>{rotulo}</h4>
      </div>
      
      <p className="text-slate-700 font-medium mb-6 flex-grow leading-relaxed">
        {titulo}
      </p>
      
      {isSimulacao && !urlFinal ? (
        <p role="status" className="mt-auto rounded-xl border border-indigo-200 bg-white/70 px-4 py-3 text-center text-sm font-medium text-indigo-800">
          Link direto da simulação indisponível para este tema.
        </p>
      ) : (
        <a
          href={urlFinal}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-auto text-center ${corBotao} text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md`}
        >
          {isSimulacao ? <ExternalLink className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          {isSimulacao ? 'Abrir simulação direta' : 'Buscar Vídeo'}
        </a>
      )}
    </div>
  );
};

export interface ResultDisplayProps {
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
  onRatingSaved?: () => void;
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
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$.*?\$|\\\(.*?\\\))/g);
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
        else if (part.startsWith('\\(') && part.endsWith('\\)')) {
          const content = part.slice(2, -2);
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

// --- COMPONENTE PRINCIPAL ---

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
  isGeneratingAnimation,
  onRatingSaved,
}) => {
  console.log("=== MODO ATUAL ===", mode);
  const [rating, setRating] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [ratingPersisted, setRatingPersisted] = useState(true);
  const [ratingError, setRatingError] = useState('');
  console.log("=== DADOS DO PLANO (CRU) ===", JSON.stringify(lessonPlan, null, 2));
  console.log("=== DADOS DOS EXERCÍCIOS (CRU) ===", JSON.stringify(exerciseList, null, 2));
  
  const [visibleSolutions, setVisibleSolutions] = useState<Record<string, boolean>>({});
  const toggleSolution = (id: string) => setVisibleSolutions(prev => ({ ...prev, [id]: !prev[id] }));

  const errorMsg = lessonPlan?.errorMsg || exerciseList?.errorMsg || "";
  const hasError = errorMsg.toLowerCase().includes("desculpe");

  // Garantindo compatibilidade de nomes com traduções possíveis do Gemini
  const safeApp = lessonPlan?.suggestedApp || (lessonPlan as any)?.aplicativoSugerido || (lessonPlan as any)?.aplicativo;
  const safeVideo = lessonPlan?.youtubeVideo || (lessonPlan as any)?.videoYoutube || (lessonPlan as any)?.video;
  // ✅ CORREÇÃO: Adicionando a mesma lógica para encontrar as atividades de IA
  const safeAtividadesIA = lessonPlan?.atividadesIA || (lessonPlan as any)?.atividades_ia || [];

  const handleRating = async (rate: number) => {
    if (ratingSubmitted || isSubmittingRating) return;

    setRating(rate);
    setIsSubmittingRating(true);
    setRatingError('');

    try {
      const BASE_URL = import.meta.env.VITE_API_URL;
      const API_URL = `${BASE_URL}/avaliar-estrategia`;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plano: lessonPlan,
          nota: rate,
          tema: lessonPlan?.title || 'Estratégia sem título'
        }),
      });

      const result = await response.json();
      if (!response.ok || result.status !== 'sucesso') {
        throw new Error(result.detail || result.mensagem || 'Falha ao salvar avaliação.');
      }
      setRatingSubmitted(true);
      setRatingPersisted(result.persistida !== false);
      if (result.persistida !== false) onRatingSaved?.();
    } catch (error) {
      console.error("Erro ao avaliar:", error);
      setRating(0);
      setRatingError(error instanceof Error ? error.message : 'Não foi possível salvar sua avaliação.');
    } finally {
      setIsSubmittingRating(false);
    }
  };
  
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
                 <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-black uppercase tracking-wider">Fisica Computacional Java</span>
               </div>
            </div>
          </div>

          <section className="mt-6 rounded-xl border-l-8 border-indigo-600 bg-indigo-50 p-6">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-700">Estratégia pedagógica central</span>
            <h2 className="mt-2 text-2xl font-black text-slate-900">{plan.methodology}</h2>
            {plan.methodologyDetails && (
              <div className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-slate-700">
                <LatexText text={plan.methodologyDetails} />
              </div>
            )}
          </section>
          
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
                <Box className="w-5 h-5 mr-2 text-indigo-500" /> Materiais
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
            {/* NOVO CARD - COMPETÊNCIAS BNCC */}
            {Array.isArray(plan.competenciasBnccAplicadas) && plan.competenciasBnccAplicadas.length > 0 && (
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 md:col-span-2">
                <h3 className="flex items-center text-sm font-black text-slate-400 mb-4 uppercase tracking-widest">
                  <CheckCircle className="w-5 h-5 mr-2 text-indigo-500" /> Competências BNCC Aplicadas
                </h3>
                <ul className="space-y-3">
                  {plan.competenciasBnccAplicadas.map((comp: string, idx: number) => (
                    <li key={idx} className="whitespace-pre-wrap text-slate-700 flex gap-3 items-start">
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-2 flex-shrink-0" />
                      <LatexText text={comp} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
        <div className="flex items-center gap-3 border-b pb-6 mb-10">
          <Book className="w-8 h-8 text-indigo-600" />
          <h2 className="text-2xl font-black text-slate-900">
            Roteiro de Aula Detalhado
          </h2>
          <div className="relative group">
            <Info className="w-5 h-5 text-slate-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 hidden group-hover:block bg-slate-800 text-white text-xs rounded-lg py-2 px-3 shadow-lg z-10">
              Este conteúdo foi gerado com IA a partir de um banco de dados.
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
            </div>
          </div>
        </div>

        <div className="space-y-12">
          {(plan.steps || []).map((step, index) => (
            <div key={index} className="space-y-4 print:break-inside-avoid">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 group-hover:border-indigo-200 transition-colors">
                <div className="mb-4 border-l-4 border-indigo-500 pl-4">
                  <span className="block text-xs font-black uppercase text-indigo-700">Abordagem desta etapa</span>
                  <p className="mt-1 text-lg font-bold text-slate-900">{step.approach}</p>
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-1">{step.title}</h3>
                <p className="mb-3 text-sm font-semibold text-slate-500">{step.time}</p>
                <div className="whitespace-pre-wrap text-slate-600 text-base mb-4 leading-relaxed">
                  <LatexText text={step.description} />
                </div>
                <div className="grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-2">
                  <div>
                    <span className="block text-xs font-black uppercase text-slate-500">Ação do professor</span>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700"><LatexText text={step.teacherRole} /></p>
                  </div>
                  <div>
                    <span className="block text-xs font-black uppercase text-slate-500">Ação dos alunos</span>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700"><LatexText text={step.studentRole} /></p>
                  </div>
                </div>
                {step.javaSnippet && (
                  <CodeBlock code={step.javaSnippet} label={`Fragmento Java: ${step.title}`} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SESSÃO DE RECURSOS MULTIMÍDIA NOVA (PhET e YouTube) */}
      {(plan.simulacaoSugerida?.titulo || safeVideo?.titulo) && (
        <div className="mt-16 pt-10 border-t-2 border-slate-100">
          <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-2">
            🚀 Recursos Multimídia Recomendados
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {plan.simulacaoSugerida?.titulo && (
              <MediaCard 
                tipo="simulacao" 
                titulo={plan.simulacaoSugerida.titulo} 
                url={plan.simulacaoSugerida.url} 
              />
            )}
            {safeVideo?.titulo && (
              <MediaCard 
                tipo="youtube" 
                titulo={safeVideo.titulo} 
              />
            )}
          </div>
        </div>
      )}

      {/* NOVA SEÇÃO: SUGESTÕES DE ATIVIDADES COM IA */}
      {Array.isArray(safeAtividadesIA) && safeAtividadesIA.length > 0 && (
        <div className="mt-12 pt-10 border-t-2 border-slate-100 animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="w-7 h-7 text-violet-500" />
            <h3 className="text-2xl font-black text-slate-800">
              Atividades com Inteligência Artificial
            </h3>
            <div className="relative group">
              <Info className="w-5 h-5 text-slate-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 hidden group-hover:block bg-slate-800 text-white text-xs rounded-lg py-2 px-3 shadow-lg z-10">
                Esta ideia não passou por banco de dados, sendo gerada puramente por IA.
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            {safeAtividadesIA.map((atividad:AtividadeIA, index: number) => (
              <div key={index} className="bg-white border-2 border-violet-200 p-8 rounded-2xl shadow-lg transition-all hover:shadow-violet-300/50 hover:border-violet-400 group">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-violet-100 rounded-xl border border-violet-200 group-hover:bg-violet-200 transition-colors">
                     <Sparkles className="w-6 h-6 text-violet-600 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-800 mb-2 group-hover:text-violet-800 transition-colors">{atividad.titulo}</h4>
                    <p className="text-slate-600 leading-relaxed text-base">{atividad.descricao}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NOVA SEÇÃO: AVALIAÇÃO DA ESTRATÉGIA */}
      <div className="mt-16 pt-10 border-t-2 border-slate-100">
        <div className="text-center">
          <h3 className="text-2xl font-black text-slate-800 mb-4">
            {ratingSubmitted
              ? ratingPersisted ? "✅ Obrigado por contribuir!" : "✅ Avaliação registrada para teste"
              : "O que achou desta estratégia?"}
          </h3>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            {ratingSubmitted
              ? ratingPersisted
                ? "Sua avaliação ajuda a comunidade de professores a encontrar as melhores práticas."
                : "No modo local, a avaliação não foi salva no Google Drive nem compartilhada."
              : "Sua opinião é fundamental para aprimorar nosso motor de IA e destacar as melhores ideias para outros professores."}
          </p>
          {!ratingSubmitted && (
            <div className="flex justify-center items-center gap-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  disabled={isSubmittingRating || ratingSubmitted}
                  className="disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <Star
                    className={`w-12 h-12 transition-all duration-200 ease-in-out transform 
                      ${rating >= star 
                        ? 'text-amber-400 fill-amber-400' 
                        : 'text-slate-300 group-hover:text-amber-300'}
                      ${isSubmittingRating && rating === star ? 'animate-ping' : 'group-hover:scale-110'}`}
                  />
                </button>
              ))}
            </div>
          )}
          {ratingError && <p role="alert" className="mt-4 text-sm font-semibold text-rose-700">{ratingError}</p>}
        </div>
      </div>
    </div>
  );

return (
    /* ✅ OPÇÃO 1 ATIVADA: Força o container a liberar a altura e o overflow na impressão */
    <div className="max-w-5xl mx-auto space-y-10 pb-20 print:pb-0 print:h-auto print:overflow-visible">
      {mode === WorkflowMode.STRATEGY && lessonPlan && renderLessonPlan(lessonPlan)}
      {mode === WorkflowMode.EXERCISES && exerciseList && (
         <div className="space-y-8 animate-in fade-in duration-500 print:h-auto print:overflow-visible">
            {/* Cabeçalho da Lista */}
            <div className="bg-white rounded-2xl shadow-xl p-10 border-l-8 border-emerald-600 print:break-inside-avoid">
              <h1 className="text-4xl font-black text-slate-900">{exerciseList.title}</h1>
              <p className="text-slate-500 mt-3 font-bold flex items-center gap-2">
                <Library className="w-4 h-4 text-emerald-500" /> Fonte Exclusiva: Pasta Cérebro
              </p>
            </div>
            
            {/* Bloco de Questões */}
            <div className="space-y-6 print:h-auto print:overflow-visible">
              {(exerciseList.exercises || []).map((ex, idx) => (
                /* ✅ UPGRADE DE IMPRESSÃO: print:break-inside-avoid impede que a folha A4 corte o meio do cartão */
                <div key={ex.id} className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200 print:break-inside-avoid">
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
      
      {/* Botões do Fluxo */}
      <div className="flex justify-between pt-10 print:hidden">
        <button onClick={onReset} className="flex items-center px-8 py-4 bg-white border border-slate-300 rounded-2xl text-slate-700 font-black uppercase tracking-widest text-sm hover:bg-slate-50 transition-all active:scale-95"><ArrowLeft className="w-5 h-5 mr-3" /> Reiniciar Fluxo</button>
        <button onClick={() => window.print()} className={`flex items-center px-10 py-4 rounded-2xl shadow-xl text-white font-black uppercase tracking-widest text-sm transition-all active:scale-95 ${mode === WorkflowMode.EXERCISES ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}><Download className="w-5 h-5 mr-3" /> Imprimir / Exportar PDF</button>
      </div>
    </div>
  );
};

export default ResultDisplay;