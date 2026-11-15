/*
  PUBLIC REVIEW BACKEND CONFIGURATION
  Create a Supabase project, run reviews-schema.sql, then paste your project URL
  and the publishable/anon key below. NEVER put a service_role key here.
*/
window.REVIEWS_CONFIG = {
  supabaseUrl: "https://zmfcolxsdftdjkqoybnl.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptZmNvbHhzZGZ0ZGprcW95Ym5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ3MjkyOTEsImV4cCI6MjExMDMwNTI5MX0.lhajoHRzH5c-pxyaRzH-yya5AAKwXC3BtxqAegj-9ME",
  table: "portfolio_reviews",
  publicLimit: 8,
  statsLimit: 5000
};
