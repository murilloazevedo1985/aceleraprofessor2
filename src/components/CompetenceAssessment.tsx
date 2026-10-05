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
    const size = 400;
    const center = size / 2;
    const radius = 145;
    const axisCount = 5;
    const angleStep = (Math.PI * 2) / axisCount;

    const domains = [
      { initials: 'DF', label: 'Domínio sobre a Física' },
      { initials: 'Inf', label: 'Informática' },
      { initials: 'GT', label: 'Gestão Tecnológica' },
      { initials: 'TDEF', label: 'Tecnologias Digitais no Ensino de Física' },
      { initials: 'IP', label: 'Inovação Profissional' },
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
        <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto aspect-square w-full max-w-xl drop-shadow-md">
          {[25, 50, 75, 100].map(level => (
            <g key={level}>
              <polygon points={domains.map((_, i) => {
                const p = getCoord(level, i); return `${p.x},${p.y}`;
              }).join(' ')} fill="none" stroke="#94a3b8" strokeWidth="1.5" /> 
            </g>
          ))}
          
          {domains.map((domain, i) => {
            const p = getCoord(100, i);
            return (
              <g key={i}>
                <line x1={center} y1={center} x2={p.x} y2={p.y} stroke="#cbd5e1" strokeWidth="2" />
                <circle cx={p.x} cy={p.y} r="21" fill="#334155" />
                <text x={p.x} y={p.y + 4} textAnchor="middle" className="fill-white text-[10px] font-bold">
                  {domain.initials}
                </text>
              </g>
            );
          })}

          {drawPolygon(cValues, "#3b82f6", "rgba(59, 130, 246, 0.2)")}
          {drawPolygon(hValues, "#10b981", "rgba(16, 185, 129, 0.2)")}
          {drawPolygon(aValues, "#f43f5e", "rgba(244, 63, 94, 0.2)")}
          
        </svg>
        <div className="mt-4 grid w-full grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          {domains.map((domain) => (
            <div key={domain.initials} className="flex min-w-0 items-start gap-2 text-slate-600">
              <span className="flex h-7 min-w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 px-1 text-[10px] font-bold text-white">{domain.initials}</span>
              <span className="break-words">{domain.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-blue-500" />C - Conhecimentos</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-emerald-500" />H - Habilidades</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-rose-500" />A - Atitudes</span>
        </div>
      </div>
    );
  };

  const ProportionalVenn = ({ data }: { data: CompetenceResult }) => {
    const indicators = [
      { label: 'Conhecimentos', value: data.cha.conhecimentos, color: '#3b82f6', fill: 'rgba(59, 130, 246, 0.42)' },
      { label: 'Habilidades', value: data.cha.habilidades, color: '#10b981', fill: 'rgba(16, 185, 129, 0.42)' },
      { label: 'Atitudes', value: data.cha.atitudes, color: '#f43f5e', fill: 'rgba(244, 63, 94, 0.42)' },
    ];
    const radius = (value: number) => 40 + Math.pow(Math.max(0, value) / 100, 2) * 52;

    return (
      <div className="w-full min-w-0">
        <svg viewBox="0 0 320 280" role="img" aria-label="Diagrama radial do equilíbrio entre conhecimentos, habilidades e atitudes; os círculos se sobrepõem e seu tamanho representa o percentual" className="mx-auto block w-full max-w-md">
          <circle cx="160" cy="100" r={radius(data.cha.conhecimentos)} fill={indicators[0].fill} stroke={indicators[0].color} strokeWidth="3" />
          <circle cx="125" cy="165" r={radius(data.cha.atitudes)} fill={indicators[2].fill} stroke={indicators[2].color} strokeWidth="3" />
          <circle cx="195" cy="165" r={radius(data.cha.habilidades)} fill={indicators[1].fill} stroke={indicators[1].color} strokeWidth="3" />
        </svg>
        <div className="mt-3 w-full space-y-2">
          {indicators.map((indicator) => (
            <div key={indicator.label} className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-700">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: indicator.color }} />
                <span className="break-words">{indicator.label}</span>
              </span>
              <span className="shrink-0 font-black text-slate-800">{Math.round(indicator.value)}%</span>
            </div>
          ))}
        </div>
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
          .map(([key, value]: [string, any]) => ({
            key,
            score: (value.c + value.h + value.a) / 3,
            area: categories.find(category => category.id === key)?.title || key,
          }))
          .sort((a, b) => a.score - b.score);

        const strongestAreas = [...sorted].reverse().slice(0, 2).map(item => item.area);
        const anchor = strongestAreas.join(' e ');
        
        const adviceMap: Record<string, string> = {
          physics: `Parta de ${anchor} para aprofundar o domínio conceitual em Física: escolha um conceito que você já ensina com segurança e conecte-o a um fenômeno novo, representando-o por uma explicação verbal, um esquema e uma situação-problema. Depois, avance para um tópico em que ainda tenha dúvidas e compare sua explicação com uma fonte didática confiável ou uma simulação. Registre quais ideias consegue explicar sem consulta e quais precisam de estudo adicional; use esse registro para planejar uma pequena sequência de revisão e testar se a explicação ficou clara para outra pessoa.`,
          informatics: `Use sua experiência em ${anchor} como ponto de apoio para desenvolver autonomia digital: escolha uma ferramenta que já faça parte da sua rotina de ensino e pratique uma tarefa técnica por vez, como organizar arquivos, ajustar permissões ou preparar uma apresentação interativa. Em seguida, simule um problema comum de uso e anote os passos para resolvê-lo sem depender de ajuda imediata. Repita o procedimento em outro dispositivo ou plataforma e mantenha um roteiro curto de consulta; essa prática transforma familiaridade em segurança para lidar com imprevistos durante a aula.`,
          management: `Aproveite ${anchor} para estruturar uma rotina tecnológica simples e sustentável: escolha uma turma ou unidade didática e organize materiais, links e atividades em um único ambiente virtual. Revise as permissões de acesso e evite incluir dados pessoais desnecessários dos alunos. Teste o percurso como se fosse um estudante, do acesso ao envio de uma atividade, e peça a alguém para identificar etapas confusas. Faça uma revisão semanal curta para manter os materiais atualizados e aplicar os mesmos cuidados de organização e privacidade nas próximas turmas.`,
          techPhysics: `Use ${anchor} como âncora para passar da compreensão ou do uso pontual da tecnologia a uma atividade de Física com dados observáveis. Selecione um fenômeno familiar, defina previamente o que os estudantes vão observar ou medir e escolha uma ferramenta disponível, como uma simulação, o Tracker ou o Phyphox. Primeiro teste a atividade sozinho e registre possíveis dificuldades técnicas; depois, conduza uma versão curta com os alunos, pedindo que comparem os dados com uma previsão. Ao final, avalie tanto a interpretação física quanto a qualidade das medições e ajuste o roteiro para a próxima aplicação.`,
          innovation: `A partir de ${anchor}, escolha uma necessidade real da sua prática e experimente uma tecnologia nova em escala pequena, sem substituir de imediato uma estratégia que já funciona. Por exemplo, use uma ferramenta de IA para criar perguntas de revisão e confira cada resposta antes de compartilhar com a turma. Compare o material gerado com seus objetivos de aprendizagem, peça aos alunos que identifiquem imprecisões e revise o conteúdo com eles. Registre o que economizou tempo, o que exigiu correção e como a ferramenta contribuiu para a aprendizagem; use essa avaliação para decidir se vale ampliar a experiência.`,
        };

        return sorted.slice(0, 2).map(({ key, area, score }) => ({
            area,
            score,
            strategy: adviceMap[key],
        }));
    };

    return (
      <div className="mx-auto mt-4 max-h-[calc(100dvh-5rem)] w-full max-w-6xl space-y-6 overflow-y-auto overscroll-contain px-3 pb-12 [scrollbar-gutter:stable] animate-in fade-in duration-700 sm:mt-8 sm:space-y-8 sm:px-4 sm:pb-20 print:max-h-none print:overflow-visible">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {onVoltar ? (
            <button 
              onClick={onVoltar} 
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-indigo-600 sm:w-auto"
            >
              ← Voltar ao Menu Principal
            </button>
          ) : <div></div>}

          <button 
            onClick={handleDownloadPdf}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black uppercase text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 sm:w-auto sm:px-6"
          >
            <Download className="w-5 h-5" />
            Salvar Relatório em PDF
          </button>
        </div>

        <div ref={relatorioRef} className="min-w-0 rounded-2xl bg-white p-4 sm:rounded-3xl sm:p-8 print:p-0">
          <div className="text-center mb-10">
            <Award className="mx-auto mb-4 h-12 w-12 text-indigo-600 sm:h-16 sm:w-16" />
            <h2 className="break-words text-xl font-black text-slate-900 sm:text-3xl">Diagnóstico de Competência Digital Docente</h2>
            <p className="text-slate-500 mt-1 text-lg">{finalData.level}</p>
          </div>

          <div className="mb-8 grid grid-cols-1 items-stretch gap-4 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl sm:gap-6 sm:p-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)] lg:rounded-3xl lg:p-8">
            <div className="flex min-w-0 flex-col justify-center rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <h3 className="mb-4 text-center text-xs font-black uppercase text-slate-500 sm:text-lg sm:tracking-widest">Análise por Domínio (CHA)</h3>
              <div className="flex-1 flex items-center justify-center">
                <MultiLayerRadarChart data={finalData} />
              </div>
            </div>
            
            <div className="flex min-w-0 flex-col">
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-slate-50 bg-white p-4 shadow-md sm:rounded-3xl sm:p-6">
                 <h3 className="mb-5 text-center text-xs font-black uppercase tracking-widest text-slate-500">Equilíbrio do CHA</h3>
                 <ProportionalVenn data={finalData} />
              </div>
            </div>
          </div>

            <div className="mb-8 grid grid-cols-1 gap-4 sm:gap-5">
              <div className="min-w-0 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex shrink-0 items-center gap-2 text-emerald-600 sm:w-52">
                      <TrendingUp className="w-5 h-5" />
                      <h4 className="font-black uppercase text-xs tracking-widest">Pontos Fortes</h4>
                  </div>
                <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                      {getStrengths().length > 0 ? getStrengths().map((s, i) => (
                    <div key={i} className="flex min-w-[180px] flex-1 items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-100/50 p-2.5 text-xs font-bold text-emerald-800">
                              <Star className="w-3.5 h-3.5 text-emerald-500 mt-0.5 fill-emerald-500 flex-shrink-0" />
                              {s}
                          </div>
                      )) : <p className="text-emerald-800 text-xs italic">Foque no CHA para descobrir seus potenciais latentes.</p>}
                  </div>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-rose-100 bg-rose-50 p-4 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex shrink-0 items-center gap-2 text-rose-600 sm:w-52">
                      <TrendingDown className="w-5 h-5" />
                      <h4 className="font-black uppercase text-xs tracking-widest">Pontos Fracos</h4>
                  </div>
                <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                      {getWeaknesses().length > 0 ? getWeaknesses().map((w, i) => (
                    <div key={i} className="flex min-w-[180px] flex-1 items-start gap-2 rounded-xl border border-rose-200 bg-rose-100/50 p-2.5 text-xs font-bold text-rose-800">
                              <Info className="w-3.5 h-3.5 text-rose-500 mt-0.5 flex-shrink-0" />
                              {w}
                          </div>
                      )) : <p className="text-rose-800 text-xs italic">Excelente equilíbrio! Nenhum ponto crítico identificado.</p>}
                  </div>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm sm:p-6 md:col-span-2 xl:col-span-1">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex shrink-0 items-center gap-2 text-amber-600 sm:w-52">
                      <Lightbulb className="w-5 h-5" />
                      <h4 className="font-black uppercase text-xs tracking-widest">Sugestões</h4>
                  </div>
                <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-2">
                      {getTrainingAdvice().map((a, i) => (
                    <div key={i} className="min-w-0 space-y-1.5 rounded-xl border border-amber-200 bg-amber-100/40 p-3">
                              <span className="text-[9px] font-black text-amber-600 uppercase bg-amber-200/50 px-2 py-0.5 rounded border border-amber-200 inline-block mb-1">{a.area}</span>
                              <p className="break-words text-xs font-medium leading-relaxed text-amber-900">{a.strategy}</p>
                          </div>
                      ))}
                  </div>
                </div>
              </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 text-slate-800 sm:p-8">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200">
                <Info className="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <h4 className="mb-2 text-base font-black sm:text-lg">Interpretação e Plano Estratégico</h4>
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