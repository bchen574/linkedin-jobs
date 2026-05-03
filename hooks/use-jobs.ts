"use client";

import { useEffect, useState } from "react";

import { analyzeJob } from "@/lib/api/job-analysis";
import { saveJobsToSupabase } from "@/lib/api/save-jobs-to-supabase";
import { enrichJobsWithExperience, loadJobsData } from "@/lib/jobs/api";
import { getExperienceFilters, getVisibleJobs } from "@/lib/jobs/filters";
import { rehydrateJobs } from "@/lib/jobs/transforms";
import type { JobResult, LoadJobsOptions, SavedJobs } from "@/lib/jobs/types";

export function useJobs() {
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingJobs, setIsFetchingJobs] = useState(false);
  const [isCleaningUpJobs, setIsCleaningUpJobs] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date>();
  const [selectedExperience, setSelectedExperience] = useState("All");

  const activeJobs = jobs.filter((job) => !job.hidden && !job.applied);
  const appliedJobs = jobs.filter((job) => job.applied);
  const hiddenJobs = jobs.filter((job) => job.hidden);
  const visibleJobs = getVisibleJobs(activeJobs, selectedExperience);
  const experienceFilters = getExperienceFilters(activeJobs);

  function setSavedJobs(savedJobs: SavedJobs) {
    setJobs(getJobsFromSavedJobs(savedJobs));
    setLastUpdatedAt(new Date(savedJobs.fetchedAt));
  }

  async function loadJobs(options: LoadJobsOptions = {}) {
    setIsLoading(true);
    setIsFetchingJobs(false);
    setErrorMessage(undefined);

    try {
      const loadedJobs = await loadJobsData({
        options,
        onSavedJobs: setSavedJobs,
        onFetchStart: () => setIsFetchingJobs(true),
        onError: (error) => setErrorMessage(getErrorMessage(error)),
      });

      if (!loadedJobs) {
        return;
      }

      setSavedJobs(loadedJobs);

      if (loadedJobs.shouldEnrichExperience) {
        void enrichJobsWithExperience({
          jobs: loadedJobs.jobs,
          hiddenJobs: loadedJobs.hiddenJobs,
          onJobsUpdated: (updatedJobs) =>
            setJobs((currentJobs) =>
              rehydrateJobs([
                ...updatedJobs,
                ...currentJobs.filter((job) => job.applied || job.hidden),
              ]),
            ),
          onHiddenJobsUpdated: (updatedHiddenJobs) =>
            setJobs((currentJobs) =>
              rehydrateJobs([
                ...currentJobs.filter((job) => !job.hidden),
                ...updatedHiddenJobs,
              ]),
            ),
          onError: (error) => setErrorMessage(getErrorMessage(error)),
        }).catch((error) => setErrorMessage(getErrorMessage(error)));
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsFetchingJobs(false);
      setIsLoading(false);
    }
  }

  async function applyJob(jobToApply: JobResult) {
    const appliedJob = { ...jobToApply, applied: true, hidden: false };

    setJobs((currentJobs) => updateJob(currentJobs, appliedJob));

    try {
      await saveJobsToSupabase({
        jobs: [],
        appliedJobs: [appliedJob],
        hiddenJobs: [],
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function hideJob(jobToHide: JobResult) {
    const hiddenJob = {
      ...jobToHide,
      applied: false,
      hidden: true,
      hiddenAt: Date.now(),
    };

    setJobs((currentJobs) => updateJob(currentJobs, hiddenJob));

    try {
      await saveJobsToSupabase({
        jobs: [],
        appliedJobs: [],
        hiddenJobs: [hiddenJob],
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function unhideJob(jobToUnhide: JobResult) {
    const unhiddenJob = {
      ...jobToUnhide,
      applied: false,
      hidden: false,
      hiddenAt: undefined,
    };

    setJobs((currentJobs) => updateJob(currentJobs, unhiddenJob));

    try {
      await saveJobsToSupabase({
        jobs: [unhiddenJob],
        appliedJobs: [],
        hiddenJobs: [],
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function cleanupJobs() {
    setIsCleaningUpJobs(true);
    setErrorMessage(undefined);

    try {
      const cleanupResult = await getCleanupResult(activeJobs);

      setJobs((currentJobs) =>
        rehydrateJobs(
          currentJobs.map((job) => cleanupResult.jobsById.get(job.id) ?? job),
        ),
      );

      await saveJobsToSupabase({
        jobs: cleanupResult.visibleJobsToSave,
        appliedJobs: [],
        hiddenJobs: cleanupResult.hiddenJobsToSave,
      });

      return {
        hiddenCount: cleanupResult.hiddenJobsToSave.length,
        experienceUpdatedCount: cleanupResult.experienceUpdatedCount,
      };
    } catch (error) {
      setErrorMessage(getErrorMessage(error));

      return {
        hiddenCount: 0,
        experienceUpdatedCount: 0,
      };
    } finally {
      setIsCleaningUpJobs(false);
    }
  }

  useEffect(() => {
    const initialLoadId = window.setTimeout(() => {
      void loadJobs();
    }, 0);

    return () => window.clearTimeout(initialLoadId);
    // The initial load should run once on mount; manual refresh uses loadJobs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    jobs,
    appliedJobs,
    hiddenJobs,
    visibleJobs,
    experienceFilters,
    selectedExperience,
    setSelectedExperience,
    isLoading,
    isFetchingJobs,
    isCleaningUpJobs,
    errorMessage,
    lastUpdatedAt,
    loadJobs,
    hideJob,
    applyJob,
    unhideJob,
    cleanupJobs,
  };
}

function getJobsFromSavedJobs(savedJobs: SavedJobs) {
  return rehydrateJobs([
    ...savedJobs.jobs.map((job) => ({
      ...job,
      applied: false,
      hidden: false,
    })),
    ...savedJobs.appliedJobs.map((job) => ({
      ...job,
      applied: true,
      hidden: false,
    })),
    ...savedJobs.hiddenJobs.map((job) => ({
      ...job,
      applied: false,
      hidden: true,
    })),
  ]);
}

function updateJob(jobs: JobResult[], updatedJob: JobResult) {
  return rehydrateJobs(
    jobs.map((job) => (job.id === updatedJob.id ? updatedJob : job)),
  );
}

async function getCleanupResult(jobs: JobResult[]) {
  const jobsById = new Map<string, JobResult>();
  const visibleJobsToSave: JobResult[] = [];
  const hiddenJobsToSave: JobResult[] = [];
  let experienceUpdatedCount = 0;

  for (const job of jobs) {
    const analysis = await analyzeJob({
      title: job.title,
      descriptionText: job.descriptionText,
    });

    if (!analysis.isUxRelated) {
      const hiddenJob = {
        ...job,
        applied: false,
        hidden: true,
        hiddenAt: Date.now(),
        yearsOfExperience: analysis.yearsOfExperience,
      };

      jobsById.set(job.id, hiddenJob);
      hiddenJobsToSave.push(hiddenJob);
      continue;
    }

    const updatedJob = {
      ...job,
      applied: false,
      hidden: false,
      yearsOfExperience: analysis.yearsOfExperience,
    };

    jobsById.set(job.id, updatedJob);

    if (job.yearsOfExperience !== analysis.yearsOfExperience) {
      experienceUpdatedCount += 1;
      visibleJobsToSave.push(updatedJob);
    }
  }

  return {
    jobsById,
    visibleJobsToSave,
    hiddenJobsToSave,
    experienceUpdatedCount,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Job search failed";
}
