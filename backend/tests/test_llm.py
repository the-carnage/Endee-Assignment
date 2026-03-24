import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from utils import llm


class LlmUtilityTests(unittest.TestCase):
    def setUp(self):
        llm._available_generate_content_models.cache_clear()

    def tearDown(self):
        llm._available_generate_content_models.cache_clear()

    def test_transcribe_audio_uses_available_supported_model(self):
        response = SimpleNamespace(text="summarize the document")
        model = Mock()
        model.generate_content.return_value = response

        with patch.object(llm, "api_key", "test-key"), patch.object(
            llm,
            "_available_generate_content_models",
            return_value={"models/gemini-2.0-flash"},
        ), patch("utils.llm.genai.GenerativeModel", return_value=model) as generative_model:
            transcript = llm.transcribe_audio(b"audio-bytes", mime_type="audio/webm")

        self.assertEqual(transcript, "summarize the document")
        generative_model.assert_called_once_with("models/gemini-2.0-flash")
        model.generate_content.assert_called_once()

    def test_transcribe_audio_retries_on_missing_model(self):
        missing_model = Mock()
        missing_model.generate_content.side_effect = RuntimeError(
            "404 models/gemini-2.5-flash is not found for API version v1beta, or is not supported for generateContent."
        )

        working_model = Mock()
        working_model.generate_content.return_value = SimpleNamespace(text="give me a summary")

        with patch.object(llm, "api_key", "test-key"), patch.object(
            llm,
            "_available_generate_content_models",
            return_value=set(),
        ), patch(
            "utils.llm.genai.GenerativeModel",
            side_effect=[missing_model, working_model],
        ) as generative_model:
            transcript = llm.transcribe_audio(b"audio-bytes", mime_type="audio/webm")

        self.assertEqual(transcript, "give me a summary")
        self.assertEqual(generative_model.call_args_list[0].args[0], "models/gemini-2.5-flash")
        self.assertEqual(generative_model.call_args_list[1].args[0], "models/gemini-2.0-flash")


if __name__ == "__main__":
    unittest.main()
