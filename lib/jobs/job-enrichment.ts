import { getJobExperience } from "@/lib/api/get-job-experience";
import { saveJobsToSupabase } from "@/lib/api/save-jobs-to-supabase";
import { mergeJobs, rehydrateJobs } from "@/lib/jobs/transforms";
import type { JobResult } from "@/lib/jobs/types";

export async function enrichJobsWithExperience({
  jobs,
  hiddenJobs,
  forceRelevanceCheck = false,
  onJobsUpdated,
  onHiddenJobsUpdated,
  onError,
}: {
  jobs: JobResult[];
  hiddenJobs: JobResult[];
  forceRelevanceCheck?: boolean;
  onJobsUpdated: (jobs: JobResult[]) => void;
  onHiddenJobsUpdated: (jobs: JobResult[]) => void;
  onError: (error: unknown) => void;
}) {
  const jobsToAnalyze = getJobsToAnalyze(jobs, forceRelevanceCheck);

  if (!jobsToAnalyze.length) {
    return { hiddenCount: 0 };
  }

  let nextJobs = jobs;
  let nextHiddenJobs = hiddenJobs;
  let hiddenCount = 0;

  for (const job of jobsToAnalyze) {
    const jobExperience = await getJobExperience({
      title: job.title,
      descriptionText: job.descriptionText,
    });
    const classification = classifyJob(jobExperience);

    if (!classification.isRelevant) {
      const nextHiddenJob = {
        ...job,
        hiddenAt: Date.now(),
        yearsOfExperience: classification.yearsOfExperience,
      };

      nextJobs = nextJobs.filter((currentJob) => currentJob.id !== job.id);
      nextHiddenJobs = mergeJobs([nextHiddenJob], nextHiddenJobs);
      hiddenCount += 1;

      onJobsUpdated(rehydrateJobs(nextJobs));
      onHiddenJobsUpdated(rehydrateJobs(nextHiddenJobs));

      void saveJobsToSupabase({
        jobs: [],
        appliedJobs: [],
        hiddenJobs: [nextHiddenJob],
      }).catch(onError);

      continue;
    }

    nextJobs = updateJobExperience(
      nextJobs,
      job.id,
      classification.yearsOfExperience,
    );

    onJobsUpdated(rehydrateJobs(nextJobs));

    const updatedJob = nextJobs.find((currentJob) => currentJob.id === job.id);

    if (updatedJob) {
      void saveJobsToSupabase({
        jobs: [updatedJob],
        appliedJobs: [],
        hiddenJobs: [],
      }).catch(onError);
    }
  }

  return { hiddenCount };
}

function getJobsToAnalyze(jobs: JobResult[], forceRelevanceCheck: boolean) {
  if (forceRelevanceCheck) {
    return jobs;
  }

  return jobs.filter((job) => !job.yearsOfExperience);
}

function classifyJob(jobExperience: {
  isUxRelated: boolean;
  yearsOfExperience?: string;
}) {
  return {
    isRelevant: jobExperience.isUxRelated,
    yearsOfExperience: jobExperience.yearsOfExperience,
  };
}

function updateJobExperience(
  jobs: JobResult[],
  jobId: string,
  yearsOfExperience: string | undefined,
) {
  return jobs.map((job) => {
    if (job.id !== jobId) {
      return job;
    }

    return { ...job, yearsOfExperience };
  });
}
