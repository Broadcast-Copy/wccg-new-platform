/**
 * Fetch wrapper for the NestJS API backend.
 *
 * Automatically prepends the base URL from environment variables
 * and attaches the Supabase auth token when available.
 *
 * @param path - API path (e.g., "/streams" or "/events/123")
 * @param options - Standard fetch RequestInit options
 * @returns Parsed JSON response
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export async function apiClient<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Attach Supabase access token if available (browser only)
  if (typeof window !== "undefined") {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        (headers as Record<string, string>)["Authorization"] =
          `Bearer ${session.access_token}`;
      }
    } catch {
      // Supabase client not available, continue without auth
    }
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || res.statusText);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
