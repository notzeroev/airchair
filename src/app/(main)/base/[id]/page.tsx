"use client";

import { useParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { api } from "@/trpc/react";
import { useLayoutContext } from "@/context/LayoutProvider";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DynamicTable } from "@/components/dynamic-table";
import { ActionBar } from "@/components/action-bar";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ColorClasses, ColorIndex } from "@/lib/colors/colors";
import { base } from "@faker-js/faker";
import { set } from "zod";
import LoadingIcon from "@/components/loading";

export default function BaseDetailPage() {
  const params = useParams();
  const baseId = params.id as string;
  const [tableName, setTableName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("");
  
  // Scroll state and refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const { setColorClass } = useLayoutContext();
  const { setBaseName } = useLayoutContext();

  const baseData = api.bases.getById.useQuery({ baseId });

  const colorClass = ColorClasses[baseData.data?.color as ColorIndex];
  const baseName = baseData.data?.name;

  useEffect(() => {
    if (colorClass && setColorClass) {
      setColorClass(colorClass);
    }
  }, [colorClass, setColorClass]);

  useEffect(() => {
    if (baseName && setBaseName) {
      setBaseName(baseName);
    }
  }, [baseName, setBaseName]);

  const { 
    data: tables, 
    isLoading, 
    error 
  } = api.tables.getByBaseId.useQuery(
    { baseId },
    {
      enabled: !!baseId,
    }
  );

  // Create table mutation
  const utils = api.useUtils();
  const createTable = api.tables.create.useMutation({
    onSuccess: (newTable) => {
      void utils.tables.getByBaseId.invalidate({ baseId });
      setTableName("");
      setDialogOpen(false);
      setActiveTab(newTable.id); // Switch to the newly created table
    },
    onError: (error) => {
      alert(`Error creating table: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tableName.trim()) {
      createTable.mutate({ 
        baseId, 
        name: tableName.trim() 
      });
    }
  };

  // Scroll functions
  const checkScrollability = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  // Set default active tab when tables load
  if (tables && tables.length > 0 && !activeTab) {
    setActiveTab(tables[0]!.id);
  }

  // Setup scroll event listeners and initial check
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      checkScrollability();
      container.addEventListener('scroll', checkScrollability);
      
      // Check scrollability when tables change
      const resizeObserver = new ResizeObserver(checkScrollability);
      resizeObserver.observe(container);
      
      return () => {
        container.removeEventListener('scroll', checkScrollability);
        resizeObserver.disconnect();
      };
    }
  }, [tables]);

  if (isLoading) {
    return (
        <div className="container mx-auto p-6 h-full">
            <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center flex flex-col items-center gap-4">
                <LoadingIcon />
                <p className="text-muted-foreground text-sm">Loading tables...</p>
            </div>
            </div>
        </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-md mx-auto text-center space-y-4">
          <h2 className="text-2xl font-bold text-destructive">Error</h2>
          <p className="text-muted-foreground">
            {error.message || "Failed to load tables for this base"}
          </p>
        </div>
      </div>
    );
  }

  // Since we auto-create a table if none exist, we should always have tables
  if (!tables || tables.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center flex flex-col items-center gap-4">
              <LoadingIcon />
              <p className="text-muted-foreground text-sm">Setting up your first table...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
        {/* Hidden color swatches to ensure Tailwind builds all color classes */}
        <div className="hidden">
            <div className="bg-red-500 bg-red-500/90"></div>
            <div className="bg-blue-500 bg-blue-500/90"></div>
            <div className="bg-green-500 bg-green-500/90"></div>
            <div className="bg-yellow-500 bg-yellow-500/90"></div>
            <div className="bg-purple-500 bg-purple-500/90"></div>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full">
            <div className="flex items-center bg-black relative">
              {/* Left scroll button */}
              {canScrollLeft && (
                <button
                  onClick={scrollLeft}
                  className={`absolute left-0 z-10 h-full px-2 ${colorClass} to-transparent text-white transition-colors`}
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              
              {/* Scrollable tabs container */}
              <div 
                ref={scrollContainerRef}
                className={`overflow-x-auto scrollbar-hide flex-1 ${colorClass}/90`}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <div className="flex">
                  <TabsList className="pt-1 px-4 w-max justify-start border-0">
                      {tables.map((table) => (
                      <TabsTrigger 
                          key={table.id} 
                          value={table.id}
                          className="rounded-t-sm whitespace-nowrap"
                      >
                          {table.name}
                      </TabsTrigger>
                      ))}
                      
                      {/* Plus button as part of tabs */}
                      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                          <button className="flex items-center justify-center text-white px-2 hover:scale-120 transition-transform duration-200 ease-in-out">
                              <Plus className="h-4 w-4" />
                          </button>
                      </DialogTrigger>
                      <DialogContent>
                          <DialogHeader>
                          <DialogTitle>Create New Table</DialogTitle>
                          <DialogDescription>
                              Enter a name for your new table. This will be added to your current base.
                          </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleSubmit} className="space-y-4">
                          <div>
                              <input
                              id="tableName"
                              type="text"
                              value={tableName}
                              onChange={(e) => setTableName(e.target.value)}
                              placeholder="Enter table name"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                              required
                              />
                          </div>
                          <div className="flex justify-center space-x-2">
                              <button
                              type="submit"
                              disabled={createTable.isPending || !tableName.trim()}
                              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary disabled:opacity-50 flex items-center gap-2 min-w-30 justify-center"
                              >
                              {createTable.isPending ? (
                                <div className="h-5 w-5 border border-current border-t-transparent rounded-full animate-spin" />
                              ) : null}
                              {createTable.isPending ? '' : 'Create Table'}
                              </button>
                          </div>
                          </form>
                      </DialogContent>
                      </Dialog>
                  </TabsList>
                </div>
              </div>
              
              {/* Right scroll button */}
              {canScrollRight && (
                <button
                  onClick={scrollRight}
                  className={`absolute right-0 z-10 h-full px-2 ${colorClass} to-transparent text-white transition-colors`}
                  aria-label="Scroll right"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
        </div>

        {tables.map((table) => (
          <TabsContent key={table.id} value={table.id} className="mt-0 border-0 p-0 h-full">
            <ActionBar></ActionBar>
            <DynamicTable tableId={table.id} tableName={table.name} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
