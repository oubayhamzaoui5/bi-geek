import { z } from "zod";
import type { LearningContext, Quiz, RetryOptions } from "@/lib/ai/types";

const difficultySchema = z.enum(["easy", "medium", "hard"]);

const learningConceptSchema = z.object({
  concept: z.string().min(1),
  explanation: z.string().min(1),
});

const learningExampleSchema = z.object({
  concept: z.string().min(1),
  example: z.string().min(1),
});

const learningMistakeSchema = z.object({
  mistake: z.string().min(1),
  whyItHappens: z.string().min(1),
  correction: z.string().min(1),
});

export const learningContextSchema = z.object({
  summary: z.string().min(1),
  keyConcepts: z.array(learningConceptSchema).min(1),
  explanations: z.array(learningConceptSchema).min(1),
  examples: z.array(learningExampleSchema).min(1),
  mistakes: z.array(learningMistakeSchema).min(1),
});

const quizQuestionSchema = z
  .object({
    id: z.string().min(1),
    concept: z.string().min(1),
    difficulty: difficultySchema,
    question: z.string().min(1),
    options: z.array(z.string().min(1)).length(4),
    correctOptionIndexes: z.array(z.number().int().min(0)).min(1),
    explanation: z.string().min(1),
  })
  .superRefine((question, ctx) => {
    const maxIndex = question.options.length - 1;
    for (const index of question.correctOptionIndexes) {
      if (index > maxIndex) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `correctOptionIndexes contains out-of-range value: ${index}`,
        });
      }
    }
  });

export const quizSchema = z.object({
  title: z.string().min(1),
  instructions: z.string().min(1),
  questions: z.array(quizQuestionSchema).min(1),
});

export function extractAndParseStrictJson(input: string): unknown {
  const trimmed = input.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  return JSON.parse(withoutFence);
}

export function validateLearningContextJson(input: unknown): LearningContext {
  return learningContextSchema.parse(input);
}

export function validateQuizJson(input: unknown): Quiz {
  return quizSchema.parse(input);
}

export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("empty content") ||
    message.includes("rate") ||
    message.includes("timeout") ||
    message.includes("json") ||
    message.includes("parse") ||
    message.includes("failed") ||
    message.includes("503") ||
    message.includes("429") ||
    message.includes("high demand") ||
    message.includes("temporarily") ||
    message.includes("try again") ||
    message.includes("overloaded") ||
    message.includes("quota")
  );
}

export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 350;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !isRetryableError(error)) {
        throw error;
      }

      const delayMs = initialDelayMs * attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Operation failed after retries.");
}
