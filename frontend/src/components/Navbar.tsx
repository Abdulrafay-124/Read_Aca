"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function Navbar() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <header className="bg-[#2F4538] text-[#EDE7D9]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href={accessToken ? "/dashboard" : "/login"} className="font-display text-2xl font-semibold tracking-tight">
          ReadAca
        </Link>

        {accessToken ? (
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/browse" className="hover:text-[#A67C3D]">Browse</Link>
            <Link href="/orders" className="hover:text-[#A67C3D]">My Orders</Link>
            <Link href="/my-listings" className="hover:text-[#A67C3D]">My Listings</Link>
            <Link href="/recommendations" className="hover:text-[#A67C3D]">For You</Link>
            <Link href="/chat" className="hover:text-[#A67C3D]">Ask ReadAca</Link>
            <Link href="/wallet" className="hover:text-[#A67C3D]">Wallet</Link>
            <button onClick={handleLogout} className="text-[#8B3A2B] hover:opacity-80 font-medium">
              Logout
            </button>
          </nav>
        ) : (
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/login" className="hover:text-[#A67C3D]">Login</Link>
            <Link href="/register" className="hover:text-[#A67C3D]">Register</Link>
          </nav>
        )}
      </div>
    </header>
  );
}