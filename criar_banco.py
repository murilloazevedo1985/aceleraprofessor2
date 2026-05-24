
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

def quebrar_texto(texto, tamanho_pedaco=1000, sobreposicao=200):
    pedacos = []
    for i in range(0, len(texto), tamanho_pedaco - sobreposicao):
        pedacos.append(texto[i:i + tamanho_pedaco])
    return pedacos

# --- 3. O MOTOR DE EXTRAÇÃO E ENVIO PARA NUVEM ---
def construir_banco():
    print("⚙️ Conectando ao Banco de Dados Pinecone na Nuvem...")
    pc = Pinecone(api_key=CHAVE_API_PINECONE)
    index = pc.Index(NOME_INDEX_PINECONE)

    arquivos = obter_todos_arquivos_da_hierarquia(ID_PASTA_TESTE_DRIVE)
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
                reader = pypdf.PdfReader(file_buffer)
                conteudo_arquivo = "\n".join([p.extract_text() for p in reader.pages if p.extract_text()])
            elif "document" in arq['mimeType'] or "officedocument.wordprocessingml" in arq['mimeType']:
                doc = docx.Document(file_buffer)
                conteudo_arquivo = "\n".join([para.text for para in doc.paragraphs])
            elif "text" in arq['mimeType']:
                conteudo_arquivo = file_buffer.read().decode('utf-8')
            elif "image" in arq['mimeType']:
                img = Image.open(file_buffer)
                conteudo_arquivo = pytesseract.image_to_string(img, lang='por')

            if conteudo_arquivo.strip():
                print(f"✂️ Fatiando texto de '{arq['name']}'...")
                pedacos = quebrar_texto(conteudo_arquivo)
                
                print(f"🧠 Transformando textos em vetores via Gemini e enviando para o Pinecone...")
                vetores_para_pinecone = []
                
                for i, pedaco in enumerate(pedacos):
                    # 1. O Gemini transforma o pedaço em 768 números
                    resposta_emb = genai.embed_content(
                        model="models/gemini-embedding-2", # Modelo de embedding mais recente e recomendado
                        content=pedaco,
                        task_type="retrieval_document"
                    )
                    
                    # 2. Preparamos o pacote (ID + Números + Metadados com o texto original)
                    vetores_para_pinecone.append({
                        "id": f"{arq['id']}_parte_{i}",
                        "values": resposta_emb['embedding'],
                        "metadata": {"fonte": arq['name'], "texto": pedaco} 
                    })
                    time.sleep(1) # Pausa obrigatória para o Google não nos bloquear
                
                # 3. Envia o pacote todo para o Pinecone de uma vez
                if vetores_para_pinecone:
                    index.upsert(vectors=vetores_para_pinecone)
                    print(f"✅ Arquivo '{arq['name']}' salvo na nuvem com sucesso!")
            else:
                print(f"⚠️ Nenhum texto extraído de '{arq['name']}'.")

        except Exception as e:
            print(f"❌ Erro ao processar '{arq['name']}': {e}")

if __name__ == "__main__":
    construir_banco()
    print("\n🎉 TODOS OS MATERIAIS FORAM ENVIADOS PARA A NUVEM COM SUCESSO!")