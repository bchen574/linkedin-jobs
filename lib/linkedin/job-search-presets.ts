import type { JobSearchParams } from "@/lib/linkedin/types";

const canadaLocation = "Canada";
const canadaGeoId = "101174742";

export const wideNetJobSearchPresets: JobSearchParams[] = [
  {
    keywords: ["UX Designer"],
    location: canadaLocation,
    geoId: canadaGeoId,
    postedWithin: "month",
    sortBy: "DD",
    page: 0,
  },
  {
    keywords: ["Product Designer"],
    location: canadaLocation,
    geoId: canadaGeoId,
    postedWithin: "month",
    sortBy: "DD",
    page: 0,
  },
  {
    keywords: ["UX/UI Designer"],
    location: canadaLocation,
    geoId: canadaGeoId,
    postedWithin: "month",
    sortBy: "DD",
    page: 0,
  },
];
