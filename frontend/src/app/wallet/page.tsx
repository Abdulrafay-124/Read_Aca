"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { apiClient } from "@/lib/apiClient";

interface LedgerEntry {
  id: string;
  amount: string;
  transaction_type: string;
  balance_after: string;
  note: string;
  created_at: string;
}

export default function WalletPage() {
  const { accessToken } = useRequireAuth();
  const [balance, setBalance] = useState<string | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBalance = () => {
    apiClient<{ wallet_balance: string; last_20_transactions: LedgerEntry[] }>(
      "transactions/wallet/balance"
    )
      .then((data) => {
        setBalance(data?.wallet_balance ?? null);
        setEntries(data?.last_20_transactions ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load wallet");
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!accessToken) return;
    loadBalance();
  }, [accessToken]);

  const topUp = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiClient("transactions/wallet/topup", {
        method: "POST",
        body: { amount: value.toFixed(2) },
      });
      setAmount("");
      loadBalance();
    } catch (err: any) {
      setError(err.message || "Top-up failed");
    } finally {
      setSubmitting(false);
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
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-3xl font-semibold mb-6">Wallet</h1>

        <Card className="p-6 mb-6">
          <p className="text-[#2B2620]/70 text-sm">Current Balance</p>
          <p className="text-4xl font-display font-semibold mt-1">RM <span className="font-mono">{balance}</span></p>

          <div className="mt-4 flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border border-[#2F4538]/20 rounded-sm px-3 py-2 flex-1 bg-[#FAF7F0]"
            />
            <button
              onClick={topUp}
              disabled={submitting}
              className="bg-[#2F4538] hover:bg-[#26392c] text-[#EDE7D9] font-semibold px-6 py-2 rounded-sm disabled:opacity-50"
            >
              {submitting ? "Processing..." : "Top Up"}
            </button>
          </div>
          {error && <p className="text-[#8B3A2B] text-sm mt-2">{error}</p>}
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-xl font-semibold mb-3">Recent Transactions</h2>
          {entries.length === 0 ? (
            <p className="text-[#2B2620]/60 text-sm">No transactions yet.</p>
          ) : (
            <div className="space-y-2">
              {entries.map((e) => (
                <div key={e.id} className="flex justify-between text-sm border-b border-[#2F4538]/10 pb-2">
                  <div>
                    <p className="capitalize">{e.transaction_type.replace("_", " ")}</p>
                    <p className="text-[#2B2620]/50 text-xs">{e.note}</p>
                  </div>
                  <p className={parseFloat(e.amount) < 0 ? "text-[#8B3A2B] font-mono" : "text-[#2F4538] font-mono"}>
                    {parseFloat(e.amount) >= 0 ? "+" : ""}
                    {e.amount}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}