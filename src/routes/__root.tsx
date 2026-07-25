import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="glass-strong max-w-md rounded-2xl p-10 text-center">
        <h1 className="gradient-text font-display text-7xl font-bold">404</h1>
        <h2 className="mt-2 text-lg font-semibold">Signal lost</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This portal doesn't exist in the Meta World Space grid.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-primary-foreground [background:var(--gradient-primary)] glow"
        >
          Return to base
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="glass-strong max-w-md rounded-2xl p-10 text-center">
        <h1 className="font-display text-xl font-semibold">System interrupted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The AI core encountered turbulence. Restart the sequence.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full px-4 py-2 text-sm font-semibold text-primary-foreground [background:var(--gradient-primary)]"
          >
            Retry
          </button>
          <a href="/" className="rounded-full border border-border px-4 py-2 text-sm">Home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Meta World Space — Enter the AI Investment Grid" },
      { name: "description", content: "A futuristic AI-powered Web3 investment platform. Wallet-only access, robotic trading, and premium passive income." },
      { name: "author", content: "Meta World Space" },
      { property: "og:title", content: "Meta World Space — Enter the AI Investment Grid" },
      { property: "og:description", content: "A futuristic AI-powered Web3 investment platform. Wallet-only access, robotic trading, and premium passive income." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Meta World Space — Enter the AI Investment Grid" },
      { name: "twitter:description", content: "A futuristic AI-powered Web3 investment platform. Wallet-only access, robotic trading, and premium passive income." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/befb0689-a90b-428e-84d6-838ed2997081/id-preview-0e5ad1ee--f4c01481-98d0-4125-8702-348dfe7ba333.lovable.app-1784977089103.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/befb0689-a90b-428e-84d6-838ed2997081/id-preview-0e5ad1ee--f4c01481-98d0-4125-8702-348dfe7ba333.lovable.app-1784977089103.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster theme="dark" position="top-right" />
    </QueryClientProvider>
  );
}
