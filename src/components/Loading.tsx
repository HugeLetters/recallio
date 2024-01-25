const DURATION = 1000;
const DOT_COUNT = 12;
const DOTS = Array.from({ length: DOT_COUNT });
type SpinnerProps = { className?: string };
export function Spinner({ className }: SpinnerProps) {
  return (
    <div className={className}>
      <svg
        viewBox="0 0 24 24"
        className="h-full w-full"
      >
        {DOTS.map((_, i) => (
          <circle
            key={i}
            cx="12"
            cy="2"
            r="0"
            transform={`rotate(${360 * (i / DOT_COUNT)})`}
            className={`origin-center ${i % 2 ? "fill-app-green" : "fill-app-green/30"}`}
          >
            <animate
              attributeName="r"
              dur={`${DURATION}ms`}
              begin={`${i * (DURATION / DOT_COUNT)}ms`}
              keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
              values="0;2;0;0"
              calcMode="spline"
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </svg>
    </div>
  );
}
