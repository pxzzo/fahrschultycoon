const mongoose = require("mongoose");

const VehicleSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    type: String,
    price: Number,
    fuel: Number,
    condition: Number,
    distance: Number,
    assignedGarage: String,
  },
  { _id: false }
);

const BuildingSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    name: { type: String, default: "" },
    lat: Number,
    lng: Number,
    vehicles: { type: [VehicleSchema], default: [] },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  money: { type: Number, default: 20000 },
  level: { type: Number, default: 1 },
  students: {
    type: [
      new mongoose.Schema(
        {
          name: String,
          age: Number,
          address: String,
          type: String,
          coords: {
            lat: Number,
            lng: Number,
          },
          status: String,
          statusIndex: Number,
          createdAt: { type: Date, default: Date.now },
        },
        { _id: false }
      ),
    ],
    default: [],
  },
  buildings: { type: [BuildingSchema], default: [] },
});

module.exports = mongoose.model("User", UserSchema);
