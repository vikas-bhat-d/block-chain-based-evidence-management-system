const asyncHandler = function (handlerFunction) {
  return async (req, res, next) => {
    try {
      await handlerFunction(req, res, next);
      next();
    } catch (err) {
      console.log("Error caught in asynchandler: ", err.message);
      next(err);
    }
  };
};

export default asyncHandler;
