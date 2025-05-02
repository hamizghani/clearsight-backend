/**
 * Global error handling middleware
 */
exports.errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Something went wrong';
    
    res.status(statusCode).json({
      error: {
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      }
    });
  };