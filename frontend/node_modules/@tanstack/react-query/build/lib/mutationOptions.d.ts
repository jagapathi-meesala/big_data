import type { OmitKeyof, WithRequired } from '@tanstack/query-core';
import type { UseMutationOptions } from './types';
export declare function mutationOptions<TData = unknown, TError = unknown, TVariables = void, TContext = unknown>(options: WithRequired<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationKey'>): WithRequired<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationKey'>;
export declare function mutationOptions<TData = unknown, TError = unknown, TVariables = void, TContext = unknown>(options: OmitKeyof<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationKey'>): OmitKeyof<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationKey'>;
//# sourceMappingURL=mutationOptions.d.ts.map