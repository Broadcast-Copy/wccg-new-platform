import WikiEntityClient from "./wiki-entity-client";

/**
 * Static-export shim. The real renderer is the client component, which
 * reads the slug at runtime via useParams() and fetches `/wiki/:slug`
 * from the live API. Output: 'export' requires generateStaticParams to
 * exist for any [param] route — we ship a placeholder.
 */
export async function generateStaticParams() {
  return [{ slug: "_placeholder" }];
}

export default function Page() {
  return <WikiEntityClient />;
}
