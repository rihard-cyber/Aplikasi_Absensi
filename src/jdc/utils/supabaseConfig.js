const supabaseConfig = {
  url: 'https://apshtzpftfzdrygicvjl.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwc2h0enBmdGZ6ZHJ5Z2ljdmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwOTU0NjQsImV4cCI6MjA5NjY3MTQ2NH0.TAlxGXkvyUbCdVBCvYmVQ5JspehVwUCrLEMWCLN3lBs'
};

export const isSupabaseConfigured = () => {
  return supabaseConfig.url && supabaseConfig.anonKey && supabaseConfig.url !== 'https://your-project.supabase.co';
};

export default supabaseConfig;
