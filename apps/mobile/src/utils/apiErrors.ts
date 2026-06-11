import axios from 'axios';

/** Map axios/API failures to user-friendly copy. */
export function friendlyApiError(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const serverMsg =
      typeof err.response?.data === 'object' &&
      err.response?.data &&
      'error' in err.response.data &&
      typeof (err.response.data as { error?: unknown }).error === 'string'
        ? (err.response.data as { error: string }).error
        : null;

    if (status === 503 || status === 502) {
      return 'Zygo servers are waking up — please try again in a moment.';
    }
    if (status === 401) {
      return 'Session expired. Please sign in again.';
    }
    if (status === 403) {
      return serverMsg ?? 'You do not have permission for this action.';
    }
    if (status === 404) {
      return serverMsg ?? 'We could not find that item.';
    }
    if (status === 402) {
      return serverMsg ?? 'Subscription payment required to continue.';
    }
    if (status === 400) {
      return serverMsg ?? 'Please check your details and try again.';
    }
    if (status === 409) {
      return serverMsg ?? 'This action conflicts with the current state.';
    }
    if (!status && (err.code === 'ECONNABORTED' || err.message.includes('timeout'))) {
      return 'Request timed out. Check your connection and try again.';
    }
    if (!status && err.message === 'Network Error') {
      return 'Cannot reach Zygo. Check your internet connection.';
    }
    if (serverMsg) return serverMsg;
  }

  if (err instanceof Error) {
    const msg = err.message;
    if (/status code 503/i.test(msg)) {
      return 'Zygo servers are waking up — please try again in a moment.';
    }
    if (/status code 502/i.test(msg)) {
      return 'Zygo is temporarily unavailable. Please try again shortly.';
    }
    if (/status code 401/i.test(msg)) {
      return 'Session expired. Please sign in again.';
    }
    if (/Network Error/i.test(msg)) {
      return 'Cannot reach Zygo. Check your internet connection.';
    }
    return msg;
  }

  return fallback;
}
