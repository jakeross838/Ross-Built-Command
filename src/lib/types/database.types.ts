export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_token_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          org_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          actor_token_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          org_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_token_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          org_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_token_id_fkey"
            columns: ["actor_token_id"]
            isOneToOne: false
            referencedRelation: "client_portal_access"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          estimated_cost_cents: number | null
          function_type: string
          id: string
          input_tokens: number | null
          metadata: Json | null
          model: string | null
          org_id: string
          output_tokens: number | null
          status: string
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_cents?: number | null
          function_type: string
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model?: string | null
          org_id: string
          output_tokens?: number | null
          status: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_cents?: number | null
          function_type?: string
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model?: string | null
          org_id?: string
          output_tokens?: number | null
          status?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_chains: {
        Row: {
          conditions: Json
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_default: boolean
          name: string
          org_id: string
          stages: Json
          updated_at: string
          workflow_type: string
        }
        Insert: {
          conditions?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          name: string
          org_id: string
          stages: Json
          updated_at?: string
          workflow_type: string
        }
        Update: {
          conditions?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          name?: string
          org_id?: string
          stages?: Json
          updated_at?: string
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_chains_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          category: string | null
          co_adjustments: number
          committed: number
          cost_code_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          invoiced: number
          is_allowance: boolean
          job_id: string
          notes: string | null
          org_id: string
          original_estimate: number
          previous_applications_baseline: number
          revised_estimate: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          co_adjustments?: number
          committed?: number
          cost_code_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          invoiced?: number
          is_allowance?: boolean
          job_id: string
          notes?: string | null
          org_id: string
          original_estimate?: number
          previous_applications_baseline?: number
          revised_estimate?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          co_adjustments?: number
          committed?: number
          cost_code_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          invoiced?: number
          is_allowance?: boolean
          job_id?: string
          notes?: string | null
          org_id?: string
          original_estimate?: number
          previous_applications_baseline?: number
          revised_estimate?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      canonical_cost_codes: {
        Row: {
          category: string
          code: string
          created_at: string
          full_path: string
          id: string
          is_active: boolean
          level: number
          name: string
          parent_code: string | null
          spine: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          full_path: string
          id?: string
          is_active?: boolean
          level: number
          name: string
          parent_code?: string | null
          spine: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          full_path?: string
          id?: string
          is_active?: boolean
          level?: number
          name?: string
          parent_code?: string | null
          spine?: string
        }
        Relationships: []
      }
      change_order_lines: {
        Row: {
          amount: number
          budget_line_id: string | null
          co_id: string
          cost_code: string | null
          created_at: string
          created_po_id: string | null
          deleted_at: string | null
          description: string | null
          gc_fee_amount: number
          id: string
          org_id: string
          sort_order: number
        }
        Insert: {
          amount?: number
          budget_line_id?: string | null
          co_id: string
          cost_code?: string | null
          created_at?: string
          created_po_id?: string | null
          deleted_at?: string | null
          description?: string | null
          gc_fee_amount?: number
          id?: string
          org_id: string
          sort_order?: number
        }
        Update: {
          amount?: number
          budget_line_id?: string | null
          co_id?: string
          cost_code?: string | null
          created_at?: string
          created_po_id?: string | null
          deleted_at?: string | null
          description?: string | null
          gc_fee_amount?: number
          id?: string
          org_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "change_order_lines_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_lines_co_id_fkey"
            columns: ["co_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_lines_created_po_id_fkey"
            columns: ["created_po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders: {
        Row: {
          amount: number
          application_number: number | null
          approved_by: string | null
          approved_date: string | null
          co_type: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          denied_reason: string | null
          description: string | null
          draw_number: number | null
          estimated_days_added: number | null
          gc_fee_amount: number
          gc_fee_rate: number
          id: string
          job_id: string
          org_id: string
          pcco_number: number
          pricing_mode: string
          reason: string | null
          source_invoice_id: string | null
          source_proposal_id: string | null
          status: string
          status_history: Json
          submitted_date: string | null
          title: string | null
          total_with_fee: number
          updated_at: string
        }
        Insert: {
          amount?: number
          application_number?: number | null
          approved_by?: string | null
          approved_date?: string | null
          co_type?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          denied_reason?: string | null
          description?: string | null
          draw_number?: number | null
          estimated_days_added?: number | null
          gc_fee_amount?: number
          gc_fee_rate?: number
          id?: string
          job_id: string
          org_id: string
          pcco_number: number
          pricing_mode?: string
          reason?: string | null
          source_invoice_id?: string | null
          source_proposal_id?: string | null
          status?: string
          status_history?: Json
          submitted_date?: string | null
          title?: string | null
          total_with_fee?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          application_number?: number | null
          approved_by?: string | null
          approved_date?: string | null
          co_type?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          denied_reason?: string | null
          description?: string | null
          draw_number?: number | null
          estimated_days_added?: number | null
          gc_fee_amount?: number
          gc_fee_rate?: number
          id?: string
          job_id?: string
          org_id?: string
          pcco_number?: number
          pricing_mode?: string
          reason?: string | null
          source_invoice_id?: string | null
          source_proposal_id?: string | null
          status?: string
          status_history?: Json
          submitted_date?: string | null
          title?: string | null
          total_with_fee?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_source_invoice_id_fkey"
            columns: ["source_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_source_proposal_id_fkey"
            columns: ["source_proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_access: {
        Row: {
          access_token_hash: string
          client_id: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          invited_at: string
          job_id: string
          last_accessed_at: string | null
          name: string | null
          org_id: string
          revoked_at: string | null
          revoked_seq: number
          updated_at: string
          visibility_config: Json
        }
        Insert: {
          access_token_hash: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_at?: string
          job_id: string
          last_accessed_at?: string | null
          name?: string | null
          org_id: string
          revoked_at?: string | null
          revoked_seq?: number
          updated_at?: string
          visibility_config?: Json
        }
        Update: {
          access_token_hash?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_at?: string
          job_id?: string
          last_accessed_at?: string | null
          name?: string | null
          org_id?: string
          revoked_at?: string | null
          revoked_seq?: number
          updated_at?: string
          visibility_config?: Json
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_access_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_access_org_id_client_id_fkey"
            columns: ["org_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "client_portal_access_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_messages: {
        Row: {
          created_at: string
          created_by: string | null
          from_client_email: string | null
          from_type: string
          from_user_id: string | null
          id: string
          job_id: string
          message: string
          org_id: string
          read_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_client_email?: string | null
          from_type: string
          from_user_id?: string | null
          id?: string
          job_id: string
          message: string
          org_id: string
          read_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_client_email?: string | null
          from_type?: string
          from_user_id?: string | null
          id?: string
          job_id?: string
          message?: string
          org_id?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          org_id: string
          phone: string | null
          status_history: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          org_id: string
          phone?: string | null
          status_history?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          org_id?: string
          phone?: string | null
          status_history?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_code_templates: {
        Row: {
          codes: Json
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          codes: Json
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          codes?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cost_codes: {
        Row: {
          category: string | null
          code: string
          created_at: string
          created_by: string | null
          default_allowance_amount: number | null
          deleted_at: string | null
          description: string
          has_co_variant: boolean
          id: string
          is_allowance: boolean
          is_change_order: boolean
          org_id: string
          parent_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          default_allowance_amount?: number | null
          deleted_at?: string | null
          description: string
          has_co_variant?: boolean
          id?: string
          is_allowance?: boolean
          is_change_order?: boolean
          org_id: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          default_allowance_amount?: number | null
          deleted_at?: string | null
          description?: string
          has_co_variant?: boolean
          id?: string
          is_allowance?: boolean
          is_change_order?: boolean
          org_id?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_codes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_codes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      document_extraction_lines: {
        Row: {
          candidates_considered: Json | null
          classification_confidence: number | null
          correction_notes: string | null
          created_at: string
          deleted_at: string | null
          extracted_scope_size_confidence: number | null
          extracted_scope_size_source: string | null
          extracted_scope_size_value: number | null
          extraction_id: string
          id: string
          invoice_line_item_id: string | null
          is_allocated_overhead: boolean
          is_transaction_line: boolean
          landed_total_cents: number | null
          line_is_taxable: boolean | null
          line_nature: string | null
          line_order: number
          line_tax_cents: number
          match_confidence: number | null
          match_confidence_score: number | null
          match_reasoning: string | null
          match_tier: string | null
          non_item_reason: string | null
          org_id: string
          overhead_allocated_cents: number
          overhead_type: string | null
          proposed_item_data: Json | null
          proposed_item_id: string | null
          proposed_pricing_model: string | null
          proposed_scope_size_metric: string | null
          raw_description: string
          raw_quantity: number | null
          raw_total_cents: number | null
          raw_unit_price_cents: number | null
          raw_unit_text: string | null
          scope_estimated_material_cents: number | null
          scope_split_into_components: boolean
          source_page_number: number | null
          transaction_line_type: string | null
          updated_at: string
          vendor_item_pricing_id: string | null
          verification_status: string
          verified_at: string | null
          verified_by: string | null
          verified_item_id: string | null
        }
        Insert: {
          candidates_considered?: Json | null
          classification_confidence?: number | null
          correction_notes?: string | null
          created_at?: string
          deleted_at?: string | null
          extracted_scope_size_confidence?: number | null
          extracted_scope_size_source?: string | null
          extracted_scope_size_value?: number | null
          extraction_id: string
          id?: string
          invoice_line_item_id?: string | null
          is_allocated_overhead?: boolean
          is_transaction_line?: boolean
          landed_total_cents?: number | null
          line_is_taxable?: boolean | null
          line_nature?: string | null
          line_order: number
          line_tax_cents?: number
          match_confidence?: number | null
          match_confidence_score?: number | null
          match_reasoning?: string | null
          match_tier?: string | null
          non_item_reason?: string | null
          org_id: string
          overhead_allocated_cents?: number
          overhead_type?: string | null
          proposed_item_data?: Json | null
          proposed_item_id?: string | null
          proposed_pricing_model?: string | null
          proposed_scope_size_metric?: string | null
          raw_description: string
          raw_quantity?: number | null
          raw_total_cents?: number | null
          raw_unit_price_cents?: number | null
          raw_unit_text?: string | null
          scope_estimated_material_cents?: number | null
          scope_split_into_components?: boolean
          source_page_number?: number | null
          transaction_line_type?: string | null
          updated_at?: string
          vendor_item_pricing_id?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
          verified_item_id?: string | null
        }
        Update: {
          candidates_considered?: Json | null
          classification_confidence?: number | null
          correction_notes?: string | null
          created_at?: string
          deleted_at?: string | null
          extracted_scope_size_confidence?: number | null
          extracted_scope_size_source?: string | null
          extracted_scope_size_value?: number | null
          extraction_id?: string
          id?: string
          invoice_line_item_id?: string | null
          is_allocated_overhead?: boolean
          is_transaction_line?: boolean
          landed_total_cents?: number | null
          line_is_taxable?: boolean | null
          line_nature?: string | null
          line_order?: number
          line_tax_cents?: number
          match_confidence?: number | null
          match_confidence_score?: number | null
          match_reasoning?: string | null
          match_tier?: string | null
          non_item_reason?: string | null
          org_id?: string
          overhead_allocated_cents?: number
          overhead_type?: string | null
          proposed_item_data?: Json | null
          proposed_item_id?: string | null
          proposed_pricing_model?: string | null
          proposed_scope_size_metric?: string | null
          raw_description?: string
          raw_quantity?: number | null
          raw_total_cents?: number | null
          raw_unit_price_cents?: number | null
          raw_unit_text?: string | null
          scope_estimated_material_cents?: number | null
          scope_split_into_components?: boolean
          source_page_number?: number | null
          transaction_line_type?: string | null
          updated_at?: string
          vendor_item_pricing_id?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
          verified_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_extraction_lines_extraction_id_fkey"
            columns: ["extraction_id"]
            isOneToOne: false
            referencedRelation: "document_extractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_extraction_lines_invoice_line_item_id_fkey"
            columns: ["invoice_line_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_extraction_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_extraction_lines_proposed_item_id_fkey"
            columns: ["proposed_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_extraction_lines_vendor_item_pricing_id_fkey"
            columns: ["vendor_item_pricing_id"]
            isOneToOne: false
            referencedRelation: "vendor_item_pricing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_extraction_lines_verified_item_id_fkey"
            columns: ["verified_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      document_extractions: {
        Row: {
          auto_commit_reason: string | null
          auto_committed: boolean | null
          classification_confidence: number
          classified_type: string | null
          created_at: string
          deleted_at: string | null
          extracted_at: string | null
          extracted_data: Json | null
          extraction_model: string | null
          extraction_prompt_version: string | null
          field_confidences: Json | null
          id: string
          invoice_id: string | null
          invoice_overhead: Json
          invoice_subtotal_cents: number | null
          invoice_tax_cents: number
          invoice_tax_rate: number | null
          invoice_total_cents: number | null
          org_id: string
          raw_ocr_text: string | null
          raw_pdf_url: string | null
          skipped_lines: Json
          target_entity_id: string | null
          target_entity_type: string | null
          total_lines_count: number | null
          total_tokens_input: number | null
          total_tokens_output: number | null
          updated_at: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
          verified_lines_count: number | null
        }
        Insert: {
          auto_commit_reason?: string | null
          auto_committed?: boolean | null
          classification_confidence?: number
          classified_type?: string | null
          created_at?: string
          deleted_at?: string | null
          extracted_at?: string | null
          extracted_data?: Json | null
          extraction_model?: string | null
          extraction_prompt_version?: string | null
          field_confidences?: Json | null
          id?: string
          invoice_id?: string | null
          invoice_overhead?: Json
          invoice_subtotal_cents?: number | null
          invoice_tax_cents?: number
          invoice_tax_rate?: number | null
          invoice_total_cents?: number | null
          org_id: string
          raw_ocr_text?: string | null
          raw_pdf_url?: string | null
          skipped_lines?: Json
          target_entity_id?: string | null
          target_entity_type?: string | null
          total_lines_count?: number | null
          total_tokens_input?: number | null
          total_tokens_output?: number | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
          verified_lines_count?: number | null
        }
        Update: {
          auto_commit_reason?: string | null
          auto_committed?: boolean | null
          classification_confidence?: number
          classified_type?: string | null
          created_at?: string
          deleted_at?: string | null
          extracted_at?: string | null
          extracted_data?: Json | null
          extraction_model?: string | null
          extraction_prompt_version?: string | null
          field_confidences?: Json | null
          id?: string
          invoice_id?: string | null
          invoice_overhead?: Json
          invoice_subtotal_cents?: number | null
          invoice_tax_cents?: number
          invoice_tax_rate?: number | null
          invoice_total_cents?: number | null
          org_id?: string
          raw_ocr_text?: string | null
          raw_pdf_url?: string | null
          skipped_lines?: Json
          target_entity_id?: string | null
          target_entity_type?: string | null
          total_lines_count?: number | null
          total_tokens_input?: number | null
          total_tokens_output?: number | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
          verified_lines_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_extractions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_extractions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      draw_adjustment_line_items: {
        Row: {
          adjustment_id: string
          allocation_cents: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          draw_line_item_id: string
          id: string
          org_id: string
          updated_at: string
        }
        Insert: {
          adjustment_id: string
          allocation_cents: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          draw_line_item_id: string
          id?: string
          org_id: string
          updated_at?: string
        }
        Update: {
          adjustment_id?: string
          allocation_cents?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          draw_line_item_id?: string
          id?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "draw_adjustment_line_items_adjustment_id_fkey"
            columns: ["adjustment_id"]
            isOneToOne: false
            referencedRelation: "draw_adjustments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_adjustment_line_items_draw_line_item_id_fkey"
            columns: ["draw_line_item_id"]
            isOneToOne: false
            referencedRelation: "draw_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_adjustment_line_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      draw_adjustments: {
        Row: {
          adjustment_status: string
          adjustment_type: string
          affected_invoice_id: string | null
          affected_pcco_number: string | null
          affected_vendor_id: string | null
          amount_cents: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          draw_id: string
          draw_line_item_id: string | null
          gp_impact_cents: number | null
          id: string
          org_id: string
          reason: string
          source_document_id: string | null
          status_history: Json
          updated_at: string
        }
        Insert: {
          adjustment_status?: string
          adjustment_type: string
          affected_invoice_id?: string | null
          affected_pcco_number?: string | null
          affected_vendor_id?: string | null
          amount_cents: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          draw_id: string
          draw_line_item_id?: string | null
          gp_impact_cents?: number | null
          id?: string
          org_id: string
          reason: string
          source_document_id?: string | null
          status_history?: Json
          updated_at?: string
        }
        Update: {
          adjustment_status?: string
          adjustment_type?: string
          affected_invoice_id?: string | null
          affected_pcco_number?: string | null
          affected_vendor_id?: string | null
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          draw_id?: string
          draw_line_item_id?: string | null
          gp_impact_cents?: number | null
          id?: string
          org_id?: string
          reason?: string
          source_document_id?: string | null
          status_history?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "draw_adjustments_affected_invoice_id_fkey"
            columns: ["affected_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_adjustments_affected_vendor_id_fkey"
            columns: ["affected_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_adjustments_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draws"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_adjustments_draw_line_item_id_fkey"
            columns: ["draw_line_item_id"]
            isOneToOne: false
            referencedRelation: "draw_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_adjustments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      draw_line_items: {
        Row: {
          balance_to_finish: number
          budget_line_id: string | null
          change_order_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          draw_id: string
          id: string
          internal_billing_id: string | null
          org_id: string
          percent_complete: number
          previous_applications: number
          source_type: string | null
          this_period: number
          total_to_date: number
          updated_at: string
        }
        Insert: {
          balance_to_finish?: number
          budget_line_id?: string | null
          change_order_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          draw_id: string
          id?: string
          internal_billing_id?: string | null
          org_id: string
          percent_complete?: number
          previous_applications?: number
          source_type?: string | null
          this_period?: number
          total_to_date?: number
          updated_at?: string
        }
        Update: {
          balance_to_finish?: number
          budget_line_id?: string | null
          change_order_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          draw_id?: string
          id?: string
          internal_billing_id?: string | null
          org_id?: string
          percent_complete?: number
          previous_applications?: number
          source_type?: string | null
          this_period?: number
          total_to_date?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "draw_line_items_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_line_items_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_line_items_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draws"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_line_items_internal_billing_id_fkey"
            columns: ["internal_billing_id"]
            isOneToOne: false
            referencedRelation: "internal_billings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_line_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      draws: {
        Row: {
          application_date: string | null
          approved_at: string | null
          approved_by: string | null
          balance_to_finish: number
          contract_sum_to_date: number
          cover_letter_text: string | null
          created_at: string
          created_by: string | null
          current_payment_due: number
          deleted_at: string | null
          deposit_amount: number
          draw_mode: string
          draw_number: number
          id: string
          is_final: boolean
          job_id: string
          less_previous_certificates: number
          less_previous_payments: number
          locked_at: string | null
          milestone_completions: Json
          net_change_orders: number
          org_id: string
          original_contract_sum: number
          paid_at: string | null
          parent_draw_id: string | null
          period_end: string | null
          period_start: string | null
          retainage_on_completed: number
          retainage_on_stored: number
          revision_number: number
          status: string
          status_history: Json
          submitted_at: string | null
          tm_labor_hours: number | null
          tm_markup_amount: number | null
          tm_material_cost: number | null
          tm_sub_cost: number | null
          total_completed_to_date: number
          total_earned_less_retainage: number
          total_retainage: number
          updated_at: string
          wizard_draft: Json | null
        }
        Insert: {
          application_date?: string | null
          approved_at?: string | null
          approved_by?: string | null
          balance_to_finish?: number
          contract_sum_to_date?: number
          cover_letter_text?: string | null
          created_at?: string
          created_by?: string | null
          current_payment_due?: number
          deleted_at?: string | null
          deposit_amount?: number
          draw_mode?: string
          draw_number: number
          id?: string
          is_final?: boolean
          job_id: string
          less_previous_certificates?: number
          less_previous_payments?: number
          locked_at?: string | null
          milestone_completions?: Json
          net_change_orders?: number
          org_id: string
          original_contract_sum?: number
          paid_at?: string | null
          parent_draw_id?: string | null
          period_end?: string | null
          period_start?: string | null
          retainage_on_completed?: number
          retainage_on_stored?: number
          revision_number?: number
          status?: string
          status_history?: Json
          submitted_at?: string | null
          tm_labor_hours?: number | null
          tm_markup_amount?: number | null
          tm_material_cost?: number | null
          tm_sub_cost?: number | null
          total_completed_to_date?: number
          total_earned_less_retainage?: number
          total_retainage?: number
          updated_at?: string
          wizard_draft?: Json | null
        }
        Update: {
          application_date?: string | null
          approved_at?: string | null
          approved_by?: string | null
          balance_to_finish?: number
          contract_sum_to_date?: number
          cover_letter_text?: string | null
          created_at?: string
          created_by?: string | null
          current_payment_due?: number
          deleted_at?: string | null
          deposit_amount?: number
          draw_mode?: string
          draw_number?: number
          id?: string
          is_final?: boolean
          job_id?: string
          less_previous_certificates?: number
          less_previous_payments?: number
          locked_at?: string | null
          milestone_completions?: Json
          net_change_orders?: number
          org_id?: string
          original_contract_sum?: number
          paid_at?: string | null
          parent_draw_id?: string | null
          period_end?: string | null
          period_start?: string | null
          retainage_on_completed?: number
          retainage_on_stored?: number
          revision_number?: number
          status?: string
          status_history?: Json
          submitted_at?: string | null
          tm_labor_hours?: number | null
          tm_markup_amount?: number | null
          tm_material_cost?: number | null
          tm_sub_cost?: number | null
          total_completed_to_date?: number
          total_earned_less_retainage?: number
          total_retainage?: number
          updated_at?: string
          wizard_draft?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "draws_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draws_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draws_parent_draw_id_fkey"
            columns: ["parent_draw_id"]
            isOneToOne: false
            referencedRelation: "draws"
            referencedColumns: ["id"]
          },
        ]
      }
      email_inbox: {
        Row: {
          attachments: Json | null
          body_html: string | null
          body_text: string | null
          created_at: string
          from_address: string | null
          id: string
          invoice_id: string | null
          org_id: string
          processed: boolean
          processed_at: string | null
          subject: string | null
          to_address: string | null
        }
        Insert: {
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          from_address?: string | null
          id?: string
          invoice_id?: string | null
          org_id: string
          processed?: boolean
          processed_at?: string | null
          subject?: string | null
          to_address?: string | null
        }
        Update: {
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          from_address?: string | null
          id?: string
          invoice_id?: string | null
          org_id?: string
          processed?: boolean
          processed_at?: string | null
          subject?: string | null
          to_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_inbox_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_inbox_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_notes: {
        Row: {
          admin_notes: string | null
          browser: string | null
          category: string
          created_at: string
          id: string
          impersonation_active: boolean | null
          impersonation_admin_id: string | null
          note: string
          org_id: string
          os: string | null
          page_url: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          theme: string | null
          updated_at: string
          user_id: string
          user_role: string | null
        }
        Insert: {
          admin_notes?: string | null
          browser?: string | null
          category: string
          created_at?: string
          id?: string
          impersonation_active?: boolean | null
          impersonation_admin_id?: string | null
          note: string
          org_id: string
          os?: string | null
          page_url?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          theme?: string | null
          updated_at?: string
          user_id: string
          user_role?: string | null
        }
        Update: {
          admin_notes?: string | null
          browser?: string | null
          category?: string
          created_at?: string
          id?: string
          impersonation_active?: boolean | null
          impersonation_admin_id?: string | null
          note?: string
          org_id?: string
          os?: string | null
          page_url?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          theme?: string | null
          updated_at?: string
          user_id?: string
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_notes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_billing_types: {
        Row: {
          calculation_method: string
          created_at: string
          default_amount_cents: number | null
          default_cost_code_id: string | null
          default_percentage: number | null
          default_quantity_unit: string | null
          default_rate_cents: number | null
          id: string
          is_active: boolean
          name: string
          org_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          calculation_method: string
          created_at?: string
          default_amount_cents?: number | null
          default_cost_code_id?: string | null
          default_percentage?: number | null
          default_quantity_unit?: string | null
          default_rate_cents?: number | null
          id?: string
          is_active?: boolean
          name: string
          org_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          calculation_method?: string
          created_at?: string
          default_amount_cents?: number | null
          default_cost_code_id?: string | null
          default_percentage?: number | null
          default_quantity_unit?: string | null
          default_rate_cents?: number | null
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_billing_types_default_cost_code_id_fkey"
            columns: ["default_cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_billing_types_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_billings: {
        Row: {
          amount_cents: number
          billing_type_id: string
          cost_code_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          draw_line_item_id: string | null
          id: string
          job_id: string
          notes: string | null
          org_id: string
          percentage: number | null
          period_end: string | null
          period_start: string | null
          quantity: number | null
          rate_cents: number | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          billing_type_id: string
          cost_code_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          draw_line_item_id?: string | null
          id?: string
          job_id: string
          notes?: string | null
          org_id: string
          percentage?: number | null
          period_end?: string | null
          period_start?: string | null
          quantity?: number | null
          rate_cents?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          billing_type_id?: string
          cost_code_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          draw_line_item_id?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          org_id?: string
          percentage?: number | null
          period_end?: string | null
          period_start?: string | null
          quantity?: number | null
          rate_cents?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_billings_billing_type_id_fkey"
            columns: ["billing_type_id"]
            isOneToOne: false
            referencedRelation: "internal_billing_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_billings_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_billings_draw_line_item_id_fkey"
            columns: ["draw_line_item_id"]
            isOneToOne: false
            referencedRelation: "draw_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_billings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_billings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_allocations: {
        Row: {
          amount_cents: number
          change_order_id: string | null
          cost_code_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          invoice_id: string
          org_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          change_order_id?: string | null
          cost_code_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          invoice_id: string
          org_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          change_order_id?: string | null
          cost_code_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          invoice_id?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_allocations_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_allocations_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_allocations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_import_batches: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          duplicate_count: number
          error_count: number
          id: string
          org_id: string
          parsed_count: number
          sent_to_queue_count: number
          settings_snapshot: Json | null
          status: string
          total_files: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duplicate_count?: number
          error_count?: number
          id?: string
          org_id: string
          parsed_count?: number
          sent_to_queue_count?: number
          settings_snapshot?: Json | null
          status?: string
          total_files?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duplicate_count?: number
          error_count?: number
          id?: string
          org_id?: string
          parsed_count?: number
          sent_to_queue_count?: number
          settings_snapshot?: Json | null
          status?: string
          total_files?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_import_batches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          ai_suggested_cost_code_id: string | null
          ai_suggestion_confidence: number | null
          amount_cents: number
          budget_line_id: string | null
          co_reference: string | null
          cost_code_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          invoice_id: string
          is_change_order: boolean
          line_index: number
          org_id: string
          po_id: string | null
          qty: number | null
          rate: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          ai_suggested_cost_code_id?: string | null
          ai_suggestion_confidence?: number | null
          amount_cents?: number
          budget_line_id?: string | null
          co_reference?: string | null
          cost_code_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          invoice_id: string
          is_change_order?: boolean
          line_index?: number
          org_id: string
          po_id?: string | null
          qty?: number | null
          rate?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          ai_suggested_cost_code_id?: string | null
          ai_suggestion_confidence?: number | null
          amount_cents?: number
          budget_line_id?: string | null
          co_reference?: string | null
          cost_code_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          invoice_id?: string
          is_change_order?: boolean
          line_index?: number
          org_id?: string
          po_id?: string | null
          qty?: number | null
          rate?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_ai_suggested_cost_code_id_fkey"
            columns: ["ai_suggested_cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          ai_model_used: string | null
          ai_parsed_total_amount: number | null
          ai_raw_response: Json | null
          assigned_pm_id: string | null
          check_number: string | null
          co_id: string | null
          co_reference_raw: string | null
          confidence_details: Json | null
          confidence_score: number | null
          cost_code_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          document_category: string
          document_type: string
          draw_id: string | null
          duplicate_dismissed_at: string | null
          duplicate_dismissed_by: string | null
          duplicate_of_id: string | null
          id: string
          import_batch_id: string | null
          import_error: string | null
          import_retry_count: number
          invoice_date: string | null
          invoice_number: string | null
          invoice_type: string | null
          is_change_order: boolean
          is_potential_duplicate: boolean
          job_id: string | null
          job_reference_raw: string | null
          line_items: Json
          mailed_date: string | null
          org_id: string
          original_file_type: string | null
          original_file_url: string | null
          original_filename: string | null
          parent_invoice_id: string | null
          partial_approval_note: string | null
          payment_amount: number | null
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          picked_up: boolean
          pm_overrides: Json | null
          po_id: string | null
          po_reference_raw: string | null
          qa_overrides: Json | null
          qb_bill_id: string | null
          received_date: string | null
          scheduled_payment_date: string | null
          status: string
          status_history: Json
          total_amount: number
          updated_at: string
          vendor_id: string | null
          vendor_name_raw: string | null
        }
        Insert: {
          ai_model_used?: string | null
          ai_parsed_total_amount?: number | null
          ai_raw_response?: Json | null
          assigned_pm_id?: string | null
          check_number?: string | null
          co_id?: string | null
          co_reference_raw?: string | null
          confidence_details?: Json | null
          confidence_score?: number | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          document_category?: string
          document_type?: string
          draw_id?: string | null
          duplicate_dismissed_at?: string | null
          duplicate_dismissed_by?: string | null
          duplicate_of_id?: string | null
          id?: string
          import_batch_id?: string | null
          import_error?: string | null
          import_retry_count?: number
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_type?: string | null
          is_change_order?: boolean
          is_potential_duplicate?: boolean
          job_id?: string | null
          job_reference_raw?: string | null
          line_items?: Json
          mailed_date?: string | null
          org_id: string
          original_file_type?: string | null
          original_file_url?: string | null
          original_filename?: string | null
          parent_invoice_id?: string | null
          partial_approval_note?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          picked_up?: boolean
          pm_overrides?: Json | null
          po_id?: string | null
          po_reference_raw?: string | null
          qa_overrides?: Json | null
          qb_bill_id?: string | null
          received_date?: string | null
          scheduled_payment_date?: string | null
          status?: string
          status_history?: Json
          total_amount?: number
          updated_at?: string
          vendor_id?: string | null
          vendor_name_raw?: string | null
        }
        Update: {
          ai_model_used?: string | null
          ai_parsed_total_amount?: number | null
          ai_raw_response?: Json | null
          assigned_pm_id?: string | null
          check_number?: string | null
          co_id?: string | null
          co_reference_raw?: string | null
          confidence_details?: Json | null
          confidence_score?: number | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          document_category?: string
          document_type?: string
          draw_id?: string | null
          duplicate_dismissed_at?: string | null
          duplicate_dismissed_by?: string | null
          duplicate_of_id?: string | null
          id?: string
          import_batch_id?: string | null
          import_error?: string | null
          import_retry_count?: number
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_type?: string | null
          is_change_order?: boolean
          is_potential_duplicate?: boolean
          job_id?: string | null
          job_reference_raw?: string | null
          line_items?: Json
          mailed_date?: string | null
          org_id?: string
          original_file_type?: string | null
          original_file_url?: string | null
          original_filename?: string | null
          parent_invoice_id?: string | null
          partial_approval_note?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          picked_up?: boolean
          pm_overrides?: Json | null
          po_id?: string | null
          po_reference_raw?: string | null
          qa_overrides?: Json | null
          qb_bill_id?: string | null
          received_date?: string | null
          scheduled_payment_date?: string | null
          status?: string
          status_history?: Json
          total_amount?: number
          updated_at?: string
          vendor_id?: string | null
          vendor_name_raw?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoices_draw"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draws"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_assigned_pm_id_fkey"
            columns: ["assigned_pm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_co_id_fkey"
            columns: ["co_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_duplicate_of_id_fkey"
            columns: ["duplicate_of_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "invoice_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_parent_invoice_id_fkey"
            columns: ["parent_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      item_aliases: {
        Row: {
          alias_text: string
          created_at: string | null
          first_seen_at: string | null
          id: string
          item_id: string
          last_seen_at: string | null
          occurrence_count: number | null
          org_id: string
          source_type: string | null
          vendor_id: string | null
        }
        Insert: {
          alias_text: string
          created_at?: string | null
          first_seen_at?: string | null
          id?: string
          item_id: string
          last_seen_at?: string | null
          occurrence_count?: number | null
          org_id: string
          source_type?: string | null
          vendor_id?: string | null
        }
        Update: {
          alias_text?: string
          created_at?: string | null
          first_seen_at?: string | null
          id?: string
          item_id?: string
          last_seen_at?: string | null
          occurrence_count?: number | null
          org_id?: string
          source_type?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_aliases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_aliases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_aliases_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      item_classification_corrections: {
        Row: {
          ai_canonical_name: string | null
          ai_confidence: number | null
          ai_created_via: string | null
          ai_item_id: string | null
          ai_specs: Json | null
          corrected_by: string | null
          corrected_canonical_name: string | null
          corrected_item_id: string | null
          corrected_specs: Json | null
          correction_notes: string | null
          created_at: string
          id: string
          org_id: string
          source_record_id: string | null
          source_text: string
          source_type: string | null
          vendor_id: string | null
        }
        Insert: {
          ai_canonical_name?: string | null
          ai_confidence?: number | null
          ai_created_via?: string | null
          ai_item_id?: string | null
          ai_specs?: Json | null
          corrected_by?: string | null
          corrected_canonical_name?: string | null
          corrected_item_id?: string | null
          corrected_specs?: Json | null
          correction_notes?: string | null
          created_at?: string
          id?: string
          org_id: string
          source_record_id?: string | null
          source_text: string
          source_type?: string | null
          vendor_id?: string | null
        }
        Update: {
          ai_canonical_name?: string | null
          ai_confidence?: number | null
          ai_created_via?: string | null
          ai_item_id?: string | null
          ai_specs?: Json | null
          corrected_by?: string | null
          corrected_canonical_name?: string | null
          corrected_item_id?: string | null
          corrected_specs?: Json | null
          correction_notes?: string | null
          created_at?: string
          id?: string
          org_id?: string
          source_record_id?: string | null
          source_text?: string
          source_type?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_classification_corrections_ai_item_id_fkey"
            columns: ["ai_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_classification_corrections_corrected_item_id_fkey"
            columns: ["corrected_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_classification_corrections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_classification_corrections_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          ai_confidence: number | null
          canonical_code_id: string | null
          canonical_name: string
          canonical_unit: string
          category: string | null
          conversion_rules: Json
          created_at: string
          created_by: string | null
          default_cost_code_id: string | null
          deleted_at: string | null
          description: string | null
          embedding: string | null
          first_seen_source: string | null
          human_verified: boolean | null
          human_verified_at: string | null
          human_verified_by: string | null
          id: string
          item_type: string
          occurrence_count: number
          org_id: string
          pricing_model: string
          scope_size_metric: string | null
          specs: Json | null
          subcategory: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          ai_confidence?: number | null
          canonical_code_id?: string | null
          canonical_name: string
          canonical_unit: string
          category?: string | null
          conversion_rules?: Json
          created_at?: string
          created_by?: string | null
          default_cost_code_id?: string | null
          deleted_at?: string | null
          description?: string | null
          embedding?: string | null
          first_seen_source?: string | null
          human_verified?: boolean | null
          human_verified_at?: string | null
          human_verified_by?: string | null
          id?: string
          item_type: string
          occurrence_count?: number
          org_id: string
          pricing_model?: string
          scope_size_metric?: string | null
          specs?: Json | null
          subcategory?: string | null
          unit: string
          updated_at?: string
        }
        Update: {
          ai_confidence?: number | null
          canonical_code_id?: string | null
          canonical_name?: string
          canonical_unit?: string
          category?: string | null
          conversion_rules?: Json
          created_at?: string
          created_by?: string | null
          default_cost_code_id?: string | null
          deleted_at?: string | null
          description?: string | null
          embedding?: string | null
          first_seen_source?: string | null
          human_verified?: boolean | null
          human_verified_at?: string | null
          human_verified_by?: string | null
          id?: string
          item_type?: string
          occurrence_count?: number
          org_id?: string
          pricing_model?: string
          scope_size_metric?: string | null
          specs?: Json | null
          subcategory?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_canonical_code_id_fkey"
            columns: ["canonical_code_id"]
            isOneToOne: false
            referencedRelation: "canonical_cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_default_cost_code_id_fkey"
            columns: ["default_cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_item_activity: {
        Row: {
          actual_quantity: number | null
          actual_total_cents: number | null
          cost_code_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          first_purchase_date: string | null
          id: string
          item_id: string
          job_id: string
          last_purchase_date: string | null
          org_id: string
          planned_quantity: number | null
          planned_total_cents: number | null
          planned_unit_price_cents: number | null
          planned_vendor_id: string | null
          scope_tags: string[] | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_quantity?: number | null
          actual_total_cents?: number | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          first_purchase_date?: string | null
          id?: string
          item_id: string
          job_id: string
          last_purchase_date?: string | null
          org_id: string
          planned_quantity?: number | null
          planned_total_cents?: number | null
          planned_unit_price_cents?: number | null
          planned_vendor_id?: string | null
          scope_tags?: string[] | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_quantity?: number | null
          actual_total_cents?: number | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          first_purchase_date?: string | null
          id?: string
          item_id?: string
          job_id?: string
          last_purchase_date?: string | null
          org_id?: string
          planned_quantity?: number | null
          planned_total_cents?: number | null
          planned_unit_price_cents?: number | null
          planned_vendor_id?: string | null
          scope_tags?: string[] | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_item_activity_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_item_activity_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_item_activity_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_item_activity_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_item_activity_planned_vendor_id_fkey"
            columns: ["planned_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      job_milestones: {
        Row: {
          amount_cents: number
          completed_date: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          job_id: string
          name: string
          org_id: string
          sort_order: number
          status: string
          status_history: Json
          target_date: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          job_id: string
          name: string
          org_id: string
          sort_order: number
          status?: string
          status_history?: Json
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          job_id?: string
          name?: string
          org_id?: string
          sort_order?: number
          status?: string
          status_history?: Json
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_milestones_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_milestones_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          address: string | null
          approved_cos_total: number
          backup_detail: string | null
          bathroom_count: number | null
          bedroom_count: number | null
          billing_method: string
          characteristics_enrichment_source: Json | null
          client_id: string | null
          complexity_factors: Json | null
          construction_type: string | null
          contract_date: string | null
          contract_type: string
          created_at: string
          created_by: string | null
          current_contract_amount: number
          deleted_at: string | null
          deposit_percentage: number
          finish_level: string | null
          garage_bay_count: number | null
          gc_fee_percentage: number
          half_bathroom_count: number | null
          heated_sf: number | null
          id: string
          lot_size_sf: number | null
          markup_display: string | null
          name: string
          org_id: string
          original_contract_amount: number
          phase: string
          pm_id: string | null
          previous_certificates_total: number
          previous_change_orders_total: number
          previous_co_completed_amount: number | null
          region_jurisdiction: Json | null
          retainage_dropoff_percent: number
          retainage_percent: number
          retainage_threshold_percent: number
          site_characteristics: Json | null
          starting_application_number: number | null
          status: string
          status_history: Json
          story_count: number | null
          total_sf: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          approved_cos_total?: number
          backup_detail?: string | null
          bathroom_count?: number | null
          bedroom_count?: number | null
          billing_method?: string
          characteristics_enrichment_source?: Json | null
          client_id?: string | null
          complexity_factors?: Json | null
          construction_type?: string | null
          contract_date?: string | null
          contract_type?: string
          created_at?: string
          created_by?: string | null
          current_contract_amount?: number
          deleted_at?: string | null
          deposit_percentage?: number
          finish_level?: string | null
          garage_bay_count?: number | null
          gc_fee_percentage?: number
          half_bathroom_count?: number | null
          heated_sf?: number | null
          id?: string
          lot_size_sf?: number | null
          markup_display?: string | null
          name: string
          org_id: string
          original_contract_amount?: number
          phase?: string
          pm_id?: string | null
          previous_certificates_total?: number
          previous_change_orders_total?: number
          previous_co_completed_amount?: number | null
          region_jurisdiction?: Json | null
          retainage_dropoff_percent?: number
          retainage_percent?: number
          retainage_threshold_percent?: number
          site_characteristics?: Json | null
          starting_application_number?: number | null
          status?: string
          status_history?: Json
          story_count?: number | null
          total_sf?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          approved_cos_total?: number
          backup_detail?: string | null
          bathroom_count?: number | null
          bedroom_count?: number | null
          billing_method?: string
          characteristics_enrichment_source?: Json | null
          client_id?: string | null
          complexity_factors?: Json | null
          construction_type?: string | null
          contract_date?: string | null
          contract_type?: string
          created_at?: string
          created_by?: string | null
          current_contract_amount?: number
          deleted_at?: string | null
          deposit_percentage?: number
          finish_level?: string | null
          garage_bay_count?: number | null
          gc_fee_percentage?: number
          half_bathroom_count?: number | null
          heated_sf?: number | null
          id?: string
          lot_size_sf?: number | null
          markup_display?: string | null
          name?: string
          org_id?: string
          original_contract_amount?: number
          phase?: string
          pm_id?: string | null
          previous_certificates_total?: number
          previous_change_orders_total?: number
          previous_co_completed_amount?: number | null
          region_jurisdiction?: Json | null
          retainage_dropoff_percent?: number
          retainage_percent?: number
          retainage_threshold_percent?: number
          site_characteristics?: Json | null
          starting_application_number?: number | null
          status?: string
          status_history?: Json
          story_count?: number | null
          total_sf?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_pm_id_profiles_fkey"
            columns: ["pm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lien_releases: {
        Row: {
          amount: number | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document_url: string | null
          draw_id: string | null
          id: string
          job_id: string | null
          notes: string | null
          org_id: string
          po_id: string | null
          received_at: string | null
          release_type: string
          status: string
          status_history: Json
          through_date: string | null
          updated_at: string
          vendor_id: string | null
          waived_at: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_url?: string | null
          draw_id?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          org_id: string
          po_id?: string | null
          received_at?: string | null
          release_type: string
          status?: string
          status_history?: Json
          through_date?: string | null
          updated_at?: string
          vendor_id?: string | null
          waived_at?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_url?: string | null
          draw_id?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          org_id?: string
          po_id?: string | null
          received_at?: string | null
          release_type?: string
          status?: string
          status_history?: Json
          through_date?: string | null
          updated_at?: string
          vendor_id?: string | null
          waived_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lien_releases_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draws"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lien_releases_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lien_releases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lien_releases_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lien_releases_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      line_bom_attachments: {
        Row: {
          ai_confidence: number | null
          ai_reasoning: string | null
          attachment_source: string
          bom_extraction_line_id: string
          confirmation_status: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          org_id: string
          product_description: string | null
          product_specs: Json
          scope_extraction_line_id: string
          updated_at: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_reasoning?: string | null
          attachment_source: string
          bom_extraction_line_id: string
          confirmation_status?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          org_id: string
          product_description?: string | null
          product_specs?: Json
          scope_extraction_line_id: string
          updated_at?: string
        }
        Update: {
          ai_confidence?: number | null
          ai_reasoning?: string | null
          attachment_source?: string
          bom_extraction_line_id?: string
          confirmation_status?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          org_id?: string
          product_description?: string | null
          product_specs?: Json
          scope_extraction_line_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_bom_attachments_bom_extraction_line_id_fkey"
            columns: ["bom_extraction_line_id"]
            isOneToOne: false
            referencedRelation: "document_extraction_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "line_bom_attachments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "line_bom_attachments_scope_extraction_line_id_fkey"
            columns: ["scope_extraction_line_id"]
            isOneToOne: false
            referencedRelation: "document_extraction_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      line_cost_components: {
        Row: {
          ai_confidence: number | null
          amount_cents: number
          component_type: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          display_order: number | null
          id: string
          invoice_extraction_line_id: string | null
          notes: string | null
          org_id: string
          quantity: number | null
          source: string
          unit: string | null
          unit_rate_cents: number | null
          updated_at: string
          vendor_item_pricing_id: string | null
        }
        Insert: {
          ai_confidence?: number | null
          amount_cents: number
          component_type: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          display_order?: number | null
          id?: string
          invoice_extraction_line_id?: string | null
          notes?: string | null
          org_id: string
          quantity?: number | null
          source: string
          unit?: string | null
          unit_rate_cents?: number | null
          updated_at?: string
          vendor_item_pricing_id?: string | null
        }
        Update: {
          ai_confidence?: number | null
          amount_cents?: number
          component_type?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          display_order?: number | null
          id?: string
          invoice_extraction_line_id?: string | null
          notes?: string | null
          org_id?: string
          quantity?: number | null
          source?: string
          unit?: string | null
          unit_rate_cents?: number | null
          updated_at?: string
          vendor_item_pricing_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "line_cost_components_invoice_extraction_line_id_fkey"
            columns: ["invoice_extraction_line_id"]
            isOneToOne: false
            referencedRelation: "document_extraction_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "line_cost_components_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "line_cost_components_vendor_item_pricing_id_fkey"
            columns: ["vendor_item_pricing_id"]
            isOneToOne: false
            referencedRelation: "vendor_item_pricing"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          created_at: string
          id: string
          org_id: string
          read: boolean
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          org_id: string
          read?: boolean
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          org_id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_cost_codes: {
        Row: {
          canonical_code_id: string | null
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          org_id: string
          parent_code: string | null
          updated_at: string
        }
        Insert: {
          canonical_code_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          org_id: string
          parent_code?: string | null
          updated_at?: string
        }
        Update: {
          canonical_code_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string
          parent_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_cost_codes_canonical_code_id_fkey"
            columns: ["canonical_code_id"]
            isOneToOne: false
            referencedRelation: "canonical_cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_cost_codes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invites: {
        Row: {
          accepted_at: string | null
          email: string
          expires_at: string
          id: string
          invited_at: string
          invited_by: string
          org_id: string
          revoked_at: string | null
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by: string
          org_id: string
          revoked_at?: string | null
          role: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by?: string
          org_id?: string
          revoked_at?: string | null
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          email_notifications_enabled: boolean
          id: string
          invited_at: string
          invited_by: string | null
          is_active: boolean
          org_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email_notifications_enabled?: boolean
          id?: string
          invited_at?: string
          invited_by?: string | null
          is_active?: boolean
          org_id: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email_notifications_enabled?: boolean
          id?: string
          invited_at?: string
          invited_by?: string | null
          is_active?: boolean
          org_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_workflow_settings: {
        Row: {
          auto_route_confidence_threshold: number
          auto_route_high_confidence: boolean
          batch_approval_enabled: boolean
          co_approval_required: boolean
          cover_letter_template: string | null
          created_at: string
          duplicate_detection_enabled: boolean
          duplicate_detection_sensitivity: string
          id: string
          import_auto_route_threshold: number
          import_default_pm_id: string | null
          import_max_batch_size: number
          org_id: string
          over_budget_requires_note: boolean
          payment_auto_scheduling: boolean
          quick_approve_enabled: boolean
          quick_approve_min_confidence: number
          require_budget_allocation: boolean
          require_co_budget_allocation: boolean
          require_invoice_date: boolean
          require_lien_release_for_draw: boolean
          require_po_linkage: boolean
          updated_at: string
        }
        Insert: {
          auto_route_confidence_threshold?: number
          auto_route_high_confidence?: boolean
          batch_approval_enabled?: boolean
          co_approval_required?: boolean
          cover_letter_template?: string | null
          created_at?: string
          duplicate_detection_enabled?: boolean
          duplicate_detection_sensitivity?: string
          id?: string
          import_auto_route_threshold?: number
          import_default_pm_id?: string | null
          import_max_batch_size?: number
          org_id: string
          over_budget_requires_note?: boolean
          payment_auto_scheduling?: boolean
          quick_approve_enabled?: boolean
          quick_approve_min_confidence?: number
          require_budget_allocation?: boolean
          require_co_budget_allocation?: boolean
          require_invoice_date?: boolean
          require_lien_release_for_draw?: boolean
          require_po_linkage?: boolean
          updated_at?: string
        }
        Update: {
          auto_route_confidence_threshold?: number
          auto_route_high_confidence?: boolean
          batch_approval_enabled?: boolean
          co_approval_required?: boolean
          cover_letter_template?: string | null
          created_at?: string
          duplicate_detection_enabled?: boolean
          duplicate_detection_sensitivity?: string
          id?: string
          import_auto_route_threshold?: number
          import_default_pm_id?: string | null
          import_max_batch_size?: number
          org_id?: string
          over_budget_requires_note?: boolean
          payment_auto_scheduling?: boolean
          quick_approve_enabled?: boolean
          quick_approve_min_confidence?: number
          require_budget_allocation?: boolean
          require_co_budget_allocation?: boolean
          require_invoice_date?: boolean
          require_lien_release_for_draw?: boolean
          require_po_linkage?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_workflow_settings_import_default_pm_id_fkey"
            columns: ["import_default_pm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_workflow_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          accent_color: string | null
          ai_calls_limit: number
          ai_calls_this_month: number
          builder_type: string | null
          company_address: string | null
          company_city: string | null
          company_email: string | null
          company_phone: string | null
          company_state: string | null
          company_type: string | null
          company_website: string | null
          company_zip: string | null
          cost_intelligence_settings: Json | null
          created_at: string
          default_backup_detail: string
          default_billing_method: string
          default_deposit_percentage: number
          default_gc_fee_percentage: number
          default_markup_display: string
          default_retainage_percent: number
          deleted_at: string | null
          id: string
          logo_url: string | null
          name: string
          onboarding_complete: boolean
          payment_schedule_config: Json
          payment_schedule_type: string
          primary_color: string
          revenue_band: string | null
          slug: string
          storage_used_bytes: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_plan: string
          subscription_status: string
          tagline: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          ai_calls_limit?: number
          ai_calls_this_month?: number
          builder_type?: string | null
          company_address?: string | null
          company_city?: string | null
          company_email?: string | null
          company_phone?: string | null
          company_state?: string | null
          company_type?: string | null
          company_website?: string | null
          company_zip?: string | null
          cost_intelligence_settings?: Json | null
          created_at?: string
          default_backup_detail?: string
          default_billing_method?: string
          default_deposit_percentage?: number
          default_gc_fee_percentage?: number
          default_markup_display?: string
          default_retainage_percent?: number
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          onboarding_complete?: boolean
          payment_schedule_config?: Json
          payment_schedule_type?: string
          primary_color?: string
          revenue_band?: string | null
          slug: string
          storage_used_bytes?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_plan?: string
          subscription_status?: string
          tagline?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          ai_calls_limit?: number
          ai_calls_this_month?: number
          builder_type?: string | null
          company_address?: string | null
          company_city?: string | null
          company_email?: string | null
          company_phone?: string | null
          company_state?: string | null
          company_type?: string | null
          company_website?: string | null
          company_zip?: string | null
          cost_intelligence_settings?: Json | null
          created_at?: string
          default_backup_detail?: string
          default_billing_method?: string
          default_deposit_percentage?: number
          default_gc_fee_percentage?: number
          default_markup_display?: string
          default_retainage_percent?: number
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          onboarding_complete?: boolean
          payment_schedule_config?: Json
          payment_schedule_type?: string
          primary_color?: string
          revenue_band?: string | null
          slug?: string
          storage_used_bytes?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_plan?: string
          subscription_status?: string
          tagline?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      owner_portal_rate_limit: {
        Row: {
          id: number
          key_type: string
          key_value: string
          request_count: number
          window_start: string
        }
        Insert: {
          id?: number
          key_type: string
          key_value: string
          request_count?: number
          window_start: string
        }
        Update: {
          id?: number
          key_type?: string
          key_value?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      parser_corrections: {
        Row: {
          corrected_at: string
          corrected_by: string
          corrected_value: string | null
          cost_code_id: string | null
          field_name: string
          id: string
          invoice_id: string
          org_id: string
          original_confidence: number | null
          original_value: string | null
          vendor_name: string | null
        }
        Insert: {
          corrected_at?: string
          corrected_by: string
          corrected_value?: string | null
          cost_code_id?: string | null
          field_name: string
          id?: string
          invoice_id: string
          org_id: string
          original_confidence?: number | null
          original_value?: string | null
          vendor_name?: string | null
        }
        Update: {
          corrected_at?: string
          corrected_by?: string
          corrected_value?: string | null
          cost_code_id?: string | null
          field_name?: string
          id?: string
          invoice_id?: string
          org_id?: string
          original_confidence?: number | null
          original_value?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parser_corrections_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parser_corrections_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_cost_code_suggestions: {
        Row: {
          approved_org_cost_code_id: string | null
          created_at: string
          id: string
          org_id: string
          rationale: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          source_proposal_line_item_id: string | null
          status: string
          suggested_by: string
          suggested_canonical_code_id: string | null
          suggested_code: string
          suggested_name: string
          suggested_parent_code: string | null
          updated_at: string
        }
        Insert: {
          approved_org_cost_code_id?: string | null
          created_at?: string
          id?: string
          org_id: string
          rationale?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_proposal_line_item_id?: string | null
          status?: string
          suggested_by: string
          suggested_canonical_code_id?: string | null
          suggested_code: string
          suggested_name: string
          suggested_parent_code?: string | null
          updated_at?: string
        }
        Update: {
          approved_org_cost_code_id?: string | null
          created_at?: string
          id?: string
          org_id?: string
          rationale?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_proposal_line_item_id?: string | null
          status?: string
          suggested_by?: string
          suggested_canonical_code_id?: string | null
          suggested_code?: string
          suggested_name?: string
          suggested_parent_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_cost_code_suggestions_approved_org_cost_code_id_fkey"
            columns: ["approved_org_cost_code_id"]
            isOneToOne: false
            referencedRelation: "org_cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_cost_code_suggestions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_cost_code_suggestions_source_proposal_line_item_id_fkey"
            columns: ["source_proposal_line_item_id"]
            isOneToOne: false
            referencedRelation: "proposal_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_cost_code_suggestions_suggested_canonical_code_id_fkey"
            columns: ["suggested_canonical_code_id"]
            isOneToOne: false
            referencedRelation: "canonical_cost_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admin_audit: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          reason: string | null
          target_org_id: string | null
          target_record_id: string | null
          target_record_type: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          reason?: string | null
          target_org_id?: string | null
          target_record_id?: string | null
          target_record_type?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          reason?: string | null
          target_org_id?: string | null
          target_record_id?: string | null
          target_record_type?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_admin_audit_target_org_id_fkey"
            columns: ["target_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          created_by: string | null
          notes: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          notes?: string | null
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          notes?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      po_line_items: {
        Row: {
          amount: number
          budget_line_id: string | null
          cost_code: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          org_id: string
          po_id: string
          sort_order: number
        }
        Insert: {
          amount?: number
          budget_line_id?: string | null
          cost_code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          org_id: string
          po_id: string
          sort_order?: number
        }
        Update: {
          amount?: number
          budget_line_id?: string | null
          cost_code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          org_id?: string
          po_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "po_line_items_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_line_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_line_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_history: {
        Row: {
          amount: number
          canonical_item_id: string | null
          cost_code_id: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string
          id: string
          job_id: string
          match_confidence: number | null
          org_id: string
          quantity: number | null
          source_id: string
          source_line_id: string
          source_type: string
          unit: string | null
          unit_price: number | null
          vendor_id: string | null
        }
        Insert: {
          amount: number
          canonical_item_id?: string | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          description: string
          id?: string
          job_id: string
          match_confidence?: number | null
          org_id: string
          quantity?: number | null
          source_id: string
          source_line_id: string
          source_type: string
          unit?: string | null
          unit_price?: number | null
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          canonical_item_id?: string | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          job_id?: string
          match_confidence?: number | null
          org_id?: string
          quantity?: number | null
          source_id?: string
          source_line_id?: string
          source_type?: string
          unit?: string | null
          unit_price?: number | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_history_canonical_item_id_fkey"
            columns: ["canonical_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_history_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_history_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          org_id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          org_id: string
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          org_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_line_items: {
        Row: {
          amount: number
          attributes: Json
          canonical_code_id: string | null
          cost_code_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          delivery_cents: number | null
          description: string
          description_normalized: string | null
          extraction_confidence: number | null
          id: string
          item_id: string | null
          labor_cost_cents: number | null
          material_cost_cents: number | null
          notes_cents: number | null
          org_cost_code_id: string | null
          org_id: string
          pm_edited: boolean
          pm_edits: Json | null
          proposal_id: string
          quantity: number | null
          scope_detail: string | null
          sort_order: number
          subcontract_cost_cents: number | null
          tax_cents: number | null
          unit: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          amount: number
          attributes?: Json
          canonical_code_id?: string | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_cents?: number | null
          description: string
          description_normalized?: string | null
          extraction_confidence?: number | null
          id?: string
          item_id?: string | null
          labor_cost_cents?: number | null
          material_cost_cents?: number | null
          notes_cents?: number | null
          org_cost_code_id?: string | null
          org_id: string
          pm_edited?: boolean
          pm_edits?: Json | null
          proposal_id: string
          quantity?: number | null
          scope_detail?: string | null
          sort_order?: number
          subcontract_cost_cents?: number | null
          tax_cents?: number | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          attributes?: Json
          canonical_code_id?: string | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_cents?: number | null
          description?: string
          description_normalized?: string | null
          extraction_confidence?: number | null
          id?: string
          item_id?: string | null
          labor_cost_cents?: number | null
          material_cost_cents?: number | null
          notes_cents?: number | null
          org_cost_code_id?: string | null
          org_id?: string
          pm_edited?: boolean
          pm_edits?: Json | null
          proposal_id?: string
          quantity?: number | null
          scope_detail?: string | null
          sort_order?: number
          subcontract_cost_cents?: number | null
          tax_cents?: number | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_line_items_canonical_code_id_fkey"
            columns: ["canonical_code_id"]
            isOneToOne: false
            referencedRelation: "canonical_cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_line_items_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_line_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_line_items_org_cost_code_id_fkey"
            columns: ["org_cost_code_id"]
            isOneToOne: false
            referencedRelation: "org_cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_line_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_line_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          accepted_signature_date: string | null
          accepted_signature_name: string | null
          accepted_signature_present: boolean
          additional_fee_schedule: Json | null
          amount: number | null
          converted_co_id: string | null
          converted_po_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          exclusions: string | null
          extraction_confidence: number | null
          id: string
          inclusions: string | null
          job_address: string | null
          job_id: string
          notes: string | null
          org_id: string
          payment_schedule: Json | null
          payment_terms: Json | null
          plan_version_referenced: string | null
          proposal_date: string | null
          proposal_number: string | null
          raw_extraction: Json
          received_date: string | null
          schedule_items: Json | null
          scope_summary: string | null
          source_document_id: string | null
          status: string
          status_history: Json
          superseded_by_proposal_id: string | null
          terms: string | null
          title: string
          updated_at: string
          valid_through: string | null
          vendor_id: string
          vendor_stated_duration_days: number | null
          vendor_stated_start_date: string | null
        }
        Insert: {
          accepted_signature_date?: string | null
          accepted_signature_name?: string | null
          accepted_signature_present?: boolean
          additional_fee_schedule?: Json | null
          amount?: number | null
          converted_co_id?: string | null
          converted_po_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          exclusions?: string | null
          extraction_confidence?: number | null
          id?: string
          inclusions?: string | null
          job_address?: string | null
          job_id: string
          notes?: string | null
          org_id: string
          payment_schedule?: Json | null
          payment_terms?: Json | null
          plan_version_referenced?: string | null
          proposal_date?: string | null
          proposal_number?: string | null
          raw_extraction?: Json
          received_date?: string | null
          schedule_items?: Json | null
          scope_summary?: string | null
          source_document_id?: string | null
          status?: string
          status_history?: Json
          superseded_by_proposal_id?: string | null
          terms?: string | null
          title: string
          updated_at?: string
          valid_through?: string | null
          vendor_id: string
          vendor_stated_duration_days?: number | null
          vendor_stated_start_date?: string | null
        }
        Update: {
          accepted_signature_date?: string | null
          accepted_signature_name?: string | null
          accepted_signature_present?: boolean
          additional_fee_schedule?: Json | null
          amount?: number | null
          converted_co_id?: string | null
          converted_po_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          exclusions?: string | null
          extraction_confidence?: number | null
          id?: string
          inclusions?: string | null
          job_address?: string | null
          job_id?: string
          notes?: string | null
          org_id?: string
          payment_schedule?: Json | null
          payment_terms?: Json | null
          plan_version_referenced?: string | null
          proposal_date?: string | null
          proposal_number?: string | null
          raw_extraction?: Json
          received_date?: string | null
          schedule_items?: Json | null
          scope_summary?: string | null
          source_document_id?: string | null
          status?: string
          status_history?: Json
          superseded_by_proposal_id?: string | null
          terms?: string | null
          title?: string
          updated_at?: string
          valid_through?: string | null
          vendor_id?: string
          vendor_stated_duration_days?: number | null
          vendor_stated_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_converted_co_id_fkey"
            columns: ["converted_co_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_converted_po_id_fkey"
            columns: ["converted_po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "document_extractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_superseded_by_proposal_id_fkey"
            columns: ["superseded_by_proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          amount: number
          budget_line_id: string | null
          co_id: string | null
          cost_code_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          invoiced_total: number
          issued_date: string | null
          job_id: string
          notes: string | null
          org_id: string
          po_number: string | null
          status: string
          status_history: Json
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          amount?: number
          budget_line_id?: string | null
          co_id?: string | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          invoiced_total?: number
          issued_date?: string | null
          job_id: string
          notes?: string | null
          org_id: string
          po_number?: string | null
          status?: string
          status_history?: Json
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          budget_line_id?: string | null
          co_id?: string | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          invoiced_total?: number
          issued_date?: string | null
          job_id?: string
          notes?: string | null
          org_id?: string
          po_number?: string | null
          status?: string
          status_history?: Json
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_purchase_orders_co"
            columns: ["co_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      selection_categories: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          display_order: number | null
          id: string
          name: string
          org_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
          org_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "selection_categories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      selections: {
        Row: {
          actual_cost_cents: number | null
          allowance_cents: number | null
          allowance_notes: string | null
          category_id: string | null
          cost_delta_cents: number | null
          created_at: string | null
          created_by: string | null
          decided_at: string | null
          decided_by_owner_name: string | null
          deleted_at: string | null
          description: string | null
          estimated_cost_cents: number | null
          id: string
          installed_at: string | null
          job_id: string
          lead_time_days: number | null
          linked_item_id: string | null
          name: string
          needed_by_date: string | null
          ordered_at: string | null
          org_id: string
          received_at: string | null
          selected_product_name: string | null
          selected_product_specs: Json | null
          selected_vendor_id: string | null
          status: string
          status_history: Json | null
          updated_at: string | null
        }
        Insert: {
          actual_cost_cents?: number | null
          allowance_cents?: number | null
          allowance_notes?: string | null
          category_id?: string | null
          cost_delta_cents?: number | null
          created_at?: string | null
          created_by?: string | null
          decided_at?: string | null
          decided_by_owner_name?: string | null
          deleted_at?: string | null
          description?: string | null
          estimated_cost_cents?: number | null
          id?: string
          installed_at?: string | null
          job_id: string
          lead_time_days?: number | null
          linked_item_id?: string | null
          name: string
          needed_by_date?: string | null
          ordered_at?: string | null
          org_id: string
          received_at?: string | null
          selected_product_name?: string | null
          selected_product_specs?: Json | null
          selected_vendor_id?: string | null
          status?: string
          status_history?: Json | null
          updated_at?: string | null
        }
        Update: {
          actual_cost_cents?: number | null
          allowance_cents?: number | null
          allowance_notes?: string | null
          category_id?: string | null
          cost_delta_cents?: number | null
          created_at?: string | null
          created_by?: string | null
          decided_at?: string | null
          decided_by_owner_name?: string | null
          deleted_at?: string | null
          description?: string | null
          estimated_cost_cents?: number | null
          id?: string
          installed_at?: string | null
          job_id?: string
          lead_time_days?: number | null
          linked_item_id?: string | null
          name?: string
          needed_by_date?: string | null
          ordered_at?: string | null
          org_id?: string
          received_at?: string | null
          selected_product_name?: string | null
          selected_product_specs?: Json | null
          selected_vendor_id?: string | null
          status?: string
          status_history?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "selections_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "selection_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selections_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selections_linked_item_id_fkey"
            columns: ["linked_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selections_selected_vendor_id_fkey"
            columns: ["selected_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          org_id: string
          plan_slug: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id: string
          plan_slug: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id?: string
          plan_slug?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_conversations: {
        Row: {
          admin_notes: string | null
          created_at: string
          escalated_at: string | null
          escalation_reason: string | null
          id: string
          org_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          escalated_at?: string | null
          escalation_reason?: string | null
          id?: string
          org_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          escalated_at?: string | null
          escalation_reason?: string | null
          id?: string
          org_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_conversations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          tokens_input: number | null
          tokens_output: number | null
          tool_calls: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          tokens_input?: number | null
          tokens_output?: number | null
          tool_calls?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          tokens_input?: number | null
          tokens_output?: number | null
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_conversion_suggestions: {
        Row: {
          ai_confidence: number | null
          ai_reasoning: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          confirmed_ratio: number | null
          created_at: string
          deleted_at: string | null
          from_unit: string
          id: string
          item_id: string
          notes: string | null
          org_id: string
          source_extraction_line_id: string | null
          status: string
          suggested_ratio: number
          to_unit: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_reasoning?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmed_ratio?: number | null
          created_at?: string
          deleted_at?: string | null
          from_unit: string
          id?: string
          item_id: string
          notes?: string | null
          org_id: string
          source_extraction_line_id?: string | null
          status?: string
          suggested_ratio: number
          to_unit: string
        }
        Update: {
          ai_confidence?: number | null
          ai_reasoning?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmed_ratio?: number | null
          created_at?: string
          deleted_at?: string | null
          from_unit?: string
          id?: string
          item_id?: string
          notes?: string | null
          org_id?: string
          source_extraction_line_id?: string | null
          status?: string
          suggested_ratio?: number
          to_unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_conversion_suggestions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_conversion_suggestions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_conversion_suggestions_source_extraction_line_id_fkey"
            columns: ["source_extraction_line_id"]
            isOneToOne: false
            referencedRelation: "document_extraction_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_conversion_templates: {
        Row: {
          created_at: string
          from_unit: string
          id: string
          item_category: string
          item_subcategory: string | null
          notes: string | null
          ratio: number
          specs_match: Json | null
          to_unit: string
        }
        Insert: {
          created_at?: string
          from_unit: string
          id?: string
          item_category: string
          item_subcategory?: string | null
          notes?: string | null
          ratio: number
          specs_match?: Json | null
          to_unit: string
        }
        Update: {
          created_at?: string
          from_unit?: string
          id?: string
          item_category?: string
          item_subcategory?: string | null
          notes?: string | null
          ratio?: number
          specs_match?: Json | null
          to_unit?: string
        }
        Relationships: []
      }
      vendor_item_pricing: {
        Row: {
          ai_confidence: number | null
          auto_committed: boolean | null
          canonical_quantity: number | null
          canonical_unit_price_cents: number | null
          conversion_applied: Json | null
          cost_code_id: string | null
          created_at: string
          created_by: string | null
          created_via: string | null
          deleted_at: string | null
          human_verified: boolean | null
          human_verified_at: string | null
          human_verified_by: string | null
          id: string
          is_taxable: boolean | null
          item_id: string
          job_id: string | null
          landed_total_cents: number | null
          observed_quantity: number | null
          observed_unit: string | null
          observed_unit_price_cents: number | null
          org_id: string
          overhead_allocated_cents: number
          quantity: number
          recorded_at: string
          scope_size_confidence: number | null
          scope_size_notes: string | null
          scope_size_source: string | null
          scope_size_value: number | null
          scope_tags: string[] | null
          source_co_id: string | null
          source_doc_url: string | null
          source_extraction_line_id: string | null
          source_invoice_id: string | null
          source_invoice_line_id: string | null
          source_po_id: string | null
          source_type: string
          tax_cents: number
          tax_rate: number | null
          total_cents: number
          transaction_date: string
          unit: string
          unit_price_cents: number
          vendor_id: string
        }
        Insert: {
          ai_confidence?: number | null
          auto_committed?: boolean | null
          canonical_quantity?: number | null
          canonical_unit_price_cents?: number | null
          conversion_applied?: Json | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          created_via?: string | null
          deleted_at?: string | null
          human_verified?: boolean | null
          human_verified_at?: string | null
          human_verified_by?: string | null
          id?: string
          is_taxable?: boolean | null
          item_id: string
          job_id?: string | null
          landed_total_cents?: number | null
          observed_quantity?: number | null
          observed_unit?: string | null
          observed_unit_price_cents?: number | null
          org_id: string
          overhead_allocated_cents?: number
          quantity: number
          recorded_at?: string
          scope_size_confidence?: number | null
          scope_size_notes?: string | null
          scope_size_source?: string | null
          scope_size_value?: number | null
          scope_tags?: string[] | null
          source_co_id?: string | null
          source_doc_url?: string | null
          source_extraction_line_id?: string | null
          source_invoice_id?: string | null
          source_invoice_line_id?: string | null
          source_po_id?: string | null
          source_type: string
          tax_cents?: number
          tax_rate?: number | null
          total_cents: number
          transaction_date: string
          unit: string
          unit_price_cents: number
          vendor_id: string
        }
        Update: {
          ai_confidence?: number | null
          auto_committed?: boolean | null
          canonical_quantity?: number | null
          canonical_unit_price_cents?: number | null
          conversion_applied?: Json | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          created_via?: string | null
          deleted_at?: string | null
          human_verified?: boolean | null
          human_verified_at?: string | null
          human_verified_by?: string | null
          id?: string
          is_taxable?: boolean | null
          item_id?: string
          job_id?: string | null
          landed_total_cents?: number | null
          observed_quantity?: number | null
          observed_unit?: string | null
          observed_unit_price_cents?: number | null
          org_id?: string
          overhead_allocated_cents?: number
          quantity?: number
          recorded_at?: string
          scope_size_confidence?: number | null
          scope_size_notes?: string | null
          scope_size_source?: string | null
          scope_size_value?: number | null
          scope_tags?: string[] | null
          source_co_id?: string | null
          source_doc_url?: string | null
          source_extraction_line_id?: string | null
          source_invoice_id?: string | null
          source_invoice_line_id?: string | null
          source_po_id?: string | null
          source_type?: string
          tax_cents?: number
          tax_rate?: number | null
          total_cents?: number
          transaction_date?: string
          unit?: string
          unit_price_cents?: number
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_item_pricing_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_item_pricing_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_item_pricing_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_item_pricing_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_item_pricing_source_invoice_id_fkey"
            columns: ["source_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_item_pricing_source_invoice_line_id_fkey"
            columns: ["source_invoice_line_id"]
            isOneToOne: false
            referencedRelation: "invoice_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_item_pricing_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vip_source_extraction_line_fk"
            columns: ["source_extraction_line_id"]
            isOneToOne: false
            referencedRelation: "document_extraction_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          default_cost_code_id: string | null
          deleted_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          org_id: string
          phone: string | null
          qb_vendor_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          default_cost_code_id?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          org_id: string
          phone?: string | null
          qb_vendor_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          default_cost_code_id?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          phone?: string | null
          qb_vendor_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_vendors_default_cost_code"
            columns: ["default_cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _compute_scheduled_payment_date: {
        Args: { _received_date: string; _schedule: string }
        Returns: string
      }
      autoconfirm_signup: { Args: { p_email: string }; Returns: undefined }
      cleanup_owner_portal_rate_limit: { Args: never; Returns: undefined }
      create_client_portal_invite: {
        Args: {
          p_email: string
          p_expires_at: string
          p_job_id: string
          p_name: string
          p_org_id: string
          p_visibility_config: Json
        }
        Returns: {
          plaintext_token: string
          portal_access_id: string
        }[]
      }
      create_organization_for_new_user: {
        Args: {
          p_email: string
          p_full_name: string
          p_org_name: string
          p_org_slug: string
        }
        Returns: string
      }
      create_signup: {
        Args: {
          p_company_address?: string
          p_company_name: string
          p_company_phone?: string
          p_company_type?: string
          p_email: string
          p_full_name: string
          p_password: string
          p_revenue_band?: string
        }
        Returns: Json
      }
      default_stages_for_workflow_type: { Args: { _wt: string }; Returns: Json }
      draw_approve_rpc: {
        Args: {
          _actor_user_id: string
          _draw_id: string
          _expected_updated_at?: string
          _force_fail?: string
          _reason?: string
        }
        Returns: Json
      }
      draw_submit_rpc: {
        Args: {
          _actor_user_id: string
          _draw_id: string
          _expected_updated_at?: string
          _force_fail?: string
          _reason?: string
        }
        Returns: Json
      }
      draw_void_rpc: {
        Args: {
          _actor_user_id: string
          _draw_id: string
          _expected_updated_at?: string
          _force_fail?: string
          _reason?: string
        }
        Returns: Json
      }
      mark_client_portal_message_read: {
        Args: { p_message_id: string; p_token: string }
        Returns: undefined
      }
      next_po_number: { Args: { p_org_id: string }; Returns: string }
      recompute_budget_line_co_adjustments: {
        Args: { p_budget_line_id: string }
        Returns: undefined
      }
      recompute_budget_line_committed: {
        Args: { p_budget_line_id: string }
        Returns: undefined
      }
      recompute_budget_line_invoiced: {
        Args: { p_budget_line_id: string }
        Returns: undefined
      }
      recompute_po_invoiced: { Args: { p_po_id: string }; Returns: undefined }
      record_owner_portal_request: {
        Args: {
          p_key_type: string
          p_key_value: string
          p_window_start: string
        }
        Returns: number
      }
      submit_client_portal_message: {
        Args: { p_message: string; p_token: string }
        Returns: {
          message_id: string
        }[]
      }
      validate_visibility_config: { Args: { p_config: Json }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
