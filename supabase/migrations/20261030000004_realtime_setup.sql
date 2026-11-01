-- ====================================================================
-- MEALPASS SUPABASE REALTIME CONFIGURATION
-- Platform: MealPass (Digital Feeding & Cafeteria Platform)
-- Client: Cosmopolitan University
-- Technology Attribution: Powered by NextGen Technologies
-- ====================================================================

-- Enable publication for Realtime on relevant operational tables
-- This powers live order status push to students and live queue push to cafeteria staff

DO $$
BEGIN
    -- Check if supabase_realtime publication exists
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- Add orders to publication if not already added
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
        END IF;

        -- Add order_status_history to publication if not already added
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'order_status_history'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;
        END IF;

        -- Add ledger_entries to publication if not already added
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'ledger_entries'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.ledger_entries;
        END IF;
    END IF;
END $$;

-- Set REPLICA IDENTITY FULL on orders to allow clients to receive old and new row states
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_status_history REPLICA IDENTITY FULL;

