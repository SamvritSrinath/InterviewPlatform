export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          is_interviewer: boolean
          is_admin: boolean
          full_name: string | null
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          is_interviewer?: boolean
          is_admin?: boolean
          full_name?: string | null
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          is_interviewer?: boolean
          is_admin?: boolean
          full_name?: string | null
        }
      }
      problems: {
        Row: {
          id: string
          title: string
          description: string
          difficulty: string
          category: string | null
          default_code: string | null
          hidden_prompt: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          difficulty?: string
          category?: string | null
          default_code?: string | null
          hidden_prompt?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          difficulty?: string
          category?: string | null
          default_code?: string | null
          hidden_prompt?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          problem_id: string
          user_id: string
          interviewer_id: string | null
          start_time: string
          end_time: string | null
          time_limit: number | null
          session_status: string
          created_at: string
          client_ip?: string | null
          session_token: string | null
          is_public: boolean
          interviewer_ready: boolean
          interviewee_started: boolean
        }
        Insert: {
          id?: string
          problem_id: string
          user_id: string
          interviewer_id?: string | null
          start_time?: string
          end_time?: string | null
          time_limit?: number | null
          session_status?: string
          created_at?: string
          client_ip?: string | null
          session_token?: string | null
          is_public?: boolean
          interviewer_ready?: boolean
          interviewee_started?: boolean
        }
        Update: {
          id?: string
          problem_id?: string
          user_id?: string
          interviewer_id?: string | null
          start_time?: string
          end_time?: string | null
          time_limit?: number | null
          session_status?: string
          created_at?: string
          client_ip?: string | null
          session_token?: string | null
          is_public?: boolean
          interviewer_ready?: boolean
          interviewee_started?: boolean
        }
      }
      solutions: {
        Row: {
          id: string
          session_id: string | null
          user_id: string
          problem_id: string
          code: string
          language: string
          submission_time: string
          execution_output: string | null
          execution_status: string | null
          has_hidden_prompt: boolean
          similarity_score: number
          suspicious_activity: any | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id?: string | null
          user_id: string
          problem_id: string
          code: string
          language?: string
          submission_time?: string
          execution_output?: string | null
          execution_status?: string | null
          has_hidden_prompt?: boolean
          similarity_score?: number
          suspicious_activity?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string | null
          user_id?: string
          problem_id?: string
          code?: string
          language?: string
          submission_time?: string
          execution_output?: string | null
          execution_status?: string | null
          has_hidden_prompt?: boolean
          similarity_score?: number
          suspicious_activity?: any | null
          created_at?: string
        }
      }
      cheating_attempts: {
        Row: {
          id: string
          user_id: string
          session_id: string | null
          problem_id: string | null
          solution_id: string | null
          attempt_type: string
          details: any | null
          detected_at: string
          resolved: boolean
          resolution_notes: string | null
          client_ip?: string | null
          exposed_info?: any | null
        }
        Insert: {
          id?: string
          user_id: string
          session_id?: string | null
          problem_id?: string | null
          solution_id?: string | null
          attempt_type: string
          details?: any | null
          detected_at?: string
          resolved?: boolean
          resolution_notes?: string | null
          client_ip?: string | null
          exposed_info?: any | null
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string | null
          problem_id?: string | null
          solution_id?: string | null
          attempt_type?: string
          details?: any | null
          detected_at?: string
          resolved?: boolean
          resolution_notes?: string | null
          client_ip?: string | null
          exposed_info?: any | null
        }
      }
      user_ips: {
        Row: {
          id: string
          user_id: string
          ip_address: string
          session_id: string | null
          detected_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ip_address: string
          session_id?: string | null
          detected_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ip_address?: string
          session_id?: string | null
          detected_at?: string
        }
      }
      scraper_logs: {
        Row: {
          id: string
          ip_address: string
          user_agent: string | null
          pattern_type: string | null
          request_path: string | null
          detected_at: string
        }
        Insert: {
          id?: string
          ip_address: string
          user_agent?: string | null
          pattern_type?: string | null
          request_path?: string | null
          detected_at?: string
        }
        Update: {
          id?: string
          ip_address?: string
          user_agent?: string | null
          pattern_type?: string | null
          request_path?: string | null
          detected_at?: string
        }
      }
    }
  }
}

// Convenience types
export type User = Database['public']['Tables']['users']['Row']
export type Problem = Database['public']['Tables']['problems']['Row']
export type Session = Database['public']['Tables']['sessions']['Row']
export type Solution = Database['public']['Tables']['solutions']['Row']
export type CheatingAttempt = Database['public']['Tables']['cheating_attempts']['Row']
export type UserIP = Database['public']['Tables']['user_ips']['Row']
export type ScraperLog = Database['public']['Tables']['scraper_logs']['Row']

