const fail = (res, status, message) => res.status(status).json({ error: message });

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const apiNotFound = (req, res) => fail(res, 404, 'Unknown API route.');

const errorHandler = (err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') return fail(res, 400, 'The submitted data is not valid.');
  console.error(err);
  if (res.headersSent) return next(err);
  fail(res, 500, 'Something went wrong on the server.');
};

module.exports = { fail, wrap, parseId, apiNotFound, errorHandler };
