from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from transformers import (
    BertTokenizer,
    BertModel,
    AutoTokenizer,
    AutoModelForSeq2SeqLM
)

import torch
import nltk
from sklearn.metrics.pairwise import cosine_similarity
from rouge_score import rouge_scorer
from bert_score import score as bertscore
import psutil
import os
import time

# -------------------- SETUP --------------------

nltk.download("punkt")

app = FastAPI(
    title="Text Summarization Backend",
    description="BERT Extractive + T5 Abstractive Summarization",
    version="1.0"
)

# Enable CORS (required for any frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------- LOAD MODELS --------------------
# NOTE: First run will download models (takes time)

# BERT (Extractive)
bert_tokenizer = BertTokenizer.from_pretrained("bert-base-uncased")
bert_model = BertModel.from_pretrained("bert-base-uncased")

# T5 (Abstractive)
t5_tokenizer = AutoTokenizer.from_pretrained("t5-small")
t5_model = AutoModelForSeq2SeqLM.from_pretrained("t5-small")

# -------------------- UTIL FUNCTIONS --------------------

def bert_extractive_summary(text: str, top_k: int = 5) -> str:
    sentences = nltk.sent_tokenize(text)

    if len(sentences) <= top_k:
        return text

    sentence_embeddings = []

    for sentence in sentences:
        inputs = bert_tokenizer(
            sentence,
            return_tensors="pt",
            truncation=True,
            max_length=512
        )

        with torch.no_grad():
            output = bert_model(**inputs)

        # Mean pooling
        embedding = output.last_hidden_state.mean(dim=1)
        sentence_embeddings.append(embedding)

    sentence_embeddings = torch.cat(sentence_embeddings).numpy()
    document_embedding = sentence_embeddings.mean(axis=0, keepdims=True)

    similarity_scores = cosine_similarity(
        sentence_embeddings,
        document_embedding
    )

    ranked_sentences = sorted(
        zip(similarity_scores.flatten(), sentences),
        reverse=True
    )

    selected = [s for _, s in ranked_sentences[:top_k]]
    return " ".join(selected)


def t5_abstractive_summary(text: str) -> str:
    input_text = "summarize: " + text

    tokens = t5_tokenizer(
        input_text,
        return_tensors="pt",
        truncation=True,
        max_length=512
    )

    summary_ids = t5_model.generate(
        tokens["input_ids"],
        max_length=150,
        min_length=70,
        num_beams=4,
        early_stopping=True
    )

    return t5_tokenizer.decode(
        summary_ids[0],
        skip_special_tokens=True
    )

# -------------------- METRIC FUNCTION --------------------

def compute_metrics(reference: str, generated: str):
    scorer = rouge_scorer.RougeScorer(
        ['rouge1', 'rouge2', 'rougeL'],
        use_stemmer=True
    )

    rouge_scores = scorer.score(reference, generated)

    P, R, F1 = bertscore(
        [generated],
        [reference],
        lang="en",
        verbose=False
    )

    return {
        "rouge1": rouge_scores["rouge1"].fmeasure,
        "rouge2": rouge_scores["rouge2"].fmeasure,
        "rougeL": rouge_scores["rougeL"].fmeasure,
        "bert_score": float(F1[0])
    }


# -------------------- API SCHEMA --------------------

class TextInput(BaseModel):
    text: str

class EvaluationInput(BaseModel):
    original_text: str
    reference_summary: str
    gemini_summary: str | None = None

# -------------------- API ENDPOINTS --------------------

@app.get("/")
def health_check():
    return {"status": "Backend running locally"}

@app.post("/summarize")
def summarize(data: TextInput):
    text = data.text.strip()

    if len(text) < 100:
        return {
            "error": "Text too short for meaningful summarization"
        }

    bert_summary = bert_extractive_summary(text)
    t5_summary = t5_abstractive_summary(text)

    return {
        "bert_extractive": bert_summary,
        "t5_abstractive": t5_summary
    }

@app.post("/evaluate")
def evaluate(data: EvaluationInput):

    start_time = time.time()

    bert_summary = bert_extractive_summary(data.original_text)
    t5_summary = t5_abstractive_summary(data.original_text)

    latency = time.time() - start_time

    process = psutil.Process(os.getpid())
    memory_mb = process.memory_info().rss / 1024 / 1024

    results = {
        "latency_seconds": round(latency, 3),
        "memory_usage_mb": round(memory_mb, 2),
        "bert_metrics": compute_metrics(data.reference_summary, bert_summary),
        "t5_metrics": compute_metrics(data.reference_summary, t5_summary)
    }

    if data.gemini_summary:
        results["gemini_metrics"] = compute_metrics(
            data.reference_summary,
            data.gemini_summary
        )

    return results
