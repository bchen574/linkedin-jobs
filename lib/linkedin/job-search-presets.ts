import type { JobSearchParams } from "@/lib/linkedin/types";

const canadaLocation = "Canada";
const canadaGeoId = "101174742";

export const wideNetJobSearchPresets: JobSearchParams[] = [
  {
    keywords: ["UX Design"],
    location: canadaLocation,
    geoId: canadaGeoId,
    postedWithin: "month",
    sortBy: "DD",
    page: 0,
  },
  {
    keywords: ["Product Design"],
    location: canadaLocation,
    geoId: canadaGeoId,
    postedWithin: "month",
    sortBy: "DD",
    page: 0,
  },
  {
    keywords: ["UX/UI"],
    location: canadaLocation,
    geoId: canadaGeoId,
    postedWithin: "month",
    sortBy: "DD",
    page: 0,
  },
];
