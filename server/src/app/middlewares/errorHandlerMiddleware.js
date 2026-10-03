const errorHandlerMiddleware = (error, _req, res, _next) => {
  const reportedStatus = error.statusCode || error.status;
  const statusCode =
    Number.isInteger(reportedStatus) &&
    reportedStatus >= 400 &&
    reportedStatus <= 599
      ? reportedStatus
      : 500;

  res.status(statusCode).json({
    message:
      statusCode >= 500 || !error.message
        ? "Something went wrong"
        : error.message,
  });
};

module.exports = errorHandlerMiddleware;
