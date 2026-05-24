import { GoogleGenAI, Type } from "@google/genai";
import { TeacherInput, LessonPlanResponse, ExerciseListResponse, Difficulty } from "../types";

const DATABASE_URL = "https://drive.google.com/drive/folders/1VyvRmSaqfhmgjgFVdvreti5rtT2extEX?usp=drive_link";

// 🔥 SUA LISTA DE SITES DE CONFIANÇA AQUI 🔥
const TRUSTED_SITES = [
  "https://fisicaevestibular.com.br/",
  "https://fisicapaidegua.blogspot.com/",
  "https://inaesp.org/ENSINO/",
  "https://sites.google.com/view/dougfisica/halliday-volume-1"
];

// Instrução do sistema atualizada com os seus sites fixos
const commonSystemInstruction = `
  Você é o "Agente de IA (Cérebro)" para o aplicativo "Fisica para o professor".
  
  DIRETRIZ DE ACESSO A FONTES (MUITO IMPORTANTE):
  1. Baseie-se primordialmente na pasta "Agente de IA (Cérebro)" no Drive: ${DATABASE_URL}.
  2. EXTENSÃO PERMITIDA: Você ESTÁ AUTORIZADO e encorajado a complementar as informações, buscar exercícios e referências EXCLUSIVAMENTE nestes sites de confiança pré-aprovados pelo professor:
  ${TRUSTED_SITES.map(site => `- ${site}`).join("\n  ")}
  
  Caso a informação solicitada (tópico de física, experimento, exercício ou lógica Java) NÃO esteja dentro da pasta referenciada E também não possa ser encontrada nos sites de confiança listados acima, você DEVE responder EXCLUSIVAMENTE:
  "desculpe nosso bando de dados não possui as informações solicitadas"
  
  NÃO retorne resposta alguma caso o contexto da pasta ou dos sites aprovados seja pobre ou inexistente para o tema.
  
  FOCO EM PROGRAMAÇÃO JAVA:
  Se o professor solicitar tópicos de "Física Computacional (Java)", gere código Java (JDK 17+) que seja didático, comentado e focado em simular o fenômeno físico em questão. Use POO sempre que possível.
  
  FORMATO:
  - Responda sempre em Português (Brasil).
  - Use LaTeX para fórmulas físicas com escape duplo no JSON: "\\\\frac{v}{t}".
  - REGRA PARA QUADROS: Não use o formato Markdown de tabelas (com barras verticais |), pois isso quebra a renderização. Organize quadros e tabelas usando texto simples com tópicos e espaçamentos claros.
  - Responda em JSON conforme o schema.
`;

export const generateLessonPlan = async (input: TeacherInput): Promise<LessonPlanResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const formatList = (list: string[]) => list && list.length > 0 ? list.join(", ") : "Nenhum selecionado";

  const textPrompt = `
    Solicitação do Professor:
    - Conteúdo: ${input.topic}
    - Nível de Experiência: ${input.teacherExperience}
    - Ideia Inicial: ${input.initialIdea}
    - Recursos de TI: ${formatList(input.itResources)}
    
    Arquivos no Contexto Atual: ${input.contextFiles.map(f => f.name).join(", ")}

    TAREFA: Gere um Estratégia Pedagógica Pedagógico fundamentado na pasta 'Cérebro' e nos Sites de Confiança. Se o tópico for Java, inclua snippets de código Java didáticos nos passos da aula. Sempre que usar informações de um dos sites aprovados, cite-o brevemente.
  `;

  const parts: any[] = [{ text: textPrompt }];
  input.contextFiles.forEach(file => parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } }));
  if (input.audioNote) parts.push({ inlineData: { mimeType: input.audioNote.mimeType, data: input.audioNote.data } });

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: { parts: parts },
    config: {
      temperature: 0.2, // 🔥 ADICIONE ISTO PARA TRAVAR O FORMATO
      systemInstruction: commonSystemInstruction + " Responda em JSON.",
      responseMimeType: "application/json",
      // ... MANTENHA O SEU responseSchema INTACTO AQUI ...
    }
  });

  const data = JSON.parse(response.text || "{}");
  if (data.errorMsg && data.errorMsg.includes("desculpe")) {
    return { title: "Erro de Contexto", errorMsg: data.errorMsg } as any;
  }
  return data as LessonPlanResponse;
};

export const generateExerciseList = async (input: TeacherInput): Promise<ExerciseListResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const textPrompt = `Gere uma lista de ${input.exerciseCount} exercícios baseada na pasta 'Cérebro' e nos Sites de Confiança listados nas suas instruções. Tópico: ${input.topic}. Se o tópico for Java, inclua 'javaTemplate' em cada questão para que o aluno complete o código. Privilegie exercícios extraídos ou inspirados no site do Halliday ou no Física e Vestibular, se aplicável.`;
  
  const parts: any[] = [{ text: textPrompt }];
  input.contextFiles.forEach(file => parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } }));
  if (input.audioNote) parts.push({ inlineData: { mimeType: input.audioNote.mimeType, data: input.audioNote.data } });

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: { parts: parts },
    config: {
      systemInstruction: commonSystemInstruction + " Responda em JSON.",
      responseMimeType: "application/json",
      // ... MANTENHA O SEU responseSchema INTACTO AQUI ...
    }
  });
  
  const data = JSON.parse(response.text || "{}");
  if (data.errorMsg && data.errorMsg.includes("desculpe")) {
    return { title: "Erro de Contexto", errorMsg: data.errorMsg } as any;
  }
  return data as ExerciseListResponse;
};

// ... Mantenha as funções de Imagem e SVG idênticas ...