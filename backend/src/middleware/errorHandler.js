export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error(err);
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    details: err.details || undefined,
  });
}
