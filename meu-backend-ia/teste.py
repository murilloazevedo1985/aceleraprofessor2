import os
import google.generativeai as genai
from dotenv import load_dotenv

# Carrega a sua chave do .env
load_dotenv()

# Configura a conexão direta com o Google
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

print("🕵️ Buscando modelos disponíveis para a sua chave...")
print("-" * 40)

# Pede a lista oficial para o Google e imprime na tela
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"✅ Nome válido: {m.name.replace('models/', '')}")
    print("-" * 40)
    print("Busca concluída!")
except Exception as e:
    print(f"❌ Erro ao buscar: {e}")