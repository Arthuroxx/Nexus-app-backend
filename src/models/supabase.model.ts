export interface SupabaseError {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}

export interface QueryResult<T> {
  data: T;
  error: SupabaseError | null;
}
