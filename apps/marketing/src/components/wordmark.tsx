/**
 * The Broadcast Copy wordmark, set as a bitmap.
 *
 * Drawn from a hand-authored 5x7 pixel font rather than a webfont: it renders
 * identically everywhere, needs no font loading, and stays crisp at any size
 * because every pixel is a rect on an integer grid. The same glyph table is
 * mirrored in the station tour page (dev/broadcastcopy-design/index.html) so
 * the mark matches there — if you edit one, edit both.
 */

const GLYPHS: Record<string, string[]> = {
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  S: ["01111", "10000", "10000", "01110", "00001", "10001", "01110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  ".": ["00000", "00000", "00000", "00000", "00000", "00000", "01100"],
};
/** the period is narrow, everything else is the full cell */
const ADVANCE = (ch: string) => (ch === "." ? 4 : 6);

const TEXT = "BROADCASTCOPY.AI";
const ROWS = 7;
const SIGNAL = "#ff4a1c";

export function Wordmark({
  px = 3,
  className = "",
}: {
  px?: number;
  className?: string;
}) {
  const cells: { x: number; y: number; accent: boolean }[] = [];
  let pen = 0;
  let accent = false;
  for (const ch of TEXT) {
    if (ch === ".") accent = true; // the suffix carries the signal colour
    const g = GLYPHS[ch];
    if (g) {
      for (let row = 0; row < ROWS; row++) {
        const bits = g[row];
        if (!bits) continue;
        for (let col = 0; col < 5; col++) {
          if (bits[col] === "1") cells.push({ x: pen + col, y: row, accent });
        }
      }
    }
    pen += ADVANCE(ch);
  }
  const w = pen - 1;

  return (
    <svg
      width={w * px}
      height={ROWS * px}
      viewBox={`0 0 ${w} ${ROWS}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="broadcastcopy.ai"
      className={className}
    >
      {cells.map((c, i) => (
        <rect
          key={i}
          x={c.x}
          y={c.y}
          width={1}
          height={1}
          fill={c.accent ? SIGNAL : "currentColor"}
        />
      ))}
    </svg>
  );
}
