"use client";

import { BaseTable } from "@/components/bases";
import { useLayoutContext } from "@/context/LayoutProvider";
import { useEffect } from "react";

export default function Home() {

  const { setColorClass } = useLayoutContext();

  useEffect(() => {
    if (setColorClass) {
      setColorClass('bg-primary');
    }
  }, [setColorClass]);

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
