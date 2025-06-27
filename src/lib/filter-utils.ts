export function getSupabaseFilter<T>(column_id: string, operator: string, value_text?: string, value_number?: number, column_type: "text" | "number" = "text") {
  return (query: any) => {
    const value = column_type === "number" ? value_number : value_text;
    switch (operator) {
      case "equals":
        return query.eq(column_id, value);
      case "contains":
        if (typeof value === "string") {
          return query.ilike(column_id, `%${value}%`);
        }
        return query;
      case "not_contains":
        if (typeof value === "string") {
          return query.not(column_id, "ilike", `%${value}%`);
        }
        return query;
      case "is_empty":
        return query.is(column_id, null);
      case "not_empty":
        return query.not(column_id, "is", null);
      case "gt":
        if (typeof value === "number") {
          return query.gt(column_id, value);
        }
        return query;
      case "lt":
        if (typeof value === "number") {
          return query.lt(column_id, value);
        }
        return query;
      default:
        return query;
    }
  };
}

/**
 * Applies an array of filters to a Supabase query using the PostgrestFilterBuilder API.
 * This function expects the query to be a PostgrestFilterBuilder, not the base PostgrestQueryBuilder.
 */
export function applySupabaseFilters<T>(
  query: any, // Use 'any' to allow chaining filter methods (eq, ilike, etc.)
  filters: Array<{
    column_id: string;
    operator: string;
    value_text?: string;
    value_number?: number;
    column_type?: "text" | "number";
  }>
) {
  filters.forEach(({ column_id, operator, value_text, value_number, column_type }) => {
    query = getSupabaseFilter<T>(column_id, operator, value_text, value_number, column_type)(query);
  });
  return query;
}