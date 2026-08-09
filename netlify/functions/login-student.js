const supabase = require('./utils/db');
const { sign, json } = require('./utils/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const { roll_number, class: klass, dob } = JSON.parse(event.body || '{}');
    if (!roll_number || !klass || !dob) {
      return json(400, { error: 'Class, roll number and date of birth are all required' });
    }

    // Roll numbers repeat across classes, so class is part of the lookup key.
    const { data: student, error } = await supabase
      .from('students')
      .select('id, roll_number, name, class, dob')
      .eq('roll_number', roll_number.trim())
      .eq('class', klass)
      .eq('dob', dob) // expects 'YYYY-MM-DD'
      .maybeSingle();

    if (error) throw error;
    if (!student) return json(401, { error: 'Class, roll number or date of birth is incorrect' });

    const token = sign({
      role: 'student',
      student_id: student.id,
      name: student.name,
      class: student.class,
      roll_number: student.roll_number,
    });

    return json(200, {
      token,
      student: {
        id: student.id,
        roll_number: student.roll_number,
        name: student.name,
        class: student.class,
      },
    });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
