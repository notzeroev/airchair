'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';
import { api } from '@/trpc/react';
import LoadingIcon from '@/components/loading';

export default function Base() {
  const router = useRouter();
  const params = useParams();
  const baseId = params.id as string;

  // First, ensure tables exist (this will create a default table if none)
  const { isLoading: isTablesLoading, error: tablesError } = api.tables.getByBaseId.useQuery(
    { baseId },
    { retry: false },
  );

  // Then, resolve the default table/view (will only work if a table exists)
  const { data, isLoading: isViewLoading, error: viewError } = api.tables.resolveDefaultTableView.useQuery(
    { baseId },
    { retry: false, enabled: !isTablesLoading && !tablesError },
  );

  useEffect(() => {
    if (data) {
      router.replace(`/base/${baseId}/${data.tableId}/${data.viewId}`);
    }
  }, [data, baseId, router]);

  if (isTablesLoading || isViewLoading) {
      <div className="container mx-auto p-6 h-full">
          <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center flex flex-col items-center gap-4">
              <LoadingIcon />
              <p className="text-muted-foreground text-sm">Loading tables...</p>
          </div>
          </div>
      </div>
  }

  if (tablesError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p>Error: {tablesError.message}</p>
        </div>
      </div>
      );
  }
  
  return null;
}
