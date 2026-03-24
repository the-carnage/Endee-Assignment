import os
import msgpack
import requests
from dotenv import load_dotenv

load_dotenv()

ENDEE_BASE_URL = os.environ.get("ENDEE_BASE_URL", "http://localhost:8080")
ENDEE_AUTH_TOKEN = os.environ.get("ENDEE_AUTH_TOKEN", "")

INDEX_NAME = "document_collection"
EMBEDDING_DIM = 3072
REQUEST_TIMEOUT = float(os.environ.get("ENDEE_REQUEST_TIMEOUT", "20"))


class EndeeError(RuntimeError):
    pass


def _headers():
    h = {"Content-Type": "application/json"}
    if ENDEE_AUTH_TOKEN:
        h["Authorization"] = ENDEE_AUTH_TOKEN
    return h


def _extract_error_message(response: requests.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        payload = None

    if isinstance(payload, dict):
        detail = payload.get("detail") or payload.get("message") or payload.get("error")
        if detail:
            return str(detail)

    if response.text.strip():
        return response.text.strip()

    return f"Unexpected response from FAISS ({response.status_code})."


def _request(method: str, path: str, *, expected: tuple[int, ...], **kwargs) -> requests.Response:
    url = f"{ENDEE_BASE_URL.rstrip('/')}{path}"
    try:
        response = requests.request(
            method,
            url,
            headers=_headers(),
            timeout=REQUEST_TIMEOUT,
            **kwargs,
        )
    except requests.RequestException as error:
        raise EndeeError(
            f"Could not reach FAISS at {ENDEE_BASE_URL}. Make sure the server is running."
        ) from error

    if response.status_code not in expected:
        raise EndeeError(_extract_error_message(response))

    return response


def _ensure_index():
    payload = {
        "index_name": INDEX_NAME,
        "dim": EMBEDDING_DIM,
        "space_type": "cosine",
    }
    _request("post", "/api/v1/index/create", json=payload, expected=(200, 409))


def check_db_health() -> tuple[bool, str]:
    try:
        _ensure_index()
    except EndeeError as error:
        return False, str(error)

    return True, f"Connected to FAISS and ready to use `{INDEX_NAME}`."


def add_chunks_to_db(chunks: list[str], source_id: str, task_type: str = "RETRIEVAL_DOCUMENT") -> int:
    from utils.llm import generate_embedding

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

    clear_db()
    _request(
        "post",
        f"/api/v1/index/{INDEX_NAME}/vector/insert",
        json=vectors,
        expected=(200,),
    )

    return len(vectors)


def query_db(query_text: str, n_results: int = 4) -> str:
    from utils.llm import generate_embedding

    embedding = generate_embedding(query_text, task_type="RETRIEVAL_QUERY")
    if not embedding:
        return ""

    payload = {
        "k": n_results,
        "vector": embedding,
    }
    response = _request(
        "post",
        f"/api/v1/index/{INDEX_NAME}/search",
        json=payload,
        expected=(200,),
    )

    try:
        data = msgpack.unpackb(response.content, raw=False)
    except (msgpack.ExtraData, msgpack.FormatError, msgpack.StackError, ValueError) as error:
        raise EndeeError("Received an unreadable search response from FAISS.") from error

    if not data:
        results_list = []
    elif data[0] and isinstance(data[0][0], float):
        results_list = data
    else:
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
    _request("delete", f"/api/v1/index/{INDEX_NAME}/delete", expected=(200, 404))
    _ensure_index()
