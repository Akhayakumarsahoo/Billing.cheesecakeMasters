export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-base, #0a0a0b)" }}>
      <div className="flex flex-col items-center gap-4">
        {/* Animated logo mark */}
        <div className="relative">
          <div
            className="h-12 w-12 rounded-xl animate-pulse"
            style={{ backgroundColor: "var(--accent-primary, #6366f1)" }}
          />
          <div
            className="absolute inset-0 h-12 w-12 rounded-xl animate-ping opacity-20"
            style={{ backgroundColor: "var(--accent-primary, #6366f1)" }}
          />
        </div>

        {/* Brand name */}
        <span
          className="font-mono font-semibold text-lg tracking-wide"
          style={{ color: "var(--text-primary, #f5f5f5)" }}
        >
          BillFlow
        </span>

        {/* Loading dots */}
        <div className="flex gap-1.5 mt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 rounded-full animate-bounce"
              style={{
                backgroundColor: "var(--text-muted, #6b7280)",
                animationDelay: `${i * 150}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
