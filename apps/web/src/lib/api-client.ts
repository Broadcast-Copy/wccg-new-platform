/**
 * Fetch wrapper for the NestJS API backend.
 *
 * Automatically prepends the base URL from environment variables
 * and attaches the Supabase auth token from cookies when available.
 *
 * @param path - API path (e.g., "/streams" or "/events/123")
 * @param options - Standard fetch RequestInit options
 * @returns Parsed JSON response
 */
export async function apiClient<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

  const url = `${baseUrl}${path}`;

  const headers = new Headers(options.headers);

  // Set default content type for requests with a body
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Attempt to read the Supabase access token from the browser cookie
  // This works on the client side. For server-side, pass the token explicitly.
  if (typeof window !== "undefined") {
    try {
      // The Supabase SSR client stores the session in cookies.
      // We read it from the sb-<project-ref>-auth-token cookie.
      const cookies = document.cookie.split("; ");
      const authCookie = cookies.find((c) =>
        c.startsWith("sb-") && c.includes("-auth-token"),
      );
      if (authCookie) {
        const cookieValue = decodeURIComponent(authCookie.split("=")[1]);
        try {
          const parsed = JSON.parse(cookieValue);
          // Supabase stores session as an array or object with access_token
          const accessToken =
            Array.isArray(parsed) ? parsed[0] : parsed?.access_token;
          if (accessToken && !headers.has("Authorization")) {
            headers.set("Authorization", `Bearer ${accessToken}`);
          }
        } catch {
          // Cookie value is not JSON, skip
        }
      }
    } catch {
      // Cookie access failed, continue without auth header
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new Error(
      `API request failed: ${response.status} ${response.statusText} - ${errorBody}`,
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
