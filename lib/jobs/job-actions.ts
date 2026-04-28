import { saveJobsToSupabase } from "@/lib/api/save-jobs-to-supabase";
import { mergeJobs } from "@/lib/jobs/transforms";
import type { JobResult } from "@/lib/jobs/types";

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

export function unhideJob({
  jobToUnhide,
  jobs,
  hiddenJobs,
  onError,
}: {
  jobToUnhide: JobResult;
  jobs: JobResult[];
  hiddenJobs: JobResult[];
  onError: (error: unknown) => void;
}) {
  const nextHiddenJobs = hiddenJobs.filter((job) => job.id !== jobToUnhide.id);
  const nextJob = { ...jobToUnhide, hiddenAt: undefined, applied: false };
  const nextJobs = mergeJobs([nextJob], jobs);

  void saveJobsToSupabase({
    jobs: [nextJob],
    appliedJobs: [],
    hiddenJobs: [],
  }).catch(onError);

  return {
    jobs: nextJobs,
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
