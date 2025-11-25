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
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({ message: 'Token não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      getEnv('SUPABASE_URL') ?? '',
      getEnv('SUPABASE_ANON_KEY') ?? ''
    );

    // Buscar participante pelo token
    const { data: participant, error } = await supabaseClient
      .from('participants')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !participant) {
      return new Response(
        JSON.stringify({ message: 'Participante não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let matchedParticipant = null;

    // Se tem matched_with, buscar o participante correspondente
    if (participant.matched_with) {
      const { data: matched } = await supabaseClient
        .from('participants')
        .select('id, name, email, token, created_at, preferred_chocolate, dislikes')
        .eq('id', participant.matched_with)
        .single();

      if (matched) {
        matchedParticipant = {
          id: matched.id,
          name: matched.name,
          email: matched.email,
          token: matched.token,
          createdAt: matched.created_at,
          matchedWith: participant.id,
          matchedWithName: participant.name,
          preferredChocolate: matched.preferred_chocolate || null,
          dislikes: matched.dislikes || null,
        };
      }
    }

    return new Response(
      JSON.stringify({
        participant: {
          id: participant.id,
          name: participant.name,
          email: participant.email,
          token: participant.token,
          createdAt: participant.created_at,
          matchedWith: participant.matched_with,
          matchedWithName: matchedParticipant?.name || null,
          preferredChocolate: participant.preferred_chocolate || null,
          dislikes: participant.dislikes || null,
        },
        matchedParticipant: matchedParticipant,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ message: error?.message || 'Erro ao buscar participante' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

