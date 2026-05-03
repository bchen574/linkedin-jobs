export async function deleteHiddenJobsFromSupabase() {
  const response = await fetch("/api/jobs/supabase", {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await getDeleteHiddenJobsErrorMessage(response));
  }
}

async function getDeleteHiddenJobsErrorMessage(response: Response) {
  const fallbackMessage = `Hidden jobs delete failed with status ${response.status}`;

  try {
    const body = await response.json();

    return typeof body.error === "string" ? body.error : fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}
