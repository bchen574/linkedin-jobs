import { buildLinkedInJobUrl } from "@/lib/linkedin-job-search-url";
import {
  experienceLevelOptions,
  type ExperienceLevel,
  type JobSearchParams,
  type LinkedInJobSortBy,
  postedWithinOptions,
  type PostedWithin,
  sortByOptions,
} from "@/lib/linkedin/types";

type JobSearchRequest = Record<string, unknown>;

const actorId = "curious_coder~linkedin-jobs-scraper";
const postedWithinValues = new Set<PostedWithin>(postedWithinOptions);
const experienceLevelValues = new Set<ExperienceLevel>(experienceLevelOptions);
const sortByValues = new Set<LinkedInJobSortBy>(sortByOptions);

export async function POST(request: Request) {
  if (!process.env.APIFY_API_TOKEN) {
    return Response.json({ error: "API token is not set" }, { status: 500 });
  }

  try {
    const input = await request.json();

    if (!isJobSearchRequest(input)) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    const actorInput = createActorInput(input);

    if (!actorInput) {
      return Response.json(
        { error: "Search requires urls, keywords, or location" },
        { status: 400 },
      );
    }

    const items = await runLinkedInJobsScraper(actorInput);

    return Response.json(items, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("ERROR:", error.message);

      return Response.json(
        { error: getJobSearchErrorMessage(error.message) },
        { status: getJobSearchErrorStatus(error.message) },
      );
    } else {
      console.error("UNKNOWN ERROR:", error);
    }

    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

function getJobSearchErrorMessage(message: string) {
  if (message.includes("exceeded the timeout")) {
    return "LinkedIn search timed out after 5 minutes. Try a smaller search limit or refresh again.";
  }

  return message || "Something went wrong";
}

function getJobSearchErrorStatus(message: string) {
  return message.includes("exceeded the timeout") ? 504 : 500;
}

async function runLinkedInJobsScraper(input: JobSearchRequest) {
  const url = new URL(
    `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items`,
  );

  url.searchParams.set("token", process.env.APIFY_API_TOKEN ?? "");
  url.searchParams.set("format", "json");
  url.searchParams.set("clean", "true");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await getApifyErrorMessage(response));
  }

  return response.json();
}

async function getApifyErrorMessage(response: Response) {
  const fallbackMessage = `Apify request failed with status ${response.status}`;

  try {
    const body = await response.json();
    const message = body?.error?.message;

    return typeof message === "string" ? message : fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

function isJobSearchRequest(input: unknown): input is JobSearchRequest {
  return Boolean(input) && typeof input === "object" && !Array.isArray(input);
}

function createActorInput(input: JobSearchRequest) {
  if (hasLinkedInSearchUrls(input)) {
    return input;
  }

  const {
    keywords,
    location,
    geoId,
    postedWithin,
    experienceLevel,
    sortBy,
    page,
  } = getLinkedInSearchFields(input);

  if (!keywords?.length && !location) {
    return null;
  }

  return {
    ...removeLinkedInSearchFields(input),
    urls: [
      buildLinkedInJobUrl({
        keywords,
        location,
        geoId,
        postedWithin,
        experienceLevel,
        sortBy,
        page,
      }),
    ],
  };
}

function hasLinkedInSearchUrls(input: JobSearchRequest) {
  return (
    Array.isArray(input.urls) &&
    input.urls.length > 0 &&
    input.urls.every((url) => typeof url === "string" && url.trim())
  );
}

function getLinkedInSearchFields(input: JobSearchRequest): JobSearchParams {
  return {
    keywords: getKeywordValues(input.keywords),
    location: getStringValue(input.location),
    geoId: getStringValue(input.geoId),
    postedWithin: getPostedWithinValue(input.postedWithin),
    experienceLevel: getExperienceLevelValue(input.experienceLevel),
    sortBy: getSortByValue(input.sortBy),
    page: getNumberValue(input.page),
  };
}

function removeLinkedInSearchFields(input: JobSearchRequest) {
  const actorInput = { ...input };

  delete actorInput.keywords;
  delete actorInput.location;
  delete actorInput.geoId;
  delete actorInput.postedWithin;
  delete actorInput.experienceLevel;
  delete actorInput.sortBy;
  delete actorInput.page;

  return actorInput;
}

function getKeywordValues(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((keyword) => typeof keyword === "string");
  }

  if (typeof value === "string") {
    return [value];
  }

  return undefined;
}

function getStringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function getNumberValue(value: unknown) {
  return typeof value === "number" && Number.isInteger(value)
    ? value
    : undefined;
}

function getPostedWithinValue(value: unknown) {
  return typeof value === "string" &&
    postedWithinValues.has(value as PostedWithin)
    ? (value as PostedWithin)
    : undefined;
}

function getExperienceLevelValue(value: unknown) {
  return typeof value === "string" &&
    experienceLevelValues.has(value as ExperienceLevel)
    ? (value as ExperienceLevel)
    : undefined;
}

function getSortByValue(value: unknown) {
  return typeof value === "string" &&
    sortByValues.has(value as LinkedInJobSortBy)
    ? (value as LinkedInJobSortBy)
    : undefined;
}
