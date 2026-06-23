from langchain_core.runnables import Runnable
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from app.core.config import settings

class LazyLLM(Runnable):
    def __init__(self, model: str):
        self.model = model
        self.instance = None

    def _get_instance(self):
        if self.instance is None:
            # We can use a dummy API key or setting key
            api_key = settings.GEMINI_API_KEY
            self.instance = ChatGoogleGenerativeAI(
                model=self.model,
                google_api_key=api_key
            )
        return self.instance

    def invoke(self, input, config=None, **kwargs):
        return self._get_instance().invoke(input, config=config, **kwargs)

llm = LazyLLM("gemini-2.0-flash")
prompt = ChatPromptTemplate.from_template("Hello {name}")
chain = prompt | llm

# Test invoke with a prompt
res = chain.invoke({"name": "World"})
print("Result type:", type(res))
print("Result content:", getattr(res, "content", res))
