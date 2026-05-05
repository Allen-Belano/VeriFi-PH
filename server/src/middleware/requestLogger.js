const morgan = require('morgan');

module.exports = (environment) => {
  const format = environment === 'production' ? 'combined' : 'dev';
  return morgan(format);
};
