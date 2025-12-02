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
          wrong_answer: string | null
          wrong_answer_explanation: string | null
          created_at: string
          updated_at: string
          is_honeypot: boolean
        }
        Insert: {
          id?: string
          title: string
          description: string
          difficulty?: string
          category?: string | null
          default_code?: string | null
          hidden_prompt?: string | null
          wrong_answer?: string | null
          wrong_answer_explanation?: string | null
          created_at?: string
          updated_at?: string
          is_honeypot?: boolean
        }
        Update: {
          id?: string
          title?: string
          description?: string
          difficulty?: string
          category?: string | null
          default_code?: string | null
          hidden_prompt?: string | null
          wrong_answer?: string | null
          wrong_answer_explanation?: string | null
          created_at?: string
          updated_at?: string
          is_honeypot?: boolean
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
          session_token: string | null
          honeypot_token: string
          is_public: boolean
          interviewer_ready: boolean
          interviewee_started: boolean
          approved: boolean
          candidate_name: string | null
          client_ip: string | null
          attack_modality: string
          ocr_enabled: boolean
          instructions_hidden: boolean
          attack_techniques: any | null
          distractor_text: string | null
          watermark_config: any | null
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
          session_token?: string | null
          honeypot_token: string
          is_public?: boolean
          interviewer_ready?: boolean
          interviewee_started?: boolean
          approved?: boolean
          candidate_name?: string | null
          client_ip?: string | null
          attack_modality?: string
          ocr_enabled?: boolean
          instructions_hidden?: boolean
          attack_techniques?: any | null
          distractor_text?: string | null
          watermark_config?: any | null
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
          session_token?: string | null
          honeypot_token?: string
          is_public?: boolean
          interviewer_ready?: boolean
          interviewee_started?: boolean
          approved?: boolean
          candidate_name?: string | null
          client_ip?: string | null
          attack_modality?: string
          ocr_enabled?: boolean
          instructions_hidden?: boolean
          attack_techniques?: any | null
          distractor_text?: string | null
          watermark_config?: any | null
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
          exposed_info?: any | null
        }
      }
      honeypot_access_logs: {
        Row: {
          id: string
          token_used: string
          detected_ip: string | null
          user_agent: string | null
          timestamp: string
          severity: string
        }
        Insert: {
          id?: string
          token_used: string
          detected_ip?: string | null
          user_agent?: string | null
          timestamp?: string
          severity?: string
        }
        Update: {
          id?: string
          token_used?: string
          detected_ip?: string | null
          user_agent?: string | null
          timestamp?: string
          severity?: string
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
export type HoneypotAccessLog = Database['public']['Tables']['honeypot_access_logs']['Row']

