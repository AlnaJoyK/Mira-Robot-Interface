from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from rag_engine import create_vector_db
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.llms import Ollama
import os

app = FastAPI(title="Mira AI Campus Assistant")

# Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Load embeddings
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

# Create or load vector database
if not os.path.exists("faiss_index"):
    print("Creating vector database...")
    vectorstore = create_vector_db()
else:
    print("Loading existing vector database...")
    vectorstore = FAISS.load_local(
        "faiss_index",
        embeddings,
        allow_dangerous_deserialization=True
)


# Load LLaMA model
llm = Ollama(model="llama3")

@app.get("/")
def home():
    return {"message": "Mira AI Backend Running"}


@app.get("/ask")
def ask(question: str):

    docs = vectorstore.similarity_search(question, k=5)
    context = "\n\n".join([doc.page_content for doc in docs])

    prompt = f"""
You are Mira, an intelligent campus assistant robot.

Use the provided context as your main knowledge source.
If the exact answer is not directly stated, infer the most logical answer
based on the context and general campus understanding.

Do NOT say you don't know.
Always provide a confident and helpful answer.

If something is unclear, make a reasonable assumption based on the context.
give more likely humanly response and avoid using sentenses like "according to context" and make more realistic and natural response.

Context:
{context}

Question:
{question}

Answer:
"""

    response = llm.invoke(prompt)

    return {"answer": response}