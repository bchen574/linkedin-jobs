type JobAnalysisInput = {
  title: string;
  descriptionText?: string;
};

type JobAnalysisResult = {
  yearsOfExperience: string;
  isUxRelated: boolean;
};

export async function analyzeJob({
  title,
  descriptionText,
}: JobAnalysisInput): Promise<JobAnalysisResult> {
  const body = await postJobAnalysis({ title, descriptionText });

  return {
    yearsOfExperience:
      typeof body.yearsOfExperience === "string"
        ? body.yearsOfExperience
        : "Not specified",
    isUxRelated:
      typeof body.isUxRelated === "boolean" ? body.isUxRelated : false,
  };
}

export async function analyzeJobs(
  jobs: JobAnalysisInput[],
): Promise<JobAnalysisResult[]> {
  if (!jobs.length) {
    return [];
  }

  const body = await postJobAnalysis({ jobs });
  const analyzedJobs = Array.isArray(body.jobs) ? body.jobs : [];

  return jobs.map((_, index) => getJobAnalysisResult(analyzedJobs[index]));
}

async function postJobAnalysis(input: JobAnalysisInput | {
  jobs: JobAnalysisInput[];
}) {
  const response = await fetch("/api/job-experience", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await getJobAnalysisErrorMessage(response));
  }

  return response.json();
}

function getJobAnalysisResult(value: unknown): JobAnalysisResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      yearsOfExperience: "Not specified",
      isUxRelated: true,
    };
  }

  const result = value as Record<string, unknown>;

  return {
    yearsOfExperience:
      typeof result.yearsOfExperience === "string"
        ? result.yearsOfExperience
        : "Not specified",
    isUxRelated:
      typeof result.isUxRelated === "boolean" ? result.isUxRelated : true,
  };
}

async function getJobAnalysisErrorMessage(response: Response) {
  const fallbackMessage = `Experience lookup failed with status ${response.status}`;

  try {
    const body = await response.json();

    return typeof body.error === "string" ? body.error : fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}
