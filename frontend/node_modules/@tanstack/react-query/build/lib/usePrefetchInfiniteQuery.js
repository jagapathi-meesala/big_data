'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var QueryClientProvider = require('./QueryClientProvider.js');

function usePrefetchInfiniteQuery(options) {
  const client = QueryClientProvider.useQueryClient();

  if (!client.getQueryState(options.queryKey)) {
    client.prefetchInfiniteQuery(options);
  }
}

exports.usePrefetchInfiniteQuery = usePrefetchInfiniteQuery;
//# sourceMappingURL=usePrefetchInfiniteQuery.js.map
