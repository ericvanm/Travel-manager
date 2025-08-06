import {
  LocalHospital,
  Visibility,
  VisibilityOff,
  MoodBad,
  Sick,
  Vaccines,
  Attribution,
  TransferWithinAStation,
} from "@mui/icons-material";
import z from "zod";
import { HealthCheckRating } from "./types";

export const assertNever = (value: never): never => {
  throw new Error(
    `Unhandled discriminated union member: ${JSON.stringify(value)}`
  );
};

export const parseHealthCheckRating = (
  healthCheckRating: unknown
): HealthCheckRating => {
  console.log("Parse healthCheckRating", healthCheckRating);

  if (typeof healthCheckRating === "number") {
    if (!Object.values(HealthCheckRating).includes(healthCheckRating)) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: "Invalid numeric healthCheckRating",
          path: ["healthCheckRating"],
        },
      ]);
    }
    return healthCheckRating as HealthCheckRating;
  }
  // process the case : parameter is a string : either "0", "1",... or "Healthy", ....

  if (typeof healthCheckRating === "string") {
    // Try as a key
    if (healthCheckRating in HealthCheckRating) {
      const healthCheckRatingValue =
        HealthCheckRating[healthCheckRating as keyof typeof HealthCheckRating];
      if (typeof healthCheckRatingValue === "number") {
        return healthCheckRatingValue as HealthCheckRating;
      }
    }

    // try as a number in a string format
    const healthCheckRatingValue = Number(healthCheckRating);
    if (
      !isNaN(healthCheckRatingValue) &&
      Object.values(HealthCheckRating).includes(healthCheckRatingValue)
    ) {
      return healthCheckRatingValue as HealthCheckRating;
    }
  }

  // invalid value
  throw new z.ZodError([
    {
      code: z.ZodIssueCode.custom,
      message: "Invalid healthCheckRating",
      path: ["healthCheckRating"],
    },
  ]);
};

// Define a type for the diagnosis Code prefix :
type DiagnosisPrefix = "M" | "S" | "J" | "H" | "Z" | "L" | "N" | "F";

export const getIconForDiagnosisCode = (
  code: string
): React.ElementType | null => {
  const firstLetter = code.charAt(0) as DiagnosisPrefix;

  if (code.length < 1) return null;

  switch (firstLetter) {
    case "M": // skeleton issues
      return TransferWithinAStation;
    case "S": // Bones broken
      return Sick;
    case "J": // deseases
      return Vaccines;
    case "H": // Issues with view
      return VisibilityOff;
    case "N": // Issues with view
      return Visibility;
    case "Z": // radiation exposure/long supervision
      return Attribution;
    case "L": // Skin issues
      return LocalHospital;
    case "F": // disorder
      return MoodBad;
    default:
      return assertNever(firstLetter);
  }
};
