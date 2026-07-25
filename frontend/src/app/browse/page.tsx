"use client";

import { useEffect, useState } from "react";
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

interface BookListing {
  id: string;
  seller: string;
  category: string; // id, on the list serializer
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

// Handles both paginated ({ results: [...] }) and plain array responses,
// since we haven't confirmed which BookListingViewSet actually returns.
function extractList<T>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

export default function BrowsePage() {
  const { accessToken } = useRequireAuth();
  const [listings, setListings] = useState<BookListing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!accessToken) return;

    Promise.all([
      apiClient<any>("inventory/listings"),
      apiClient<any>("inventory/categories"),
    ])
      .then(([listingsData, categoriesData]) => {
        setListings(extractList<BookListing>(listingsData));
        setCategories(extractList<Category>(categoriesData));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load listings");
        setLoading(false);
      });
  }, [accessToken]);

  const visibleListings = listings
    .filter((l) => l.is_available)
    .filter((l) => selectedCategory === "all" || l.category === selectedCategory)
    .filter(
      (l) =>
        search.trim() === "" ||
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.author.toLowerCase().includes(search.toLowerCase())
    )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#8B3A2B]">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center mb-6">
          <h1 className="font-display text-3xl font-semibold">Browse Books</h1>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-[#2F4538]/20 rounded-sm px-3 py-2 bg-[#FAF7F0]"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
                type="text"
                placeholder="Search title or author..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-[#2F4538]/20 rounded-sm px-3 py-2 flex-1 md:max-w-xs bg-[#FAF7F0]"
              />
          </div>
        </div>

        {visibleListings.length === 0 ? (
          <p className="text-[#2B2620]/70">No books available right now.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {visibleListings.map((book) => (
              <Link
                key={book.id}
                href={`/browse/${book.id}`}
                className="block"
              >
                <Card className="p-4 flex flex-col h-full hover:shadow-md transition-shadow">
                  <div className="aspect-[2/3] bg-[#EDE7D9] rounded-sm mb-3 overflow-hidden">
                    {book.cover_image_url ? (
                      <img
                        src={book.cover_image_url}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#2B2620]/50 text-sm">
                        No Cover
                      </div>
                    )}
                  </div>
                  <h2 className="font-display text-lg font-semibold truncate">{book.title}</h2>
                  <p className="text-sm text-[#2B2620]/70 truncate">{book.author}</p>
                  <div className="mt-3 flex justify-between items-center gap-2">
                    <span className="font-mono font-semibold">RM {book.price}</span>
                    <Stamp color={book.listing_type === "rental" ? "brass" : "green"}>{book.listing_type}</Stamp>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}