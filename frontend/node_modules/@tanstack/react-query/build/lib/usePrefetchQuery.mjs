import { useQueryClient } from './QueryClientProvider.mjs';

function usePrefetchQuery(options) {
  const client = useQueryClient();

  if (!client.getQueryState(options.queryKey)) {
    client.prefetchQuery(options);
  }
}

export { usePrefetchQuery };
//# sourceMappingURL=usePrefetchQuery.mjs.map
