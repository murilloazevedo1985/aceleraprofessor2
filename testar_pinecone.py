import os
from dotenv import load_dotenv
from pinecone import Pinecone
import google.genai as genai

# --- 1. CONFIGURAÇÕES E CREDENCIAIS ---
caminho_env = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=caminho_env)

CHAVE_API_PINECONE = os.getenv("PINECONE_API_KEY")
NOME_INDEX_PINECONE = "aulas-fisica" 
CHAVE_API_GEMINI = os.getenv("GEMINI_API_KEY")

if not CHAVE_API_PINECONE or not CHAVE_API_GEMINI:
    raise ValueError("Certifique-se de que PINECONE_API_KEY e GEMINI_API_KEY estão definidas no seu arquivo .env")

genai.api_key = CHAVE_API_GEMINI


# --- 2. FUNÇÃO ORIGINAL MELHORADA: TESTE DA BNCC ---
def testar_competencias_bncc(index, vetor_pergunta):
    """
    Verifica especificamente se as diretrizes e competências da BNCC estão tagueadas no banco.
    """
    print("🎯 [FASE 1] Validando as Competências da BNCC...")
    print("   [Filtro Ativo]: tipo == 'diretriz_bncc'")

    try:
        # Aumentamos o top_k para 10 para ele contar mais correspondências reais
        resultados = index.query(
            vector=vetor_pergunta, 
            top_k=10, 
            include_metadata=True,
            filter={"tipo": {"$eq": "diretriz_bncc"}}
        )

        matches = resultados.get('matches', [])

        # 🌟 EXIBE O NÚMERO EXATO DE CORRESPONDÊNCIAS ENCONTRADAS
        print(f"📊 Total de correspondências encontradas para a BNCC: {len(matches)}")

        if not matches:
            print("❌ ATENÇÃO: Nenhuma competência da BNCC foi localizada!")
            # ... resto do código igual ...
            print("   O índice possui dados, mas nenhum está tagueado com 'tipo': 'diretriz_bncc'.\n")
        else:
            print(f"🎉 SUCESSO! Foram encontradas {len(matches)} referências da BNCC na memória.")
            for i, match in enumerate(matches):
                fonte = match['metadata'].get('fonte', 'Desconhecida')
                etapa = match['metadata'].get('etapa', 'Não definida')
                texto = match['metadata'].get('texto', 'Texto não encontrado.')
                print(f"   -> [BNCC #{i+1}] Origem: {fonte} | Etapa: {etapa}")
                print(f"      Trecho: \"{texto[:120].strip()}...\"\n")

    except Exception as e:
        print(f"❌ Erro ao testar BNCC: {e}\n")


# --- 3. NOVA FUNÇÃO ADICIONADA: TESTE DA BASE DE FÍSICA (HALLIDAY) ---
def testar_conteudo_fisica(index, vetor_pergunta):
    """
    Verifica especificamente se os livros e materiais de Física estão tagueados no banco.
    """
    print("📚 [FASE 2] Validando a Base de Dados de Física (Halliday)...")
    print("   [Filtro Ativo]: tipo == 'conteudo_fisica'")

    try:
        # Aumentamos o top_k para 10 para ter uma amostragem real do Halliday
        resultados = index.query(
            vector=vetor_pergunta, 
            top_k=10, 
            include_metadata=True,
            filter={"tipo": {"$eq": "conteudo_fisica"}}
        )

        matches = resultados.get('matches', [])

        # 🌟 EXIBE O NÚMERO EXATO DE CORRESPONDÊNCIAS ENCONTRADAS
        print(f"📊 Total de correspondências encontradas para Física: {len(matches)}")

        if not matches:
            print("❌ ATENÇÃO: Nenhum livro ou material de Física foi localizado!")
            # ... resto do código igual ...
            print("   O índice possui dados, mas nenhum está tagueado com 'tipo': 'conteudo_fisica'.\n")
        else:
            print(f"🎉 SUCESSO! Foram encontrados {len(matches)} blocos de Física na memória.")
            for i, match in enumerate(matches):
                fonte = match['metadata'].get('fonte', 'Desconhecida')
                texto = match['metadata'].get('texto', 'Texto não encontrado.')
                print(f"   -> [Física #{i+1}] Livro/Fonte: {fonte}")
                print(f"      Trecho Técnico: \"{texto[:120].strip()}...\"\n")

    except Exception as e:
        print(f"❌ Erro ao testar material de Física: {e}\n")


# --- 4. FUNÇÃO PRINCIPAL DE FLUXO ---
def testar_memoria_pinecone():
    """
    Gerencia a execução dos testes de saúde do índice Pinecone.
    """
    print("🕵️  Iniciando o Raio-X da Memória Híbrida Pinecone...\n")

    try:
        print("🔌 Conectando ao Pinecone na nuvem...")
        pc = Pinecone(api_key=CHAVE_API_PINECONE)
        index = pc.Index(NOME_INDEX_PINECONE)
        print("✅ Conexão estabelecida!\n")

        print("📊 Verificando estatísticas gerais...")
        stats = index.describe_index_stats()
        total_vetores = stats.get('total_vector_count', 0)
        print(f"   Total de vetores armazenados no índice: {total_vetores}\n")

        if total_vetores == 0:
            print("🚨 ALERTA CRÍTICO: O índice está completamente VAZIO!\n")
            return

        # Gerando o vetor base comum para os testes de busca
        print("🧠 Gerando vetor de teste com o Gemini...")
        termo_busca = "Leis de Newton, forças, gravitação e competências da educação básica"
        resposta_emb = genai.embed_content(
            model="text-embedding-004",
            content=termo_busca,
            task_type="retrieval_query"
        )
        vetor_pergunta = resposta_emb['embedding']
        print("✅ Vetor de teste gerado com sucesso!\n")
        print("-" * 60 + "\n")

        # Executa a função da BNCC (Sem apagá-la)
        testar_competencias_bncc(index, vetor_pergunta)
        
        # Executa a nova função adicionada para a Base de Física
        testar_conteudo_fisica(index, vetor_pergunta)

        print("-" * 60)
        print("🏁 Diagnóstico concluído!")

    except Exception as e:
        print(f"❌ ERRO CRÍTICO NO GERENCIADOR DE TESTES: {e}")

# --- PONTO DE PARTIDA ---
if __name__ == "__main__":
    testar_memoria_pinecone()