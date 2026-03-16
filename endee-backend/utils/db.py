import os
import requests
import msgpack
from dotenv import load_dotenv

load_dotenv()

ENDEE_BASE_URL = os.environ.get("ENDEE_BASE_URL", "http://localhost:8080")
ENDEE_AUTH_TOKEN = os.environ.get("ENDEE_AUTH_TOKEN", "")

INDEX_NAME = "document_collection"
EMBEDDING_DIM = 3072


def _headers():
    h = {"Content-Type": "application/json"}
    if ENDEE_AUTH_TOKEN:
        h["Authorization"] = ENDEE_AUTH_TOKEN
    return h


def _ensure_index():
    url = f"{ENDEE_BASE_URL}/api/v1/index/create"
    payload = {
        "index_name": INDEX_NAME,
        "dim": EMBEDDING_DIM,
        "space_type": "cosine",
    }
    resp = requests.post(url, json=payload, headers=_headers())
    if resp.status_code not in (200, 409):
        raise RuntimeError(f"Failed to create Endee index: {resp.text}")


def add_chunks_to_db(chunks: list[str], source_id: str, task_type: str = "RETRIEVAL_DOCUMENT") -> int:
    from utils.llm import generate_embedding

    clear_db()

    if not chunks:
        return 0

    vectors = []
    for i, chunk in enumerate(chunks):
        embedding = generate_embedding(chunk, task_type=task_type)
        if not embedding:
            continue
        vectors.append({
            "id": f"{source_id}_{i}",
            "vector": embedding,
            "meta": chunk,
        })

    if not vectors:
        return 0

    url = f"{ENDEE_BASE_URL}/api/v1/index/{INDEX_NAME}/vector/insert"
    resp = requests.post(url, json=vectors, headers=_headers())
    if resp.status_code != 200:
        raise RuntimeError(f"Failed to insert vectors into Endee: {resp.text}")

    return len(vectors)


def query_db(query_text: str, n_results: int = 4) -> str:
    from utils.llm import generate_embedding

    embedding = generate_embedding(query_text, task_type="RETRIEVAL_QUERY")
    if not embedding:
        return ""

    url = f"{ENDEE_BASE_URL}/api/v1/index/{INDEX_NAME}/search"
    payload = {
        "k": n_results,
        "vector": embedding,
    }
    resp = requests.post(url, json=payload, headers=_headers())
    if resp.status_code != 200:
        return ""

    # Response is msgpack-encoded ResultSet.
    # ResultSet MSGPACK_DEFINE(results) → decoded as [results_list].
    # VectorResult MSGPACK_DEFINE(similarity, id, meta, filter, norm, vector)
    # → each result is [similarity, id, meta_bytes, filter, norm, vector].
    data = msgpack.unpackb(resp.content, raw=False)
    if not data:
        results_list = []
    elif data[0] and isinstance(data[0][0], float):
        # data is already [VectorResult1, VectorResult2, ...]
        results_list = data
    else:
        # data is [[VectorResult1, VectorResult2, ...]]
        results_list = data[0] if data[0] else []

    chunks = []
    for result in results_list:
        meta = result[2]
        if isinstance(meta, (bytes, bytearray)):
            meta = meta.decode("utf-8", errors="replace")
        if meta:
            chunks.append(meta)

    return "\n\n---\n\n".join(chunks)


def clear_db():
    url = f"{ENDEE_BASE_URL}/api/v1/index/{INDEX_NAME}/delete"
    resp = requests.delete(url, headers=_headers())
    if resp.status_code not in (200, 404):
        raise RuntimeError(f"Failed to delete Endee index: {resp.text}")
    _ensure_index()
