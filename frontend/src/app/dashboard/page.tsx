"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import Stamp from "@/components/Stamp";
import { useAuthStore } from "@/store/authStore";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { apiClient } from "@/lib/apiClient";
import Link from "next/link";

interface UserProfile {
  id: string;
  email: string;
  username: string;
  role: string;
  wallet_balance: string; // Assuming DecimalField from Django is sent as string
}

export default function DashboardPage() {
  const { refreshToken, clearAuth } = useAuthStore();
  const { accessToken: requiredAccessToken } = useRequireAuth(); // Use the hook for redirection
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (requiredAccessToken) { // Only fetch if authenticated
      const fetchProfile = async () => {
        try {
          setLoading(true);
          // Explicitly cast the return type to UserProfile
          const data = await apiClient("auth/profile/", { method: "GET" }) as UserProfile;
          setUserProfile(data);
        } catch (err: any) {
          setError(err.message || "Failed to fetch profile");
          clearAuth(); // Clear auth if profile fetch fails (e.g., 401 after refresh failed)
          router.push("/login");
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    } else {
      setLoading(false); // No access token, so not loading profile
    }
  }, [requiredAccessToken, clearAuth, router]);

  const handleLogout = async () => {
    try {
      // LogoutView requires "refresh" token in the POST body
      if (refreshToken) {
        await apiClient("auth/logout/", { method: "POST", body: { refresh: refreshToken } });
      } else {
        // Even if no refresh token, try to hit the endpoint (best effort) or just clear locally
        await apiClient("auth/logout/", { method: "POST" });
      }
    } catch (err) {
      console.error("Logout backend call failed:", err);
      // Log out locally even if backend call fails
    } finally {
      clearAuth();
      router.push("/login");
    }
  };

  if (!requiredAccessToken) {
    return null; // The hook handles redirection, render nothing until then
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md p-8 text-center">
          <p className="text-[#8B3A2B]">Error: {error}</p>
          <button
            onClick={handleLogout} // Allow logout even on error
            className="bg-[#8B3A2B] hover:bg-[#6f2e21] text-[#EDE7D9] font-semibold py-2 px-4 rounded-sm focus:outline-none mt-4"
          >
            Logout
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Card className="w-full max-w-3xl p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Profile header */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#2F4538] text-[#EDE7D9] flex items-center justify-center text-2xl font-display">
              {userProfile?.username ? userProfile.username.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold">{userProfile?.username || "User"}</h1>
              <div className="mt-1 flex items-center gap-2">
                <Stamp color={userProfile?.role === "seller" ? "oxblood" : "green"}>{userProfile?.role || "user"}</Stamp>
                <p className="text-[#2B2620]/70 text-sm">{userProfile?.email}</p>
              </div>
            </div>
          </div>

          {/* Quick actions / logout */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="bg-[#8B3A2B] hover:bg-[#6f2e21] text-[#EDE7D9] font-semibold py-2 px-4 rounded-sm focus:outline-none"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Stats / summary row */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#FAF7F0] rounded-sm border border-[#2F4538]/10 p-4 flex flex-col">
            <span className="text-sm text-[#2B2620]/70">Wallet Balance</span>
            <span className="mt-2 text-2xl font-display font-semibold"><span className="font-mono">RM {userProfile?.wallet_balance ?? '0.00'}</span></span>
          </div>

          <div className="bg-[#FAF7F0] rounded-sm border border-[#2F4538]/10 p-4 flex flex-col">
            <span className="text-sm text-[#2B2620]/70">Account</span>
            <span className="mt-2 text-lg font-semibold">{userProfile?.role ? userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1) : 'User'}</span>
            <p className="text-sm text-[#2B2620]/60 mt-2">Quick access to your account overview and recent activity.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
