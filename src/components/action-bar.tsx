'use client'

import { AlignJustify, ArrowDownUp, ExternalLink, EyeOff, List, ListFilter, MoveVertical, PaintBucket, Search, Sparkle, TableCellsSplit } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { FilterBuilder } from "./filter-builder";
import { useSidebar } from "./ui/sidebar";

type ActionBarProps = {
  tableId: string;
  viewId: string;
};

export const ActionBar = ({ viewId, tableId }: ActionBarProps) => {
  const { toggleSidebar } = useSidebar();

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
            <span className="">Grid view</span>
        </Button>

        <div className="h-5 w-[1px] my-auto"></div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="cursor-pointer">
                <EyeOff className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem disabled>Feature coming soon</DropdownMenuItem>
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
          <DropdownMenuContent align="start">
            <DropdownMenuItem disabled>Feature coming soon</DropdownMenuItem>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <Search className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem disabled>Feature coming soon</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}