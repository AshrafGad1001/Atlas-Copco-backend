
const { z } = require("zod");
const schema = z.object({ PORT: z.string().optional() });
const env = schema.parse(process.env);
module.exports = env;

