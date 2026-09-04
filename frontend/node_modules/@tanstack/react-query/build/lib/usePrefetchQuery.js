'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var QueryClientProvider = require('./QueryClientProvider.js');

function usePrefetchQuery(options) {
  const client = QueryClientProvider.useQueryClient();

  if (!client.getQueryState(options.queryKey)) {
    client.prefetchQuery(options);
  }
}

exports.usePrefetchQuery = usePrefetchQuery;
//# sourceMappingURL=usePrefetchQuery.js.map
