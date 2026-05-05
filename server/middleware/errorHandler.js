function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const errorCode = err.code || (status === 500 ? 'INTERNAL_ERROR' : 'SERVER_ERROR');
  const message = err.message || 'An unexpected error occurred';

  // eslint-disable-next-line no-console
  console.error(`[${new Date().toISOString()}]`, err);

  return res.status(status).json({
    error_code: errorCode,
    message,
  });
}

module.exports = errorHandler;
