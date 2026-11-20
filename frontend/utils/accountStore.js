import { supabase } from './supabase';

export async function accountStoreRequest(payload) {
  const { data, error } = await supabase.functions.invoke('account-store', { body: payload });
  if (error) {
    let message = error.message || 'Account store request failed.';
    if (error.context && typeof error.context.json === 'function') {
      try {
        const responseBody = await error.context.json();
        if (responseBody?.error) message = responseBody.error;
      } catch { /* Keep the SDK error when the response is not JSON. */ }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
