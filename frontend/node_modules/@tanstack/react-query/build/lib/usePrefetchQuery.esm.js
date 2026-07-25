import { useQueryClient } from './QueryClientProvider.esm.js';

function usePrefetchQuery(options) {
  const client = useQueryClient();

  if (!client.getQueryState(options.queryKey)) {
    client.prefetchQuery(options);
  }
}

export { usePrefetchQuery };
//# sourceMappingURL=usePrefetchQuery.esm.js.map
