import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Renders the Grip icon (2×3 dot grid) as the app favicon.
export default function Icon() {
  // 3 columns × 2 rows — matches GripHorizontal layout
  const dots = [
    { cx: 5, cy: 9 },
    { cx: 12, cy: 9 },
    { cx: 19, cy: 9 },
    { cx: 5, cy: 15 },
    { cx: 12, cy: 15 },
    { cx: 19, cy: 15 },
  ];

  return new ImageResponse(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
    >
      {dots.map(({ cx, cy }) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2" fill="#000000" />
      ))}
    </svg>,
    { ...size },
  );
}
