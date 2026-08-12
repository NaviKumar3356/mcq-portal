// Deterministically spreads a practical question's variants across the
// class roster (sorted by roll number), round-robin. With enough variants
// configured, every student gets a distinct one; with fewer, they repeat,
// but adjacent roll numbers only collide if variants.length <= 1.

async function getRosterRank(supabase, klass, studentId) {
  const { data: roster } = await supabase
    .from('students')
    .select('id')
    .eq('class', klass)
    .order('roll_number', { ascending: true });
  return Math.max(0, (roster || []).findIndex((s) => s.id === studentId));
}

function pickVariant(variants, rank) {
  if (!Array.isArray(variants) || variants.length === 0) return null;
  const idx = rank % variants.length;
  return { index: idx, ...variants[idx] };
}

module.exports = { getRosterRank, pickVariant };
