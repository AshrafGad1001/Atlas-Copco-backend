const { ZodError } = require('zod');

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      
const errorMessages = err.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
const message = errorMessages.length === 1 ? errorMessages[0].message : 'بيانات غير صالحة';
return res.status(400).json({ success: false, message, errors: errorMessages });

    }
    next(error);
  }
};

module.exports = validate;
