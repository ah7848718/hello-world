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
  public: {
    Tables: {
      ai_faq: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          id: string
          is_active: boolean | null
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      active_sessions: {
        Row: {
          created_at: string
          device_label: string | null
          last_seen_at: string
          session_id: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          last_seen_at?: string
          session_id: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          last_seen_at?: string
          session_id?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      assistants: {
        Row: {
          can_manage_homework: boolean
          can_manage_qna: boolean
          can_manage_support: boolean
          created_at: string
          created_by: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          can_manage_homework?: boolean
          can_manage_qna?: boolean
          can_manage_support?: boolean
          created_at?: string
          created_by: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          can_manage_homework?: boolean
          can_manage_qna?: boolean
          can_manage_support?: boolean
          created_at?: string
          created_by?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      book_orders: {
        Row: {
          address: string
          admin_notes: string | null
          book_id: string
          created_at: string
          full_name: string
          governorate: string
          id: string
          notes: string | null
          phone: string
          quantity: number
          status: Database["public"]["Enums"]["book_order_status"]
          student_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          address: string
          admin_notes?: string | null
          book_id: string
          created_at?: string
          full_name: string
          governorate: string
          id?: string
          notes?: string | null
          phone: string
          quantity?: number
          status?: Database["public"]["Enums"]["book_order_status"]
          student_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          address?: string
          admin_notes?: string | null
          book_id?: string
          created_at?: string
          full_name?: string
          governorate?: string
          id?: string
          notes?: string | null
          phone?: string
          quantity?: number
          status?: Database["public"]["Enums"]["book_order_status"]
          student_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          cover_url: string | null
          created_at: string
          created_by: string
          description: string | null
          discount_percent: number
          grade: string | null
          id: string
          is_published: boolean
          order_index: number
          pdf_url: string | null
          price: number
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          discount_percent?: number
          grade?: string | null
          id?: string
          is_published?: boolean
          order_index?: number
          pdf_url?: string | null
          price?: number
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          discount_percent?: number
          grade?: string | null
          id?: string
          is_published?: boolean
          order_index?: number
          pdf_url?: string | null
          price?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bundle_courses: {
        Row: {
          bundle_id: string
          course_id: string
        }
        Insert: {
          bundle_id: string
          course_id: string
        }
        Update: {
          bundle_id?: string
          course_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_courses_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      bundles: {
        Row: {
          bundle_type: string
          cover_url: string | null
          created_at: string
          created_by: string
          description: string | null
          discount_percent: number
          grade: string | null
          id: string
          is_published: boolean
          months: string[] | null
          order_index: number
          price: number
          term: string | null
          title: string
          updated_at: string
        }
        Insert: {
          bundle_type?: string
          cover_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          discount_percent?: number
          grade?: string | null
          id?: string
          is_published?: boolean
          months?: string[] | null
          order_index?: number
          price?: number
          term?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          bundle_type?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          discount_percent?: number
          grade?: string | null
          id?: string
          is_published?: boolean
          months?: string[] | null
          order_index?: number
          price?: number
          term?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      center_codes: {
        Row: {
          amount: number
          center_id: string | null
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_used: boolean
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          amount: number
          center_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          amount?: number
          center_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      center_students: {
        Row: {
          center_id: string
          id: string
          is_active: boolean
          linked_at: string
          student_id: string
        }
        Insert: {
          center_id: string
          id?: string
          is_active?: boolean
          linked_at?: string
          student_id: string
        }
        Update: {
          center_id?: string
          id?: string
          is_active?: boolean
          linked_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "center_students_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "center_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      centers: {
        Row: {
          address: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          created_at: string
          id: string
          order_index: number
          title: string
          unit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          title: string
          unit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          title?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_courses: {
        Row: {
          coupon_id: string
          course_id: string
        }
        Insert: {
          coupon_id: string
          course_id: string
        }
        Update: {
          coupon_id?: string
          course_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_courses_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_percent: number
          ends_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          starts_at: string | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_percent: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          starts_at?: string | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_percent?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          starts_at?: string | null
          used_count?: number
        }
        Relationships: []
      }
      courses: {
        Row: {
          cover_url: string | null
          created_at: string
          created_by: string
          description: string | null
          discount_percent: number
          grade: string | null
          id: string
          is_center_only: boolean
          is_featured: boolean
          is_free: boolean
          is_published: boolean
          month: string | null
          order_index: number
          price: number
          slug: string
          term: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          discount_percent?: number
          grade?: string | null
          id?: string
          is_center_only?: boolean
          is_featured?: boolean
          is_free?: boolean
          is_published?: boolean
          month?: string | null
          order_index?: number
          price?: number
          slug: string
          term?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          discount_percent?: number
          grade?: string | null
          id?: string
          is_center_only?: boolean
          is_featured?: boolean
          is_free?: boolean
          is_published?: boolean
          month?: string | null
          order_index?: number
          price?: number
          slug?: string
          term?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          bundle_id: string | null
          course_id: string
          created_at: string
          expires_at: string | null
          id: string
          started_at: string
          status: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
        }
        Insert: {
          bundle_id?: string | null
          course_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
        }
        Update: {
          bundle_id?: string | null
          course_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_assignments: {
        Row: {
          assigned_at: string
          exam_id: string
          id: string
          student_id: string
        }
        Insert: {
          assigned_at?: string
          exam_id: string
          id?: string
          student_id: string
        }
        Update: {
          assigned_at?: string
          exam_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_assignments_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          exam_id: string
          id: string
          max_score: number | null
          model: string | null
          score: number | null
          started_at: string
          status: Database["public"]["Enums"]["attempt_status"]
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          exam_id: string
          id?: string
          max_score?: number | null
          model?: string | null
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          exam_id?: string
          id?: string
          max_score?: number | null
          model?: string | null
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number | null
          end_at: string | null
          id: string
          is_published: boolean
          lecture_id: string | null
          order_index: number | null
          passing_score: number | null
          shuffle_questions: boolean
          start_at: string | null
          title: string
          type: Database["public"]["Enums"]["exam_type"]
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number | null
          end_at?: string | null
          id?: string
          is_published?: boolean
          lecture_id?: string | null
          order_index?: number | null
          passing_score?: number | null
          shuffle_questions?: boolean
          start_at?: string | null
          title: string
          type?: Database["public"]["Enums"]["exam_type"]
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number | null
          end_at?: string | null
          id?: string
          is_published?: boolean
          lecture_id?: string | null
          order_index?: number | null
          passing_score?: number | null
          shuffle_questions?: boolean
          start_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["exam_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_course_id_fkey"
            columns: ["course_id"]
            referencedRelation: "courses"
            referencedColumns: ["id"]
          }
        ]
      }
      homework: {
        Row: {
          course_id: string
          created_at: string
          created_by: string
          description: string | null
          due_at: string | null
          id: string
          is_published: boolean
          lecture_id: string | null
          title: string
          total_points: number
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by: string
          description?: string | null
          due_at?: string | null
          id?: string
          is_published?: boolean
          lecture_id?: string | null
          title: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string | null
          id?: string
          is_published?: boolean
          lecture_id?: string | null
          title?: string
          total_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      homework_answers: {
        Row: {
          answer_audio_url: string | null
          answer_image_url: string | null
          answer_text: string | null
          awarded_points: number | null
          created_at: string
          graded_at: string | null
          graded_by: string | null
          id: string
          is_correct: boolean | null
          question_id: string
          selected_option_id: string | null
          submission_id: string
        }
        Insert: {
          answer_audio_url?: string | null
          answer_image_url?: string | null
          answer_text?: string | null
          awarded_points?: number | null
          created_at?: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_correct?: boolean | null
          question_id: string
          selected_option_id?: string | null
          submission_id: string
        }
        Update: {
          answer_audio_url?: string | null
          answer_image_url?: string | null
          answer_text?: string | null
          awarded_points?: number | null
          created_at?: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_correct?: boolean | null
          question_id?: string
          selected_option_id?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "homework_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_answers_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "homework_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_options: {
        Row: {
          id: string
          is_correct: boolean
          order_index: number
          question_id: string
          text: string
        }
        Insert: {
          id?: string
          is_correct?: boolean
          order_index?: number
          question_id: string
          text: string
        }
        Update: {
          id?: string
          is_correct?: boolean
          order_index?: number
          question_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "homework_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_questions: {
        Row: {
          audio_url: string | null
          created_at: string
          homework_id: string
          id: string
          image_url: string | null
          order_index: number
          points: number
          text: string
          type: Database["public"]["Enums"]["hw_question_type"]
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          homework_id: string
          id?: string
          image_url?: string | null
          order_index?: number
          points?: number
          text: string
          type: Database["public"]["Enums"]["hw_question_type"]
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          homework_id?: string
          id?: string
          image_url?: string | null
          order_index?: number
          points?: number
          text?: string
          type?: Database["public"]["Enums"]["hw_question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "homework_questions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          created_at: string
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          homework_id: string
          id: string
          max_score: number | null
          score: number | null
          status: Database["public"]["Enums"]["homework_status"]
          student_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          homework_id: string
          id?: string
          max_score?: number | null
          score?: number | null
          status?: Database["public"]["Enums"]["homework_status"]
          student_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          homework_id?: string
          id?: string
          max_score?: number | null
          score?: number | null
          status?: Database["public"]["Enums"]["homework_status"]
          student_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework"
            referencedColumns: ["id"]
          },
        ]
      }
      login_history: {
        Row: {
          browser: string | null
          created_at: string
          device_name: string | null
          device_type: string | null
          event_type: string
          id: string
          ip_address: string | null
          os: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_name?: string | null
          device_type?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          os?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_name?: string | null
          device_type?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          os?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "login_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_progress: {
        Row: {
          completed: boolean
          id: string
          last_watched_at: string
          lecture_id: string
          student_id: string
          watched_seconds: number
        }
        Insert: {
          completed?: boolean
          id?: string
          last_watched_at?: string
          lecture_id: string
          student_id: string
          watched_seconds?: number
        }
        Update: {
          completed?: boolean
          id?: string
          last_watched_at?: string
          lecture_id?: string
          student_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "lecture_progress_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      lectures: {
        Row: {
          chapter_id: string
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          is_free: boolean
          order_index: number
          pdf_url: string | null
          title: string
          unlock_score_percent: number
          updated_at: string
          video_id: string | null
          video_provider: Database["public"]["Enums"]["video_provider"] | null
          video_url: string | null
        }
        Insert: {
          chapter_id: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_free?: boolean
          order_index?: number
          pdf_url?: string | null
          title: string
          unlock_score_percent?: number
          updated_at?: string
          video_id?: string | null
          video_provider?: Database["public"]["Enums"]["video_provider"] | null
          video_url?: string | null
        }
        Update: {
          chapter_id?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_free?: boolean
          order_index?: number
          pdf_url?: string | null
          title?: string
          unlock_score_percent?: number
          updated_at?: string
          video_id?: string | null
          video_provider?: Database["public"]["Enums"]["video_provider"] | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lectures_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          audience: Database["public"]["Enums"]["notification_audience"]
          body: string | null
          created_at: string
          created_by: string
          id: string
          link: string | null
          target_course_id: string | null
          target_student_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          audience?: Database["public"]["Enums"]["notification_audience"]
          body?: string | null
          created_at?: string
          created_by: string
          id?: string
          link?: string | null
          target_course_id?: string | null
          target_student_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          audience?: Database["public"]["Enums"]["notification_audience"]
          body?: string | null
          created_at?: string
          created_by?: string
          id?: string
          link?: string | null
          target_course_id?: string | null
          target_student_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          bundle_id: string | null
          coupon_id: string | null
          course_id: string | null
          created_at: string
          discount_amount: number
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          receipt_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
          student_id: string
          transaction_ref: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bundle_id?: string | null
          coupon_id?: string | null
          course_id?: string | null
          created_at?: string
          discount_amount?: number
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          student_id: string
          transaction_ref?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bundle_id?: string | null
          coupon_id?: string | null
          course_id?: string | null
          created_at?: string
          discount_amount?: number
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          student_id?: string
          transaction_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          father_phone: string
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"]
          governorate: string
          grade: string
          id: string
          id_card_url: string | null
          mother_phone: string
          national_id: string
          phone: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          school: string
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          father_phone: string
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"]
          governorate: string
          grade: string
          id: string
          id_card_url?: string | null
          mother_phone: string
          national_id: string
          phone: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          father_phone?: string
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"]
          governorate?: string
          grade?: string
          id?: string
          id_card_url?: string | null
          mother_phone?: string
          national_id?: string
          phone?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school?: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: []
      }
      qna_questions: {
        Row: {
          body: string
          course_id: string | null
          created_at: string
          guest_name: string | null
          id: string
          image_path: string | null
          is_pinned: boolean
          is_public: boolean
          lecture_id: string | null
          status: Database["public"]["Enums"]["qna_status"]
          student_id: string | null
          title: string
          updated_at: string
          voice_path: string | null
        }
        Insert: {
          body: string
          course_id?: string | null
          created_at?: string
          guest_name?: string | null
          id?: string
          image_path?: string | null
          is_pinned?: boolean
          is_public?: boolean
          lecture_id?: string | null
          status?: Database["public"]["Enums"]["qna_status"]
          student_id?: string | null
          title: string
          updated_at?: string
          voice_path?: string | null
        }
        Update: {
          body?: string
          course_id?: string | null
          created_at?: string
          guest_name?: string | null
          id?: string
          image_path?: string | null
          is_pinned?: boolean
          is_public?: boolean
          lecture_id?: string | null
          status?: Database["public"]["Enums"]["qna_status"]
          student_id?: string | null
          title?: string
          updated_at?: string
          voice_path?: string | null
        }
        Relationships: []
      }
      qna_replies: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          image_path: string | null
          is_admin_reply: boolean
          question_id: string
          voice_path: string | null
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          image_path?: string | null
          is_admin_reply?: boolean
          question_id: string
          voice_path?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          image_path?: string | null
          is_admin_reply?: boolean
          question_id?: string
          voice_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qna_replies_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "qna_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_options: {
        Row: {
          id: string
          image_url: string | null
          is_correct: boolean
          order_index: number
          question_id: string
          text: string | null
          video_url: string | null
        }
        Insert: {
          id?: string
          image_url?: string | null
          is_correct?: boolean
          order_index?: number
          question_id: string
          text?: string | null
          video_url?: string | null
        }
        Update: {
          id?: string
          image_url?: string | null
          is_correct?: boolean
          order_index?: number
          question_id?: string
          text?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          audio_url: string | null
          created_at: string
          exam_id: string
          explanation: string | null
          explanation_audio_url: string | null
          explanation_image_url: string | null
          explanation_video_url: string | null
          hint: string | null
          id: string
          image_url: string | null
          model: string | null
          order_index: number
          points: number
          text: string
          type: Database["public"]["Enums"]["question_type"]
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          exam_id: string
          explanation?: string | null
          explanation_audio_url?: string | null
          explanation_image_url?: string | null
          explanation_video_url?: string | null
          hint?: string | null
          id?: string
          image_url?: string | null
          model?: string | null
          order_index?: number
          points?: number
          text: string
          type: Database["public"]["Enums"]["question_type"]
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          exam_id?: string
          explanation?: string | null
          explanation_audio_url?: string | null
          explanation_image_url?: string | null
          explanation_video_url?: string | null
          hint?: string | null
          id?: string
          image_url?: string | null
          model?: string | null
          order_index?: number
          points?: number
          text?: string
          type?: Database["public"]["Enums"]["question_type"]
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      site_announcements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          message: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message?: string
        }
        Relationships: []
      }
      student_answers: {
        Row: {
          answer_audio_url: string | null
          answer_image_url: string | null
          answer_text: string | null
          attempt_id: string
          awarded_points: number | null
          created_at: string
          graded_at: string | null
          graded_by: string | null
          id: string
          is_correct: boolean | null
          question_id: string
          selected_option_id: string | null
        }
        Insert: {
          answer_audio_url?: string | null
          answer_image_url?: string | null
          answer_text?: string | null
          attempt_id: string
          awarded_points?: number | null
          created_at?: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_correct?: boolean | null
          question_id: string
          selected_option_id?: string | null
        }
        Update: {
          answer_audio_url?: string | null
          answer_image_url?: string | null
          answer_text?: string | null
          attempt_id?: string
          awarded_points?: number | null
          created_at?: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_correct?: boolean | null
          question_id?: string
          selected_option_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_answers_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "question_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_answers_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "student_question_options"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attachment_url: string | null
          body: string
          created_at: string
          id: string
          is_staff: boolean
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attachment_url?: string | null
          body: string
          created_at?: string
          id?: string
          is_staff?: boolean
          sender_id: string
          ticket_id: string
        }
        Update: {
          attachment_url?: string | null
          body?: string
          created_at?: string
          id?: string
          is_staff?: boolean
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["ticket_status"]
          student_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          student_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          student_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      units: {
        Row: {
          course_id: string
          created_at: string
          id: string
          order_index: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          order_index?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          id?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      student_homework_options: {
        Row: {
          id: string | null
          order_index: number | null
          question_id: string | null
          text: string | null
        }
        Insert: {
          id?: string | null
          order_index?: number | null
          question_id?: string | null
          text?: string | null
        }
        Update: {
          id?: string | null
          order_index?: number | null
          question_id?: string | null
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homework_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "homework_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_question_options: {
        Row: {
          id: string | null
          image_url: string | null
          order_index: number | null
          question_id: string | null
          text: string | null
        }
        Insert: {
          id?: string | null
          image_url?: string | null
          order_index?: number | null
          question_id?: string | null
          text?: string | null
        }
        Update: {
          id?: string | null
          image_url?: string | null
          order_index?: number | null
          question_id?: string | null
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_access_exam: {
        Args: { _exam_id: string; _user_id: string }
        Returns: boolean
      }
      can_read_exam_media_path: {
        Args: { _path: string; _uid: string }
        Returns: boolean
      }
      exam_answers_unlocked: { Args: { _exam_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_student: { Args: { _user_id: string }; Returns: boolean }
      is_enrolled: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      lecture_course: { Args: { _lecture_id: string }; Returns: string }
      submit_exam_attempt: { Args: { _attempt_id: string }; Returns: Json }
    }
    Enums: {
      account_status: "pending" | "approved" | "rejected"
      app_role: "admin" | "student" | "assistant"
      attempt_status: "in_progress" | "submitted" | "graded"
      book_order_status: "pending" | "approved" | "rejected" | "shipped"
      enrollment_status: "active" | "expired" | "cancelled"
      exam_type: "quiz" | "assignment" | "major"
      gender_type: "male" | "female"
      homework_status: "draft" | "submitted" | "graded"
      hw_question_type: "mcq" | "true_false" | "short" | "essay"
      notification_audience: "all" | "student" | "course"
      notification_type:
        | "info"
        | "success"
        | "warning"
        | "course"
        | "exam"
        | "payment"
      payment_method: "vcash" | "instapay"
      payment_status: "pending" | "approved" | "rejected"
      qna_status: "open" | "answered" | "closed"
      question_type: "mcq" | "true_false" | "essay"
      ticket_priority: "low" | "normal" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      video_provider: "bunny" | "vdocipher" | "youtube"
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
  public: {
    Enums: {
      account_status: ["pending", "approved", "rejected"],
      app_role: ["admin", "student", "assistant"],
      attempt_status: ["in_progress", "submitted", "graded"],
      book_order_status: ["pending", "approved", "rejected", "shipped"],
      enrollment_status: ["active", "expired", "cancelled"],
      exam_type: ["quiz", "assignment", "major"],
      gender_type: ["male", "female"],
      homework_status: ["draft", "submitted", "graded"],
      hw_question_type: ["mcq", "true_false", "short", "essay"],
      notification_audience: ["all", "student", "course"],
      notification_type: [
        "info",
        "success",
        "warning",
        "course",
        "exam",
        "payment",
      ],
      payment_method: ["vcash", "instapay"],
      payment_status: ["pending", "approved", "rejected"],
      qna_status: ["open", "answered", "closed"],
      question_type: ["mcq", "true_false", "essay"],
      ticket_priority: ["low", "normal", "high", "urgent"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      video_provider: ["bunny", "vdocipher", "youtube"],
    },
  },
} as const
