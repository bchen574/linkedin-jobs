import type { PostedWithin } from "@/lib/linkedin/types";

export type JobResult = {
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

export type SavedJobs = {
  fetchedAt: number;
  jobs: JobResult[];
  hiddenJobs: JobResult[];
};

export type LoadJobsOptions = {
  force?: boolean;
  postedWithin?: PostedWithin;
  replaceVisible?: boolean;
};

export type LoadedJobs = SavedJobs & {
  shouldEnrichExperience: boolean;
};
