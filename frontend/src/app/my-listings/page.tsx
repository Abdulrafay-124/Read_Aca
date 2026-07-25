"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import Stamp from "@/components/Stamp";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { apiClient } from "@/lib/apiClient";

interface Listing {
  id: string;
  title: string;
  author: string;
  price: string;
  is_available: boolean;
  listing_type: string;
}

function extractList<T>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

export default function MyListingsPage() {
  const { accessToken } = useRequireAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    apiClient<any>("inventory/listings/my_listings")
      .then((data) => {
        setListings(extractList<Listing>(data));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load your listings");
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!accessToken) return;
    load();
  }, [accessToken]);

  const toggleAvailability = async (id: string) => {
    setBusyId(id);
    try {
      await apiClient(`inventory/listings/${id}/toggle_availability`, { method: "PATCH" });
      load();
    } catch (err: any) {
      setError(err.message || "Failed to update listing");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-display text-3xl font-semibold">My Listings</h1>
          <Link
            href="/my-listings/new"
            className="bg-[#2F4538] hover:bg-[#26392c] text-[#EDE7D9] font-semibold py-2 px-4 rounded-sm"
          >
            + New Listing
          </Link>
        </div>

        {error && <p className="text-[#8B3A2B] text-sm mb-4">{error}</p>}

        {listings.length === 0 ? (
          <p className="text-[#2B2620]/70">You haven't listed any books yet.</p>
        ) : (
          <div className="space-y-3">
            {listings.map((l) => (
              <Card key={l.id} className="p-4 flex justify-between items-center gap-4">
                <div>
                  <p className="font-display text-lg font-semibold">{l.title}</p>
                  <p className="text-sm text-[#2B2620]/70">
                    {l.author} · <span className="font-mono">RM {l.price}</span> · <Stamp color={l.listing_type === "sale" ? "green" : "brass"}>{l.listing_type}</Stamp>
                  </p>
                </div>
                <button
                  disabled={busyId === l.id}
                  onClick={() => toggleAvailability(l.id)}
                  className={`text-sm font-semibold py-1.5 px-4 rounded-sm disabled:opacity-50 ${
                    l.is_available
                      ? "bg-[#2F4538] hover:bg-[#26392c] text-[#EDE7D9]"
                      : "bg-[#A67C3D] hover:bg-[#8b6428] text-[#EDE7D9]"
                  }`}
                >
                  {l.is_available ? "Mark Unavailable" : "Mark Available"}
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}