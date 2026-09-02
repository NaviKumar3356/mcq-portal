const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');
const { getCatalog } = require('./utils/catalog');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
  if (!requireRole(event, ['super_admin'])) return json(401, { error: 'Not authorized' });

  try {
    const [teachers, activeTeachers, students, papers, catalog] = await Promise.all([
      supabase.from('teachers').select('id', { count: 'exact', head: true }),
      supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('active', true),
      supabase.from('students').select('id', { count: 'exact', head: true }),
      supabase.from('tests').select('id', { count: 'exact', head: true }),
      getCatalog(),
    ]);
    for (const result of [teachers, activeTeachers, students, papers]) {
      if (result.error) throw result.error;
    }
    return json(200, {
      stats: {
        teachers: teachers.count || 0,
        activeTeachers: activeTeachers.count || 0,
        students: students.count || 0,
        papers: papers.count || 0,
        classes: catalog.classes.length,
        sections: catalog.sections.length,
        subjects: catalog.subjects.length,
      },
    });
  } catch (e) {
    return json(500, { error: 'Could not load administration overview' });
  }
};
