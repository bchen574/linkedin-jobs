import type { PostedWithin } from "@/lib/linkedin/types";

// A normalized job listing used by the app after fetching from LinkedIn.
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
  applied?: boolean;
};

// The persisted job cache split into visible, applied, and hidden jobs.
export type SavedJobs = {
  fetchedAt: number;
  jobs: JobResult[];
  appliedJobs: JobResult[];
  hiddenJobs: JobResult[];
};

// Options that control how jobs are loaded, refreshed, and displayed.
export type LoadJobsOptions = {
  force?: boolean;
  postedWithin?: PostedWithin;
  replaceVisible?: boolean;
};

// Loaded job data plus metadata about whether experience enrichment is needed.
export type LoadedJobs = SavedJobs & {
  shouldEnrichExperience: boolean;
};
