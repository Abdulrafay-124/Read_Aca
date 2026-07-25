import { useAuthStore } from "@/store/authStore";
import { redirect } from "next/navigation";

const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE_URL = `${RAW_BASE_URL.replace(/\/$/, "")}/api`;

interface CustomRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: Record<string, any> | BodyInit;
  skipAuth?: boolean; // To allow requests that don\`t need authentication
}

const isResponseEmpty = (response: Response) => {
  const contentLength = response.headers.get("content-length");
  return response.status === 204 || contentLength === "0";
};

export const apiClient = async <T>(endpoint: string, options?: CustomRequestOptions): Promise<T | undefined> => {
  const { accessToken, refreshToken, clearAuth, setAuth } = useAuthStore.getState();
  
  const cleanEndpoint = endpoint.replace(/^\/+|\/+$/g, ""); // Normalize endpoint
  const isFormData = options?.body instanceof FormData;
  const requestHeaders: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options?.headers || {}),
  };

  if (accessToken && !options?.skipAuth) {
    requestHeaders["Authorization"] = `Bearer ${accessToken}`;
  }

  let requestBody: BodyInit | undefined;
  if (options?.body) {
    if (typeof options.body === "object" && !ArrayBuffer.isView(options.body) && !(options.body instanceof Blob) && !(options.body instanceof FormData) && !(options.body instanceof URLSearchParams) && !(options.body instanceof ReadableStream)) {
      // Assume it\`s a plain object to be JSON.stringified
      requestBody = JSON.stringify(options.body);
    } else {
      requestBody = options.body as BodyInit;
    }
  }

  const config: RequestInit = {
    method: options?.method || "GET",
    headers: requestHeaders,
    body: requestBody,
  };

  const response = await fetch(`${API_BASE_URL}/${cleanEndpoint}/`, config);

  if (response.status === 401 && !options?.skipAuth) {
    if (refreshToken) {
      // Attempt token refresh
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (refreshResponse.ok) {
        if (isResponseEmpty(refreshResponse)) {
          // If refresh response is empty, it's still a successful token clear
          setAuth(null, null, null); // Clear all auth data
          redirect("/login");
          return undefined; 
        }
        const data = await refreshResponse.json();
        setAuth(data.access, data.refresh, useAuthStore.getState().user); // Update tokens, keep existing user data

        // Retry original request with new access token
        requestHeaders["Authorization"] = `Bearer ${data.access}`;
        const retryResponse = await fetch(`${API_BASE_URL}/${cleanEndpoint}/`, { ...config, headers: requestHeaders });
        if (retryResponse.ok) {
          if (isResponseEmpty(retryResponse)) {
            return undefined as T; // Return undefined for empty response
          }
          return retryResponse.json();
        } else {
          // If retry fails, clear auth and redirect to login
          clearAuth();
          redirect("/login");
          return undefined; // Ensure function returns in this path
        }
      } else {
        // If refresh fails, clear auth and redirect to login
        clearAuth();
        redirect("/login");
        return undefined; // Ensure function returns in this path
      }
    } else {
      // No refresh token, clear auth and redirect to login
      clearAuth();
      redirect("/login");
      return undefined; // Ensure function returns in this path
    }
  }

  if (!response.ok) {
    if (isResponseEmpty(response)) {
      throw new Error(`API Error: ${response.status} ${response.statusText || "Empty error response"}`);
    }

    const errorData = await response.json().catch(() => null);
    let message = `API Error: ${response.status} ${response.statusText || "Something went wrong"}`;

    if (Array.isArray(errorData)) {
      message = errorData.join(" ");
    } else if (errorData?.detail) {
      message = errorData.detail;
    } else if (errorData?.message) {
      message = errorData.message;
    } else if (errorData && typeof errorData === "object") {
      message = Object.entries(errorData)
        .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(", ") : errs}`)
        .join(" | ");
    }

    throw new Error(message);
  }

  if (isResponseEmpty(response)) {
    return undefined as T; // Return undefined for empty response
  }
  return response.json();
};
