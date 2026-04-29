// Allowed time ranges for filtering LinkedIn jobs by when they were posted.
export const postedWithinOptions = ["day", "week", "month"] as const;

// Allowed LinkedIn experience levels for job search filters.
export const experienceLevelOptions = [
  "internship",
  "entry",
  "associate",
  "midSenior",
  "director",
  "executive",
] as const;

// Allowed LinkedIn sort options for job search results.
export const sortByOptions = ["DD"] as const;

// A selected posted-within value from the supported LinkedIn filter options.
export type PostedWithin = (typeof postedWithinOptions)[number];

// A selected experience level from the supported LinkedIn filter options.
export type ExperienceLevel = (typeof experienceLevelOptions)[number];

// A selected LinkedIn job sort option.
export type LinkedInJobSortBy = (typeof sortByOptions)[number];

// Parameters used to build a LinkedIn job search request.
export type JobSearchParams = {
  keywords?: string[];
  location?: string;
  geoId?: string;
  postedWithin?: PostedWithin;
  experienceLevel?: ExperienceLevel;
  sortBy?: LinkedInJobSortBy;
  page?: number;
};
