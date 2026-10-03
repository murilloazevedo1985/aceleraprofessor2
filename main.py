from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
import asyncio
from datetime import datetime, timezone
from uuid import uuid4
import json
from google import genai
import firebase_admin
from firebase_admin import credentials as firebase_credentials, firestore
import re
import os
from dotenv import load_dotenv
from googlesearch import search
from pinecone import Pinecone
import mimetypes 
from duckduckgo_search import DDGS
from pdf2image import convert_from_path
import os
import uvicorn 
import json
import os
from dotenv import load_dotenv
from google import genai
from pinecone import Pinecone

# --- CONFIGURAÇÕES E VARIÁVEIS DE AMBIENTE ---
# Carrega as variáveis do arquivo .env ou .env.local
project_root = os.path.dirname(__file__)
load_dotenv(dotenv_path=os.path.join(project_root, ".env.local"))
load_dotenv(dotenv_path=os.path.join(project_root, ".env"))

# Resgate e validação das chaves
CHAVE_API_PINECONE = os.getenv("PINECONE_API_KEY")
CHAVE_API_GEMINI = os.getenv("GEMINI_API_KEY")
MODELO_GERACAO_GEMINI = os.getenv("GEMINI_GENERATION_MODEL", "gemini-3.5-flash-lite")
PULAR_SALVAMENTO_PLANOS = any(
    os.getenv(variable, "").strip().lower() in {"1", "true", "yes"}
    for variable in ("SKIP_PLAN_SAVE", "SKIP_PLAN_DRIVE_SAVE")
)
CAMINHO_JSON_CREDENCIAIS = os.getenv(
    "GOOGLE_APPLICATION_CREDENTIALS",
    os.path.join(project_root, "credenciais.json"),
)
NOME_INDEX_PINECONE = "aulas-fisica"
NOME_COLECAO_PLANOS = os.getenv("FIRESTORE_PLANS_COLLECTION", "planos_aula")

if not CHAVE_API_PINECONE:
    raise ValueError("A variável de ambiente PINECONE_API_KEY não foi definida.")
if not CHAVE_API_GEMINI:
    raise ValueError("A variável de ambiente GEMINI_API_KEY não foi definida.")

# --- INICIALIZAÇÃO DO GEMINI (google-genai) ---
# Instancia o cliente usando a chave validada
client = genai.Client(api_key=CHAVE_API_GEMINI)

print("🔍 Buscando modelos suportados pelo Gemini...\n")
try:
    for m in client.models.list():
        print(m.name)
except Exception as e:
    print(f"⚠️ Erro ao listar modelos do Gemini: {e}")

# --- CONEXÃO COM O PINECONE ---
print("🔌 Conectando ao Pinecone...")
pc = Pinecone(api_key=CHAVE_API_PINECONE)
index = pc.Index(NOME_INDEX_PINECONE)

# --- CONEXÃO COM O FIRESTORE ---
firestore_db = None
firestore_database_checked = False
print("🗃️ Conectando ao Firestore...")
try:
    firebase_app = firebase_admin.get_app()
except Exception as e:
    try:
        firebase_credentials_json = (
            os.getenv("FIREBASE_CREDENTIALS_JSON")
            or os.getenv("GOOGLE_DRIVE_CREDENTIALS_JSON")
        )
        if firebase_credentials_json:
            app_credentials = firebase_credentials.Certificate(json.loads(firebase_credentials_json))
        else:
            app_credentials = firebase_credentials.Certificate(CAMINHO_JSON_CREDENCIAIS)
        firebase_app = firebase_admin.initialize_app(app_credentials)
    except Exception as init_error:
        firebase_app = None
        print(f"⚠️ Firestore indisponível: {init_error}")

if firebase_app is not None:
    try:
        firestore_db = firestore.client(app=firebase_app)
        print(f"✅ Cliente Firestore pronto. Coleção: {NOME_COLECAO_PLANOS}")
    except Exception as e:
        print(f"⚠️ Firestore indisponível: {e}")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permite que qualquer porta acesse a API
    allow_credentials=True,
    allow_methods=["*"], # Permite POST, GET, etc.
    allow_headers=["*"],
)


def _verificar_firestore() -> None:
    global firestore_database_checked
    if firestore_db is None:
        raise HTTPException(
            status_code=503,
            detail="Firestore não inicializado. Confira as credenciais Firebase do backend.",
        )
    if firestore_database_checked:
        return

    try:
        list(firestore_db.collection(NOME_COLECAO_PLANOS).limit(1).stream())
        firestore_database_checked = True
    except Exception as e:
        if "database (default) does not exist" in str(e).lower():
            raise HTTPException(
                status_code=503,
                detail="Crie o banco Firestore padrão no Console Firebase antes de gerar e salvar planos.",
            ) from e
        raise


def _criar_plano_firestore(documento: dict) -> dict:
    _verificar_firestore()
    plano_id = uuid4().hex
    firestore_db.collection(NOME_COLECAO_PLANOS).document(plano_id).set(documento)
    return {"id": plano_id}


def _obter_plano_firestore(plano_id: str) -> dict:
    _verificar_firestore()
    snapshot = firestore_db.collection(NOME_COLECAO_PLANOS).document(plano_id).get()
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="Plano não encontrado no Firestore.")
    return snapshot.to_dict() or {}


def _atualizar_plano_firestore(plano_id: str, documento: dict) -> None:
    _verificar_firestore()
    firestore_db.collection(NOME_COLECAO_PLANOS).document(plano_id).set(documento)


def _listar_planos_firestore() -> list[dict]:
    _verificar_firestore()
    return [
        {"id": snapshot.id, "registro": snapshot.to_dict() or {}}
        for snapshot in firestore_db.collection(NOME_COLECAO_PLANOS).stream()
    ]


async def _gerar_conteudo_gemini_com_retry(**kwargs):
    max_tentativas = 5
    for tentativa in range(max_tentativas):
        try:
            return await run_in_threadpool(client.models.generate_content, **kwargs)
        except Exception as e:
            codigo = getattr(e, "code", None) or getattr(e, "status_code", None)
            mensagem = str(e).upper()
            cota_diaria_esgotada = codigo == 429 and any(
                marcador in mensagem
                for marcador in (
                    "EXCEEDED YOUR CURRENT QUOTA",
                    "GENERATEREQUESTSPERDAY",
                    "GENERATE_CONTENT_FREE_TIER_REQUESTS",
                )
            )
            if cota_diaria_esgotada:
                print(f"⚠️ Cota diária do Gemini esgotada: {e}")
                raise HTTPException(
                    status_code=429,
                    detail=(
                        "A cota diária do Gemini foi atingida para o modelo configurado. "
                        "Aguarde a renovação da cota ou confira os limites e o faturamento do projeto."
                    ),
                ) from e

            transitorio = codigo in {429, 500, 502, 503, 504} or any(
                marcador in mensagem
                for marcador in (
                    "429 TOO MANY REQUESTS",
                    "500 INTERNAL",
                    "502 BAD GATEWAY",
                    "503 UNAVAILABLE",
                    "504 GATEWAY TIMEOUT",
                    "RESOURCE_EXHAUSTED",
                    "UNAVAILABLE",
                )
            )
            if not transitorio:
                raise

            if tentativa == max_tentativas - 1:
                raise HTTPException(
                    status_code=503,
                    detail=f"Gemini continua temporariamente indisponível após {max_tentativas} tentativas: {e}",
                ) from e

            espera = min(2 ** tentativa, 8)
            print(
                f"⚠️ Gemini temporariamente indisponível; "
                f"tentativa {tentativa + 2}/{max_tentativas} em {espera}s: {e}"
            )
            await asyncio.sleep(espera)

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

class ExperimentoRequest(BaseModel):
    tema: str

class AvaliacaoRequest(BaseModel):
    plano: dict # O JSON completo do plano de aula
    nota: int # A nota de 1 a 5
    tema: str # O tema da aula para exibição

@app.get("/health", status_code=200)
async def health_check():
    """Endpoint simples para verificar se a API está no ar."""
    return {"status": "ok"}

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

    model = genai.GenerativeModel('gemini-2.0-Flash')
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

def mapear_habilidades_por_assunto(tema_usuario: str) -> list[dict]:
    """
    Mapeia um tema de física para uma lista de dicionários contendo as habilidades da BNCC.
    Retorna uma lista de dicionários ou uma lista vazia se não encontrar.
    """
    print(f"🗺️  Mapeando localmente o tema '{tema_usuario}' para habilidades da BNCC...")
    tema_lower = tema_usuario.lower()

     # Textos oficiais e integrais das habilidades
    habilidades_bncc = {
        "EM13CNT101": "ANÁLISE E CONSERVAÇÃO: (EM13CNT101) Analisar e representar, com ou sem o uso de dispositivos e de aplicativos digitais específicos, as transformações e conservações em sistemas que envolvam quantidade de matéria, de energia e de movimento para realizar previsões sobre seus comportamentos em situações cotidianas e em processos produtivos que priorizem o desenvolvimento sustentável, o uso consciente dos recursos naturais e a preservação da vida em todas as suas formas.",
        "EM13CNT102": "SISTEMAS TÉRMICOS: (EM13CNT102) Realizar previsões, avaliar intervenções e/ou construir protótipos de sistemas térmicos que visem à sustentabilidade, considerando sua composição e os efeitos das variáveis termodinâmicas sobre seu funcionamento, considerando também o uso de tecnologias digitais que auxiliem no cálculo de estimativas e no apoio à construção dos protótipos.",
        "EM13CNT103": "RADIAÇÕES E ONDAS: (EM13CNT103) Utilizar o conhecimento sobre as radiações e suas origens para avaliar as potencialidades e os riscos de sua aplicação em equipamentos de uso cotidiano, na saúde, no ambiente e na geração de energia elétrica e/ou propor alternativas de solução com base em critérios de sustentabilidade, consumo consciente e preservação da vida.",
        "EM13CNT104": "ELETROMAGNETISMO E DISPOSITIVOS: (EM13CNT104) Realizar previsões qualitativas e quantitativas sobre o funcionamento de geradores, motores elétricos e seus componentes, bobinas, transformadores, pilhas, baterias e dispositivos eletrônicos, com base na análise dos processos de transformação e condução de energia envolvidos, propondo ações que visem a sustentabilidade pelo consumo consciente e/ou uso de fontes renováveis de energia.",
        "EM13CNT204": "MOVIMENTOS E GRAVITAÇÃO: (EM13CNT204) Elaborar explicações, previsões e cálculos a respeito dos movimentos de objetos na Terra, no Sistema Solar e no Universo com base na análise das interações gravitacionais, com ou sem o uso de dispositivos e aplicativos digitais (como softwares de simulação e de realidade virtual, entre outros)."
        }
        # Árvore de regras de mapeamento
    regras = {
        "MECÂNICA": {
                "keywords": ["mru", "mruv", "queda livre", "lançamento vertical", "lançamento oblíquo", "mcu", "leis de newton", "atrito", "plano inclinado", "blocos", "força centrípeta", "trabalho", "energia cinética", "energia potencial", "conservativos", "dissipativos", "potência", "rendimento", "impulso", "quantidade de movimento", "colisões", "centro de massa", "equilíbrio", "torque", "alavancas", "roldanas", "pressão", "densidade", "stevin", "pascal", "arquimedes", "empuxo", "kepler", "gravitação", "campo gravitacional", "satélites", "calendário", "órbitas", "astronomia", "mecânica", "cinemática", "dinâmica", "hidrostática"],
            "codigos": ["EM13CNT204", "EM13CNT101"]
        },
        "TERMOLOGIA": {
            "keywords": ["escalas termométricas", "celsius", "fahrenheit", "kelvin", "equilíbrio térmico", "termômetro", "calor sensível", "calor latente", "trocas de calor", "calorímetro", "diagramas de fase", "condução", "convecção", "irradiação", "clapeyron", "pv=nrt", "transformações gasosas", "isotérmica", "isobárica", "isocórica", "mistura de gases", "1ª lei da termodinâmica", "energia interna", "2ª lei da termodinâmica", "máquinas térmicas", "entropia", "ciclo de carnot", "calor", "termologia", "termodinâmica"],
            "codigos": ["EM13CNT102"]
        },
        "ÓPTICA E ONDULATÓRIA": {
            "keywords": ["óptica geométrica", "reflexão", "espelhos", "refração", "snell-descartes", "lentes", "fenômenos ondulatórios", "difração", "interferência", "polarização", "acústica", "fontes sonoras", "altura", "timbre", "intensidade", "velocidade do som", "eco", "reverberação", "ressonância", "efeito doppler", "ondas", "óptica", "ondulatória"],
            "codigos": ["EM13CNT103"]
        },
        "ELETROMAGNETISMO": {
            "keywords": ["carga elétrica", "eletrização", "coulomb", "campo elétrico", "potencial elétrico", "corrente elétrica", "leis de ohm", "circuitos", "série", "paralelo", "misto", "potência elétrica", "geradores", "receptores", "kirchhoff", "ímãs", "campo magnético", "força magnética", "solenoide", "fluxo magnético", "faraday-lenz", "transformadores", "motores elétricos", "arduino", "eletrônica", "circuitos elétricos", "eletromagnetismo", "eletrostática", "eletrodinâmica"],
            "codigos": ["EM13CNT104"]
        },
        "FÍSICA MODERNA": {
            "keywords": ["relatividade", "einstein", "dilatação do tempo", "contração do espaço", "e=mc²", "quântica", "corpo negro", "planck", "efeito fotoelétrico", "bohr", "dualidade", "física nuclear", "radioatividade", "decaimento", "alfa", "beta", "gama", "meia-vida", "fissão", "fusão nuclear", "modelo padrão", "quarks", "léptons", "bóson de higgs", "forças fundamentais", "física moderna"],
            "codigos": ["EM13CNT103", "EM13CNT204"]
        }
    }

    for categoria, data in regras.items():
        # any() é uma forma eficiente de verificar se qualquer keyword está no tema
        if any(keyword in tema_lower for keyword in data["keywords"]):
            print(f"✅ Tema encontrado na categoria '{categoria}'. Mapeando para {data['codigos']}.")
            
            # Monta a lista de dicionários com os dados completos
            resultado = [
                {"codigo": codigo, "texto": habilidades_bncc[codigo]}
                for codigo in data["codigos"]
            ]
            return resultado

    print("⚠️ Tema não encontrado no mapa local. O sistema usará a busca vetorial como fallback.")
    return []

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
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = await model.generate_content_async(
            [prompt, imagem_pagina],
            generation_config={"temperature": 0.0}
        )

        print("✅ Conteúdo extraído com sucesso!")
        return {"texto_extraido": response.text}

    except Exception as e:
        print(f"❌ Erro ao extrair conteúdo da imagem: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao processar imagem: {e}")

@app.post("/gerar-experimento-estrategico")
async def gerar_experimento_estrategico(dados: ExperimentoRequest):
    """
    Realiza uma consulta de RAG estruturada para conectar um experimento de física
    com estratégias pedagógicas pré-definidas.
    """
    try:
        print(f"\n🔬 Iniciando busca de experimento para o tema: '{dados.tema}'")

        # 1. BUSCA VETORIAL DO EXPERIMENTO NO PINECONE
        res_emb_exp = await client.aio.models.embed_content(
            model="gemini-embedding-2",
            contents=dados.tema,
            config={"task_type": "RETRIEVAL_QUERY"}
        )
        vetor_busca_exp = res_emb_exp.embeddings[0].values

        # Assumindo que os experimentos estão tagueados com "tipo": "experimento_fisica"
        resultados_exp = await run_in_threadpool(
            index.query,
            vector=vetor_busca_exp,
            top_k=1, # Pega apenas o experimento mais relevante
            include_metadata=True,
            filter={"tipo": {"$eq": "experimento_fisica"}}
        )

        # BARREIRA DE SEGURANÇA: Verifica se um experimento foi encontrado
        if not resultados_exp.get('matches') or resultados_exp['matches'][0]['score'] < 0.7:
            print("⛔ BLOQUEADO: Nenhum experimento relevante encontrado no banco de dados.")
            raise HTTPException(
                status_code=404, 
                detail="Desculpe, não encontrei um experimento prático sobre este tema na base de dados."
            )

        contexto_experimento_rag = resultados_exp['matches'][0]['metadata']['texto']
        fonte_experimento = resultados_exp['matches'][0]['metadata']['fonte']
        print(f"✅ Experimento encontrado da fonte: '{fonte_experimento}'")

        # 2. LISTA ESTÁTICA DE ESTRATÉGIAS PEDAGÓGICAS
        # A lista de estratégias agora é uma string formatada, conforme solicitado.
        contexto_estrategias_formatado = """
        **ESTRATÉGIA 1: POE (Predict-Observe-Explain)**
        - Descrição: Alunos predizem o resultado de um fenômeno, observam e depois explicam as discrepâncias.
        - Características: Corrige modelos mentais intuitivos.
        - Conteúdo Recomendado: Mecânica (aceleração, força, velocidade, gravidade), movimento desacelerado/acelerado.

        **ESTRATÉGIA 2: Modelo 7E**
        - Descrição: Ensino em 7 fases: Elicitar, Engajar, Explorar, Explicar, Elaborar, Avaliar e Estender.
        - Características: Ciclo de aprendizagem completo, promove entendimento conceitual profundo.
        - Conteúdo Recomendado: Cinemática, MRUV, gráficos posição × tempo.

        **ESTRATÉGIA 3: Três Momentos Pedagógicos (3MP)**
        - Descrição: Estrutura em 3 etapas: problematização inicial, organização do conhecimento e aplicação.
        - Características: Integra teoria e prática, contextualiza problemas reais.
        - Conteúdo Recomendado: Física Moderna, fotoluminescência, Mecânica Quântica, conceitos abstratos.

        **ESTRATÉGIA 4: Tutoriais ACORN**
        - Descrição: Desenvolve as "sementes da ciência" (ideias produtivas dos alunos) em 3 etapas: Gather, Articulate, Apply.
        - Características: Foca no que o aluno acerta, constrói a partir de ideias prévias.
        - Conteúdo Recomendado: Circuitos elétricos, ondas, momento linear, calor, termodinâmica.

        **ESTRATÉGIA 5: Modelagem Matemática com Dados Reais**
        - Descrição: Uso de múltiplas representações (concreta, pictórica, simbólica, gráfica) para ensinar conceitos.
        - Características: Abordagem flexível, promove abstração gradual.
        - Conteúdo Recomendado: Eletromagnetismo, Lei de Faraday, campos, indução eletromagnética.

        **ESTRATÉGIA 6: Instrução por Pares (Peer Instruction)**
        - Descrição: Alunos discutem conceitos em pequenos grupos antes de responder questões conceituais.
        - Características: Engajamento cognitivo, compartilhamento de raciocínio, feedback imediato.
        - Conteúdo Recomendado: Leis de Newton, conservação de energia, eletricidade básica.

        **ESTRATÉGIA 7: Aprendizagem Baseada em Problemas (PBL)**
        - Descrição: Alunos aprendem resolvendo problemas relevantes e contextualizados do mundo real.
        - Características: Trabalho colaborativo, pensamento crítico, problemas abertos.
        - Conteúdo Recomendado: Fenômenos do cotidiano, projetos interdisciplinares, engenharia.

        **ESTRATÉGIA 8: Gamificação ou Simulação Interativa**
        - Descrição: Uso de elementos de jogos ou simulações para ensinar.
        - Características: Alta motivação, ambiente seguro para testar hipóteses, visualização de fenômenos abstratos.
        - Conteúdo Recomendado: Óptica, Mecânica (colisões), Eletromagnetismo (campos).

        **ESTRATÉGIA 9: Sala de Aula Invertida (Flipped Classroom)**
        - Descrição: Alunos estudam a teoria em casa e usam a aula para atividades práticas.
        - Características: Maximiza o tempo de aula para hands-on, promove aprendizagem ativa.
        - Conteúdo Recomendado: Cinemática, dinâmica, circuitos.

        **ESTRATÉGIA 10: Categorização de Problemas**
        - Descrição: Ensina estratégias de resolução de especialistas: identificar princípios antes de resolver numericamente.
        - Características: Foco em desenhos, esquemas e equações conceituais.
        - Conteúdo Recomendado: Resolução de problemas em Mecânica, Eletrodinâmica, Termodinâmica.
        """

        # 3. MONTAGEM DO PROMPT ESTRUTURADO PARA O GEMINI
        prompt = f"""
        Você é um assistente pedagógico de Física. Seu único objetivo é gerar de 2 a 3 estratégias pedagógicas combinadas e justificadas para um plano de aula, utilizando exclusivamente o `[Experimento_Retornado_Pinecone]` e a `[Lista_Estratégias_Estáticas]` fornecidos no contexto. Você está expressamente PROIBIDO de criar ou sugerir qualquer estratégia que não esteja na lista ou experimento que não esteja no contexto. Se o contexto do Pinecone estiver vazio, informe 'Experimento não encontrado para este tema' e use apenas as estratégias genéricas de quadro, datashow ou exercícios.

        **Instruções de Formatação Obrigatórias:**
        1. A seção onde você anuncia a escolha da estratégia pedagógica deve ser onde agora está escrito 'estrategia pedagogica'.
        2. Para cada estratégia sugerida, use o seguinte formato exato:
            - O nome da estratégia, por exemplo: `Modelagem matemática com dados reais`.
            - Logo abaixo, uma descrição concisa da estratégia, por exemplo: `(Modelagem matemática com dados reais)** - Descrição: Utiliza dados reais para construir modelos matemáticos e simular cenários fisicos.`.
        3. Você pode e deve sugerir mais de uma estratégia pedagógica por aula. Por exemplo, deve sugerir a 'sala de aula invertida' num primeiro momento, mas depois sugerir 'gamificação e soluções interativas' usando simulações computacionais.
        4. Depois de apresentar as 2 ou 3 estratégias e suas descrições, você deve elaborar detalhadamente como o professor pode aplicar as estratégias pedagógicas com o conteúdo e o experimento recuperado. Justifique sua escolha.

        [Experimento_Retornado_Pinecone]
        {contexto_experimento_rag}

        [Lista_Estratégias_Estáticas]
        {contexto_estrategias_formatado}

        [TAREFA]
        Gere um objeto JSON contendo o nome do experimento e uma lista com as estratégias sugeridas e suas justificativas. A resposta deve ser apenas o JSON puro.
        """

        resposta = await client.aio.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )

        print("✅ Análise pedagógica gerada com sucesso!")
        return json.loads(resposta.text)

    except HTTPException as http_exc:
        raise http_exc # Re-levanta a exceção HTTP para que o FastAPI a manipule
    except Exception as e:
        print(f"❌ Erro ao gerar experimento estratégico: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao processar a solicitação.")

@app.post("/gerar-plano")
async def gerar_plano(dados: PlanoRequest):
    try:
        if not PULAR_SALVAMENTO_PLANOS:
            await run_in_threadpool(_verificar_firestore)

        # Combina tema e fenômeno para uma busca mais precisa
        texto_busca = f"{dados.tema} - {dados.fenomeno}" if dados.fenomeno else dados.tema
        print(f"\n🚀 Iniciando geração de plano para: '{texto_busca}'...")

        # --- OTIMIZAÇÃO: ARQUITETURA HÍBRIDA ---
        # 1. MAPEAMENTO LOCAL DA BNCC (Rápido e Gratuito)
        habilidades_mapeadas = mapear_habilidades_por_assunto(dados.tema)
        contexto_bncc_rag = ""

        if habilidades_mapeadas:
            # Extrai apenas os textos para o prompt, mas mantém a estrutura completa para outros usos
            textos_bncc = [h['texto'] for h in habilidades_mapeadas]
            contexto_bncc_rag = "\n\n---\n\n".join(textos_bncc)
        else:
            # 2. FALLBACK: BUSCA VETORIAL NA NUVEM (Se o mapa local falhar)
            print("   - Executando busca vetorial de fallback para BNCC no Pinecone...")
            etapa_ensino_bncc = "ensino médio" if "médio" in dados.turma.lower() else "ensino fundamental"
            texto_busca_bncc = f"habilidade da bncc para o {etapa_ensino_bncc} sobre {texto_busca}"
            
            res_emb_bncc = await run_in_threadpool(
                client.models.embed_content,
                model="gemini-embedding-2",
                contents=texto_busca_bncc,
                config={"task_type": "RETRIEVAL_QUERY"}
            )
            vetor_busca_bncc = res_emb_bncc.embeddings[0].values

            etapa_filtro = "Ensino Médio" if "médio" in dados.turma.lower() else "Ensino Fundamental"
            resultados_bncc = await run_in_threadpool(
                index.query,
                vector=vetor_busca_bncc,
                top_k=3,
                include_metadata=True,
                filter={"$and": [{"tipo": {"$eq": "diretriz_bncc"}}, {"etapa": {"$eq": etapa_filtro}}]}
            )

            # Processa os resultados do fallback
            textos_bncc_fallback = []
            if resultados_bncc['matches']:
                NOTA_DE_CORTE_BNCC = 0.4
                for match in resultados_bncc['matches']:
                    if match['score'] >= NOTA_DE_CORTE_BNCC:
                        textos_bncc_fallback.append(match['metadata']['texto'])
                contexto_bncc_rag = "\n\n---\n\n".join(textos_bncc_fallback)
                print(f"   - Fallback encontrou {len(textos_bncc_fallback)} habilidade(s) relevante(s).")
            else:
                print("   - Fallback da BNCC não encontrou resultados.")

        # 3. BUSCA DE CONTEÚDO TÉCNICO (Sempre via Pinecone - executado independentemente da BNCC)
        print("   - Buscando conteúdo de Física no Pinecone...")
        res_emb_fisica = await run_in_threadpool(
            client.models.embed_content,
            model="gemini-embedding-2",
            contents=texto_busca,
            config={"task_type": "RETRIEVAL_QUERY"}
        )
        vetor_busca_fisica = res_emb_fisica.embeddings[0].values

        resultados_fisica = await run_in_threadpool(
            index.query,
            vector=vetor_busca_fisica,
            top_k=5,
            include_metadata=True,
            filter={"tipo": {"$eq": "conteudo_fisica"}}
        )

        textos_fisica = [match['metadata']['texto'] for match in resultados_fisica.get('matches', [])]
        scores = [match['score'] for match in resultados_fisica.get('matches', [])]

        # --- BARREIRA DE FERRO PRINCIPAL (FÍSICA) ---
        NOTA_DE_CORTE_FISICA = 0.7
        if not textos_fisica or scores[0] < NOTA_DE_CORTE_FISICA:
            print("⛔ BLOQUEADO: Conteúdo de física não encontrado no material do Drive com similaridade suficiente.")
            return {"erro_tema_nao_encontrado": "Desculpe, mas este tema não consta no material didático da nossa base de dados."}
        
        contexto_fisica_rag = "\n\n---\n\n".join(textos_fisica)
        print(f"   - Encontrados {len(textos_fisica)} trechos de Física com score máximo de {scores[0]:.4f}.")

        # --- VALIDAÇÃO DO TOM (Permanece igual) ---
        def validar_contexto_para_tom(tom: str, contexto: str) -> bool:
            if not tom or not contexto: return True
            contexto_lower = contexto.lower()
            if tom == "numerico": return bool(re.search(r'\d', contexto))
            if tom == "experimental": return any(p in contexto_lower for p in ["experimento", "laboratório", "prática", "coleta de dados"])
            if tom == "analitico": return "$" in contexto or "derivada" in contexto_lower or "integral" in contexto_lower
            if tom == "historico": return bool(re.search(r'\b(1[5-9]\d{2}|20\d{2})\b', contexto)) or "século" in contexto_lower
            return True

        if not validar_contexto_para_tom(dados.tom_abordagem, contexto_fisica_rag):
            print(f"⛔ BLOQUEADO: O contexto não tem informações para a abordagem '{dados.tom_abordagem}'.")
            return {"erro_tema_nao_encontrado": f"O material didático encontrado sobre o tema não possui informações suficientes para uma abordagem '{dados.tom_abordagem}'. Por favor, tente uma abordagem mais conceitual ou teórica."}
        
        print(f"✅ Contexto validado para a abordagem '{dados.tom_abordagem}'.")

        # --- INSTRUÇÕES DINÂMICAS PARA O PROMPT (Permanece igual) ---
        instrucao_calculo = ""
        if "graduação" in dados.turma.lower():
            instrucao_calculo = "[INSTRUÇÃO CRÍTICA PARA NÍVEL SUPERIOR]\nA turma é de GRADUAÇÃO. É IMPERATIVO que a abordagem teórica e as atividades propostas utilizem formalismo de CÁLCULO DIFERENCIAL E INTEGRAL (derivadas e integrais) para explicar os fenômenos físicos, sempre que o tema permitir."

        tons_pedagogicos = {
            "conceitual": "[TOM PEDAGÓGICO: Conceitual e Intuitivo]\nSua resposta deve focar na explicação física dos fenômenos por trás das fórmulas. Use analogias do cotidiano, intuição e visualização gráfica, evitando formalismo matemático pesado.",
            "analitico": "[TOM PEDAGÓGICO: Rigoroso e Analítico]\nSua resposta deve ter um alto nível acadêmico, formal e técnico. Utilize a linguagem do cálculo diferencial e integral, vetores e deduções matemáticas elegantes em LaTeX.",
            "numerico": "[TOM PEDAGÓGICO: Prático e Numérico]\nSua resposta deve focar menos na teoria textual e mais em números e aplicações. Estruture a aula com base em exemplos numéricos reais e passo a passo de resolução de problemas.",
            "experimental": "[TOM PEDAGÓGICO: Experimental e Construtivista]\nSua resposta deve ser voltada para a 'mão na massa'. Proponha roteiros de experimentos, projetos de laboratório e sugestões de coleta de dados.",
            "historico": "[TOM PEDAGÓGICO: Histórico e Filosófico]\nSua resposta deve adotar um tom narrativo. Explique o contexto histórico da descoberta, os debates científicos da época e como a ciência evoluiu."
        }
        instrucao_tom = tons_pedagogicos.get(dados.tom_abordagem, "")

        # --- NOVAS DIRETRIZES PEDAGÓGICAS (DA SUA SOLICITAÇÃO) ---
        instrucao_estrategias_variadas = """
        [DIRETRIZ CENTRAL DE ESTRATÉGIA PEDAGÓGICA]
        As dez estratégias descritas abaixo são o repertório disponível. NÃO tente usar todas em uma única aula: escolha uma estratégia principal e, somente quando houver complementaridade clara, uma estratégia secundária. Baseie a escolha no tema, na etapa/turma, no tom solicitado, nos recursos disponíveis e especialmente no campo "Conteúdo Recomendado" de cada estratégia. Se a recomendação não combinar com o tema, escolha a alternativa mais adequada e explique a razão; não force uma associação.
        O campo "methodology" deve conter somente o nome da estratégia principal (e, se aplicável, o nome da complementar). O campo "methodologyDetails" deve ser o destaque pedagógico do plano: explique por que a estratégia combina com este tema e turma, como o professor a conduz do início ao fechamento, o que os alunos fazem, quais recursos permitidos são usados e como o professor verifica a aprendizagem. Seja específico para o tema desta solicitação, não escreva uma definição genérica da metodologia.
        Organize os passos como fases coerentes da estratégia escolhida. Em cada etapa, informe uma abordagem em "approach", ações concretas do professor em "teacherRole", ações dos alunos em "studentRole" e, em "description", o procedimento prático, a organização da turma, o resultado esperado e como a etapa prepara a seguinte. Não invente materiais fora dos recursos disponíveis. Evite aula puramente expositiva; toda explicação deve estar ligada a uma tarefa, observação, discussão ou produção dos alunos.

        **ESTRATÉGIA 1: POE (Predict-Observe-Explain)**
        - Descrição: Alunos predizem o resultado de um fenômeno, observam e depois explicam as discrepâncias.
        - Características: Corrige modelos mentais intuitivos.
        - Conteúdo Recomendado: Mecânica (aceleração, força, velocidade, gravidade), movimento desacelerado/acelerado.

        **ESTRATÉGIA 2: Modelo 7E**
        - Descrição: Ensino em 7 fases: Elicitar, Engajar, Explorar, Explicar, Elaborar, Avaliar e Estender.
        - Características: Ciclo de aprendizagem completo, promove entendimento conceitual profundo.
        - Conteúdo Recomendado: Cinemática, MRUV, gráficos posição × tempo.

        **ESTRATÉGIA 3: Três Momentos Pedagógicos (3MP)**
        - Descrição: Estrutura em 3 etapas: problematização inicial, organização do conhecimento e aplicação.
        - Características: Integra teoria e prática, contextualiza problemas reais.
        - Conteúdo Recomendado: Física Moderna, fotoluminescência, Mecânica Quântica, conceitos abstratos.

        **ESTRATÉGIA 4: Tutoriais ACORN**
        - Descrição: Desenvolve as "sementes da ciência" (ideias produtivas dos alunos) em 3 etapas: Gather, Articulate, Apply.
        - Características: Foca no que o aluno acerta, constrói a partir de ideias prévias.
        - Conteúdo Recomendado: Circuitos elétricos, ondas, momento linear, calor, termodinâmica.

        **ESTRATÉGIA 5: Modelagem Matemática com Dados Reais**
        - Descrição: Uso de múltiplas representações (concreta, pictórica, simbólica, gráfica) para ensinar conceitos.
        - Características: Abordagem flexível, promove abstração gradual.
        - Conteúdo Recomendado: Eletromagnetismo, Lei de Faraday, campos, indução eletromagnética.

        **ESTRATÉGIA 6: Instrução por Pares (Peer Instruction)**
        - Descrição: Alunos discutem conceitos em pequenos grupos antes de responder questões conceituais.
        - Características: Engajamento cognitivo, compartilhamento de raciocínio, feedback imediato.
        - Conteúdo Recomendado: Leis de Newton, conservação de energia, eletricidade básica.

        **ESTRATÉGIA 7: Aprendizagem Baseada em Problemas (PBL)**
        - Descrição: Alunos aprendem resolvendo problemas relevantes e contextualizados do mundo real.
        - Características: Trabalho colaborativo, pensamento crítico, problemas abertos.
        - Conteúdo Recomendado: Fenômenos do cotidiano, projetos interdisciplinares, engenharia.

        **ESTRATÉGIA 8: Gamificação ou Simulação Interativa**
        - Descrição: Uso de elementos de jogos ou simulações para ensinar.
        - Características: Alta motivação, ambiente seguro para testar hipóteses, visualização de fenômenos abstratos.
        - Conteúdo Recomendado: Óptica, Mecânica (colisões), Eletromagnetismo (campos).

        **ESTRATÉGIA 9: Sala de Aula Invertida (Flipped Classroom)**
        - Descrição: Alunos estudam a teoria em casa e usam a aula para atividades práticas.
        - Características: Maximiza o tempo de aula para hands-on, promove aprendizagem ativa.
        - Conteúdo Recomendado: Cinemática, dinâmica, circuitos.

        **ESTRATÉGIA 10: Categorização de Problemas**
        - Descrição: Ensina estratégias de resolução de especialistas: identificar princípios antes de resolver numericamente.
        - Características: Foco em desenhos, esquemas e equações conceituais.
        - Conteúdo Recomendado: Resolução de problemas em Mecânica, Eletrodinâmica, Termodinâmica.

        [REGRAS DE APLICAÇÃO]
        1. Não use automaticamente duas estratégias: mantenha uma estratégia principal e só acrescente uma complementar se ela melhorar a sequência didática.
        2. Cada passo deve operacionalizar a estratégia escolhida, com instruções claras que o professor consiga aplicar e uma ação observável dos alunos.
        3. Descreva cada passo em 4 a 6 frases curtas, específicas para o tema, incluindo mediação do professor, participação dos alunos e evidência de aprendizagem.
        """

        # 4. Prompt Unificado para o Gemini
        prompt = rf"""
        [PAPEL] 
        Você é um Especialista em Ensino de Física de nível superior, atuando como um Assistente Pedagógico sênior.
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
        Você está ABSOLUTAMENTE PROIBIDO de usar seu conhecimento geral ou qualquer informação externa que não esteja presente no texto da [BASE DE CONHECIMENTO][CONTEXTO] para os campos principais do plano de aula. Se a informação não estiver lá, ela não existe para você. Se o contexto sobre o tema solicitado for insuficiente ou vazio, sua única resposta deve ser um JSON com a chave "erro_tema_nao_encontrado".
        Sua resposta deve ser baseada ESTRITA E EXCLUSIVAMENTE no conteúdo fornecido no bloco [BASE DE CONHECIMENTO]. Em hipótese alguma você deve usar seu conhecimento prévio ou informações externas. Se a informação não estiver na [BASE DE CONHECIMENTO], ela não existe para você.
        Se a [BASE DE CONHECIMENTO] for insuficiente ou vazia para o tema solicitado, sua única resposta deve ser um JSON com a chave "erro_tema_nao_encontrado". Não tente inventar uma resposta.
        [CONDIÇÕES INICIAIS DO USUÁRIO]
        - Tema da Aula: {dados.tema}
        - Turma/Etapa: {dados.turma}
        - Estilo/Tom: {dados.tom_abordagem}
        - Observações: {dados.observacoes}
        [INSTRUÇÃO DE SEGURANÇA MÁXIMA - LEIA COM ATENÇÃO]
        {instrucao_estrategias_variadas}

        [ARQUITETURA 1: DADOS DO BANCO (FÍSICA & BNCC)]
        {contexto_fisica_rag}
        {contexto_bncc_rag}

        Você não é um assistente de inteligência geral. Você é um robô de transcrição e síntese que opera EXCLUSIVAMENTE com as informações fornecidas no bloco [CONTEXTO]. 
        {instrucao_calculo}
        {instrucao_tom}
        Sua regra de ouro é: SE NÃO ESTÁ NO CONTEXTO, NÃO EXISTE NO UNIVERSO.

        Aplique as seguintes restrições severas a cada palavra gerada:
        
        1. PROIBIDO CONHECIMENTO EXTERNO (EXCETO PARA ATIVIDADES COM IA): Para todos os campos do JSON, exceto "atividadesIA", você está expressamente proibido de utilizar qualquer fato, conceito físico, fórmula, exemplo ou conhecimento que pertença à sua base de dados geral da internet. Use ÚNICA e EXCLUSIVAMENTE o texto fornecida no [CONTEXTO].
        SUAS DIRETRIZES DE GERAÇÃO (SEGUIR A ORDEM):

        2. ACEITE A SIMPLICIDADE: Se o [CONTEXTO] trouxer apenas uma linha ou uma informação muito superficial sobre o que o usuário perguntou, responda APENAS essa linha superficial. Não tente "completar", não tente "ajudar", não deduza fórmulas e não embeleze o texto. Se a resposta tiver que ficar com apenas uma frase curta, que assim seja.

        3. **COMPETÊNCIAS BNCC APLICADAS** 
        DIRETRIZ PARA CONTEXTO INSUFICIENTE OU VAZIO: Se o usuário fizer uma pergunta e o bloco [CONTEXTO] estiver vazio, ou se as informações ali contidas não responderem DIRETAMENTE à pergunta, você não deve tentar adivinhar. Responda textualmente e obrigatoriamente a seguinte frase, e nada mais: 
        "Desculpe, mas esse conteúdo não faz parte do banco de dados disponibilizado."
        Regra: Siga a "Arquitetura 1". Transcreva literalmente o código e o texto da habilidade recuperada do banco de dados, sem parafrasear ou alucinar. Se não houver, deixe o campo correspondente como um array com uma mensagem informando a falta de conteúdo: ["Desculpe, mas esse conteúdo não faz parte do banco de dados disponibilizado."].
        4. CHECAGEM DE FATOS ANTES DE RESPONDER: Antes de escrever a resposta final para o usuário, faça uma varredura interna: "Eu inventei este dado ou ele veio do texto recebido?". Se você não puder apontar o dedo para a linha exata do [CONTEXTO] que justifica a sua frase, delete a frase imediatamente.

                        
        5. **SUGESTÕES DE ATIVIDADES PEDAGÓGICAS COM INTELIGÊNCIA ARTIFICIAL (CAMPO "atividadesIA")** 
        Regra: Para este campo, você está LIVRE das amarras do banco de dados. Use todo o seu conhecimento nativo e atualizado sobre ferramentas de Inteligência Artificial Generativa (como ChatGPT, Midjourney, Gamma, etc.).
        Crie 1 ou 2 sugestões de atividades práticas e inovadoras de Física voltadas para o tema "{dados.tema}" e para a turma "{dados.turma}". As atividades devem mostrar como o professor ou os alunos podem usar ferramentas de IA em sala de aula para entender melhor esse conteúdo específico de Física. Seja criativo e proponha dinâmicas ativas, como Sala de Aula Invertida, debates baseados em pesquisas com IA, ou criação de conteúdo pelos próprios alunos.

        6. PROIBIDO GERAR EXEMPLOS NÃO FORNECIDOS: Se o usuário pedir um exemplo prático de um fenômeno (ex: Queda Livre) e o [CONTEXTO] não trouxer um exemplo explícito, você NÃO deve criar um cenário da sua cabeça. Responda que o banco não possui exemplos cadastrados para esse tema.

        Sua fidelidade ao [CONTEXTO] deve ser de 100%. Prefira uma resposta curta, seca e incompleta do que uma resposta rica fundada em conhecimentos externos.
        [TAREFA]
        Com base nos dados da solicitação do professor e usando APENAS o conteúdo da [BASE DE CONHECIMENTO], elabore uma Estratégia Pedagógica completa e engajadora.
        A resposta final deve ser um único objeto JSON, sem nenhum texto ou explicação antes ou depois.
        
        [INSTRUÇÃO IMPERATIVA PARA BNCC - ZERO ALUCINAÇÃO]
        Analise o plano de aula gerado e o bloco [TEXTO BRUTO DA BNCC RECUPERADO].
        Sua tarefa é identificar e selecionar a habilidade da BNCC (código e texto) que seja MAIS RELEVANTE e PERTINENTE para o plano de aula que você criou.
        Você deve copiar o código (ex: EM13CNT101) e o texto da habilidade escolhida de forma literal, sem alterações.        
        [REVISÃO OBRIGATÓRIA DE MATERIAIS]
        Antes de finalizar o JSON, revise todos os passos da aula que você criou. Crie uma lista contendo APENAS os materiais que foram explicitamente mencionados nas descrições dos passos. O campo "requiredMaterials" no JSON final deve conter SOMENTE os itens dessa lista revisada. Por exemplo, se o professor disponibilizou "trena, cronômetro, bolas de gude", mas você usou apenas a trena e o cronômetro na aula, o campo deve ser `["trena", "cronômetro"]`.

        Se, e somente se, nenhuma das habilidades recuperadas tiver qualquer relação com o tema da aula, então o campo "competenciasBnccAplicadas" deve ser um array com uma mensagem informando a falta de conteúdo: ["Desculpe, mas esse conteúdo não faz parte do banco de dados disponibilizado."].

        RESTRIÇÕES:
        - Não use explicações teóricas densas sem antes dar um exemplo prático do dia a dia.
        - No campo "requiredMaterials", liste APENAS os materiais que serão efetivamente utilizados nas estratégias sugeridas nos passos da aula.
        - Baseie-se APENAS nos contextos da [BASE DE CONHECIMENTO] fornecida.
        - DIVERSIDADE DE SIMULAÇÕES: Ao preencher o campo "simulacaoSugerida", não sugira apenas o PhET Colorado. Sugira o título exato de uma simulação real priorizando a plataforma mais adequada para o tema:
            * Falstad (excelente para Circuitos Elétricos, Ondas e Matemática)
            * Vascak ou SimuFisica (excelentes para Óptica, Eletromagnetismo e Física Moderna) 
            * Walter Fendt (excelente para Mecânica, Dinâmica e Cinemática)
            * Physics Classroom, CK-12 ou Univ-lemans (excelentes para interações gerais)
            * PhET Colorado (use como complemento geral)

        [BASE DE CONHECIMENTO]
        [CONTEÚDO DE FÍSICA]
        {contexto_fisica_rag}
        
        [TEXTO BRUTO DA BNCC RECUPERADO]
        {contexto_bncc_rag}


        {instrucao_calculo}

        {instrucao_tom}

        [DADOS DA SOLICITAÇÃO]
        - TEMA: {dados.tema}
        - FENÔMENO ESPECÍFICO: {dados.fenomeno or 'Não especificado'}
        - TURMA: {dados.turma}
        - RECURSOS DISPONÍVEIS (LISTA EXCLUSIVA): {", ".join(dados.recursos) if dados.recursos else "Nenhum material disponível"}
        - OBSERVAÇÕES DO PROFESSOR: {dados.observacoes if dados.observacoes else "Nenhuma observação adicional fornecida."}

        [DIRETRIZ DE MATERIAIS - REGRA RÍGIDA]
        O usuário selecionou que possui APENAS os seguintes materiais disponíveis em sua escola/laboratório: {", ".join(dados.recursos) if dados.recursos else "Nenhum material disponível"}.
        Ao propor o plano de aula e detalhar as estratégias pedagógicas, você deve, obrigatoriamente, adaptar a aplicação prática do experimento recuperado do Pinecone para utilizar APENAS os materiais que constam nessa lista. Se o experimento original do Pinecone exigir um material que NÃO está na lista, você deve sugerir uma adaptação/substituição usando estritamente os materiais disponíveis informados pelo usuário, mantendo a viabilidade física e pedagógica da atividade.


        [REGRAS DE OURO PARA MATERIAIS E ACESSIBILIDADE]
        1. **EXCLUSIVIDADE DE MATERIAIS:** Você está ESTRITAMENTE PROIBIDO de sugerir qualquer material que não esteja na lista "RECURSOS DISPONÍVEIS". O campo `requiredMaterials` do JSON final deve conter um subconjunto dessa lista.
        2. **CENÁRIO SEM RECURSOS:** Se a lista de "RECURSOS DISPONÍVEIS" estiver vazia ou contiver "Nenhum material", você deve OBRIGATORIAMENTE criar experimentos usando apenas o corpo humano (ex: usar o pulso para medir batimentos, palmas para eco, percepção de equilíbrio, etc.).
        3. **INCLUSÃO E ACESSIBILIDADE:** Em pelo menos um dos passos da aula, inclua uma nota de "Adaptação para Inclusão", sugerindo como a atividade pode ser modificada para alunos com deficiência visual ou motora (ex: usar feedbacks sonoros, texturas, ou descrições verbais detalhadas no lugar de estímulos visuais).

        [REGRAS DE FORMATAÇÃO]
        1. **Estrutura JSON:** O JSON deve seguir exatamente esta estrutura, preenchendo TODOS os campos.
        ```json
        {{
          "title": "Título da Aula sobre {dados.tema}",
          "methodology": "Nome da estratégia pedagógica principal e, se houver, da estratégia complementar.",
          "methodologyDetails": "Justificativa e aplicação da estratégia neste tema e turma: adequação à recomendação, sequência de condução pelo professor, ações dos alunos, recursos utilizados e verificação da aprendizagem.",
          "duration": "Duração Total (Ex: 90 min)",
          "learningObjectives": ["Objetivo 1", "Objetivo 2"],
          "competenciasBnccAplicadas": ["Competência da BNCC relacionada ao tema", "Habilidade da BNCC relacionada ao tema"],
          "requiredMaterials": ["Material 1", "Material 2"],
          "steps": [
            {{
              "time": "Tempo em min",
              "title": "Título do Passo",
              "approach": "Nome da estratégia ou fase da metodologia aplicada neste passo.",
              "description": "Procedimento específico do passo, com organização, recursos permitidos, produto esperado e ligação com a próxima fase.",
              "teacherRole": "Instruções e mediação concretas do professor durante este passo.",
              "studentRole": "Ações observáveis dos alunos e o que devem discutir, registrar, construir ou explicar."
            }}
          ],
          "simulacaoSugerida": {{
            "titulo": "Título amigável para o professor ver na tela (ex: 'Gráficos de Posição, Velocidade e Aceleração')",
            "termoBusca": "Apenas 2 ou 3 palavras-chave em minúsculo para o buscador encontrar o site correto (ex: 'fendt aceleracao' ou 'simufisica optica' ou 'falstad circuitos')"
          }},
          "youtubeVideo": {{
            "titulo": "Título descritivo do vídeo (ex: 'Leis de Newton por Walter Lewin')"
          }}
          ,
          "atividadesIA": [
            {{
              "titulo": "Título da atividade com IA (Ex: 'Criando Problemas com IA')", "descricao": "Descrição da atividade."
            }}
          ]
        }}
        
        2. **Fórmulas LaTeX (Regra Crítica):** Ao usar qualquer fórmula da [BASE DE CONHECIMENTO], mantenha a sintaxe LaTeX original (ex: $v_m = \frac{{\Delta s}}{{\Delta t}}$ ou $$E=mc^2$$). Esta regra é essencial para a renderização correta no frontend.
        """
        

        print("🧠 IA gerando plano final...")
        resposta = await _gerar_conteudo_gemini_com_retry(
            model=MODELO_GERACAO_GEMINI,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "temperature": 0.0,
            },
        )
        
        # --- CORREÇÃO CIRÚRGICA PARA LATEX ---
        # A resposta da IA (resposta.text) é uma string JSON. Fórmulas LaTeX (ex: "\frac")
        # podem conter sequências como `\f` que são interpretadas como caracteres de escape
        # inválidos pelo `json.loads`. A solução é usar uma expressão regular para (raw string)
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
        # A lógica de busca de simulação foi movida para uma função auxiliar para simplificar
        if plano_json.get("simulacaoSugerida"):
            await buscar_e_anexar_link_simulacao(plano_json)
                    
        if "videoYoutube" not in plano_json:
            plano_json["videoYoutube"] = None

        if PULAR_SALVAMENTO_PLANOS:
            print("ℹ️ Persistência desativada no modo de desenvolvimento.")
            plano_json["planId"] = None
        else:
            criado_em = datetime.now(timezone.utc).isoformat()
            registro_plano = {
                "plano": plano_json,
                "tema": dados.tema,
                "nota": None,
                "criado_em": criado_em,
                "avaliado_em": None,
            }
            plano_firestore = await run_in_threadpool(_criar_plano_firestore, registro_plano)
            plano_json["planId"] = plano_firestore["id"]

        print("✅ Tudo pronto! Enviando para o professor.")
        return plano_json
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao gerar plano: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno ao gerar plano: {e}",
        ) from e

async def buscar_e_anexar_link_simulacao(plano_json: dict):
    """Busca o link de uma simulação sugerida e anexa ao JSON."""
    simulacao = plano_json.get("simulacaoSugerida")
    if not simulacao or not isinstance(simulacao, dict):
        return

    titulo_sim = simulacao.get("titulo", "")
    termo_busca = simulacao.get("termoBusca", "")

    if not termo_busca:
        titulo_limpo = re.sub(r'[-():"\'\[\]]', ' ', titulo_sim)
        termo_busca = " ".join(titulo_limpo.split()[:2])

    texto_analise = (titulo_sim + " " + termo_busca).lower()
    
    sites_vip = {
        "walter fendt": ("walter-fendt.de", "https://www.walter-fendt.de/html5/phbr/"),
        "phet": ("phet.colorado.edu", "https://phet.colorado.edu/pt_BR/simulations/filter?type=html5"),
        "vascak": ("vascak.cz", "https://www.vascak.cz/physicsanimations.php?l=pt"),
        "simufisica": ("simufisica.com", "https://simufisica.com/"),
        "falstad": ("falstad.com", "https://falstad.com/mathphysics.html"),
        "lemans": ("univ-lemans.fr", "http://ressources.univ-lemans.fr/AccesLibre/UM/Pedago/physique/02/index.html"),
        "ck-12": ("interactives.ck12.org", "https://interactives.ck12.org/simulations/physics.html"),
        "classroom": ("physicsclassroom.com", "https://www.physicsclassroom.com/interactive-physics"),
    }

    dominio_alvo, link_fallback = None, "https://phet.colorado.edu/pt_BR/"

    for keyword, (domain, fallback) in sites_vip.items():
        if keyword in texto_analise:
            dominio_alvo, link_fallback = domain, fallback
            break

    query_sim = f"site:{dominio_alvo} {termo_busca}" if dominio_alvo else f"{termo_busca} simulação física"
    print(f"🔎 Varrendo '{dominio_alvo or 'Web'}' atrás de: '{termo_busca}'")

    link_final = None
    try:
        print(f"⚡️ Executando busca no DuckDuckGo: '{query_sim}'")
        ddgs = DDGS()
        # A versão atual do pacote removeu o método assíncrono atext.
        # Usamos run_in_threadpool para não bloquear o event loop.
        resultados_sim = await run_in_threadpool(ddgs.text, query_sim, max_results=1)
        
        if resultados_sim:
            link_final = resultados_sim[0].get('href')
            print(f"🌟 LINK DIRETO EXTRAÍDO: {link_final}")
    except Exception as e:
        print(f"⚠️ DuckDuckGo recusou a conexão ou deu timeout: {e}")

    if not link_final:
        print("🔄 Usando link de fallback do diretório VIP.")
        link_final = link_fallback

    plano_json["simulacaoSugerida"]["url"] = link_final

@app.post("/avaliar-estrategia")
async def avaliar_estrategia(dados: AvaliacaoRequest):
    """
    Atualiza no Firestore a avaliação do plano correspondente.
    """
    if PULAR_SALVAMENTO_PLANOS:
        print("ℹ️ Avaliação recebida em modo de desenvolvimento; não será salva no Firestore.")
        return {
            "status": "sucesso",
            "persistida": False,
            "mensagem": "Avaliação recebida para teste; não foi salva no Firestore.",
        }

    try:
        await run_in_threadpool(_verificar_firestore)
        print(f"✍️ Recebendo avaliação de {dados.nota} estrelas para o tema '{dados.tema}'...")

        plano_id = dados.plano.get("planId")
        plano = {key: value for key, value in dados.plano.items() if key != "planId"}
        avaliado_em = datetime.now(timezone.utc).isoformat()

        if plano_id:
            registro_plano = await run_in_threadpool(_obter_plano_firestore, plano_id)
            registro_plano.update({
                "plano": plano,
                "tema": dados.tema,
                "nota": dados.nota,
                "avaliado_em": avaliado_em,
            })
            await run_in_threadpool(_atualizar_plano_firestore, plano_id, registro_plano)
        else:
            registro_plano = {
                "plano": plano,
                "tema": dados.tema,
                "nota": dados.nota,
                "criado_em": avaliado_em,
                "avaliado_em": avaliado_em,
            }
            await run_in_threadpool(_criar_plano_firestore, registro_plano)

        print("✅ Plano e avaliação salvos no Firestore.")
        return {"status": "sucesso", "persistida": True, "mensagem": "Obrigado por sua contribuição!"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao salvar avaliação no Firestore: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao salvar a avaliação no Firestore: {e}",
        ) from e

@app.get("/melhores-estrategias")
async def get_melhores_estrategias():
    """
    Recupera do Firestore os 10 planos mais bem avaliados, com nota mínima 3.
    """
    try:
        await run_in_threadpool(_verificar_firestore)
        print("🏆 Buscando planos avaliados no Firestore...")
        registros = await run_in_threadpool(_listar_planos_firestore)
        estrategias = []
        for item in registros:
            try:
                registro = item["registro"]
                nota = int(registro.get("nota") or 0)
                if nota >= 3 and isinstance(registro.get("plano"), dict):
                    estrategias.append({
                        "plano": registro["plano"],
                        "nota": nota,
                        "tema": registro.get("tema", "Plano de aula"),
                        "timestamp": registro.get("avaliado_em") or registro.get("criado_em"),
                    })
            except Exception as e:
                print(f"⚠️ Não foi possível ler o plano '{item.get('id')}': {e}")

        estrategias.sort(
            key=lambda item: (item["nota"], item.get("timestamp") or ""),
            reverse=True,
        )
        return estrategias[:10]
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao buscar planos no Firestore: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar planos no Firestore: {e}") from e

import threading
import time
import webbrowser

# Defina a porta do seu servidor FastAPI
PORTA = 8000
# Altere para a URL correta se seu gerador rodar em outra porta (ex: 8501 se for Streamlit)
URL_GERADOR = f"http://127.0.0.1:{PORTA}/docs"


def abrir_navegador():
    # Aguarda 1.5 segundo para garantir que o Uvicorn subiu completamente
    time.sleep(1.5)
    print(f"🚀 Abrindo a interface no navegador: {URL_GERADOR}")
    webbrowser.open(URL_GERADOR)


if __name__ == "__main__":
    # Inicia a thread responsável por disparar o navegador
    threading.Thread(target=abrir_navegador, daemon=True).start()

    # Executa o servidor FastAPI com Uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=PORTA, reload=True)