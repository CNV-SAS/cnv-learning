export {
  getBadge,
  ALL_BADGES,
  type Badge,
  type BadgeId,
  type BadgeIconName,
} from "./badges";
export {
  calculateProgress,
  type ProgressSummary,
} from "./calculate-progress";
export {
  calculateWeightedCourseProgress,
  type ModuleProgressInput,
} from "./calculate-weighted-progress";
export { buildProgressLabel } from "./build-progress-label";
export {
  computeRankEarnedDatesFromTimeline,
  type TimelineEvent,
  type RankEarnedDatesResult,
} from "./compute-rank-earned-dates";
export { pickFirstUncompleted } from "./pick-first-uncompleted";
