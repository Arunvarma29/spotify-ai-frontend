"use client";

// Why this file exists
// ====================
//
// The sidebar. It includes the seven operator screens and the listener controls.
//
// abc.md:339-345 lists seven operator screens. They stay in the document's
// order, followed by the listener-facing controls.

import Link from "next/link";
import { usePathname } from "next/navigation";

// The seven screens of abc.md:339-345, in the document's own order, followed
// by the listener controls served by this same app and login.
const SCREENS = [
  { href: "/", label: "Overview", note: "health, ingestion lag, rejections" },
  { href: "/memories", label: "Memory explorer", note: "one subject's memories" },
  { href: "/context", label: "Context preview", note: "retrieval, ranking, the pack" },
  { href: "/corrections", label: "Correction & deletion", note: "correct, remove, propagation" },
  { href: "/policy", label: "Schema & policy", note: "allowed fields, retention" },
  { href: "/quality", label: "Quality review", note: "golden-set runs" },
  { href: "/trace", label: "Audit trace", note: "decisions behind a response" },
  { href: "/my-memory", label: "Your memory controls", note: "review, change, pause, or remove" },
];

export default function Nav() {
  const path = usePathname();

  // The login page stands on its own, with no menu.
  if (path === "/login") return null;

  return (
    <nav
      aria-label="Main navigation"
      className="app-sidebar flex w-64 shrink-0 flex-col border-r p-3"
    >
      <div className="sidebar-brand">
        <span className="brand-mark" aria-hidden="true">M</span>
        <div>
          <div className="text-sm font-semibold tracking-tight text-ink">Memory</div>
          <div className="eyebrow mt-0.5">Operator console</div>
        </div>
      </div>

      <div className="nav-section-label">Workspace</div>
      <div className="sidebar-scroll">
        {SCREENS.map((screen) => {
          const active = path === screen.href;
          return (
            <Link
              key={screen.href}
              href={screen.href}
              aria-current={active ? "page" : undefined}
              className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}
            >
              <span className="min-w-0">
                <span className="nav-link-label block text-sm font-medium">{screen.label}</span>
                <span className="sidebar-link-note mt-0.5 block text-[11px] text-faint">
                  {screen.note}
                </span>
              </span>
              {active && <span className="nav-link-arrow" aria-hidden="true">›</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
