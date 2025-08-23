const { createClient } = require('@supabase/supabase-js');

// Replace with your actual Supabase URL and service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bycnvwanjzgkctqqklos.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndFixDatabase() {
  console.log('🔍 Checking database schema...');

  try {
    // Check if usage_details table exists
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'usage_details');

    if (tableError) {
      console.error('Error checking tables:', tableError);
      return;
    }

    if (tables.length === 0) {
      console.log('❌ usage_details table does not exist. Creating it...');
      
      // Create the usage_details table
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.usage_details (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            timestamp timestamptz NOT NULL,
            provider text NOT NULL,
            model text NOT NULL,
            prompt_tokens bigint NOT NULL DEFAULT 0,
            completion_tokens bigint NOT NULL DEFAULT 0,
            total_tokens bigint NOT NULL DEFAULT 0,
            charged_tokens bigint NOT NULL DEFAULT 0,
            created_at timestamptz NOT NULL DEFAULT now()
          );

          ALTER TABLE public.usage_details ENABLE ROW LEVEL SECURITY;
        `
      });

      if (createError) {
        console.error('Error creating usage_details table:', createError);
        return;
      }

      console.log('✅ usage_details table created successfully');
    } else {
      console.log('✅ usage_details table already exists');
    }

    // Check if increment_usage function exists
    const { data: functions, error: funcError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .eq('routine_name', 'increment_usage');

    if (funcError) {
      console.error('Error checking functions:', funcError);
      return;
    }

    if (functions.length === 0) {
      console.log('❌ increment_usage function does not exist. Creating it...');
      
      const { error: createFuncError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION public.increment_usage(
            p_user_id uuid,
            p_tokens bigint,
            p_provider text,
            p_model text
          ) RETURNS void
          LANGUAGE plpgsql
          AS $$
          DECLARE
            m text := to_char(now(), 'YYYY-MM');
          BEGIN
            INSERT INTO public.usage (user_id, month, tokens)
            VALUES (p_user_id, m, p_tokens)
            ON CONFLICT (user_id, month) DO UPDATE
              SET tokens = public.usage.tokens + excluded.tokens;

            INSERT INTO public.usage_breakdown (user_id, month, provider, model, tokens)
            VALUES (p_user_id, m, p_provider, p_model, p_tokens)
            ON CONFLICT (user_id, month, provider, model) DO UPDATE
              SET tokens = public.usage_breakdown.tokens + excluded.tokens;
          END;
          $$;
        `
      });

      if (createFuncError) {
        console.error('Error creating increment_usage function:', createFuncError);
        return;
      }

      console.log('✅ increment_usage function created successfully');
    } else {
      console.log('✅ increment_usage function already exists');
    }

    // Check current usage data
    const { data: usageData, error: usageError } = await supabase
      .from('usage')
      .select('*')
      .limit(5);

    if (usageError) {
      console.error('Error fetching usage data:', usageError);
    } else {
      console.log('📊 Current usage data:', usageData);
    }

    // Check usage_details data
    const { data: detailsData, error: detailsError } = await supabase
      .from('usage_details')
      .select('*')
      .limit(5);

    if (detailsError) {
      console.error('Error fetching usage_details data:', detailsError);
    } else {
      console.log('📊 Current usage_details data:', detailsData);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkAndFixDatabase();
