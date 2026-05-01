"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { JobResult } from "@/lib/jobs/types";

export function HiddenJobsTable({
  jobs,
  onUnhide,
}: {
  jobs: JobResult[];
  onUnhide: (job: JobResult) => void;
}) {
  return (
    <div className="hidden bg-background md:block">
      <Table className="table-fixed">
        <colgroup>
          <col className="w-[calc((100%_-_17.5rem)_/_5)]" />
          <col className="w-[calc((100%_-_17.5rem)_/_5)]" />
          <col className="w-[calc((100%_-_17.5rem)_/_5)]" />
          <col className="w-[calc((100%_-_17.5rem)_/_5)]" />
          <col className="w-[calc((100%_-_17.5rem)_/_5)]" />
          <col className="w-10" />
          <col className="w-32" />
          <col className="w-28" />
        </colgroup>
        <TableCaption>
          {jobs.length ? `${jobs.length} hidden jobs.` : "No hidden jobs."}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Job title</TableHead>
            <TableHead>Posted</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Experience</TableHead>
            <TableHead className="w-10 text-center">Post</TableHead>
            <TableHead className="w-32 text-right">Apply</TableHead>
            <TableHead className="w-28 text-right">Restore</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell className="truncate font-medium">
                {job.title}
              </TableCell>
              <TableCell className="truncate text-muted-foreground">
                {job.postedAt}
              </TableCell>
              <TableCell className="truncate">{job.company}</TableCell>
              <TableCell className="truncate text-muted-foreground">
                {job.location}
              </TableCell>
              <TableCell className="truncate text-muted-foreground">
                {job.yearsOfExperience ?? "Not checked"}
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
                  onClick={() => onUnhide(job)}
                >
                  Unhide
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!jobs.length ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="h-20 text-center text-muted-foreground"
              >
                Hidden jobs will appear here.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
