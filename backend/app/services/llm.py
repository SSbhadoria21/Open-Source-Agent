from langchain_google_genai import ChatGoogleGenerativeAI
from app.core.config import settings

# Initialize Gemini 1.5 Pro
llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-pro-001",
    google_api_key=settings.GEMINI_API_KEY,
    temperature=0.2,
    max_output_tokens=4096
)

# Also expose a fast model if needed for simpler tasks
fast_llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash-001",
    google_api_key=settings.GEMINI_API_KEY,
    temperature=0.2
)
