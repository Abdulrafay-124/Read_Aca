"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import Stamp from "@/components/Stamp";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useAuthStore } from "@/store/authStore";
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

function extractList<T>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

export default function OrdersPage() {
  const { accessToken } = useRequireAuth();
  const user = useAuthStore((s) => s.user) as { username: string } | null;

  const [orders, setOrders] = useState<Order[]>([]);
  const [rentals, setRentals] = useState<{ id: string; order: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dueDateInputs, setDueDateInputs] = useState<Record<string, string>>({});

 
const loadData = () => {
    Promise.all([
      apiClient<any>("transactions/orders"),
      apiClient<any>("rentals"),
    ])
      .then(([ordersData, rentalsData]) => {
        setOrders(extractList<Order>(ordersData));
        setRentals(extractList(rentalsData));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load orders");
        setLoading(false);
      });
  };


  useEffect(() => {
    if (!accessToken) return;
    loadData();
  }, [accessToken]);

  const updateStatus = async (orderId: string, status: string) => {
    setBusyId(orderId);
    setActionError(null);
    try {
      await apiClient(`transactions/orders/${orderId}/update_status`, {
        method: "PATCH",
        body: { status },
      });
      loadData();
    } catch (err: any) {
      setActionError(err.message || "Failed to update order");
    } finally {
      setBusyId(null);
    }
  };


const returnBook = async (rentalId: string) => {
    setBusyId(rentalId);
    setActionError(null);
    try {
      await apiClient(`rentals/${rentalId}/return_book`, { method: "PATCH" });
      loadData();
    } catch (err: any) {
      setActionError(err.message || "Failed to return book");
    } finally {
      setBusyId(null);
    }
  };


  const createRentalRecord = async (orderId: string) => {
    const dueDate = dueDateInputs[orderId];
    if (!dueDate) {
      setActionError("Pick a due date first");
      return;
    }
    setBusyId(orderId);
    setActionError(null);
    try {
      await apiClient("rentals", {
        method: "POST",
        body: { order: orderId, due_date: dueDate },
      });
      loadData();
    } catch (err: any) {
      setActionError(err.message || "Failed to create rental record");
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#8B3A2B]">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-display text-3xl font-semibold">My Orders</h1>
          <Link href="/browse" className="text-[#2F4538] underline text-sm">
            Browse Books
          </Link>
        </div>

        {actionError && (
          <Card className="mb-4 p-3 bg-[#FAF7F0]">
            <p className="text-[#8B3A2B] text-sm">{actionError}</p>
          </Card>
        )}

        {orders.length === 0 ? (
          <p className="text-[#2B2620]/70">No orders yet.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isSeller = order.seller === user?.username;
              const isBuyer = order.buyer === user?.username;
              const busy = busyId === order.id;
              const rental = rentals.find((r) => r.order === order.id);
              const hasActiveRental = Boolean(rental && rental.status !== "returned");
              const statusColor = order.status === "cancelled" ? "oxblood" : order.status === "pending" ? "brass" : "green";

              return (
                <Card key={order.id} className="p-5">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="font-mono text-xs text-[#2B2620]/50">{order.id}</p>
                      <p className="mt-1">
                        <span className="font-semibold capitalize">{order.order_type}</span>{" "}
                        · RM <span className="font-mono">{order.total_price}</span>
                      </p>
                      <p className="text-sm text-[#2B2620]/70 mt-1">
                        {isSeller ? "You are selling" : "You are buying"} · Buyer: {order.buyer} · Seller: {order.seller}
                      </p>
                    </div>
                    <Stamp color={statusColor}>{order.status}</Stamp>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 items-center">
                    {isSeller && order.status === "pending" && (
                      <button
                        disabled={busy}
                        onClick={() => updateStatus(order.id, "confirmed")}
                        className="bg-[#2F4538] hover:bg-[#26392c] text-[#EDE7D9] text-sm font-semibold py-1.5 px-4 rounded-sm disabled:opacity-50"
                      >
                        Confirm Order
                      </button>
                    )}
                    {isSeller && order.status === "confirmed" && (
                      <button
                        disabled={busy}
                        onClick={() => updateStatus(order.id, "shipped")}
                        className="bg-[#2F4538] hover:bg-[#26392c] text-[#EDE7D9] text-sm font-semibold py-1.5 px-4 rounded-sm disabled:opacity-50"
                      >
                        Mark as Shipped
                      </button>
                    )}
                    {isBuyer && order.status === "shipped" && (
                      <button
                        disabled={busy}
                        onClick={() => updateStatus(order.id, "completed")}
                        className="bg-[#2F4538] hover:bg-[#26392c] text-[#EDE7D9] text-sm font-semibold py-1.5 px-4 rounded-sm disabled:opacity-50"
                      >
                        Mark as Received / Complete
                      </button>
                    )}
                    {isBuyer && order.status === "pending" && (
                      <button
                        disabled={busy}
                        onClick={() => updateStatus(order.id, "cancelled")}
                        className="bg-[#8B3A2B] hover:bg-[#6f2e21] text-[#EDE7D9] text-sm font-semibold py-1.5 px-4 rounded-sm disabled:opacity-50"
                      >
                        Cancel Order
                      </button>
                    )}

                    {isBuyer &&
                      order.order_type === "rental" &&
                      !hasActiveRental &&
                      (order.status === "confirmed" || order.status === "shipped") && (
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={dueDateInputs[order.id] || ""}
                            onChange={(e) =>
                              setDueDateInputs((prev) => ({ ...prev, [order.id]: e.target.value }))
                            }
                            className="border border-[#2F4538]/20 rounded-sm px-2 py-1 text-sm bg-[#FAF7F0]"
                          />
                          <button
                            disabled={busy}
                            onClick={() => createRentalRecord(order.id)}
                            className="bg-[#2F4538] hover:bg-[#26392c] text-[#EDE7D9] text-sm font-semibold py-1.5 px-4 rounded-sm disabled:opacity-50"
                          >
                            Start Rental
                          </button>
                        </div>
                      )}

                    {isBuyer && order.order_type === "rental" && hasActiveRental && rental && (
                      <button
                        disabled={busyId === rental.id}
                        onClick={() => returnBook(rental.id)}
                        className="bg-[#A67C3D] hover:bg-[#8b6428] text-[#EDE7D9] text-sm font-semibold py-1.5 px-4 rounded-sm disabled:opacity-50"
                      >
                        Return Book
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}