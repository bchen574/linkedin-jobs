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
  applied?: boolean;
  hidden?: boolean;
  applicationStatus?: string;
};

type SaveJobsInput = {
  jobs: SupabaseJob[];
  appliedJobs: SupabaseJob[];
  hiddenJobs: SupabaseJob[];
  replaceVisible?: boolean;
};

const maxSaveRequestBytes = 700_000;

export async function saveJobsToSupabase(input: SaveJobsInput) {
  if (input.replaceVisible) {
    await postJobsToSupabase({
      jobs: [],
      appliedJobs: [],
      hiddenJobs: [],
      replaceVisible: true,
    });
  }

  const chunks = getSaveJobsChunks({
    ...input,
    replaceVisible: undefined,
  });
  const failures: unknown[] = [];

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];

    try {
      console.log("Chunk size:", getJsonSize(chunk));
      await postJobsToSupabase(chunk);
      console.log("Chunk success:", i);
    } catch (error) {
      failures.push(error);
      console.error("Chunk failed:", i, error);
    }
  }

  if (failures.length) {
    throw new Error(
      `Supabase save failed for ${failures.length} of ${chunks.length} chunks`,
    );
  }
}

async function postJobsToSupabase(input: SaveJobsInput) {
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

function getSaveJobsChunks(input: SaveJobsInput) {
  const chunks: SaveJobsInput[] = [];
  const pendingJobs = [...input.jobs];
  const pendingAppliedJobs = [...input.appliedJobs];
  const pendingHiddenJobs = [...input.hiddenJobs];

  while (
    pendingJobs.length ||
    pendingAppliedJobs.length ||
    pendingHiddenJobs.length
  ) {
    const chunk: SaveJobsInput = {
      jobs: [],
      appliedJobs: [],
      hiddenJobs: [],
    };

    fillChunk(chunk, "jobs", pendingJobs);
    fillChunk(chunk, "appliedJobs", pendingAppliedJobs);
    fillChunk(chunk, "hiddenJobs", pendingHiddenJobs);

    if (chunkHasRows(chunk)) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

function fillChunk(
  chunk: SaveJobsInput,
  key: "jobs" | "appliedJobs" | "hiddenJobs",
  pendingJobs: SupabaseJob[],
) {
  while (pendingJobs.length) {
    const nextJob = pendingJobs[0];
    const nextChunk = { ...chunk, [key]: [...chunk[key], nextJob] };

    if (!chunkHasRows(chunk) && getJsonSize(nextChunk) > maxSaveRequestBytes) {
      console.warn("Job too large:", nextJob.id);
      pendingJobs.shift();
      continue;
    }

    if (chunkHasRows(chunk) && getJsonSize(nextChunk) > maxSaveRequestBytes) {
      return;
    }

    chunk[key].push(nextJob);
    pendingJobs.shift();
  }
}

function chunkHasRows(chunk: SaveJobsInput) {
  return Boolean(
    chunk.jobs.length || chunk.appliedJobs.length || chunk.hiddenJobs.length,
  );
}

function getJsonSize(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).length;
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
