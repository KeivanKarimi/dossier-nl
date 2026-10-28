"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import { createContext, use } from "react";

import { cn } from "@/lib/cn";

/**
 * Tabs following the WAI-ARIA pattern: Tab moves into and out of the tab
 * list, the arrow keys move between tabs, and a tab's panel shows when it's
 * focused. Built on Radix Tabs; use `value`/`onValueChange` to control it.
 */
export const Tabs = TabsPrimitive.Root;

type TabsVariant = "underline" | "segmented";

const VariantContext = createContext<TabsVariant>("underline");

export type TabsListProps = TabsPrimitive.TabsListProps & {
  /** `underline` for page tabs, `segmented` for tabs inside a panel. */
  variant?: TabsVariant;
};

export function TabsList({ variant = "underline", className, ...props }: TabsListProps) {
  return (
    <VariantContext value={variant}>
      <TabsPrimitive.List
        className={cn(
          "flex",
          // Below sm the tabs stay on one line and scroll sideways; the line
          // under them is a shadow, which the scrolling doesn't clip.
          variant === "underline"
            ? "scrollbar-none gap-x-5 overflow-x-auto shadow-[inset_0_-1px_0_var(--color-line)] sm:flex-wrap sm:gap-x-7 sm:overflow-visible sm:border-b sm:border-line sm:shadow-none"
            : "rounded-[10px] bg-track p-[3px]",
          className,
        )}
        {...props}
      />
    </VariantContext>
  );
}

const triggerClassNames: Record<TabsVariant, string> = {
  underline:
    "shrink-0 border-b-2 border-transparent pt-2.5 pb-[13px] text-sm whitespace-nowrap text-muted sm:-mb-px hover:text-ink data-[state=active]:border-primary data-[state=active]:font-medium data-[state=active]:text-ink",
  segmented:
    "flex-1 rounded-control p-2 text-control font-medium data-[state=active]:bg-card data-[state=active]:shadow-raised",
};

export function TabsTrigger({ className, ...props }: TabsPrimitive.TabsTriggerProps) {
  const variant = use(VariantContext);
  return (
    <TabsPrimitive.Trigger
      className={cn(
        triggerClassNames[variant],
        "disabled:cursor-not-allowed disabled:text-faint",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: TabsPrimitive.TabsContentProps) {
  return <TabsPrimitive.Content className={cn("outline-offset-4", className)} {...props} />;
}
