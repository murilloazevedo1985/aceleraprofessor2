
export enum TargetAudience {
  ENSINO_MEDIO_1 = "Ensino Médio (1º Ano)",
  ENSINO_MEDIO_2 = "Ensino Médio (2º Ano)",
  ENSINO_MEDIO_3 = "Ensino Médio (3º Ano)",
  FUNDAMENTAL_9 = "9º Ano (Ensino Fundamental)",
  EJA = "EJA (Educação de Jovens e Adultos)",
  CIENCIAS_BASICA = "Ciências para Educação Básica",
  ENEM = "Preparatório ENEM/Vestibular"
}

export enum ClassSize {
  SMALL = "0 a 10 alunos",
  MEDIUM = "10 a 25 alunos",
  LARGE = "25 a 40 alunos",
  EXTRA_LARGE = "Mais de 40 alunos"
}

export const ITResourcesOptions = [
  "Nenhum recurso digital",
  "Acesso à Internet Wi-Fi",
  "Computador do Professor",
  "Projetor / TV",
  "Celulares dos Alunos",
  "Laboratório de Informática",
  "Tablets Compartilhados",
  "Simuladores (PhET, etc)",
];

export enum LabAccess {
  NONE = "Sem acesso a laboratório",
  DEMO_ONLY = "Apenas bancada de demonstração",
  LIMITED_LAB = "Laboratório com poucos experimentos e ferramentas",
  FULL_LAB = "Laboratório de Física completo",
  MAKER_SPACE = "Espaço Maker / FabLab"
}

export const LabAccessOptions = [
  LabAccess.NONE,
  LabAccess.DEMO_ONLY,
  LabAccess.LIMITED_LAB,
  LabAccess.FULL_LAB,
  LabAccess.MAKER_SPACE
];

export const EverydayMaterialsOptions = [
  "Nenhum material extra",
  "Papelaria básica (papel, tesoura, cola)",
  "Materiais recicláveis (PET, papelão)",
  "Itens de cozinha (copos, pratos, água, óleo, talheres)",
  "Ferramentas simples (régua, trena, cronometro do celular)",
  "Instrumentos de laboratório (balança, termômetro, multímetro)",
  "Ferramentas Gerais (serra, Martelo, chave de fenda, alicate)",
  "Ferramentas específicas (corta laser, impressão 3D)",
  "Bolas (gude, ping-pong, tennis, futebol)",
  "Elásticos e Molas"
];

export interface PhysicsCategory {
  name: string;
  topics: string[];
}

export const PhysicsCategories: PhysicsCategory[] = [
  {
    name: "Mecânica",
    topics: [
      "Cinemática (MRU/MRUV)",
      "Dinâmica (Leis de Newton)",
      "Trabalho e Energia",
      "Impulso e Quantidade de Movimento",
      "Gravitação Universal",
      "Estática e Hidrostática",
      "Astronomia"
    ]
  },
  {
    name: "Termologia",
    topics: [
      "Termometria e Dilatação",
      "Calorimetria",
      "Termodinâmica"
    ]
  },
  {
    name: "Óptica e Ondas",
    topics: [
      "Óptica Geométrica",
      "Óptica Física",
      "Fenômenos Ondulatórios",
      "Acústica"
    ]
  },
  {
    name: "Eletromagnetismo",
    topics: [
      "Eletrostática",
      "Eletrodinâmica (Circuitos)",
      "Magnetismo e Indução"
    ]
  },
  {
    name: "Física Moderna",
    topics: [
      "Relatividade Restrita",
      "Física Quântica e Fotóns",
      "Física Nuclear"
    ]
  },
  {
    name: "Física Computacional (Java)",
    topics: [
      "Simulação de MRU/MRUV em Java",
      "Lógica de Colisões Elásticas em Java",
      "POO aplicada a Circuitos Elétricos",
      "Método de Euler para Lançamento de Projéteis",
      "Visualização de Vetores com Java Swing/FX"
    ]
  }
];

export enum WorkflowMode {
  STRATEGY = "Estratégia Pedagógica",
  EXERCISES = "Lista de Exercícios",
  COMPETENCE = "Autoavaliação de competencias"
}

export interface UploadedFile {
  name: string;
  mimeType: string;
  data: string;
}

export interface AudioNote {
  data: string;
  mimeType: string;
}

export interface TeacherInput {
  teacherExperience: string;
  targetAudience: string;
  topic: string; 
  classSize: string;
  itResources: string[];
  labAccess: string;
  everydayMaterials: string[];
  initialIdea: string;
  exerciseCount: number;
  contextFiles: UploadedFile[];
  audioNote?: AudioNote;
}

export interface LessonStep {
  time: string;
  title: string;
  description: string;
  teacherRole: string;
  studentRole: string;
  javaSnippet?: string; // Fragmento de código Java para a aula
}

export interface SuggestedApp {
  name: string;
  description: string;
  url: string;
}

export interface YoutubeSuggestion {
  title: string;
  channelName: string;
  description: string;
}

export interface LessonPlanResponse {
  [x: string]: any;
  simulacaoPhet: any;
  title: string;
  theme: string;
  duration: string;
  bnccFocus: string;
  learningObjectives: string[];
  requiredMaterials: string[];
  methodology: string;
  steps: LessonStep[];
  discussionTopics: string[];
  assessment: string;
  adaptationTips: string;
  suggestedApp: SuggestedApp;
  youtubeVideo: YoutubeSuggestion;
  visualImagePrompt: string;
  javaFullCode?: string; // Código Java completo se aplicável
  visualAnimationPrompt?: string;
  errorMsg?: string;
}

export enum Difficulty {
  EASY = "Fácil",
  MEDIUM = "Médio",
  HARD = "Difícil"
}

export interface Exercise {
  id: string;
  difficulty: Difficulty;
  question: string;
  solution: string;
  correctAnswer: string;
  javaTemplate?: string; // Template Java para exercício de programação
  visualDescription?: string;
}

export interface ExerciseListResponse {
  title: string;
  topic: string;
  exercises: Exercise[];
  suggestedApp: SuggestedApp;
  youtubeVideo?: YoutubeSuggestion;
  errorMsg?: string;
}

export interface CompetenceResult {
  detail: {
    physics: { c: number, h: number, a: number },
    informatics: { c: number, h: number, a: number },
    management: { c: number, h: number, a: number },
    techPhysics: { c: number, h: number, a: number },
    innovation: { c: number, h: number, a: number }
  };
  cha: {
    conhecimentos: number;
    habilidades: number;
    atitudes: number;
  };
  total: number;
  level: string;
}
