/*
  PUBLIC REVIEW BACKEND CONFIGURATION
  Create a Supabase project, run reviews-schema.sql, then paste your project URL
  and the publishable/anon key below. NEVER put a service_role key here.
*/
window.REVIEWS_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT_ID.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_KEY",
  table: "portfolio_reviews",
  publicLimit: 8,
  statsLimit: 5000
};
