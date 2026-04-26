"use client";

import { ArrowClockwise, ArrowSquareOut } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { getJobExperience } from "@/lib/api/get-job-experience";
import { getJobsFromSupabase } from "@/lib/api/get-jobs-from-supabase";
import { saveJobsToSupabase } from "@/lib/api/save-jobs-to-supabase";
import { searchWideNetJobs } from "@/lib/api/search-jobs";
import type { PostedWithin } from "@/lib/linkedin/types";
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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const refreshIntervalMs = 2 * 60 * 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;
const weekMs = 7 * dayMs;
const monthMs = 30 * dayMs;
const jobsFetchLimit = 150;
const loadingBarDurationMs = 5 * 60 * 1000;
const maxEstimatedProgress = 95;
const experienceFilterOrder = [
  "All",
  "0-1 years",
  "1-2 years",
  "2-3 years",
  "3-5 years",
  "5-7 years",
  "7-10 years",
  "10+ years",
  "Not specified",
  "Not checked",
];

type JobResult = {
  id: string;
  title: string;
  postedAt: string;
  postedAtTimestamp?: number;
  company: string;
  location: string;
  descriptionText?: string;
  yearsOfExperience?: string;
  linkedInUrl?: string;
  applyUrl?: string;
  hiddenAt?: number;
};

type SavedJobs = {
  fetchedAt: number;
  jobs: JobResult[];
  hiddenJobs: JobResult[];
};

export function JobsTable() {
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [hiddenJobs, setHiddenJobs] = useState<JobResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingJobs, setIsFetchingJobs] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date>();
  const [selectedExperience, setSelectedExperience] = useState("All");
  const isSearchInProgress = useRef(false);
  const isExperienceLookupInProgress = useRef(false);
  const experienceFilters = getExperienceFilters(jobs);
  const visibleJobs = getVisibleJobs(jobs, selectedExperience);

  const enrichJobsWithExperience = useCallback(
    async (jobsToEnrich: JobResult[]) => {
      if (isExperienceLookupInProgress.current) {
        return;
      }

      const jobsMissingExperience = jobsToEnrich.filter((job) => {
        return job.descriptionText && !job.yearsOfExperience;
      });

      if (!jobsMissingExperience.length) {
        return;
      }

      isExperienceLookupInProgress.current = true;

      try {
        let nextJobs = jobsToEnrich;

        for (const job of jobsMissingExperience) {
          if (!job.descriptionText) {
            continue;
          }

          const yearsOfExperience = await getJobExperience(job.descriptionText);

          nextJobs = nextJobs.map((currentJob) =>
            currentJob.id === job.id
              ? { ...currentJob, yearsOfExperience }
              : currentJob,
          );

          setJobs(rehydrateJobs(nextJobs));

          const updatedJob = nextJobs.find((currentJob) => {
            return currentJob.id === job.id;
          });

          if (updatedJob) {
            void saveJobsToSupabase({
              jobs: [updatedJob],
              hiddenJobs: [],
            }).catch((error: unknown) => {
              setErrorMessage(getErrorMessage(error));
            });
          }
        }
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        isExperienceLookupInProgress.current = false;
      }
    },
    [],
  );

  const loadJobs = useCallback(async (
    options: {
      force?: boolean;
      postedWithin?: PostedWithin;
      replaceVisible?: boolean;
    } = {},
  ) => {
    if (isSearchInProgress.current) {
      return;
    }

    isSearchInProgress.current = true;
    setIsLoading(true);
    setErrorMessage(undefined);

    try {
      const savedJobs = await readSavedJobs();

      if (savedJobs) {
        setJobs(rehydrateJobs(savedJobs.jobs));
        setHiddenJobs(rehydrateJobs(savedJobs.hiddenJobs));
        setLastUpdatedAt(new Date(savedJobs.fetchedAt));
      }

      if (savedJobs && !options.force && !isSavedJobsStale(savedJobs)) {
        return;
      }

      setIsFetchingJobs(true);
      const results = await searchWideNetJobs({
        count: jobsFetchLimit,
          postedWithin: options.postedWithin ?? getPostedWithinForSavedJobs(savedJobs),
      });
      const fetchedAt = Date.now();
      const hiddenJobIds = new Set(savedJobs?.hiddenJobs.map((job) => job.id));
      const nextJobs = mergeJobs(
        normalizeJobs(results),
        options.replaceVisible ? [] : savedJobs?.jobs ?? [],
      ).filter((job) => !hiddenJobIds.has(job.id));
      const nextHiddenJobs = savedJobs?.hiddenJobs ?? [];

      setJobs(rehydrateJobs(nextJobs));
      setHiddenJobs(rehydrateJobs(nextHiddenJobs));
      setLastUpdatedAt(new Date(fetchedAt));
      void saveJobsToSupabase({
        jobs: nextJobs,
        hiddenJobs: nextHiddenJobs,
        replaceVisible: options.replaceVisible,
      }).catch((error: unknown) => {
        setErrorMessage(getErrorMessage(error));
      });
      void enrichJobsWithExperience(nextJobs);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsFetchingJobs(false);
      isSearchInProgress.current = false;
      setIsLoading(false);
    }
  }, [enrichJobsWithExperience]);

  const hideJob = useCallback(
    (jobToHide: JobResult) => {
      const nextJobs = jobs.filter((job) => job.id !== jobToHide.id);
      const nextHiddenJob = { ...jobToHide, hiddenAt: Date.now() };
      const nextHiddenJobs = mergeJobs(
        [nextHiddenJob],
        hiddenJobs,
      );

      setJobs(rehydrateJobs(nextJobs));
      setHiddenJobs(rehydrateJobs(nextHiddenJobs));
      void saveJobsToSupabase({
        jobs: [],
        hiddenJobs: [nextHiddenJob],
      }).catch((error: unknown) => {
        setErrorMessage(getErrorMessage(error));
      });
    },
    [hiddenJobs, jobs],
  );

  useEffect(() => {
    const initialLoadId = window.setTimeout(() => {
      void loadJobs();
    }, 0);

    const intervalId = window.setInterval(() => {
      void loadJobs();
    }, refreshIntervalMs);

    return () => {
      window.clearTimeout(initialLoadId);
      window.clearInterval(intervalId);
    };
  }, [loadJobs]);

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
              <col className="w-[calc((100%_-_16.5rem)_/_5)]" />
              <col className="w-[calc((100%_-_16.5rem)_/_5)]" />
              <col className="w-[calc((100%_-_16.5rem)_/_5)]" />
              <col className="w-[calc((100%_-_16.5rem)_/_5)]" />
              <col className="w-[calc((100%_-_16.5rem)_/_5)]" />
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
                    colSpan={8}
                    className="h-28 text-center text-muted-foreground"
                  >
                    {isLoading ? "Loading jobs..." : "No jobs found."}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-normal">
              Hidden jobs
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Results you have hidden stay out of the main list.
            </p>
          </div>
          <div className="md:hidden">
            <JobCards
              jobs={hiddenJobs}
              isLoading={false}
              emptyMessage="Hidden jobs will appear here."
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
                <col className="w-[calc((100%_-_10.5rem)_/_5)]" />
                <col className="w-[calc((100%_-_10.5rem)_/_5)]" />
                <col className="w-[calc((100%_-_10.5rem)_/_5)]" />
                <col className="w-[calc((100%_-_10.5rem)_/_5)]" />
                <col className="w-[calc((100%_-_10.5rem)_/_5)]" />
                <col className="w-10" />
                <col className="w-32" />
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
                  </TableRow>
                ))}
                {!hiddenJobs.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-20 text-center text-muted-foreground"
                    >
                      Hidden jobs will appear here.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>
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

function JobCards({
  jobs,
  isLoading,
  emptyMessage,
  onHide,
}: {
  jobs: JobResult[];
  isLoading: boolean;
  emptyMessage: string;
  onHide?: (job: JobResult) => void;
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
        <article
          key={job.id}
          className="border bg-background p-3"
        >
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
            <JobCardField label="Experience" value={getJobExperienceText(job)} />
          </div>

          <div className="mt-4 flex items-center justify-start gap-2">
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

function normalizeJobs(results: unknown) {
  if (!Array.isArray(results)) {
    return [];
  }

  return results.map((result, index) => normalizeJob(result, index));
}

function normalizeJob(result: unknown, index: number): JobResult {
  const job = isRecord(result) ? result : {};
  const title = getFirstString(job, ["title", "jobTitle", "position"]);
  const company = getFirstString(job, [
    "companyName",
    "company",
    "companyTitle",
  ]);
  const location = getLocationLabel(
    getFirstString(job, ["location", "formattedLocation"]),
  );
  const postedAtTimestamp = getPostedAtTimestamp(job);
  const linkedInJobId = getFirstString(job, ["id", "jobId", "linkedinJobId"]);
  const linkedInUrl = getFirstString(job, [
    "linkedInUrl",
    "linkedinUrl",
    "link",
    "jobUrl",
    "url",
  ]);
  const descriptionText = getFirstString(job, [
    "descriptionText",
    "description",
    "jobDescription",
  ]);
  const applyUrl = getFirstString(job, [
    "applyUrl",
    "applicationUrl",
    "jobUrl",
    "url",
    "link",
  ]);
  const yearsOfExperience = getFirstString(job, [
    "yearsOfExperience",
    "years_of_experience",
  ]);
  const hiddenAt = getFirstNumber(job, ["hiddenAt", "hidden_at"]);
  const id = linkedInJobId ?? applyUrl;

  return {
    id: id ?? `job-${index}`,
    title: title ?? "Untitled role",
    postedAt: formatPostedAt(postedAtTimestamp),
    postedAtTimestamp,
    company: company ?? "Unknown company",
    location,
    descriptionText,
    yearsOfExperience,
    linkedInUrl: linkedInUrl ?? getLinkedInJobUrlFromId(linkedInJobId),
    applyUrl,
    hiddenAt,
  };
}

function getPostedAtTimestamp(job: Record<string, unknown>) {
  const postedAtTimestamp = getFirstNumber(job, ["postedAtTimestamp"]);
  const postedAt = getFirstString(job, [
    "postedAt",
    "postedDate",
    "postedTime",
    "timePosted",
    "listedAt",
  ]);

  return getTimestamp(postedAtTimestamp ?? postedAt);
}

function getFirstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function getLocationLabel(location: string | undefined) {
  if (!location) {
    return "Unknown";
  }

  const locationParts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (locationParts.length >= 2) {
    return `${locationParts[0]}, ${locationParts[1]}`;
  }

  return locationParts[0] ?? "Unknown";
}

function getFirstNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function getTimestamp(value: number | string | undefined) {
  if (!value) {
    return undefined;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? undefined : timestamp;
}

function formatPostedAt(timestamp: number | undefined) {
  if (!timestamp) {
    return "Unknown";
  }

  const elapsedMs = Date.now() - timestamp;

  if (elapsedMs < 0) {
    return "Unknown";
  }

  const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));

  if (elapsedHours < 1) {
    return "Less than 1 hour ago";
  }

  if (elapsedHours < 24) {
    return `${elapsedHours} ${elapsedHours === 1 ? "hour" : "hours"} ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);

  return `${elapsedDays} ${elapsedDays === 1 ? "day" : "days"} ago`;
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

function getExperienceFilters(jobsToFilter: JobResult[]) {
  const filters = new Map<string, number>([["All", jobsToFilter.length]]);

  for (const job of jobsToFilter) {
    const label = getExperienceLabel(job);
    filters.set(label, (filters.get(label) ?? 0) + 1);
  }

  return Array.from(filters, ([label, count]) => ({ label, count })).sort(
    sortExperienceFilters,
  );
}

function getVisibleJobs(jobsToFilter: JobResult[], selectedExperience: string) {
  if (selectedExperience === "All") {
    return jobsToFilter;
  }

  return jobsToFilter.filter((job) => {
    return getExperienceLabel(job) === selectedExperience;
  });
}

function getExperienceLabel(job: JobResult) {
  return job.yearsOfExperience ?? "Not checked";
}

function getJobExperienceText(job: JobResult) {
  return job.yearsOfExperience ?? (job.descriptionText ? "Checking..." : "Not checked");
}

function sortExperienceFilters(
  firstFilter: { label: string },
  secondFilter: { label: string },
) {
  return (
    getExperienceFilterIndex(firstFilter.label) -
    getExperienceFilterIndex(secondFilter.label)
  );
}

function getExperienceFilterIndex(label: string) {
  const index = experienceFilterOrder.indexOf(label);

  return index === -1 ? experienceFilterOrder.length : index;
}

async function readSavedJobs(): Promise<SavedJobs | undefined> {
  const savedJobs = await getJobsFromSupabase();
  const jobs = pruneOldJobs(normalizeJobs(savedJobs.jobs));
  const hiddenJobs = pruneOldJobs(normalizeJobs(savedJobs.hiddenJobs));

  if (!jobs.length && !hiddenJobs.length) {
    return undefined;
  }

  return {
    fetchedAt: savedJobs.fetchedAt,
    jobs,
    hiddenJobs,
  };
}

function pruneOldJobs(jobsToPrune: JobResult[]) {
  const oldestAllowedTimestamp = Date.now() - monthMs;

  return jobsToPrune.filter((job) => {
    return (
      !job.postedAtTimestamp || job.postedAtTimestamp >= oldestAllowedTimestamp
    );
  });
}

function isSavedJobsStale(savedJobs: SavedJobs) {
  return Date.now() - savedJobs.fetchedAt >= refreshIntervalMs;
}

function getPostedWithinForSavedJobs(
  savedJobs: SavedJobs | undefined,
): PostedWithin {
  if (!savedJobs) {
    return "month";
  }

  const cacheAge = Date.now() - savedJobs.fetchedAt;

  if (cacheAge <= dayMs) {
    return "day";
  }

  if (cacheAge <= weekMs) {
    return "week";
  }

  return "month";
}

function mergeJobs(newJobs: JobResult[], cachedJobs: JobResult[]) {
  const jobsById = new Map<string, JobResult>();

  for (const job of [...newJobs, ...cachedJobs]) {
    if (!jobsById.has(job.id)) {
      jobsById.set(job.id, job);
    }
  }

  return Array.from(jobsById.values()).sort(sortJobsByPostedAt);
}

function sortJobsByPostedAt(firstJob: JobResult, secondJob: JobResult) {
  return (secondJob.postedAtTimestamp ?? 0) - (firstJob.postedAtTimestamp ?? 0);
}

function rehydrateJobs(jobs: JobResult[]) {
  return jobs.map((job) => ({
    ...job,
    location: job.location ?? "Unknown",
    linkedInUrl: job.linkedInUrl ?? getLinkedInJobUrlFromId(job.id),
    postedAt: formatPostedAt(job.postedAtTimestamp),
  }));
}

function isFreshJob(job: JobResult) {
  if (!job.postedAtTimestamp) {
    return false;
  }

  const elapsedMs = Date.now() - job.postedAtTimestamp;

  return elapsedMs >= 0 && elapsedMs <= dayMs;
}

function getLinkedInJobUrlFromId(id: string | undefined) {
  if (!id || id.startsWith("http")) {
    return undefined;
  }

  return `https://www.linkedin.com/jobs/view/${id}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Job search failed";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
