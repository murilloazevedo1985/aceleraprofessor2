from google.oauth2 import service_account
from googleapiclient.discovery import build
import os
from dotenv import load_dotenv

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

CAMINHO_JSON_CREDENCIAIS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "credenciais.json")
if not os.path.isabs(CAMINHO_JSON_CREDENCIAIS):
    CAMINHO_JSON_CREDENCIAIS = os.path.join(os.path.dirname(__file__), CAMINHO_JSON_CREDENCIAIS)
print("🕵️ Iniciando Raio-X Total do Robô...\n")

try:
    credenciais = service_account.Credentials.from_service_account_file(
        CAMINHO_JSON_CREDENCIAIS,
        scopes=['https://www.googleapis.com/auth/drive.readonly']
    )
    servico_drive = build('drive', 'v3', credentials=credenciais)
    
    print("⏳ Buscando qualquer arquivo em qualquer lugar...")
    
   # Adicionamos 'parents' aos fields para o robô nos dizer onde está o ficheiro
    resultados = servico_drive.files().list(
        pageSize=15,
        fields="files(id, name, parents)", 
        includeItemsFromAllDrives=True,
        supportsAllDrives=True
    ).execute()
    
    arquivos = resultados.get('files', [])
    
    if arquivos:
        print(f"\n✅ SUCESSO! O robô enxerga {len(arquivos)} arquivos. Onde eles estão?")
        for arq in arquivos:
            # Aqui ele vai imprimir o nome do ficheiro e o ID da verdadeira pasta
            id_da_pasta = arq.get('parents', ['Pasta Desconhecida'])[0]
            print(f" ➡️ {arq['name']} | ID DA PASTA VERDADEIRA: {id_da_pasta}")
    
    arquivos = resultados.get('files', [])
    
    if not arquivos:
        print("\n🚨 ALERTA VERMELHO: O robô não vê ABSOLUTAMENTE NADA.")
        print("Isso significa que o e-mail dele não foi reconhecido pelo Google Drive na hora de compartilhar.")
    else:
        print(f"\n✅ SUCESSO! O robô enxerga {len(arquivos)} arquivos no total. São eles:")
        for arq in arquivos:
            print(f" ➡️ {arq['name']}")
            
except Exception as e:
    print(f"\n❌ Erro crítico do sistema: {e}")