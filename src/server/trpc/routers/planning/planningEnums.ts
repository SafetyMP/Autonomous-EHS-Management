import {
  objectiveStatusEnum,
  objectiveTypeEnum,
  riskAssessmentKindEnum,
  riskAssessmentStatusEnum,
  riskRatingEnum,
} from "@/server/db/schema";

export const riskRatings = riskRatingEnum.enumValues as [string, ...string[]];
export const riskAssessmentKinds = riskAssessmentKindEnum.enumValues as [string, ...string[]];
export const riskAssessmentStatuses = riskAssessmentStatusEnum.enumValues as [string, ...string[]];
export const objectiveTypes = objectiveTypeEnum.enumValues as [string, ...string[]];
export const objectiveStatuses = objectiveStatusEnum.enumValues as [string, ...string[]];
