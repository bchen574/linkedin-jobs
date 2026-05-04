"use client";

import { ArrowSquareOut, Eye, EyeSlash } from "@phosphor-icons/react";
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
const pendingApplyFlashMs = 600;
const tableColumns = [
  "w-80",
  "w-20",
  "w-20",
  "",
  "",
  "w-40",
  "w-20",
  "w-12 pr-12",
] as const;

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
  const [pendingAppliedJobIds, setPendingAppliedJobIds] = useState<Set<string>>(
    () => new Set(),
  );

  function handleApply(job: JobResult) {
    setPendingAppliedJobIds((currentIds) => new Set(currentIds).add(job.id));
    onApply(job);

    window.setTimeout(() => {
      setPendingAppliedJobIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(job.id);

        return nextIds;
      });
    }, pendingApplyFlashMs);
  }

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
                <TableHead className={cn(tableColumns[0], "pl-3")}>
                  Job title
                </TableHead>
                <TableHead
                  className={cn(tableColumns[1], "px-1 text-center")}
                  aria-label="LinkedIn"
                />
                <TableHead className={tableColumns[2]}>Posted</TableHead>
                <TableHead className={tableColumns[3]}>Company</TableHead>
                <TableHead className={tableColumns[4]}>Location</TableHead>
                <TableHead className={(tableColumns[5], "text-left")}>
                  Experience
                </TableHead>
                <TableHead className={cn(tableColumns[6], "text-center")}>
                  Applied
                </TableHead>
                <TableHead
                  className={cn(tableColumns[7], "px-1 text-center")}
                  aria-label="Hide"
                />
              </TableRow>
            </TableHeader>
          </Table>
        </div>
        {/* Table Body*/}
        <ScrollArea className="max-h-[calc(70vh-2.5rem)] [&_[data-slot=scroll-area-viewport]]:max-h-[calc(70vh-2.5rem)]">
          <Table className="table-fixed ">
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
                const isPendingApply = pendingAppliedJobIds.has(job.id);

                return (
                  <TableRow
                    key={job.id}
                    className={cn(
                      isPendingApply && "bg-blue-500/15 hover:bg-blue-500/20",
                      isPendingHide &&
                        "bg-destructive/15 hover:bg-destructive/20",
                    )}
                  >
                    <TableCell
                      className={cn(
                        tableColumns[0],
                        "pl-3 truncate font-medium",
                      )}
                    >
                      {job.title}
                    </TableCell>

                    {/* Post */}
                    <TableCell className={cn(tableColumns[1], "text-center")}>
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

                    <TableCell className={cn(tableColumns[2], "truncate")}>
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

                    <TableCell className={cn(tableColumns[3], "truncate")}>
                      {job.company}
                    </TableCell>

                    <TableCell
                      className={cn(
                        tableColumns[4],
                        "truncate text-muted-foreground",
                      )}
                    >
                      {job.location}
                    </TableCell>

                    <TableCell
                      className={cn(
                        tableColumns[5],
                        "truncate text-muted-foreground",
                      )}
                    >
                      {job.yearsOfExperience ??
                        (job.descriptionText ? "Checking..." : "Not checked")}
                    </TableCell>

                    {/* Applied */}
                    <TableCell className={cn(tableColumns[6], "text-center")}>
                      <Checkbox
                        checked={Boolean(job.applied)}
                        onCheckedChange={(checked) => {
                          if (checked === true) {
                            handleApply(job);
                          }
                        }}
                        aria-label={`Mark ${job.title} as applied`}
                        className="mx-auto"
                        disabled={isPendingApply}
                      />
                    </TableCell>

                    <TableCell className={cn(tableColumns[7], "text-center")}>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant={isPendingHide ? "destructive" : "outline"}
                        onClick={() => handleHide(job)}
                        disabled={isPendingHide}
                        aria-label={`Hide ${job.title}`}
                        className="mx-auto"
                      >
                        {isPendingHide ? (
                          <EyeSlash aria-hidden="true" weight="bold" />
                        ) : (
                          <Eye aria-hidden="true" weight="bold" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}

              {!allJobs.length ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
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
