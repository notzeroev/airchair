// hooks/useViewFilters.ts
import { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import type { Filter, Field } from "@/types/filters";

export function useViewFilters(tableId?: string, viewId?: string) {
  const utils = api.useUtils();
  const [filters, setFilters] = useState<Filter[]>([]);
  const [fields, setFields] = useState<Field[]>([]);

  useEffect(() => {
    if (!tableId || !viewId) return;
    const fetch = async () => {
      const result = await utils.views.getColumns.fetch({ tableId });
      setFields(
        result.columns?.map((col: any) => ({
          id: col.id,
          name: col.name,
          type: col.type,
        })) ?? []
      );
    };
    fetch();
  }, [viewId, tableId, utils.views.getColumns]);

  return { filters, setFilters, fields };
}
