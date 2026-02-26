import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';

export const useLiveUpdates = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    const token = localStorage.getItem('auth_token');

    // Connect to SSE endpoint
    // We pass the token in the query string as a fallback because EventSource 
    // does not support custom headers (like Authorization: Bearer).
    // We also use withCredentials: true to ensure the 'auth_token' cookie is sent if available.
    const url = new URL(`${baseUrl}/movements/live`, window.location.origin);
    if (token) {
      url.searchParams.append('token', token);
    }

    const eventSource = new EventSource(url.toString(), {
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
