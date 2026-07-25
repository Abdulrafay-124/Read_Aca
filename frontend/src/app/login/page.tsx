"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/apiClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const data = await apiClient("auth/login/", { method: "POST", body: { email, password }, skipAuth: true });
      setAuth(data.access, data.refresh, data.user); // Assuming backend returns access, refresh, and user object
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md p-8">
        <h1 className="font-display text-3xl font-semibold mb-6 text-center">Login</h1>
        {error && <p className="text-[#8B3A2B] text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-[#2B2620] text-sm font-semibold mb-2">
              Email:
            </label>
            <input
              type="email"
              id="email"
              className="appearance-none border border-[#2F4538]/20 rounded-sm w-full py-2 px-3 text-[#2B2620] leading-tight focus:outline-none focus:border-[#2F4538]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-[#2B2620] text-sm font-semibold mb-2">
              Password:
            </label>
            <input
              type="password"
              id="password"
              className="appearance-none border border-[#2F4538]/20 rounded-sm w-full py-2 px-3 text-[#2B2620] mb-3 leading-tight focus:outline-none focus:border-[#2F4538]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-[#2F4538] hover:bg-[#26392c] text-[#EDE7D9] font-semibold py-2 px-4 rounded-sm focus:outline-none"
            >
              Sign In
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
