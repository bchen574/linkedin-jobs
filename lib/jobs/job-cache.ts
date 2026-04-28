import { getJobsFromSupabase } from "@/lib/api/get-jobs-from-supabase";
import { refreshIntervalMs, dayMs, weekMs } from "@/lib/jobs/job-constants";
import { normalizeJobs, pruneOldJobs } from "@/lib/jobs/transforms";
import type { SavedJobs } from "@/lib/jobs/types";
import type { PostedWithin } from "@/lib/linkedin/types";

export async function readSavedJobs(): Promise<SavedJobs | undefined> {
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

export function isSavedJobsStale(savedJobs: SavedJobs) {
  return Date.now() - savedJobs.fetchedAt >= refreshIntervalMs;
}

export function getPostedWithinForSavedJobs(
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
