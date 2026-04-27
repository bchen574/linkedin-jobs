import type { JobResult } from "@/lib/jobs/types";

const experienceFilterOrder = [
  "All",
  "0-1 years",
  "1-2 years",
  "2-3 years",
  "3-5 years",
  "5-7 years",
  "7-10 years",
  "10+ years",
  "Not specified",
  "Not checked",
];

export function getExperienceFilters(jobsToFilter: JobResult[]) {
  const filters = new Map<string, number>([["All", jobsToFilter.length]]);

  for (const job of jobsToFilter) {
    const label = getExperienceLabel(job);
    filters.set(label, (filters.get(label) ?? 0) + 1);
  }

  return Array.from(filters, ([label, count]) => ({ label, count })).sort(
    sortExperienceFilters,
  );
}

export function getVisibleJobs(
  jobsToFilter: JobResult[],
  selectedExperience: string,
) {
  if (selectedExperience === "All") {
    return jobsToFilter;
  }

  return jobsToFilter.filter((job) => {
    return getExperienceLabel(job) === selectedExperience;
  });
}

export function getJobExperienceText(job: JobResult) {
  return (
    job.yearsOfExperience ??
    (job.descriptionText ? "Checking..." : "Not checked")
  );
}

function getExperienceLabel(job: JobResult) {
  return job.yearsOfExperience ?? "Not checked";
}

function sortExperienceFilters(
  firstFilter: { label: string },
  secondFilter: { label: string },
) {
  return (
    getExperienceFilterIndex(firstFilter.label) -
    getExperienceFilterIndex(secondFilter.label)
  );
}

function getExperienceFilterIndex(label: string) {
  const index = experienceFilterOrder.indexOf(label);

  return index === -1 ? experienceFilterOrder.length : index;
}
