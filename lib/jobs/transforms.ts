import type { JobResult } from "@/lib/jobs/types";

const dayMs = 24 * 60 * 60 * 1000;
const monthMs = 30 * dayMs;

export function normalizeJobs(results: unknown) {
  if (!Array.isArray(results)) {
    return [];
  }

  return results.map((result, index) => normalizeJob(result, index));
}

export function normalizeJob(result: unknown, index: number): JobResult {
  const job = isRecord(result) ? result : {};
  const title = getFirstString(job, ["title", "jobTitle", "position"]);
  const company = getFirstString(job, [
    "companyName",
    "company",
    "companyTitle",
  ]);
  const location = getLocationLabel(
    getFirstString(job, ["location", "formattedLocation"]),
  );
  const postedAtTimestamp = getPostedAtTimestamp(job);
  const linkedInJobId = getFirstString(job, ["id", "jobId", "linkedinJobId"]);
  const linkedInUrl = getFirstString(job, [
    "linkedInUrl",
    "linkedinUrl",
    "link",
    "jobUrl",
    "url",
  ]);
  const descriptionText = getFirstString(job, [
    "descriptionText",
    "description",
    "jobDescription",
  ]);
  const applyUrl = getFirstString(job, [
    "applyUrl",
    "applicationUrl",
    "jobUrl",
    "url",
    "link",
  ]);
  const yearsOfExperience = getFirstString(job, [
    "yearsOfExperience",
    "years_of_experience",
  ]);
  const hiddenAt = getFirstNumber(job, ["hiddenAt", "hidden_at"]);
  const id = linkedInJobId ?? applyUrl;

  return {
    id: id ?? `job-${index}`,
    title: title ?? "Untitled role",
    postedAt: formatPostedAt(postedAtTimestamp),
    postedAtTimestamp,
    company: company ?? "Unknown company",
    location,
    descriptionText,
    yearsOfExperience,
    linkedInUrl: linkedInUrl ?? getLinkedInJobUrlFromId(linkedInJobId),
    applyUrl,
    hiddenAt,
  };
}

export function mergeJobs(newJobs: JobResult[], savedJobs: JobResult[]) {
  const jobsById = new Map<string, JobResult>();

  for (const job of [...newJobs, ...savedJobs]) {
    if (!jobsById.has(job.id)) {
      jobsById.set(job.id, job);
    }
  }

  return Array.from(jobsById.values()).sort(sortJobsByPostedAt);
}

export function pruneOldJobs(jobsToPrune: JobResult[]) {
  const oldestAllowedTimestamp = Date.now() - monthMs;

  return jobsToPrune.filter((job) => {
    return (
      !job.postedAtTimestamp || job.postedAtTimestamp >= oldestAllowedTimestamp
    );
  });
}

export function rehydrateJobs(jobs: JobResult[]) {
  return jobs.map((job) => ({
    ...job,
    location: job.location ?? "Unknown",
    linkedInUrl: job.linkedInUrl ?? getLinkedInJobUrlFromId(job.id),
    postedAt: formatPostedAt(job.postedAtTimestamp),
  }));
}

export function formatPostedAt(timestamp: number | undefined) {
  if (!timestamp) {
    return "Unknown";
  }

  const elapsedMs = Date.now() - timestamp;

  if (elapsedMs < 0) {
    return "Unknown";
  }

  const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));

  if (elapsedHours < 1) {
    return "<1h";
  }

  if (elapsedHours < 24) {
    return `${elapsedHours}h`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);

  return `${elapsedDays}d`;
}

export function isFreshJob(job: JobResult) {
  if (!job.postedAtTimestamp) {
    return false;
  }

  const elapsedMs = Date.now() - job.postedAtTimestamp;

  return elapsedMs >= 0 && elapsedMs <= dayMs;
}

function getPostedAtTimestamp(job: Record<string, unknown>) {
  const postedAtTimestamp = getFirstNumber(job, ["postedAtTimestamp"]);
  const postedAt = getFirstString(job, [
    "postedAt",
    "postedDate",
    "postedTime",
    "timePosted",
    "listedAt",
  ]);

  return getTimestamp(postedAtTimestamp ?? postedAt);
}

function getFirstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function getLocationLabel(location: string | undefined) {
  if (!location) {
    return "Unknown";
  }

  const locationParts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (locationParts.length >= 2) {
    return `${locationParts[0]}, ${locationParts[1]}`;
  }

  return locationParts[0] ?? "Unknown";
}

function getFirstNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function getTimestamp(value: number | string | undefined) {
  if (!value) {
    return undefined;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? undefined : timestamp;
}

function sortJobsByPostedAt(firstJob: JobResult, secondJob: JobResult) {
  return (secondJob.postedAtTimestamp ?? 0) - (firstJob.postedAtTimestamp ?? 0);
}

function getLinkedInJobUrlFromId(id: string | undefined) {
  if (!id || id.startsWith("http")) {
    return undefined;
  }

  return `https://www.linkedin.com/jobs/view/${id}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
