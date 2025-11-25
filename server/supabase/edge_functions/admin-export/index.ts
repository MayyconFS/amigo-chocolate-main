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

serve(async (req: Request) => {
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

    // Buscar todos os participantes
    const { data: participants, error } = await supabaseClient
      .from('participants')
      .select(`
        name,
        email,
        token,
        created_at,
        matched:participants!participants_matched_with_fkey(name)
      `)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    // Gerar CSV
    const csvHeader = 'Nome,Email,Token,Data Cadastro,Amigo Chocolate\n';
    const csvRows = participants.map((p: any) => {
      const date = new Date(p.created_at).toLocaleDateString('pt-BR');
      const matchedName = p.matched?.name || '';
      return `"${p.name}","${p.email}","${p.token}","${date}","${matchedName}"`;
    }).join('\n');

    const csv = csvHeader + csvRows;

    return new Response(csv, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="participantes-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ message: error?.message || 'Erro ao exportar CSV' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

