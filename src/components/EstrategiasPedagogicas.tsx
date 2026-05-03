import React, { useState } from 'react';
import { BookOpen, Sparkles, CheckSquare, Layers, Wrench, MonitorPlay, Users, Upload, FileText, Clock, Target, ClipboardList, Lightbulb, PlayCircle, Smartphone, Video, FileCheck, Loader2, Printer } from 'lucide-react';
import 'katex/dist/katex.min.css';

// IMPORTAÇÕES CORRIGIDAS
import { MenuTemas } from './MenuTemas';
import ResultDisplay from './ResultDisplay';
import { WorkflowMode } from '../types';

// --- INTERFACES DO PLANO DE AULA ---
export interface LessonStep {
  time: string;
  title: string;
  description: string;
  teacherRole: string;
  studentRole: string;
}

export interface SuggestedApp {
  name: string;
  description: string;
  link: string;
}

export interface YoutubeSuggestion {
  title: string;
  channel: string;
  description: string;
  link: string;
}

export interface LessonPlanResponse {
  rawText?: string;
  title?: string;
  theme?: string;
  duration?: string;
  bnccFocus?: string;
  learningObjectives?: string[];
  requiredMaterials?: string[];
  methodology?: string;
  steps?: LessonStep[];
  assessment?: string;
  adaptationTips?: string;
  suggestedApp?: SuggestedApp;
  youtubeVideo?: YoutubeSuggestion;
  references?: string[];
}

// --- OPÇÕES DO FORMULÁRIO ---
const TargetAudienceOptions = [
  "9º Ano (Ensino Fundamental)", "EJA", "Ensino Médio (1º Ano)", "Ensino Médio (2º Ano)", "Ensino Médio (3º Ano)",
  "Preparatório ENEM/Vestibular", "Física Básica (graduação)", "Física I (graduação)", 
  "Física II (graduação)", "Física III (graduação)", "Física IV (graduação)"
];

const ClassSizeOptions = [
  "0 a 10 alunos", "10 a 25 alunos", "25 a 40 alunos", "Mais de 40 alunos"
];

const ITResourcesOptions = [
  "Nenhum recurso digital", "Acesso à Internet Wi-Fi", "Computador do Professor",
  "Projetor / TV", "Celulares dos Alunos", "Laboratório de Informática",
  "Tablets Compartilhados", "Simuladores (PhET, etc)"
];

const LabAccessOptions = [
  "Sem acesso a laboratório", "Apenas bancada de demonstração",
  "Laboratório com poucos experimentos e ferramentas",
  "Laboratório de Física completo", "Espaço Maker / FabLab"
];

const EverydayMaterialsOptions = [
  "Nenhum material extra", "Papelaria básica (papel, tesoura, cola)",
  "Materiais recicláveis (PET, papelão)", "Itens de cozinha (copos, pratos, água, óleo, talheres)",
  "Ferramentas simples (régua, trena, cronômetro do celular)",
  "Instrumentos de laboratório (balança, termômetro, multímetro)",
  "Ferramentas Gerais (serra, martelo, chave de fenda, alicate)",
  "Bolas (gude, ping-pong, tênis, futebol)", "Elásticos e Molas"
];

const PlaceholderExamples = [
  "Ex: Quero usar água e gelo para estudar termodinâmica.",
  "Ex: Usar carrinhos de brinquedo para explicar velocidade média e aceleração.",
  "Ex: Analisar o movimento de um elevador para entender as Leis de Newton."
];

export default function EstrategiasPedagogicas() {
  const [step, setStep] = useState<'form' | 'loading' | 'result'>('form');

  // --- ESTADOS DO FORMULÁRIO ---
  const [audience, setAudience] = useState("");
  const [classSize, setClassSize] = useState(ClassSizeOptions[1]);
  
  const [category, setCategory] = useState("");
  const [topic, setTopic] = useState("");
  
  const [selectedIT, setSelectedIT] = useState<string[]>([]);
  const [labAccess, setLabAccess] = useState(LabAccessOptions[0]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [additionalNotes, setAdditionalNotes] = useState('');
  
  const [randomExample] = useState(() => {
    const randomIndex = Math.floor(Math.random() * PlaceholderExamples.length);
    return PlaceholderExamples[randomIndex];
  });
  
  const [lessonPlan, setLessonPlan] = useState<LessonPlanResponse | null>(null);

  // --- FUNÇÕES DE LÓGICA ---
  const toggleIT = (item: string) => {
    if (item === "Nenhum recurso digital") {
      setSelectedIT(selectedIT.includes(item) ? [] : [item]);
    } else {
      setSelectedIT(prev => {
        const listWithoutNone = prev.filter(i => i !== "Nenhum recurso digital");
        return listWithoutNone.includes(item) ? listWithoutNone.filter(i => i !== item) : [...listWithoutNone, item];
      });
    }
  };

  const toggleMaterial = (item: string) => {
    if (item === "Nenhum material extra") {
      setSelectedMaterials(selectedMaterials.includes(item) ? [] : [item]);
    } else {
      setSelectedMaterials(prev => {
        const listWithoutNone = prev.filter(i => i !== "Nenhum material extra");
        return listWithoutNone.includes(item) ? listWithoutNone.filter(i => i !== item) : [...listWithoutNone, item];
      });
    }
  };

  const handleTemaEscolhido = (nomeDoTema: string) => {
    const partes = nomeDoTema.split(" > ");
    setCategory(partes[0] || nomeDoTema);
    setTopic(partes[1] || nomeDoTema);
  };

  const handleGeneratePlan = async () => {
    if (!category || !topic) {
      alert("Por favor, selecione um Tema da Aula antes de gerar o plano.");
      return;
    }

    setStep('loading');
    
    const dadosParaOBackend = {
      tema: `${category}: ${topic}`,
      turma: `${audience} (${classSize})`,
      recursos: [
        ...selectedIT,
        labAccess,
        ...selectedMaterials,
        additionalNotes ? `Observações do Professor: ${additionalNotes}` : ""
      ].filter(Boolean)
    };

    try {
      // --- A MUDANÇA ESTÁ AQUI ---
      // Decide automaticamente qual backend usar
      const API_URL = "http://localhost:8000/gerar-plano"; // URL do backend Python (ajuste conforme necessário)

      console.log("Enviando requisição para:", API_URL); // Isso ajuda a debugar no console (F12)

      const resposta = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosParaOBackend)
      });
      // ----------------------------

      if (!resposta.ok) throw new Error("Erro na comunicação com o servidor Python");

      const dadosRetornados = await resposta.json();
      // ... (código anterior do fetch)
      console.log("DADOS DO PYTHON:", dadosRetornados);
      

      // --- NOVA VERIFICAÇÃO DE TEMA NÃO ENCONTRADO ---
      if (dadosRetornados.erro_tema_nao_encontrado) {
        alert("⚠️ " + dadosRetornados.erro_tema_nao_encontrado);
        setStep('form'); // Volta para a tela do formulário
        return; // Para a execução do código aqui
      }
      // ----------------------------------------------

      let planoFormatado;
      
      if (dadosRetornados.plano_gerado) {
        let textoLimpo = dadosRetornados.plano_gerado
          .replace(/```json/gi, '')
          .replace(/```/gi, '')
          .trim();
        
        textoLimpo = textoLimpo.replace(/\\./g, (match: string) => {
          if (match === '\\n' || match === '\\"') return match;
          if (match === '\\\\') return '\\\\';
          return '\\' + match;
        });

        planoFormatado = JSON.parse(textoLimpo);
        
        planoFormatado.suggestedApp = planoFormatado.suggestedApp || planoFormatado.aplicativoSugerido || planoFormatado.aplicativo || planoFormatado.suggested_app;
        planoFormatado.youtubeVideo = planoFormatado.youtubeVideo || planoFormatado.videoYoutube || planoFormatado.video || planoFormatado.youtube_video;

      } else {
        planoFormatado = dadosRetornados;
      }

      setLessonPlan(planoFormatado); 
      setStep('result');

    } catch (erro) {
      console.error("Falha ao conectar com a API:", erro);
      alert("⚠️ Aviso: Ocorreu um erro ao conectar com o servidor. O Python está rodando?");
      setStep('form');
    }
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden flex flex-col h-[85vh]">
      
      {/* --- HEADER FIXO --- */}
      <div className="bg-indigo-900 px-8 py-6 flex items-center justify-between shadow-md z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-800 rounded-xl border border-indigo-700">
            <BookOpen className="w-6 h-6 text-indigo-300" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Estratégias Pedagógicas</h2>
            <p className="text-indigo-300 text-sm font-medium">Configure a turma e gere seu plano de aula com IA</p>
          </div>
        </div>
        {(step === 'result' || step === 'loading') && (
          <button 
            onClick={() => setStep('form')}
            className="text-indigo-200 hover:text-white text-sm font-bold bg-indigo-800 px-4 py-2 rounded-lg transition-colors"
          >
            ← Voltar e Editar
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 relative">
        
        {step === 'form' && (
          <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in">
            <div className="grid md:grid-cols-2 gap-8">
              
              {/* --- COLUNA DA ESQUERDA --- */}
              <div className="space-y-6">
                
                {/* CAIXA 1: PÚBLICO ALVO */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                    <Users className="w-5 h-5 text-indigo-500" /> Público-Alvo e Tamanho
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Turma</label>
                      <select
                        value={audience} 
                        onChange={(e) => setAudience(e.target.value)}
                        required
                        className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      >
                        <option value="" disabled hidden>Selecione a turma...</option>
                        {TargetAudienceOptions.map((opcao) => (
                          <option key={opcao} value={opcao}>{opcao}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número de Alunos</label>
                      <select value={classSize} onChange={e => setClassSize(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-700 outline-none focus:border-indigo-500">
                        {ClassSizeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* CAIXA 2: TEMA DA AULA */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                    <Layers className="w-5 h-5 text-indigo-500" /> Tema da Aula
                  </h3>
                  <div className="w-full relative z-50">
                     <MenuTemas onSelectTheme={handleTemaEscolhido} />
                  </div>
                </div>

              </div>

              {/* --- COLUNA DA DIREITA --- */}
              <div className="space-y-6">
                
                {/* CAIXA 3: RECURSOS DE TI */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                    <MonitorPlay className="w-5 h-5 text-indigo-500" /> Recursos de TI
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2">
                    {ITResourcesOptions.map(opt => (
                      <label key={opt} className="flex items-start gap-2 cursor-pointer group">
                        <input type="checkbox" className="hidden" checked={selectedIT.includes(opt)} onChange={() => toggleIT(opt)} />
                        <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-colors ${selectedIT.includes(opt) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 group-hover:border-indigo-400'}`}>
                          {selectedIT.includes(opt) && <CheckSquare className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-sm text-slate-600 group-hover:text-slate-900 leading-tight">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* CAIXA 4: MATERIAIS */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                    <Wrench className="w-5 h-5 text-indigo-500" /> Materiais e Laboratório
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Acesso ao Laboratório</label>
                      <div className="grid grid-cols-1 gap-2">
                        {LabAccessOptions.map(opt => (
                          <label key={opt} className="flex items-start gap-2 cursor-pointer group">
                            <input type="radio" name="labAccess" className="hidden" checked={labAccess === opt} onChange={() => setLabAccess(opt)} />
                            <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${labAccess === opt ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 group-hover:border-indigo-400'}`}>
                              {labAccess === opt && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                            <span className="text-sm text-slate-600 group-hover:text-slate-900 leading-tight">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {["Laboratório com poucos experimentos e ferramentas", "Laboratório de Física completo", "Espaço Maker / FabLab"].includes(labAccess) && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Materiais Disponíveis</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
                          {EverydayMaterialsOptions.map(opt => (
                            <label key={opt} className="flex items-start gap-2 cursor-pointer group">
                              <input type="checkbox" className="hidden" checked={selectedMaterials.includes(opt)} onChange={() => toggleMaterial(opt)} />
                              <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-colors ${selectedMaterials.includes(opt) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 group-hover:border-indigo-400'}`}>
                                {selectedMaterials.includes(opt) && <CheckSquare className="w-3 h-3 text-white" />}
                              </div>
                              <span className="text-sm text-slate-600 group-hover:text-slate-900 leading-tight">{opt}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* --- BLOCO 3: ARQUIVOS E TEXTO --- */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm w-full">
              <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-6 pb-2 border-b border-slate-100 text-lg">
                <FileText className="w-6 h-6 text-indigo-500" /> Material de Apoio e Contexto
              </h3>
              
              <div className="flex flex-col gap-8">
                <div>
                  <label className="block text-sm font-bold text-slate-500 uppercase mb-3">
                    Arquivo Base ou Material de Referência <span className="text-slate-400 font-normal ml-1">(Opcional - Visual)</span>
                  </label>
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-indigo-400 transition-all group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                      <Upload className="w-10 h-10 text-slate-400 group-hover:text-indigo-500 mb-3 transition-colors" />
                      {selectedFile ? (
                        <p className="text-lg font-bold text-indigo-600 truncate w-full px-4">{selectedFile.name}</p>
                      ) : (
                        <>
                          <p className="text-base text-slate-600 mb-1">
                            <span className="font-bold text-indigo-600">Clique para enviar</span> ou arraste o arquivo até aqui
                          </p>
                          <p className="text-xs text-slate-400">Suporta: PDF, DOCX, TXT (Máx: 10MB)</p>
                        </>
                      )}
                    </div>
                    <input type="file" className="hidden" onChange={(e) => { if (e.target.files && e.target.files.length > 0) setSelectedFile(e.target.files[0]); }} />
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-500 uppercase mb-3">
                    Observações Complementares <span className="text-slate-400 font-normal ml-1">(Opcional)</span>
                  </label>
                  <textarea 
                    value={additionalNotes}
                    onChange={e => setAdditionalNotes(e.target.value)}
                    placeholder={`Escreva aqui detalhes sobre a turma...\n\n${randomExample}`}
                    className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none shadow-inner text-base"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* --- BOTÃO DE GERAR --- */}
            <div className="flex justify-end pt-4 pb-12">
              <button 
                onClick={handleGeneratePlan}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-black text-lg shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
              >
                <Sparkles className="w-6 h-6" /> Gerar Plano de Aula Definitivo
              </button>
            </div>
            
          </div>
        )}

        {step === 'loading' && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mb-6" />
            <h3 className="text-2xl font-black text-slate-800 mb-2">Analisando Arquivos e Parâmetros...</h3>
            <p className="text-slate-500 text-lg max-w-md">A IA  está elaborando uma Estratégia Pedagógica inspirada no seu contexto e baseada no nosso banco de dados.</p>
          </div>
        )}

        {/* TELA DE RESULTADOS USANDO O COMPONENTE PODEROSO */}
        {step === 'result' && lessonPlan && (
          <div className="w-full animate-in slide-in-from-bottom-4 duration-500 pb-20">
            <ResultDisplay 
              mode={WorkflowMode.STRATEGY} 
              lessonPlan={lessonPlan}
              exerciseList={null}
              generatedImageUrl={null}
              generatedAnimationSvg={null}
              onReset={() => setStep('form')}
              onGenerateImage={async () => {}}
              onGenerateAnimation={async () => {}}
              exerciseImages={{}}
              isGeneratingImage={false}
              isGeneratingAnimation={false}
            />
          </div>
        )}

      </div>
    </div>
  );
}