from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import faiss
import json
import numpy as np
from sentence_transformers import SentenceTransformer
import requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================
# Load Vector Store
# ==========================
index = faiss.read_index("faiss_index.bin")

with open("documents.json", "r", encoding="utf-8") as f:
    documents = json.load(f)

model = SentenceTransformer("all-MiniLM-L6-v2")


# ==========================
# Load Destination Data
# ==========================
with open("documents2.json", "r") as f:
    locations = json.load(f)

# extract destination names
destination_names = [item["destination"] for item in locations]
building_names = [item["building"] for item in locations]
# Create embeddings for destinations
destination_embeddings = model.encode(destination_names)


# ==========================
# Destination Embedding Search
# ==========================
def find_destination_embedding(query):

    query_embedding = model.encode([query])

    scores = np.dot(destination_embeddings, query_embedding[0])

    best_index = np.argmax(scores)

    confidence = scores[best_index]

    if confidence > 0.4:
        return building_names[best_index]
    else:
        return None


# ==========================
# RAG Search Function
# ==========================
def search(query, top_k=3):
    query_embedding = model.encode([query])
    distances, indices = index.search(np.array(query_embedding), top_k)

    results = [documents[i] for i in indices[0]]
    return results


# ==========================
# LLM Destination Extractor
# ==========================
def extract_destination_llm(user_message):

    prompt = f"""
Extract the destination place from the user query.

Return ONLY the place name.

Examples:
User: How do I go to library?
Answer: library

User: Where is the cafeteria?
Answer: cafeteria

User: Tell me about admissions
Answer: none

User Query:
{user_message}
"""

    response = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": "llama3",
            "prompt": prompt,
            "stream": False
        }
    )

    destination = response.json()["response"].strip()

    if destination.lower() == "none":
        return None

    return destination


# ==========================
# Chat Endpoint
# ==========================
@app.post("/chat")
async def chat(data: dict):

    user_message = data.get("message")

    # 1️⃣ Retrieve relevant documents
    retrieved_docs = search(user_message)
    context = "\n".join(retrieved_docs)

    # 2️⃣ Send to LLaMA
    prompt = f"""
You are MIRA, a smart campus kiosk assistant.

Use the following context to answer the question.

Context:
{context}

Question:
{user_message}
"""

    response = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": "llama3",
            "prompt": prompt,
            "stream": False
        }
    )

    reply = response.json()["response"]

    # 3️⃣ Extract destination using LLM
    destination = extract_destination_llm(user_message)

    # 4️⃣ Match destination using embeddings
    matched_destination = None

    if destination:
        matched_destination = find_destination_embedding(destination)

    return {
        "reply": reply,
        "destination": matched_destination
    }