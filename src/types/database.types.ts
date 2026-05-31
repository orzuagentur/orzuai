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

export type ConversationStatus = "active" | "archived" | "closed";

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
      knowledge_base: {
        Row: {
          id: string;
          business_id: string;
          title: string;
          content: string;
          category: KnowledgeCategory;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          title: string;
          content: string;
          category: KnowledgeCategory;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          title?: string;
          content?: string;
          category?: KnowledgeCategory;
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
      contacts: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          phone_number: string;
          last_message_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          phone_number: string;
          last_message_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          phone_number?: string;
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
          status: ConversationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          contact_id: string;
          status?: ConversationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          contact_id?: string;
          status?: ConversationStatus;
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
          sender_type: MessageSenderType;
          content: string;
          ai_generated: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_type: MessageSenderType;
          content: string;
          ai_generated?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
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
            isOneToOne: true;
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
