"use client";

import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { createContext, use, useState, type MouseEvent, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { rememberPreference, SIDEBAR_COOKIE } from "@/lib/ui-preferences";

const CollapsedContext = createContext<{ collapsed: boolean; expand: () => void }>({ collapsed: false, expand: () => {} });

/** Whether the sidebar is collapsed to its icons, for the parts that need more than CSS. */
export function useSidebarCollapsed(): boolean {
  return use(CollapsedContext).collapsed;
}

/** Opens a collapsed sidebar, for a part that needs its full width (the update notice). */
export function useExpandSidebar(): () => void {
  return use(CollapsedContext).expand;
}

/**
 * The sidebar's frame, collapsible to a strip of icons.
 * The choice is kept in a cookie, so the server renders the next page the
 * same way. Inside, `group-data-collapsed/sidebar:` variants hide what
 * doesn't fit, so the server-rendered parts need no state of their own.
 * Below `lg` the sidebar gives way to a top bar whose menu button opens the
 * same contents in a drawer.
 */
export function SidebarFrame({
  initialCollapsed,
  brand,
  children,
}: {
  initialCollapsed: boolean;
  /** The logo, which the expand button replaces on hover while collapsed. */
  brand: ReactNode;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const change = (next: boolean) => {
    setCollapsed(next);
    rememberPreference(SIDEBAR_COOKIE, next ? "collapsed" : "expanded");
  };
  const toggle = () => change(!collapsed);
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <>
      <MobileBar brand={brand}>{children}</MobileBar>
      <CollapsedContext value={{ collapsed, expand: () => change(false) }}>
        <aside
          data-collapsed={collapsed || undefined}
          className={cn(
            "group/sidebar sticky top-0 hidden h-screen shrink-0 flex-col self-start overflow-x-hidden overflow-y-auto border-r border-line bg-sidebar motion-safe:transition-[width] motion-safe:duration-200 lg:flex",
            collapsed ? "w-12" : "w-[260px]",
          )}
        >
          <div
            className={cn(
              "group/header relative flex items-center gap-2 border-b border-line",
              collapsed ? "justify-center px-1 py-3" : "pt-3 pr-3 pb-4 pl-4",
            )}
          >
            <div
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2",
                // Collapsed, the logo and the expand button share one slot.
                collapsed &&
                  "flex-none group-hover/header:opacity-0 group-has-[button:focus-visible]/header:opacity-0 motion-safe:transition-opacity",
              )}
            >
              {brand}
            </div>
            <button
              type="button"
              onClick={toggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-control text-muted hover:bg-hover hover:text-ink",
                collapsed &&
                  "absolute inset-0 m-auto size-8 bg-surface opacity-0 group-hover/header:opacity-100 focus-visible:opacity-100 motion-safe:transition-opacity",
              )}
            >
              <Icon size={16} aria-hidden="true" />
            </button>
          </div>
          {children}
        </aside>
      </CollapsedContext>
    </>
  );
}

/**
 * The top bar on narrow screens: the logo and a menu button that opens the
 * sidebar's contents in a drawer, always expanded. The drawer is only in the
 * page while open, so there's one main navigation at a time.
 */
function MobileBar({ brand, children }: { brand: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // Following a link closes the drawer, even one to the page already shown.
  const closeOnLink = (event: MouseEvent) => {
    if (event.target instanceof Element && event.target.closest("a")) setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <header className="sticky top-0 z-30 flex h-(--topbar-h) shrink-0 items-center justify-between gap-2 border-b border-line bg-sidebar pr-2 pl-4 lg:hidden">
        <div className="flex min-w-0 items-center gap-2">{brand}</div>
        <Dialog.Trigger
          aria-label="Open menu"
          className="grid size-10 shrink-0 place-items-center rounded-control text-muted hover:bg-hover hover:text-ink"
        >
          <Menu size={20} aria-hidden="true" />
        </Dialog.Trigger>
      </header>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 lg:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          onClick={closeOnLink}
          className="group/sidebar fixed inset-y-0 left-0 z-50 flex h-dvh w-[280px] max-w-[85vw] flex-col overflow-y-auto border-r border-line bg-sidebar focus:outline-none motion-safe:animate-drawer-in lg:hidden"
        >
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          <div className="flex items-center gap-2 border-b border-line pt-3 pr-2 pb-4 pl-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">{brand}</div>
            <Dialog.Close
              aria-label="Close menu"
              className="grid size-10 shrink-0 place-items-center rounded-control text-muted hover:bg-hover hover:text-ink"
            >
              <X size={20} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <CollapsedContext value={{ collapsed: false, expand: () => {} }}>{children}</CollapsedContext>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
