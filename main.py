from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
import google.generativeai as genai
import json
import re
import os
from dotenv import load_dotenv
from googlesearch import search
from pinecone import Pinecone
import mimetypes 
from duckduckgo_search import DDGS
from pdf2image import convert_from_path
import google.generativeai as genai

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
    fenomeno: str | None = None
    turma: str
    recursos: list[str]
    observacoes: str | None = None
    tom_abordagem: str | None = None # NOVO CAMPO PARA O TOM

@app.post("/perguntar")
async def perguntar(dados: PerguntaRequest):
    # Lógica do RAG (simulada)
    resposta_ia = f"Esta é a explicação gerada pela IA para '{dados.mensagem}' sobre '{dados.fenomeno}'..."

    # Lógica do Agente Cognitivo: Busca Automática do Link
    link_direto = None
    query = f"site:phet.colorado.edu OR site:ophysics.com OR site:vascak.cz simulação {dados.fenomeno}"
    
    # --- OTIMIZAÇÃO DE PERFORMANCE ---
    # A biblioteca 'googlesearch' é síncrona (bloqueante).
    # Usamos run_in_threadpool para executá-la em uma thread separada,
    # não bloqueando o event loop principal do FastAPI.
    try:
        # A função search é passada como um callable, e seus argumentos em seguida.
        resultados = await run_in_threadpool(list, search(query, num=1, stop=1, pause=2))
        if resultados:
            link_direto = resultados[0]
    except Exception as e:
        print(f"Erro na busca silenciosa: {e}")

    return {"resposta": resposta_ia, "link_direto": link_direto}
def extrair_texto_de_pdf_com_visao(caminho_pdf):
    print(f"📸 Convertendo páginas do PDF em imagens para análise visual...")
    # Converte apenas as primeiras páginas ou o livro todo (cuidado com o limite de tokens)
    paginas = convert_from_path(caminho_pdf, dpi=150)
    
    model = genai.GenerativeModel('gemini-1.5-flash')
    texto_completo_extraido = ""
    
    for i, pagina in enumerate(paginas):
        print(f"👁️ Analisando visualmente a página {i+1}...")
        # Salva temporariamente a página como imagem
        caminho_imagem = f"temp_pagina_{i}.png"
        pagina.save(caminho_imagem, 'PNG')
        
        # Envia para o Gemini ler a imagem e extrair inclusive as fórmulas em LaTeX
        imagem_upload = genai.upload_file(path=caminho_imagem)
        
        prompt = """
        Transcreva o conteúdo desta página de livro de física para Markdown.
        Converta todas as fórmulas matemáticas e físicas para a notação LaTeX apropriada usando $ ou $$.
        """
        
        response = model.generate_content([prompt, imagem_upload])
        texto_completo_extraido += response.text + "\n"
        
        # Limpa o arquivo temporário
        import os
        os.remove(caminho_imagem)
        
    return texto_completo_extraido

@app.post("/extrair-latex-imagem")
async def extrair_latex_imagem(file: UploadFile = File(...)):
    try:
        print(f"\n📄 Recebendo imagem '{file.filename}' para extração de LaTeX...")

        # 1. Lê os bytes da imagem enviada
        image_bytes = await file.read()

        # 2. Faz o upload do arquivo para o Gemini
        # O SDK do Gemini precisa do tipo MIME para processar o arquivo corretamente.
        mime_type, _ = mimetypes.guess_type(file.filename)
        if not mime_type:
            mime_type = "application/octet-stream" # Fallback

        imagem_pagina = genai.upload_file(
            path=image_bytes,
            display_name=file.filename,
            mime_type=mime_type
        )
        print(f"✅ Imagem '{file.filename}' enviada para a IA.")

        # 3. Usa o prompt cirúrgico para extração
        prompt = """
        Você é um extrator de documentos científicos de alta precisão. 
        Transcreva o conteúdo desta página do livro didático para Markdown.
        REGRA CRUCIAL: Se encontrar qualquer fórmula, equação ou gráfico matemático (mesmo que seja uma imagem/figura), 
        converta-o INTEGRALMENTE para a notação LaTeX apropriada usando $ para equações na linha ou $$ para equações isoladas.
        Não pule nenhuma fórmula.
        """

        # 4. Gera o conteúdo usando o modelo multimodal
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = await model.generate_content_async([prompt, imagem_pagina])

        print("✅ Conteúdo extraído com sucesso!")
        return {"texto_extraido": response.text}

    except Exception as e:
        print(f"❌ Erro ao extrair conteúdo da imagem: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao processar imagem: {e}")

@app.post("/gerar-plano")
async def gerar_plano(dados: PlanoRequest):
    try:
        # Combina tema e fenômeno para uma busca mais precisa
        texto_busca = f"{dados.tema} - {dados.fenomeno}" if dados.fenomeno else dados.tema
        print(f"\n🚀 Buscando por: '{texto_busca}' no Pinecone (Nuvem)...")
        
        # 1. Transforma o tema do professor em vetor
        res_emb = await genai.embed_content_async(
            model="models/gemini-embedding-2", # O mesmo que usamos na fábrica
            content=texto_busca,
            task_type="retrieval_query"
        )
        vetor_pergunta = res_emb['embedding']

        # 2. --- OTIMIZAÇÃO DE PERFORMANCE ---
        # A biblioteca do Pinecone é síncrona (bloqueante).
        # Executamos a consulta em uma thread separada para não bloquear o servidor.
        print("⚡️ Executando a busca no Pinecone em uma thread separada...")
        resultados = await run_in_threadpool(
            index.query,
            vector=vetor_pergunta,
            top_k=5,
            include_metadata=True
        )
        print("\n🔍 --- DEBUG: CONTEÚDO RECUPERADO DO PINECONE ---")
        if not resultados['matches']:
            print("⚠️ O Pinecone retornou VAZIO! Nada foi encontrado no banco.")
        else:
                for i, match in enumerate(resultados['matches']):
                    print(f"Trecho {i+1} (Fonte: {match['metadata'].get('fonte')}):")
                print(f"Texto: {match['metadata'].get('texto')[:200]}...") # Mostra os primeiros 200 caracteres
                print("------------------------------------------------\n")
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

        # --- NOVA VALIDAÇÃO: O CONTEXTO SUPORTA O TOM PEDAGÓGICO? ---
        def validar_contexto_para_tom(tom: str, contexto: str) -> bool:
            """Verifica se o contexto tem informações mínimas para o tom."""
            contexto_lower = contexto.lower()
            if tom == "numerico":
                # Procura por qualquer dígito no texto.
                return bool(re.search(r'\d', contexto))
            if tom == "experimental":
                # Procura por palavras-chave relacionadas a experimentos.
                palavras_chave = ["experimento", "laboratório", "prática", "coleta de dados", "montagem", "roteiro"]
                return any(palavra in contexto_lower for palavra in palavras_chave)
            if tom == "analitico":
                # Procura por sintaxe LaTeX ($...$) ou palavras como derivada/integral.
                return "$" in contexto or "derivada" in contexto_lower or "integral" in contexto_lower
            if tom == "historico":
                # Procura por anos (4 dígitos) ou palavras-chave históricas.
                return bool(re.search(r'\b(1[5-9]\d{2}|20\d{2})\b', contexto)) or "século" in contexto_lower or "história" in contexto_lower
            # Tom 'conceitual' é o padrão e geralmente é atendido por qualquer texto.
            return True

        if not validar_contexto_para_tom(dados.tom_abordagem, contexto_rag):
            print(f"⛔ BLOQUEADO: O contexto não tem informações para a abordagem '{dados.tom_abordagem}'.")
            return {"erro_tema_nao_encontrado": f"O material didático encontrado sobre o tema não possui informações suficientes para uma abordagem '{dados.tom_abordagem}'. Por favor, tente uma abordagem mais conceitual ou teórica."}
        
        print(f"✅ Contexto validado para a abordagem '{dados.tom_abordagem}'.")

        # --- INSTRUÇÃO DINÂMICA PARA CÁLCULO ---
        instrucao_calculo = ""
        if "graduação" in dados.turma.lower():
            instrucao_calculo = """
        [INSTRUÇÃO CRÍTICA PARA NÍVEL SUPERIOR]
        A turma é de GRADUAÇÃO. É IMPERATIVO que a abordagem teórica e as atividades propostas utilizem formalismo de CÁLCULO DIFERENCIAL E INTEGRAL (derivadas e integrais) para explicar os fenômenos físicos, sempre que o tema permitir. Demonstre a profundidade acadêmica esperada para este nível.
        A turma é de GRADUAÇÃO. É IMPERATIVO que a abordagem teórica e as atividades propostas utilizem formalismo de CÁLCULO DIFERENCIAL E INTEGRAL (derivadas e integrais) para explicar os fenômenos físicos, sempre que o tema permitir.
        """

        # --- INSTRUÇÃO DINÂMICA PARA O TOM PEDAGÓGICO ---
        tons_pedagogicos = {
            "conceitual": """
            [TOM PEDAGÓGICO: Conceitual e Intuitivo]
            Sua resposta deve focar na explicação física dos fenômenos por trás das fórmulas. Use analogias do cotidiano, intuição e visualização gráfica, evitando formalismo matemático pesado. O objetivo é construir a base conceitual do aluno.
            """,
            "analitico": """
            [TOM PEDAGÓGICO: Rigoroso e Analítico]
            Sua resposta deve ter um alto nível acadêmico, formal e técnico. Utilize a linguagem do cálculo diferencial e integral, vetores e deduções matemáticas elegantes em LaTeX para demonstrar o rigor esperado em turmas avançadas.
            """,
            "numerico": """
            [TOM PEDAGÓGICO: Prático e Numérico]
            Sua resposta deve focar menos na teoria textual e mais em números e aplicações. Estruture a aula com base em exemplos numéricos reais, passo a passo de resolução de problemas, manipulação de unidades e dados práticos.
            """,
            "experimental": """
            [TOM PEDAGÓGICO: Experimental e Construtivista]
            Sua resposta deve ser voltada para a "mão na massa". Proponha roteiros de experimentos, projetos de laboratório, sugestões de coleta de dados e perguntas reflexivas para que os alunos investiguem o fenômeno ativamente.
            """,
            "historico": """
            [TOM PEDAGÓGICO: Histórico e Filosófico]
            Sua resposta deve adotar um tom narrativo e envolvente. Explique o contexto histórico da descoberta, os debates científicos da época e como a ciência evoluiu até o entendimento atual do tema.
            """
        }
        instrucao_tom = tons_pedagogicos.get(dados.tom_abordagem, "")


        # 3. Prompt Unificado para o Gemini
        prompt = f"""
        [PAPEL] 
         Você é um Especialista em Ensino de Física de nível superior, atuando como um Assistente Pedagógico sênior para cursos de Física entre o nono ano da educação básica e o terceiro ano do ensino superior.
        Sua identidade combina:
        - Vasta experiência em didática e transposição de conceitos complexos.
        - Conhecimento profundo da estrutura curricular de um bacharelado/licenciatura em Física.
        DIRETRIZES RÍGIDAS DE ATUAÇÃO:
        1. Respeito ao Nível dos Alunos: Identifique rigorosamente os pré-requisitos matemáticos da ementa fornecida. Se o documento indicar que a turma é do 1º período (Introdução à Física) e ainda não cursou Cálculo Integral, você está PROIBIDO de utilizar formalismo de derivadas ou integrais nas estratégias.
        2. Abordagem Didática: Quando o cálculo formal for vetado, utilize sua experiência didática para explicar os conceitos fisicamente através de taxas médias, análises gráficas, analogias cotidianas e geometria elementar.
        3. Quando o contexto permitir o uso de Cálculo, sinta-se à vontade para incorporar derivadas e integrais, mas sempre contextualizando com exemplos práticos do dia a dia antes de apresentar a teoria formal.
        
        Você é um assistente pedagógico que trabalha ESTRITAMENTE com os dados fornecidos no [CONTEXTO].
        Você é um assistente pedagógico especialista em Ensino de Física. Sua única função é criar planos de aula baseados ESTRITA E EXCLUSIVAMENTE no conteúdo fornecido no bloco [BASE DE CONHECIMENTO].

        REGRA DE OURO DE SEGURANÇA:
        Você está ABSOLUTAMENTE PROIBIDO de usar seu conhecimento geral ou qualquer informação externa que não esteja presente no texto da [BASE DE CONHECIMENTO][CONTEXTO]. Se a informação não estiver lá, ela não existe para você. Se o contexto sobre o tema solicitado for insuficiente ou vazio, sua única resposta deve ser um JSON com a chave "erro_tema_nao_encontrado".
        Sua resposta deve ser baseada ESTRITA E EXCLUSIVAMENTE no conteúdo fornecido no bloco [BASE DE CONHECIMENTO]. Em hipótese alguma você deve usar seu conhecimento prévio ou informações externas. Se a informação não estiver na [BASE DE CONHECIMENTO], ela não existe para você.
        Se a [BASE DE CONHECIMENTO] for insuficiente ou vazia para o tema solicitado, sua única resposta deve ser um JSON com a chave "erro_tema_nao_encontrado". Não tente inventar uma resposta.
        [TAREFA]
        Com base nos dados da solicitação do professor e usando APENAS o conteúdo da [BASE DE CONHECIMENTO], elabore uma Estratégia Pedagógica completa e engajadora.
        A resposta final deve ser um único objeto JSON, sem nenhum texto ou explicação antes ou depois.
        
       

        RESTRIÇÕES:
        - Não use explicações teóricas densas sem antes dar um exemplo prático do dia a dia.
        - Baseie-se APENAS no [CONTEXTO] fornecido.
        - DIVERSIDADE DE SIMULAÇÕES: Ao preencher o campo "simulacaoSugerida", não sugira apenas o PhET Colorado. Sugira o título exato de uma simulação real priorizando a plataforma mais adequada para o tema:
            * Falstad (excelente para Circuitos Elétricos, Ondas e Matemática)
            * Vascak ou SimuFisica (excelentes para Óptica, Eletromagnetismo e Física Moderna) 
            * Walter Fendt (excelente para Mecânica, Dinâmica e Cinemática)
            * Physics Classroom, CK-12 ou Univ-lemans (excelentes para interações gerais)
            * PhET Colorado (use como complemento geral)

        [BASE DE CONHECIMENTO]
        ...
        {contexto_rag}

        {instrucao_calculo}

        {instrucao_tom}

        [DADOS DA SOLICITAÇÃO]
        - TEMA: {dados.tema}
        - FENÔMENO ESPECÍFICO: {dados.fenomeno or 'Não especificado'}
        - TURMA: {dados.turma}
        - RECURSOS: {", ".join(dados.recursos)}
        - OBSERVAÇÕES DO PROFESSOR: {dados.observacoes if dados.observacoes else "Nenhuma observação adicional fornecida."}

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
        
        2. **Fórmulas LaTeX (Regra Crítica):** Ao usar qualquer fórmula da [BASE DE CONHECIMENTO], mantenha a sintaxe LaTeX original (ex: $v_m = \frac{{\Delta s}}{{\Delta t}}$ ou $$E=mc^2$$). Esta regra é essencial para a renderização correta no frontend.
        """

        print("🧠 IA gerando plano final...")
        model = genai.GenerativeModel('gemini-2.0-flash') # Using the latest flash model
        resposta = await model.generate_content_async(
            prompt, 
            generation_config={"response_mime_type": "application/json"}
        )
        
        # --- CORREÇÃO CIRÚRGICA PARA LATEX ---
        # A resposta da IA (resposta.text) é uma string JSON. Fórmulas LaTeX (ex: "\frac")
        # podem conter sequências como `\f` que são interpretadas como caracteres de escape
        # inválidos pelo `json.loads`. A solução é usar uma expressão regular para
        # encontrar e escapar apenas as barras invertidas que não fazem parte de uma
        # sequência de escape JSON válida (como \n, \t, \", \\).
        # Isso preserva a integridade das fórmulas LaTeX.
        processed_text = re.sub(r'(?<!\\)\\(?![/bfnrt"\\])', r'\\\\', resposta.text)
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
                # --- OTIMIZAÇÃO DE PERFORMANCE ---
                # Usando a versão assíncrona (atext) da biblioteca duckduckgo-search.
                # Isso evita o bloqueio do event loop.
                print(f"⚡️ Executando busca assíncrona no DuckDuckGo: '{query_sim}'")
                ddgs = DDGS()
                resultados_sim = await ddgs.atext(query_sim, max_results=3)
                
                if resultados_sim:
                    # Captura o primeiríssimo link retornado dentro daquele site
                    link_final = resultados_sim[0].get('href', '')
                    print(f"🌟 LINK DIRETO EXTRAÍDO COM SUCESSO: {link_final}")
            except Exception as e:
                link_final = None # Garante que link_final seja None em caso de erro
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
