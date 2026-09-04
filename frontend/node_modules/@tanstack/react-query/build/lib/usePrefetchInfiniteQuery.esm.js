import { useQueryClient } from './QueryClientProvider.esm.js';

function usePrefetchInfiniteQuery(options) {
  const client = useQueryClient();

  if (!client.getQueryState(options.queryKey)) {
    client.prefetchInfiniteQuery(options);
  }
}

export { usePrefetchInfiniteQuery };
//# sourceMappingURL=usePrefetchInfiniteQuery.esm.js.map
