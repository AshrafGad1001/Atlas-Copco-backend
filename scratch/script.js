
const fs = require("fs");
let code = fs.readFileSync("src/controllers/authController.js", "utf8");
code = code.replace(/exports\.logout = [\s\S]*?\n\};/, `exports.logout = (req, res) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() - 10 * 1000),
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.status(200).json({ success: true, message: "Logged out" });
};`);
fs.writeFileSync("src/controllers/authController.js", code);

