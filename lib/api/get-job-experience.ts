type JobExperienceInput = {
  title: string;
  descriptionText?: string;
};

type JobExperienceResult = {
  yearsOfExperience: string;
  isUxRelated: boolean;
};

export async function getJobExperience({
  title,
  descriptionText,
}: JobExperienceInput): Promise<JobExperienceResult> {
  const response = await fetch("/api/job-experience", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, descriptionText }),
  });

  if (!response.ok) {
    throw new Error(await getJobExperienceErrorMessage(response));
  }

  const body = await response.json();

  return {
    yearsOfExperience:
      typeof body.yearsOfExperience === "string"
        ? body.yearsOfExperience
        : "Not specified",
    isUxRelated:
      typeof body.isUxRelated === "boolean" ? body.isUxRelated : true,
  };
}

async function getJobExperienceErrorMessage(response: Response) {
  const fallbackMessage = `Experience lookup failed with status ${response.status}`;

  try {
    const body = await response.json();

    return typeof body.error === "string" ? body.error : fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}
