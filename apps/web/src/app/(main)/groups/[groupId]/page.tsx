import GroupDetailClient from "./group-detail-client";

/**
 * Static-export params for /groups/[groupId].
 *
 * Group ids aren't known at build time (groups are user-created at runtime), so
 * we only emit the `_placeholder` entry that the SPA/.htaccess fallback relies
 * on. The real renderer is the client component below, which reads the id via
 * useParams() and loads the group + chat from Supabase at runtime. Any
 * `/groups/<id>` URL resolves to the placeholder shim via the
 * `^groups/[^/]+/?$` rule in apps/web/public/.htaccess.
 */
export async function generateStaticParams(): Promise<{ groupId: string }[]> {
  return [{ groupId: "_placeholder" }];
}

export default function Page() {
  return <GroupDetailClient />;
}
