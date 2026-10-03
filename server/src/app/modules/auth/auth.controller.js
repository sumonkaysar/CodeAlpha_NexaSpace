const AuthService = require("./auth.service");

exports.register = async (req, res) => {
  try {
    res.status(201).json(await AuthService.register(req.body));
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
exports.login = async (req, res) => {
  try {
    res.json(await AuthService.login(req.body));
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
