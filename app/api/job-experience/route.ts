type JobExperienceRequest = {
  title?: unknown;
  descriptionText?: unknown;
  jobs?: unknown;
};

const model = "gpt-4.1-mini";
const maxBatchSize = 10;

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OpenAI API key is not set" },
      { status: 500 },
    );
  }

  try {
    const input = (await request.json()) as JobExperienceRequest;

    if (Array.isArray(input.jobs)) {
      const jobs = input.jobs
        .map(getJobAnalysisInput)
        .filter((job): job is JobAnalysisInput => Boolean(job));

      if (!jobs.length) {
        return Response.json(
          { error: "At least one job title or description text is required" },
          { status: 400 },
        );
      }

      const jobAnalyses = await getJobAnalyses(jobs.slice(0, maxBatchSize));

      return Response.json({ jobs: jobAnalyses }, { status: 200 });
    }

    const title = typeof input.title === "string" ? input.title.trim() : "";
    const descriptionText =
      typeof input.descriptionText === "string"
        ? input.descriptionText.trim()
        : "";

    if (!title && !descriptionText) {
      return Response.json(
        { error: "Job title or description text is required" },
        { status: 400 },
      );
    }

    const jobAnalysis = await getJobAnalysis({
      title,
      descriptionText,
    });

    return Response.json(jobAnalysis, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("ERROR:", error.message);
    } else {
      console.error("UNKNOWN ERROR:", error);
    }

    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

type JobAnalysisInput = {
  title: string;
  descriptionText: string;
};

type JobAnalysisResult = {
  yearsOfExperience: string;
  isUxRelated: boolean;
};

function getJobAnalysisInput(value: unknown): JobAnalysisInput | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const title = typeof value.title === "string" ? value.title.trim() : "";
  const descriptionText =
    typeof value.descriptionText === "string"
      ? value.descriptionText.trim()
      : "";

  if (!title && !descriptionText) {
    return undefined;
  }

  return { title, descriptionText };
}

async function getJobAnalysis({
  title,
  descriptionText,
}: JobAnalysisInput): Promise<JobAnalysisResult> {
  const jobAnalyses = await getJobAnalyses([{ title, descriptionText }]);

  return jobAnalyses[0] ?? getFallbackJobAnalysis();
}

async function getJobAnalyses(
  jobs: JobAnalysisInput[],
): Promise<JobAnalysisResult[]> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: `
You are a strict job classifier.

Your tasks:
1) Extract the required years of professional experience.
2) Determine if this role is UX-related.

You may receive one job or a JSON array of jobs. Return one result per input
job, in the same order.

A role is UX-related if:
- It involves designing user experiences, interfaces, or conducting user research.
- It includes UX/UI design, product design, interaction design, or usability work.
- It produces design artifacts (flows, wireframes, prototypes, design systems).

DEFAULT BEHAVIOR:
- If the role is unclear, mixed, or partially UX-related → isUxRelated = true

HOWEVER, the following are HARD EXCLUSIONS (must be false):

ENGINEERING / CODING DOMINANT:
- Requires coding as a primary responsibility (e.g. React, TypeScript, APIs, backend/frontend development)
- Titles like: Software Engineer, Frontend Developer, Full Stack Developer, Web Developer, Mobile Developer
- UX Engineer / Design Technologist roles where coding is a core requirement

PRODUCT / BUSINESS DOMINANT:
- Product Manager, Product Owner, Technical Product Manager
- Program Manager, Project Manager
- Business Analyst, Data Analyst

NON-UX DESIGN:
- Graphic Designer (marketing/branding focused)
- Brand Designer, Marketing Designer
- Motion Designer, Illustrator
- Industrial Designer, Architectural Designer

MARKETING / GROWTH:
- Growth, Marketing, SEO, Content, Social Media roles

PRIORITY RULES:
- If coding is explicitly required → isUxRelated = false
- If role is primarily strategy/roadmap/business (not design execution) → false
- If UX is only a small part of the role → false
- Otherwise (including mixed roles) → true

EXPERIENCE EXTRACTION:
- Extract minimum required years of experience
- Map to:
  0-1 years
  1-2 years
  2-3 years
  3-5 years
  5-7 years
  7-10 years
  10+ years
- If not stated → "Not specified"

Be consistent and apply rules strictly.
`,
        },
        {
          role: "user",
          content: JSON.stringify(
            jobs.map((job, index) => ({
              index,
              title: job.title || "Unknown",
              descriptionText: job.descriptionText || "Not provided",
            })),
          ),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "job_experience",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              jobs: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    yearsOfExperience: {
                      type: "string",
                      enum: [
                        "Not specified",
                        "0-1 years",
                        "1-2 years",
                        "2-3 years",
                        "3-5 years",
                        "5-7 years",
                        "7-10 years",
                        "10+ years",
                      ],
                    },
                    isUxRelated: {
                      type: "boolean",
                    },
                  },
                  required: ["yearsOfExperience", "isUxRelated"],
                },
              },
            },
            required: ["jobs"],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(await getOpenAiErrorMessage(response));
  }

  const body = await response.json();
  const outputText = getOutputText(body);
  const parsedOutput = JSON.parse(outputText);
  const parsedJobs = isRecord(parsedOutput) ? parsedOutput.jobs : undefined;

  if (!Array.isArray(parsedJobs)) {
    return jobs.map(getFallbackJobAnalysis);
  }

  return jobs.map((_, index) => getParsedJobAnalysis(parsedJobs[index]));
}

function getParsedJobAnalysis(value: unknown): JobAnalysisResult {
  if (!isRecord(value)) {
    return getFallbackJobAnalysis();
  }

  return {
    yearsOfExperience:
      typeof value.yearsOfExperience === "string"
        ? value.yearsOfExperience
        : "Not specified",
    isUxRelated:
      typeof value.isUxRelated === "boolean" ? value.isUxRelated : true,
  };
}

function getFallbackJobAnalysis(): JobAnalysisResult {
  return {
    yearsOfExperience: "Not specified",
    isUxRelated: true,
  };
}

async function getOpenAiErrorMessage(response: Response) {
  const fallbackMessage = `OpenAI request failed with status ${response.status}`;

  try {
    const body = await response.json();
    const message = body?.error?.message;

    return typeof message === "string" ? message : fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

function getOutputText(body: unknown) {
  if (!isRecord(body)) {
    return "{}";
  }

  if (typeof body.output_text === "string") {
    return body.output_text;
  }

  if (!Array.isArray(body.output)) {
    return "{}";
  }

  for (const item of body.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (
        isRecord(content) &&
        content.type === "output_text" &&
        typeof content.text === "string"
      ) {
        return content.text;
      }
    }
  }

  return "{}";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
