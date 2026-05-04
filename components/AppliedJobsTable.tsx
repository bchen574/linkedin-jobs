"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
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
import type { ApplicationStatus, JobResult } from "@/lib/jobs/types";
import { cn } from "@/lib/utils";

const tableColumns = [
  "w-80",
  "w-20",
  "w-20",
  "",
  "",
  "w-40",
  "w-36",
  "w-20",
] as const;
const applicationStatuses: ApplicationStatus[] = [
  "TBD",
  "Screening",
  "Interview-1",
  "Interview-2",
  "Interview-3",
  "Offer",
  "Rejected",
];

export function AppliedJobsTable({
  jobs,
  onStatusChange,
  onUnapply,
}: {
  jobs: JobResult[];
  onStatusChange: (job: JobResult, status: ApplicationStatus) => void;
  onUnapply: (job: JobResult) => void;
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
                <TableHead className={tableColumns[6]}>Status</TableHead>
                <TableHead className={cn(tableColumns[7], "text-center")}>
                  Applied
                </TableHead>
              </TableRow>
            </TableHeader>
          </Table>
        </div>
        {/* Table Body*/}
        <ScrollArea className="max-h-[calc(70vh-2.5rem)] [&_[data-slot=scroll-area-viewport]]:max-h-[calc(70vh-2.5rem)]">
          <Table className="table-fixed ">
            <TableCaption className=" pb-6">
              {jobs.length ? `${jobs.length} applied jobs.` : "No applied jobs."}
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
                  <TableCell className={tableColumns[6]}>
                    <ApplicationStatusCombobox
                      status={job.applicationStatus ?? "TBD"}
                      onStatusChange={(status) => onStatusChange(job, status)}
                    />
                  </TableCell>
                  <TableCell className={cn(tableColumns[7], "text-center")}>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Checkbox
                          checked
                          aria-label={`Unmark ${job.title} as applied`}
                          className="mx-auto"
                        />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Mark this job as not applied?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will move {job.title} back into your active job
                            list.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onUnapply(job)}>
                            Mark as not applied
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
              {!jobs.length ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-20 text-center text-muted-foreground"
                  >
                    Applied jobs will appear here.
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

function ApplicationStatusCombobox({
  status,
  onStatusChange,
}: {
  status: ApplicationStatus;
  onStatusChange: (status: ApplicationStatus) => void;
}) {
  return (
    <Combobox
      items={applicationStatuses}
      value={status}
      onValueChange={(value) => {
        if (value) {
          onStatusChange(value);
        }
      }}
    >
      <ComboboxInput
        aria-label="Application status"
        className={cn("w-full", getApplicationStatusClassName(status))}
        readOnly
      />
      <ComboboxContent>
        <ComboboxEmpty>No statuses found.</ComboboxEmpty>
        <ComboboxList>
          {(applicationStatus) => (
            <ComboboxItem key={applicationStatus} value={applicationStatus}>
              {applicationStatus}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function getApplicationStatusClassName(status: ApplicationStatus) {
  if (status === "Rejected") {
    return "border-destructive/40 bg-destructive/10 text-destructive";
  }

  if (status === "TBD") {
    return "border-border text-foreground";
  }

  return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
}
