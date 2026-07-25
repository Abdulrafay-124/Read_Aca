"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import { apiClient } from "@/lib/apiClient";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [role, setRole] = useState("buyer"); // Default role
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== password2) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await apiClient("auth/register/", { 
        method: "POST", 
        body: { email, username, password, password2, role },
        skipAuth: true 
      });
      setSuccess("Registration successful! Please log in.");
      router.push("/login");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md p-8">
        <h1 className="font-display text-3xl font-semibold mb-6 text-center">Register</h1>
        {error && <p className="text-[#8B3A2B] text-center mb-4">{error}</p>}
        {success && <p className="text-[#2F4538] text-center mb-4">{success}</p>}
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
          <div className="mb-4">
            <label htmlFor="username" className="block text-[#2B2620] text-sm font-semibold mb-2">
              Username:
            </label>
            <input
              type="text"
              id="username"
              className="appearance-none border border-[#2F4538]/20 rounded-sm w-full py-2 px-3 text-[#2B2620] leading-tight focus:outline-none focus:border-[#2F4538]"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-[#2B2620] text-sm font-semibold mb-2">
              Password:
            </label>
            <input
              type="password"
              id="password"
              className="appearance-none border border-[#2F4538]/20 rounded-sm w-full py-2 px-3 text-[#2B2620] leading-tight focus:outline-none focus:border-[#2F4538]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password2" className="block text-[#2B2620] text-sm font-semibold mb-2">
              Confirm Password:
            </label>
            <input
              type="password"
              id="password2"
              className="appearance-none border border-[#2F4538]/20 rounded-sm w-full py-2 px-3 text-[#2B2620] mb-3 leading-tight focus:outline-none focus:border-[#2F4538]"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="role" className="block text-[#2B2620] text-sm font-semibold mb-2">
              Role:
            </label>
            <select
              id="role"
              className="appearance-none border border-[#2F4538]/20 rounded-sm w-full py-2 px-3 text-[#2B2620] leading-tight focus:outline-none focus:border-[#2F4538]"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-[#2F4538] hover:bg-[#26392c] text-[#EDE7D9] font-semibold py-2 px-4 rounded-sm focus:outline-none"
            >
              Register
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
