"use client";

import { ColorClasses } from "@/lib/colors/colors";
import { useState } from "react";
import { api } from "@/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export function BaseTable() {
  const [baseName, setBaseName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Query to get all bases for the authenticated user
  const { data: bases, isLoading, refetch } = api.bases.getBases.useQuery();

  // Mutation to create a new base
  const createBaseMutation = api.bases.createBase.useMutation({
    onSuccess: () => {
      // Refetch bases after successful creation
      void refetch();
      setBaseName("");
      setDialogOpen(false);
    },
    onError: (error) => {
      alert(`Error creating base: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (baseName.trim()) {
      createBaseMutation.mutate({ name: baseName.trim() });
    }
  };

  if (isLoading) {
    return <div>Loading bases...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        { bases?.map((base) => (
          <div
            key={base.id}
            className={`p-4 rounded-lg border-2 border-${ColorClasses[base.color as keyof typeof ColorClasses] ?? ""} shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className="items-center space-x-4">
              <div
                className={`mb-2 bg-${ColorClasses[base.color as keyof typeof ColorClasses] ?? ""} rounded-sm h-12 w-12 flex items-center justify-center text-white font-bold text-lg`}
              >
                {base.name.substring(0, 2)}
              </div>
              <div>
                <h3 className="font-semibold truncate">{base.name}</h3>
                <p className="text-sm opacity-50 truncate">Base</p>
              </div>
            </div>
          </div>
        ))}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <div className="p-6 border border-dashed rounded-lg flex items-center justify-center cursor-pointer">
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
                  disabled={createBaseMutation.isPending || !baseName.trim()}
                  className="bg-primary text-white px-4 py-2 rounded hover:bg-primary disabled:opacity-50"
                >
                  {createBaseMutation.isPending ? 'Creating...' : 'Create Base'}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
