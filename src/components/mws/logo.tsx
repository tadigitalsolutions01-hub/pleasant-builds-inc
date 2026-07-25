import { Link } from "@tanstack/react-router";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="group flex items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl neon-border">
        <span className="absolute inset-0 rounded-xl opacity-60 blur-md [background:var(--gradient-primary)]" />
        <svg viewBox="0 0 24 24" className="relative h-5 w-5 text-primary-foreground">
          <defs>
            <linearGradient id="lg" x1="0" x2="1">
              <stop offset="0" stopColor="oklch(0.85 0.19 210)" />
              <stop offset="1" stopColor="oklch(0.7 0.24 295)" />
            </linearGradient>
          </defs>
          <path d="M4 20 L12 4 L20 20 L12 15 Z" fill="url(#lg)" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-sm font-bold tracking-widest text-foreground">
          META WORLD
        </span>
        <span className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
          SPACE · v2
        </span>
      </span>
    </Link>
  );
}
