/**
 * Cosmopolitan University MealPass - Database Schema TypeScript Definitions
 * Powered by NextGen Technologies
 * 
 * Auto-compatible with Supabase PostgreSQL types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRoleType =
  | 'STUDENT'
  | 'CAFETERIA_STAFF'
  | 'CAFETERIA_HEAD'
  | 'FINANCE_ADMIN'
  | 'SUPER_ADMIN';

export type TransactionType =
  | 'ALLOCATION'
  | 'MEAL_DEDUCTION'
  | 'REFUND'
  | 'REVERSAL'
  | 'ADJUSTMENT';

export type OrderStatusType =
  | 'PLACED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'RECEIVED'
  | 'CANCELLED';

export type CafeteriaStaffRole = 'STAFF' | 'HEAD';

export interface Database {
  public: {
    Tables: {
      universities: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          primary_color: string | null;
          secondary_color: string | null;
          address: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          currency: string | null;
          timezone: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          address?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          currency?: string | null;
          timezone?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          address?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          currency?: string | null;
          timezone?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          auth_user_id: string | null;
          university_id: string;
          email: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          avatar_url: string | null;
          role: UserRoleType;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          university_id: string;
          email: string;
          first_name: string;
          last_name: string;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRoleType;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          auth_user_id?: string | null;
          university_id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRoleType;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      student_profiles: {
        Row: {
          id: string;
          user_profile_id: string;
          university_id: string;
          matric_number: string;
          department: string | null;
          faculty: string | null;
          level: string | null;
          transaction_pin_hash: string | null;
          pin_attempts: number | null;
          pin_locked_until: string | null;
          is_feeding_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_profile_id: string;
          university_id: string;
          matric_number: string;
          department?: string | null;
          faculty?: string | null;
          level?: string | null;
          transaction_pin_hash?: string | null;
          pin_attempts?: number | null;
          pin_locked_until?: string | null;
          is_feeding_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_profile_id?: string;
          university_id?: string;
          matric_number?: string;
          department?: string | null;
          faculty?: string | null;
          level?: string | null;
          transaction_pin_hash?: string | null;
          pin_attempts?: number | null;
          pin_locked_until?: string | null;
          is_feeding_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      feeding_periods: {
        Row: {
          id: string;
          university_id: string;
          name: string;
          start_date: string;
          end_date: string;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          university_id: string;
          name: string;
          start_date: string;
          end_date: string;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          university_id?: string;
          name?: string;
          start_date?: string;
          end_date?: string;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      feeding_accounts: {
        Row: {
          id: string;
          student_profile_id: string;
          university_id: string;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          student_profile_id: string;
          university_id: string;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          student_profile_id?: string;
          university_id?: string;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      ledger_entries: {
        Row: {
          id: string;
          feeding_account_id: string;
          university_id: string;
          transaction_type: TransactionType;
          amount: number;
          running_balance: number;
          reference_id: string | null;
          description: string;
          created_by: string | null;
          created_at: string | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          feeding_account_id: string;
          university_id: string;
          transaction_type: TransactionType;
          amount: number;
          running_balance: number;
          reference_id?: string | null;
          description: string;
          created_by?: string | null;
          created_at?: string | null;
          metadata?: Json | null;
        };
        Update: never; // Ledger is append-only
      };
      cafeterias: {
        Row: {
          id: string;
          university_id: string;
          name: string;
          location: string | null;
          description: string | null;
          operating_hours: Json | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          university_id: string;
          name: string;
          location?: string | null;
          description?: string | null;
          operating_hours?: Json | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          university_id?: string;
          name?: string;
          location?: string | null;
          description?: string | null;
          operating_hours?: Json | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      cafeteria_staff: {
        Row: {
          id: string;
          user_profile_id: string;
          cafeteria_id: string;
          university_id: string;
          role_in_cafeteria: CafeteriaStaffRole | null;
          assigned_at: string | null;
        };
        Insert: {
          id?: string;
          user_profile_id: string;
          cafeteria_id: string;
          university_id: string;
          role_in_cafeteria?: CafeteriaStaffRole | null;
          assigned_at?: string | null;
        };
        Update: {
          id?: string;
          user_profile_id?: string;
          cafeteria_id?: string;
          university_id?: string;
          role_in_cafeteria?: CafeteriaStaffRole | null;
          assigned_at?: string | null;
        };
      };
      menu_categories: {
        Row: {
          id: string;
          university_id: string;
          cafeteria_id: string;
          name: string;
          display_order: number | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          university_id: string;
          cafeteria_id: string;
          name: string;
          display_order?: number | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          university_id?: string;
          cafeteria_id?: string;
          name?: string;
          display_order?: number | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      menu_items: {
        Row: {
          id: string;
          university_id: string;
          cafeteria_id: string;
          category_id: string;
          name: string;
          description: string | null;
          image_url: string | null;
          current_price: number;
          is_available: boolean | null;
          is_active: boolean | null;
          display_order: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          university_id: string;
          cafeteria_id: string;
          category_id: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          current_price: number;
          is_available?: boolean | null;
          is_active?: boolean | null;
          display_order?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          university_id?: string;
          cafeteria_id?: string;
          category_id?: string;
          name?: string;
          description?: string | null;
          image_url?: string | null;
          current_price?: number;
          is_available?: boolean | null;
          is_active?: boolean | null;
          display_order?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      menu_item_price_history: {
        Row: {
          id: string;
          menu_item_id: string;
          old_price: number;
          new_price: number;
          changed_by: string | null;
          reason: string | null;
          changed_at: string | null;
        };
        Insert: {
          id?: string;
          menu_item_id: string;
          old_price: number;
          new_price: number;
          changed_by?: string | null;
          reason?: string | null;
          changed_at?: string | null;
        };
        Update: {
          id?: string;
          menu_item_id?: string;
          old_price?: number;
          new_price?: number;
          changed_by?: string | null;
          reason?: string | null;
          changed_at?: string | null;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          university_id: string;
          student_profile_id: string;
          cafeteria_id: string;
          status: OrderStatusType;
          total_amount: number;
          pickup_code: string;
          pickup_qr_token: string;
          idempotency_key: string | null;
          notes: string | null;
          placed_at: string | null;
          accepted_at: string | null;
          preparing_at: string | null;
          ready_at: string | null;
          received_at: string | null;
          received_by: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          order_number: string;
          university_id: string;
          student_profile_id: string;
          cafeteria_id: string;
          status?: OrderStatusType;
          total_amount: number;
          pickup_code: string;
          pickup_qr_token: string;
          idempotency_key?: string | null;
          notes?: string | null;
          placed_at?: string | null;
          accepted_at?: string | null;
          preparing_at?: string | null;
          ready_at?: string | null;
          received_at?: string | null;
          received_by?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          order_number?: string;
          university_id?: string;
          student_profile_id?: string;
          cafeteria_id?: string;
          status?: OrderStatusType;
          total_amount?: number;
          pickup_code?: string;
          pickup_qr_token?: string;
          idempotency_key?: string | null;
          notes?: string | null;
          placed_at?: string | null;
          accepted_at?: string | null;
          preparing_at?: string | null;
          ready_at?: string | null;
          received_at?: string | null;
          received_by?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string;
          item_name: string;
          unit_price: number;
          quantity: number;
          subtotal: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id: string;
          item_name: string;
          unit_price: number;
          quantity: number;
          subtotal: number;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          menu_item_id?: string;
          item_name?: string;
          unit_price?: number;
          quantity?: number;
          subtotal?: number;
          created_at?: string | null;
        };
      };
      order_status_history: {
        Row: {
          id: string;
          order_id: string;
          previous_status: OrderStatusType | null;
          new_status: OrderStatusType;
          changed_by: string | null;
          reason: string | null;
          is_manual: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          previous_status?: OrderStatusType | null;
          new_status: OrderStatusType;
          changed_by?: string | null;
          reason?: string | null;
          is_manual?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          previous_status?: OrderStatusType | null;
          new_status?: OrderStatusType;
          changed_by?: string | null;
          reason?: string | null;
          is_manual?: boolean | null;
          created_at?: string | null;
        };
      };
      idempotency_records: {
        Row: {
          id: string;
          idempotency_key: string;
          order_id: string | null;
          ledger_entry_id: string | null;
          response_payload: Json;
          created_at: string | null;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          idempotency_key: string;
          order_id?: string | null;
          ledger_entry_id?: string | null;
          response_payload: Json;
          created_at?: string | null;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          idempotency_key?: string;
          order_id?: string | null;
          ledger_entry_id?: string | null;
          response_payload?: Json;
          created_at?: string | null;
          expires_at?: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          university_id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          old_values: Json | null;
          new_values: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          university_id: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          university_id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      place_mealpass_order: {
        Args: {
          p_student_profile_id: string;
          p_cafeteria_id: string;
          p_items: Json;
          p_pin: string;
          p_notes?: string | null;
          p_idempotency_key?: string | null;
        };
        Returns: Json;
      };
      allocate_mealpass_funds: {
        Args: {
          p_student_profile_id: string;
          p_amount: number;
          p_description: string;
          p_bank_reference?: string | null;
          p_allocated_by_user_id?: string | null;
        };
        Returns: Json;
      };
      update_order_status_rpc: {
        Args: {
          p_order_id: string;
          p_new_status: OrderStatusType;
          p_changed_by: string;
          p_reason?: string | null;
          p_is_manual?: boolean;
        };
        Returns: Json;
      };
    };
    Enums: {
      user_role_type: UserRoleType;
      transaction_type: TransactionType;
      order_status_type: OrderStatusType;
      cafeteria_staff_role: CafeteriaStaffRole;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

