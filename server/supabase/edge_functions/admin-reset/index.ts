import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ message: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      getEnv('SUPABASE_URL') ?? '',
      getEnv('SUPABASE_SERVICE_KEY') ?? ''
    );

    // Executar função de reset
    const { data, error } = await supabaseClient.rpc('reset_draw');

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Sorteio reiniciado com sucesso' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ message: error.message || 'Erro ao reiniciar sorteio' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

