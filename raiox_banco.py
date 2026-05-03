import chromadb

# 1. Aponta para a pasta onde o banco está salvo
cliente = chromadb.PersistentClient(path="./meu_banco_vetorial")

# 2. Descobre o nome da coleção (a "tabela" onde os dados ficam)
colecoes = cliente.list_collections()

if not colecoes:
    print("Nenhuma coleção encontrada no banco!")
else:
    # Pega a primeira coleção que encontrar
    nome_colecao = colecoes[0].name
    colecao = cliente.get_collection(name=nome_colecao)
    
    # Puxa todos os dados salvos
    dados = colecao.get()
    
    total_documentos = len(dados['documents'])
    print(f"✅ Encontrados {total_documentos} pedaços de texto no banco!\n")
    
    print("🔎 --- AMOSTRA DOS TEXTOS SALVOS --- 🔎\n")
    # Imprime os 5 primeiros pedaços de texto para você inspecionar
    for i in range(min(5, total_documentos)):
        texto = dados['documents'][i]
        origem = dados['metadatas'][i] if dados['metadatas'] else "Origem desconhecida"
        
        print(f"--- PEDAÇO {i+1} ---")
        print(f"📁 Arquivo de origem: {origem}")
        print(f"📝 Texto que a IA conseguiu ler:\n{texto[:500]}...\n")