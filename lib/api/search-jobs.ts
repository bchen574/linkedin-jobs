import type { JobSearchParams, PostedWithin } from "@/lib/linkedin/types";
import { buildLinkedInJobUrl } from "@/lib/linkedin-job-search-url";
import { wideNetJobSearchPresets } from "@/lib/linkedin/job-search-presets";

export type SearchJobsInput = JobSearchParams & {
  count?: number;
  scrapeCompany?: boolean;
};

export type SearchPresetJobsInput = {
  count?: number;
  postedWithin?: PostedWithin;
  scrapeCompany?: boolean;
};

type SearchJobUrlsInput = SearchPresetJobsInput & {
  urls: string[];
};

export async function searchJobs(input: SearchJobsInput) {
  return postJobSearch(input);
}

export async function searchWideNetJobs(input: SearchPresetJobsInput = {}) {
  const { postedWithin, ...actorInput } = input;

  return postJobSearch({
    ...actorInput,
    urls: wideNetJobSearchPresets.map((preset) =>
      buildLinkedInJobUrl({
        ...preset,
        postedWithin: postedWithin ?? preset.postedWithin,
      }),
    ),
  });
}

async function postJobSearch(input: SearchJobsInput | SearchJobUrlsInput) {
  const response = await fetch("/api/job-search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await getSearchJobsErrorMessage(response));
  }

  return response.json();
}

async function getSearchJobsErrorMessage(response: Response) {
  const fallbackMessage = `Job search failed with status ${response.status}`;

  try {
    const body = await response.json();

    return typeof body.error === "string" ? body.error : fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}
