"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { apiClient } from "@/lib/apiClient";

interface Category {
  id: string;
  name: string;
}

export default function NewListingPage() {
  const { accessToken } = useRequireAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    category: "",
    isbn: "",
    title: "",
    author: "",
    description: "",
    condition: "good",
    listing_type: "sale",
    price: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    apiClient<any>("inventory/categories").then((data) => {
      const list = Array.isArray(data) ? data : (data?.results || []);
      setCategories(list);
      if (list.length > 0) {
        setForm((f) => ({ ...f, category: list[0].id }));
      }
    });
  }, [accessToken]);

 const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      if (coverImage) {
        formData.append("cover_image", coverImage);
      }

      const listing = await apiClient<{ id: string }>("inventory/listings", {
        method: "POST",
        body: formData,
      });
      router.push("/my-listings");
    } catch (err: any) {
      setError(err.message || "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <Card className="max-w-lg mx-auto p-8">
        <h1 className="font-display text-3xl font-semibold mb-6">New Listing</h1>

        {error && <p className="text-[#8B3A2B] text-sm mb-4">{error}</p>}

        <div>
        <label className="block text-sm text-[#2B2620]/70 mb-1">Cover Image (optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
          className="w-full border border-[#2F4538]/20 rounded-sm px-3 py-2 bg-[#FAF7F0]"
        />
        </div>

        <div className="space-y-4 mt-4">
          <input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border border-[#2F4538]/20 rounded-sm px-3 py-2 bg-[#FAF7F0]"
          />
          <input
            placeholder="Author"
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
            className="w-full border border-[#2F4538]/20 rounded-sm px-3 py-2 bg-[#FAF7F0]"
          />
          <input
            placeholder="ISBN"
            value={form.isbn}
            onChange={(e) => setForm({ ...form, isbn: e.target.value })}
            className="w-full border border-[#2F4538]/20 rounded-sm px-3 py-2 bg-[#FAF7F0] font-mono"
          />
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-[#2F4538]/20 rounded-sm px-3 py-2 bg-[#FAF7F0]"
            rows={3}
          />

          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full border border-[#2F4538]/20 rounded-sm px-3 py-2 bg-[#FAF7F0]"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={form.condition}
            onChange={(e) => setForm({ ...form, condition: e.target.value })}
            className="w-full border border-[#2F4538]/20 rounded-sm px-3 py-2 bg-[#FAF7F0]"
          >
            <option value="new">New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>

          <select
            value={form.listing_type}
            onChange={(e) => setForm({ ...form, listing_type: e.target.value })}
            className="w-full border border-[#2F4538]/20 rounded-sm px-3 py-2 bg-[#FAF7F0]"
          >
            <option value="sale">Sale</option>
            <option value="rental">Rental</option>
            <option value="both">Both</option>
          </select>

          <input
            type="number"
            step="0.01"
            placeholder="Price"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="w-full border border-[#2F4538]/20 rounded-sm px-3 py-2 bg-[#FAF7F0] font-mono"
          />

          <button
            onClick={submit}
            disabled={submitting}
            className="w-full bg-[#2F4538] hover:bg-[#26392c] text-[#EDE7D9] font-semibold py-2 rounded-sm disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Listing"}
          </button>
        </div>
      </Card>
    </div>
  );
}