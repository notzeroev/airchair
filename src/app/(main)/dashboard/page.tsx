"use client";

import { BaseTable } from "@/components/bases";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center bg-background">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-2xl font-bold">
          Dashboard
        </h1>
        <BaseTable />
      </div>
    </main>
  );
}
