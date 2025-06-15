"use client";

import { BaseTable } from "@/components/bases";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">          
          <section aria-label="Bases overview">
            <BaseTable />
          </section>
        </div>
      </div>
    </main>
  );
}
