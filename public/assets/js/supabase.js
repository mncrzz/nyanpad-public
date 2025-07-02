const supabaseUrl = 'https://gilmkevkupbnirtynzki.supabase.co' // Например: https://xxxxx.supabase.co
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbG1rZXZrdXBibmlydHluemtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0Njk0MDgsImV4cCI6MjA2NzA0NTQwOH0.Y3JK6mShChu0nVFj_MNApkvT2tcoGNaUNep0rpnglk4' // Ключ из Settings → API

export const supabase = supabase.createClient(supabaseUrl, supabaseKey)