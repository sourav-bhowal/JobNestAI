import { z } from "zod";

// JobType enum
const JobTypeEnum = z.enum([
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
]);

// Job preference validation schema
export const updateJobPreferencesSchema = z.object({
  keywords: z.array(z.string()).optional(), // Array of keywords
  location: z.array(z.string()).optional(), // Array of locations
  skills: z.array(z.string()).optional(), // Array of skills
  remote: z.boolean().nullable().optional(), // Optional remote flag
  jobTypes: z.array(JobTypeEnum).optional(), // Job types (array of enum values)
});

// Type definition for job preference schema
export type UpdateJobPreferencesSchemaType = z.infer<typeof updateJobPreferencesSchema>;