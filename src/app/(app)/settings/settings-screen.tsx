"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/page-header";
import { SavedIndicator } from "@/components/saved-indicator";
import { TrackSaveContext, useSaveTracker } from "@/components/save-tracker";
import { cn } from "@/lib/cn";

import { SETTINGS_SECTIONS, settingsSectionHref, type SettingsSectionId } from "./sections";

/**
 * The Settings frame (E10-1): the section list on the left, the section on
 * the right, stacked on narrow windows. Every control saves on its own; the
 * header says when it's done.
 */
export function SettingsScreen({ section, children }: { section: SettingsSectionId; children: ReactNode }) {
  const saves = useSaveTracker();

  return (
    <TrackSaveContext value={saves.track}>
      <PageHeader
        title="Settings"
        description="It's your server, so it's your call. Choose which AI writes for you, set your document defaults, and take your data with you whenever you like."
        actions={<SavedIndicator status={saves.status} savedAt={saves.savedAt} />}
      />
      <div className="flex flex-wrap items-start gap-x-12 gap-y-6 px-page pb-20 md:gap-y-8">
        {/* Below md, the sections are a strip that scrolls sideways above the content. */}
        <nav
          aria-label="Settings sections"
          className="flex w-full min-w-0 scrollbar-subtle gap-1 overflow-x-auto pb-1 md:w-auto md:max-w-[220px] md:min-w-[200px] md:flex-[1_1_200px] md:flex-col md:gap-0.5 md:overflow-visible md:pb-0"
        >
          {SETTINGS_SECTIONS.map((entry) => (
            <Link
              key={entry.id}
              href={settingsSectionHref(entry.id)}
              aria-current={entry.id === section ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-control px-3 py-[9px] text-sm whitespace-nowrap text-ink hover:bg-hover hover:text-ink md:shrink md:whitespace-normal",
                entry.id === section && "bg-selected font-medium hover:bg-selected",
              )}
            >
              {entry.label}
            </Link>
          ))}
        </nav>
        <div className="flex max-w-[760px] min-w-0 flex-[999_1_420px] flex-col gap-5">{children}</div>
      </div>
    </TrackSaveContext>
  );
}

/** A section's title and introduction. */
export function SettingsSectionIntro({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="font-serif text-section">{title}</h2>
      {children && <p className="text-sm text-pretty text-muted">{children}</p>}
    </div>
  );
}
