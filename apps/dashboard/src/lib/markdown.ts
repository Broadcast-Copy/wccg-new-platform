/**
 * A small, SAFE markdown parser for the member docs (bc_docs.body_md).
 *
 * It produces a plain data tree that components/markdown.tsx renders as React
 * elements, so there is no HTML string anywhere and no dangerouslySetInnerHTML:
 * a `<script>` in a guide is shown as the text "<script>". Supported, and
 * nothing else: headings, paragraphs, bullet and numbered lists, **bold**,
 * *italic*, `inline code`, fenced code blocks, > asides, pipe tables, rules,
 * and links whose target is http(s) or relative (anything else keeps its words
 * and loses the link). No new dependency; pure, so it is testable on its own.
 */

export type Inline =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "code"; readonly text: string }
  | { readonly kind: "strong"; readonly children: readonly Inline[] }
  | { readonly kind: "em"; readonly children: readonly Inline[] }
  | {
      readonly kind: "link";
      readonly href: string;
      readonly external: boolean;
      readonly children: readonly Inline[];
    };

export type Align = "left" | "center" | "right" | null;

export type Block =
  | { readonly kind: "heading"; readonly level: 2 | 3 | 4; readonly id: string; readonly content: readonly Inline[] }
  | { readonly kind: "paragraph"; readonly content: readonly Inline[] }
  | {
      readonly kind: "list";
      readonly ordered: boolean;
      readonly start: number;
      readonly items: readonly (readonly Inline[])[];
    }
  | { readonly kind: "code"; readonly text: string }
  | { readonly kind: "quote"; readonly blocks: readonly Block[] }
  | {
      readonly kind: "table";
      readonly align: readonly Align[];
      readonly header: readonly (readonly Inline[])[];
      readonly rows: readonly (readonly (readonly Inline[])[])[];
    }
  | { readonly kind: "rule" };

/** Guides are short; anything past this is cut rather than parsed. */
const MAX_SOURCE = 200_000;
const MAX_INLINE_DEPTH = 4;
const MAX_QUOTE_DEPTH = 3;

/* ------------------------------------------------------------------ links */

export type SafeHref = { readonly href: string; readonly external: boolean };

/**
 * http(s) and relative targets only. Refused: every other scheme (javascript:,
 * data:, vbscript:, mailto:, file: ...), protocol-relative //host, credentials
 * in the URL, and any whitespace, control character or backslash (which
 * browsers "repair" in ways that can smuggle a scheme through).
 */
function hasUnsafeChar(s: string): boolean {
  for (let j = 0; j < s.length; j++) {
    const code = s.charCodeAt(j);
    // space and C0 controls, DEL and C1 controls, backslash
    if (code <= 0x20 || (code >= 0x7f && code <= 0x9f) || code === 0x5c) return true;
  }
  return false;
}

export function safeHref(raw: string): SafeHref | null {
  const href = raw.trim();
  if (href === "" || href.length > 2048) return null;
  if (hasUnsafeChar(href)) return null;
  if (/^https?:\/\//i.test(href)) {
    let url: URL;
    try {
      url = new URL(href);
    } catch {
      return null;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username !== "" || url.password !== "") return null;
    return { href: url.toString(), external: true };
  }
  if (href.startsWith("//")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return null;
  return { href, external: false };
}

/* ----------------------------------------------------------------- inline */

const ESCAPABLE = "\\`*_{}[]()#+-.!|>~";

function isSpace(ch: string): boolean {
  return ch === "" || /\s/.test(ch);
}

function isWordChar(ch: string): boolean {
  return /[A-Za-z0-9]/.test(ch);
}

/** Closing ** or __ : not preceded by whitespace. */
function findDouble(src: string, marker: string, from: number): number {
  let j = src.indexOf(marker, from);
  while (j !== -1) {
    if (!isSpace(src.charAt(j - 1))) return j;
    j = src.indexOf(marker, j + 1);
  }
  return -1;
}

/** Closing * or _ : not preceded by whitespace, not half of a double marker. */
function findSingle(src: string, marker: string, from: number): number {
  let j = src.indexOf(marker, from);
  while (j !== -1) {
    const before = src.charAt(j - 1);
    const after = src.charAt(j + 1);
    const double = after === marker || before === marker;
    const intraword = marker === "_" && isWordChar(after);
    if (!isSpace(before) && !double && !intraword) return j;
    j = src.indexOf(marker, j + 1);
  }
  return -1;
}

/** The ] that closes the [ at `open`, honouring nesting and escapes. */
function findBracket(src: string, open: number): number {
  let depth = 0;
  for (let j = open; j < src.length; j++) {
    const ch = src.charAt(j);
    if (ch === "\\") {
      j++;
      continue;
    }
    if (ch === "[") depth++;
    if (ch === "]") {
      depth--;
      if (depth === 0) return j;
    }
  }
  return -1;
}

export function parseInline(src: string, depth = 0, inLink = false): Inline[] {
  const out: Inline[] = [];
  let text = "";
  const push = (node: Inline) => {
    if (text !== "") {
      out.push({ kind: "text", text });
      text = "";
    }
    out.push(node);
  };

  let i = 0;
  while (i < src.length) {
    const c = src.charAt(i);
    const next = src.charAt(i + 1);

    if (c === "\\" && next !== "" && ESCAPABLE.includes(next)) {
      text += next;
      i += 2;
      continue;
    }

    if (c === "`") {
      let run = 1;
      while (src.charAt(i + run) === "`") run++;
      const fence = "`".repeat(run);
      const end = src.indexOf(fence, i + run);
      if (end !== -1) {
        const body = src.slice(i + run, end);
        push({ kind: "code", text: /^ .* $/.test(body) ? body.slice(1, -1) : body });
        i = end + run;
        continue;
      }
      text += fence;
      i += run;
      continue;
    }

    if (depth < MAX_INLINE_DEPTH) {
      if ((c === "*" || c === "_") && next === c) {
        const marker = c + c;
        const end = findDouble(src, marker, i + 2);
        const opens = !isSpace(src.charAt(i + 2)) && !(c === "_" && isWordChar(src.charAt(i - 1)));
        if (opens && end > i + 2) {
          push({ kind: "strong", children: parseInline(src.slice(i + 2, end), depth + 1, inLink) });
          i = end + 2;
          continue;
        }
      } else if (c === "*" || c === "_") {
        const opens = !isSpace(next) && !(c === "_" && isWordChar(src.charAt(i - 1)));
        if (opens) {
          const end = findSingle(src, c, i + 1);
          if (end > i + 1) {
            push({ kind: "em", children: parseInline(src.slice(i + 1, end), depth + 1, inLink) });
            i = end + 1;
            continue;
          }
        }
      }

      if (c === "[" && !inLink) {
        const close = findBracket(src, i);
        if (close !== -1 && src.charAt(close + 1) === "(") {
          const end = src.indexOf(")", close + 2);
          if (end !== -1) {
            const children = parseInline(src.slice(i + 1, close), depth + 1, true);
            const target = safeHref(src.slice(close + 2, end));
            if (target !== null) {
              push({ kind: "link", href: target.href, external: target.external, children });
            } else {
              for (const child of children) push(child);
            }
            i = end + 1;
            continue;
          }
        }
      }
    }

    text += c;
    i++;
  }
  if (text !== "") out.push({ kind: "text", text });
  return out;
}

/** The words of an inline run, for heading ids. */
function inlineText(nodes: readonly Inline[]): string {
  return nodes
    .map((n) => (n.kind === "text" || n.kind === "code" ? n.text : inlineText(n.children)))
    .join("");
}

/* ----------------------------------------------------------------- blocks */

const FENCE = /^ {0,3}(`{3,}|~{3,})[ \t]*[\w+-]*[ \t]*$/;
const HEADING = /^ {0,3}(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/;
const RULE = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const QUOTE = /^ {0,3}> ?(.*)$/;
const BULLET = /^ {0,3}[-*+][ \t]+(.*)$/;
const NUMBERED = /^ {0,3}(\d{1,9})[.)][ \t]+(.*)$/;
const TABLE_SEP = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;
const BLANK = /^[ \t]*$/;

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const cells: string[] = [];
  let cur = "";
  let inCode = false;
  for (let j = 0; j < s.length; j++) {
    const ch = s.charAt(j);
    if (ch === "\\" && s.charAt(j + 1) === "|") {
      cur += "|";
      j++;
      continue;
    }
    if (ch === "`") inCode = !inCode;
    if (ch === "|" && !inCode) {
      cells.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

function isTableStart(lines: readonly string[], i: number): boolean {
  const head = lines[i] ?? "";
  const sep = lines[i + 1] ?? "";
  return head.includes("|") && sep.includes("|") && TABLE_SEP.test(sep);
}

function startsBlock(lines: readonly string[], i: number): boolean {
  const line = lines[i] ?? "";
  return (
    FENCE.test(line) ||
    HEADING.test(line) ||
    RULE.test(line) ||
    QUOTE.test(line) ||
    BULLET.test(line) ||
    NUMBERED.test(line) ||
    isTableStart(lines, i)
  );
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/[\s-]+/g, "-")
      .slice(0, 60) || "section"
  );
}

function parseBlocks(lines: readonly string[], quoteDepth: number, ids: Map<string, number>): Block[] {
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (BLANK.test(line)) {
      i++;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const marker = fence[1] ?? "```";
      const body: string[] = [];
      i++;
      while (i < lines.length) {
        const inner = lines[i] ?? "";
        if (inner.trim().startsWith(marker.charAt(0).repeat(marker.length)) && FENCE.test(inner)) {
          i++;
          break;
        }
        body.push(inner);
        i++;
      }
      blocks.push({ kind: "code", text: body.join("\n") });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      const hashes = (heading[1] ?? "##").length;
      const level = (hashes <= 2 ? 2 : hashes === 3 ? 3 : 4) as 2 | 3 | 4;
      const content = parseInline(heading[2] ?? "");
      const base = `doc-${slugify(inlineText(content))}`;
      const seen = ids.get(base) ?? 0;
      ids.set(base, seen + 1);
      blocks.push({ kind: "heading", level, id: seen === 0 ? base : `${base}-${seen + 1}`, content });
      i++;
      continue;
    }

    if (RULE.test(line)) {
      blocks.push({ kind: "rule" });
      i++;
      continue;
    }

    if (QUOTE.test(line)) {
      const inner: string[] = [];
      while (i < lines.length) {
        const m = QUOTE.exec(lines[i] ?? "");
        if (!m) break;
        inner.push(m[1] ?? "");
        i++;
      }
      blocks.push(
        quoteDepth < MAX_QUOTE_DEPTH
          ? { kind: "quote", blocks: parseBlocks(inner, quoteDepth + 1, ids) }
          : { kind: "paragraph", content: parseInline(inner.join(" ")) },
      );
      continue;
    }

    if (isTableStart(lines, i)) {
      const header = splitRow(line);
      const align: Align[] = splitRow(lines[i + 1] ?? "").map((cell) => {
        const left = cell.startsWith(":");
        const right = cell.endsWith(":");
        return left && right ? "center" : right ? "right" : left ? "left" : null;
      });
      const width = header.length;
      const fit = (cells: string[]) =>
        Array.from({ length: width }, (_, k) => parseInline(cells[k] ?? ""));
      const rows: Inline[][][] = [];
      i += 2;
      while (i < lines.length) {
        const row = lines[i] ?? "";
        if (BLANK.test(row) || !row.includes("|")) break;
        rows.push(fit(splitRow(row)));
        i++;
      }
      blocks.push({
        kind: "table",
        align: Array.from({ length: width }, (_, k) => align[k] ?? null),
        header: fit(header),
        rows,
      });
      continue;
    }

    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);
    if (bullet || numbered) {
      const ordered = numbered !== null;
      const itemRe = ordered ? NUMBERED : BULLET;
      const start = numbered ? Number.parseInt(numbered[1] ?? "1", 10) : 1;
      const items: string[][] = [];
      while (i < lines.length) {
        const current = lines[i] ?? "";
        const m = itemRe.exec(current);
        if (m) {
          items.push([(ordered ? m[2] : m[1]) ?? ""]);
          i++;
          continue;
        }
        if (BLANK.test(current)) {
          // A blank line ends the list unless the next line is another item.
          let k = i + 1;
          while (k < lines.length && BLANK.test(lines[k] ?? "")) k++;
          if (k < lines.length && itemRe.test(lines[k] ?? "")) {
            i = k;
            continue;
          }
          break;
        }
        if (startsBlock(lines, i) && !/^[ \t]{2,}/.test(current)) break;
        items[items.length - 1]?.push(current.trim());
        i++;
      }
      blocks.push({
        kind: "list",
        ordered,
        start: Number.isFinite(start) ? start : 1,
        items: items.map((parts) => parseInline(parts.join(" "))),
      });
      continue;
    }

    const para: string[] = [line.trim()];
    i++;
    while (i < lines.length) {
      const current = lines[i] ?? "";
      if (BLANK.test(current) || startsBlock(lines, i)) break;
      para.push(current.trim());
      i++;
    }
    blocks.push({ kind: "paragraph", content: parseInline(para.join(" ")) });
  }

  return blocks;
}

export function parseMarkdown(source: string): Block[] {
  const text = source.length > MAX_SOURCE ? source.slice(0, MAX_SOURCE) : source;
  return parseBlocks(text.replace(/\r\n?/g, "\n").split("\n"), 0, new Map());
}
