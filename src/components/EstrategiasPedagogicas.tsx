import React, { useState } from 'react';
import { BookOpen, Sparkles, CheckSquare, Layers, Wrench, MonitorPlay, Users, FileText, Loader2, Upload } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { MenuTemas } from './MenuTemas';
import ResultDisplay from './ResultDisplay';
import { WorkflowMode, LessonPlanResponse, PhysicsCategories } from '../types';

export interface LessonStep {
  time: string;
  title: string;
  description: string;
  teacherRole: string;
  studentRole: string;
}

export interface simulacaoSugerida {
  titulo: string;
  termoBusca: string;
  url: string;
}

export interface AtividadeIA {
  titulo: string;
  descricao: string;
}

export interface videoYoutube {
  title: string;
  channel: string;
  description: string;
  link: string;
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

// --- MAPEAMENTO TEMA > FENÔMENO ---
const phenomenonOptions: Record<string, Record<string, string[]>> = {
  // Mecânica
  'Mecânica': {
    'Cinemática': ['Movimento Retilíneo Uniforme (MRU)', 'Movimento Retilíneo Uniformemente Variado (MRUV)', 'Queda Livre e Lançamento Vertical', 'Lançamento Oblíquo', 'Movimento Circular Uniforme (MCU)'],
    'Dinâmica (Leis de Newton)': ['1ª, 2ª e 3ª Leis de Newton', 'Força de Atrito (Estático e Cinético)', 'Planos Inclinados', 'Forças em Sistemas de Blocos', 'Força Centrípeta'],
    'Trabalho, Energia e Potência': ['Trabalho de uma Força', 'Energia Cinética e Teorema da Energia Cinética', 'Energia Potencial (Gravitacional e Elástica)', 'Sistemas Conservativos e Dissipativos', 'Potência e Rendimento'],
    'Impulso, Quantidade de Movimento e Colisões': ['Impulso e Variação da Quantidade de Movimento', 'Conservação da Quantidade de Movimento', 'Colisões (Elásticas e Inelásticas)', 'Centro de Massa'],
    'Estática e Equilíbrio': ['Equilíbrio de Ponto Material', 'Equilíbrio de Corpo Extenso', 'Momento de uma Força (Torque)', 'Centro de Massa e Gravidade', 'Alavancas e Roldanas'],
    'Hidrostática': ['Pressão e Densidade', 'Teorema de Stevin', 'Princípio de Pascal', 'Princípio de Arquimedes (Empuxo)'],
    'Gravitação Universal': ['Leis de Kepler', 'Lei da Gravitação Universal de Newton', 'Campo Gravitacional', 'Movimento de Satélites, calendário e órbitas, astronomia'],
  },
  
  // Termologia
  'Termologia': {
    'Termometria': ['Escalas Termométricas (Celsius, Fahrenheit, Kelvin)', 'Equilíbrio Térmico', 'O Termômetro e seu Funcionamento'],
    'Calorimetria': ['Calor Sensível e Calor Latente', 'Trocas de Calor e Calorímetro', 'Diagramas de Fase', 'Propagação de Calor (Condução, Convecção, Irradiação)'],
    'Gases Ideais': ['Equação de Clapeyron (PV=nRT)', 'Transformações Gasosas (Isotérmica, Isobárica, Isocórica)', 'Mistura de Gases'],
    'Termodinâmica': ['1ª Lei da Termodinâmica (Trabalho e Energia Interna)', '2ª Lei da Termodinâmica (Máquinas Térmicas e Entropia)', 'Ciclo de Carnot'],
  },
  
  // Óptica e Ondulatória
  'Óptica e Ondulatória': {
    'Óptica Geométrica': ['Princípios da Óptica Geométrica', 'Reflexão da Luz e Espelhos Planos', 'Espelhos Esféricos (Formação de Imagens)', 'Refração da Luz e Lei de Snell-Descartes', 'Lentes Esféricas Delgadas (Formação de Imagens)'],
    'Fenômenos Ondulatórios': ['Reflexão e Refração de Ondas', 'Difração de Ondas', 'Interferência de Ondas (Construtiva e Destrutiva)', 'Polarização da Luz'],
    'Acústica': ['Fontes Sonoras e Qualidades do Som (Altura, Timbre, Intensidade)', 'Velocidade do Som', 'Reflexão do Som (Eco e Reverberação)', 'Ressonância', 'Efeito Doppler'],
  },
  
  // Eletromagnetismo
  'Eletromagnetismo': {
    'Eletrostática': ['Carga Elétrica e Processos de Eletrização', 'Força Elétrica (Lei de Coulomb)', 'Campo Elétrico', 'Potencial Elétrico e Energia Potencial Elétrica'],
    'Eletrodinâmica (Circuitos)': ['Corrente Elétrica e Leis de Ohm', 'Circuitos Elétricos (Série, Paralelo, Misto)', 'Potência e Energia Elétrica', 'Geradores e Receptores Elétricos', 'Leis de Kirchhoff'],
    'Magnetismo': ['Ímãs e Campo Magnético', 'Força Magnética sobre Cargas e Fios', 'Campo Magnético gerado por Correntes (Fio Retilíneo e Solenoide)'],
    'Indução Eletromagnética': ['Fluxo Magnético', 'Lei de Faraday-Lenz', 'Transformadores e Motores Elétricos', 'Ondas Eletromagnéticas'],
  },
  
  // Física Moderna
  'Física Moderna': {
    'Relatividade (Especial e Geral)': ['Postulados de Einstein', 'Dilatação do Tempo e Contração do Espaço', 'Equivalência Massa-Energia (E=mc²)', 'Princípios da Relatividade Geral'],
    'Física Quântica': ['Radiação de Corpo Negro e Hipótese de Planck', 'Efeito Fotoelétrico', 'Modelo Atômico de Bohr', 'Dualidade Onda-Partícula'],
    'Física Nuclear e Radioatividade': ['Estrutura do Núcleo Atômico', 'Decaimento Radioativo (Alfa, Beta, Gama)', 'Meia-vida', 'Fissão e Fusão Nuclear'],
    'Modelo Padrão e Partículas': ['Partículas Elementares (Quarks e Léptons)', 'Forças Fundamentais da Natureza', 'Bóson de Higgs'],
  },
};

export default function EstrategiasPedagogicas() {

  // --- ESTADOS DO FORMULÁRIO ---
  const [step, setStep] = useState<'form' | 'loading' | 'result'>('form');
  const [audience, setAudience] = useState("");
  const [classSize, setClassSize] = useState(ClassSizeOptions[1]);
  
  const [category, setCategory] = useState("");
  const [topic, setTopic] = useState("");
  const [phenomenon, setPhenomenon] = useState("");
  
  const [selectedIT, setSelectedIT] = useState<string[]>([]);
  const [labAccess, setLabAccess] = useState(LabAccessOptions[0]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  
  const [tomAbordagem, setTomAbordagem] = useState('conceitual'); // NOVO ESTADO PARA O TOM
  const [additionalNotes, setAdditionalNotes] = useState('');
  
  const [randomExample] = useState(() => {
    const randomIndex = Math.floor(Math.random() * PlaceholderExamples.length);
    return PlaceholderExamples[randomIndex];
  });
  
  const [lessonPlan, setLessonPlan] = useState<LessonPlanResponse | null>(null);

  // --- FUNÇÕES DE LÓGICA ---
  const handleReset = () => {
    setStep('form');
    setLessonPlan(null);
  };
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
    setPhenomenon(""); // Reseta o fenômeno ao trocar o tema
  };

  const handleGeneratePlan = async () => {
    if (!category || !topic) {
      alert("Por favor, selecione um Tema da Aula antes de gerar o plano.");
      return;
    }

    setStep('loading');
    
    const dadosParaOBackend = {
      tema: `${category}: ${topic}`,
      fenomeno: phenomenon, // Novo campo!
      turma: `${audience} (${classSize})`,
      recursos: [
        ...selectedIT,
        labAccess,
        ...selectedMaterials
      ].filter(Boolean),
      tom_abordagem: tomAbordagem, // NOVO CAMPO ENVIADO
      observacoes: additionalNotes || ""
    };

    try {
      const BASE_URL = import.meta.env.VITE_API_URL;
      const API_URL = `${BASE_URL}/gerar-plano`;

      console.log("🚀 Modo de conexão:", import.meta.env.MODE);
      console.log("📡 Enviando requisição para:", API_URL);

      const resposta = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosParaOBackend)
      });
      
      if (!resposta.ok) throw new Error("Erro na comunicação com o servidor Python");

      const dadosRetornados = await resposta.json();
      console.log("DADOS BRUTOS DO PYTHON:", dadosRetornados);

      // --- VERIFICAÇÃO DE TEMA NÃO ENCONTRADO ---
      if (dadosRetornados.erro_tema_nao_encontrado) {
        alert("⚠️ " + dadosRetornados.erro_tema_nao_encontrado);
        setStep('form');
        return;
      }

      // O backend agora retorna um JSON limpo e estruturado.
      // Não é mais necessário fazer a limpeza e o mapeamento manual.
      console.log("🕵️‍♂️ DADOS DO BACKEND PRONTOS PARA O REACT:", dadosRetornados);
      setLessonPlan(dadosRetornados as LessonPlanResponse);
      setStep('result');

    } catch (error) {
      console.error("Erro ao gerar plano:", error);
      alert("Ocorreu um erro ao gerar o plano de aula. Verifique o console para mais detalhes.");
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
            <h2 className="text-2xl font-black text-white tracking-tight">Estratégias Pedagógicas 123</h2>
            <p className="text-indigo-300 text-sm font-medium">Configure a turma e gere sua Estratégia Pedagógica com IA</p>
          </div>
        </div>
        {(step === 'result' || step === 'loading') && (
          <button 
            onClick={handleReset}
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

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                    <Layers className="w-5 h-5 text-indigo-500" /> Tema da Aula
                  </h3>
                  <div className="w-full relative z-50">
                     <MenuTemas onSelectTheme={handleTemaEscolhido} />
                  </div>
                  {/* --- OTIMIZAÇÃO DE UX: Campo sempre visível --- */}
                  <div className="mt-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fenômeno Estudado</label>
                    <select
                      value={phenomenon}
                      onChange={(e) => setPhenomenon(e.target.value)}
                      required
                      disabled={!topic || !phenomenonOptions[category]?.[topic]}
                      className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                    >
                      <option value="" disabled hidden>
                        {topic ? 'Especifique o fenômeno...' : 'Selecione um tema primeiro...'}
                      </option>
                      {category && topic && phenomenonOptions[category]?.[topic]?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>

              {/* --- COLUNA DA DIREITA --- */}
              <div className="space-y-6">
                
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
                {/* NOVO BLOCO: SELEÇÃO DE TOM PEDAGÓGICO */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                    <Sparkles className="w-5 h-5 text-indigo-500" /> Tom da Abordagem
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'conceitual', label: 'Conceitual' },
                      { id: 'analitico', label: 'Analítico' },
                      { id: 'numerico', label: 'Numérico' },
                      { id: 'experimental', label: 'Experimental' },
                      { id: 'historico', label: 'Histórico' },
                    ].map(tom => (
                      <button
                        key={tom.id}
                        onClick={() => setTomAbordagem(tom.id)}
                        className={`text-center p-3 rounded-xl border-2 font-bold transition-all duration-200 text-sm ${
                          tomAbordagem === tom.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                        }`}
                      >{tom.label}</button>
                    ))}
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
                <Sparkles className="w-6 h-6" /> Gerar Estratégia Pedagógica
              </button>
            </div>
            
          </div>
        )}

        {step === 'loading' && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mb-6" />
            <h3 className="text-2xl font-black text-slate-800 mb-2">Analisando Arquivos e Parâmetros...</h3>
            <p className="text-slate-500 text-lg max-w-md">A IA está elaborando uma Estratégia Pedagógica inspirada no seu contexto e baseada no nosso banco de dados.</p>
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
              onReset={handleReset}
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