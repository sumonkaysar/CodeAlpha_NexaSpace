const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../user/user.model");

const fail = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

async function register({ name, email, password }) {
  if (typeof name !== "string" || name.trim().length < 2)
    throw fail("Name must be at least 2 characters");
  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  )
    throw fail("Enter a valid email address");
  if (typeof password !== "string" || password.length < 8)
    throw fail("Password must be at least 8 characters");
  try {
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: await bcrypt.hash(password, 12),
    });
    return { id: user.id, name: user.name, email: user.email };
  } catch (error) {
    if (error.code === 11000)
      throw fail("An account with this email already exists", 409);
    throw error;
  }
}

async function login({ email, password }) {
  if (typeof email !== "string" || typeof password !== "string")
    throw fail("Email and password are required");
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
    "+password",
  );

  if (!user || !(await bcrypt.compare(password, user.password)))
    throw fail("Invalid email or password", 401);
  const token = jwt.sign(
    { id: user.id, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "12h" },
  );

  return { token, user: { id: user.id, name: user.name, email: user.email } };
}

module.exports = { register, login };
