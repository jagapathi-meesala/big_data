import type { FetchQueryOptions, QueryKey, WithRequired } from '@tanstack/query-core';
export declare function usePrefetchQuery<TQueryFnData = unknown, TError = unknown, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(options: WithRequired<FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey'>): void;
//# sourceMappingURL=usePrefetchQuery.d.ts.map