'use strict';

async function getNextNumero(prefix, supabase) {
  const annee = new Date().getFullYear();
  const { data, error } = await supabase.rpc('next_sequence', {
    p_nom:   prefix,
    p_annee: annee,
  });
  if (error) throw error;
  return `${prefix}-${annee}-${String(data).padStart(4, '0')}`;
}

module.exports = { getNextNumero };
