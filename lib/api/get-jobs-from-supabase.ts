export async function getJobsFromSupabase() {
  const response = await fetch("/api/jobs/supabase", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await getJobsFromSupabaseErrorMessage(response));
  }

  const body = await response.json();

  return {
    jobs: Array.isArray(body.jobs) ? body.jobs : [],
    hiddenJobs: Array.isArray(body.hiddenJobs) ? body.hiddenJobs : [],
    fetchedAt: typeof body.fetchedAt === "number" ? body.fetchedAt : 0,
  };
}

async function getJobsFromSupabaseErrorMessage(response: Response) {
  const fallbackMessage = `Supabase load failed with status ${response.status}`;

  try {
    const body = await response.json();

    return typeof body.error === "string" ? body.error : fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}
