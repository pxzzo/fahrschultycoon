const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  const existingUser = await User.findOne({ email });
  if (existingUser)
    return res.status(400).json({ msg: "E-Mail bereits vergeben" });

  const hash = await bcrypt.hash(password, 10);
  const newUser = new User({ username, email, password: hash });
  await newUser.save();
  res.status(201).json({ msg: "Benutzer erstellt" });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ msg: "Nutzer nicht gefunden" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ msg: "Falsches Passwort" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "2h",
  });
  res.json({
    token,
    user: { id: user._id, username: user.username, email: user.email },
  });
});

module.exports = router;
