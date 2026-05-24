from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import json
import re
import os
from dotenv import load_dotenv
from googlesearch import search
from pinecone import Pinecone
from duckduckgo_search import DDGS

# --- SOLUÇÃO ROBUSTA PARA ENCONTRAR O .ENV ---
# Constrói o caminho absoluto para o arquivo .env na mesma pasta do script
caminho_env = os.path.join(os.path.dirname(__file__), '.env')

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv(dotenv_path=caminho_env)

# --- CONFIGURAÇÕES ---
# RECOMENDAÇÃO DE SEGURANÇA: Use variáveis de ambiente para suas chaves!
CHAVE_API_PINECONE = os.getenv("PINECONE_API_KEY") 
NOME_INDEX_PINECONE = "aulas-fisica"
CHAVE_API_GEMINI = os.getenv("GEMINI_API_KEY")

if not CHAVE_API_PINECONE:
    raise ValueError("A variável de ambiente PINECONE_API_KEY não foi definida.")
if not CHAVE_API_GEMINI:
    raise ValueError("A variável de ambiente GEMINI_API_KEY não foi definida.")

genai.configure(api_key=CHAVE_API_GEMINI)

# Conexão com o Pinecone na Nuvem
print("🔌 Conectando ao Pinecone...")
pc = Pinecone(api_key=CHAVE_API_PINECONE)
index = pc.Index(NOME_INDEX_PINECONE)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permite que qualquer porta acesse a API
    allow_credentials=True,
    allow_methods=["*"], # Permite POST, GET, etc.
    allow_headers=["*"],
)

# --- MODELOS DE ENTRADA ---
class PerguntaRequest(BaseModel):
    mensagem: str
    fenomeno: str

class PlanoRequest(BaseModel):
    tema: str
    turma: str
    recursos: list[str]

@app.post("/perguntar")
async def perguntar(dados: PerguntaRequest):
    # Lógica do RAG (simulada)
    resposta_ia = f"Esta é a explicação gerada pela IA para '{dados.mensagem}' sobre '{dados.fenomeno}'..."

    # Lógica do Agente Cognitivo: Busca Automática do Link
    link_direto = None
    query = f"site:phet.colorado.edu OR site:ophysics.com OR site:vascak.cz simulação {dados.fenomeno}"
    try:
        resultados = list(search(query, num=1, stop=1, pause=2))
        if resultados:
            link_direto = resultados[0]
    except Exception as e:
        print(f"Erro na busca silenciosa: {e}")
        link_direto = None

    return {"resposta": resposta_ia, "link_direto": link_direto}

@app.post("/gerar-plano")
async def gerar_plano(dados: PlanoRequest):
    try:
        print(f"\n🚀 Buscando '{dados.tema}' no Pinecone (Nuvem)...")
        
        # 1. Transforma o tema do professor em vetor
        res_emb = await genai.embed_content_async(
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
        NOTA_DE_CORTE = 0.65 
        
        if not textos_encontrados or scores[0] < NOTA_DE_CORTE:
            print("⛔ BLOQUEADO: Conteúdo não encontrado no material do Drive.")
            return {"erro_tema_nao_encontrado": "Desculpe, mas este tema não consta no material didático da nossa base de dados."}
        
        contexto_rag = "\n\n---\n\n".join(textos_encontrados)

        # 3. Prompt Unificado para o Gemini
        prompt = f"""
        [PAPEL] Você é um especialista em Ensino de Física com vasta experiência em didática, metodologias ativas, IA e atividades experimentais.
        Sua tarefa é retornar uma Estratégia Pedagógica no formato JSON.
        Regra Absoluta: Baseie o plano EXCLUSIVAMENTE nos documentos fornecidos na base de conhecimento.
        Contexto - O professor precisa de uma estratégia pedagógica baseada estritamente nestes materiais de referência do nosso banco de dados:
        TAREFA - Elabore uma estratégia pedagógica completa e engajadora para ensinar o tema "{dados.tema}", estruturando a resposta com objetivos, materiais, introdução, teoria, atividade prática e avaliação.
        
        RESTRIÇÕES:
        - Não use explicações teóricas densas sem antes dar um exemplo prático do dia a dia.
        - Baseie-se APENAS no contexto fornecido.
        - DIVERSIDADE DE SIMULAÇÕES: Ao preencher o campo "simulacaoSugerida", não sugira apenas o PhET Colorado. Sugira o título exato de uma simulação real priorizando a plataforma mais adequada para o tema:
            * Falstad (excelente para Circuitos Elétricos, Ondas e Matemática)
            * Vascak ou SimuFisica (excelentes para Óptica, Eletromagnetismo e Física Moderna)
            * Walter Fendt (excelente para Mecânica, Dinâmica e Cinemática)
            * Physics Classroom, CK-12 ou Univ-lemans (excelentes para interações gerais)
            * PhET Colorado (use como complemento geral)

        [BASE DE CONHECIMENTO]
        ...
        {contexto_rag}

        [DADOS DA SOLICITAÇÃO]
        - TEMA: {dados.tema}
        - TURMA: {dados.turma}
        - RECURSOS: {", ".join(dados.recursos)}

        [REGRAS DE FORMATAÇÃO]
        1. **Estrutura JSON:** O JSON deve seguir exatamente esta estrutura, preenchendo TODOS os campos.
        ```json
        {{
          "title": "Título da Aula sobre {dados.tema}",
          "methodology": "Metodologia Principal (Ex: Aprendizagem Baseada em Problemas)",
          "duration": "Duração Total (Ex: 90 min)",
          "learningObjectives": ["Objetivo 1", "Objetivo 2"],
          "requiredMaterials": ["Material 1", "Material 2"],
          "steps": [
            {{
              "time": "Tempo em min",
              "title": "Título do Passo",
              "description": "Descrição detalhada do passo. Use exemplos práticos do dia a dia antes de teorias densas.",
              "teacherRole": "Ação específica do docente neste passo.",
              "studentRole": "Ação específica do estudante neste passo."
            }}
          ],
          "simulacaoSugerida": {{
            "titulo": "Título amigável para o professor ver na tela (ex: 'Gráficos de Posição, Velocidade e Aceleração')",
            "termoBusca": "Apenas 2 ou 3 palavras-chave em minúsculo para o buscador encontrar o site correto (ex: 'fendt aceleracao' ou 'simufisica optica' ou 'falstad circuitos')"
          }},
          "videoYoutube": {{
            "titulo": "Título descritivo do vídeo (ex: 'Leis de Newton por Walter Lewin')"
          }}
        }}
        
        2. **Fórmulas LaTeX (Regra Crítica):** Para TODAS as fórmulas, use a sintaxe LaTeX dentro de delimitadores de cifrão. Use um cifrão de cada lado para fórmulas no meio do texto (ex: $v_m = \frac{{\Delta s}}{{\Delta t}}$) e dois cifrões para fórmulas em uma linha separada (ex: $$E=mc^2$$). Esta regra é essencial para a renderização correta no frontend.
        """
        print("🧠 IA gerando plano final...")
        model = genai.GenerativeModel('gemini-2.0-flash') # Using the latest flash model
        resposta = await model.generate_content_async(
            prompt, 
            generation_config={"response_mime_type": "application/json"}
        )
        
        # Pré-processa o texto da resposta para escapar backslashes do LaTeX
        processed_text = re.sub(r'(?<!\\)\\(?!["\\/bfnrtu])', r'\\\\', resposta.text)
        plano_json = json.loads(processed_text)
        
        # --- CORREÇÃO DO BUG (A trava de segurança) ---
        if isinstance(plano_json, list):
            if len(plano_json) > 0:
                plano_json = plano_json[0]
            else:
                plano_json = {}
        # ----------------------------------------------
        # --- BUSCA CIRÚRGICA DE LINKS DIRETOS (DUCKDUCKGO SITE-TARGET) ---
        if "simulacaoSugerida" not in plano_json or not plano_json["simulacaoSugerida"]:
            plano_json["simulacaoSugerida"] = None
        else:
            titulo_sim = plano_json["simulacaoSugerida"].get("titulo", "")
            termo_busca = plano_json["simulacaoSugerida"].get("termoBusca", "")
            
            # Garante que temos um termo de busca limpo
            if not termo_busca:
                titulo_limpo = re.sub(r'[-():"\'\[\]]', ' ', titulo_sim)
                termo_busca = " ".join(titulo_limpo.split()[:2])
            
            # 1. Identifica qual é o site VIP alvo com base no título gerado pela IA
            texto_analise = (titulo_sim + " " + termo_busca).lower()
            dominio_alvo = None
            link_fallback_urgente = "https://phet.colorado.edu/pt_BR/" # Fallback geral se tudo sumir
            
            if "fendt" in texto_analise or "walter" in texto_analise:
                dominio_alvo = "walter-fendt.de"
                link_fallback_urgente = "https://www.walter-fendt.de/html5/phbr/"
            elif "phet" in texto_analise:
                dominio_alvo = "phet.colorado.edu"
                link_fallback_urgente = "https://phet.colorado.edu/pt_BR/simulations/filter?type=html5"
            elif "vascak" in texto_analise:
                dominio_alvo = "vascak.cz"
                link_fallback_urgente = "https://www.vascak.cz/physicsanimations.php?l=pt"
            elif "simufisica" in texto_analise:
                dominio_alvo = "simufisica.com"
                link_fallback_urgente = "https://simufisica.com/"
            elif "falstad" in texto_analise:
                dominio_alvo = "falstad.com"
                link_fallback_urgente = "https://falstad.com/mathphysics.html"
            elif "lemans" in texto_analise:
                dominio_alvo = "univ-lemans.fr"
                link_fallback_urgente = "http://ressources.univ-lemans.fr/AccesLibre/UM/Pedago/physique/02/index.html"
            elif "ck12" in texto_analise or "ck-12" in texto_analise:
                dominio_alvo = "interactives.ck12.org"
                link_fallback_urgente = "https://interactives.ck12.org/simulations/physics.html"
            elif "classroom" in texto_analise or "physicsclassroom" in texto_analise:
                dominio_alvo = "physicsclassroom.com"
                link_fallback_urgente = "https://www.physicsclassroom.com/interactive-physics"

            # 2. Monta a Query Inteligente para o DuckDuckGo
            # Se o domínio for walter-fendt.de e o termo for cinemática, vira: "site:walter-fendt.de cinemática"
            if dominio_alvo:
                query_sim = f"site:{dominio_alvo} {termo_busca}"
            else:
                query_sim = f"{termo_busca} simulação física"
                
            print(f"🔎 Varrendo o site {dominio_alvo or 'Web'} atrás de: '{termo_busca}'")
            
            link_final = None
            
            # 3. Executa a busca exata no DuckDuckGo
            try:
                with DDGS() as ddgs:
                    resultados_sim = list(ddgs.text(query_sim, max_results=3))
                    
                    if resultados_sim:
                        # Captura o primeiríssimo link retornado dentro daquele site
                        link_final = resultados_sim[0].get('href', '')
                        print(f"🌟 LINK DIRETO EXTRAÍDO COM SUCESSO: {link_final}")
            except Exception as e:
                print(f"⚠️ DuckDuckGo recusou a conexão ou deu timeout: {e}")

            # 4. Proteção Extrema: Se o DDGS falhar por bloqueio de IP/Bot, usa o diretório do site
            if not link_final:
                print("🔄 DDGS bloqueado temporariamente por IP. Aplicando link direto do diretório VIP.")
                link_final = link_fallback_urgente
            
            # Injeta o link direto (ou do diretório) para o Card do Frontend ler
            plano_json["simulacaoSugerida"]["url"] = link_final
                    
        if "videoYoutube" not in plano_json:
            plano_json["videoYoutube"] = None

        print("✅ Tudo pronto! Enviando para o professor.")
        return plano_json
    except Exception as e:
        print(f"Erro ao gerar plano: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao gerar plano.")