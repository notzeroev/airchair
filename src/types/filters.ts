// types/filters.ts
export type Filter = {
  field: Field;
  operator: "contains" | "equals" | "startsWith" | "endsWith";
  value: string;
};

// essentially a column in a table
export type Field = {
  id: string;
  name: string;
  type: string;
};

export type FilterOperator =
  | "equals"
  | "contains"
  | "not_contains"
  | "is_empty"
  | "not_empty"
  | "gt"
  | "lt";

export const FilterOperatorLabels: Record<FilterOperator, string> = {
  equals: "Equals",
  contains: "Contains",
  not_contains: "Does not contain",
  is_empty: "Is empty",
  not_empty: "Is not empty",
  gt: "Greater than",
  lt: "Less than",
};