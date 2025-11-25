import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { compare } from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

// Helper to read env vars in multiple runtimes
function getEnv(key: string): string {
  if (typeof process !== "undefined" && (process as any).env && (process as any).env[key]) {
    return (process as any).env[key];
  }
  if (typeof globalThis !== "undefined" && (globalThis as any)[key]) {
    return (globalThis as any)[key];
  }
  const deno = (globalThis as any).Deno;
  if (deno && deno.env && typeof deno.env.get === "function") {
    return deno.env.get(key) ?? "";
  }
  if (typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }
  return "";
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { password } = await req.json();

    if (!password) {
      return new Response(
        JSON.stringify({ success: false, message: 'Senha é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      getEnv('SUPABASE_URL') ?? '',
      getEnv('SUPABASE_SERVICE_KEY') ?? '' // Usar service role para ler admin
    );

    // Buscar admin (assumindo que há apenas um registro)
    const { data: admin, error } = await supabaseClient
      .from('admin')
      .select('password_hash')
      .limit(1)
      .single();

    if (error || !admin) {
      return new Response(
        JSON.stringify({ success: false, message: 'Credenciais inválidas' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar senha (usando bcrypt)
    const isValid = await compare(password, admin.password_hash);

    if (!isValid) {
      return new Response(
        JSON.stringify({ success: false, message: 'Senha incorreta' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gerar token JWT simples (ou usar Supabase Auth)
    // Por simplicidade, vamos usar um token base64
    const token = btoa(JSON.stringify({ 
      admin: true, 
      timestamp: Date.now() 
    }));

    return new Response(
      JSON.stringify({ success: true, token: token }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error?.message || 'Erro ao fazer login' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

