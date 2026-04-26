type SupabaseJob = {
  id: string;
  title: string;
  postedAt: string;
  postedAtTimestamp?: number;
  company: string;
  location: string;
  yearsOfExperience?: string;
  linkedInUrl?: string;
  applyUrl?: string;
  hiddenAt?: number;
};

type SaveJobsInput = {
  jobs: SupabaseJob[];
  hiddenJobs: SupabaseJob[];
  replaceVisible?: boolean;
};

export async function saveJobsToSupabase(input: SaveJobsInput) {
  const response = await fetch("/api/jobs/supabase", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await getSaveJobsErrorMessage(response));
  }
}

async function getSaveJobsErrorMessage(response: Response) {
  const fallbackMessage = `Supabase save failed with status ${response.status}`;

  try {
    const body = await response.json();

    return typeof body.error === "string" ? body.error : fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}
