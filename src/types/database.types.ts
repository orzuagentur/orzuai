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
  | "website_forms";

export type ConversationStatus =
  | "open"
  | "pending"
  | "resolved"
  | "snoozed"
  | "active"
  | "archived"
  | "closed";

export type MessageSenderType = "user" | "client" | "ai";

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
      contacts: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          phone_number: string;
          channel: MessagingChannel;
          last_message_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          phone_number: string;
          channel?: MessagingChannel;
          last_message_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          phone_number?: string;
          channel?: MessagingChannel;
          last_message_at?: string | null;
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
      conversations: {
        Row: {
          id: string;
          business_id: string;
          contact_id: string;
          channel: MessagingChannel;
          status: ConversationStatus;
          internal_note: string | null;
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
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          channel: MessagingChannel;
          sender_type: MessageSenderType;
          content: string;
          ai_generated: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          channel?: MessagingChannel;
          sender_type: MessageSenderType;
          content: string;
          ai_generated?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          channel?: MessagingChannel;
          sender_type?: MessageSenderType;
          content?: string;
          ai_generated?: boolean;
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
      ai_settings: {
        Row: {
          id: string;
          business_id: string;
          channel: MessagingChannel;
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
