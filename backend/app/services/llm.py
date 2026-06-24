from langchain_core.runnables import Runnable
from langchain_core.messages import AIMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class _LazyLLM(Runnable):
    """Lazy LLM wrapper that only initializes the model when first used.
    This allows the server to start even if the API key is not yet configured.
    """

    def __init__(self, model: str, temperature: float = 0.2, max_output_tokens: int = 4096):
        super().__init__()
        self._model = model
        self._temperature = temperature
        self._max_output_tokens = max_output_tokens
        self._instance = None

    def _get_instance(self):
        if self._instance is None:
            api_key = settings.GEMINI_API_KEY
            if not api_key or api_key == "your_gemini_api_key_here":
                raise RuntimeError(
                    "GEMINI_API_KEY is not configured. "
                    "Please set it in backend/.env to enable AI agent functionality."
                )
            self._instance = ChatGoogleGenerativeAI(
                model=self._model,
                google_api_key=api_key,
                temperature=self._temperature,
                max_output_tokens=self._max_output_tokens,
            )
        return self._instance

    def invoke(self, input, config=None, **kwargs):
        return self._get_instance().invoke(input, config=config, **kwargs)

    def __getattr__(self, name):
        return getattr(self._get_instance(), name)


# Lazily initialized — server starts even without API key
llm = _LazyLLM("gemini-2.0-flash")
fast_llm = _LazyLLM("gemini-2.0-flash", temperature=0.1)
