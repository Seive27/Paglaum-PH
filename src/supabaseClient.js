import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://uawcxpxtapscrdkktyii.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhd2N4cHh0YXBzY3Jka2t0eWlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NjI0MDAsImV4cCI6MjA3NTAzODQwMH0.ClaQz71arZU9Q7vjGT9SwE9lNcuSQdp9vwRU-0Mc8hI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
