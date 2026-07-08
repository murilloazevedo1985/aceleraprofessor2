
// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { TargetAudience, ClassSize, ITResourcesOptions, LabAccessOptions, EverydayMaterialsOptions, PhysicsCategories, TeacherInput, WorkflowMode, UploadedFile, AudioNote, LabEquipmentOptions } from '../types';
import { BookOpen, Users, Monitor, FlaskConical, PenTool, Lightbulb, Box, ChevronDown, ChevronRight, GraduationCap, Calculator, ListChecks, FileText, Upload, X, Mic, Square, Trash2, Play } from 'lucide-react';

interface InputFormProps {
  input: TeacherInput;
  setInput: React.Dispatch<React.SetStateAction<TeacherInput>>;
  onSubmit: () => void;
  isLoading: boolean;
  mode: WorkflowMode;
}

const MateriaisLaboratorioOptions = [
  "Multímetro (digital ou analógico)",
  "Balança (digital ou de precisão)",
  "Termômetro (digital ou de mercúrio/alcoólico)",
  "Cronômetro (manual ou celular)",
  "Trena ou fita métrica de até 5 m",
  "Tripé universal",
  "Suporte com garras e anéis",
  "Bureta ou proveta graduada",
  "Béquer ou recipiente de vidro",
  "Paquímetro ou micrômetro",
  "Dinamômetro (0-5 N, 0-10 N)",
  "Protoboard (matriz de contatos)",
  "Fios de ligação (jumpers, bananas)",
  "Resistor (vários valores: 10Ω, 100Ω, 1kΩ, 10kΩ)",
  "LED, diodo, transistor, capacitor",
  "Fonte de alimentação (bateria 9V ou regulável)",
  "Bússola ou agulha imantada",
  "Ímã (neodímio ou ferrite)",
  "Bobina ou fio esmaltado (cobre)",
  "Lâmpada (pequena, 3V/12V) com suporte",
  "Interruptor simples ou push-button",
  "Lupa ou microscópio simples",
  "Polarizador (lente polaroide)",
  "Tela de projeção ou anteparo branco",
  "Laser pointer (verde ou vermelho)",
  "Prismas, lentes convergentes/divergentes, espelho côncavo/convexo",
  "Carrinho de trilho (com pouco atrito) ou plano inclinado",
  "Polias e roldanas",
  "Mola helicoidal",
  "Tubos de ensaio com suporte",
  "Pipeta e seringa (sem agulha)",
  "Sensor de temperatura (ou termopar)",
  "Sensor de movimento (sonar)"
];

const InputForm: React.FC<InputFormProps> = ({ input, setInput, onSubmit, isLoading, mode }) => {
  const [isTopicMenuOpen, setIsTopicMenuOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [ideaPlaceholder, setIdeaPlaceholder] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTopicMenuOpen(false);
        setHoveredCategory(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (mode === WorkflowMode.EXERCISES) {
      setIdeaPlaceholder("Ex: Focar em conversão de unidades e notação científica.");
    } else {
      const examples = [
        "Ex: Quero usar água e gelo para estudar termodinâmica.",
        "Ex: Usar carrinhos de brinquedo para explicar velocidade média e aceleração.",
        "Ex: Construir um espectroscópio caseiro com CD velho para falar sobre luz.",
        "Ex: Analisar o movimento de um elevador para entender as Leis de Newton.",
        "Ex: Estudar circuitos elétricos simples usando pilhas, fios e LEDs.",
        "Ex: Explicar o funcionamento de uma garrafa térmica.",
        "Ex: Investigar a queda dos corpos usando bolas de diferentes massas."
      ];
      setIdeaPlaceholder(examples[Math.floor(Math.random() * examples.length)]);
    }
  }, [mode]);

  const handleChange = (field: keyof TeacherInput, value: any) => {
    setInput(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field: 'itResources' | 'everydayMaterials' | 'labEquipment', value: string) => {
    setInput(prev => {
      const currentList = prev[field] as string[];
      if (currentList.includes(value)) {
        return { ...prev, [field]: currentList.filter(item => item !== value) };
      } else {
        return { ...prev, [field]: [...currentList, value] };
      }
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = (reader.result as string).split(',')[1];
          handleChange('audioNote', {
            data: base64Audio,
            mimeType: 'audio/webm'
          });
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      alert("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const removeAudio = () => {
    setAudioURL(null);
    handleChange('audioNote', undefined);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: UploadedFile[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
          alert(`Arquivo ${file.name} não suportado. Use PDF ou Imagens.`);
          continue;
        }
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
             const result = reader.result as string;
             const base64 = result.split(',')[1];
             resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        newFiles.push({ name: file.name, mimeType: file.type, data: base64Data });
      }
      setInput(prev => ({ ...prev, contextFiles: [...prev.contextFiles, ...newFiles] }));
    }
  };

  const removeFile = (index: number) => {
    setInput(prev => ({
      ...prev,
      contextFiles: prev.contextFiles.filter((_, i) => i !== index)
    }));
  };

  const experienceOptions = [
    "Menos de 1 anos",
    "Menos de 5 anos",
    "Menos de 10 anos",
    "Menos de 15 anos",
    "Mais de 15 anos"
  ];

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-visible border border-slate-200">
      <div className={`${mode === WorkflowMode.EXERCISES ? 'bg-emerald-600' : 'bg-indigo-600'} p-6 text-white rounded-t-xl transition-colors duration-500`}>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          {mode === WorkflowMode.EXERCISES ? <ListChecks className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
          {mode === WorkflowMode.EXERCISES ? 'Configurar Lista de Exercícios' : 'Configurar Estratégia Pedagógica'}
        </h2>
        <p className={`${mode === WorkflowMode.EXERCISES ? 'text-emerald-100' : 'text-indigo-100'} mt-2`}>
          {mode === WorkflowMode.EXERCISES ? 'Gere questões progressivas com áudio e gabarito.' : 'Fale ou escreva sua estratégia para o Cérebro processar.'}
        </p>
      </div>

      <div className="p-8 space-y-8">
        
        {/* Row 0: Teacher Experience */}
        <div>
           <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-slate-500" />
              Tempo de Experiência Docente
            </label>
            <select
              value={input.teacherExperience}
              onChange={(e) => handleChange('teacherExperience', e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              {experienceOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
        </div>

        {/* Row 1: Content & Audience */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 z-20 relative">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              Público-Alvo
            </label>
            <select
              value={input.targetAudience}
              onChange={(e) => handleChange('targetAudience', e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              {Object.values(TargetAudience).map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div ref={dropdownRef}>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <PenTool className="w-4 h-4 text-slate-500" />
              Conteúdo / Tópico
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTopicMenuOpen(!isTopicMenuOpen)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <span className={`block truncate ${!input.topic ? 'text-slate-500' : 'text-slate-900'}`}>
                  {input.topic || "Selecione o conteúdo..."}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>
              {isTopicMenuOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50">
                  <div className="py-1">
                    {PhysicsCategories.map((category) => (
                      <div
                        key={category.name}
                        className="relative group px-4 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                        onMouseEnter={() => setHoveredCategory(category.name)}
                      >
                        <span className="font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">{category.name}</span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                        {hoveredCategory === category.name && (
                          <div className="absolute left-[calc(100%-4px)] top-[-4px] w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
                             <div className="py-1 max-h-60 overflow-y-auto">
                               {category.topics.map((topic) => (
                                 <button
                                   key={topic}
                                   type="button"
                                   className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 text-sm transition-colors"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setInput(prev => ({ ...prev, topic: `${category.name}: ${topic}` }));
                                     setIsTopicMenuOpen(false);
                                     setHoveredCategory(null);
                                   }}
                                 >
                                   {topic}
                                 </button>
                               ))}
                             </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Initial Idea & Voice Note */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              Ideia Inicial / Instruções do Professor
            </label>
            <div className="flex gap-2">
               {!isRecording ? (
                 <button
                   type="button"
                   onClick={startRecording}
                   className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold hover:bg-indigo-100 transition-colors"
                 >
                   <Mic className="w-3 h-3" /> Gravar Áudio
                 </button>
               ) : (
                 <button
                   type="button"
                   onClick={stopRecording}
                   className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold animate-pulse"
                 >
                   <Square className="w-3 h-3" /> Parar Gravação
                 </button>
               )}
            </div>
          </div>

          <textarea
            placeholder={ideaPlaceholder}
            value={input.initialIdea}
            onChange={(e) => handleChange('initialIdea', e.target.value)}
            className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:border-transparent h-24 resize-none transition-colors ${mode === WorkflowMode.EXERCISES ? 'focus:ring-emerald-500' : 'focus:ring-indigo-500'}`}
          />

          {audioURL && (
            <div className="flex items-center gap-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg animate-in slide-in-from-top-2">
              <div className="p-2 bg-indigo-600 rounded-full text-white">
                <Mic className="w-4 h-4" />
              </div>
              <audio src={audioURL} controls className="h-8 flex-grow" />
              <button onClick={removeAudio} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Upload Section - "Pasta" Content */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
          <div className="flex items-start justify-between mb-3">
             <label className="block text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-500" />
              Material de Apoio (Pasta do Professor)
            </label>
          </div>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 bg-white text-center hover:bg-slate-50 transition-colors relative">
            <input
              type="file"
              multiple
              accept=".pdf,image/*"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center pointer-events-none">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm text-slate-600">Arraste arquivos (PDF/IMG) para fundamentar a IA</p>
            </div>
          </div>
          {input.contextFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {input.contextFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white border border-slate-200 px-3 py-2 rounded shadow-sm">
                   <div className="flex items-center truncate">
                     <FileText className="w-4 h-4 text-indigo-500 mr-2 flex-shrink-0" />
                     <span className="text-sm text-slate-700 truncate">{file.name}</span>
                   </div>
                   <button onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500 ml-2"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Row 2: Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          {mode === WorkflowMode.EXERCISES ? (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-500" />
                Quantidade de Exercícios (Máx: 12)
              </label>
              <input 
                  type="number"
                  min="1" max="12"
                  value={input.exerciseCount}
                  onChange={(e) => handleChange('exerciseCount', Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2"><Users className="w-4 h-4 text-slate-500" /> Qtd. de Alunos</label>
                <select
                  value={input.classSize}
                  onChange={(e) => handleChange('classSize', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {Object.values(ClassSize).map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2"><FlaskConical className="w-4 h-4 text-slate-500" /> Laboratório</label>
                <select
                  value={input.labAccess}
                  onChange={(e) => handleChange('labAccess', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {LabAccessOptions.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                </select>
              </div>
              {input.labAccess === "Laboratório de Física completo" && (
                <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-lg p-5 animate-in fade-in slide-in-from-top-2">
                   <label className="block text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <Box className="w-4 h-4 text-slate-500" />
                      Equipamentos de Laboratório Disponíveis
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 max-h-48 overflow-y-auto pr-2">
                      {MateriaisLaboratorioOptions.map(opt => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 hover:text-indigo-600">
                          <input 
                            type="checkbox" 
                            checked={input.labEquipment.includes(opt)}
                            onChange={() => handleCheckboxChange('labEquipment', opt)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          {opt.split(' (')[0]}
                        </label>
                      ))}
                    </div>
                </div>
              )}
            </>
          )}
        </div>

        <button
          onClick={onSubmit}
          disabled={isLoading || !input.topic}
          className={`w-full py-4 rounded-lg font-bold text-lg shadow-md transition-all flex justify-center items-center gap-3
            ${isLoading || !input.topic
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : mode === WorkflowMode.EXERCISES
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processando Áudio e Contexto...
            </>
          ) : (
             mode === WorkflowMode.EXERCISES ? 'Gerar Lista de Exercícios' : 'Criar Estratégia Pedagógica'
          )}
        </button>
      </div>
    </div>
  );
};

export default InputForm;
