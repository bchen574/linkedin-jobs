import type {
  ExperienceLevel,
  JobSearchParams,
  PostedWithin,
} from "@/lib/linkedin/types";

const timeMap: Record<PostedWithin, string> = {
  day: "r86400",
  week: "r604800",
  month: "r2592000",
};

const experienceMap: Record<ExperienceLevel, string> = {
  internship: "1",
  entry: "2",
  associate: "3",
  midSenior: "4",
  director: "5",
  executive: "6",
};

export function buildLinkedInJobUrl(params: JobSearchParams) {
  const url = new URL("/jobs/search", "https://www.linkedin.com");

  add(url, "keywords", params.keywords?.join(" "));
  add(url, "location", params.location);
  add(url, "geoId", params.geoId);

  if (params.postedWithin) {
    url.searchParams.set("f_TPR", timeMap[params.postedWithin]);
  }

  if (params.experienceLevel) {
    url.searchParams.set("f_E", experienceMap[params.experienceLevel]);
  }

  add(url, "sortBy", params.sortBy);

  const page = params.page ?? 0;
  url.searchParams.set("start", String(page * 25));

  return url.toString();
}

function add(url: URL, key: string, value?: string) {
  const normalizedValue = value?.trim();

  if (normalizedValue) {
    url.searchParams.set(key, normalizedValue);
  }
}
