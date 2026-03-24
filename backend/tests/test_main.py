import json
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

import main


class VoiceRagApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(main.app)

    @patch("main.is_ai_configured", return_value=True)
    @patch("main.check_db_health", return_value=(True, "FAISS ready"))
    def test_health_check_reports_dependencies(self, check_db_health, is_ai_configured):
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertTrue(payload["endee"]["connected"])
        self.assertTrue(payload["ai"]["configured"])
        check_db_health.assert_called_once()
        is_ai_configured.assert_called_once()

    def test_ingest_text_rejects_short_payloads(self):
        response = self.client.post(
            "/ingest/text",
            json={"text": "too short", "task_type": "RETRIEVAL_DOCUMENT"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Text is too short.")

    @patch("main.generate_summary", return_value="Summary")
    @patch("main.add_chunks_to_db", return_value=3)
    @patch("main.chunk_text", return_value=["chunk-1", "chunk-2", "chunk-3"])
    def test_ingest_text_indexes_chunks_and_returns_summary(
        self,
        chunk_text,
        add_chunks_to_db,
        generate_summary,
    ):
        response = self.client.post(
            "/ingest/text",
            json={
                "text": "This is a long enough piece of content for ingestion.",
                "task_type": "RETRIEVAL_DOCUMENT",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "success")
        self.assertEqual(payload["chunks_indexed"], 3)
        self.assertEqual(payload["summary"], "Summary")
        chunk_text.assert_called_once()
        add_chunks_to_db.assert_called_once()
        generate_summary.assert_called_once()

    @patch("main.answer_query", return_value="The answer")
    @patch("main.query_db", return_value="Context block")
    @patch("main.rewrite_query", return_value="rewritten question")
    def test_query_text_uses_history_and_returns_answer(
        self,
        rewrite_query,
        query_db,
        answer_query,
    ):
        history = [
            {"role": "user", "text": "Tell me about the document"},
            {"role": "ai", "text": "Sure"},
        ]
        response = self.client.post(
            "/query/text",
            json={"text": "What about deadlines?", "history": history},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["response"], "The answer")
        rewrite_query.assert_called_once_with("What about deadlines?", history)
        query_db.assert_called_once_with("rewritten question", n_results=3)
        answer_query.assert_called_once_with("What about deadlines?", "Context block", history)

    @patch("main.answer_query", return_value="Here is the answer")
    @patch("main.query_db", return_value="Relevant context")
    @patch("main.rewrite_query", return_value="Summarize the doc")
    @patch("main.transcribe_audio", return_value="Summarize the doc")
    def test_query_voice_transcribes_audio_and_responds(
        self,
        transcribe_audio,
        rewrite_query,
        query_db,
        answer_query,
    ):
        response = self.client.post(
            "/query/voice",
            files={"audio": ("recording.webm", b"fake-audio", "audio/webm")},
            data={
                "history": json.dumps(
                    [{"role": "user", "text": "What is this document about?"}]
                )
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["transcript"], "Summarize the doc")
        self.assertEqual(payload["response"], "Here is the answer")
        transcribe_audio.assert_called_once_with(b"fake-audio", mime_type="audio/webm")
        rewrite_query.assert_called_once()
        query_db.assert_called_once_with("Summarize the doc", n_results=3)
        answer_query.assert_called_once()


if __name__ == "__main__":
    unittest.main()
