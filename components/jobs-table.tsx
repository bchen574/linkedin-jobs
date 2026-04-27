"use client";

import {
  ArrowClockwise,
  ArrowSquareOut,
  CaretDown,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { useJobs } from "@/hooks/use-jobs";
import { getJobExperienceText } from "@/lib/jobs/filters";
import { isFreshJob } from "@/lib/jobs/transforms";
import type { JobResult } from "@/lib/jobs/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const loadingBarDurationMs = 5 * 60 * 1000;
const maxEstimatedProgress = 95;

export function JobsTable() {
  const {
    jobs,
    appliedJobs,
    hiddenJobs,
    visibleJobs,
    experienceFilters,
    selectedExperience,
    setSelectedExperience,
    isLoading,
    isFetchingJobs,
    errorMessage,
    lastUpdatedAt,
    loadJobs,
    hideJob,
    applyJob,
    unhideJob,
  } = useJobs();
  const [isAppliedJobsOpen, setIsAppliedJobsOpen] = useState(false);
  const [isHiddenJobsOpen, setIsHiddenJobsOpen] = useState(false);

  return (
    <section className="w-full py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">
              LinkedIn Jobs
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Wide-net design searches across Canada.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadJobs({ force: true })}
              disabled={isLoading}
            >
              <ArrowClockwise aria-hidden="true" weight="bold" />
              Refresh
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" disabled={isLoading}>
                  <ArrowClockwise aria-hidden="true" weight="bold" />
                  Refresh all
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Refresh all job results?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will run a full past-month LinkedIn search and may take
                    several minutes. Hidden jobs will stay hidden.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      void loadJobs({
                        force: true,
                        postedWithin: "month",
                        replaceVisible: true,
                      })
                    }
                  >
                    Refresh all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {errorMessage ? (
          <div className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        {isFetchingJobs ? <JobSearchProgress /> : null}

        <div className="flex flex-wrap gap-2">
          {experienceFilters.map((filter) => (
            <Button
              key={filter.label}
              type="button"
              size="sm"
              variant={
                selectedExperience === filter.label ? "default" : "outline"
              }
              onClick={() => setSelectedExperience(filter.label)}
            >
              {filter.label}
              <span className="ml-1 inline-flex min-w-5 items-center justify-center bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground group-data-[variant=default]/button:bg-primary-foreground group-data-[variant=default]/button:text-primary">
                {filter.count}
              </span>
            </Button>
          ))}
        </div>

        <div className="md:hidden">
          <JobCards
            jobs={visibleJobs}
            isLoading={isLoading}
            emptyMessage="No jobs found."
            onApply={applyJob}
            onHide={hideJob}
          />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {getTableCaption({
              isLoading,
              jobs,
              visibleJobs,
              lastUpdatedAt,
            })}
          </p>
        </div>

        <div className="hidden bg-background md:block">
          <Table className="table-fixed">
            <colgroup>
              <col className="w-[calc((100%_-_21.5rem)_/_5)]" />
              <col className="w-[calc((100%_-_21.5rem)_/_5)]" />
              <col className="w-[calc((100%_-_21.5rem)_/_5)]" />
              <col className="w-[calc((100%_-_21.5rem)_/_5)]" />
              <col className="w-[calc((100%_-_21.5rem)_/_5)]" />
              <col className="w-20" />
              <col className="w-10" />
              <col className="w-32" />
              <col className="w-24" />
            </colgroup>
            <TableCaption>
              {getTableCaption({
                isLoading,
                jobs,
                visibleJobs,
                lastUpdatedAt,
              })}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Job title</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead className="w-20 text-center">Applied</TableHead>
                <TableHead className="w-10 text-center">Post</TableHead>
                <TableHead className="w-32 text-right">Apply</TableHead>
                <TableHead className="w-24 text-right">Hide</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="truncate font-medium">
                    {job.title}
                  </TableCell>
                  <TableCell className="truncate">
                    {isFreshJob(job) ? (
                      <span className="inline-flex h-6 items-center border border-emerald-200 bg-emerald-50 px-2 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {job.postedAt}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {job.postedAt}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="truncate">{job.company}</TableCell>
                  <TableCell className="truncate text-muted-foreground">
                    {job.location}
                  </TableCell>
                  <TableCell className="truncate text-muted-foreground">
                    {job.yearsOfExperience ??
                      (job.descriptionText ? "Checking..." : "Not checked")}
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={Boolean(job.applied)}
                      onCheckedChange={(checked) => {
                        if (checked === true) {
                          applyJob(job);
                        }
                      }}
                      aria-label={`Mark ${job.title} as applied`}
                      className="mx-auto"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    {job.linkedInUrl ? (
                      <Button
                        asChild
                        size="icon-sm"
                        variant="outline"
                        className="mx-auto"
                      >
                        <a
                          href={job.linkedInUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open LinkedIn post for ${job.title}`}
                        >
                          <ArrowSquareOut aria-hidden="true" weight="bold" />
                        </a>
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {job.applyUrl ? (
                      <Button asChild size="sm">
                        <a href={job.applyUrl} target="_blank" rel="noreferrer">
                          Apply
                          <ArrowSquareOut aria-hidden="true" weight="bold" />
                        </a>
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No link
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => hideJob(job)}
                    >
                      Hide
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!jobs.length ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-28 text-center text-muted-foreground"
                  >
                    {isLoading ? "Loading jobs..." : "No jobs found."}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <CollapsibleJobsSection
          title="Applied jobs"
          description="Jobs you have marked as applied stay out of the main list."
          isOpen={isAppliedJobsOpen}
          onOpenChange={setIsAppliedJobsOpen}
        >
          <div className="md:hidden">
            <JobCards
              jobs={appliedJobs}
              isLoading={false}
              emptyMessage="Applied jobs will appear here."
            />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {appliedJobs.length
                ? `${appliedJobs.length} applied jobs.`
                : "No applied jobs."}
            </p>
          </div>
          <div className="hidden bg-background md:block">
            <Table className="table-fixed">
              <colgroup>
                <col className="w-[calc((100%_-_15.5rem)_/_5)]" />
                <col className="w-[calc((100%_-_15.5rem)_/_5)]" />
                <col className="w-[calc((100%_-_15.5rem)_/_5)]" />
                <col className="w-[calc((100%_-_15.5rem)_/_5)]" />
                <col className="w-[calc((100%_-_15.5rem)_/_5)]" />
                <col className="w-20" />
                <col className="w-10" />
                <col className="w-32" />
              </colgroup>
              <TableCaption>
                {appliedJobs.length
                  ? `${appliedJobs.length} applied jobs.`
                  : "No applied jobs."}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Job title</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead className="w-20 text-center">Applied</TableHead>
                  <TableHead className="w-10 text-center">Post</TableHead>
                  <TableHead className="w-32 text-right">Apply</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appliedJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="truncate font-medium">
                      {job.title}
                    </TableCell>
                    <TableCell className="truncate text-muted-foreground">
                      {job.postedAt}
                    </TableCell>
                    <TableCell className="truncate">{job.company}</TableCell>
                    <TableCell className="truncate text-muted-foreground">
                      {job.location}
                    </TableCell>
                    <TableCell className="truncate text-muted-foreground">
                      {job.yearsOfExperience ?? "Not checked"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked
                        disabled
                        aria-label={`${job.title} is marked as applied`}
                        className="mx-auto"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {job.linkedInUrl ? (
                        <Button
                          asChild
                          size="icon-sm"
                          variant="outline"
                          className="mx-auto"
                        >
                          <a
                            href={job.linkedInUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open LinkedIn post for ${job.title}`}
                          >
                            <ArrowSquareOut aria-hidden="true" weight="bold" />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {job.applyUrl ? (
                        <Button asChild size="sm">
                          <a
                            href={job.applyUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Apply
                            <ArrowSquareOut aria-hidden="true" weight="bold" />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No link
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!appliedJobs.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-20 text-center text-muted-foreground"
                    >
                      Applied jobs will appear here.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CollapsibleJobsSection>

        <CollapsibleJobsSection
          title="Hidden jobs"
          description="Results you have hidden stay out of the main list."
          isOpen={isHiddenJobsOpen}
          onOpenChange={setIsHiddenJobsOpen}
        >
          <div className="md:hidden">
            <JobCards
              jobs={hiddenJobs}
              isLoading={false}
              emptyMessage="Hidden jobs will appear here."
              onUnhide={unhideJob}
            />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {hiddenJobs.length
                ? `${hiddenJobs.length} hidden jobs.`
                : "No hidden jobs."}
            </p>
          </div>
          <div className="hidden bg-background md:block">
            <Table className="table-fixed">
              <colgroup>
                <col className="w-[calc((100%_-_17.5rem)_/_5)]" />
                <col className="w-[calc((100%_-_17.5rem)_/_5)]" />
                <col className="w-[calc((100%_-_17.5rem)_/_5)]" />
                <col className="w-[calc((100%_-_17.5rem)_/_5)]" />
                <col className="w-[calc((100%_-_17.5rem)_/_5)]" />
                <col className="w-10" />
                <col className="w-32" />
                <col className="w-28" />
              </colgroup>
              <TableCaption>
                {hiddenJobs.length
                  ? `${hiddenJobs.length} hidden jobs.`
                  : "No hidden jobs."}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Job title</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead className="w-10 text-center">Post</TableHead>
                  <TableHead className="w-32 text-right">Apply</TableHead>
                  <TableHead className="w-28 text-right">Restore</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hiddenJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="truncate font-medium">
                      {job.title}
                    </TableCell>
                    <TableCell className="truncate text-muted-foreground">
                      {job.postedAt}
                    </TableCell>
                    <TableCell className="truncate">{job.company}</TableCell>
                    <TableCell className="truncate text-muted-foreground">
                      {job.location}
                    </TableCell>
                    <TableCell className="truncate text-muted-foreground">
                      {job.yearsOfExperience ?? "Not checked"}
                    </TableCell>
                    <TableCell className="text-center">
                      {job.linkedInUrl ? (
                        <Button
                          asChild
                          size="icon-sm"
                          variant="outline"
                          className="mx-auto"
                        >
                          <a
                            href={job.linkedInUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open LinkedIn post for ${job.title}`}
                          >
                            <ArrowSquareOut aria-hidden="true" weight="bold" />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {job.applyUrl ? (
                        <Button asChild size="sm">
                          <a
                            href={job.applyUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Apply
                            <ArrowSquareOut aria-hidden="true" weight="bold" />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No link
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => unhideJob(job)}
                      >
                        Unhide
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!hiddenJobs.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-20 text-center text-muted-foreground"
                    >
                      Hidden jobs will appear here.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CollapsibleJobsSection>
      </div>
    </section>
  );
}

function JobSearchProgress() {
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

function CollapsibleJobsSection({
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

function JobCards({
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

function PostedAtLabel({ job }: { job: JobResult }) {
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

function getTableCaption({
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
    return "Loading wide-net job searches.";
  }

  if (!lastUpdatedAt) {
    return "Wide-net job searches refresh every 2 hours.";
  }

  if (visibleJobs.length !== jobs.length) {
    return `Showing ${visibleJobs.length} of ${jobs.length} jobs. Last updated ${lastUpdatedAt.toLocaleTimeString()}.`;
  }

  return `Showing ${jobs.length} jobs. Last updated ${lastUpdatedAt.toLocaleTimeString()}.`;
}
