import { tw } from "@/styles/tw";

const DURATION = 1000;
const DOT_COUNT = 12;
const DOTS = Array.from({ length: DOT_COUNT }, (_, i) => i);
type SpinnerProps = { className?: string };
export function Spinner({ className }: SpinnerProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
    >
      <title>Server request is being processed</title>
      {DOTS.map((dot) => (
        <circle
          key={dot}
          cx="12"
          cy="2"
          r="0"
          transform={`rotate(${360 * (dot / DOT_COUNT)})`}
          className={tw("origin-center", dot % 2 ? "fill-app-green-500" : "fill-app-green-500/30")}
        >
          <animate
            attributeName="r"
            dur={`${DURATION}ms`}
            begin={`${dot * (DURATION / DOT_COUNT)}ms`}
            keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
            values="0;2;0;0"
            calcMode="spline"
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </svg>
  );
}
