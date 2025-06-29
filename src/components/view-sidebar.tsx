"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Eye, TableCellsSplit } from "lucide-react";
import { cn } from "@/lib/utils";

interface ViewSidebarProps {
  tableId: string;
  viewId: string;
  baseId: string;
}

export function ViewSidebar({ tableId, viewId, baseId }: ViewSidebarProps) {
  const router = useRouter();
  
  const currentViewId = viewId;

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  const utils = api.useUtils();

  const { data: viewsData, isLoading, error } = api.views.getViews.useQuery(
    { tableId },
    { 
      enabled: !!tableId && tableId !== "undefined"
    }
  );

  const createViewMutation = api.views.createView.useMutation({
    onSuccess: async (data) => {
      await utils.views.getViews.invalidate({ tableId });
      setIsAddDialogOpen(false);
      setNewViewName("");
      // Navigate to the new view
      router.push(`/base/${baseId}/${tableId}/${data.viewId}`);
    },
    onError: (error) => {
      console.error("Failed to create view:", error);
      alert(`Error creating view: ${error.message}`);
    },
  });

  const deleteViewMutation = api.views.deleteView.useMutation({
    onSuccess: async () => {
      await utils.views.getViews.invalidate({ tableId });
      // If we deleted the current view, navigate to the first available view
      const updatedViews = await utils.views.getViews.fetch({ tableId });
      if (updatedViews && updatedViews.length > 0) {
        const firstView = updatedViews[0];
        if (firstView && currentViewId && !updatedViews.some(view => view.id === currentViewId)) {
          router.push(`/base/${baseId}/${tableId}/${firstView.id}`);
        }
      }
    },
    onError: (error) => {
      console.error("Failed to delete view:", error);
      alert(`Error deleting view: ${error.message}`);
    },
  });

  const handleCreateView = () => {
    if (newViewName.trim()) {
      createViewMutation.mutate({
        tableId,
        name: newViewName.trim(),
        type: "grid",
      });
    }
  };

  const handleDeleteView = (viewId: string) => {
    if (viewsData && viewsData.length > 1) {
      deleteViewMutation.mutate({ viewId });
    }
  };

  const handleSelectView = (viewId: string) => {
    router.push(`/base/${baseId}/${tableId}/${viewId}`);
  };

  const views = viewsData || [];

  console.log('tableId:', tableId, 'viewsData:', viewsData, 'error:', error);

  // Show error state if query fails
  if (error) {
    return (
      <div className="h-full relative">
        <Sidebar className="absolute left-0 top-0 h-full min-h-full">
          <SidebarHeader className="border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Views</h3>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <div className="px-4 py-2 text-sm text-destructive">
              Error loading views: {error.message}
            </div>
          </SidebarContent>
        </Sidebar>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      <Sidebar className="absolute left-0 top-0 h-full min-h-full">
        <SidebarContent className="p-2">
          <SidebarMenu>
            {isLoading ? (
              <div className="px-4 py-2 text-sm text-muted-foreground">
                Loading views...
              </div>
            ) : views.length === 0 ? (
              <div className="px-4 py-2 text-sm text-muted-foreground">
                No views found
              </div>
            ) : (
              views.map((view) => (
                <SidebarMenuItem key={view.id}>
                  <SidebarMenuButton
                    className={cn(
                      "w-full justify-between py-4",
                      view.id === currentViewId && "bg-blue-500/10 hover:bg-blue-500/15"
                    )}
                    onClick={() => handleSelectView(view.id)}
                  >
                    <div className="flex items-center gap-x-2">
                      <TableCellsSplit className="w-4 h-4 text-blue-500" />
                      <span className="truncate">{view.name}</span>
                    </div>
                    {views.length > 1 && (
                      <span
                        role="button"
                        tabIndex={0}
                        className="h-6 w-6 p-0 opacity-0 group-hover/menu-item:opacity-50 transition-opacity flex items-center justify-center cursor-pointer hover:text-destructive hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteView(view.id);
                        }}
                        aria-disabled={deleteViewMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))
            )}
            <div className="flex-1">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground py-4"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create new view</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New View</DialogTitle>
                    <DialogDescription>
                      Enter a name for your new view.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="View name"
                      value={newViewName}
                      onChange={(e) => setNewViewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleCreateView();
                        }
                      }}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateView}
                        disabled={!newViewName.trim() || createViewMutation.isPending}
                      >
                        {createViewMutation.isPending ? "Creating..." : "Create"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
    </div>
  );
}