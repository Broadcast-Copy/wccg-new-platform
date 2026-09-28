"use client";

import { useId, useState } from "react";
import { BookOpen, Eye, EyeOff, History, Loader2, Pencil, Save, Sparkles } from "lucide-react";
import {
  listChangelogAdmin,
  listDocsAdmin,
  listFeaturesAdmin,
  saveChangelog,
  saveDoc,
  saveFeature,
  setPublished,
  type AdminChangelog,
  type AdminDoc,
  type AdminFeature,
  type Result,
} from "@/lib/admin";
import { useLoad } from "@/hooks/use-load";
import { cx } from "@/lib/format";
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
 * Product content: member docs (bc_docs, 114), the changelog (bc_changelog,
 * 096) and the feature list (bc_features, 097). Edited through each table's
 * existing platform-admin policy; every write is audited by the 115 trigger.
 * Unpublishing takes something off a live page, so it is two-step.
 */

type SaveState = { status: "idle" } | { status: "saving" } | { status: "error"; message: string } | { status: "saved" };

function useSave() {
  const [state, setState] = useState<SaveState>({ status: "idle" });
  async function run(action: () => Promise<Result<unknown>>, onSaved: () => void) {
    if (state.status === "saving") return;
    setState({ status: "saving" });
    const result = await action();
    if (!result.ok) {
      setState({ status: "error", message: result.message });
      return;
    }
    setState({ status: "saved" });
    onSaved();
  }
  return { state, setState, run };
}

function SaveRow({ state, onClose }: { state: SaveState; onClose: () => void }) {
  return (
    <>
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
    </>
  );
}

function PublishToggle({
  table,
  id,
  name,
  published,
  where,
  onDone,
}: {
  table: "bc_docs" | "bc_changelog" | "bc_features";
  id: string;
  name: string;
  published: boolean;
  where: string;
  onDone: () => void;
}) {
  return published ? (
    <ConfirmAction
      label="Unpublish"
      icon={EyeOff}
      title={`Unpublish “${name}”?`}
      body={<p>It disappears from {where} at once. It can be published again.</p>}
      confirmLabel="Yes, unpublish"
      onConfirm={() => setPublished(table, id, false)}
      onDone={onDone}
    />
  ) : (
    <ConfirmAction
      label="Publish"
      icon={Eye}
      tone="neutral"
      title={`Publish “${name}”?`}
      body={<p>It appears on {where} at once.</p>}
      confirmLabel="Yes, publish"
      onConfirm={() => setPublished(table, id, true)}
      onDone={onDone}
    />
  );
}

function toSortOrder(raw: FormDataEntryValue | null, fallback: number): number {
  const n = Number(String(raw ?? ""));
  return Number.isInteger(n) ? n : fallback;
}

/* ------------------------------------------------------------------ docs -- */

function DocCard({ doc, onChanged }: { doc: AdminDoc; onChanged: () => void }) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const save = useSave();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const patch = {
      title: String(data.get("title") ?? "").trim(),
      summary: String(data.get("summary") ?? "").trim(),
      section: String(data.get("section") ?? "").trim(),
      body_md: String(data.get("body_md") ?? ""),
      sort_order: toSortOrder(data.get("sort_order"), doc.sort_order),
    };
    if (patch.title === "" || patch.section === "" || patch.body_md.trim() === "") {
      save.setState({ status: "error", message: "Title, section and body are required." });
      return;
    }
    void save.run(() => saveDoc(doc.id, patch), onChanged);
  }

  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-fg">{doc.title}</span>
        <Chip tone={doc.is_published ? "ok" : "warn"}>{doc.is_published ? "published" : "draft"}</Chip>
      </p>
      <p className="mt-0.5 text-sm text-dim">
        {doc.section} · <span className="font-mono">{doc.slug}</span> · order {doc.sort_order} · updated {fmtDate(doc.updated_at)}
      </p>
      {doc.summary && <p className="mt-1 text-sm text-dim">{doc.summary}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={BTN_SECONDARY} aria-expanded={editing} onClick={() => setEditing((v) => !v)}>
          <Pencil className="h-4 w-4" aria-hidden />
          Edit
        </button>
        <PublishToggle
          table="bc_docs"
          id={doc.id}
          name={doc.title}
          published={doc.is_published}
          where="the members' Docs page"
          onDone={onChanged}
        />
      </div>
      {editing && (
        <form onSubmit={submit} className="mt-3 space-y-3 rounded-xl border border-line bg-ink p-4" noValidate>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_7rem]">
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor={`${id}-title`}>Title</label>
              <input id={`${id}-title`} name="title" defaultValue={doc.title} className={FIELD} />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor={`${id}-section`}>Section</label>
              <input id={`${id}-section`} name="section" defaultValue={doc.section} className={FIELD} />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor={`${id}-order`}>Order</label>
              <input id={`${id}-order`} name="sort_order" type="number" defaultValue={doc.sort_order} className={FIELD} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor={`${id}-summary`}>Summary</label>
            <input id={`${id}-summary`} name="summary" defaultValue={doc.summary} className={FIELD} />
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor={`${id}-body`}>Body (markdown)</label>
            <textarea id={`${id}-body`} name="body_md" rows={14} defaultValue={doc.body_md} className={cx(FIELD, "font-mono text-xs")} />
          </div>
          <SaveRow state={save.state} onClose={() => setEditing(false)} />
        </form>
      )}
    </li>
  );
}

function DocsPanel() {
  const { state, reload } = useLoad(listDocsAdmin);
  return (
    <div className="space-y-4">
      <Notice tone="warn">
        Guides are seeded from files kept outside this repository. Re-running that seed overwrites edits made here, so
        either edit the files and re-seed, or edit here and stop seeding.
      </Notice>
      <Refreshing on={state.status === "ready" && state.refreshing} />
      {state.status === "loading" && <Spinner label="Loading docs" />}
      {state.status === "error" && <ErrorBox title="Could not load docs." message={state.message} onRetry={reload} />}
      {state.status === "ready" &&
        (state.value.length === 0 ? (
          <EmptyState>No member guides yet.</EmptyState>
        ) : (
          <ul className="space-y-3" aria-label="Member docs">
            {state.value.map((d) => (
              <DocCard key={d.id} doc={d} onChanged={reload} />
            ))}
          </ul>
        ))}
    </div>
  );
}

/* ------------------------------------------------------------- changelog -- */

const CHANNELS = ["alpha", "beta", "stable"] as const;

function ChangelogCard({ entry, onChanged }: { entry: AdminChangelog; onChanged: () => void }) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const save = useSave();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const released = String(data.get("released_on") ?? "");
    const patch = {
      title: String(data.get("title") ?? "").trim() || null,
      channel: String(data.get("channel") ?? entry.channel),
      released_on: released === "" ? entry.released_on : released,
      changes: String(data.get("changes") ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
      sort_order: toSortOrder(data.get("sort_order"), entry.sort_order),
    };
    void save.run(() => saveChangelog(entry.id, patch), onChanged);
  }

  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-mono font-semibold text-fg">{entry.version}</span>
        <Chip tone="muted">{entry.channel}</Chip>
        <Chip tone={entry.is_published ? "ok" : "warn"}>{entry.is_published ? "published" : "draft"}</Chip>
      </p>
      <p className="mt-0.5 text-sm text-dim">
        {entry.title ?? "Untitled"} · released {fmtDate(entry.released_on)} · {entry.changes.length} change
        {entry.changes.length === 1 ? "" : "s"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={BTN_SECONDARY} aria-expanded={editing} onClick={() => setEditing((v) => !v)}>
          <Pencil className="h-4 w-4" aria-hidden />
          Edit
        </button>
        <PublishToggle
          table="bc_changelog"
          id={entry.id}
          name={entry.version}
          published={entry.is_published}
          where="the public changelog on broadcastcopy.ai and the station site"
          onDone={onChanged}
        />
      </div>
      {editing && (
        <form onSubmit={submit} className="mt-3 space-y-3 rounded-xl border border-line bg-ink p-4" noValidate>
          <div className="grid gap-3 sm:grid-cols-[1fr_9rem_10rem_7rem]">
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor={`${id}-title`}>Title</label>
              <input id={`${id}-title`} name="title" defaultValue={entry.title ?? ""} className={FIELD} />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor={`${id}-channel`}>Channel</label>
              <select id={`${id}-channel`} name="channel" defaultValue={entry.channel} className={FIELD}>
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor={`${id}-date`}>Released</label>
              <input id={`${id}-date`} name="released_on" type="date" defaultValue={entry.released_on} className={FIELD} />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor={`${id}-order`}>Order</label>
              <input id={`${id}-order`} name="sort_order" type="number" defaultValue={entry.sort_order} className={FIELD} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor={`${id}-changes`}>Changes (one per line)</label>
            <textarea id={`${id}-changes`} name="changes" rows={8} defaultValue={entry.changes.join("\n")} className={FIELD} />
          </div>
          <SaveRow state={save.state} onClose={() => setEditing(false)} />
        </form>
      )}
    </li>
  );
}

function ChangelogPanel() {
  const { state, reload } = useLoad(listChangelogAdmin);
  return (
    <div className="space-y-4">
      <Refreshing on={state.status === "ready" && state.refreshing} />
      {state.status === "loading" && <Spinner label="Loading the changelog" />}
      {state.status === "error" && <ErrorBox title="Could not load the changelog." message={state.message} onRetry={reload} />}
      {state.status === "ready" &&
        (state.value.length === 0 ? (
          <EmptyState>No changelog entries.</EmptyState>
        ) : (
          <ul className="space-y-3" aria-label="Changelog">
            {state.value.map((e) => (
              <ChangelogCard key={e.id} entry={e} onChanged={reload} />
            ))}
          </ul>
        ))}
    </div>
  );
}

/* -------------------------------------------------------------- features -- */

function FeatureCard({ feature, onChanged }: { feature: AdminFeature; onChanged: () => void }) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const save = useSave();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const patch = {
      name: String(data.get("name") ?? "").trim(),
      blurb: String(data.get("blurb") ?? "").trim(),
      icon: String(data.get("icon") ?? "").trim() || "Sparkles",
      sort_order: toSortOrder(data.get("sort_order"), feature.sort_order),
    };
    if (patch.name === "" || patch.blurb === "") {
      save.setState({ status: "error", message: "Name and blurb are required." });
      return;
    }
    if (!/^[A-Za-z][A-Za-z0-9]{0,63}$/.test(patch.icon)) {
      save.setState({ status: "error", message: "Icon is a lucide icon name, e.g. Radio or ShieldCheck." });
      return;
    }
    void save.run(() => saveFeature(feature.id, patch), onChanged);
  }

  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-fg">{feature.name}</span>
        <Chip tone={feature.is_published ? "ok" : "warn"}>{feature.is_published ? "published" : "draft"}</Chip>
      </p>
      <p className="mt-0.5 text-sm text-dim">
        icon <span className="font-mono">{feature.icon}</span> · order {feature.sort_order}
      </p>
      <p className="mt-1 text-sm text-dim">{feature.blurb}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={BTN_SECONDARY} aria-expanded={editing} onClick={() => setEditing((v) => !v)}>
          <Pencil className="h-4 w-4" aria-hidden />
          Edit
        </button>
        <PublishToggle
          table="bc_features"
          id={feature.id}
          name={feature.name}
          published={feature.is_published}
          where="the feature list on broadcastcopy.ai"
          onDone={onChanged}
        />
      </div>
      {editing && (
        <form onSubmit={submit} className="mt-3 space-y-3 rounded-xl border border-line bg-ink p-4" noValidate>
          <div className="grid gap-3 sm:grid-cols-[1fr_12rem_7rem]">
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor={`${id}-name`}>Name</label>
              <input id={`${id}-name`} name="name" defaultValue={feature.name} className={FIELD} />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor={`${id}-icon`}>Icon</label>
              <input id={`${id}-icon`} name="icon" defaultValue={feature.icon} className={FIELD} />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor={`${id}-order`}>Order</label>
              <input id={`${id}-order`} name="sort_order" type="number" defaultValue={feature.sort_order} className={FIELD} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor={`${id}-blurb`}>Blurb</label>
            <textarea id={`${id}-blurb`} name="blurb" rows={3} defaultValue={feature.blurb} className={FIELD} />
          </div>
          <SaveRow state={save.state} onClose={() => setEditing(false)} />
        </form>
      )}
    </li>
  );
}

function FeaturesPanel() {
  const { state, reload } = useLoad(listFeaturesAdmin);
  return (
    <div className="space-y-4">
      <Refreshing on={state.status === "ready" && state.refreshing} />
      {state.status === "loading" && <Spinner label="Loading features" />}
      {state.status === "error" && <ErrorBox title="Could not load features." message={state.message} onRetry={reload} />}
      {state.status === "ready" &&
        (state.value.length === 0 ? (
          <EmptyState>No features listed.</EmptyState>
        ) : (
          <ul className="space-y-3" aria-label="Features">
            {state.value.map((f) => (
              <FeatureCard key={f.id} feature={f} onChanged={reload} />
            ))}
          </ul>
        ))}
    </div>
  );
}

/* --------------------------------------------------------------- section -- */

const TABS = [
  { id: "docs", label: "Member docs", icon: BookOpen },
  { id: "changelog", label: "Changelog", icon: History },
  { id: "features", label: "Features", icon: Sparkles },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function ContentSection() {
  const [tab, setTab] = useState<TabId>("docs");
  const tabsId = useId();

  return (
    <section className="space-y-5" aria-labelledby="content-heading">
      <SectionHeader
        id="content-heading"
        icon={BookOpen}
        title="Docs, changelog & features"
        description="Product content shown on broadcastcopy.ai and to signed-in members."
      />
      <div role="tablist" aria-label="Content type" className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`${tabsId}-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`${tabsId}-${t.id}-panel`}
            onClick={() => setTab(t.id)}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
              tab === t.id ? "border-signal/50 bg-signal/10 text-fg" : "border-line text-dim hover:text-fg",
            )}
          >
            <t.icon className="h-4 w-4" aria-hidden />
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${tabsId}-${tab}-panel`} aria-labelledby={`${tabsId}-${tab}`}>
        {tab === "docs" && <DocsPanel />}
        {tab === "changelog" && <ChangelogPanel />}
        {tab === "features" && <FeaturesPanel />}
      </div>
    </section>
  );
}
