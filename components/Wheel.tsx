// One coloured slice of the wheel per link.
export type Slice = { id: number; color: string };

// How wide the white gap between slices is, in degrees.
const GAP = 1.2;

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
}: {
  slices: Slice[];
  size?: number;
}) {
  const small = size < 200;

  return (
    <div
      className="relative mx-auto aspect-square"
      style={{ width: `min(${size}px, 100%)` }}
    >
      {/* The coloured disc. */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: gradientFor(slices) }}
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
