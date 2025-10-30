export type Database = {
  public: {
    Tables: {
      candidates: {
        Row: {
          id: string
          email: string
          full_name: string
          company: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          company?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          company?: string | null
          created_at?: string
        }
      }
      results: {
        Row: {
          id: string
          candidate_id: string
          natural_d: number
          natural_i: number
          natural_s: number
          natural_c: number
          response_d: number
          response_i: number
          response_s: number
          response_c: number
          profile_code: string
          created_at: string
        }
        Insert: {
          id?: string
          candidate_id: string
          natural_d: number
          natural_i: number
          natural_s: number
          natural_c: number
          response_d: number
          response_i: number
          response_s: number
          response_c: number
          profile_code: string
          created_at?: string
        }
        Update: {
          id?: string
          candidate_id?: string
          natural_d?: number
          natural_i?: number
          natural_s?: number
          natural_c?: number
          response_d?: number
          response_i?: number
          response_s?: number
          response_c?: number
          profile_code?: string
          created_at?: string
        }
      }
      answers: {
        Row: {
          id: string
          candidate_id: string
          status: 'draft' | 'completed'
          created_at: string
        }
        Insert: {
          id?: string
          candidate_id: string
          status?: 'draft' | 'completed'
          created_at?: string
        }
        Update: {
          id?: string
          candidate_id?: string
          status?: 'draft' | 'completed'
          created_at?: string
        }
      }
    }
  }
}
