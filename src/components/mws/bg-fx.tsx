export function BgFx() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: "var(--gradient-hero)" }}
      />
      <div className="grid-bg absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-30 blur-3xl [background:var(--gradient-primary)]" />
      <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full opacity-20 blur-3xl [background:radial-gradient(circle,oklch(0.72_0.25_340),transparent_70%)]" />
    </div>
  );
}
