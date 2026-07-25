import { useQueryClient } from './QueryClientProvider.mjs';

function usePrefetchInfiniteQuery(options) {
  const client = useQueryClient();

  if (!client.getQueryState(options.queryKey)) {
    client.prefetchInfiniteQuery(options);
  }
}

export { usePrefetchInfiniteQuery };
//# sourceMappingURL=usePrefetchInfiniteQuery.mjs.map
