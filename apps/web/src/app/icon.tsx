import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Renders the Grip icon (2×3 dot grid) as the app favicon.
export default function Icon() {
  const dots = [
    { cx: 9, cy: 5 },
    { cx: 15, cy: 5 },
    { cx: 9, cy: 12 },
    { cx: 15, cy: 12 },
    { cx: 9, cy: 19 },
    { cx: 15, cy: 19 },
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
