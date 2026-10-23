// One coloured slice of the wheel per link.
export type Slice = { id: number; color: string };

// How wide the white gap between slices is, in degrees.
const GAP = 1.2;

// How long the spin takes, and how it slows down at the end.
const SPIN = "transform 4.5s cubic-bezier(0.15, 0.85, 0.25, 1)";

// The rotation that puts slice `index` under the pointer at the top.
// The slice's centre sits at (index + 0.5) x slice size, so turning the
// wheel by 360 - centre brings that centre round to 0deg.
export function landingAngle(index: number, count: number) {
  const centre = (index + 0.5) * (360 / count);
  return 360 - centre;
}

// Builds the CSS conic-gradient: each slice gets a start and end angle,
// with half a white gap at each edge. 0deg is the top, going clockwise.
function gradientFor(slices: Slice[]) {
  if (slices.length === 0) return "var(--color-line)";
  if (slices.length === 1) return slices[0].color;

  const size = 360 / slices.length;
  const half = Math.min(GAP, size / 3) / 2;
  const stops = slices.map((slice, index) => {
    const start = index * size;
    const end = start + size;
    return [
      `white ${start}deg ${start + half}deg`,
      `${slice.color} ${start + half}deg ${end - half}deg`,
      `white ${end - half}deg ${end}deg`,
    ].join(", ");
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export default function Wheel({
  slices,
  size = 340,
  rotation = 0,
  animate = false,
  onSpinEnd,
}: {
  slices: Slice[];
  size?: number;
  rotation?: number;
  animate?: boolean;
  onSpinEnd?: () => void;
}) {
  const small = size < 200;

  return (
    <div
      className="relative mx-auto aspect-square"
      style={{ width: `min(${size}px, 100%)` }}
    >
      {/* The coloured disc. Only this part turns. */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: gradientFor(slices),
          transform: `rotate(${rotation}deg)`,
          transition: animate ? SPIN : "none",
        }}
        onTransitionEnd={onSpinEnd}
      />

      {/* The white circle in the middle, showing the count. */}
      <div className="absolute inset-[30%] flex flex-col items-center justify-center rounded-full bg-white">
        {!small && (
          <>
            <span className="text-3xl font-semibold leading-none">{slices.length}</span>
            <span className="mt-1 text-xs text-muted">
              {slices.length === 1 ? "link" : "links"}
            </span>
          </>
        )}
      </div>

      {/* The pointer: a black triangle at the top, pointing down. */}
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3"
        style={{
          width: 0,
          height: 0,
          borderLeft: `${small ? 6 : 12}px solid transparent`,
          borderRight: `${small ? 6 : 12}px solid transparent`,
          borderTop: `${small ? 10 : 20}px solid var(--color-ink)`,
        }}
      />
    </div>
  );
}
