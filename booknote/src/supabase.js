import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yyosgqepletjkggnssuz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5b3NncWVwbGV0amtnZ25zc3V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDE4MzQsImV4cCI6MjA4NzY3NzgzNH0.JjY7Bdf3uhT7vqwVWvLHN0KoI8qw4gxJ6RRrq3RBrwg';

export const supabase = createClient(supabaseUrl, supabaseKey);