
import os
import io
from dotenv import load_dotenv
import time
from pinecone import Pinecone # Adeus ChromaDB, Olá Pinecone!
import google.genai as genai
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import pypdf
import docx
from PIL import Image
import pytesseract
from pdf2image import convert_from_path

# Carrega as variáveis de ambiente.
# Procura primeiro por .env.local (ideal para desenvolvimento) e depois por .env.
load_dotenv(dotenv_path=".env.local")
load_dotenv() # Carrega .env se .env.local não for encontrado ou para variáveis base
# --- 1. CONFIGURAÇÕES E CREDENCIAIS ---
CHAVE_API_GEMINI = os.getenv("GEMINI_API_KEY")
CHAVE_API_PINECONE = os.getenv("PINECONE_API_KEY")
NOME_INDEX_PINECONE = "aulas-fisica"
ID_PASTA_TESTE_DRIVE = "1jZztziuVQ8e7jJqeBAUXiNP2XQT6fcCJ"
CAMINHO_JSON_CREDENCIAIS = "credenciais.json"
POPPLER_PATH = os.getenv("POPPLER_PATH") # NOVO: Caminho para o Poppler

if not CHAVE_API_PINECONE or not CHAVE_API_GEMINI:
    raise ValueError("Certifique-se de que PINECONE_API_KEY e GEMINI_API_KEY estão definidas no seu arquivo .env")


genai.api_key = CHAVE_API_GEMINI

# --- 2. CONEXÃO COM O DRIVE (Permanece igual) ---
try:
    creds = service_account.Credentials.from_service_account_file(
        CAMINHO_JSON_CREDENCIAIS,
        scopes=['https://www.googleapis.com/auth/drive.readonly']
    )
    drive_service = build('drive', 'v3', credentials=creds)
    print("✅ Conectado ao Google Drive.")
except Exception as e:
    print(f"❌ Erro nas Credenciais do Drive: {e}")
    exit()

def obter_todos_arquivos_da_hierarquia(folder_id):
    arquivos = []
    query = f"'{folder_id}' in parents and trashed = false"
    try:
        results = drive_service.files().list(q=query, fields="files(id, name, mimeType)").execute()
        itens = results.get('files', [])
        for item in itens:
            if item['mimeType'] == 'application/vnd.google-apps.folder':
                arquivos.extend(obter_todos_arquivos_da_hierarquia(item['id']))
            else:
                arquivos.append(item)
        return arquivos
    except Exception as e:
        print(f"⚠️ Erro ao listar pasta: {e}")
        return []

# --- 4. FUNÇÃO DE FATIAR O TEXTO (CHUNKING) ---
def quebrar_texto(texto, tamanho_pedaco=1500, sobreposicao=250):
    pedacos = []
    for i in range(0, len(texto), tamanho_pedaco - sobreposicao):
        pedacos.append(texto[i:i + tamanho_pedaco])
    return pedacos

# --- 3. O MOTOR DE EXTRAÇÃO E ENVIO PARA NUVEM ---
def construir_banco():
    print("⚙️ Conectando ao Banco de Dados Pinecone na Nuvem...")
    pc = Pinecone(api_key=CHAVE_API_PINECONE)
    index = pc.Index(NOME_INDEX_PINECONE)
    prompt = """
                        Você é um extrator de alta precisão. Transcreva o conteúdo desta página de livro de física para Markdown.
                        REGRA CRUCIAL: Converta todas as fórmulas matemáticas e físicas (mesmo as que são figuras/imagens) 
                        para a notação LaTeX apropriada usando $ para equações na linha ou $$ para equações isoladas.
                        Você é um assistente pedagógico de física altamente preciso. 
                        Analise visualmente a imagem desta página de livro e forneça um resumo altamente detalhado, 
                        contendo todos os conceitos explicados, exemplos práticos citados e, PRINCIPALMENTE, 
                        transcreva todas as equações matemáticas e físicas utilizando a notação LaTeX apropriada (usando $ ou $$).
                        REGRAS CRUCIAIS:
                        1. NÃO faça uma cópia/transcrição literal linha por linha do texto para evitar problemas de direitos autorais. Em vez disso, REESCREVA as explicações didáticas com suas próprias palavras mantendo o rigor científico.
                        2. Mantenha os valores numéricos, variáveis e fórmulas exatamente como estão na imagem.
                        
                        Você é um engenheiro de dados sênior especialista em Pinecone, processamento de PDFs e embeddings. Preciso refatorar o código do meu arquivo 'criar_banco.py' para implementar a estratégia de "Enriquecimento de Contexto por Sinônimos" nos documentos da BNCC, corrigindo um problema de falta de similaridade semântica.

                        O problema atual: Os professores buscam termos como "velocidade média", mas o PDF da BNCC usa termos macro como "movimentos de objetos na Terra". A busca falha porque a palavra "velocidade" não está escrita no texto da habilidade.

                        Preciso que você altere o loop de processamento de texto do 'criar_banco.py' para agir da seguinte forma EXCLUSIVAMENTE quando o arquivo for da BNCC (tipo == "diretriz_bncc"):

                        1. ANTES DE GERAR O EMBEDDING: Para cada pedaço (chunk) de texto extraído do PDF da BNCC, faça uma chamada interna rápida para a API do Gemini (usando o modelo gemini-2.5-flash) com o seguinte prompt de apoio:
                        \"\"\"
                        Analise o seguinte trecho de uma diretriz/habilidade da BNCC e identifique quais são os conceitos técnicos, tópicos específicos, fórmulas ou matérias da FÍSICA e da CIÊNCIA (ex: velocidade média, MRU, aceleração, calorimetria, óptica, circuitos elétricos, etc.) que estão implicitamente ou explicitamente relacionados a ele. Devolva APENAS uma linha com esses termos técnicos separados por vírgula.
                        Trecho: {texto_do_chunk_atual}
                        \"\"\"

                        2. CONCATENAÇÃO DOS SINÔNIMOS: Pegue a string de termos técnicos devolvida pelo Gemini e concatene-a no final do texto do chunk original, criando uma seção invisível de busca. Exemplo:
                        texto_enriquecido = texto_original + "\n[Termos Técnicos Associados: " + termos_da_ia + "]"

                        3. GERAÇÃO DE EMBEDDING E UPSERT: O embedding (genai.embed_content) deve ser gerado a partir desse 'texto_enriquecido'. No entanto, armazene dentro do metadado "texto" o conteúdo já enriquecido, garantindo que o Pinecone guarde as palavras-chave para futuras buscas por similaridade.

                        4. PRESERVAÇÃO: Mantenha as tags de metadados existentes ("tipo": "diretriz_bncc", "fonte", "etapa"). Os arquivos comuns de Física (Halliday) não devem passar por esse processo de enriquecimento, apenas os da BNCC.

                        Refatore o código selecionado para implementar essa lógica de forma limpa, tratando possíveis erros de requisição na chamada interna do Gemini.

                        """

    arquivos = obter_todos_arquivos_da_hierarquia(ID_PASTA_TESTE_DRIVE)
    print(f"DEBUG: O ID da pasta que estou buscando é: {ID_PASTA_TESTE_DRIVE}")
    print(f"DEBUG: Lista bruta de arquivos retornada: {arquivos}")
    
    print(f"🔎 Encontrados {len(arquivos)} arquivos para indexar.")

    for arq in arquivos:
        print(f"\n📂 Lendo e processando: {arq['name']}...")
        try:
            request = drive_service.files().get_media(fileId=arq['id'])
            file_buffer = io.BytesIO()
            downloader = MediaIoBaseDownload(file_buffer, request)
            done = False
            while not done:
                _, done = downloader.next_chunk()
            file_buffer.seek(0)
            
            conteudo_arquivo = ""

            if "pdf" in arq['mimeType']:
                # 1. Tenta ler o texto digital do PDF de forma tradicional (Rápido e Grátis)
                try:
                    reader = pypdf.PdfReader(file_buffer)
                    conteudo_arquivo = "\n".join([p.extract_text() for p in reader.pages if p.extract_text()])
                except Exception as e_pdf:
                    print(f"⚠️ O leitor tradicional falhou devido a um erro de formatação no PDF: {e_pdf}")
                    conteudo_arquivo = "" # Força a ativação do modo visual abaixo
                
                # 2. SE FALHAR ou se o texto vier vazio (PDF Escaneado/Imagens/Corrompido), ativa a Visão do Gemini
                if not conteudo_arquivo.strip():
                    print(f"📸 Ativando OCR Visual com Gemini para '{arq['name']}'...")
                    
                    # Salva o arquivo temporariamente apenas para o convert_from_path conseguir ler
                    with open("temp_processamento.pdf", "wb") as f:
                        f.write(file_buffer.getbuffer())
                    
                    # Converte as páginas do PDF em imagens usando o Poppler do Windows (Barras normais / evitam erros)
                    paginas = convert_from_path("temp_processamento.pdf", dpi=130, poppler_path=POPPLER_PATH)
                    
                    model = genai.GenerativeModel('gemini-2.5-flash')
                    
                    # Executa a análise visual página por página
                    for i, pagina in enumerate(paginas):
                        print(f"👁️ Gemini analisando visualmente a página {i+1} de {len(paginas)}...")
                        
                        import tempfile
                        
                        # Criamos um nome único e absoluto na pasta temporária do Windows
                        nome_imagem = f"temp_pag_{arq['id']}_{i}.png"
                        caminho_imagem = os.path.join(tempfile.gettempdir(), nome_imagem)
                        
                        # Salva a página como imagem
                        pagina.save(caminho_imagem, 'PNG')
                        
                        # Pequena pausa de segurança para o Windows garantir a gravação física no disco
                        time.sleep(0.5)
                        
                        if not os.path.exists(caminho_imagem):
                            time.sleep(1)
                        
                        try:
                            # Faz o upload e envia para o Gemini
                            imagem_upload = genai.upload_file(path=caminho_imagem)
                            response = model.generate_content([prompt, imagem_upload])
                            conteudo_arquivo += response.text + "\n"
                        finally:
                            # O bloco 'finally' garante a limpeza mesmo se a API do Gemini falhar
                            if os.path.exists(caminho_imagem):
                                os.remove(caminho_imagem)
                    
                    # Limpa o arquivo PDF temporário após processar todas as páginas
                    if os.path.exists("temp_processamento.pdf"):
                        os.remove("temp_processamento.pdf")

            elif "document" in arq['mimeType'] or "officedocument.wordprocessingml" in arq['mimeType']:
                doc = docx.Document(file_buffer)
                conteudo_arquivo = "\n".join([para.text for para in doc.paragraphs])
            elif "text" in arq['mimeType']:
                conteudo_arquivo = file_buffer.read().decode('utf-8')
            elif "image" in arq['mimeType'] or "jpeg" in arq['mimeType']:
                print(f"📸 Foto detectada! Ativando leitura visual do Gemini para '{arq['name']}'...")
                
                # 1. Salva a imagem temporariamente na pasta do Windows para o upload
                with open("temp_foto.jpg", "wb") as f:
                    f.write(file_buffer.getbuffer())
                
                try:
                    # 2. Inicializa o modelo do Gemini
                    model = genai.GenerativeModel('gemini-2.5-flash')
                    
                    # 3. Faz o upload da foto para a API do Google
                    imagem_upload = genai.upload_file(path="temp_foto.jpg")
                    
                    # 4. O Gemini lê a foto usando o prompt pedagógico que você já criou
                    response = model.generate_content([prompt, imagem_upload])
                    conteudo_arquivo = response.text
                    
                finally:
                    # 5. Garante que a foto temporária seja apagada do seu computador
                    if os.path.exists("temp_foto.jpg"):
                        os.remove("temp_foto.jpg")

            # --- O RESTANTE DO SEU CÓDIGO SE SEGUE IGUAL, SEM ALTERAÇÕES ---
            if conteudo_arquivo.strip():
                print(f"✂️ Fatiando texto de '{arq['name']}'...")
                pedacos = quebrar_texto(conteudo_arquivo)
                
                # --- LÓGICA DE IDENTIFICAÇÃO DO TIPO DE CONTEÚDO ---
                # Por padrão, todo conteúdo é de física.
                etapa_ensino = "não aplicável" # Padrão
                tipo_conteudo = "conteudo_fisica"
                # Se o nome do arquivo contiver "bncc", mudamos a etiqueta.
                nome_arq_lower = arq['name'].lower()
                if "bncc" in nome_arq_lower:
                    tipo_conteudo = "diretriz_bncc"
                    if "fundamental" in nome_arq_lower:
                        etapa_ensino = "Ensino Fundamental"
                    elif "medio" in nome_arq_lower or "médio" in nome_arq_lower:
                        etapa_ensino = "Ensino Médio"
                    else:
                        etapa_ensino = "Geral" # Se não especificar, é geral
                
                print(f"🧠 Transformando textos em vetores via Gemini e enviando para o Pinecone...")
                vetores_para_pinecone = []
                
                for i, pedaco in enumerate(pedacos):
                    texto_final_para_embedding = pedaco
                    
                    # --- ENRIQUECIMENTO DE CONTEXTO PARA BNCC ---
                    if tipo_conteudo == "diretriz_bncc":
                        print(f"    - Enriquecendo chunk {i+1} da BNCC com sinônimos via IA...")
                        try:
                            prompt_enriquecimento = f"""
                            Analise o seguinte trecho de uma diretriz/habilidade da BNCC e identifique quais são os conceitos técnicos, tópicos específicos, fórmulas ou matérias da FÍSICA e da CIÊNCIA (ex: velocidade média, MRU, aceleração, calorimetria, óptica, circuitos elétricos, etc.) que estão implicitamente ou explicitamente relacionados a ele. Devolva APENAS uma linha com esses termos técnicos separados por vírgula.
                            Trecho: {pedaco}
                            """
                            modelo_flash = genai.GenerativeModel('gemini-2.5-flash')
                            resposta_ia = modelo_flash.generate_content(prompt_enriquecimento)
                            termos_da_ia = resposta_ia.text.strip()
                            
                            if termos_da_ia:
                                texto_final_para_embedding = pedaco + f"\n[Termos Técnicos Associados: {termos_da_ia}]"
                                print(f"      - Termos adicionados: {termos_da_ia}")
                        except Exception as e_gemini:
                            print(f"    ⚠️ Erro na chamada interna do Gemini para enriquecimento: {e_gemini}")

                    resposta_emb = genai.embed_content(
                        model="models/gemini-embedding-2",
                        content=texto_final_para_embedding, # Usa o texto enriquecido para o embedding
                        task_type="retrieval_document"
                    )
                    
                    vetores_para_pinecone.append({
                        "id": f"{arq['id']}_parte_{i}",
                        "values": resposta_emb['embedding'],
                        "metadata": {
                            "fonte": arq['name'], 
                            "texto": texto_final_para_embedding, # Salva o texto já enriquecido no metadata
                            "tipo": tipo_conteudo, # <-- ETIQUETA DINÂMICA: 'conteudo_fisica' ou 'diretriz_bncc'
                            "etapa": etapa_ensino # <-- NOVA ETIQUETA: 'Ensino Médio', 'Ensino Fundamental', etc.
                        } 
                    })
                    time.sleep(1) # Mantém o sleep para não sobrecarregar a API
                
                if vetores_para_pinecone:
                    index.upsert(vectors=vetores_para_pinecone)
                    print(f"✅ Arquivo '{arq['name']}' salvo na nuvem com sucesso!")
            else:
                print(f"⚠️ Nenhum texto extraído de '{arq['name']}'.")

        except Exception as e:
            print(f"❌ Erro ao processar '{arq['name']}': {e}")

# --- PONTO DE PARTIDA: EXECUTA O SCRIPT ---
if __name__ == "__main__":
    construir_banco()
    print("\n🎉 BANCO DE DADOS CONSTRUÍDO COM SUCESSO!")