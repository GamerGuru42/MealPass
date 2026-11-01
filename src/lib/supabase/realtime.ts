import { useEffect } from 'react';
import { createClient } from './client';
import { Database } from './database.types';

type OrderRow = Database['public']['Tables']['orders']['Row'];

interface UseRealtimeOrdersProps {
  cafeteriaId?: string;
  studentProfileId?: string;
  onOrderInserted?: (order: OrderRow) => void;
  onOrderUpdated?: (order: OrderRow) => void;
}

/**
 * Hook to subscribe to real-time order updates via Supabase Realtime
 */
export function useRealtimeOrders({
  cafeteriaId,
  studentProfileId,
  onOrderInserted,
  onOrderUpdated,
}: UseRealtimeOrdersProps) {
  useEffect(() => {
    // Only subscribe in browser environment
    if (typeof window === 'undefined') return;

    const supabase = createClient();
    const channelName = cafeteriaId 
      ? `cafeteria_orders_${cafeteriaId}` 
      : studentProfileId 
        ? `student_orders_${studentProfileId}` 
        : 'all_orders';

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: cafeteriaId ? `cafeteria_id=eq.${cafeteriaId}` : undefined,
        },
        (payload) => {
          if (onOrderInserted && payload.new) {
            onOrderInserted(payload.new as OrderRow);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: cafeteriaId ? `cafeteria_id=eq.${cafeteriaId}` : undefined,
        },
        (payload) => {
          if (onOrderUpdated && payload.new) {
            onOrderUpdated(payload.new as OrderRow);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cafeteriaId, studentProfileId, onOrderInserted, onOrderUpdated]);
}

