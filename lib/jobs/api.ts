import { getJobExperience } from "@/lib/api/get-job-experience";
import { getJobsFromSupabase } from "@/lib/api/get-jobs-from-supabase";
import { saveJobsToSupabase } from "@/lib/api/save-jobs-to-supabase";
import { searchWideNetJobs } from "@/lib/api/search-jobs";
import {
  mergeJobs,
  normalizeJobs,
  pruneOldJobs,
  rehydrateJobs,
} from "@/lib/jobs/transforms";
import type {
  JobResult,
  LoadedJobs,
  LoadJobsOptions,
  SavedJobs,
} from "@/lib/jobs/types";
import type { PostedWithin } from "@/lib/linkedin/types";

const refreshIntervalMs = 2 * 60 * 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;
const weekMs = 7 * dayMs;
const jobsFetchLimit = 150;

export async function loadJobsData({
  options,
  onSavedJobs,
  onFetchStart,
  onError,
}: {
  options: LoadJobsOptions;
  onSavedJobs: (savedJobs: SavedJobs) => void;
  onFetchStart: () => void;
  onError: (error: unknown) => void;
}): Promise<LoadedJobs | undefined> {
  const savedJobs = await readSavedJobs();

  if (savedJobs) {
    onSavedJobs(savedJobs);
  }

  if (savedJobs && !options.force && !isSavedJobsStale(savedJobs)) {
    return {
      ...savedJobs,
      shouldEnrichExperience: false,
    };
  }

  onFetchStart();

  const results = await searchWideNetJobs({
    count: jobsFetchLimit,
    postedWithin: options.postedWithin ?? getPostedWithinForSavedJobs(savedJobs),
  });
  const fetchedAt = Date.now();
  const hiddenJobIds = new Set(savedJobs?.hiddenJobs.map((job) => job.id));
  const appliedJobIds = new Set(savedJobs?.appliedJobs.map((job) => job.id));
  const jobs = mergeJobs(
    normalizeJobs(results),
    options.replaceVisible ? [] : (savedJobs?.jobs ?? []),
  ).filter((job) => !hiddenJobIds.has(job.id) && !appliedJobIds.has(job.id));
  const appliedJobs = savedJobs?.appliedJobs ?? [];
  const hiddenJobs = savedJobs?.hiddenJobs ?? [];

  void saveJobsToSupabase({
    jobs,
    appliedJobs,
    hiddenJobs,
    replaceVisible: options.replaceVisible,
  }).catch(onError);

  return {
    fetchedAt,
    jobs,
    appliedJobs,
    hiddenJobs,
    shouldEnrichExperience: true,
  };
}

export async function enrichJobsWithExperience({
  jobs,
  onJobsUpdated,
  onError,
}: {
  jobs: JobResult[];
  onJobsUpdated: (jobs: JobResult[]) => void;
  onError: (error: unknown) => void;
}) {
  const jobsMissingExperience = jobs.filter((job) => {
    return job.descriptionText && !job.yearsOfExperience;
  });

  if (!jobsMissingExperience.length) {
    return;
  }

  let nextJobs = jobs;

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

    onJobsUpdated(rehydrateJobs(nextJobs));

    const updatedJob = nextJobs.find((currentJob) => {
      return currentJob.id === job.id;
    });

    if (updatedJob) {
      void saveJobsToSupabase({
        jobs: [updatedJob],
        appliedJobs: [],
        hiddenJobs: [],
      }).catch(onError);
    }
  }
}

export function hideJob({
  jobToHide,
  jobs,
  appliedJobs,
  hiddenJobs,
  onError,
}: {
  jobToHide: JobResult;
  jobs: JobResult[];
  appliedJobs: JobResult[];
  hiddenJobs: JobResult[];
  onError: (error: unknown) => void;
}) {
  const nextJobs = jobs.filter((job) => job.id !== jobToHide.id);
  const nextAppliedJobs = appliedJobs.filter((job) => job.id !== jobToHide.id);
  const nextHiddenJob = { ...jobToHide, hiddenAt: Date.now() };
  const nextHiddenJobs = mergeJobs([nextHiddenJob], hiddenJobs);

  void saveJobsToSupabase({
    jobs: [],
    appliedJobs: [],
    hiddenJobs: [nextHiddenJob],
  }).catch(onError);

  return {
    jobs: nextJobs,
    appliedJobs: nextAppliedJobs,
    hiddenJobs: nextHiddenJobs,
  };
}

export function applyJob({
  jobToApply,
  jobs,
  appliedJobs,
  onError,
}: {
  jobToApply: JobResult;
  jobs: JobResult[];
  appliedJobs: JobResult[];
  onError: (error: unknown) => void;
}) {
  const nextJobs = jobs.filter((job) => job.id !== jobToApply.id);
  const nextAppliedJob = { ...jobToApply, applied: true };
  const nextAppliedJobs = mergeJobs([nextAppliedJob], appliedJobs);

  void saveJobsToSupabase({
    jobs: [],
    appliedJobs: [nextAppliedJob],
    hiddenJobs: [],
  }).catch(onError);

  return {
    jobs: nextJobs,
    appliedJobs: nextAppliedJobs,
  };
}

async function readSavedJobs(): Promise<SavedJobs | undefined> {
  const savedJobs = await getJobsFromSupabase();
  const jobs = pruneOldJobs(normalizeJobs(savedJobs.jobs));
  const appliedJobs = normalizeJobs(savedJobs.appliedJobs);
  const hiddenJobs = pruneOldJobs(normalizeJobs(savedJobs.hiddenJobs));

  if (!jobs.length && !appliedJobs.length && !hiddenJobs.length) {
    return undefined;
  }

  return {
    fetchedAt: savedJobs.fetchedAt,
    jobs,
    appliedJobs,
    hiddenJobs,
  };
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
