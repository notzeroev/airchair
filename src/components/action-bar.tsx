'use client'

import { AlignJustify, ArrowDownUp, ExternalLink, EyeOff, ListFilter, MoveVertical, PaintBucket, Search, Sparkle, TableCellsSplit } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { FilterBuilder } from "./filter-builder";
import { ColumnManager } from "./column-manager";
import { useSidebar } from "./ui/sidebar";
import { api } from "@/trpc/react";
import { SortBuilder } from "./sort-builder";
import { GlobalSearch } from "./global-search";

type ActionBarProps = {
  tableId: string;
  viewId: string;
  query: string;
  setQuery: (query: string) => void;
};

export const ActionBar = ({ viewId, tableId, query, setQuery }: ActionBarProps) => {
  const { toggleSidebar } = useSidebar();

  // Fetch all views for the table
  const { data: viewsData, isLoading: isLoadingViews } = api.views.getViews.useQuery(
    { tableId },
    { enabled: !!tableId }
  );
  // Find the current view by viewId
  const currentView = viewsData?.find((view) => view.id === viewId);

  return (
    <div className="flex items-start justify-between py-2 px-4 border-b bg-background">
      <div className="flex flex-wrap align-center gap-2">
        
        <Button variant="ghost" className="cursor-pointer" onClick={toggleSidebar}>
            <AlignJustify className="w-4 h-4" />
            <span className="">Views</span>
        </Button>

        <div className="h-5 w-[1px] bg-border my-auto"></div>

        <Button variant="ghost">
            <TableCellsSplit className="w-4 h-4 text-blue-500" />
            <span className="w-24 truncate text-left">{isLoadingViews ? "Loading..." : currentView?.name || "View"}</span>
        </Button>

        <div className="h-5 w-[1px] my-auto"></div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="cursor-pointer">
                <EyeOff className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-70 p-4">
            <ColumnManager viewId={viewId} tableId={tableId} />
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="cursor-pointer">
                <ListFilter className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-140 p-4">
            <FilterBuilder viewId={viewId} tableId={tableId} />
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="cursor-pointer">
                <ArrowDownUp className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-100 p-4">
            <SortBuilder viewId={viewId} tableId={tableId} />
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="cursor-pointer">
                <PaintBucket className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem disabled>Feature coming soon</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="cursor-pointer">
                <MoveVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem disabled>Feature coming soon</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="cursor-pointer">
                <ExternalLink className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem disabled>Feature coming soon</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="cursor-pointer">
                <Sparkle className="w-4 h-4" />
                <span className="">Create AI Fields</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem disabled>Feature coming soon</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <Search className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <GlobalSearch tableId={tableId} query={query} setQuery={setQuery} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}