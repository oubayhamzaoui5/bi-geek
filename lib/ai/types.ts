export type StudentLevel = "beginner" | "intermediate" | "advanced";

export type Difficulty = "easy" | "medium" | "hard";

export interface LearningKeyConcept {
  concept: string;
  explanation: string;
}

export interface LearningExample {
  concept: string;
  example: string;
}

export interface LearningMistake {
  mistake: string;
  whyItHappens: string;
  correction: string;
}

export interface QuizSeed {
  concept: string;
  prompt: string;
  expectedFocus: string;
  difficulty: Difficulty;
}

export interface LearningContext {
  summary: string;
  keyConcepts: LearningKeyConcept[];
  explanations: LearningKeyConcept[];
  examples: LearningExample[];
  mistakes: LearningMistake[];
}

export interface TutorExplainInput {
  studentLevel: StudentLevel;
  studentQuestion: string;
  learningContext: LearningContext;
}

export interface TutorVisualItem {
  label: string;
  value: string;
  hint?: string;
}

export interface TutorCodeExample {
  language: string;
  title: string;
  code: string;
}

export interface TutorDiagramStep {
  label: string;
  detail: string;
}

export interface TutorPresentation {
  title: string;
  shortAnswer: string;
  badges: string[];
  visualItems: TutorVisualItem[];
  diagramSteps: TutorDiagramStep[];
  codeExample?: TutorCodeExample | null;
  takeaways: string[];
}

export interface TutorStepByStepResponse {
  answer: string;
  steps: string[];
  checks: string[];
  nextAction: string;
  uncertaintyNote: string | null;
  presentation?: TutorPresentation | null;
  suggestions?: string[];
}

export interface QuizQuestion {
  id: string;
  concept: string;
  difficulty: Difficulty;
  question: string;
  options: string[];
  correctOptionIndexes: number[];
  explanation: string;
}

export interface Quiz {
  title: string;
  instructions: string;
  questions: QuizQuestion[];
}

export interface QuizGenerationInput {
  studentLevel: StudentLevel;
  learningContext: LearningContext;
  questionCount: number;
}

export interface StudentAnswer {
  questionId: string;
  selectedOptionIndexes: number[];
}

export interface FeedbackInput {
  studentLevel: StudentLevel;
  learningContext: LearningContext;
  quiz: Quiz;
  studentAnswers: StudentAnswer[];
}

export interface WeakArea {
  concept: string;
  issue: string;
  recommendation: string;
}

export interface FeedbackReport {
  scoreSummary: string;
  weakAreas: WeakArea[];
  recommendations: string[];
  practicePlan: string[];
}

export interface GeminiTextRequest {
  systemInstruction: string;
  prompt: string;
  temperature?: number;
  responseMimeType?: "text/plain" | "application/json";
}

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
}
