const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Middleware zum Auth-Check
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ msg: "Kein Token" });

  const jwt = require("jsonwebtoken");
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(403).json({ msg: "Ungültiger Token" });
  }
}

router.get("/", authMiddleware, async (req, res) => {
  const user = await User.findById(req.userId);
  res.json({ buildings: user.buildings || [] });
});

router.post("/", authMiddleware, async (req, res) => {
  const { type, lat, lng } = req.body;
  const user = await User.findById(req.userId);
  const building = { type, lat, lng };

  user.buildings.push(building);
  await user.save();

  res.json({ success: true, building });
});

router.post("/vehicle/:buildingIndex", authMiddleware, async (req, res) => {
  const { buildingIndex } = req.params;
  const { vehicle } = req.body;

  try {
    const user = await User.findById(req.userId);
    if (!user.buildings[buildingIndex]) {
      return res.status(404).json({ msg: "Gebäude nicht gefunden" });
    }

    if (!user.buildings[buildingIndex].vehicles) {
      user.buildings[buildingIndex].vehicles = [];
    }

    user.buildings[buildingIndex].vehicles.push(vehicle);
    await user.save();

    res.json({ success: true, building: user.buildings[buildingIndex] });
  } catch (err) {
    res.status(500).json({ msg: "Fehler beim Speichern", error: err.message });
  }
});

// DELETE /api/buildings/:index
router.delete("/:index", authMiddleware, async (req, res) => {
  const { index } = req.params;
  const user = await User.findById(req.userId);
  if (!user.buildings[index])
    return res.status(404).json({ msg: "Nicht gefunden" });

  user.buildings.splice(index, 1);
  await user.save();

  res.json({ success: true });
});

module.exports = router;
