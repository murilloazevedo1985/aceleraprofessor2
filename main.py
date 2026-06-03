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
    
    model = genai.GenerativeModel('gemini-2.5-flash')
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
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = await model.generate_content_async(
            [prompt, imagem_pagina],
            generation_config={"temperature": 0.0}
        )

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
            
            res_emb_bncc = await genai.embed_content_async(
                model="models/gemini-embedding-2",
                content=texto_busca_bncc,
                task_type="retrieval_query"
            )
            vetor_busca_bncc = res_emb_bncc['embedding']

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

        # 3. BUSCA DE CONTEÚDO TÉCNICO (Sempre via Pinecone)
        print("   - Buscando conteúdo de Física no Pinecone...")
        res_emb_fisica = await genai.embed_content_async(
            model="models/gemini-embedding-2",
            content=texto_busca,
            task_type="retrieval_query"
        )
        vetor_busca_fisica = res_emb_fisica['embedding']

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

        # 4. Prompt Unificado para o Gemini
        prompt = rf"""
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
        [CONDIÇÕES INICIAIS DO USUÁRIO]
        - Tema da Aula: {dados.tema}
        - Turma/Etapa: {dados.turma}
        - Estilo/Tom: {dados.tom_abordagem}
        - Observações: {dados.observacoes}
        [INSTRUÇÃO DE SEGURANÇA MÁXIMA - LEIA COM ATENÇÃO]
        [ARQUITETURA 1: DADOS DO BANCO (FÍSICA & BNCC)]
        {contexto_fisica_rag}
        {contexto_bncc_rag}

        Você não é um assistente de inteligência geral. Você é um robô de transcrição e síntese que opera EXCLUSIVAMENTE com as informações fornecidas no bloco [CONTEXTO]. 
        {instrucao_calculo}
        {instrucao_tom}
        Sua regra de ouro é: SE NÃO ESTÁ NO CONTEXTO, NÃO EXISTE NO UNIVERSO.

        Aplique as seguintes restrições severas a cada palavra gerada:
        [ARQUITETURA 2: CONHECIMENTO GERAL E CRIATIVO DA INTERNET]
        (Para uso exclusivo no campo "atividadesIA")

        1. PROIBIDO CONHECIMENTO EXTERNO: Você está expressamente proibido de utilizar qualquer fato, conceito físico, fórmula, exemplo ou conhecimento que pertença à sua base de dados geral da internet. Use ÚNICA e EXCLUSIVAMENTE o texto fornecida no [CONTEXTO].
        SUAS DIRETRIZES DE GERAÇÃO (SEGUIR A ORDEM):

        2. ACEITE A SIMPLICIDADE: Se o [CONTEXTO] trouxer apenas uma linha ou uma informação muito superficial sobre o que o usuário perguntou, responda APENAS essa linha superficial. Não tente "completar", não tente "ajudar", não deduza fórmulas e não embeleze o texto. Se a resposta tiver que ficar com apenas uma frase curta, que assim seja.

        3. **COMPETÊNCIAS BNCC APLICADAS**
        DIRETRIZ PARA CONTEXTO INSUFICIENTE OU VAZIO: Se o usuário fizer uma pergunta e o bloco [CONTEXTO] estiver vazio, ou se as informações ali contidas não responderem DIRETAMENTE à pergunta, você não deve tentar adivinhar. Responda textualmente e obrigatoriamente a seguinte frase, e nada mais: 
        "Desculpe, mas esse conteúdo não faz parte do banco de dados disponibilizado."
        Regra: Siga a "Arquitetura 1". Transcreva literalmente o código e o texto da habilidade recuperada do banco de dados, sem parafrasear ou alucinar. Se não houver, deixe o campo correspondente como um array com uma mensagem informando a falta de conteúdo: ["Desculpe, mas esse conteúdo não faz parte do banco de dados disponibilizado."].
              4. CHECAGEM DE FATOS ANTES DE RESPONDER: Antes de escrever a resposta final para o usuário, faça uma varredura interna: "Eu inventei este dado ou ele veio do texto recebido?". Se você não puder apontar o dedo para a linha exata do [CONTEXTO] que justifica a sua frase, delete a frase imediatamente.

                        
        5. **SUGESTÕES DE ATIVIDADES PEDAGÓGICAS COM INTELIGÊNCIA ARTIFICIAL (CAMPO "atividadesIA")**
        Regra: Siga a "Arquitetura 2". Aqui você está LIVRE das amarras do banco de dados. Use todo o seu conhecimento nativo e atualizado sobre ferramentas de Inteligência Artificial Generativa (como ChatGPT, Midjourney, Gamma, PhET integrado à IA, etc.).
        Crie 2 ou 3 sugestões de atividades práticas e inovadoras de Física voltadas para o tema "{dados.tema}" e para a turma "{dados.turma}". As atividades devem mostrar como o professor ou os alunos podem usar ferramentas de IA em sala de aula para entender melhor esse conteúdo específico de Física.
        Se o contexto da "Arquitetura 1" não contiver nenhuma menção explícita a 'inteligência artificial', 'IA', 'chatbot' ou 'ferramentas generativas', o campo 'atividadesIA' no JSON de resposta DEVE ser um array com uma mensagem informando a falta de conteúdo: ["Desculpe, mas esse conteúdo não faz parte do banco de dados disponibilizado."]. Não invente atividades com IA se o material não as sugerir.

        5. PROIBIDO GERAR EXEMPLOS NÃO FORNECIDOS: Se o usuário pedir um exemplo prático de um fenômeno (ex: Queda Livre) e o [CONTEXTO] não trouxer um exemplo explícito, você NÃO deve criar um cenário da sua cabeça. Responda que o banco não possui exemplos cadastrados para esse tema.

        Sua fidelidade ao [CONTEXTO] deve ser de 100%. Prefira uma resposta curta, seca e incompleta do que uma resposta rica fundada em conhecimentos externos.
        [TAREFA]
        Com base nos dados da solicitação do professor e usando APENAS o conteúdo da [BASE DE CONHECIMENTO], elabore uma Estratégia Pedagógica completa e engajadora.
        A resposta final deve ser um único objeto JSON, sem nenhum texto ou explicação antes ou depois.

        [INSTRUÇÃO IMPERATIVA PARA BNCC - ZERO ALUCINAÇÃO]
        Analise o plano de aula gerado e o bloco [TEXTO BRUTO DA BNCC RECUPERADO].
        Sua tarefa é identificar e selecionar a habilidade da BNCC (código e texto) que seja MAIS RELEVANTE e PERTINENTE para o plano de aula que você criou.
        Você deve copiar o código (ex: EM13CNT101) e o texto da habilidade escolhida de forma literal, sem alterações.
        Se, e somente se, nenhuma das habilidades recuperadas tiver qualquer relação com o tema da aula, então o campo "competenciasBnccAplicadas" deve ser um array com uma mensagem informando a falta de conteúdo: ["Desculpe, mas esse conteúdo não faz parte do banco de dados disponibilizado."].

        RESTRIÇÕES:
        - Não use explicações teóricas densas sem antes dar um exemplo prático do dia a dia.
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
          "competenciasBnccAplicadas": ["Competência da BNCC relacionada ao tema", "Habilidade da BNCC relacionada ao tema"],
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
        

        # --- INSTRUÇÃO ADICIONAL PARA ATIVIDADES DE IA ---
        prompt += "\n[REGRA PARA ATIVIDADES COM IA]\nSe o [CONTEÚDO DE FÍSICA] não contiver nenhuma menção explícita a 'inteligência artificial', 'IA', 'chatbot' ou 'ferramentas generativas', o campo 'atividadesIA' no JSON de resposta DEVE ser um array com uma mensagem informando a falta de conteúdo: ['Desculpe, mas esse conteúdo não faz parte do banco de dados disponibilizado.']. Não invente atividades com IA se o material não as sugerir.\n"

        print("🧠 IA gerando plano final...")
        model = genai.GenerativeModel('gemini-2.5-flash') # Using the latest flash model
        resposta = await model.generate_content_async(
            prompt,
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.0
            }
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
