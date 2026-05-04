"use client";

import { useState } from "react";

import { AppliedJobsTable } from "@/components/AppliedJobsTable";
import { HiddenJobsTable } from "@/components/HiddenJobsTable";
import { JobsPageLayout } from "@/components/JobsPageLayout";
import { MainJobsTable } from "@/components/MainJobsTable";
import {
  CollapsibleJobsSection,
  getTableCaption,
  JobCards,
} from "@/components/jobs-table-shared";
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
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useJobs } from "@/hooks/use-jobs";

type CleanupToast = {
  hiddenCount: number;
  experienceUpdatedCount: number;
};

const jobActionDelayMs = 350;

export function JobsTable() {
  const {
    jobs,
    appliedJobs,
    hiddenJobs,
    visibleJobs,
    experienceFilters,
    selectedExperience,
    setSelectedExperience,
    isLoading,
    isFetchingJobs,
    isCleaningUpJobs,
    isDeletingHiddenJobs,
    errorMessage,
    lastUpdatedAt,
    loadJobs,
    hideJob,
    applyJob,
    unapplyJob,
    updateApplicationStatus,
    unhideJob,
    deleteHiddenJobs,
    cleanupJobs,
  } = useJobs();
  const [isHiddenJobsOpen, setIsHiddenJobsOpen] = useState(false);
  const [cleanupToast, setCleanupToast] = useState<CleanupToast>();

  async function handleCleanupJobs() {
    const cleanupResult = await cleanupJobs();

    setCleanupToast(cleanupResult);

    return cleanupResult;
  }

  function applyJobWithDelay(job: Parameters<typeof applyJob>[0]) {
    window.setTimeout(() => {
      void applyJob(job);
    }, jobActionDelayMs);
  }

  function hideJobWithDelay(job: Parameters<typeof hideJob>[0]) {
    window.setTimeout(() => {
      void hideJob(job);
    }, jobActionDelayMs);
  }

  return (
    <ToastProvider>
      <JobsPageLayout
        experienceFilters={experienceFilters}
        selectedExperience={selectedExperience}
        setSelectedExperience={setSelectedExperience}
        isLoading={isLoading}
        isFetchingJobs={isFetchingJobs}
        isCleaningUpJobs={isCleaningUpJobs}
        errorMessage={errorMessage}
        loadJobs={loadJobs}
        cleanupJobs={handleCleanupJobs}
      >
        <div className="md:hidden">
          <JobCards
            jobs={visibleJobs}
            isLoading={isLoading}
            emptyMessage="No jobs found."
            onApply={applyJobWithDelay}
            onHide={hideJobWithDelay}
          />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {getTableCaption({
              isLoading,
              jobs,
              visibleJobs,
              lastUpdatedAt,
            })}
          </p>
        </div>

        <MainJobsTable
          jobs={visibleJobs}
          allJobs={jobs}
          isLoading={isLoading}
          onApply={applyJobWithDelay}
          onHide={hideJobWithDelay}
          lastUpdatedAt={lastUpdatedAt}
        />

        <section className="mt-6 flex flex-col gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-normal">
              Applied jobs ({appliedJobs.length})
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Jobs you have marked as applied stay out of the main list.
            </p>
          </div>
          <div className="md:hidden">
            <JobCards
              jobs={appliedJobs}
              isLoading={false}
              emptyMessage="Applied jobs will appear here."
            />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {appliedJobs.length
                ? `${appliedJobs.length} applied jobs.`
                : "No applied jobs."}
            </p>
          </div>
          <AppliedJobsTable
            jobs={appliedJobs}
            onStatusChange={updateApplicationStatus}
            onUnapply={unapplyJob}
          />
        </section>

        <CollapsibleJobsSection
          title={`Hidden jobs (${hiddenJobs.length})`}
          description="Results you have hidden stay out of the main list."
          isOpen={isHiddenJobsOpen}
          onOpenChange={setIsHiddenJobsOpen}
        >
          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!hiddenJobs.length || isDeletingHiddenJobs}
                >
                  Delete all Hidden Jobs
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all hidden jobs?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes every hidden job from storage.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void deleteHiddenJobs()}
                    disabled={isDeletingHiddenJobs}
                  >
                    Delete all Hidden Jobs
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <div className="md:hidden">
            <JobCards
              jobs={hiddenJobs}
              isLoading={false}
              emptyMessage="Hidden jobs will appear here."
              onUnhide={unhideJob}
            />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {hiddenJobs.length
                ? `${hiddenJobs.length} hidden jobs.`
                : "No hidden jobs."}
            </p>
          </div>
          <HiddenJobsTable jobs={hiddenJobs} onUnhide={unhideJob} />
        </CollapsibleJobsSection>
      </JobsPageLayout>
      <Toast
        open={Boolean(cleanupToast)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setCleanupToast(undefined);
          }
        }}
      >
        <ToastTitle>AI cleanup complete</ToastTitle>
        <ToastDescription>
          {cleanupToast?.hiddenCount ?? 0} jobs are now hidden, and job
          experience updated for {cleanupToast?.experienceUpdatedCount ?? 0}{" "}
          jobs.
        </ToastDescription>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}
