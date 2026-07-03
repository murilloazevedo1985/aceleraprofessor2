import os
from dotenv import load_dotenv
from pinecone import Pinecone
import google.genai as genai

# --- 1. CONFIGURAÇÕES ---
caminho_env = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=caminho_env)

CHAVE_API_PINECONE = os.getenv("PINECONE_API_KEY")
NOME_INDEX_PINECONE = "aulas-fisica" 
CHAVE_API_GEMINI = os.getenv("GEMINI_API_KEY")

genai.api_key = CHAVE_API_GEMINI
pc = Pinecone(api_key=CHAVE_API_PINECONE)
index = pc.Index(NOME_INDEX_PINECONE)

# --- 2. TERMO DE TESTE ---
# Coloque exatamente o termo que o usuário digita e está dando erro
TERMO_USUARIO = "velocidade média" 

print(f"🔬 INICIANDO DIAGNÓSTICO VETORIAL PARA: '{TERMO_USUARIO}'\n")

# Passo 1: Gerar o embedding da busca
resposta_emb = genai.embed_content(
    model="models/gemini-embedding-2",
    content=TERMO_USUARIO,
    task_type="retrieval_query"
)
vetor_busca = resposta_emb['embedding']

print("-" * 60)
print("🔍 TESTE 1: BUSCA REMOVENDO TODOS OS FILTROS (Verificação de Existência)")
print("Objetivo: Descobrir se o termo acha QUALQUER coisa no banco e qual o maior score.")
print("-" * 60)

# Buscando os 5 maiores scores gerais do banco sem travar por tipo
busca_livre = index.query(vector=vetor_busca, top_k=5, include_metadata=True)

if not busca_livre['matches']:
    print("❌ Retorno 100% Vazio! O banco de dados parece estar completamente vazio.")
else:
    for i, match in enumerate(busca_livre['matches']):
        print(f"Rank #{i+1} | SCORE DE SIMILARIDADE: {match['score']:.4f}")
        # Imprime os metadados de forma mais legível
        metadata = match['metadata']
        tipo = metadata.get('tipo', 'N/A')
        fonte = metadata.get('fonte', 'N/A')
        etapa = metadata.get('etapa', 'N/A')
        print(f"  - Tipo: {tipo} | Fonte: {fonte} | Etapa: {etapa}")
        print(f"  - Trecho inicial: {metadata.get('texto', '')[:100]}...\n")


print("-" * 60)
print("🎯 TESTE 2: BUSCA TRAVADA APENAS NA BNCC (Validação da Estratégia 2)")
print("Objetivo: Ver se o filtro da BNCC funciona e qual a distância matemática real.")
print("-" * 60)

busca_filtrada_bncc = index.query(
    vector=vetor_busca, 
    top_k=3, 
    filter={"tipo": {"$eq": "diretriz_bncc"}}, 
    include_metadata=True
)

if not busca_filtrada_bncc['matches']:
    print("❌ Retorno 100% Vazio! Possíveis causas:")
    print("   1. A tag 'tipo': 'diretriz_bncc' foi escrita com erro de digitação no criar_banco.py.")
    print("   2. O banco foi limpo mas o script criar_banco.py não subiu os dados da BNCC corretamente.")
    print("   3. A similaridade dos termos da BNCC com a busca é tão baixa que eles nem aparecem no top_k.")
else:
    for i, match in enumerate(busca_filtrada_bncc['matches']):
        print(f"Rank BNCC #{i+1} | SCORE DE SIMILARIDADE: {match['score']:.4f}")
        print(f"Fonte: {match['metadata'].get('fonte')}")
        print(f"Etapa: {match['metadata'].get('etapa')}")
        print(f"Texto Completo: {match['metadata'].get('texto')}\n")