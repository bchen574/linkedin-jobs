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
  const body = await fetchJobAnalysis({ title, descriptionText });

  return {
    yearsOfExperience:
      typeof body.yearsOfExperience === "string"
        ? body.yearsOfExperience
        : "Not specified",
    isUxRelated:
      typeof body.isUxRelated === "boolean" ? body.isUxRelated : false,
  };
}

async function fetchJobAnalysis(input: JobAnalysisInput) {
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

async function getJobAnalysisErrorMessage(response: Response) {
  const fallbackMessage = `Experience lookup failed with status ${response.status}`;

  try {
    const body = await response.json();

    return typeof body.error === "string" ? body.error : fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}
