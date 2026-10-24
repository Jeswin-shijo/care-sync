import { api } from './client';
import type { ApiQueueBoard, ApiQueueCall, ApiQueueToken } from './types';

// The token queue (backend /queue). Tokens are operational and change by the
// minute, so screens read them straight from the server rather than through the
// hospital store.

const enc = encodeURIComponent;

export const queueApi = {
  board: () => api<ApiQueueBoard>('/queue'),
  /** Checks a patient in; `existing` when they already held today's token (it is returned, not duplicated). */
  issue: (request: { uhid?: string; appointmentId?: string; priority?: boolean; note?: string }) =>
    api<{ token: ApiQueueToken; existing: boolean }>('/queue/tokens', { method: 'POST', body: request }),
  /** `finish` is the room's current token; the API requires it while the room has one. */
  callNext: (counter: string, finish?: string) => api<ApiQueueCall>('/queue/next', { method: 'POST', body: { counter, finish } }),
  callToken: (id: string, counter: string, finish?: string) =>
    api<ApiQueueCall>(`/queue/tokens/${enc(id)}/call`, { method: 'POST', body: { counter, finish } }),
  recall: (id: string) => api<ApiQueueToken>(`/queue/tokens/${enc(id)}/recall`, { method: 'POST' }),
  skip: (id: string) => api<ApiQueueToken>(`/queue/tokens/${enc(id)}/skip`, { method: 'POST' }),
  requeue: (id: string) => api<ApiQueueToken>(`/queue/tokens/${enc(id)}/requeue`, { method: 'POST' }),
  complete: (id: string) => api<ApiQueueToken>(`/queue/tokens/${enc(id)}/complete`, { method: 'POST' }),
  cancel: (id: string) => api<ApiQueueToken>(`/queue/tokens/${enc(id)}/cancel`, { method: 'POST' }),
};
