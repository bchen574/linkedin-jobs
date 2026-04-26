type SaveJobsRequest = {
  jobs?: unknown;
  hiddenJobs?: unknown;
  replaceVisible?: unknown;
};

type JobRowInput = Record<string, unknown>;

const defaultTableName = "linkedin_jobs";

export async function GET() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return Response.json({ jobs: [], hiddenJobs: [] }, { status: 200 });
  }

  try {
    const rows = await getRowsFromSupabase({
      supabaseUrl,
      supabaseSecretKey,
      tableName: process.env.SUPABASE_JOBS_TABLE ?? defaultTableName,
    });

    return Response.json(getJobsResponse(rows), { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("ERROR:", error.message);

      return Response.json({ error: error.message }, { status: 500 });
    }

    console.error("UNKNOWN ERROR:", error);

    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return Response.json({ skipped: true }, { status: 200 });
  }

  try {
    const input = (await request.json()) as SaveJobsRequest;
    const tableName = process.env.SUPABASE_JOBS_TABLE ?? defaultTableName;
    const rows = [
      ...getRows(input.jobs, false),
      ...getRows(input.hiddenJobs, true),
    ];

    if (input.replaceVisible === true) {
      await deleteVisibleRows({
        supabaseUrl,
        supabaseSecretKey,
        tableName,
      });
    }

    if (!rows.length) {
      return Response.json({ saved: 0 }, { status: 200 });
    }

    await upsertRows({
      rows,
      supabaseUrl,
      supabaseSecretKey,
      tableName,
    });

    return Response.json({ saved: rows.length }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("ERROR:", error.message);

      return Response.json({ error: error.message }, { status: 500 });
    }

    console.error("UNKNOWN ERROR:", error);

    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

async function deleteVisibleRows({
  supabaseUrl,
  supabaseSecretKey,
  tableName,
}: {
  supabaseUrl: string;
  supabaseSecretKey: string;
  tableName: string;
}) {
  const url = new URL(`/rest/v1/${tableName}`, supabaseUrl);

  url.searchParams.set("hidden", "eq.false");

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      apikey: supabaseSecretKey,
      Authorization: `Bearer ${supabaseSecretKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(await getSupabaseErrorMessage(response));
  }
}

async function upsertRows({
  rows,
  supabaseUrl,
  supabaseSecretKey,
  tableName,
}: {
  rows: JobRow[];
  supabaseUrl: string;
  supabaseSecretKey: string;
  tableName: string;
}) {
  const url = new URL(`/rest/v1/${tableName}`, supabaseUrl);

  url.searchParams.set("on_conflict", "id");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: supabaseSecretKey,
      Authorization: `Bearer ${supabaseSecretKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    throw new Error(await getSupabaseErrorMessage(response));
  }
}

async function getRowsFromSupabase({
  supabaseUrl,
  supabaseSecretKey,
  tableName,
}: {
  supabaseUrl: string;
  supabaseSecretKey: string;
  tableName: string;
}) {
  const url = new URL(`/rest/v1/${tableName}`, supabaseUrl);

  url.searchParams.set("select", "*");
  url.searchParams.set("order", "posted_at.desc.nullslast");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      apikey: supabaseSecretKey,
      Authorization: `Bearer ${supabaseSecretKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(await getSupabaseErrorMessage(response));
  }

  const rows = await response.json();

  return Array.isArray(rows) ? rows.filter(isRecord) : [];
}

type JobRow = {
  id: string;
  title: string;
  company: string;
  location: string;
  posted_at: string | null;
  posted_at_timestamp: number | null;
  years_of_experience: string | null;
  linkedin_url: string | null;
  apply_url: string | null;
  hidden: boolean;
  hidden_at: string | null;
  data: JobRowInput;
  updated_at: string;
};

function getRows(value: unknown, hidden: boolean) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).map((job) => getRow(job, hidden));
}

function getRow(job: JobRowInput, hidden: boolean): JobRow {
  const postedAtTimestamp = getNumberValue(job.postedAtTimestamp);
  const hiddenAtTimestamp = getNumberValue(job.hiddenAt);

  return {
    id: getStringValue(job.id) ?? crypto.randomUUID(),
    title: getStringValue(job.title) ?? "Untitled role",
    company: getStringValue(job.company) ?? "Unknown company",
    location: getStringValue(job.location) ?? "Unknown",
    posted_at: getDateValue(postedAtTimestamp),
    posted_at_timestamp: postedAtTimestamp ?? null,
    years_of_experience: getStringValue(job.yearsOfExperience) ?? null,
    linkedin_url: getStringValue(job.linkedInUrl) ?? null,
    apply_url: getStringValue(job.applyUrl) ?? null,
    hidden,
    hidden_at: getDateValue(hiddenAtTimestamp),
    data: job,
    updated_at: new Date().toISOString(),
  };
}

function getJobsResponse(rows: Record<string, unknown>[]) {
  const jobs: JobRowInput[] = [];
  const hiddenJobs: JobRowInput[] = [];

  for (const row of rows) {
    const job = getJobFromRow(row);

    if (row.hidden === true) {
      hiddenJobs.push(job);
    } else {
      jobs.push(job);
    }
  }

  return { jobs, hiddenJobs, fetchedAt: getLatestUpdatedAt(rows) };
}

function getJobFromRow(row: Record<string, unknown>) {
  const data = isRecord(row.data) ? row.data : {};

  return {
    ...data,
    id: getStringValue(row.id) ?? getStringValue(data.id) ?? crypto.randomUUID(),
    title: getStringValue(row.title) ?? getStringValue(data.title) ?? "",
    company: getStringValue(row.company) ?? getStringValue(data.company) ?? "",
    location:
      getStringValue(row.location) ?? getStringValue(data.location) ?? "Unknown",
    postedAtTimestamp:
      getNumberValue(row.posted_at_timestamp) ??
      getNumberValue(data.postedAtTimestamp),
    yearsOfExperience:
      getStringValue(row.years_of_experience) ??
      getStringValue(data.yearsOfExperience),
    linkedInUrl:
      getStringValue(row.linkedin_url) ?? getStringValue(data.linkedInUrl),
    applyUrl: getStringValue(row.apply_url) ?? getStringValue(data.applyUrl),
    hiddenAt:
      getTimestampValue(row.hidden_at) ?? getNumberValue(data.hiddenAt),
  };
}

function getLatestUpdatedAt(rows: Record<string, unknown>[]) {
  return rows.reduce((latestTimestamp, row) => {
    const updatedAt = getTimestampValue(row.updated_at) ?? 0;

    return Math.max(latestTimestamp, updatedAt);
  }, 0);
}

async function getSupabaseErrorMessage(response: Response) {
  const fallbackMessage = `Supabase request failed with status ${response.status}`;

  try {
    const body = await response.json();

    if (typeof body.message === "string") {
      return body.message;
    }

    return fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

function getDateValue(timestamp: number | undefined) {
  return timestamp ? new Date(timestamp).toISOString() : null;
}

function getTimestampValue(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? undefined : timestamp;
}

function getStringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getNumberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
