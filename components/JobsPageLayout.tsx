"use client";

import { ArrowClockwise } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { JobSearchProgress } from "@/components/jobs-table-shared";
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
import type { LoadJobsOptions } from "@/lib/jobs/types";

type ExperienceFilter = {
  label: string;
  count: number;
};

export function JobsPageLayout({
  experienceFilters,
  selectedExperience,
  setSelectedExperience,
  isLoading,
  isFetchingJobs,
  errorMessage,
  loadJobs,
  children,
}: {
  experienceFilters: ExperienceFilter[];
  selectedExperience: string;
  setSelectedExperience: (experience: string) => void;
  isLoading: boolean;
  isFetchingJobs: boolean;
  errorMessage?: string;
  loadJobs: (options?: LoadJobsOptions) => void | Promise<void>;
  children: ReactNode;
}) {
  return (
    <>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">
              UX Design Jobs on LinkedIn
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your LinkedIn job search organized and enriched with AI.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadJobs({ force: true })}
              disabled={isLoading}
            >
              <ArrowClockwise aria-hidden="true" weight="bold" />
              Refresh
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" disabled>
                  <ArrowClockwise aria-hidden="true" weight="bold" />
                  Refresh all
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Refresh all job results?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will run a full past-month LinkedIn search and may take
                    several minutes. Hidden jobs will stay hidden.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      void loadJobs({
                        force: true,
                        postedWithin: "month",
                        replaceVisible: true,
                      })
                    }
                  >
                    Refresh all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {errorMessage ? (
          <div className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        {isFetchingJobs ? <JobSearchProgress /> : null}

        <div className="flex flex-wrap gap-2">
          {experienceFilters.map((filter) => (
            <Button
              key={filter.label}
              type="button"
              size="sm"
              variant={
                selectedExperience === filter.label ? "default" : "outline"
              }
              onClick={() => setSelectedExperience(filter.label)}
            >
              {filter.label}
              <span className="ml-1 inline-flex min-w-5 items-center justify-center bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground group-data-[variant=default]/button:bg-primary-foreground group-data-[variant=default]/button:text-primary">
                {filter.count}
              </span>
            </Button>
          ))}
        </div>

        {children}
    </>
  );
}
