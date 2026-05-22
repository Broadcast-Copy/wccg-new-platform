import DjProfileClient from "./dj-profile-client";

/**
 * Static-export shim. Real renderer is the client component which reads
 * the slug via useParams() and fetches `/djs/:slug` + `/djs/:slug/archive`.
 */
export async function generateStaticParams() {
  return [{ slug: "_placeholder" }];
}

export default function Page() {
  return <DjProfileClient />;
}
