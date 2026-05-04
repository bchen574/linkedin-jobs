/**
 * Simplified job save logic:
 * - Minimal transformation
 * - Batch by count (50 rows)
 * - Truncate large fields
 */

type SaveJobsRequest = {
  jobs?: unknown;
  appliedJobs?: unknown;
  hiddenJobs?: unknown;
  replaceVisible?: unknown;
};

type JobRowInput = Record<string, unknown>;
type FetchLockRequest = {
  action?: unknown;
  force?: unknown;
};

const defaultTableName = "linkedin_jobs";
const defaultMetaTableName = "jobs_meta";
const globalMetaId = "global";
const twoHoursMs = 2 * 60 * 60 * 1000;
const maxFetchTimeMs = 5 * 60 * 1000;
// Prevents a single job description from making the payload too large.
const maxDescriptionTextLength = 20_000;
const maxRowsPerBatch = 50;

export async function GET() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return Response.json(
      { jobs: [], appliedJobs: [], hiddenJobs: [] },
      { status: 200 },
    );
  }

  try {
    const rows = await getRowsFromSupabase({
      supabaseUrl,
      supabaseSecretKey,
      tableName: process.env.SUPABASE_JOBS_TABLE ?? defaultTableName,
    });
    const meta = await getJobsMetaFromSupabase({
      supabaseUrl,
      supabaseSecretKey,
      tableName: process.env.SUPABASE_JOBS_META_TABLE ?? defaultMetaTableName,
    });

    return Response.json(getJobsResponse(rows, meta), { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("ERROR:", error.message);

      return Response.json({ error: error.message }, { status: 500 });
    }

    console.error("UNKNOWN ERROR:", error);

    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return Response.json({ started: true, skipped: true }, { status: 200 });
  }

  try {
    const input = (await request.json()) as FetchLockRequest;
    const tableName =
      process.env.SUPABASE_JOBS_META_TABLE ?? defaultMetaTableName;

    if (input.action === "beginFetch") {
      const result = await beginFetchLock({
        force: input.force === true,
        supabaseUrl,
        supabaseSecretKey,
        tableName,
      });

      return Response.json(result, { status: 200 });
    }

    if (input.action === "finishFetch") {
      await updateFetchMeta({
        values: {
          last_fetched_at: new Date().toISOString(),
          fetch_started_at: null,
          updated_at: new Date().toISOString(),
        },
        supabaseUrl,
        supabaseSecretKey,
        tableName,
      });

      return Response.json({ finished: true }, { status: 200 });
    }

    if (input.action === "failFetch") {
      await updateFetchMeta({
        values: {
          fetch_started_at: null,
          updated_at: new Date().toISOString(),
        },
        supabaseUrl,
        supabaseSecretKey,
        tableName,
      });

      return Response.json({ finished: true }, { status: 200 });
    }

    return Response.json({ error: "Invalid fetch lock action" }, { status: 400 });
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
      ...getRows(input.jobs, { hidden: false, applied: false }),
      ...getRows(input.appliedJobs, { hidden: false, applied: true }),
      ...getRows(input.hiddenJobs, { hidden: true, applied: false }),
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

    const savedCount = await upsertRows({
      rows,
      supabaseUrl,
      supabaseSecretKey,
      tableName,
    });

    return Response.json({ saved: savedCount }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("ERROR:", error.message);

      return Response.json({ error: error.message }, { status: 500 });
    }

    console.error("UNKNOWN ERROR:", error);

    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return Response.json({ skipped: true }, { status: 200 });
  }

  try {
    await deleteHiddenRows({
      supabaseUrl,
      supabaseSecretKey,
      tableName: process.env.SUPABASE_JOBS_TABLE ?? defaultTableName,
    });

    return Response.json({ deleted: true }, { status: 200 });
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
  url.searchParams.set("applied", "eq.false");

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

async function deleteHiddenRows({
  supabaseUrl,
  supabaseSecretKey,
  tableName,
}: {
  supabaseUrl: string;
  supabaseSecretKey: string;
  tableName: string;
}) {
  const url = new URL(`/rest/v1/${tableName}`, supabaseUrl);

  url.searchParams.set("hidden", "eq.true");

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
  let totalSaved = 0;
  const batches = chunkByCount(rows, maxRowsPerBatch);

  for (const batch of batches) {
    const savedCount = await upsertRowChunk({
      rows: batch,
      supabaseUrl,
      supabaseSecretKey,
      tableName,
    });

    totalSaved += savedCount;
  }

  return totalSaved;
}

async function upsertRowChunk({
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

  return rows.length;
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

async function getJobsMetaFromSupabase({
  supabaseUrl,
  supabaseSecretKey,
  tableName,
}: {
  supabaseUrl: string;
  supabaseSecretKey: string;
  tableName: string;
}) {
  await ensureJobsMetaRow({
    supabaseUrl,
    supabaseSecretKey,
    tableName,
  });

  const url = new URL(`/rest/v1/${tableName}`, supabaseUrl);

  url.searchParams.set("id", `eq.${globalMetaId}`);
  url.searchParams.set("select", "last_fetched_at,fetch_started_at");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    method: "GET",
    headers: getSupabaseHeaders(supabaseSecretKey),
  });

  if (!response.ok) {
    throw new Error(await getSupabaseErrorMessage(response));
  }

  const rows = await response.json();
  const meta = Array.isArray(rows) && isRecord(rows[0]) ? rows[0] : {};

  return {
    lastFetchedAt: getTimestampValue(meta.last_fetched_at),
    fetchStartedAt: getTimestampValue(meta.fetch_started_at),
  };
}

async function beginFetchLock({
  force,
  supabaseUrl,
  supabaseSecretKey,
  tableName,
}: {
  force: boolean;
  supabaseUrl: string;
  supabaseSecretKey: string;
  tableName: string;
}) {
  await ensureJobsMetaRow({
    supabaseUrl,
    supabaseSecretKey,
    tableName,
  });

  const now = Date.now();
  const staleFetchStartedBefore = new Date(now - maxFetchTimeMs).toISOString();
  const staleLastFetchedBefore = new Date(now - twoHoursMs).toISOString();
  const url = new URL(`/rest/v1/${tableName}`, supabaseUrl);

  url.searchParams.set("id", `eq.${globalMetaId}`);
  url.searchParams.set(
    "or",
    `(fetch_started_at.is.null,fetch_started_at.lt.${staleFetchStartedBefore})`,
  );

  if (!force) {
    url.searchParams.set(
      "and",
      `(or(last_fetched_at.is.null,last_fetched_at.lt.${staleLastFetchedBefore}))`,
    );
  }

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      ...getSupabaseHeaders(supabaseSecretKey),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      fetch_started_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(await getSupabaseErrorMessage(response));
  }

  const rows = await response.json();

  if (Array.isArray(rows) && rows.length > 0) {
    return { started: true };
  }

  const meta = await getJobsMetaFromSupabase({
    supabaseUrl,
    supabaseSecretKey,
    tableName,
  });

  return {
    started: false,
    reason: getFetchSkipReason(meta, now),
    fetchedAt: meta.lastFetchedAt ?? 0,
  };
}

async function updateFetchMeta({
  values,
  supabaseUrl,
  supabaseSecretKey,
  tableName,
}: {
  values: Record<string, string | null>;
  supabaseUrl: string;
  supabaseSecretKey: string;
  tableName: string;
}) {
  await ensureJobsMetaRow({
    supabaseUrl,
    supabaseSecretKey,
    tableName,
  });

  const url = new URL(`/rest/v1/${tableName}`, supabaseUrl);

  url.searchParams.set("id", `eq.${globalMetaId}`);

  const response = await fetch(url, {
    method: "PATCH",
    headers: getSupabaseHeaders(supabaseSecretKey),
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw new Error(await getSupabaseErrorMessage(response));
  }
}

async function ensureJobsMetaRow({
  supabaseUrl,
  supabaseSecretKey,
  tableName,
}: {
  supabaseUrl: string;
  supabaseSecretKey: string;
  tableName: string;
}) {
  const url = new URL(`/rest/v1/${tableName}`, supabaseUrl);

  url.searchParams.set("on_conflict", "id");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(supabaseSecretKey),
      Prefer: "resolution=ignore-duplicates",
    },
    body: JSON.stringify([{ id: globalMetaId }]),
  });

  if (!response.ok) {
    throw new Error(await getSupabaseErrorMessage(response));
  }
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
  applied: boolean;
  hidden_at: string | null;
  data: JobRowInput;
  updated_at: string;
};

function getRows(
  value: unknown,
  status: {
    hidden: boolean;
    applied: boolean;
  },
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).map((job) => getRow(job, status));
}

function getRow(
  job: JobRowInput,
  status: {
    hidden: boolean;
    applied: boolean;
  },
): JobRow {
  const postedAtTimestamp =
    typeof job.postedAtTimestamp === "number" ? job.postedAtTimestamp : null;
  const hiddenAtTimestamp =
    typeof job.hiddenAt === "number" ? job.hiddenAt : null;

  return {
    id: typeof job.id === "string" && job.id ? job.id : crypto.randomUUID(),
    title:
      typeof job.title === "string" && job.title ? job.title : "Untitled role",
    company:
      typeof job.company === "string" && job.company
        ? job.company
        : "Unknown company",
    location:
      typeof job.location === "string" && job.location
        ? job.location
        : "Unknown",
    posted_at: getDateValue(postedAtTimestamp),
    posted_at_timestamp: postedAtTimestamp,
    years_of_experience:
      typeof job.yearsOfExperience === "string" ? job.yearsOfExperience : null,
    linkedin_url: typeof job.linkedInUrl === "string" ? job.linkedInUrl : null,
    apply_url: typeof job.applyUrl === "string" ? job.applyUrl : null,
    hidden: status.hidden,
    applied: status.applied,
    hidden_at: getDateValue(hiddenAtTimestamp),
    data: {
      ...job,
      descriptionText:
        typeof job.descriptionText === "string"
          ? job.descriptionText.slice(0, maxDescriptionTextLength)
          : undefined,
    },
    updated_at: new Date().toISOString(),
  };
}

function chunkByCount<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function getJobsResponse(
  rows: Record<string, unknown>[],
  meta: {
    lastFetchedAt?: number;
    fetchStartedAt?: number;
  },
) {
  const jobs: JobRowInput[] = [];
  const appliedJobs: JobRowInput[] = [];
  const hiddenJobs: JobRowInput[] = [];

  for (const row of rows) {
    const job = getJobFromRow(row);

    if (row.hidden === true) {
      hiddenJobs.push(job);
    } else if (row.applied === true) {
      appliedJobs.push(job);
    } else {
      jobs.push(job);
    }
  }

  return {
    jobs,
    appliedJobs,
    hiddenJobs,
    fetchedAt: meta.lastFetchedAt ?? getLatestUpdatedAt(rows),
    fetchStartedAt: meta.fetchStartedAt,
  };
}

function getJobFromRow(row: Record<string, unknown>) {
  const data = isRecord(row.data) ? row.data : {};
  const applicationStatus = getApplicationStatus(data.applicationStatus);

  return {
    ...data,
    id: typeof row.id === "string" ? row.id : crypto.randomUUID(),
    title: typeof row.title === "string" ? row.title : "",
    company: typeof row.company === "string" ? row.company : "",
    location:
      typeof row.location === "string"
        ? row.location
        : typeof data.location === "string"
          ? data.location
          : "Unknown",
    postedAtTimestamp:
      typeof row.posted_at_timestamp === "number"
        ? row.posted_at_timestamp
        : data.postedAtTimestamp,
    yearsOfExperience:
      typeof row.years_of_experience === "string"
        ? row.years_of_experience
        : data.yearsOfExperience,
    linkedInUrl:
      typeof row.linkedin_url === "string"
        ? row.linkedin_url
        : data.linkedInUrl,
    applyUrl: typeof row.apply_url === "string" ? row.apply_url : data.applyUrl,
    hiddenAt:
      getTimestampValue(row.hidden_at) ??
      (typeof data.hiddenAt === "number" ? data.hiddenAt : undefined),
    applied:
      typeof row.applied === "boolean"
        ? row.applied
        : typeof data.applied === "boolean"
          ? data.applied
          : undefined,
    applicationStatus,
  };
}

function getApplicationStatus(value: unknown) {
  if (
    value === "TBD" ||
    value === "Screening" ||
    value === "Interview-1" ||
    value === "Interview-2" ||
    value === "Interview-3" ||
    value === "Offer" ||
    value === "Rejected"
  ) {
    return value;
  }

  return undefined;
}

function getLatestUpdatedAt(rows: Record<string, unknown>[]) {
  return rows.reduce((latestTimestamp, row) => {
    const updatedAt = getTimestampValue(row.updated_at) ?? 0;

    return Math.max(latestTimestamp, updatedAt);
  }, 0);
}

function getFetchSkipReason(
  meta: {
    lastFetchedAt?: number;
    fetchStartedAt?: number;
  },
  now: number,
) {
  if (
    meta.fetchStartedAt &&
    now - meta.fetchStartedAt < maxFetchTimeMs
  ) {
    return "in_progress";
  }

  return "fresh";
}

function getSupabaseHeaders(supabaseSecretKey: string) {
  return {
    apikey: supabaseSecretKey,
    Authorization: `Bearer ${supabaseSecretKey}`,
    "Content-Type": "application/json",
  };
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

function getDateValue(timestamp: number | null) {
  return timestamp ? new Date(timestamp).toISOString() : null;
}

function getTimestampValue(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? undefined : timestamp;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
