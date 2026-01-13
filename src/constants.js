const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const rawLimit = import.meta.env.VITE_LIMIT ?? import.meta.env.LIMIT;
const parsedLimit = Number.parseInt(rawLimit, 10);
const MAX_FILES =
  Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 5;
const rawRecommendedThreshold =
  import.meta.env.VITE_RECOMMENDED_THRESHOLD ??
  import.meta.env.RECOMMENDED_THRESHOLD ??
  "68";
const parsedRecommendedThreshold = Number.parseInt(rawRecommendedThreshold, 10);
const RECOMMENDED_THRESHOLD = Number.isFinite(parsedRecommendedThreshold)
  ? Math.min(Math.max(parsedRecommendedThreshold, 0), 100)
  : 68;
const PEOPLE_LABEL = "people";

export {
  API_URL,
  MAX_FILES,
  PEOPLE_LABEL,
  RECOMMENDED_THRESHOLD,
  parsedLimit,
};
