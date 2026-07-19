// Manually maintained — run `supabase gen types typescript --local` to regenerate
// after connecting a local Supabase instance.

import type {
  ProductTheme,
  ProductContent,
  SectionConfig,
  UserRole,
  ProductStatus,
  LeadStatus,
  DomainStatus,
  MediaKind,
  MediaProvider,
  MediaSlot,
} from "./index";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: UserRole;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: UserRole;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
          role?: UserRole;
          active?: boolean;
        };
        Relationships: [];
      };

      settings: {
        Row: {
          id: string;
          business_name: string;
          order_prefix: string;
          default_whatsapp: string | null;
          default_theme: ProductTheme;
        };
        Insert: {
          id?: string;
          business_name?: string;
          order_prefix?: string;
          default_whatsapp?: string | null;
          default_theme?: ProductTheme;
        };
        Update: {
          business_name?: string;
          order_prefix?: string;
          default_whatsapp?: string | null;
          default_theme?: ProductTheme;
        };
        Relationships: [];
      };

      products: {
        Row: {
          id: string;
          slug: string;
          name: string;
          status: ProductStatus;
          currency: string;
          price: number;
          compare_at_price: number | null;
          theme: ProductTheme;
          content: ProductContent;
          sections: SectionConfig[];
          pixel_id: string | null;
          /** Never select this in client-role queries — only via createServiceClient() */
          capi_access_token: string | null;
          capi_test_event_code: string | null;
          whatsapp_number: string | null;
          show_on_homepage: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          status?: ProductStatus;
          currency?: string;
          price: number;
          compare_at_price?: number | null;
          theme?: ProductTheme;
          content?: ProductContent;
          sections?: SectionConfig[];
          pixel_id?: string | null;
          capi_access_token?: string | null;
          capi_test_event_code?: string | null;
          whatsapp_number?: string | null;
          show_on_homepage?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          slug?: string;
          name?: string;
          status?: ProductStatus;
          currency?: string;
          price?: number;
          compare_at_price?: number | null;
          theme?: ProductTheme;
          content?: ProductContent;
          sections?: SectionConfig[];
          pixel_id?: string | null;
          capi_access_token?: string | null;
          capi_test_event_code?: string | null;
          whatsapp_number?: string | null;
          show_on_homepage?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      product_media: {
        Row: {
          id: string;
          product_id: string;
          kind: MediaKind;
          url: string;
          provider: MediaProvider | null;
          slot: MediaSlot;
          sort_order: number;
          alt: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          kind: MediaKind;
          url: string;
          provider?: MediaProvider | null;
          slot: MediaSlot;
          sort_order?: number;
          alt?: string | null;
          created_at?: string;
        };
        Update: {
          kind?: MediaKind;
          url?: string;
          provider?: MediaProvider | null;
          slot?: MediaSlot;
          sort_order?: number;
          alt?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };

      leads: {
        Row: {
          id: string;
          order_number: string;
          product_id: string;
          name: string;
          phone: string;
          email: string | null;
          address: string;
          state: string;
          lga: string | null;
          quantity: number;
          unit_price: number;
          total: number;
          status: LeadStatus;
          assigned_to: string | null;
          call_notes: string | null;
          fbp: string | null;
          fbc: string | null;
          fbclid: string | null;
          event_id_lead: string;
          event_id_purchase: string | null;
          client_user_agent: string | null;
          client_ip: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          created_at: string;
          updated_at: string;
          confirmed_at: string | null;
          dispatched_at: string | null;
          paid_at: string | null;
        };
        Insert: {
          id?: string;
          order_number?: string;
          product_id: string;
          name: string;
          phone: string;
          email?: string | null;
          address: string;
          state: string;
          lga?: string | null;
          quantity?: number;
          unit_price: number;
          total: number;
          status?: LeadStatus;
          assigned_to?: string | null;
          call_notes?: string | null;
          fbp?: string | null;
          fbc?: string | null;
          fbclid?: string | null;
          event_id_lead?: string;
          event_id_purchase?: string | null;
          client_user_agent?: string | null;
          client_ip?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
        };
        Update: {
          status?: LeadStatus;
          assigned_to?: string | null;
          call_notes?: string | null;
          event_id_purchase?: string | null;
          confirmed_at?: string | null;
          dispatched_at?: string | null;
          paid_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "leads_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };

      domains: {
        Row: {
          id: string;
          hostname: string;
          product_id: string;
          kind: "custom" | "subdomain";
          status: DomainStatus;
          ssl_status: string | null;
          vercel_verification: Record<string, unknown> | null;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          hostname: string;
          product_id: string;
          kind: "custom" | "subdomain";
          status?: DomainStatus;
          ssl_status?: string | null;
          vercel_verification?: Record<string, unknown> | null;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          hostname?: string;
          product_id?: string;
          kind?: "custom" | "subdomain";
          status?: DomainStatus;
          ssl_status?: string | null;
          vercel_verification?: Record<string, unknown> | null;
          is_primary?: boolean;
        };
        Relationships: [];
      };

      lead_status_history: {
        Row: {
          id: string;
          lead_id: string;
          from_status: string | null;
          to_status: string;
          changed_by: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          from_status?: string | null;
          to_status: string;
          changed_by?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lead_status_history_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          }
        ];
      };

      ad_spend: {
        Row: {
          id: string;
          product_id: string;
          date: string;
          amount: number;
          platform: "meta" | "tiktok";
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          date: string;
          amount: number;
          platform: "meta" | "tiktok";
          created_at?: string;
        };
        Update: {
          amount?: number;
          platform?: "meta" | "tiktok";
        };
        Relationships: [];
      };

      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          subscription: PushSubscriptionJSON;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription: PushSubscriptionJSON;
          created_at?: string;
        };
        Update: {
          subscription?: PushSubscriptionJSON;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_user_role: {
        Args: Record<string, never>;
        Returns: string;
      };
      generate_order_number: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}
