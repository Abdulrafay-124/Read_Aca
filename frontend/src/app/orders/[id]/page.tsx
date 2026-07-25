"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Card from "@/components/Card";
import Stamp from "@/components/Stamp";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { apiClient } from "@/lib/apiClient";

interface Order {
  id: string;
  buyer: string;
  seller: string;
  book: string;
  order_type: string;
  total_price: string;
  status: string;
  created_at: string;
}

export default function OrderConfirmationPage() {
  const { accessToken } = useRequireAuth();
  const params = useParams();
  const id = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !id) return;

    apiClient<Order>(`transactions/orders/${id}`)
      .then((data) => {
        setOrder(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Order not found");
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

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-[#8B3A2B] mb-4">{error || "Order not found."}</p>
        <Link href="/browse" className="text-[#2F4538] underline">
          Back to Browse
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="text-[#2F4538] text-4xl mb-4">✓</div>
        <h1 className="font-display text-3xl font-semibold mb-2">Order Placed!</h1>
        <p className="text-[#2B2620]/70 mb-6">Your order is now <Stamp color={order.status === "cancelled" ? "oxblood" : order.status === "pending" ? "brass" : "green"}>{order.status}</Stamp>.</p>

        <div className="text-left bg-[#FAF7F0] rounded-sm p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-[#2B2620]/70">Order ID</span>
            <span className="font-mono text-sm">{order.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#2B2620]/70">Seller</span>
            <span>{order.seller}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#2B2620]/70">Type</span>
            <span className="capitalize">{order.order_type}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span className="font-mono">RM {order.total_price}</span>
          </div>
        </div>

        <Link
          href="/browse"
          className="inline-block mt-6 text-[#2F4538] underline"
        >
          Continue Browsing
        </Link>
      </Card>
    </div>
  );
}