// Manually maintained — run `supabase gen types typescript --local` to regenerate
// after connecting a local Supabase instance.

import type {
  ProductTheme,
  ProductContent,
  SectionConfig,
  ProductStatus,
  LeadStatus,
  DomainStatus,
  MediaKind,
  MediaProvider,
  MediaSlot,
  TemplateType,
  OptionDisplayType,
} from "./index";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          role_id: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          role_id?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
          email?: string | null;
          role_id?: string | null;
          active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          }
        ];
      };

      roles: {
        Row: {
          id: string;
          key: string;
          name: string;
          description: string | null;
          is_system: boolean;
          permissions: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          name: string;
          description?: string | null;
          is_system?: boolean;
          permissions?: string[];
          created_at?: string;
        };
        Update: {
          key?: string;
          name?: string;
          description?: string | null;
          permissions?: string[];
        };
        Relationships: [];
      };

      product_assignments: {
        Row: {
          product_id: string;
          profile_id: string;
          created_at: string;
        };
        Insert: {
          product_id: string;
          profile_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "product_assignments_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_assignments_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };

      audit_log: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          detail: Record<string, unknown> | null;
          ip: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          detail?: Record<string, unknown> | null;
          ip?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
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
          template_type: TemplateType;
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
          template_type?: TemplateType;
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
          template_type?: TemplateType;
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
          product_id: string | null;
          name: string;
          phone: string;
          email: string | null;
          address: string;
          state: string;
          city: string | null;
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
          dropped_at: string | null;
          variant_id: string | null;
          selected_options: Record<string, string> | null;
          buyer_confirmed: boolean;
          follow_up_at: string | null;
          last_contacted_at: string | null;
          is_test: boolean;
          tracking_session_id: string | null;
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
          city?: string | null;
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
          variant_id?: string | null;
          selected_options?: Record<string, string> | null;
          buyer_confirmed?: boolean;
          is_test?: boolean;
          tracking_session_id?: string | null;
        };
        Update: {
          status?: LeadStatus;
          assigned_to?: string | null;
          call_notes?: string | null;
          event_id_purchase?: string | null;
          confirmed_at?: string | null;
          dropped_at?: string | null;
          follow_up_at?: string | null;
          last_contacted_at?: string | null;
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

      product_options: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          display_type: OptionDisplayType;
          required: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          name: string;
          display_type?: OptionDisplayType;
          required?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          display_type?: OptionDisplayType;
          required?: boolean;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_options_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };

      product_option_values: {
        Row: {
          id: string;
          product_option_id: string;
          value: string;
          colour_hex: string | null;
          image_url: string | null;
          sort_order: number;
          active: boolean;
        };
        Insert: {
          id?: string;
          product_option_id: string;
          value: string;
          colour_hex?: string | null;
          image_url?: string | null;
          sort_order?: number;
          active?: boolean;
        };
        Update: {
          value?: string;
          colour_hex?: string | null;
          image_url?: string | null;
          sort_order?: number;
          active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "product_option_values_product_option_id_fkey";
            columns: ["product_option_id"];
            isOneToOne: false;
            referencedRelation: "product_options";
            referencedColumns: ["id"];
          }
        ];
      };

      product_variants: {
        Row: {
          id: string;
          product_id: string;
          sku: string | null;
          price_override: number | null;
          compare_at_price_override: number | null;
          stock_quantity: number | null;
          active: boolean;
          image_url: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          sku?: string | null;
          price_override?: number | null;
          compare_at_price_override?: number | null;
          stock_quantity?: number | null;
          active?: boolean;
          image_url?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          sku?: string | null;
          price_override?: number | null;
          compare_at_price_override?: number | null;
          stock_quantity?: number | null;
          active?: boolean;
          image_url?: string | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };

      product_variant_options: {
        Row: {
          variant_id: string;
          option_value_id: string;
        };
        Insert: {
          variant_id: string;
          option_value_id: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "product_variant_options_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_variant_options_option_value_id_fkey";
            columns: ["option_value_id"];
            isOneToOne: false;
            referencedRelation: "product_option_values";
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

      tracking_events: {
        Row: {
          id: string;
          product_id: string;
          lead_id: string | null;
          session_id: string | null;
          event_name: "PageView" | "ViewContent" | "Lead" | "Contact" | "Purchase";
          event_id: string | null;
          source: "browser" | "server";
          status: "sent" | "confirmed" | "failed";
          error: string | null;
          test: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          lead_id?: string | null;
          session_id?: string | null;
          event_name: "PageView" | "ViewContent" | "Lead" | "Contact" | "Purchase";
          event_id?: string | null;
          source: "browser" | "server";
          status?: "sent" | "confirmed" | "failed";
          error?: string | null;
          test?: boolean;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "tracking_events_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tracking_events_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          }
        ];
      };

      lead_activities: {
        Row: {
          id: string;
          lead_id: string;
          user_id: string | null;
          actor_name: string | null;
          kind: "call_opened" | "whatsapp_opened" | "contacted" | "note";
          detail: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          user_id?: string | null;
          actor_name?: string | null;
          kind: "call_opened" | "whatsapp_opened" | "contacted" | "note";
          detail?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_activities_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
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
