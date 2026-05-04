"use client";

import { ArrowSquareOut, Eye } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
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
import type { JobResult } from "@/lib/jobs/types";
import { cn } from "@/lib/utils";

const tableColumns = [
  "w-80",
  "w-20",
  "w-20",
  "",
  "",
  "w-40",
  "w-12 pr-12",
] as const;

export function HiddenJobsTable({
  jobs,
  onUnhide,
}: {
  jobs: JobResult[];
  onUnhide: (job: JobResult) => void;
}) {
  return (
    <div className="hidden md:block">
      <div className="flex max-h-[70vh] flex-col overflow-hidden rounded-md border bg-zinc-900">
        {/* Table Headers*/}
        <div className="z-10 bg-zinc-800">
          <Table className="table-fixed">
            <TableHeader className="">
              <TableRow>
                <TableHead className={tableColumns[0]}>Job title</TableHead>
                <TableHead
                  className={cn(tableColumns[1], "px-1 text-center")}
                  aria-label="LinkedIn"
                />
                <TableHead className={tableColumns[2]}>Posted</TableHead>
                <TableHead className={tableColumns[3]}>Company</TableHead>
                <TableHead className={tableColumns[4]}>Location</TableHead>
                <TableHead className={tableColumns[5]}>Experience</TableHead>
                <TableHead
                  className={cn(tableColumns[6], "px-1 text-center")}
                  aria-label="Restore"
                />
              </TableRow>
            </TableHeader>
          </Table>
        </div>
        {/* Table Body*/}
        <ScrollArea className="max-h-[calc(70vh-2.5rem)] [&_[data-slot=scroll-area-viewport]]:max-h-[calc(70vh-2.5rem)]">
          <Table className="table-fixed ">
            <TableCaption className=" pb-6">
              {jobs.length ? `${jobs.length} hidden jobs.` : "No hidden jobs."}
            </TableCaption>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell
                    className={cn(tableColumns[0], "truncate font-medium")}
                  >
                    {job.title}
                  </TableCell>
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
                          aria-label={`Open LinkedIn post for ${job.title}`}
                        >
                          <ArrowSquareOut aria-hidden="true" weight="bold" />
                        </a>
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(
                      tableColumns[2],
                      "truncate text-muted-foreground",
                    )}
                  >
                    {job.postedAt}
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
                    {job.yearsOfExperience ?? "Not checked"}
                  </TableCell>
                  <TableCell className={cn(tableColumns[6], "text-center")}>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      onClick={() => onUnhide(job)}
                      aria-label={`Restore ${job.title}`}
                      className="mx-auto"
                    >
                      <Eye aria-hidden="true" weight="bold" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!jobs.length ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-20 text-center text-muted-foreground"
                  >
                    Hidden jobs will appear here.
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
