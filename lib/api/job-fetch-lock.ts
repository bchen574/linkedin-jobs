type BeginJobFetchInput = {
  force?: boolean;
};

type BeginJobFetchResult = {
  started: boolean;
  reason?: "in_progress" | "fresh";
  fetchedAt?: number;
};

export async function beginJobFetch(input: BeginJobFetchInput = {}) {
  const response = await fetch("/api/jobs/supabase", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "beginFetch",
      force: input.force === true,
    }),
  });

  if (!response.ok) {
    throw new Error(await getJobFetchLockErrorMessage(response));
  }

  const body = await response.json();

  return {
    started: body.started === true,
    reason: getSkipReason(body.reason),
    fetchedAt: typeof body.fetchedAt === "number" ? body.fetchedAt : undefined,
  } satisfies BeginJobFetchResult;
}

export async function finishJobFetch() {
  await updateJobFetchLock("finishFetch");
}

export async function failJobFetch() {
  await updateJobFetchLock("failFetch");
}

async function updateJobFetchLock(action: "finishFetch" | "failFetch") {
  const response = await fetch("/api/jobs/supabase", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action }),
  });

  if (!response.ok) {
    throw new Error(await getJobFetchLockErrorMessage(response));
  }
}

function getSkipReason(value: unknown) {
  if (value === "in_progress" || value === "fresh") {
    return value;
  }

  return undefined;
}

async function getJobFetchLockErrorMessage(response: Response) {
  const fallbackMessage = `Job fetch lock failed with status ${response.status}`;

  try {
    const body = await response.json();

    return typeof body.error === "string" ? body.error : fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}
