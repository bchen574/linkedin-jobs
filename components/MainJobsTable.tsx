"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";

import { getTableCaption } from "@/components/jobs-table-shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isFreshJob } from "@/lib/jobs/transforms";
import type { JobResult } from "@/lib/jobs/types";

export function MainJobsTable({
  jobs,
  allJobs,
  isLoading,
  onApply,
  onHide,
  lastUpdatedAt,
}: {
  jobs: JobResult[];
  allJobs: JobResult[];
  isLoading: boolean;
  onApply: (job: JobResult) => void;
  onHide: (job: JobResult) => void;
  lastUpdatedAt?: Date;
}) {
  return (
    <div className="hidden bg-background md:block">
      <Table className="table-fixed">
        <colgroup>
          <col className="w-[calc((100%_-_21.5rem)_/_5)]" />
          <col className="w-[calc((100%_-_21.5rem)_/_5)]" />
          <col className="w-[calc((100%_-_21.5rem)_/_5)]" />
          <col className="w-[calc((100%_-_21.5rem)_/_5)]" />
          <col className="w-[calc((100%_-_21.5rem)_/_5)]" />
          <col className="w-20" />
          <col className="w-10" />
          <col className="w-32" />
          <col className="w-24" />
        </colgroup>
        <TableCaption>
          {getTableCaption({
            isLoading,
            jobs: allJobs,
            visibleJobs: jobs,
            lastUpdatedAt,
          })}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Job title</TableHead>
            <TableHead>Posted</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Experience</TableHead>
            <TableHead className="w-20 text-center">Applied</TableHead>
            <TableHead className="w-10 text-center">Post</TableHead>
            <TableHead className="w-32 text-right">Apply</TableHead>
            <TableHead className="w-24 text-right">Hide</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell className="truncate font-medium">
                {job.title}
              </TableCell>
              <TableCell className="truncate">
                {isFreshJob(job) ? (
                  <span className="inline-flex h-6 items-center border border-emerald-200 bg-emerald-50 px-2 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {job.postedAt}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{job.postedAt}</span>
                )}
              </TableCell>
              <TableCell className="truncate">{job.company}</TableCell>
              <TableCell className="truncate text-muted-foreground">
                {job.location}
              </TableCell>
              <TableCell className="truncate text-muted-foreground">
                {job.yearsOfExperience ??
                  (job.descriptionText ? "Checking..." : "Not checked")}
              </TableCell>
              <TableCell className="text-center">
                <Checkbox
                  checked={Boolean(job.applied)}
                  onCheckedChange={(checked) => {
                    if (checked === true) {
                      onApply(job);
                    }
                  }}
                  aria-label={`Mark ${job.title} as applied`}
                  className="mx-auto"
                />
              </TableCell>
              <TableCell className="text-center">
                {job.linkedInUrl ? (
                  <Button
                    asChild
                    size="icon-sm"
                    variant="outline"
                    className="mx-auto"
                  >
                    <a
                      href={job.linkedInUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open LinkedIn post for ${job.title}`}
                    >
                      <ArrowSquareOut aria-hidden="true" weight="bold" />
                    </a>
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {job.applyUrl ? (
                  <Button asChild size="sm">
                    <a href={job.applyUrl} target="_blank" rel="noreferrer">
                      Apply
                      <ArrowSquareOut aria-hidden="true" weight="bold" />
                    </a>
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">No link</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onHide(job)}
                >
                  Hide
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!allJobs.length ? (
            <TableRow>
              <TableCell
                colSpan={9}
                className="h-28 text-center text-muted-foreground"
              >
                {isLoading ? "Loading jobs..." : "No jobs found."}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
