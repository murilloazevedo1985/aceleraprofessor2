import os
import io
import time
import chromadb
from chromadb.api.types import Documents, EmbeddingFunction, Embeddings
import google.generativeai as genai
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import pypdf
import docx
from PIL import Image
import pytesseract

# --- 1. CONFIGURAÇÕES E CREDENCIAIS ---
CHAVE_API_GEMINI = "AIzaSyDfoQTbsQ7_FAfgINeLivpMjcWUClUZPNM"
ID_PASTA_TESTE_DRIVE = "1jZztziuVQ8e7jJqeBAUXiNP2XQT6fcCJ"
CAMINHO_JSON_CREDENCIAIS = "credenciais.json"

genai.configure(api_key=CHAVE_API_GEMINI)

# --- 2. CONFIGURAR O BANCO DE DADOS VETORIAL (CHROMADB) ---
# O ChromaDB precisa de uma função para transformar texto em números (vetores).
# Vamos usar o modelo de Embeddings do Gemini (ótimo para português).
class GeminiEmbeddingFunction(EmbeddingFunction):
    def __call__(self, input: Documents) -> Embeddings:
        embeddings = []
        for text in input:
            resposta = genai.embed_content(
                model="models/text-embedding-004", # Modelo de embedding mais recente e recomendado
                content=text,
                task_type="retrieval_document"
            )
            embeddings.append(resposta['embedding'])
            # Uma pequena pausa para não estourar o limite gratuito da API do Google
            time.sleep(1) 
        return embeddings
print("⚙️ Inicializando Banco de Dados Local...")
# Isso vai criar uma pasta chamada "meu_banco_vetorial" no seu projeto
cliente_chroma = chromadb.PersistentClient(path="./meu_banco_vetorial")
funcao_gemini = GeminiEmbeddingFunction()

# Cria (ou carrega se já existir) a nossa "prateleira" de arquivos
colecao = cliente_chroma.get_or_create_collection(
    name="aulas_fisica",
    embedding_function=funcao_gemini
)

# --- 3. CONEXÃO COM O DRIVE ---
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
# A IA não consegue ler um livro todo de uma vez, então cortamos em parágrafos.
def quebrar_texto(texto, tamanho_pedaco=1000, sobreposicao=200):
    pedacos = []
    for i in range(0, len(texto), tamanho_pedaco - sobreposicao):
        pedacos.append(texto[i:i + tamanho_pedaco])
    return pedacos

# --- 5. O MOTOR PRINCIPAL DE EXTRAÇÃO E INDEXAÇÃO ---
def construir_banco():
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
                
                # Prepara os dados para o ChromaDB
                ids = [f"{arq['id']}_parte_{i}" for i in range(len(pedacos))]
                metadados = [{"fonte": arq['name']} for _ in pedacos]
                
                print(f"🧠 Enviando {len(pedacos)} pedaços para a IA vetorizar e salvando no banco...")
                colecao.add(
                    documents=pedacos,
                    metadatas=metadados,
                    ids=ids
                )
                print(f"✅ Arquivo '{arq['name']}' salvo no banco com sucesso!")
            else:
                print(f"⚠️ Nenhum texto extraído de '{arq['name']}'.")

        except Exception as e:
            print(f"❌ Erro ao processar '{arq['name']}': {e}")

if __name__ == "__main__":
    construir_banco()
    print("\n🎉 BANCO DE DADOS CONSTRUÍDO COM SUCESSO!")