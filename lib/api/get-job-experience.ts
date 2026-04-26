export async function getJobExperience(descriptionText: string) {
  const response = await fetch("/api/job-experience", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ descriptionText }),
  });

  if (!response.ok) {
    throw new Error(await getJobExperienceErrorMessage(response));
  }

  const body = await response.json();

  return typeof body.yearsOfExperience === "string"
    ? body.yearsOfExperience
    : "Not specified";
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
