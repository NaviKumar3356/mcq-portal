const { getCatalog } = require('./utils/catalog');
const { json } = require('./utils/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
  try {
    const catalog = await getCatalog();
    return json(200, { classes: catalog.classes, sections: catalog.sections, subjects: catalog.subjects });
  } catch {
    return json(500, { error: 'Could not load classes' });
  }
};
