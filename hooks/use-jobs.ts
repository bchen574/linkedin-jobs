"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import { analyzeJob } from "@/lib/api/job-analysis";
import { deleteHiddenJobsFromSupabase } from "@/lib/api/delete-hidden-jobs";
import { saveJobsToSupabase } from "@/lib/api/save-jobs-to-supabase";
import { enrichJobsWithExperience, loadJobsData } from "@/lib/jobs/api";
import { getExperienceFilters, getVisibleJobs } from "@/lib/jobs/filters";
import { refreshIntervalMs } from "@/lib/jobs/job-constants";
import { rehydrateJobs } from "@/lib/jobs/transforms";
import type {
  ApplicationStatus,
  JobResult,
  LoadJobsOptions,
  SavedJobs,
} from "@/lib/jobs/types";

export function useJobs() {
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingJobs, setIsFetchingJobs] = useState(false);
  const [isCleaningUpJobs, setIsCleaningUpJobs] = useState(false);
  const [isDeletingHiddenJobs, setIsDeletingHiddenJobs] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date>();
  const [selectedExperience, setSelectedExperience] = useState("All");
  const hiddenJobsDeletedRef = useRef(false);

  const activeJobs = jobs.filter((job) => !job.hidden && !job.applied);
  const appliedJobs = sortAppliedJobs(jobs.filter((job) => job.applied));
  const hiddenJobs = jobs.filter((job) => job.hidden);
  const visibleJobs = getVisibleJobs(activeJobs, selectedExperience);
  const experienceFilters = getExperienceFilters(activeJobs);

  function setSavedJobs(savedJobs: SavedJobs) {
    setJobs(getJobsFromSavedJobs(savedJobs));

    if (savedJobs.fetchedAt > 0) {
      setLastUpdatedAt(new Date(savedJobs.fetchedAt));
      return;
    }

    setLastUpdatedAt(undefined);
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
              combineJobs([
                ...updatedJobs,
                ...currentJobs.filter((job) => job.applied || job.hidden),
                ...loadedJobs.appliedJobs.map((job) => ({
                  ...job,
                  applied: true,
                  hidden: false,
                })),
                ...getLoadedHiddenJobs(loadedJobs.hiddenJobs),
              ]),
            ),
          onHiddenJobsUpdated: (updatedHiddenJobs) =>
            setJobs((currentJobs) =>
              combineJobs([
                ...currentJobs.filter((job) => !job.hidden),
                ...updatedHiddenJobs,
                ...loadedJobs.appliedJobs.map((job) => ({
                  ...job,
                  applied: true,
                  hidden: false,
                })),
                ...getLoadedHiddenJobs(loadedJobs.hiddenJobs),
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

  async function unapplyJob(jobToUnapply: JobResult) {
    const unappliedJob = {
      ...jobToUnapply,
      applied: false,
      hidden: false,
    };

    setJobs((currentJobs) => updateJob(currentJobs, unappliedJob));

    try {
      await saveJobsToSupabase({
        jobs: [unappliedJob],
        appliedJobs: [],
        hiddenJobs: [],
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function updateApplicationStatus(
    jobToUpdate: JobResult,
    applicationStatus: ApplicationStatus,
  ) {
    const updatedJob = {
      ...jobToUpdate,
      applied: true,
      hidden: false,
      applicationStatus,
    };

    setJobs((currentJobs) => updateJob(currentJobs, updatedJob));

    try {
      await saveJobsToSupabase({
        jobs: [],
        appliedJobs: [updatedJob],
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

  async function deleteHiddenJobs() {
    hiddenJobsDeletedRef.current = true;
    setIsDeletingHiddenJobs(true);
    setErrorMessage(undefined);
    setJobs((currentJobs) => currentJobs.filter((job) => !job.hidden));

    try {
      await deleteHiddenJobsFromSupabase();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      void loadJobs();
    } finally {
      setIsDeletingHiddenJobs(false);
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

  const refreshJobsIfStale = useEffectEvent(() => {
    if (isLoading || isFetchingJobs || !lastUpdatedAt) {
      return;
    }

    const cacheAgeMs = Date.now() - lastUpdatedAt.getTime();

    if (cacheAgeMs < refreshIntervalMs) {
      return;
    }

    void loadJobs({ force: true });
  });

  useEffect(() => {
    if (!lastUpdatedAt) {
      return;
    }

    const cacheAgeMs = Date.now() - lastUpdatedAt.getTime();
    const msUntilRefresh = Math.max(refreshIntervalMs - cacheAgeMs, 0);
    const refreshTimerId = window.setTimeout(() => {
      refreshJobsIfStale();
    }, msUntilRefresh);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshJobsIfStale();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(refreshTimerId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [lastUpdatedAt, refreshJobsIfStale]);

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
    isDeletingHiddenJobs,
    errorMessage,
    lastUpdatedAt,
    loadJobs,
    hideJob,
    applyJob,
    unapplyJob,
    updateApplicationStatus,
    unhideJob,
    deleteHiddenJobs,
    cleanupJobs,
  };

  function getLoadedHiddenJobs(loadedHiddenJobs: JobResult[]) {
    if (hiddenJobsDeletedRef.current) {
      return [];
    }

    return loadedHiddenJobs.map((job) => ({
      ...job,
      applied: false,
      hidden: true,
    }));
  }
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

function combineJobs(jobs: JobResult[]) {
  const jobsById = new Map<string, JobResult>();

  for (const job of jobs) {
    if (!jobsById.has(job.id)) {
      jobsById.set(job.id, job);
    }
  }

  return rehydrateJobs(Array.from(jobsById.values()));
}

function sortAppliedJobs(jobs: JobResult[]) {
  return [...jobs].sort((firstJob, secondJob) => {
    const statusDifference =
      getApplicationStatusSortOrder(firstJob.applicationStatus) -
      getApplicationStatusSortOrder(secondJob.applicationStatus);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    return (secondJob.postedAtTimestamp ?? 0) - (firstJob.postedAtTimestamp ?? 0);
  });
}

function getApplicationStatusSortOrder(status: ApplicationStatus | undefined) {
  if (status === "Screening") {
    return 0;
  }

  if (status === "Interview-1") {
    return 1;
  }

  if (status === "Interview-2") {
    return 2;
  }

  if (status === "Interview-3") {
    return 3;
  }

  if (status === "Offer") {
    return 4;
  }

  if (status === "Rejected") {
    return 5;
  }

  return 6;
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
