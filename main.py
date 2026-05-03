from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import chromadb
from chromadb.api.types import Documents, EmbeddingFunction, Embeddings
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from construir_banco import construir_banco

app = FastAPI()

# --- ADICIONE ESTE BLOCO PARA LIBERAR O REACT ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permite que qualquer porta acesse a API
    allow_credentials=True,
    allow_methods=["*"], # Permite POST, GET, etc.
    allow_headers=["*"],
)
# ------------------------------------------------

# --- 2. CONFIGURAÇÕES E CREDENCIAIS ---
CHAVE_API_GEMINI = "AIzaSyCnOZAYx_zjnFq1FkmanKZ4j0Ibw93n7Bc" # Não esqueça de colocar sua chave de volta!
genai.configure(api_key=CHAVE_API_GEMINI)

# --- 3. CONEXÃO COM O BANCO DE DADOS LOCAL (CHROMADB) ---
class GeminiEmbeddingFunction(EmbeddingFunction):
    def __call__(self, input: Documents) -> Embeddings:
        embeddings = []
        for text in input:
            resposta = genai.embed_content(
                model="models/gemini-embedding-2", # Modelo de embedding mais recente e recomendado
                content=text,
                task_type="retrieval_document"
            )
            embeddings.append(resposta['embedding'])
        return embeddings

print("⚙️ Conectando ao Banco de Dados Local...")
cliente_chroma = chromadb.PersistentClient(path="./meu_banco_vetorial")
funcao_gemini = GeminiEmbeddingFunction()

try:
    colecao = cliente_chroma.get_or_create_collection(
        name="aulas_fisica",
        embedding_function=funcao_gemini
    )
    print("✅ Banco de Dados conectado com sucesso!")
except Exception as e:
    print(f"❌ Erro ao conectar no banco: {e}")

# --- 4. MODELO DE ENTRADA ---
class PlanoRequest(BaseModel):
    tema: str
    turma: str
    recursos: list[str]

# --- 5. ROTA SUPER RÁPIDA DE GERAÇÃO ---
@app.post("/gerar-plano")
async def gerar_plano(dados: PlanoRequest):
    try:
        print(f"\n🚀 Buscando '{dados.tema}' no Banco de Dados...")
        
        # 1. Busca os 5 parágrafos mais relevantes no banco local
        resultados = colecao.query(
            query_texts=[dados.tema],
            n_results=5 
        )
        
        textos_encontrados = resultados['documents'][0] if resultados['documents'] else []
        distancias = resultados['distances'][0] if 'distances' in resultados and resultados['distances'] else []

        # --- DIAGNÓSTICO E BARREIRA DE FERRO ---
        print(f"🔍 Encontrados {len(textos_encontrados)} trechos.")
        print(f"📏 Distâncias de similaridade: {distancias}")
        print("   (Atenção: No ChromaDB, quanto MENOR o número, MAIS parecido é com o tema)")

        # LIMITE DE CORTE: Define o quão rigoroso o sistema será.
        # Geralmente, distâncias acima de 0.65 (ou 0.7) significam que o assunto não tem nada a ver.
        NOTA_DE_CORTE = 0.70 
        
        if len(textos_encontrados) == 0 or (distancias and distancias[0] > NOTA_DE_CORTE):
            print("⛔ BLOQUEADO PELO PYTHON: O tema não existe na pasta ou a distância é muito alta!")
            # Devolve o erro direto para o React, sem gastar com a IA!
            return {"erro_tema_nao_encontrado": "Desculpe, mas este tema não consta no material didático da nossa base de dados. Por favor, escolha um tema disponível."}
        
        print("✅ Tema validado na pasta! Preparando dados para a IA...")
        contexto_rag = "\n\n---\n\n".join(textos_encontrados)

        # 2. Configura o Prompt (Simplificado para focar na formatação)
        prompt = f"""
        Você é um assistente educacional de Física. 
Regra Absoluta: Você DEVE basear o plano de aula EXCLUSIVAMENTE nos documentos fornecidos na sua base de conhecimento (pasta). 
Se o usuário pedir um tema que NÃO está presente nos documentos fornecidos, você NÃO deve gerar o plano de aula.
Nesse caso, você deve retornar APENAS o seguinte JSON exato e nada mais:
        IMPORTANTE: Você deve retornar o plano de aula em um formato JSON estrito.
        Utilize EXATAMENTE as seguintes chaves em inglês, preenchendo os conteúdos em português:
        {{
            "title": "Título da Aula",
            "methodology": "Ex: Aula Expositiva e Prática",
            "duration": "Ex: 90 minutos",
            "learningObjectives": [
                "Objetivo 1",
                "Objetivo 2"
            ],
            "requiredMaterials": [
                "Material 1",
                "Material 2"
            ],
            "steps": [
                {{
                    "time": "15 min",
                    "title": "Nome da Etapa",
                    "description": "Descrição detalhada do que vai acontecer.",
                    "teacherRole": "Ação do professor nesta etapa",
                    "studentRole": "Ação do aluno nesta etapa"
                }}
            ],
            "suggestedApp": {{
                "name": "Nome de um app ou simulador",
                "description": "Para que serve",
                "link": "Link se houver"
            }},
            "youtubeVideo": {{
                "title": "Título de um vídeo sugerido",
                "channel": "Canal do YouTube",
                "description": "Por que assistir"
            }}
        }}
   

{{
  "erro_tema_nao_encontrado": "Desculpe, mas este tema não consta no material didático da nossa base de dados. Por favor, escolha um tema disponível."
}}
"
        Base de conhecimento:
        {contexto_rag}

        O usuário solicitou um plano de aula com os seguintes dados:
        - TEMA: {dados.tema}
        - TURMA: {dados.turma}
        - RECURSOS DISPONÍVEIS: {", ".join(dados.recursos)}

        Crie o plano de aula em JSON seguindo estas regras rigorosas:
        1. Use LaTeX para fórmulas, mas com a barra invertida DUPLICADA (ex: $E=mc^2$ ou $F = \\frac{{G m_1 m_2}}{{r^2}}$).
        2. Use emojis para destacar pontos e NUNCA use asteriscos para negrito.
        3. No campo 'link' de vídeos e apps, deixe sempre VAZIO "".
        
        RETORNE APENAS O JSON PURO correspondente à estrutura de LessonPlanResponse.
        """

        print("🧠 Gerando plano com o Gemini...")
        model = genai.GenerativeModel('gemini-2.0-flash')
        resposta = await model.generate_content_async(prompt, generation_config={"response_mime_type": "application/json"})
        
        plano_json = json.loads(resposta.text)

        # 3. Limpeza de links
        if "suggestedApp" in plano_json:
            plano_json["suggestedApp"]["link"] = "" 
        if "youtubeVideo" in plano_json:
            plano_json["youtubeVideo"]["link"] = ""
            
@app.get("/atualizar-materiais")
async def atualizar():
    try:
        print("🚀 Iniciando sincronização com o Google Drive...")
        construir_banco()
        return {"status": "sucesso", "mensagem": "O banco de dados foi atualizado com os materiais do Drive!"}
    except Exception as e:
        return {"status": "erro", "detalhes": str(e)}

        print("✅ Plano gerado e enviado ao React!")
        return plano_json

    except Exception as e:
        print(f"❌ Erro na Rota: {e}")
        raise HTTPException(status_code=500, detail=str(e))