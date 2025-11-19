import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl: string =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://gytnleabrjrbuogdgvhm.supabase.co";
const supabaseAnonKey: string =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5dG5sZWFicmpyYnVvZ2RndmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjIyNDMsImV4cCI6MjA3OTEzODI0M30.G-CGwRQ4Y5D1QGLanfjxPcfog8P4AZKJ2_31lLRKluY";

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
);
