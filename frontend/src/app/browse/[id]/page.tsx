"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/Card";
import Stamp from "@/components/Stamp";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { apiClient } from "@/lib/apiClient";


interface Category {
  id: string;
  name: string;
  slug: string;
  parent: string | null;
}

interface BookListingDetail {
  id: string;
  seller: string;
  category: Category | string; // object if BookListingDetailSerializer is used, id string otherwise
  isbn: string;
  title: string;
  author: string;
  description: string;
  condition: string;
  listing_type: string;
  price: string;
  cover_image_url: string | null;
  is_available: boolean;
}

export default function BookDetailPage() {
  const { accessToken } = useRequireAuth();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [book, setBook] = useState<BookListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [renting, setRenting] = useState(false);
  const [rentError, setRentError] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [ratingSuccess, setRatingSuccess] = useState(false);
  const [similarBooks, setSimilarBooks] = useState<any[]>([]);
  


  const submitRating = async (value: number) => {
    setRatingSubmitting(true);
    setRatingError(null);
    try {
      await apiClient("recommendations/ratings", {
        method: "POST",
        body: { book: book.id, rating: value },
      });
      setRating(value);
      setRatingSuccess(true);
    } catch (err: any) {
      setRatingError(err.message || "Failed to submit rating");
    } finally {
      setRatingSubmitting(false);
    }
  };

  useEffect(() => {
    if (!accessToken || !id) return;

    apiClient<BookListingDetail>(`inventory/listings/${id}`)
      .then((data) => {
        setBook(data);
        setLoading(false);
        apiClient<{ rating: number | null }>(`recommendations/ratings/mine/${id}`)
          .then((data) => {
            if (data.rating) {
              setRating(data.rating);
              setRatingSuccess(true);
            }
          })
          .catch(() => {}); // no rating yet, leave stars empty

        apiClient<any[]>(`inventory/listings/${id}/similar`)
          .then((similar) => setSimilarBooks(similar))
          .catch(() => setSimilarBooks([]));

        

      })
      .catch((err) => {
        setError(err.message || "Book not found");
        setLoading(false);
      });
  }, [accessToken, id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-[#8B3A2B] mb-4">{error || "This book could not be found."}</p>
        <Link href="/browse" className="text-[#2F4538] underline">
          Back to Browse
        </Link>
      </div>
    );
  }

  const categoryName =
    typeof book.category === "object" && book.category !== null
      ? book.category.name
      : book.category;

  const canBuy = book.listing_type === "sale" || book.listing_type === "both";
  const canRent = book.listing_type === "rental" || book.listing_type === "both";

  return (
    <div className="min-h-screen p-8">
      <Card className="max-w-4xl mx-auto p-8">
        <Link href="/browse" className="text-[#2F4538] underline text-sm">
          ← Back to Browse
        </Link>

        <div className="mt-4 flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-64 h-96 bg-gray-100 rounded overflow-hidden flex-shrink-0">
              {book.cover_image_url ? (
                <img
                    src={book.cover_image_url}
                    alt={book.title}
                    className="w-full h-full object-contain"
                />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#2B2620]/50 text-sm">
                No Cover
              </div>
            )}
          </div>

          <div className="flex-1">
            <h1 className="font-display text-3xl font-semibold">{book.title}</h1>
            <p className="text-[#2B2620]/70">{book.author}</p>
            <p className="font-mono text-sm text-[#2B2620]/60 mt-1">ISBN: {book.isbn}</p>

            <div className="mt-4 flex gap-2 flex-wrap">
              <Stamp color="brass">{book.condition}</Stamp>
              <Stamp color={book.listing_type === "sale" ? "green" : "brass"}>{book.listing_type}</Stamp>
              {categoryName && <Stamp color="green">{categoryName}</Stamp>}
            </div>

            <p className="mt-4 text-[#2B2620]">{book.description}</p>

            <p className="mt-4 text-sm text-[#2B2620]/70">Sold by {book.seller}</p>

            <div className="mt-6 text-3xl font-display font-semibold">RM <span className="font-mono">{book.price}</span></div>

            <div className="mt-6 flex gap-3">
              {canBuy && (
                <button
                  onClick={async () => {
                        setBuying(true);
                        setBuyError(null);
                        try {
                            const order = await apiClient<{ id: string }>("transactions/orders", {
                            method: "POST",
                            body: { book: book.id, order_type: "sale" },
                            });
                            router.push(`/orders/${order.id}`);
                        } catch (err: any) {
                            setBuyError(err.message || "Failed to create order");
                            setBuying(false);
                        }
                        }}
                        disabled={buying}
                  className="bg-[#2F4538] hover:bg-[#26392c] text-[#EDE7D9] font-semibold py-2 px-6 rounded-sm"
                >
                {buying ? "Processing..." : "Buy"}
                </button>
              )}
              {canRent && (
                <button
                    onClick={async () => {
                    setRenting(true);
                    setRentError(null);
                    try {
                      const order = await apiClient<{ id: string }>("transactions/orders", {
                        method: "POST",
                        body: { book: book.id, order_type: "rental" },
                      });
                      router.push(`/orders/${order.id}`);
                    } catch (err: any) {
                      setRentError(err.message || "Failed to create rental order");
                      setRenting(false);
                    }
                  }}
                  disabled={renting}
                  className="bg-[#2F4538] hover:bg-[#26392c] text-[#EDE7D9] font-semibold py-2 px-6 rounded-sm"
                >
                  {renting ? "Processing..." : "Rent"}
                </button>
              )}
            </div>

                {buyError && (
                <p className="mt-3 text-[#8B3A2B] text-sm">{buyError}</p>
                )}
                {rentError && (
                <p className="mt-3 text-[#8B3A2B] text-sm">{rentError}</p>
                )}
                  <div className="mt-6">
                    <p className="text-sm text-[#2B2620]/70 mb-2">
                      {ratingSuccess ? "Your rating:" : "Rate this book:"}
                    </p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          disabled={ratingSubmitting}
                          onClick={() => submitRating(star)}
                          className={`text-2xl ${
                            rating && star <= rating ? "text-[#A67C3D]" : "text-[#2B2620]/30"
                          } hover:text-[#A67C3D] disabled:opacity-50`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    {ratingError && <p className="text-[#8B3A2B] text-sm mt-1">{ratingError}</p>}
                  </div>

                            {similarBooks.length > 0 && (
                    <div className="mt-8 max-w-4xl mx-auto">
                      <h2 className="font-display text-xl font-semibold mb-4">Similar Books</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {similarBooks.map((sb) => (
                          <Link
                            key={sb.id}
                            href={`/browse/${sb.id}`}
                            className="bg-white rounded-sm border-l-4 border-[#2F4538] shadow-sm p-3 flex flex-col hover:shadow-md transition"
                          >
                            <div className="aspect-[2/3] bg-gray-200 rounded-sm mb-2 overflow-hidden">
                              {sb.cover_image_url ? (
                                <img src={sb.cover_image_url} alt={sb.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                  No Cover
                                </div>
                              )}
                            </div>
                            <p className="text-sm font-semibold truncate">{sb.title}</p>
                            <p className="text-xs text-gray-500 truncate">{sb.author}</p>
                            <div className="flex justify-between items-center mt-1">
                              <span className="font-mono text-sm">RM {sb.price}</span>
                              <span className="text-xs bg-[#A67C3D] text-white rounded-sm px-1.5 py-0.5 font-mono">
                                {Math.round(sb.similarity_score)}% match
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}    
          </div>
        </div>
      </Card>
    </div>
  );
}