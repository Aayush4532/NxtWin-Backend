const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const UserSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email"],
    },
    clerkId: {
      type: String,
      unique: true,
      required: true,
    },

    balance: {
      type: Number,
      required: true,
      default: 1500,
      min: 0,
    },

    currency: {
      type: String,
      enum: ["INR"],
      default: "INR",
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },
    bidsHistory: [
      {
        bidId: { type: Schema.Types.ObjectId, ref: "Bid" },
        orderId: { type: Schema.Types.ObjectId, ref: "Order" },
        price: Number,
        quantity: Number,
        type: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.models.User || model("User", UserSchema);
