type JobExperienceRequest = {
  title?: unknown;
  descriptionText?: unknown;
};

const model = "gpt-4.1-mini";

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OpenAI API key is not set" },
      { status: 500 },
    );
  }

  try {
    const input = (await request.json()) as JobExperienceRequest;
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

async function getJobAnalysis({
  title,
  descriptionText,
}: {
  title: string;
  descriptionText: string;
}) {
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
          content:
            "Analyze the job title and description. Extract the years of professional experience required by the job description. Also decide whether the role is related to UX design, product design, UX/UI design, user research, interaction design, service design, or product experience design. Mark false for roles that are primarily software engineering, graphic design, marketing, sales, project management, business analysis, industrial design, architecture, or unrelated design work. Use the closest experience range. If no requirement is stated, use Not specified.",
        },
        {
          role: "user",
          content: `Job title:\n${title || "Unknown"}\n\nJob description:\n${descriptionText || "Not provided"}`,
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
    }),
  });

  if (!response.ok) {
    throw new Error(await getOpenAiErrorMessage(response));
  }

  const body = await response.json();
  const outputText = getOutputText(body);
  const parsedOutput = JSON.parse(outputText);

  return {
    yearsOfExperience:
      typeof parsedOutput.yearsOfExperience === "string"
        ? parsedOutput.yearsOfExperience
        : "Not specified",
    isUxRelated:
      typeof parsedOutput.isUxRelated === "boolean"
        ? parsedOutput.isUxRelated
        : true,
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
