const router = require("express").Router();
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

// GET alle Schüler des Users
router.get("/", authMiddleware, async (req, res) => {
  const user = await User.findById(req.userId);
  res.json({ students: user.students || [] });
});

// POST neuer Schüler
router.post("/", authMiddleware, async (req, res) => {
  const user = await User.findById(req.userId);
  const student = req.body;
  user.students.push(student);
  await user.save();
  res.json({ success: true });
});

// PATCH: Status updaten
router.patch("/:index", authMiddleware, async (req, res) => {
  const { index } = req.params;
  const { status, statusIndex } = req.body;
  const user = await User.findById(req.userId);
  if (!user.students[index])
    return res.status(404).json({ msg: "Nicht gefunden" });
  user.students[index].status = status;
  user.students[index].statusIndex = statusIndex;
  await user.save();
  res.json({ success: true });
});

module.exports = router;
