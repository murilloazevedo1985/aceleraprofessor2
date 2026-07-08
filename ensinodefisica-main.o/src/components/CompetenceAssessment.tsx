// @ts-nocheck
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Brain, Cpu, ShieldCheck, Microscope, Zap, ChevronRight, ChevronLeft, Award, Info, Star, TrendingUp, TrendingDown, Lightbulb, Download } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

export type CompetenceResult = any;

interface CompetenceAssessmentProps {
  onComplete?: (result: CompetenceResult) => void;
  onVoltar?: () => void;
}

const CompetenceAssessment: React.FC<CompetenceAssessmentProps> = ({ onComplete, onVoltar }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  
  // Referência para o PDF
  const relatorioRef = useRef(null);
  
  // Função para gerar o PDF
  const handleDownloadPdf = useReactToPrint({
    content: () => relatorioRef.current,
    documentTitle: 'Diagnostico_Competencias_Digitais_Docentes',
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const categories = useMemo(() => [
    {
      id: 'physics',
      title: 'Domínio sobre a Física',
      icon: <Brain className="w-6 h-6 text-indigo-300" />,
      questions: [
        { id: 'p_c1', text: 'Tenho domínio profundo sobre os conceitos teóricos de Física que leciono.', type: 'C' },
        { id: 'p_c2', text: 'Identifico com precisão os erros conceituais e senso comum dos alunos.', type: 'C' },
        { id: 'p_c3', text: 'Compreendo a evolução histórica e epistemológica dos principais modelos físicos.', type: 'C' },
        { id: 'p_h1', text: 'Consigo transpor leis complexas para linguagens e modelos didáticos acessíveis.', type: 'H' },
        { id: 'p_h2', text: 'Domino a resolução analítica e numérica de problemas de nível universitário.', type: 'H' },
        { id: 'p_h3', text: 'Consigo elaborar experimentos demonstrativos de baixo custo com rigor científico.', type: 'H' },
        { id: 'p_a1', text: 'Busco ativamente novos artigos e descobertas em revistas de ensino de física.', type: 'A' },
        { id: 'p_a2', text: 'Acredito que o rigor teórico deve caminhar junto com a experimentação.', type: 'A' },
        { id: 'p_a3', text: 'Interesso-me em humanizar a física através de biografias e dilemas científicos.', type: 'A' }
      ]
    },
    {
      id: 'informatics',
      title: 'Informática',
      icon: <Cpu className="w-6 h-6 text-emerald-300" />,
      questions: [
        { id: 'i_c1', text: 'Compreendo o funcionamento lógico de sistemas operacionais e arquitetura básica de Computadores.', type: 'C' },
        { id: 'i_c2', text: 'Conheço as especificações técnicas ideais para rodar simuladores e softwares pesados.', type: 'C' },
        { id: 'i_c3', text: 'Entendo como protocolos de rede (Wi-Fi/Cabo) afetam a fluidez da aula digital.', type: 'C' },
        { id: 'i_h1', text: 'Consigo configurar periféricos (projetores, sensores USB) com autonomia total.', type: 'H' },
        { id: 'i_h2', text: 'Domino ferramentas de manutenção básica para manter os equipamentos em uso.', type: 'H' },
        { id: 'i_h3', text: 'Utilizo AVA (moodle, Google Classroom etc.) para ajudar a gerenciar a evolução do aprendizado dos estudantes.', type: 'H' },
        { id: 'i_a1', text: 'Mantenho uma atitude de experimentação com novos gadgets e hardware educativo.', type: 'A' },
        { id: 'i_a2', text: 'Sou o primeiro a testar novas atualizações de softwares que uso em aula.', type: 'A' },
        { id: 'i_a3', text: 'Interesso-me em entender a física por trás dos novos hardwares (ex: sensores MEMS).', type: 'A' }
      ]
    },
    {
      id: 'management',
      title: 'Gestão Tecnológica',
      icon: <ShieldCheck className="w-6 h-6 text-amber-300" />,
      questions: [
        { id: 'm_c1', text: 'Conheço e respeito as normas de direitos autorais e licenças (Creative Commons) aplicadas à educação.', type: 'C' },
        { id: 'm_c2', text: 'Compreendo a LGPD e a importância da privacidade dos dados dos meus alunos.', type: 'C' },
        { id: 'm_c3', text: 'Entendo a estrutura de organização de arquivos em nuvem e bibliotecas digitais.', type: 'C' },
        { id: 'm_h1', text: 'Gerencio com eficiência salas virtuais (Google Classroom, Teams) para organizar a turma.', type: 'H' },
        { id: 'm_h2', text: 'Faço curadoria de mídias (Vídeos, PDFs) eliminando materiais com erros ou baixa qualidade.', type: 'H' },
        { id: 'm_h3', text: 'Utilizo ferramentas de produtividade para automatizar frequência, notas e feedbacks.', type: 'H' },
        { id: 'm_a1', text: 'Prezo pela organização impecável dos materiais compartilhados com os alunos.', type: 'A' },
        { id: 'm_a2', text: 'Sou ético e responsável ao usar imagens e dados de terceiros em minhas aulas.', type: 'A' },
        { id: 'm_a3', text: 'Estimulo nos alunos o hábito de organizar seus próprios portfólios digitais.', type: 'A' }
      ]
    },
    {
      id: 'techPhysics',
      title: 'Tecnologias no Ensino de Física',
      icon: <Microscope className="w-6 h-6 text-rose-300" />,
      questions: [
        { id: 't_c1', text: 'Conheço linguagens de programação (Python, Arduino, etc.) e uso essa habilidade para modelar fenômenos em sala de aula.', type: 'C' },
        { id: 't_c2', text: 'Entendo o funcionamento técnico de sensores de medida (Luz, Som, Aceleração) no celular.', type: 'C' },
        { id: 't_c3', text: 'Compreendo as vantagens e limitações pedagógicas de experimentos virtuais vs reais.', type: 'C' },
        { id: 't_h1', text: 'Consigo criar roteiros de atividades guiadas utilizando exclusivamente laboratórios virtuais.', type: 'H' },
        { id: 't_h2', text: 'Utilizo softwares de análise de vídeo (Tracker/PhysPhox) para extrair dados reais.', type: 'H' },
        { id: 't_h3', text: 'Domino softwares de simulação de circuitos e óptica com facilidade operacional.', type: 'H' },
        { id: 't_a1', text: 'Considero a tecnologia digital um pilar essencial para o ensino de física contemporânea.', type: 'A' },
        { id: 't_a2', text: 'Tenho paciência e resiliência quando simulações ou conexões falham em aula.', type: 'A' },
        { id: 't_a3', text: 'Busco integrar o laboratório físico "mão na massa" com a coleta de dados digital.', type: 'A' }
      ]
    },
    {
      id: 'innovation',
      title: 'Inovação Profissional',
      icon: <Zap className="w-6 h-6 text-violet-300" />,
      questions: [
        { id: 'n_c1', text: 'Compreendo o impacto de technologies de segunda geração (5G, Big Data, Cloud Computing) na sociedade e educação.', type: 'C' },
        { id: 'n_c2', text: 'Domino conceitos de Inteligência Artificial Generativa e sei como ela pode personalizar o ensino.', type: 'C' },
        { id: 'n_c3', text: 'Conheço plataformas de gamificação e avaliação formativa digital (Kahoot, Quizizz).', type: 'C' },
        { id: 'n_h1', text: 'Consigo redesenhar meu planejamento de aula em poucas horas usando auxílio de IA.', type: 'H' },
        { id: 'n_h2', text: 'Utilizo armazenamento em nuvem avançado para colaboração em tempo real com alunos.', type: 'H' },
        { id: 'n_h3', text: 'Crio materiais interativos que estimulam a autonomia e o protagonismo do aluno.', type: 'H' },
        { id: 'n_a1', text: 'Tenho curiosidade insaciável sobre novas formas de ensinar com tecnologias emergentes.', type: 'A' },
        { id: 'n_a2', text: 'Sou flexível e adaptável às mudanças rápidas do cenário tecnológico educacional.', type: 'A' },
        { id: 'n_a3', text: 'Vejo o erro tecnológico como uma oportunidade de aprendizado coletivo em sala.', type: 'A' }
      ]
    }
  ], []);

  const handleAnswer = (qId: string, value: number) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const calculateResult = (): CompetenceResult => {
    const calcArea = (catId: string, type: string) => {
      const qIds = categories.find(c => c.id === catId)?.questions.filter(q => q.type === type).map(q => q.id) || [];
      const sum = qIds.reduce((a, b) => a + (answers[b] || 0), 0);
      return (sum / (qIds.length * 5)) * 100;
    };
    
    const res: CompetenceResult = {
      detail: {
        physics: { c: calcArea('physics', 'C'), h: calcArea('physics', 'H'), a: calcArea('physics', 'A') },
        informatics: { c: calcArea('informatics', 'C'), h: calcArea('informatics', 'H'), a: calcArea('informatics', 'A') },
        management: { c: calcArea('management', 'C'), h: calcArea('management', 'H'), a: calcArea('management', 'A') },
        techPhysics: { c: calcArea('techPhysics', 'C'), h: calcArea('techPhysics', 'H'), a: calcArea('techPhysics', 'A') },
        innovation: { c: calcArea('innovation', 'C'), h: calcArea('innovation', 'H'), a: calcArea('innovation', 'A') }
      },
      cha: { conhecimentos: 0, habilidades: 0, atitudes: 0 },
      total: 0,
      level: ''
    };

    ['C', 'H', 'A'].forEach(t => {
      let sum = 0; let count = 0;
      categories.forEach(c => c.questions.forEach(q => {
        if (q.type === t) { sum += (answers[q.id] || 0); count++; }
      }));
      if (t === 'C') res.cha.conhecimentos = (sum / (count * 5)) * 100;
      if (t === 'H') res.cha.habilidades = (sum / (count * 5)) * 100;
      if (t === 'A') res.cha.atitudes = (sum / (count * 5)) * 100;
    });

    res.total = (res.cha.conhecimentos + res.cha.habilidades + res.cha.atitudes) / 3;

    if (res.total > 80) res.level = "Nível V: Mestre Inovador";
    else if (res.total > 60) res.level = "Nível IV: Integrador Ativo";
    else if (res.total > 40) res.level = "Nível III: Explorador";
    else if (res.total > 20) res.level = "Nível II: Iniciante";
    else res.level = "Nível I: Tradicional";

    return res;
  };

  const MultiLayerRadarChart = ({ data }: { data: CompetenceResult }) => {
    const size = 300;
    const center = size / 2;
    const radius = 180; 
    const axisCount = 5;
    const angleStep = (Math.PI * 2) / axisCount;

    const domainLabels = [
      "Domínio sobre a Física",
      "Informática",
      "Gestão Tecnológica",
      "Tecnologias no Ensino",
      "Inovação Profissional"
    ];

    const getCoord = (value: number, index: number) => {
      const angle = index * angleStep - Math.PI / 2;
      const r = (value / 100) * radius;
      return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
    };

    const drawPolygon = (values: number[], color: string, fillColor: string) => {
      const points = values.map((v, i) => {
        const p = getCoord(v, i);
        return `${p.x},${p.y}`;
      }).join(' ');
      return <polygon points={points} fill={fillColor} stroke={color} strokeWidth="3" className="transition-all duration-700" />;
    };

    const cValues = [data.detail.physics.c, data.detail.informatics.c, data.detail.management.c, data.detail.techPhysics.c, data.detail.innovation.c];
    const hValues = [data.detail.physics.h, data.detail.informatics.h, data.detail.management.h, data.detail.techPhysics.h, data.detail.innovation.h];
    const aValues = [data.detail.physics.a, data.detail.informatics.a, data.detail.management.a, data.detail.techPhysics.a, data.detail.innovation.a];

    return (
      <div className="flex flex-col items-center">
        <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible mx-auto drop-shadow-md max-w-lg">
          {[25, 50, 75, 100].map(level => (
            <g key={level}>
              <polygon points={domainLabels.map((_, i) => {
                const p = getCoord(level, i); return `${p.x},${p.y}`;
              }).join(' ')} fill="none" stroke="#94a3b8" strokeWidth="1.5" /> 
              <text x={center} y={center - (level / 100 * radius) - 4} textAnchor="middle" className="text-xs fill-slate-500 font-bold">{level}%</text>
            </g>
          ))}
          
          {domainLabels.map((l, i) => {
            const p = getCoord(100, i);
            const angle = i * angleStep - Math.PI / 2;
            const x = center + (radius + 50) * Math.cos(angle);
            const y = center + (radius + 50) * Math.sin(angle);
            return (
              <g key={i}>
                <line x1={center} y1={center} x2={p.x} y2={p.y} stroke="#cbd5e1" strokeWidth="2" />
                <text x={x} y={y} textAnchor="middle" alignmentBaseline="middle" className="text-[11px] font-black fill-slate-600 uppercase leading-none">
                  {l}
                </text>
              </g>
            );
          })}

          {drawPolygon(cValues, "#3b82f6", "rgba(59, 130, 246, 0.2)")}
          {drawPolygon(hValues, "#10b981", "rgba(16, 185, 129, 0.2)")}
          {drawPolygon(aValues, "#f43f5e", "rgba(244, 63, 94, 0.2)")}
          
          <g transform={`translate(${center - 130}, ${size + 80})`}>
            <rect width="12" height="12" fill="#3b82f6" rx="2" /> <text x="18" y="10" className="text-xs fill-slate-600 font-bold">C - Conhecimentos</text>
            <rect x="130" width="12" height="12" fill="#10b981" rx="2" /> <text x="148" y="10" className="text-xs fill-slate-600 font-bold">H - Habilidades</text>
            <rect x="245" width="12" height="12" fill="#f43f5e" rx="2" /> <text x="263" y="10" className="text-xs fill-slate-600 font-bold">A - Atitudes</text>
          </g>
        </svg>
      </div>
    );
  };

  const ProportionalVenn = ({ data }: { data: CompetenceResult }) => {
    const baseR = 60; 
    const cR = (Math.sqrt(Math.max(data.cha.conhecimentos, 5)) / 10) * baseR;
    const hR = (Math.sqrt(Math.max(data.cha.habilidades, 5)) / 10) * baseR;
    const aR = (Math.sqrt(Math.max(data.cha.atitudes, 5)) / 10) * baseR;
    
    const centerX = 150, centerY = 130;
    const offset = 30;
    
    return (
      <div className="flex flex-col items-center">
        <svg width="300" height="240" viewBox="0 0 300 240" className="drop-shadow-lg">
          <defs>
            <filter id="shadow">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.1" />
            </filter>
          </defs>
          
          <circle cx={centerX} cy={centerY - offset} r={cR} fill="rgba(59, 130, 246, 0.45)" stroke="#3b82f6" strokeWidth="2" filter="url(#shadow)" />
          <circle cx={centerX + offset} cy={centerY + offset / 2} r={hR} fill="rgba(16, 185, 129, 0.45)" stroke="#10b981" strokeWidth="2" filter="url(#shadow)" />
          <circle cx={centerX - offset} cy={centerY + offset / 2} r={aR} fill="rgba(244, 63, 94, 0.45)" stroke="#f43f5e" strokeWidth="2" filter="url(#shadow)" />
          
          <text x={centerX} y={centerY - offset - cR - 10} textAnchor="middle" className="text-[10px] font-black fill-blue-900 drop-shadow-sm uppercase">Conhecimentos ({Math.round(data.cha.conhecimentos)}%)</text>
          <text x={centerX + offset + hR + 10} y={centerY + offset / 2} textAnchor="start" className="text-[10px] font-black fill-emerald-900 drop-shadow-sm uppercase">Habilidades ({Math.round(data.cha.habilidades)}%)</text>
          <text x={centerX - offset - aR - 10} y={centerY + offset / 2} textAnchor="end" className="text-[10px] font-black fill-rose-900 drop-shadow-sm uppercase">Atitudes ({Math.round(data.cha.atitudes)}%)</text>
          
          <text x={centerX} y={centerY + 5} textAnchor="middle" className="text-[12px] font-black fill-slate-800 tracking-tighter drop-shadow-md uppercase">Integração CHA</text>
        </svg>
      </div>
    );
  };

  if (step === 5) {
    const finalData = calculateResult();

    const getStrengths = () => {
        return Object.entries(finalData.detail)
          .filter(([_, val]: [any, any]) => (val.c + val.h + val.a) / 3 >= 70)
          .map(([key]) => categories.find(c => c.id === key)?.title);
    };

    const getWeaknesses = () => {
        return Object.entries(finalData.detail)
          .filter(([_, val]: [any, any]) => (val.c + val.h + val.a) / 3 < 50)
          .map(([key]) => categories.find(c => c.id === key)?.title);
    };

    const getTrainingAdvice = () => {
        const sorted = Object.entries(finalData.detail)
          .sort((a: any, b: any) => (a[1].c + a[1].h + a[1].a) - (b[1].c + b[1].h + b[1].a));
        
        const adviceMap: Record<string, { strategy: string, resources: string[] }> = {
          physics: {
            strategy: "Foque na transposição didática da Física Moderna. A abstração matemática pode ser vencida com modelos visuais consistentes.",
            resources: ["Cursos de Física Moderna para o Ensino Médio", "Artigos da Revista Brasileira de Ensino de Física (RBEF)", "Simulações de Relatividade e Quântica"]
          },
          informatics: {
            strategy: "Melhore sua base técnica para resolver problemas inesperados de hardware. Autonomia técnica reduz a ansiedade tecnológica.",
            resources: ["Fundamentos de Redes para Escolas", "Manutenção básica de Chromebooks/Tablets", "Especialização em Suporte Educacional"]
          },
          management: {
            strategy: "Otimize seu tempo migrando de pastas físicas para um ecossistema digital integrado (AVA).",
            resources: ["Certificação Google Educator Level 1", "Moodle para Professores: Avançado", "Ética e Proteção de Dados (LGPD) na Educação"]
          },
          techPhysics: {
            strategy: "Passe da visualização passiva para a coleta ativa de dados digitais em experimentos reais.",
            resources: ["Uso Avançado do Software Tracker", "Arduino aplicado ao laboratório de Física", "Análise de dados com PhysPhox"]
          },
          innovation: {
            strategy: "Integre a IA não apenas para criar tarefas, mas para feedback formativo instantâneo para os alunos.",
            resources: ["Prompt Engineering para Educadores de STEM", "Aplicações de Big Data na gestão de turmas", "Tendências de 5G na Internet das Coisas (IoT) Educacional"]
          }
        };

        return sorted.slice(0, 2).map(([key]) => ({
            area: categories.find(c => c.id === key)?.title,
            advice: adviceMap[key]
        }));
    };

    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20 px-4 mt-8">
        <div className="flex justify-between items-center mb-6">
          {onVoltar ? (
            <button 
              onClick={onVoltar} 
              className="inline-flex items-center px-4 py-2 bg-white text-slate-600 font-bold rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
            >
              ← Voltar ao Menu Principal
            </button>
          ) : <div></div>}

          <button 
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-black uppercase text-sm rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 transition-all"
          >
            <Download className="w-5 h-5" />
            Salvar Relatório em PDF
          </button>
        </div>

        <div ref={relatorioRef} className="bg-white p-8 rounded-3xl print:p-0">
          <div className="text-center mb-10">
            <Award className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Diagnóstico de Competência Digital Docente</h2>
            <p className="text-slate-500 mt-1 text-lg">{finalData.level}</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 bg-white p-8 rounded-3xl shadow-xl border border-slate-100 items-stretch mb-8">
            <div className="lg:col-span-2 bg-slate-50 p-4 rounded-3xl border border-slate-200 flex flex-col justify-center">
              <h3 className="text-center text-xl font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Análise por Domínio (CHA)</h3>
              <div className="flex-1 flex items-center justify-center">
                <MultiLayerRadarChart data={finalData} />
              </div>
            </div>
            
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Zap className="w-24 h-24" />
                </div>
                <h3 className="text-indigo-400 text-xs font-black uppercase tracking-widest mb-1">Desempenho Geral</h3>
                <p className="text-5xl font-black">{Math.round(finalData.total)}%</p>
                <div className="mt-4 h-3 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" style={{ width: `${finalData.total}%` }}></div>
                </div>
              </div>

              <div className="bg-white border-2 border-slate-50 p-6 rounded-3xl shadow-md flex-1 flex flex-col items-center justify-center">
                 <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-6 text-center">Equilíbrio do CHA</h3>
                 <ProportionalVenn data={finalData} />
                 
                 <div className="grid grid-cols-3 gap-2 w-full mt-4">
                   <div className="text-center">
                     <span className="block text-[10px] font-black text-blue-400 uppercase">Conhec.</span>
                     <span className="text-xl font-black text-blue-600">{Math.round(finalData.cha.conhecimentos)}%</span>
                   </div>
                   <div className="text-center">
                     <span className="block text-[9px] font-black text-emerald-400 uppercase">Habilid.</span>
                     <span className="text-xl font-black text-emerald-600">{Math.round(finalData.cha.habilidades)}%</span>
                   </div>
                   <div className="text-center">
                     <span className="block text-[9px] font-black text-rose-400 uppercase">Atitudes</span>
                     <span className="text-xl font-black text-rose-600">{Math.round(finalData.cha.atitudes)}%</span>
                   </div>
                 </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-emerald-600">
                      <TrendingUp className="w-5 h-5" />
                      <h4 className="font-black uppercase text-xs tracking-widest">Pontos Fortes</h4>
                  </div>
                  <div className="space-y-2">
                      {getStrengths().length > 0 ? getStrengths().map((s, i) => (
                          <div key={i} className="flex items-start gap-2 text-emerald-800 text-xs font-bold bg-emerald-100/50 p-2.5 rounded-xl border border-emerald-200">
                              <Star className="w-3.5 h-3.5 text-emerald-500 mt-0.5 fill-emerald-500 flex-shrink-0" />
                              {s}
                          </div>
                      )) : <p className="text-emerald-800 text-xs italic">Foque no CHA para descobrir seus potenciais latentes.</p>}
                  </div>
              </div>

              <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-rose-600">
                      <TrendingDown className="w-5 h-5" />
                      <h4 className="font-black uppercase text-xs tracking-widest">Pontos Fracos</h4>
                  </div>
                  <div className="space-y-2">
                      {getWeaknesses().length > 0 ? getWeaknesses().map((w, i) => (
                          <div key={i} className="flex items-start gap-2 text-rose-800 text-xs font-bold bg-rose-100/50 p-2.5 rounded-xl border border-rose-200">
                              <Info className="w-3.5 h-3.5 text-rose-500 mt-0.5 flex-shrink-0" />
                              {w}
                          </div>
                      )) : <p className="text-rose-800 text-xs italic">Excelente equilíbrio! Nenhum ponto crítico identificado.</p>}
                  </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-amber-600">
                      <Lightbulb className="w-5 h-5" />
                      <h4 className="font-black uppercase text-xs tracking-widest">Sugestões</h4>
                  </div>
                  <div className="space-y-4">
                      {getTrainingAdvice().map((a, i) => (
                          <div key={i} className="space-y-1.5">
                              <span className="text-[9px] font-black text-amber-600 uppercase bg-amber-200/50 px-2 py-0.5 rounded border border-amber-200 inline-block mb-1">{a.area}</span>
                              <p className="text-amber-900 text-[11px] leading-tight font-bold">{a.advice.strategy}</p>
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          <div className="bg-slate-100 p-8 rounded-2xl text-slate-800 border border-slate-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200">
                <Info className="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <h4 className="text-lg font-black mb-2">Interpretação e Plano Estratégico</h4>
                <p className="text-slate-600 leading-relaxed text-sm">
                  Seu perfil como <strong>{finalData.level}</strong> indica uma integração de CHA que {finalData.total > 60 ? 'sustenta uma prática pedagógica inovadora' : 'está em fase de expansão exploratória'}. 
                  O foco imediato deve ser {finalData.cha.conhecimentos > finalData.cha.habilidades ? 'transformar seus conhecimentos teóricos em habilidades práticas de sala' : 'aprofundar a base conceitual para dar suporte às suas habilidades operacionais'}. 
                  Lembre-se: na Física, a tecnologia é a ponte entre a teoria abstrata e a realidade experimental observável.
                </p>
              </div>
            </div>
          </div>

        </div> 
      </div>
    );
  }

  const currentCategory = categories[step];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-200">
        
        <div className="bg-[#0f172a] px-8 py-10 sm:px-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-slate-800 rounded-2xl border border-slate-700 text-3xl">
              {currentCategory.icon}
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight mb-1">
                {currentCategory.title}
              </h2>
              <p className="text-indigo-300 text-xs font-bold tracking-widest uppercase opacity-80">
                Competência {step + 1} de {categories.length}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {categories.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-2.5 w-8 rounded-full transition-colors duration-500 ${idx <= step ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'bg-slate-800'}`} 
              />
            ))}
          </div>
        </div>

        <div className="p-8 sm:p-12">
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-12 flex items-center gap-4 shadow-sm">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-md">
              <Star className="w-5 h-5 text-white fill-white" />
            </div>
            <p className="text-indigo-900 font-medium text-lg">
              Avalie sinceramente seu perfil de <strong>1 (Iniciante)</strong> a <strong>5 (Especialista)</strong>.
            </p>
          </div>

          <div className="space-y-12">
            {currentCategory.questions.map((q) => {
              const badgeText = q.type === 'C' ? 'Conhecimentos' : q.type === 'H' ? 'Habilidades' : 'Atitudes';
              const badgeColor = q.type === 'C' ? 'bg-blue-100 text-blue-700' : q.type === 'H' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700';

              return (
                <div key={q.id} className="flex flex-col md:flex-row gap-6 md:gap-10 items-start border-b border-slate-100 pb-10 last:border-0 group">
                  <div className="md:w-1/2">
                    <span className={`inline-block px-3 py-1 text-[10px] font-extrabold tracking-widest rounded-md mb-4 uppercase ${badgeColor}`}>
                      {badgeText}
                    </span>
                    <h3 className="text-xl font-bold text-slate-800 leading-snug group-hover:text-indigo-700 transition-colors">
                      {q.text}
                    </h3>
                  </div>

                  <div className="md:w-1/2 flex gap-2 sm:gap-3 w-full justify-between md:justify-end">
                    {[1, 2, 3, 4, 5].map((num) => {
                      const isSelected = answers[q.id] === num;
                      return (
                        <button
                          key={num}
                          onClick={() => handleAnswer(q.id, num)}
                          className={`flex-1 md:flex-none md:w-14 h-14 flex items-center justify-center text-xl font-black rounded-xl border-2 transition-all duration-200 ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105'
                              : 'border-slate-200 bg-white text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-slate-50'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-100">
            <div className="flex gap-4">
              {onVoltar && (
                <button 
                  onClick={onVoltar} 
                  className="text-slate-500 font-bold hover:text-slate-800 transition-colors px-4 py-3 flex items-center text-sm uppercase tracking-widest"
                >
                  ← Menu
                </button>
              )}
              <button 
                onClick={() => setStep(s => s - 1)}
                disabled={step === 0}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold uppercase text-sm tracking-widest transition-all ${
                  step === 0 ? 'text-slate-300 cursor-not-allowed hidden' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <ChevronLeft className="w-5 h-5" /> Anterior
              </button>
            </div>

            <button 
              onClick={() => {
                if (step === categories.length - 1) {
                  setStep(5); // Vai para a tela de resultados finais
                } else {
                  setStep(s => s + 1);
                }
              }} 
              className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-sm tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 transition-all"
            >
              {step === categories.length - 1 ? 'Ver Resultado' : 'Próximo'} <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompetenceAssessment;