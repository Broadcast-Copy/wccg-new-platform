"use client";

import { useId, useState } from "react";
import { EyeOff, Loader2, Package, Pencil, Save, Upload } from "lucide-react";
import { listReleasesAdmin, saveRelease, setReleasePublished, type AdminRelease } from "@/lib/admin";
import { useLoad } from "@/hooks/use-load";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  Chip,
  ConfirmAction,
  EmptyState,
  ErrorBox,
  FIELD,
  InlineError,
  InlineOk,
  LABEL,
  Notice,
  Refreshing,
  SectionHeader,
  Spinner,
  fmtDate,
} from "@/components/admin/ui";

/**
 * The release registry the Suite Manager and download page read (bc_releases,
 * migrations 105/112). Publish, unpublish and edit the words; the files
 * themselves go through the release script, never through this page. Writes
 * use the existing platform-admin policy and are audited by the 115 trigger.
 */

function fmtSize(bytes: number | null): string | null {
  if (bytes === null) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type SaveState = { status: "idle" } | { status: "saving" } | { status: "error"; message: string } | { status: "saved" };

function EditRelease({ release, onSaved, onClose }: { release: AdminRelease; onSaved: () => void; onClose: () => void }) {
  const id = useId();
  const [state, setState] = useState<SaveState>({ status: "idle" });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === "saving") return;
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim() || null;
    const notes = String(data.get("notes") ?? "").trim() || null;
    if (title === release.title && notes === release.notes) {
      setState({ status: "error", message: "Nothing changed." });
      return;
    }
    setState({ status: "saving" });
    const result = await saveRelease(release.id, { title, notes });
    if (!result.ok) {
      setState({ status: "error", message: result.message });
      return;
    }
    setState({ status: "saved" });
    onSaved();
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded-xl border border-line bg-ink p-4" noValidate>
      <div className="space-y-1.5">
        <label className={LABEL} htmlFor={`${id}-title`}>
          Title
        </label>
        <input id={`${id}-title`} name="title" defaultValue={release.title ?? ""} maxLength={200} className={FIELD} />
      </div>
      <div className="space-y-1.5">
        <label className={LABEL} htmlFor={`${id}-notes`}>
          Release notes
        </label>
        <textarea id={`${id}-notes`} name="notes" rows={5} defaultValue={release.notes ?? ""} className={FIELD} />
      </div>
      {state.status === "error" && <InlineError message={state.message} />}
      {state.status === "saved" && <InlineOk message="Saved." />}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={BTN_PRIMARY} disabled={state.status === "saving"}>
          {state.status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
          Save
        </button>
        <button type="button" className={BTN_SECONDARY} onClick={onClose}>
          Close
        </button>
      </div>
    </form>
  );
}

function ReleaseCard({ release, onChanged }: { release: AdminRelease; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const name = `${release.package} ${release.version}`;
  const size = fmtSize(release.size_bytes);

  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-mono font-semibold break-all text-fg">{name}</span>
        <Chip tone="muted">{release.channel}</Chip>
        <Chip tone={release.is_published ? "ok" : "warn"}>{release.is_published ? "published" : "draft"}</Chip>
      </p>
      {release.title && <p className="mt-1 text-sm text-fg">{release.title}</p>}
      <p className="mt-1 text-sm text-dim">
        {[
          size,
          release.min_os ? `min ${release.min_os}` : null,
          release.published_at ? `published ${fmtDate(release.published_at)}` : `added ${fmtDate(release.created_at)}`,
        ]
          .filter((v): v is string => Boolean(v))
          .join(" · ")}
      </p>
      {release.sha256 && <p className="mt-1 font-mono text-xs break-all text-faint">sha256 {release.sha256}</p>}
      {release.url && (
        <p className="mt-1 text-xs break-all">
          {/^https?:\/\//i.test(release.url) ? (
            <a href={release.url} className="text-signal-ink underline underline-offset-2" rel="noreferrer" target="_blank">
              {release.url}
            </a>
          ) : (
            <span className="text-faint">{release.url}</span>
          )}
        </p>
      )}
      {release.notes && !editing && (
        <p className="mt-2 line-clamp-4 text-sm whitespace-pre-line text-dim">{release.notes}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={BTN_SECONDARY} aria-expanded={editing} onClick={() => setEditing((v) => !v)}>
          <Pencil className="h-4 w-4" aria-hidden />
          Edit notes
        </button>
        {release.is_published ? (
          <ConfirmAction
            label="Unpublish"
            icon={EyeOff}
            title={`Unpublish ${name}?`}
            body={
              <p>
                The Suite Manager and the download page stop offering it. Installed copies are not touched; the file
                stays in storage.
              </p>
            }
            confirmLabel="Yes, unpublish"
            onConfirm={() => setReleasePublished(release.id, false)}
            onDone={onChanged}
          />
        ) : (
          <ConfirmAction
            label="Publish"
            icon={Upload}
            tone="neutral"
            title={`Publish ${name}?`}
            body={
              <p>
                Every station&rsquo;s Suite Manager and the public download page will offer it
                {release.url ? "" : " (it has no download URL yet)"}. Nothing installs by itself.
              </p>
            }
            confirmLabel="Yes, publish"
            onConfirm={() => setReleasePublished(release.id, true)}
            onDone={onChanged}
          />
        )}
      </div>
      {editing && <EditRelease release={release} onSaved={onChanged} onClose={() => setEditing(false)} />}
    </li>
  );
}

export function ReleasesSection() {
  const { state, reload } = useLoad(listReleasesAdmin);

  return (
    <section className="space-y-5" aria-labelledby="releases-heading">
      <SectionHeader
        id="releases-heading"
        icon={Package}
        title="Releases"
        description="The download catalogue the Suite Manager reads. Publish, unpublish and edit notes."
        actions={<Refreshing on={state.status === "ready" && state.refreshing} />}
      />
      <Notice>No uploads here: release files are built and uploaded by the release script, which also adds the row.</Notice>
      {state.status === "loading" && <Spinner label="Loading releases" />}
      {state.status === "error" && <ErrorBox title="Could not load releases." message={state.message} onRetry={reload} />}
      {state.status === "ready" &&
        (state.value.length === 0 ? (
          <EmptyState>No releases in the registry.</EmptyState>
        ) : (
          <ul className="space-y-3" aria-label="Releases">
            {state.value.map((r) => (
              <ReleaseCard key={r.id} release={r} onChanged={reload} />
            ))}
          </ul>
        ))}
    </section>
  );
}
