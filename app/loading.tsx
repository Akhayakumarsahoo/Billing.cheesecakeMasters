export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-base, #0a0a0b)" }}>
      <div className="flex flex-col items-center gap-4">
        {/* Animated logo */}
        <div className="animate-pulse">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.svg" alt="Cheesecake Masters" width={64} height={64} />
        </div>

        {/* Brand name */}
        <span
          className="font-semibold text-lg tracking-wide"
          style={{ color: "var(--text-primary, #f5f5f5)" }}
        >
          Cheesecake Masters
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
