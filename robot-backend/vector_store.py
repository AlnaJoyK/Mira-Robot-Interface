import os
import json
import faiss
import numpy as np
import fitz  # PyMuPDF
from sentence_transformers import SentenceTransformer

# ==========================
# CONFIG
# ==========================
DATA_FOLDER = "documents"
INDEX_FILE = "faiss_index.bin"
DOCS_FILE = "documents.json"
CHUNK_SIZE = 500

model = SentenceTransformer("all-MiniLM-L6-v2")

# ==========================
# TEXT CHUNKER
# ==========================
def chunk_text(text, chunk_size=CHUNK_SIZE):
    text = text.replace("\n", " ")
    return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]

# ==========================
# JSON TEXT EXTRACTOR
# ==========================
def extract_json_text(obj):
    texts = []

    if isinstance(obj, dict):
        for value in obj.values():
            texts.extend(extract_json_text(value))

    elif isinstance(obj, list):
        for item in obj:
            texts.extend(extract_json_text(item))

    elif isinstance(obj, str):
        if obj.strip():
            texts.extend(chunk_text(obj.strip()))

    return texts

# ==========================
# PDF READER
# ==========================
def read_pdf(file_path):
    texts = []
    doc = fitz.open(file_path)

    for page in doc:
        text = page.get_text()
        if text.strip():
            texts.extend(chunk_text(text))

    return texts

# ==========================
# TXT READER
# ==========================
def read_txt(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        text = f.read()
    return chunk_text(text)

# ==========================
# FILE LOADER
# ==========================
def load_file(file_path):
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".json":
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return extract_json_text(data)

    elif ext == ".txt":
        return read_txt(file_path)

    elif ext == ".pdf":
        return read_pdf(file_path)

    else:
        return []

# ==========================
# LOAD ALL FILES FROM FOLDER
# ==========================
all_documents = []

for file in os.listdir(DATA_FOLDER):
    file_path = os.path.join(DATA_FOLDER, file)
    
    if os.path.isfile(file_path):
        print(f"Processing: {file}")
        docs = load_file(file_path)
        all_documents.extend(docs)

print("Total text chunks:", len(all_documents))

# ==========================
# CREATE EMBEDDINGS
# ==========================
embeddings = model.encode(all_documents)

dimension = embeddings.shape[1]
index = faiss.IndexFlatL2(dimension)
index.add(np.array(embeddings))

# Save index and documents
faiss.write_index(index, INDEX_FILE)

with open(DOCS_FILE, "w", encoding="utf-8") as f:
    json.dump(all_documents, f)

print("✅ Universal RAG vector store created successfully!")