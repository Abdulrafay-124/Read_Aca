import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from .models import UserInteraction, BookRecommendation
from django.core.cache import cache

def build_rating_matrix():

    interactions = UserInteraction.objects.filter(
        interaction_type="rating", rating__isnull=False
    ).values("user_id", "book_id", "rating")

    df = pd.DataFrame(list(interactions))
    if df.empty or df["user_id"].nunique() < 2:
        return None  # not enough data to compute meaningful similarity

    matrix = df.pivot_table(index="user_id", columns="book_id", values="rating", fill_value=0)
    return matrix

def compute_item_similarity(matrix):
    # transpose: rows become books, so cosine_similarity compares books to books
    item_matrix = matrix.T
    similarity = cosine_similarity(item_matrix)
    return pd.DataFrame(similarity, index=item_matrix.index, columns=item_matrix.index)


def generate_recommendations_for_user(user_id, matrix, similarity_df, top_n=5):
    if user_id not in matrix.index:
        return []

    user_ratings = matrix.loc[user_id]
    rated_books = user_ratings[user_ratings > 0].index.tolist()
    if not rated_books:
        return []

    scores = {}
    for book_id in similarity_df.index:
        if book_id in rated_books:
            continue  # don't recommend what they've already rated
        # weighted sum: how similar is this book to books the user rated highly
        sim_scores = similarity_df.loc[book_id, rated_books]
        weights = user_ratings[rated_books]
        score = (sim_scores * weights).sum() / (weights.sum() + 1e-9)
        if score > 0:
            scores[book_id] = (score, rated_books[sim_scores.values.argmax()])

    ranked = sorted(scores.items(), key=lambda x: x[1][0], reverse=True)[:top_n]
    return ranked  # [(recommended_book_id, (score, source_book_id)), ...]

def refresh_collaborative_recommendations():
    matrix = build_rating_matrix()
    if matrix is None:
        return 0

    similarity_df = compute_item_similarity(matrix)
    count = 0

    BookRecommendation.objects.filter(rec_type="collaborative").delete()

    affected_user_ids = set()
    for user_id in matrix.index:
        ranked = generate_recommendations_for_user(user_id, matrix, similarity_df)
        for recommended_book_id, (score, source_book_id) in ranked:
            BookRecommendation.objects.create(
                user_id=user_id,
                source_book_id=source_book_id,
                recommended_book_id=recommended_book_id,
                score=float(min(score, 1.0)),
                rec_type="collaborative",
            )
            count += 1
        affected_user_ids.add(user_id)

    for user_id in affected_user_ids:
        cache.delete(f"recommendations:{user_id}")

    return count