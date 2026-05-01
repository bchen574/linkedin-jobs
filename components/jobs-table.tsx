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
import { useJobs } from "@/hooks/use-jobs";

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
    errorMessage,
    lastUpdatedAt,
    loadJobs,
    hideJob,
    applyJob,
    unhideJob,
  } = useJobs();
  const [isAppliedJobsOpen, setIsAppliedJobsOpen] = useState(false);
  const [isHiddenJobsOpen, setIsHiddenJobsOpen] = useState(false);

  return (
    <JobsPageLayout
      experienceFilters={experienceFilters}
      selectedExperience={selectedExperience}
      setSelectedExperience={setSelectedExperience}
      isLoading={isLoading}
      isFetchingJobs={isFetchingJobs}
      errorMessage={errorMessage}
      loadJobs={loadJobs}
    >
      <div className="md:hidden">
        <JobCards
          jobs={visibleJobs}
          isLoading={isLoading}
          emptyMessage="No jobs found."
          onApply={applyJob}
          onHide={hideJob}
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
        onApply={applyJob}
        onHide={hideJob}
        lastUpdatedAt={lastUpdatedAt}
      />

      <CollapsibleJobsSection
        title={`Applied jobs (${appliedJobs.length})`}
        description="Jobs you have marked as applied stay out of the main list."
        isOpen={isAppliedJobsOpen}
        onOpenChange={setIsAppliedJobsOpen}
      >
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
        <AppliedJobsTable jobs={appliedJobs} />
      </CollapsibleJobsSection>

      <CollapsibleJobsSection
        title={`Hidden jobs (${hiddenJobs.length})`}
        description="Results you have hidden stay out of the main list."
        isOpen={isHiddenJobsOpen}
        onOpenChange={setIsHiddenJobsOpen}
      >
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
  );
}
