import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';

export const useLiveUpdates = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

    // Connect to SSE endpoint
    // we use withCredentials: true to ensure the 'auth_token' cookie is sent.
    // This is a standard EventSource option for cross-origin credential support.
    const eventSource = new EventSource(`${baseUrl}/movements/live`, {
      withCredentials: true,
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_MOVEMENT') {
          // Invalidate relevant queries to fetch fresh data automatically
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['movements'] });
          queryClient.invalidateQueries({ queryKey: ['stock-on-hand'] });
        }
      } catch {
        // Silently ignore parse errors to prevent console spam
      }
    };

    eventSource.onerror = () => {
      // EventSource tries to automatically reconnect, so we don't need to manually recreate it
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient, isAuthenticated]);
};
