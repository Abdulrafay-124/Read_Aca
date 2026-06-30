_model = None

def get_embedding_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(
            "sentence-transformers/all-MiniLM-L6-v2",
            backend="onnx",
            truncate_dim=256,
        )
    return _model

def generate_embedding(book):
    text = f"{book.title}. {book.description}".strip()
    model = get_embedding_model()
    return model.encode(text).tolist()