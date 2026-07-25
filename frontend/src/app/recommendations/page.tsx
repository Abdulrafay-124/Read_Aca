"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import Stamp from "@/components/Stamp";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { apiClient } from "@/lib/apiClient";

interface Recommendation {
  id: string;
  source_book: string;
  recommended_book: string;
  recommended_book_title: string;
  score: number;
  rec_type: string;
  created_at: string;
}

function extractList<T>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

export default function RecommendationsPage() {
  const { accessToken } = useRequireAuth();
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    apiClient<any>("recommendations/my-recommendations")
      .then((data) => {
        setRecs(extractList<Recommendation>(data));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load recommendations");
        setLoading(false);
      });
  }, [accessToken]);

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
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-display text-3xl font-semibold">Recommended for You</h1>
          <Link href="/browse" className="text-[#2F4538] underline text-sm">
            Browse All
          </Link>
        </div>

        {recs.length === 0 ? (
          <p className="text-[#2B2620]/70">
            No recommendations yet — interact with a few books (view, rate, buy, or rent)
            to get personalized picks.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {recs.map((rec) => (
              <Link
                key={rec.id}
                href={`/browse/${rec.recommended_book}`}
                className="block"
              >
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <h2 className="font-display text-lg font-semibold truncate">{rec.recommended_book_title}</h2>
                  <div className="mt-2">
                    <Stamp color="brass">{rec.rec_type} match</Stamp>
                  </div>
                  <div className="mt-3 bg-[#EDE7D9] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#2F4538] h-full"
                      style={{ width: `${Math.min(rec.score * 100, 100)}%` }}
                    />
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