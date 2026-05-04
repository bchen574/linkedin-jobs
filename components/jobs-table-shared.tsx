"use client";

import { ArrowSquareOut, Article, CaretDown } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getJobExperienceText } from "@/lib/jobs/filters";
import { isFreshJob } from "@/lib/jobs/transforms";
import type { JobResult } from "@/lib/jobs/types";
import { ScrollArea } from "@/components/ui/scroll-area";

const loadingBarDurationMs = 5 * 60 * 1000;
const maxEstimatedProgress = 95;

export function JobSearchProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();

    const intervalId = window.setInterval(() => {
      const elapsedMs = Date.now() - startedAt;
      const estimatedProgress =
        (elapsedMs / loadingBarDurationMs) * maxEstimatedProgress;

      setProgress(Math.min(maxEstimatedProgress, estimatedProgress));
    }, 500);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="flex flex-col gap-2 border bg-muted/30 px-3 py-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">Searching LinkedIn jobs</span>
        <span className="text-muted-foreground">{Math.round(progress)}%</span>
      </div>
      <div
        className="h-2 overflow-hidden bg-muted"
        role="progressbar"
        aria-label="Estimated job search progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div
          className="h-full bg-primary transition-[width] duration-500 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Estimated time: 5 minutes.
      </p>
    </div>
  );
}

export function CollapsibleJobsSection({
  title,
  description,
  isOpen,
  onOpenChange,
  children,
}: {
  title: string;
  description: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  children: ReactNode;
}) {
  return (
    <section className="mt-6 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-normal">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          onClick={() => onOpenChange(!isOpen)}
          aria-expanded={isOpen}
          aria-label={`${isOpen ? "Collapse" : "Expand"} ${title}`}
        >
          <CaretDown
            aria-hidden="true"
            className={isOpen ? "rotate-180" : undefined}
            weight="bold"
          />
        </Button>
      </div>
      {isOpen ? children : null}
    </section>
  );
}

export function JobDescriptionSheet({ job }: { job: JobResult }) {
  const descriptionText = job.descriptionText?.trim();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          aria-label={`Open job description for ${job.title}`}
          className="mx-auto"
        >
          <Article aria-hidden="true" weight="bold" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(90vw,42rem)] sm:max-w-2xl">
        <SheetHeader className="">
          <SheetTitle>{job.title}</SheetTitle>
          <SheetDescription>
            {job.company} - {job.location}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className=" overflow-y-auto px-4">
          <p className="pt-5 pb-16 whitespace-pre-wrap leading-relaxed text-sm">
            {descriptionText || "No description text available."}
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-background to-transparent" />
          <div className="absolute top-0 left-0 right-0 h-5 bg-linear-to-b from-background to-transparent" />
        </ScrollArea>

        <SheetFooter>
          {job.linkedInUrl ? (
            <Button asChild>
              <a href={job.linkedInUrl} target="_blank" rel="noreferrer">
                LinkedIn Post
                <ArrowSquareOut aria-hidden="true" weight="bold" />
              </a>
            </Button>
          ) : (
            <Button type="button" disabled>
              LinkedIn Post
              <ArrowSquareOut aria-hidden="true" weight="bold" />
            </Button>
          )}
          <SheetClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function JobCards({
  jobs,
  isLoading,
  emptyMessage,
  onApply,
  onHide,
  onUnhide,
}: {
  jobs: JobResult[];
  isLoading: boolean;
  emptyMessage: string;
  onApply?: (job: JobResult) => void;
  onHide?: (job: JobResult) => void;
  onUnhide?: (job: JobResult) => void;
}) {
  if (!jobs.length) {
    return (
      <div className="border bg-background px-3 py-10 text-center text-sm text-muted-foreground">
        {isLoading ? "Loading jobs..." : emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {jobs.map((job) => (
        <article key={job.id} className="border bg-background p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">{job.title}</h3>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {job.company}
              </p>
            </div>
            <PostedAtLabel job={job} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <JobCardField label="Location" value={job.location} />
            <JobCardField
              label="Experience"
              value={getJobExperienceText(job)}
            />
          </div>

          <div className="mt-4 flex items-center justify-start gap-2">
            {onApply || job.applied ? (
              <label className="flex h-7 items-center gap-2 border border-border bg-background px-2 text-xs font-medium text-foreground">
                <Checkbox
                  checked={Boolean(job.applied)}
                  disabled={!onApply}
                  onCheckedChange={(checked) => {
                    if (checked === true && onApply) {
                      onApply(job);
                    }
                  }}
                  aria-label={
                    job.applied
                      ? `${job.title} is marked as applied`
                      : `Mark ${job.title} as applied`
                  }
                />
                Applied
              </label>
            ) : null}
            {job.linkedInUrl ? (
              <Button asChild size="icon-sm" variant="outline">
                <a
                  href={job.linkedInUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open LinkedIn post for ${job.title}`}
                >
                  <ArrowSquareOut aria-hidden="true" weight="bold" />
                </a>
              </Button>
            ) : null}
            {job.applyUrl ? (
              <Button asChild size="sm">
                <a href={job.applyUrl} target="_blank" rel="noreferrer">
                  Apply
                  <ArrowSquareOut aria-hidden="true" weight="bold" />
                </a>
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">No link</span>
            )}
            {onHide ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onHide(job)}
              >
                Hide
              </Button>
            ) : null}
            {onUnhide ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onUnhide(job)}
              >
                Unhide
              </Button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

export function PostedAtLabel({ job }: { job: JobResult }) {
  if (isFreshJob(job)) {
    return (
      <span className="shrink-0 border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
        {job.postedAt}
      </span>
    );
  }

  return (
    <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">
      {job.postedAt}
    </span>
  );
}

export function getTableCaption({
  isLoading,
  jobs,
  visibleJobs,
  lastUpdatedAt,
}: {
  isLoading: boolean;
  jobs: JobResult[];
  visibleJobs: JobResult[];
  lastUpdatedAt?: Date;
}) {
  if (isLoading && !jobs.length) {
    return "Loading job results.";
  }

  if (!lastUpdatedAt) {
    return "Job searches refresh every 2 hours.";
  }

  if (visibleJobs.length !== jobs.length) {
    return `Showing ${visibleJobs.length} of ${jobs.length} jobs. Last updated ${lastUpdatedAt.toLocaleTimeString()}.`;
  }

  return `Showing ${jobs.length} jobs. Last updated ${lastUpdatedAt.toLocaleTimeString()}.`;
}

function JobCardField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.6875rem] font-medium uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-foreground">{value}</p>
    </div>
  );
}
