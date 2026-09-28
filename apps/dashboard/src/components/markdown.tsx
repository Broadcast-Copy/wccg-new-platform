"use client";

import { Fragment, useMemo } from "react";
import Link from "next/link";
import { parseMarkdown, type Align, type Block, type Inline } from "@/lib/markdown";
import { cx } from "@/lib/format";

/**
 * Renders a member guide's markdown as React elements. Every string reaches the
 * DOM as a text node or an attribute React sets itself: there is no HTML string
 * and no dangerouslySetInnerHTML, and links were already limited to http(s) and
 * relative targets by the parser (src/lib/markdown.ts).
 *
 * Colours: body text is `dim` (8.2:1 on the page), emphasis `fg`, and accent
 * words are `signal-ink` (5.7:1) - never `signal`, which fails as type.
 */

const LINK =
  "font-medium text-signal-ink underline decoration-signal-ink/40 underline-offset-2 transition hover:decoration-signal-ink";

function InlineView({ nodes }: { nodes: readonly Inline[] }) {
  return (
    <>
      {nodes.map((node, i) => {
        switch (node.kind) {
          case "text":
            return <Fragment key={i}>{node.text}</Fragment>;
          case "code":
            return (
              <code
                key={i}
                className="rounded border border-line bg-elevated px-1.5 py-0.5 font-mono text-[0.85em] text-fg"
              >
                {node.text}
              </code>
            );
          case "strong":
            return (
              <strong key={i} className="font-semibold text-fg">
                <InlineView nodes={node.children} />
              </strong>
            );
          case "em":
            return (
              <em key={i}>
                <InlineView nodes={node.children} />
              </em>
            );
          case "link":
            if (node.external) {
              return (
                <a key={i} href={node.href} target="_blank" rel="noopener noreferrer" className={LINK}>
                  <InlineView nodes={node.children} />
                </a>
              );
            }
            if (node.href.startsWith("#")) {
              return (
                <a key={i} href={node.href} className={LINK}>
                  <InlineView nodes={node.children} />
                </a>
              );
            }
            return (
              <Link key={i} href={node.href.startsWith("?") ? `/docs${node.href}` : node.href} className={LINK}>
                <InlineView nodes={node.children} />
              </Link>
            );
        }
      })}
    </>
  );
}

function alignClass(align: Align): string {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "heading": {
      const content = <InlineView nodes={block.content} />;
      if (block.level === 2)
        return (
          <h2 id={block.id} className="mt-10 scroll-mt-24 text-xl font-semibold tracking-tight text-fg">
            {content}
          </h2>
        );
      if (block.level === 3)
        return (
          <h3 id={block.id} className="mt-8 scroll-mt-24 text-lg font-semibold tracking-tight text-fg">
            {content}
          </h3>
        );
      return (
        <h4 id={block.id} className="mt-6 scroll-mt-24 text-base font-semibold text-fg">
          {content}
        </h4>
      );
    }
    case "paragraph":
      return (
        <p className="mt-4 leading-relaxed text-dim">
          <InlineView nodes={block.content} />
        </p>
      );
    case "list": {
      const items = block.items.map((item, i) => (
        <li key={i} className="pl-1.5">
          <InlineView nodes={item} />
        </li>
      ));
      return block.ordered ? (
        <ol
          start={block.start}
          className="mt-4 list-decimal space-y-2.5 pl-6 leading-relaxed text-dim marker:font-mono marker:text-sm marker:font-semibold marker:text-signal-ink"
        >
          {items}
        </ol>
      ) : (
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-dim marker:text-signal-ink">
          {items}
        </ul>
      );
    }
    case "code":
      return (
        <pre className="mt-4 overflow-x-auto rounded-lg border border-line bg-elevated p-4 font-mono text-sm leading-relaxed text-fg">
          <code>{block.text}</code>
        </pre>
      );
    case "quote":
      return (
        <aside className="mt-6 rounded-xl border border-signal/30 bg-signal/10 px-5 py-4 text-sm [&>:first-child]:mt-0 [&_p]:text-fg">
          {block.blocks.map((inner, i) => (
            <BlockView key={i} block={inner} />
          ))}
        </aside>
      );
    case "table":
      return (
        <div className="mt-5 overflow-x-auto rounded-xl border border-line bg-elevated">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {block.header.map((cell, i) => (
                  <th
                    key={i}
                    scope="col"
                    className={cx(
                      "px-4 py-2.5 text-xs font-semibold tracking-wider text-faint uppercase",
                      alignClass(block.align[i] ?? null),
                    )}
                  >
                    <InlineView nodes={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-t border-line">
                  {row.map((cell, i) => (
                    <td
                      key={i}
                      className={cx(
                        "px-4 py-3 align-top leading-relaxed",
                        i === 0 ? "min-w-[8rem] font-medium text-fg" : "text-dim",
                        alignClass(block.align[i] ?? null),
                      )}
                    >
                      <InlineView nodes={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "rule":
      return <hr className="my-8 border-line" />;
  }
}

export function Markdown({ source }: { source: string }) {
  const blocks = useMemo(() => parseMarkdown(source), [source]);
  return (
    <div className="[&>:first-child]:mt-0">
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </div>
  );
}
