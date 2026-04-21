"""
Train the categorization model using synthetic data.
Run: python train_model.py
"""
import os, csv
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score
import joblib

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "training_transactions.csv")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "categorizer.joblib")


def load_data(filepath: str) -> tuple[list[str], list[str]]:
    descriptions = []
    categories = []
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            descriptions.append(row["description"])
            categories.append(row["category"])
    return descriptions, categories


def train():
    if not os.path.exists(DATA_PATH):
        print(f"Training data not found at {DATA_PATH}")
        print("Run seed_data.py first to generate training data.")
        return

    descriptions, categories = load_data(DATA_PATH)
    print(f"Loaded {len(descriptions)} training samples")

    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 2),
            stop_words='english',
            sublinear_tf=True,
        )),
        ('clf', MultinomialNB(alpha=0.1)),
    ])

    scores = cross_val_score(pipeline, descriptions, categories, cv=5, scoring='accuracy')
    print(f"Cross-validation accuracy: {scores.mean():.3f} (+/- {scores.std():.3f})")

    pipeline.fit(descriptions, categories)

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")

    from collections import Counter
    dist = Counter(categories)
    print("Category distribution:")
    for cat, count in sorted(dist.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")


if __name__ == "__main__":
    train()
