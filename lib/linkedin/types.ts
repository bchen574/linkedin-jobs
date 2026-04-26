export const postedWithinOptions = ["day", "week", "month"] as const;

export const experienceLevelOptions = [
  "internship",
  "entry",
  "associate",
  "midSenior",
  "director",
  "executive",
] as const;

export const sortByOptions = ["DD"] as const;

export type PostedWithin = (typeof postedWithinOptions)[number];

export type ExperienceLevel = (typeof experienceLevelOptions)[number];

export type LinkedInJobSortBy = (typeof sortByOptions)[number];

export type JobSearchParams = {
  keywords?: string[];
  location?: string;
  geoId?: string;
  postedWithin?: PostedWithin;
  experienceLevel?: ExperienceLevel;
  sortBy?: LinkedInJobSortBy;
  page?: number;
};
