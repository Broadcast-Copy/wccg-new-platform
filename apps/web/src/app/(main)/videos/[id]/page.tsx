import WatchClient from "./watch-client";

/**
 * Static-export shim. Real renderer is the client component, which reads the
 * video id at runtime via useParams() and fetches it from Supabase.
 */
export async function generateStaticParams() {
  return [{ id: "_placeholder" }];
}

export default function Page() {
  return <WatchClient />;
}
