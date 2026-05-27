
import os
import io
from dotenv import load_dotenv
import time
from pinecone import Pinecone # Adeus ChromaDB, Olá Pinecone!
import google.generativeai as genai
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import pypdf
import docx
from PIL import Image
import pytesseract
from pdf2image import convert_from_path

# --- SOLUÇÃO ROBUSTA PARA ENCONTRAR O .ENV ---
# Constrói o caminho absoluto para o arquivo .env na mesma pasta do script
caminho_env = os.path.join(os.path.dirname(__file__), '.env')

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv(dotenv_path=caminho_env)

# --- 1. CONFIGURAÇÕES E CREDENCIAIS ---
CHAVE_API_GEMINI = os.getenv("GEMINI_API_KEY")
CHAVE_API_PINECONE = os.getenv("PINECONE_API_KEY")
NOME_INDEX_PINECONE = "aulas-fisica"
ID_PASTA_TESTE_DRIVE = "1jZztziuVQ8e7jJqeBAUXiNP2XQT6fcCJ"
CAMINHO_JSON_CREDENCIAIS = "credenciais.json"

if not CHAVE_API_PINECONE or not CHAVE_API_GEMINI:
    raise ValueError("Certifique-se de que PINECONE_API_KEY e GEMINI_API_KEY estão definidas no seu arquivo .env")


genai.configure(api_key=CHAVE_API_GEMINI)

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
                    caminho_poppler = "C:/Users/Murilo/Downloads/Release-26.02.0-0/poppler-26.02.0/Library/bin"
                    paginas = convert_from_path("temp_processamento.pdf", dpi=130, poppler_path=caminho_poppler)
                    
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
                
                print(f"🧠 Transformando textos em vetores via Gemini e enviando para o Pinecone...")
                vetores_para_pinecone = []
                
                for i, pedaco in enumerate(pedacos):
                    resposta_emb = genai.embed_content(
                        model="models/gemini-embedding-2",
                        content=pedaco,
                        task_type="retrieval_document"
                    )
                    
                    vetores_para_pinecone.append({
                        "id": f"{arq['id']}_parte_{i}",
                        "values": resposta_emb['embedding'],
                        "metadata": {"fonte": arq['name'], "texto": pedaco} 
                    })
                    time.sleep(1)
                
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