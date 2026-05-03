import google.generativeai as genai
import os

# Se estiver usando um arquivo .env, certifique-se de carregá-lo
# ou substitua a linha abaixo pela sua chave real entre aspas
CHAVE_API = os.getenv("GOOGLE_API_KEY", "AIzaSyDfoQTbsQ7_FAfgINeLivpMjcWUClUZPNM")

genai.configure(api_key=CHAVE_API)

print("🔍 Buscando modelos de Embedding suportados...\n")

# Varre todos os modelos do Google e filtra apenas os de Embedding
for m in genai.list_models():
    if 'embedContent' in m.supported_generation_methods:
        print(f"✅ Modelo válido encontrado: {m.name}")