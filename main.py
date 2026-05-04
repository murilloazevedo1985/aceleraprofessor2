from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import chromadb
from chromadb.api.types import Documents, EmbeddingFunction, Embeddings
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pinecone import Pinecone

# --- CONFIGURAÇÕES ---
CHAVE_API_PINECONE = "pcsk_45MtAp_L8EKvhxjmroEujy1QDQ2xjHmvu8H17ZHnM8Pe6w68HVnyFGkeTqMjBnXzgVHUPu"
NOME_INDEX_PINECONE = "aulas-fisica"
CHAVE_API_GEMINI = "AIzaSyCnOZAYx_zjnFq1FkmanKZ4j0Ibw93n7Bc" # Não esqueça de colocar sua chave de volta!
genai.configure(api_key=CHAVE_API_GEMINI)

genai.configure(api_key=CHAVE_API_GEMINI)

# Conexão com o Pinecone na Nuvem
pc = Pinecone(api_key=CHAVE_API_PINECONE)
index = pc.Index(NOME_INDEX_PINECONE)
app = FastAPI()

# --- ADICIONE ESTE BLOCO PARA LIBERAR O REACT ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permite que qualquer porta acesse a API
    allow_credentials=True,
    allow_methods=["*"], # Permite POST, GET, etc.
    allow_headers=["*"],
)
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

@app.post("/gerar-plano")
async def gerar_plano(dados: PlanoRequest):
    try:
        print(f"\n🚀 Buscando '{dados.tema}' no Pinecone (Nuvem)...")
        
        # 1. Transforma o tema do professor em vetor (3072 dimensões)
        res_emb = genai.embed_content(
            model="models/gemini-embedding-2", # O mesmo que usamos na fábrica
            content=dados.tema,
            task_type="retrieval_query"
        )
        vetor_pergunta = res_emb['embedding']

        # 2. Busca no Pinecone os 5 trechos mais parecidos
        resultados = index.query(
            vector=vetor_pergunta,
            top_k=5,
            include_metadata=True # Para vir o texto original que salvamos
        )
        
        # Extrai os textos e as pontuações (scores)
        textos_encontrados = [match['metadata']['texto'] for match in resultados['matches']]
        scores = [match['score'] for match in resultados['matches']]

        print(f"🔍 Encontrados {len(textos_encontrados)} trechos.")
        print(f"📏 Scores de similaridade: {scores}")

        # --- NOVA BARREIRA DE FERRO ---
        # No Pinecone (Cosine), quanto MAIOR o score, MAIS parecido é.
        # 0.70 é uma excelente nota de corte para conteúdos de Física.
        NOTA_DE_CORTE = 0.70 
        
        if not textos_encontrados or scores[0] < NOTA_DE_CORTE:
            print("⛔ BLOQUEADO: Conteúdo não encontrado no material do Drive.")
            return {"erro_tema_nao_encontrado": "Desculpe, mas este tema não consta no material didático da nossa base de dados."}
        
        contexto_rag = "\n\n---\n\n".join(textos_encontrados)

        # 3. Prompt para o Gemini (Mantive a sua estrutura de JSON)
        prompt = f"""
        Você é um assistente educacional de Física. 
        Regra Absoluta: Baseie o plano EXCLUSIVAMENTE nos documentos fornecidos.
        
        Base de conhecimento:
        {contexto_rag}

        Dados da solicitação:
        - TEMA: {dados.tema}
        - TURMA: {dados.turma}
        - RECURSOS: {", ".join(dados.recursos)}

        Retorne o plano no formato JSON.
        Regra CRÍTICA de formatação: Para TODAS as fórmulas LaTeX, use barras duplas (por exemplo: "v_m = \\\\frac{\\\\Delta s}{\\\\Delta t}").
        """

        print("🧠 IA gerando plano final...")
        model = genai.GenerativeModel('gemini-2.0-flash')
        resposta = await model.generate_content_async(
            prompt, 
            generation_config={"response_mime_type": "application/json"}
        )
        
        plano_json = json.loads(resposta.text)
        
        # Limpeza final de segurança
        # Limpeza final de segurança (Agora blindada contra erros da IA)
        if "suggestedApp" in plano_json and isinstance(plano_json["suggestedApp"], dict):
            plano_json["suggestedApp"]["link"] = "" 
            
        if "youtubeVideo" in plano_json and isinstance(plano_json["youtubeVideo"], dict):
            plano_json["youtubeVideo"]["link"] = ""

        print("✅ Tudo pronto! Enviando para o professor.")
        return plano_json

    except Exception as e:
        print(f"❌ Erro na Rota: {e}")
        raise HTTPException(status_code=500, detail=str(e))