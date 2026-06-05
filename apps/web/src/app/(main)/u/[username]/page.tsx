import ProfileClient from "./profile-client";

/**
 * Static-export shim. Real renderer is the client component, which reads the
 * @username at runtime via useParams() and fetches the public profile from
 * Supabase. One placeholder param keeps `output: export` happy; every real
 * handle resolves client-side.
 */
export async function generateStaticParams() {
  return [{ username: "_placeholder" }];
}

export default function Page() {
  return <ProfileClient />;
}
