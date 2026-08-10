const { json } = require('./utils/auth');

exports.handler = async () => {
  return json(200, { now: new Date().toISOString() });
};
