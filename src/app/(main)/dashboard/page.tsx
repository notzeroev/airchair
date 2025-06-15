"use client";

import { BaseTable } from "@/components/bases";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage and organize your bases
            </p>
          </header>
          
          <section aria-label="Bases overview">
            <BaseTable />
          </section>
        </div>
      </div>
    </main>
  );
}
