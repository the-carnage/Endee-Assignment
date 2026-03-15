import os
from chromadb import PersistentClient

# Determine the path for the database storage
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "endee_db")

# Initialize ChromaDB persistent client
client = PersistentClient(path=DB_PATH)

# Create or get the collection for our documents
collection = client.get_or_create_collection(
    name="document_collection",
    metadata={"hnsw:space": "cosine"}
)

def add_chunks_to_db(chunks: list[str], source_id: str):
    """Adds a list of text chunks to the vector database."""
    if not chunks:
        return 0
        
    ids = [f"{source_id}_{i}" for i in range(len(chunks))]
    metadatas = [{"source": source_id, "chunk_index": i} for i in range(len(chunks))]
    
    collection.add(
        documents=chunks,
        ids=ids,
        metadatas=metadatas
    )
    
    return len(chunks)

def query_db(query_text: str, n_results: int = 4) -> str:
    """Queries the database and returns a concatenated string of the most relevant chunks."""
    results = collection.query(
        query_texts=[query_text],
        n_results=n_results
    )
    
    if not results or not results["documents"] or not results["documents"][0]:
        return ""
        
    # Join the top retrieved chunks into a single context string
    retrieved_chunks = results["documents"][0]
    return "\n\n---\n\n".join(retrieved_chunks)
