import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lsxwwdpdeuhmqfeyyxoz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzeHd3ZHBkZXVobXFmZXl5eG96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4OTgyMzAsImV4cCI6MjEwMDQ3NDIzMH0.-hKjw9T4OBLEQSPfpcu2sYShOyY3kOMphtR2uiwUW-4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
