export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AuthProvider = "google" | "email";

export type KnowledgeCategory =
  | "Services"
  | "Pricing"
  | "FAQ"
  | "Business Hours";

export type WhatsappStatus = "connected" | "disconnected" | "pending";

export type InstagramStatus = "connected" | "disconnected" | "pending";

export type TelegramStatus = "connected" | "disconnected" | "pending";

export type WebsiteFormStatus = "connected" | "disconnected" | "pending";

export type WebsiteFormFollowUp =
  | "whatsapp"
  | "telegram"
  | "email"
  | "none";

export type WebsiteKnowledgeSyncStatus = "idle" | "syncing" | "ready" | "error";

export type MessagingChannel =
  | "whatsapp"
  | "instagram"
  | "telegram"
  | "website_forms"
  | "facebook_messenger"
  | "email";

export type ConversationStatus =
  | "open"
  | "pending"
  | "resolved"
  | "snoozed"
  | "active"
  | "archived"
  | "closed";

export type MessageSenderType = "user" | "client" | "ai";
export type MessageDeliveryStatus =
  | "pending"
  | "processing"
  | "sent"
  | "delivered"
  | "read"
  | "failed";
export type MessageAttachmentKind = "image" | "audio" | "video" | "document";
export type MessageAttachmentStatus =
  | "pending"
  | "processing"
  | "ready"
  | "failed";
export type WebhookQueueStatus = "pending" | "processing" | "completed" | "failed";

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          auth_provider: AuthProvider;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          auth_provider?: AuthProvider;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          auth_provider?: AuthProvider;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          user_id: string;
          business_name: string;
          business_description: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          website: string | null;
          logo_url: string | null;
          subscription_plan: string;
          subscription_status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          prefer_customer_ai_keys: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_name: string;
          business_description?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          website?: string | null;
          logo_url?: string | null;
          subscription_plan?: string;
          subscription_status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          prefer_customer_ai_keys?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          business_name?: string;
          business_description?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          website?: string | null;
          logo_url?: string | null;
          subscription_plan?: string;
          subscription_status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          prefer_customer_ai_keys?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "businesses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      website_knowledge_syncs: {
        Row: {
          id: string;
          business_id: string;
          site_url: string;
          sync_status: WebsiteKnowledgeSyncStatus;
          auto_sync_enabled: boolean;
          sync_interval_hours: number;
          last_synced_at: string | null;
          next_sync_at: string | null;
          last_sync_error: string | null;
          pages_indexed: number;
          entries_synced: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          site_url: string;
          sync_status?: WebsiteKnowledgeSyncStatus;
          auto_sync_enabled?: boolean;
          sync_interval_hours?: number;
          last_synced_at?: string | null;
          next_sync_at?: string | null;
          last_sync_error?: string | null;
          pages_indexed?: number;
          entries_synced?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          site_url?: string;
          sync_status?: WebsiteKnowledgeSyncStatus;
          auto_sync_enabled?: boolean;
          sync_interval_hours?: number;
          last_synced_at?: string | null;
          next_sync_at?: string | null;
          last_sync_error?: string | null;
          pages_indexed?: number;
          entries_synced?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "website_knowledge_syncs_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: true;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      knowledge_base: {
        Row: {
          id: string;
          business_id: string;
          title: string;
          content: string;
          category: KnowledgeCategory;
          source: string;
          source_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          title: string;
          content: string;
          category: KnowledgeCategory;
          source?: string;
          source_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          title?: string;
          content?: string;
          category?: KnowledgeCategory;
          source?: string;
          source_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "knowledge_base_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_connections: {
        Row: {
          id: string;
          business_id: string;
          phone_number: string;
          whatsapp_status: WhatsappStatus;
          connected_at: string | null;
          created_at: string;
          meta_phone_number_id: string | null;
          meta_access_token: string | null;
          meta_waba_id: string | null;
          meta_business_account_id: string | null;
          verification_code_hash: string | null;
          verification_expires_at: string | null;
          last_synced_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          phone_number: string;
          whatsapp_status?: WhatsappStatus;
          connected_at?: string | null;
          created_at?: string;
          meta_phone_number_id?: string | null;
          meta_access_token?: string | null;
          meta_waba_id?: string | null;
          meta_business_account_id?: string | null;
          verification_code_hash?: string | null;
          verification_expires_at?: string | null;
          last_synced_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          phone_number?: string;
          whatsapp_status?: WhatsappStatus;
          connected_at?: string | null;
          created_at?: string;
          meta_phone_number_id?: string | null;
          meta_access_token?: string | null;
          meta_waba_id?: string | null;
          meta_business_account_id?: string | null;
          verification_code_hash?: string | null;
          verification_expires_at?: string | null;
          last_synced_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_connections_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      instagram_connections: {
        Row: {
          id: string;
          business_id: string;
          instagram_username: string;
          instagram_status: InstagramStatus;
          meta_page_id: string | null;
          meta_ig_user_id: string | null;
          meta_access_token: string | null;
          meta_business_account_id: string | null;
          connected_at: string | null;
          last_synced_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          instagram_username?: string;
          instagram_status?: InstagramStatus;
          meta_page_id?: string | null;
          meta_ig_user_id?: string | null;
          meta_access_token?: string | null;
          meta_business_account_id?: string | null;
          connected_at?: string | null;
          last_synced_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          instagram_username?: string;
          instagram_status?: InstagramStatus;
          meta_page_id?: string | null;
          meta_ig_user_id?: string | null;
          meta_access_token?: string | null;
          meta_business_account_id?: string | null;
          connected_at?: string | null;
          last_synced_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "instagram_connections_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: true;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      telegram_connections: {
        Row: {
          id: string;
          business_id: string;
          bot_username: string;
          telegram_status: TelegramStatus;
          telegram_bot_id: string | null;
          bot_token: string | null;
          webhook_secret: string | null;
          connected_at: string | null;
          last_synced_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          bot_username?: string;
          telegram_status?: TelegramStatus;
          telegram_bot_id?: string | null;
          bot_token?: string | null;
          webhook_secret?: string | null;
          connected_at?: string | null;
          last_synced_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          bot_username?: string;
          telegram_status?: TelegramStatus;
          telegram_bot_id?: string | null;
          bot_token?: string | null;
          webhook_secret?: string | null;
          connected_at?: string | null;
          last_synced_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "telegram_connections_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: true;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      website_form_connections: {
        Row: {
          id: string;
          business_id: string;
          webhook_token: string;
          api_key_hash: string;
          api_key_prefix: string;
          site_name: string | null;
          site_url: string | null;
          connection_status: WebsiteFormStatus;
          auto_follow_up_enabled: boolean;
          follow_up_channel: WebsiteFormFollowUp;
          connected_at: string | null;
          last_submission_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          webhook_token: string;
          api_key_hash: string;
          api_key_prefix?: string;
          site_name?: string | null;
          site_url?: string | null;
          connection_status?: WebsiteFormStatus;
          auto_follow_up_enabled?: boolean;
          follow_up_channel?: WebsiteFormFollowUp;
          connected_at?: string | null;
          last_submission_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          webhook_token?: string;
          api_key_hash?: string;
          api_key_prefix?: string;
          site_name?: string | null;
          site_url?: string | null;
          connection_status?: WebsiteFormStatus;
          auto_follow_up_enabled?: boolean;
          follow_up_channel?: WebsiteFormFollowUp;
          connected_at?: string | null;
          last_submission_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "website_form_connections_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: true;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      onboarding_drip_emails: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          drip_day: number;
          sent_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          drip_day: number;
          sent_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          drip_day?: number;
          sent_at?: string;
        };
        Relationships: [];
      };
      conversation_follow_ups: {
        Row: {
          id: string;
          conversation_id: string;
          business_id: string;
          follow_up_day: number;
          sent_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          business_id: string;
          follow_up_day: number;
          sent_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          business_id?: string;
          follow_up_day?: number;
          sent_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_follow_ups_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_follow_ups_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      canned_responses: {
        Row: {
          id: string;
          business_id: string;
          title: string;
          content: string;
          channel: MessagingChannel | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          title: string;
          content: string;
          channel?: MessagingChannel | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          title?: string;
          content?: string;
          channel?: MessagingChannel | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canned_responses_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      contacts: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          phone_number: string;
          email: string | null;
          tags: string[];
          custom_fields: Record<string, string>;
          lead_score: number | null;
          ai_summary: string | null;
          pipeline_stage: string;
          deal_value: number | null;
          expected_close_date: string | null;
          sentiment: string | null;
          channel: MessagingChannel;
          last_message_at: string | null;
          is_favorite: boolean;
          avatar_url: string | null;
          avatar_synced_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          phone_number: string;
          email?: string | null;
          tags?: string[];
          custom_fields?: Record<string, string>;
          lead_score?: number | null;
          ai_summary?: string | null;
          pipeline_stage?: string;
          deal_value?: number | null;
          expected_close_date?: string | null;
          sentiment?: string | null;
          channel?: MessagingChannel;
          last_message_at?: string | null;
          is_favorite?: boolean;
          avatar_url?: string | null;
          avatar_synced_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          phone_number?: string;
          email?: string | null;
          tags?: string[];
          custom_fields?: Record<string, string>;
          lead_score?: number | null;
          ai_summary?: string | null;
          pipeline_stage?: string;
          deal_value?: number | null;
          expected_close_date?: string | null;
          sentiment?: string | null;
          channel?: MessagingChannel;
          last_message_at?: string | null;
          is_favorite?: boolean;
          avatar_url?: string | null;
          avatar_synced_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_channel_identities: {
        Row: {
          id: string;
          business_id: string;
          contact_id: string;
          channel: MessagingChannel;
          external_id: string;
          display_label: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          contact_id: string;
          channel: MessagingChannel;
          external_id: string;
          display_label?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          contact_id?: string;
          channel?: MessagingChannel;
          external_id?: string;
          display_label?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contact_channel_identities_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contact_channel_identities_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          id: string;
          business_id: string;
          contact_id: string;
          channel: MessagingChannel;
          status: ConversationStatus;
          internal_note: string | null;
          assigned_to: string | null;
          last_read_at: string | null;
          last_message_preview: string | null;
          last_message_at: string | null;
          last_message_sender_type: MessageSenderType | null;
          last_message_ai_generated: boolean;
          last_client_message_at: string | null;
          unread_count: number;
          last_sync_message_at: string | null;
          last_sync_message_id: string | null;
          total_message_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          contact_id: string;
          channel?: MessagingChannel;
          status?: ConversationStatus;
          internal_note?: string | null;
          assigned_to?: string | null;
          last_read_at?: string | null;
          last_message_preview?: string | null;
          last_message_at?: string | null;
          last_message_sender_type?: MessageSenderType | null;
          last_message_ai_generated?: boolean;
          last_client_message_at?: string | null;
          unread_count?: number;
          last_sync_message_at?: string | null;
          last_sync_message_id?: string | null;
          total_message_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          contact_id?: string;
          channel?: MessagingChannel;
          status?: ConversationStatus;
          internal_note?: string | null;
          assigned_to?: string | null;
          last_read_at?: string | null;
          last_message_preview?: string | null;
          last_message_at?: string | null;
          last_message_sender_type?: MessageSenderType | null;
          last_message_ai_generated?: boolean;
          last_client_message_at?: string | null;
          unread_count?: number;
          last_sync_message_at?: string | null;
          last_sync_message_id?: string | null;
          total_message_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_reads: {
        Row: {
          id: string;
          business_id: string;
          conversation_id: string;
          user_id: string;
          last_read_at: string | null;
          unread_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          conversation_id: string;
          user_id: string;
          last_read_at?: string | null;
          unread_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          conversation_id?: string;
          user_id?: string;
          last_read_at?: string | null;
          unread_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_reads_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_reads_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      crm_deals: {
        Row: {
          id: string;
          business_id: string;
          contact_id: string;
          title: string;
          value: number | null;
          currency: string;
          stage: string;
          expected_close_date: string | null;
          status: string;
          is_primary: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          contact_id: string;
          title?: string;
          value?: number | null;
          currency?: string;
          stage?: string;
          expected_close_date?: string | null;
          status?: string;
          is_primary?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          contact_id?: string;
          title?: string;
          value?: number | null;
          currency?: string;
          stage?: string;
          expected_close_date?: string | null;
          status?: string;
          is_primary?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crm_deals_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_deals_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      crm_tasks: {
        Row: {
          id: string;
          business_id: string;
          contact_id: string;
          title: string;
          due_at: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          contact_id: string;
          title: string;
          due_at?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          contact_id?: string;
          title?: string;
          due_at?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crm_tasks_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_tasks_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          channel: MessagingChannel;
          sender_type: MessageSenderType;
          content: string;
          ai_generated: boolean;
          ai_agent_id: string | null;
          deleted_for_all_at: string | null;
          hidden_for_business: boolean;
          edited_at: string | null;
          is_edited: boolean;
          external_message_id: string | null;
          business_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          channel?: MessagingChannel;
          sender_type: MessageSenderType;
          content: string;
          ai_generated?: boolean;
          ai_agent_id?: string | null;
          deleted_for_all_at?: string | null;
          hidden_for_business?: boolean;
          edited_at?: string | null;
          is_edited?: boolean;
          external_message_id?: string | null;
          business_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          channel?: MessagingChannel;
          sender_type?: MessageSenderType;
          content?: string;
          ai_generated?: boolean;
          ai_agent_id?: string | null;
          deleted_for_all_at?: string | null;
          hidden_for_business?: boolean;
          edited_at?: string | null;
          is_edited?: boolean;
          external_message_id?: string | null;
          business_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      message_deliveries: {
        Row: {
          id: string;
          message_id: string;
          business_id: string;
          channel: MessagingChannel;
          conversation_id: string | null;
          status: MessageDeliveryStatus;
          attempt_count: number;
          max_attempts: number;
          next_attempt_at: string;
          last_error: string | null;
          provider_message_id: string | null;
          sent_at: string | null;
          failed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          business_id: string;
          channel: MessagingChannel;
          conversation_id?: string | null;
          status?: MessageDeliveryStatus;
          attempt_count?: number;
          max_attempts?: number;
          next_attempt_at?: string;
          last_error?: string | null;
          provider_message_id?: string | null;
          sent_at?: string | null;
          failed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          business_id?: string;
          channel?: MessagingChannel;
          conversation_id?: string | null;
          status?: MessageDeliveryStatus;
          attempt_count?: number;
          max_attempts?: number;
          next_attempt_at?: string;
          last_error?: string | null;
          provider_message_id?: string | null;
          sent_at?: string | null;
          failed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_deliveries_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: true;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_deliveries_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      message_attachments: {
        Row: {
          id: string;
          message_id: string;
          business_id: string;
          kind: MessageAttachmentKind;
          mime_type: string;
          file_name: string;
          storage_path: string | null;
          size_bytes: number | null;
          duration_sec: number | null;
          provider_media_id: string | null;
          provider_media_url: string | null;
          provider_media_url_expires_at: string | null;
          status: MessageAttachmentStatus;
          thumbnail_path: string | null;
          thumb_width: number | null;
          thumb_height: number | null;
          retry_count: number;
          max_retries: number;
          last_error: string | null;
          next_retry_at: string | null;
          hydration_context: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          business_id: string;
          kind: MessageAttachmentKind;
          mime_type?: string;
          file_name?: string;
          storage_path?: string | null;
          size_bytes?: number | null;
          duration_sec?: number | null;
          provider_media_id?: string | null;
          provider_media_url?: string | null;
          provider_media_url_expires_at?: string | null;
          status?: MessageAttachmentStatus;
          thumbnail_path?: string | null;
          thumb_width?: number | null;
          thumb_height?: number | null;
          retry_count?: number;
          max_retries?: number;
          last_error?: string | null;
          next_retry_at?: string | null;
          hydration_context?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          business_id?: string;
          kind?: MessageAttachmentKind;
          mime_type?: string;
          file_name?: string;
          storage_path?: string | null;
          size_bytes?: number | null;
          duration_sec?: number | null;
          provider_media_id?: string | null;
          provider_media_url?: string | null;
          provider_media_url_expires_at?: string | null;
          thumbnail_path?: string | null;
          thumb_width?: number | null;
          thumb_height?: number | null;
          status?: MessageAttachmentStatus;
          retry_count?: number;
          max_retries?: number;
          last_error?: string | null;
          next_retry_at?: string | null;
          hydration_context?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: true;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_attachments_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      inbound_webhook_queue: {
        Row: {
          id: string;
          channel: MessagingChannel;
          idempotency_key: string;
          payload: Record<string, unknown>;
          metadata: Record<string, unknown>;
          status: WebhookQueueStatus;
          attempt_count: number;
          max_attempts: number;
          next_attempt_at: string;
          last_error: string | null;
          processed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          channel: MessagingChannel;
          idempotency_key: string;
          payload: Record<string, unknown>;
          metadata?: Record<string, unknown>;
          status?: WebhookQueueStatus;
          attempt_count?: number;
          max_attempts?: number;
          next_attempt_at?: string;
          last_error?: string | null;
          processed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          channel?: MessagingChannel;
          idempotency_key?: string;
          payload?: Record<string, unknown>;
          metadata?: Record<string, unknown>;
          status?: WebhookQueueStatus;
          attempt_count?: number;
          max_attempts?: number;
          next_attempt_at?: string;
          last_error?: string | null;
          processed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      media_signed_url_cache: {
        Row: {
          storage_path: string;
          signed_url: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          storage_path: string;
          signed_url: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          storage_path?: string;
          signed_url?: string;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          business_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          business_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_agents: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          system_prompt: string;
          channels: MessagingChannel[];
          trigger_keywords: string[];
          enabled: boolean;
          provider: string;
          model: string;
          language: string;
          communication_style: string;
          icon: string;
          use_custom_model: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          system_prompt: string;
          channels?: MessagingChannel[];
          trigger_keywords?: string[];
          enabled?: boolean;
          provider?: string;
          model?: string;
          language?: string;
          communication_style?: string;
          icon?: string;
          use_custom_model?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          system_prompt?: string;
          channels?: MessagingChannel[];
          trigger_keywords?: string[];
          enabled?: boolean;
          provider?: string;
          model?: string;
          language?: string;
          communication_style?: string;
          icon?: string;
          use_custom_model?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_agents_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_settings: {
        Row: {
          id: string;
          business_id: string;
          channel: MessagingChannel;
          provider: string;
          model: string;
          language: string;
          system_prompt: string;
          ai_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          channel?: MessagingChannel;
          provider?: string;
          model: string;
          language: string;
          system_prompt: string;
          ai_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          channel?: MessagingChannel;
          provider?: string;
          model?: string;
          language?: string;
          system_prompt?: string;
          ai_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_settings_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      business_ai_provider_keys: {
        Row: {
          business_id: string;
          provider: string;
          api_key: string;
          key_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          provider: string;
          api_key: string;
          key_name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          provider?: string;
          api_key?: string;
          key_name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_ai_provider_keys_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_usage_logs: {
        Row: {
          id: string;
          business_id: string;
          conversation_id: string | null;
          provider: string;
          model: string;
          input_tokens: number;
          output_tokens: number;
          estimated_cost_usd: number;
          billing_source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          conversation_id?: string | null;
          provider: string;
          model: string;
          input_tokens?: number;
          output_tokens?: number;
          estimated_cost_usd?: number;
          billing_source?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          conversation_id?: string | null;
          provider?: string;
          model?: string;
          input_tokens?: number;
          output_tokens?: number;
          estimated_cost_usd?: number;
          billing_source?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_usage_logs_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      business_ai_config: {
        Row: {
          business_id: string;
          sales_agent_enabled: boolean;
          bant_threshold: number;
          auto_qualify_pipeline: boolean;
          auto_task_enabled: boolean;
          auto_task_threshold: number;
          sentiment_analysis_enabled: boolean;
          follow_up_agent_enabled: boolean;
          follow_up_agent_id: string | null;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          sales_agent_enabled?: boolean;
          bant_threshold?: number;
          auto_qualify_pipeline?: boolean;
          auto_task_enabled?: boolean;
          auto_task_threshold?: number;
          sentiment_analysis_enabled?: boolean;
          follow_up_agent_enabled?: boolean;
          follow_up_agent_id?: string | null;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          sales_agent_enabled?: boolean;
          bant_threshold?: number;
          auto_qualify_pipeline?: boolean;
          auto_task_enabled?: boolean;
          auto_task_threshold?: number;
          sentiment_analysis_enabled?: boolean;
          follow_up_agent_enabled?: boolean;
          follow_up_agent_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_ai_config_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: true;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      channel_analytics: {
        Row: {
          business_id: string;
          channel: MessagingChannel;
          total_messages: number;
          total_contacts: number;
          ai_replies: number;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          channel: MessagingChannel;
          total_messages?: number;
          total_contacts?: number;
          ai_replies?: number;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          channel?: MessagingChannel;
          total_messages?: number;
          total_contacts?: number;
          ai_replies?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "channel_analytics_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      automation_runs: {
        Row: {
          id: string;
          automation_id: string;
          business_id: string;
          conversation_id: string | null;
          contact_id: string | null;
          trigger_type: string;
          action_type: string;
          status: string;
          detail: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          automation_id: string;
          business_id: string;
          conversation_id?: string | null;
          contact_id?: string | null;
          trigger_type: string;
          action_type: string;
          status?: string;
          detail?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          automation_id?: string;
          business_id?: string;
          conversation_id?: string | null;
          contact_id?: string | null;
          trigger_type?: string;
          action_type?: string;
          status?: string;
          detail?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "automation_runs_automation_id_fkey";
            columns: ["automation_id"];
            isOneToOne: false;
            referencedRelation: "automations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "automation_runs_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      automations: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          trigger_type: string;
          action_type: string;
          enabled: boolean;
          config: unknown;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          trigger_type: string;
          action_type: string;
          enabled?: boolean;
          config?: unknown;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          trigger_type?: string;
          action_type?: string;
          enabled?: boolean;
          config?: unknown;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "automations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      business_members: {
        Row: {
          id: string;
          business_id: string;
          user_id: string | null;
          invited_email: string;
          role: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id?: string | null;
          invited_email: string;
          role?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string | null;
          invited_email?: string;
          role?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      voice_agent_config: {
        Row: {
          business_id: string;
          enabled: boolean;
          provider: string;
          phone_number: string | null;
          outbound_enabled: boolean;
          inbound_enabled: boolean;
          callback_after_order: boolean;
          callback_delay_minutes: number;
          outbound_script: string;
          inbound_greeting: string;
          retell_agent_id: string | null;
          vapi_assistant_id: string | null;
          twilio_phone_sid: string | null;
          ai_enabled: boolean;
          voice_language: string;
          voice_system_prompt: string | null;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          enabled?: boolean;
          provider?: string;
          phone_number?: string | null;
          outbound_enabled?: boolean;
          inbound_enabled?: boolean;
          callback_after_order?: boolean;
          callback_delay_minutes?: number;
          outbound_script?: string;
          inbound_greeting?: string;
          retell_agent_id?: string | null;
          vapi_assistant_id?: string | null;
          twilio_phone_sid?: string | null;
          ai_enabled?: boolean;
          voice_language?: string;
          voice_system_prompt?: string | null;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          enabled?: boolean;
          provider?: string;
          phone_number?: string | null;
          outbound_enabled?: boolean;
          inbound_enabled?: boolean;
          callback_after_order?: boolean;
          callback_delay_minutes?: number;
          outbound_script?: string;
          inbound_greeting?: string;
          retell_agent_id?: string | null;
          vapi_assistant_id?: string | null;
          twilio_phone_sid?: string | null;
          ai_enabled?: boolean;
          voice_language?: string;
          voice_system_prompt?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "voice_agent_config_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: true;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      voice_call_sessions: {
        Row: {
          id: string;
          business_id: string;
          call_sid: string;
          direction: string;
          turns: unknown;
          turn_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          call_sid: string;
          direction: string;
          turns?: unknown;
          turn_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          call_sid?: string;
          direction?: string;
          turns?: unknown;
          turn_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "voice_call_sessions_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      voice_call_logs: {
        Row: {
          id: string;
          business_id: string;
          contact_id: string | null;
          direction: string;
          phone_number: string;
          status: string;
          provider: string;
          external_call_id: string | null;
          trigger_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          contact_id?: string | null;
          direction: string;
          phone_number: string;
          status?: string;
          provider: string;
          external_call_id?: string | null;
          trigger_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          contact_id?: string | null;
          direction?: string;
          phone_number?: string;
          status?: string;
          provider?: string;
          external_call_id?: string | null;
          trigger_reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "voice_call_logs_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "voice_call_logs_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      voice_call_queue: {
        Row: {
          id: string;
          business_id: string;
          contact_id: string | null;
          phone_number: string;
          trigger_reason: string;
          execute_at: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          contact_id?: string | null;
          phone_number: string;
          trigger_reason?: string;
          execute_at: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          contact_id?: string | null;
          phone_number?: string;
          trigger_reason?: string;
          execute_at?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "voice_call_queue_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "voice_call_queue_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      analytics: {
        Row: {
          id: string;
          business_id: string;
          total_messages: number;
          total_contacts: number;
          ai_replies: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          total_messages?: number;
          total_contacts?: number;
          ai_replies?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          total_messages?: number;
          total_contacts?: number;
          ai_replies?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "analytics_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: true;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      user_owns_business: {
        Args: {
          business_uuid: string;
        };
        Returns: boolean;
      };
      claim_inbound_webhook_jobs: {
        Args: {
          p_limit?: number;
        };
        Returns: Database["public"]["Tables"]["inbound_webhook_queue"]["Row"][];
      };
      claim_message_delivery_jobs: {
        Args: {
          p_limit?: number;
        };
        Returns: Database["public"]["Tables"]["message_deliveries"]["Row"][];
      };
      claim_message_delivery_job: {
        Args: {
          p_message_id: string;
        };
        Returns: Database["public"]["Tables"]["message_deliveries"]["Row"][];
      };
      claim_inbound_media_hydration_jobs: {
        Args: {
          p_limit?: number;
        };
        Returns: Database["public"]["Tables"]["message_attachments"]["Row"][];
      };
      claim_inbound_media_hydration_job: {
        Args: {
          p_message_id: string;
        };
        Returns: Database["public"]["Tables"]["message_attachments"]["Row"][];
      };
      list_inbox_conversations: {
        Args: {
          p_business_id: string;
          p_user_id?: string | null;
          p_channel?: Database["public"]["Enums"]["messaging_channel"] | null;
          p_search?: string | null;
          p_view?: string;
          p_filter?: string;
          p_sort?: string;
          p_limit?: number;
          p_offset?: number;
          p_include_total_count?: boolean;
        };
        Returns: {
          id: string;
          channel: Database["public"]["Enums"]["messaging_channel"];
          status: Database["public"]["Enums"]["conversation_status"];
          updated_at: string;
          last_read_at: string | null;
          unread_count: number;
          last_message_preview: string | null;
          last_message_at: string | null;
          last_message_sender_type: Database["public"]["Enums"]["message_sender_type"];
          last_message_ai_generated: boolean;
          last_client_message_at: string | null;
          contact_id: string;
          contact_name: string;
          contact_phone: string;
          contact_lead_score: number | null;
          contact_is_favorite: boolean;
          contact_avatar_url: string | null;
          total_count: number | null;
        }[];
      };
      inbox_search_tsquery: {
        Args: {
          p_search: string;
        };
        Returns: unknown;
      };
      resolve_inbound_message_context: {
        Args: {
          p_business_id: string;
          p_channel: Database["public"]["Enums"]["messaging_channel"];
          p_contact_name: string;
          p_contact_phone: string;
          p_external_id: string;
          p_display_label?: string | null;
        };
        Returns: {
          contact_id: string;
          conversation_id: string;
          created_contact: boolean;
        }[];
      };
      insert_inbound_channel_message: {
        Args: {
          p_conversation_id: string;
          p_channel: Database["public"]["Enums"]["messaging_channel"];
          p_sender_type: Database["public"]["Enums"]["message_sender_type"];
          p_content: string;
          p_external_message_id?: string | null;
          p_message_preview?: string | null;
        };
        Returns: {
          id: string;
          conversation_id: string;
          channel: Database["public"]["Enums"]["messaging_channel"];
          sender_type: Database["public"]["Enums"]["message_sender_type"];
          content: string;
          ai_generated: boolean;
          created_at: string;
          external_message_id: string | null;
          is_duplicate: boolean;
        }[];
      };
    };
    Enums: {
      auth_provider: AuthProvider;
      knowledge_category: KnowledgeCategory;
      whatsapp_status: WhatsappStatus;
      instagram_status: InstagramStatus;
      telegram_status: TelegramStatus;
      website_form_status: WebsiteFormStatus;
      website_form_follow_up: WebsiteFormFollowUp;
      website_knowledge_sync_status: WebsiteKnowledgeSyncStatus;
      messaging_channel: MessagingChannel;
      conversation_status: ConversationStatus;
      message_sender_type: MessageSenderType;
      message_delivery_status: MessageDeliveryStatus;
      message_attachment_kind: MessageAttachmentKind;
      message_attachment_status: MessageAttachmentStatus;
      webhook_queue_status: WebhookQueueStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type User = Database["public"]["Tables"]["users"]["Row"];
export type Business = Database["public"]["Tables"]["businesses"]["Row"];
export type KnowledgeEntry = Database["public"]["Tables"]["knowledge_base"]["Row"];
export type WhatsappConnection =
  Database["public"]["Tables"]["whatsapp_connections"]["Row"];
export type InstagramConnection =
  Database["public"]["Tables"]["instagram_connections"]["Row"];
export type TelegramConnection =
  Database["public"]["Tables"]["telegram_connections"]["Row"];
export type WebsiteFormConnection =
  Database["public"]["Tables"]["website_form_connections"]["Row"];
export type WebsiteKnowledgeSync =
  Database["public"]["Tables"]["website_knowledge_syncs"]["Row"];
export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type AiSettings = Database["public"]["Tables"]["ai_settings"]["Row"];
export type Analytics = Database["public"]["Tables"]["analytics"]["Row"];

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
