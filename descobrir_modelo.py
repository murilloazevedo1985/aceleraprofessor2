import google.genai as genai

# Coloque a sua chave real aqui
CHAVE_API_GEMINI = "AIzaSyDfoQTbsQ7_FAfgINeLivpMjcWUClUZPNM" 
genai.api_key = CHAVE_API_GEMINI

print("🔎 Buscando modelos de Embedding disponíveis na sua conta...\n")

try:
    for m in genai.list_models():
        if 'embedContent' in m.supported_generation_methods:
            print(f"✅ Nome exato do modelo para usar: {m.name}")
except Exception as e:
    print(f"❌ Erro ao listar modelos: {e}")