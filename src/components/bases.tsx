"use client";

import { ColorClasses, type ColorIndex } from "@/lib/colors/colors";
import { useState } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "./ui/button";

export function BaseTable() {
  const [baseName, setBaseName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Query to get all bases for the authenticated user
  const bases = api.bases.getAll.useQuery();
  const createBase = api.bases.create.useMutation({
    onSuccess: () => {
      void bases.refetch();
      setBaseName("");
      setDialogOpen(false);
    },
    onError: (error) => {
      alert(`Error creating base: ${error.message}`);
    },
  });
  const deleteBase = api.bases.delete.useMutation({
    onSuccess: () => void bases.refetch(),
    onError: (error) => alert(`Error deleting base: ${error.message}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (baseName.trim()) {
      createBase.mutate({ name: baseName.trim() });
    }
  };

  if (bases.isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-fr gap-4">
        {Array.from({ length: 16 }).map((_, index) => (
          <div key={index} className="shimmer p-16 border rounded-lg flex items-center justify-center">
            <div className="w-6 h-6 text-gray-200 cursor-pointer" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-fr gap-4">
      {bases.data?.map((base) => {
        const colorClass = ColorClasses[base.color as ColorIndex];
        return (
          <div key={base.id} className="relative group h-full">
            {/* Bin icon (top left, only on hover) */}
            <Button
              variant={"ghost"}
              className="absolute top-3 right-3 z-10 opacity-0 h-6 w-6 p-0 group-hover:opacity-50 hover:opacity-100 hover:text-destructive"
              title="Delete base"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (confirm(`Delete base '${base.name}'? This cannot be undone.`)) {
                  deleteBase.mutate({ baseId: String(base.id) });
                }
              }}
              disabled={deleteBase.isPending}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Link
              href={`/base/${base.id}`}
              className={`block p-4 rounded-lg border-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
            >
              <div className="items-center space-x-4">
                <div className="flex flex-col gap-1 pb-1">
                  <div
                    className={`bg-${colorClass ?? ""} rounded-sm h-12 w-12 flex items-center justify-center text-white font-bold text-lg`}
                  >
                    {base.name.substring(0, 2)}
                  </div>
                  <h3 className="font-semibold truncate">{base.name}</h3>
                </div>
                <p className="text-sm opacity-50 truncate">Base</p>
              </div>
            </Link>
          </div>
        );
      })}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <div className="border border-dashed rounded-lg flex items-center justify-center cursor-pointer">
            <Plus className="w-6 h-6 text-gray-200 cursor-pointer" />
          </div>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Base</DialogTitle>
            <DialogDescription>
              Enter a name for your new base. This will be used to organize your data.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                id="baseName"
                type="text"
                value={baseName}
                onChange={(e) => setBaseName(e.target.value)}
                placeholder="Enter base name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                required
              />
            </div>
            <div className="flex justify-center space-x-2">
              <button
                type="submit"
                disabled={createBase.isPending || !baseName.trim()}
                className="bg-primary text-white px-4 py-2 rounded hover:bg-primary disabled:opacity-50"
              >
                {createBase.isPending ? 'Creating...' : 'Create Base'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
