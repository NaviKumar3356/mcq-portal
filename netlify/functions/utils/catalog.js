const supabase = require('./db');
const { CLASSES, SUBJECTS } = require('./constants');
const DEFAULT_SECTIONS = ['A','B','C'];

async function getCatalog() {
  const { data, error } = await supabase.from('app_settings').select('key,value').in('key', ['school_classes','school_subjects','school_sections']);
  if (error) return { classes: CLASSES, subjects: SUBJECTS, sections: DEFAULT_SECTIONS };
  const out = { classes: CLASSES, subjects: SUBJECTS, sections: DEFAULT_SECTIONS };
  (data || []).forEach(r => {
    if (r.key === 'school_classes' && Array.isArray(r.value?.items)) out.classes = r.value.items;
    if (r.key === 'school_subjects' && Array.isArray(r.value?.items)) out.subjects = r.value.items;
    if (r.key === 'school_sections' && Array.isArray(r.value?.items)) out.sections = r.value.items;
  });
  return out;
}
module.exports = { getCatalog };
