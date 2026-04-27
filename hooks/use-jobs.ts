"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  applyJob as applyJobData,
  enrichJobsWithExperience,
  hideJob as hideJobData,
  loadJobsData,
  unhideJob as unhideJobData,
} from "@/lib/jobs/api";
import {
  getExperienceFilters,
  getVisibleJobs,
} from "@/lib/jobs/filters";
import { rehydrateJobs } from "@/lib/jobs/transforms";
import type { JobResult, LoadJobsOptions, SavedJobs } from "@/lib/jobs/types";

const refreshIntervalMs = 2 * 60 * 60 * 1000;
const applyMoveDelayMs = 450;

export function useJobs() {
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<JobResult[]>([]);
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

  const setSavedJobs = useCallback((savedJobs: SavedJobs) => {
    setJobs(rehydrateJobs(savedJobs.jobs));
    setAppliedJobs(rehydrateJobs(savedJobs.appliedJobs));
    setHiddenJobs(rehydrateJobs(savedJobs.hiddenJobs));
    setLastUpdatedAt(new Date(savedJobs.fetchedAt));
  }, []);

  const enrichVisibleJobsWithExperience = useCallback(
    async (
      jobsToEnrich: JobResult[],
      hiddenJobsToKeep: JobResult[],
      options: {
        forceRelevanceCheck?: boolean;
      } = {},
    ) => {
      if (isExperienceLookupInProgress.current) {
        return 0;
      }

      isExperienceLookupInProgress.current = true;

      try {
        const result = await enrichJobsWithExperience({
          jobs: jobsToEnrich,
          hiddenJobs: hiddenJobsToKeep,
          forceRelevanceCheck: options.forceRelevanceCheck,
          onJobsUpdated: setJobs,
          onHiddenJobsUpdated: setHiddenJobs,
          onError: (error) => setErrorMessage(getErrorMessage(error)),
        });

        return result?.hiddenCount ?? 0;
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        isExperienceLookupInProgress.current = false;
      }

      return 0;
    },
    [],
  );

  const loadJobs = useCallback(
    async (options: LoadJobsOptions = {}) => {
      if (isSearchInProgress.current) {
        return;
      }

      isSearchInProgress.current = true;
      setIsLoading(true);
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
          void enrichVisibleJobsWithExperience(
            loadedJobs.jobs,
            loadedJobs.hiddenJobs,
          );
        }
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsFetchingJobs(false);
        isSearchInProgress.current = false;
        setIsLoading(false);
      }
    },
    [enrichVisibleJobsWithExperience, setSavedJobs],
  );

  const hideJob = useCallback(
    (jobToHide: JobResult) => {
      const nextSavedJobs = hideJobData({
        jobToHide,
        jobs,
        appliedJobs,
        hiddenJobs,
        onError: (error) => setErrorMessage(getErrorMessage(error)),
      });

      setJobs(rehydrateJobs(nextSavedJobs.jobs));
      setAppliedJobs(rehydrateJobs(nextSavedJobs.appliedJobs));
      setHiddenJobs(rehydrateJobs(nextSavedJobs.hiddenJobs));
    },
    [appliedJobs, hiddenJobs, jobs],
  );

  const applyJob = useCallback(
    (jobToApply: JobResult) => {
      setJobs((currentJobs) =>
        rehydrateJobs(
          currentJobs.map((job) =>
            job.id === jobToApply.id ? { ...job, applied: true } : job,
          ),
        ),
      );

      window.setTimeout(() => {
        const nextSavedJobs = applyJobData({
          jobToApply: { ...jobToApply, applied: true },
          jobs,
          appliedJobs,
          onError: (error) => setErrorMessage(getErrorMessage(error)),
        });

        setJobs(rehydrateJobs(nextSavedJobs.jobs));
        setAppliedJobs(rehydrateJobs(nextSavedJobs.appliedJobs));
      }, applyMoveDelayMs);
    },
    [appliedJobs, jobs],
  );

  const unhideJob = useCallback(
    (jobToUnhide: JobResult) => {
      const nextSavedJobs = unhideJobData({
        jobToUnhide,
        jobs,
        hiddenJobs,
        onError: (error) => setErrorMessage(getErrorMessage(error)),
      });

      setJobs(rehydrateJobs(nextSavedJobs.jobs));
      setHiddenJobs(rehydrateJobs(nextSavedJobs.hiddenJobs));
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
    errorMessage,
    lastUpdatedAt,
    loadJobs,
    hideJob,
    applyJob,
    unhideJob,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Job search failed";
}
