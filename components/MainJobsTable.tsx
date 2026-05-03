"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";
import { useState } from "react";

import { getTableCaption } from "@/components/jobs-table-shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { cn } from "@/lib/utils";

const pendingHideFlashMs = 600;

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
  const [pendingHiddenJobIds, setPendingHiddenJobIds] = useState<Set<string>>(
    () => new Set(),
  );

  function handleHide(job: JobResult) {
    setPendingHiddenJobIds((currentIds) => new Set(currentIds).add(job.id));
    onHide(job);

    window.setTimeout(() => {
      setPendingHiddenJobIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(job.id);

        return nextIds;
      });
    }, pendingHideFlashMs);
  }

  return (
    <div className="hidden md:block">
      <div className="flex max-h-[70vh] flex-col overflow-hidden rounded-md border bg-zinc-900">
       
          {/* Table Headers*/}
          <div className="z-10 bg-zinc-800">
            <Table className="table-fixed">
              <TableHeader className="">
                <TableRow>
                  <TableHead className="w-50 pl-3">Job title</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead className="text-center">LinkedIn</TableHead>
                  <TableHead className="text-center">Applied</TableHead>
                  <TableHead className="text-center">Apply</TableHead>
                  <TableHead className="text-right px-7">Hide</TableHead>
                </TableRow>
              </TableHeader>
            </Table>
          </div>
          {/* Table Body*/}
          <ScrollArea className="max-h-[calc(70vh-2.5rem)] [&_[data-slot=scroll-area-viewport]]:max-h-[calc(70vh-2.5rem)]">
            <Table className="table-fixed ">
              <colgroup>
                <col className="w-50" />
                <col className="" />
                <col className="" />
                <col className="" />
                <col className="" />
                <col className="" />
                <col className="" />
                <col className="" />
                <col className="" />
              </colgroup>

              <TableCaption className=" pb-6">
                {getTableCaption({
                  isLoading,
                  jobs: allJobs,
                  visibleJobs: jobs,
                  lastUpdatedAt,
                })}
              </TableCaption>

              <TableBody>
                {jobs.map((job) => {
                  const isPendingHide = pendingHiddenJobIds.has(job.id);

                  return (
                  <TableRow
                    key={job.id}
                    className={cn(
                      isPendingHide &&
                        "bg-destructive/15 hover:bg-destructive/20",
                    )}
                  >
                    <TableCell className="pl-3 truncate font-medium">
                      {job.title}
                    </TableCell>

                    <TableCell className="truncate">
                      {isFreshJob(job) ? (
                        <span className="inline-flex h-6 items-center border border-emerald-200 bg-emerald-50 px-2 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {job.postedAt}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {job.postedAt}
                        </span>
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

                    {/* Post */}
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
                          >
                            <ArrowSquareOut aria-hidden="true" weight="bold" />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    {/* Applied */}
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

                    <TableCell className="text-right">
                      {job.applyUrl ? (
                        <Button asChild size="sm">
                          <a
                            href={job.applyUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Apply
                            <ArrowSquareOut aria-hidden="true" weight="bold" />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No link
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant={isPendingHide ? "destructive" : "outline"}
                        onClick={() => handleHide(job)}
                        disabled={isPendingHide}
                      >
                        Hide
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}

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
          </ScrollArea>
        
      </div>
    </div>
  );
}
