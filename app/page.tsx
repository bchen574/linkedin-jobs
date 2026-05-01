import { JobsTable } from "@/components/jobs-table";

export default function Home() {
  return (
    <section className="w-full py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4">
        <JobsTable />
      </div>
    </section>
  );
}
