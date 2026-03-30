import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vgxvzrsewvbauecpkfcw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZneHZ6cnNld3ZiYXVlY3BrZmN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTY3MDQsImV4cCI6MjA5MDQ3MjcwNH0.gx6qqq5IYNb6XWr_f9409lf24lMQPDcq7QbQ6KN-HqA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
