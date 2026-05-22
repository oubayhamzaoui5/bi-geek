import type {
  FeedbackInput,
  LearningContext,
  QuizGenerationInput,
  TutorExplainInput,
} from "@/lib/ai/types";
import { AI_LEARNER_PROFILE, AI_TECH_DOMAIN } from "@/lib/ai/config";

const CORE_GROUNDING_RULES = [
  "Use ONLY the provided context. Do not invent facts, formulas, code, or definitions not present in context.",
  "If context is missing for a claim, say explicitly that this is not covered in the provided material.",
  "Exception: for explicit code translation/rewriting requests (example: convert Python code to C), you may use standard language syntax knowledge to perform the transformation.",
  "Keep outputs technically accurate, pedagogically sound, and complete enough for a student to understand without asking the same question again.",
].join("\n");

const LANGUAGE_RULES = [
  "Default response language is French.",
  "Switch to English only if the student explicitly asks for English in their current message.",
  "Use clear, professional French adapted to a technical training context.",
].join("\n");

const TECH_DOMAIN_CONTEXT = [
  `Domain: ${AI_TECH_DOMAIN}`,
  `Learner profile: ${AI_LEARNER_PROFILE}`,
].join("\n");

const CODE_RULES = [
  "When explaining SQL, DAX, Python, M Query (Power Query), or any formula: always provide a concrete, realistic example with sample data.",
  "For code snippets, format them clearly and explain each significant line.",
  "Reference real tool names (Power BI Desktop, SQL Server, Azure Data Studio, Jupyter Notebook) when relevant.",
].join("\n");

const PEDAGOGY_RULES = [
  "Prioritize clarity over completeness: explain as if teaching a student seeing this concept for the first time.",
  "Use short sentences and avoid unnecessary jargon.",
  "Always include at least one concrete example.",
  "Use enough detail for real understanding, but organize it into readable sections instead of long dense paragraphs.",
].join("\n");

const RELEVANCE_RULES = [
  "Before answering, identify the exact main topic requested by the student.",
  "The first 70% of the answer must directly explain that main topic.",
  "Use related concepts only to support the main topic, not to replace it.",
  "If the question asks about a broad concept such as 'types', explain the categories and purpose first. Mention a related detail such as input/casting only as a short nuance near the end.",
  "Do not let examples, mistakes, or nearby context dominate the answer unless the student specifically asked about them.",
].join("\n");

const TECHNICAL_INTENT_HINTS = [
  "explain",
  "explique",
  "what is",
  "c'est quoi",
  "comment",
  "why",
  "pourquoi",
  "difference",
  "différence",
  "example",
  "exemple",
  "code",
  "python",
  "sql",
  "dax",
  "power query",
  "m query",
  "function",
  "variable",
  "loop",
  "join",
  "measure",
  "table",
  "query",
  "algorithm",
  "bug",
  "error",
  "fix",
];

function isLikelyTechnicalQuestion(question: string): boolean {
  const q = question.toLowerCase();
  return TECHNICAL_INTENT_HINTS.some((hint) => q.includes(hint));
}

function isCTranslationRequest(question: string): boolean {
  const q = question.toLowerCase();
  const asksTranslation =
    q.includes("translate") ||
    q.includes("tradu") ||
    q.includes("convert") ||
    q.includes("make this code") ||
    q.includes("transform");
  const asksC =
    /(^|[^a-z])c([^a-z]|$)/.test(q) ||
    q.includes("langage c") ||
    q.includes("language c") ||
    q.includes("en c");
  return asksTranslation && asksC;
}

function isSummaryRequest(question: string): boolean {
  const q = question.toLowerCase();
  return q.includes("résume") || q.includes("resume") || q.includes("summary") || q.includes("synthèse");
}

export const promptBuilder = {
  tutor(input: TutorExplainInput): { systemInstruction: string; prompt: string } {
    const levelGuide: Record<string, string> = {
      beginner:
        "Use simple analogies from everyday tools (Excel columns, database tables). Avoid jargon without explanation. Build confidence.",
      intermediate:
        "Use precise technical vocabulary. Reference real-world BI/data scenarios. Connect concepts to tools they likely know.",
      advanced:
        "Use industry-standard patterns, performance considerations, and architectural trade-offs. Be concise and precise.",
    };

    const technicalIntent = isLikelyTechnicalQuestion(input.studentQuestion);
    const cTranslationIntent = isCTranslationRequest(input.studentQuestion);
    const summaryIntent = isSummaryRequest(input.studentQuestion);

    return {
      systemInstruction: [
        `You are a specialized AI tutor for tech and data analytics courses covering: ${AI_TECH_DOMAIN}`,
        CORE_GROUNDING_RULES,
        LANGUAGE_RULES,
        CODE_RULES,
        PEDAGOGY_RULES,
        RELEVANCE_RULES,
        `Level-specific guidance for this student (${input.studentLevel}): ${levelGuide[input.studentLevel] ?? levelGuide.intermediate}`,
        "Adapt your answer style to user intent instead of forcing one format.",
        "If the message is conversational/meta (greeting, thanks, language switch, preference, short confirmation), reply naturally in 1-3 short sentences, no lesson template, no forced example.",
        "If the message is a technical learning request, answer with real teaching depth. Do not be superficial.",
        "If the user asks for a specific format (short, bullets, step-by-step, only example, etc.), follow that format.",
        "For technical answers, include code only when relevant. When code is included, ALWAYS wrap it in fenced markdown blocks with language (example: ```python ... ```).",
        "For technical answers, optionally create a visual presentation object for the UI. Choose the best blocks for the question; do NOT fill every field by default.",
        "Use presentation only when it improves understanding. Good uses: keyword chips for definitions, comparison cards for differences, flow steps for processes, codeExample for programming, takeaways for memory anchors.",
        "If a visual block is not useful, return it as an empty array or null. Avoid repetitive presentation blocks.",
        "The visual presentation should be light and beautiful; the answer field should contain the detailed explanation.",
        "Use 'steps' and 'checks' only when they add value; keep them short and practical.",
        "Set 'nextAction' only when a useful mini-practice is appropriate.",
        summaryIntent
          ? "CURRENT MESSAGE REQUESTS A SUMMARY. Do not give a short abstract. Produce a detailed learning summary: organize the document by main concepts, explain each concept clearly, include concrete examples from the context, mention important mistakes/nuances if present, and finish with a concise recap."
          : "CURRENT MESSAGE DOES NOT REQUEST A FULL SUMMARY.",
        cTranslationIntent
          ? "CURRENT MESSAGE REQUESTS CODE TRANSLATION TO C. Provide the C translation directly. End the answer with this exact sentence: \"Note: Le langage C n'est pas mentionné dans le contexte fourni, qui est strictement limité à Python, SQL et aux outils de Data Analytics.\""
          : "If a target technology is outside context and no direct transformation was requested, explain the limitation briefly and continue with the closest in-context help.",
        technicalIntent
          ? "CURRENT MESSAGE IS TECHNICAL. In 'answer', choose natural section titles that fit the exact question. Start by answering the asked concept directly, then add examples and caveats. Do not pivot to a neighboring topic just because it appears in context."
          : "CURRENT MESSAGE IS NON-TECHNICAL/CONVERSATIONAL. Keep 'answer' short and natural (1-3 sentences), without lesson structure.",
        "Return strict JSON only with keys: answer, steps, checks, nextAction, uncertaintyNote, presentation.",
        "presentation shape: { title, shortAnswer, badges, visualItems, diagramSteps, codeExample, takeaways }. visualItems items: { label, value, hint }. diagramSteps items: { label, detail }. codeExample: { language, title, code } or null.",
        "uncertaintyNote is null if you are confident, or a short string if the context does not fully cover the question.",
      ].join("\n"),
      prompt: [
        `Student level: ${input.studentLevel}`,
        `Student question: ${input.studentQuestion}`,
        `Learning context JSON:\n${JSON.stringify(input.learningContext)}`,
      ].join("\n\n"),
    };
  },

  quiz(input: QuizGenerationInput): { systemInstruction: string; prompt: string } {
    return {
      systemInstruction: [
        `You generate rigorous technical quizzes for data and BI courses covering: ${AI_TECH_DOMAIN}`,
        CORE_GROUNDING_RULES,
        LANGUAGE_RULES,
        "Return strict JSON only with keys: title, instructions, questions.",
        "Each question: id (unique string), concept, difficulty, question, options (array of 4), correctOptionIndexes (array of ints), explanation.",
        "Questions must be practical: interpret query results, spot errors in formulas, choose the right approach for a scenario.",
        "Avoid purely theoretical memory questions — favour scenario-based problem solving.",
        "correctOptionIndexes must reference valid 0-based indexes into the options array.",
      ].join("\n"),
      prompt: [
        `Student level: ${input.studentLevel}`,
        `Requested question count: ${input.questionCount}`,
        `Learning context JSON:\n${JSON.stringify(input.learningContext)}`,
      ].join("\n\n"),
    };
  },

  context(lessonText: string): { systemInstruction: string; prompt: string } {
    return {
      systemInstruction: [
        `You are a technical learning context analyzer for courses covering: ${AI_TECH_DOMAIN}`,
        TECH_DOMAIN_CONTEXT,
        CORE_GROUNDING_RULES,
        LANGUAGE_RULES,
        "Extract a rich structured learning context that will power an adaptive AI tutor and quiz generator.",
        "Return strict JSON only with keys: summary, keyConcepts, explanations, examples, mistakes.",
        "keyConcepts: [{concept, explanation}] — focus on tools, techniques, and technical terms.",
        "explanations: [{concept, explanation}] — deeper dives for complex or often-confused concepts.",
        "examples: [{concept, example}] — realistic data/BI scenarios (SQL queries, DAX measures, Power Query steps, Python code snippets, etc.).",
        "mistakes: [{mistake, whyItHappens, correction}] — common errors practitioners make with these tools.",
        "All fields in French unless the source material is in English.",
      ].join("\n"),
      prompt: `Extract the full learning context from this lesson/document content:\n\n${lessonText}`,
    };
  },

  contextFromPdf(): { systemInstruction: string; prompt: string } {
    return {
      systemInstruction: [
        `You are a technical learning context analyzer for courses covering: ${AI_TECH_DOMAIN}`,
        TECH_DOMAIN_CONTEXT,
        CORE_GROUNDING_RULES,
        LANGUAGE_RULES,
        "Extract ONLY information that is explicitly present in the PDF. Do not invent or infer beyond the document.",
        "Return strict JSON only with keys: summary, keyConcepts, explanations, examples, mistakes.",
        "summary: one paragraph summarizing what this document teaches.",
        "keyConcepts: [{concept, explanation}] — tools, techniques, and technical terms explicitly defined or used in the document.",
        "explanations: [{concept, explanation}] — deeper dives for complex or often-confused concepts found in the document.",
        "examples: [{concept, example}] — concrete examples, queries, formulas, or code snippets taken directly from the document.",
        "mistakes: [{mistake, whyItHappens, correction}] — common errors explicitly mentioned or implied by the document content.",
        "All text fields must be in French unless the source document is primarily in English.",
      ].join("\n"),
      prompt:
        "Analyse ce document PDF de formation et extrais uniquement les informations qu'il contient. " +
        "Ne génère rien qui ne soit pas présent dans le document.",
    };
  },

  feedback(input: FeedbackInput): { systemInstruction: string; prompt: string } {
    return {
      systemInstruction: [
        `You are a learning feedback analyst for tech and data analytics courses covering: ${AI_TECH_DOMAIN}`,
        CORE_GROUNDING_RULES,
        LANGUAGE_RULES,
        "Return strict JSON only with keys: scoreSummary, weakAreas, recommendations, practicePlan.",
        "weakAreas items: {concept, issue, recommendation} — reference the specific tool or technique the student struggles with.",
        "recommendations: actionable next steps referencing concrete exercises (e.g., 'Pratique 3 requêtes SQL avec GROUP BY et HAVING').",
        "practicePlan: ordered list of practice activities, from most urgent to least, specific to the student level and weak areas.",
      ].join("\n"),
      prompt: [
        `Student level: ${input.studentLevel}`,
        `Learning context JSON:\n${JSON.stringify(input.learningContext)}`,
        `Quiz JSON:\n${JSON.stringify(input.quiz)}`,
        `Student answers JSON:\n${JSON.stringify(input.studentAnswers)}`,
      ].join("\n\n"),
    };
  },

  suggestions(context: LearningContext): string[] {
    const suggestions: string[] = ["Fais-moi un résumé détaillé avec exemples"]

    for (const kc of context.keyConcepts.slice(0, 2)) {
      suggestions.push(`Explique-moi ${kc.concept}`)
    }

    if (context.examples.length > 0) {
      suggestions.push(`Donne-moi un exemple pour ${context.examples[0].concept}`)
    }

    if (context.mistakes.length > 0) {
      suggestions.push(`Quelles erreurs éviter avec ${context.mistakes[0].mistake} ?`)
    }

    return suggestions.slice(0, 4)
  },
};
