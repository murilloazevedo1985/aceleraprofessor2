import os
from dotenv import load_dotenv
import google.genai as genai

# Carrega o arquivo .env se ele existir na pasta
load_dotenv()

# Busca a chave do arquivo .env (mudei para buscar a GEMINI_API_KEY que configuramos antes)
CHAVE_API = os.getenv("GEMINI_API_KEY")

if not CHAVE_API:
    print("❌ Erro: A chave GEMINI_API_KEY não foi encontrada no seu arquivo .env!")
else:
    print("🔍 Conectando à API da Google...")
    genai.api_key = CHAVE_API

    print("🔍 Buscando modelos suportados...\n")
    
    try:
        # Varre e lista todos os modelos usando o formato correto
        for m in genai.list_models():
            print(f"-> {m.name}")
            
    except Exception as e:
        print(f"❌ Ocorreu um erro ao listar: {e}")