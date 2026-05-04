import { saveJobsToSupabase } from "@/lib/api/save-jobs-to-supabase";
import {
  beginJobFetch,
  failJobFetch,
  finishJobFetch,
} from "@/lib/api/job-fetch-lock";
import { searchWideNetJobs } from "@/lib/api/search-jobs";
import { jobsFetchLimit } from "@/lib/jobs/job-constants";
import {
  getPostedWithinForSavedJobs,
  isSavedJobsStale,
  readSavedJobs,
} from "@/lib/jobs/job-cache";
import { mergeJobs, normalizeJobs } from "@/lib/jobs/transforms";
import type {
  JobResult,
  LoadedJobs,
  LoadJobsOptions,
  SavedJobs,
} from "@/lib/jobs/types";

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

  if (savedJobs && shouldUseCache(savedJobs, options)) {
    return {
      ...savedJobs,
      shouldEnrichExperience: hasJobsToEnrich(savedJobs.jobs),
    };
  }

  const fetchLock = await beginJobFetch({ force: options.force });

  if (!fetchLock.started) {
    return savedJobs
      ? {
          ...savedJobs,
          fetchedAt: fetchLock.fetchedAt ?? savedJobs.fetchedAt,
          shouldEnrichExperience: false,
        }
      : undefined;
  }

  onFetchStart();

  try {
    const results = await searchWideNetJobs({
      count: jobsFetchLimit,
      postedWithin:
        options.postedWithin ?? getPostedWithinForSavedJobs(savedJobs),
    });

    const fetchedAt = Date.now();
    const fetchedJobs = normalizeJobs(results);
    const savedVisibleJobs = options.replaceVisible
      ? []
      : (savedJobs?.jobs ?? []);
    const mergedJobs = mergeJobs(fetchedJobs, savedVisibleJobs);
    const jobs = filterUnavailableJobs(mergedJobs, savedJobs);
    const appliedJobs = savedJobs?.appliedJobs ?? [];
    const hiddenJobs = savedJobs?.hiddenJobs ?? [];

    await saveJobsToSupabase({
      jobs,
      appliedJobs,
      hiddenJobs,
      replaceVisible: options.replaceVisible,
    });
    await finishJobFetch();

    return {
      fetchedAt,
      jobs,
      appliedJobs,
      hiddenJobs,
      shouldEnrichExperience: true,
    };
  } catch (error) {
    await failJobFetch().catch(onError);
    throw error;
  }
}

function shouldUseCache(savedJobs: SavedJobs, options: LoadJobsOptions) {
  if (options.force) {
    return false;
  }

  return !isSavedJobsStale(savedJobs);
}

function hasJobsToEnrich(jobs: JobResult[]) {
  return jobs.some((job) => !job.yearsOfExperience && job.descriptionText);
}

function filterUnavailableJobs(
  jobs: JobResult[],
  savedJobs: SavedJobs | undefined,
) {
  const hiddenJobIds = new Set(savedJobs?.hiddenJobs.map((job) => job.id));
  const appliedJobIds = new Set(savedJobs?.appliedJobs.map((job) => job.id));

  return jobs.filter((job) => {
    return !hiddenJobIds.has(job.id) && !appliedJobIds.has(job.id);
  });
}
