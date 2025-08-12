const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const OrderSchema = new Schema(
  {
    bidId: { type: Schema.Types.ObjectId, ref: "Bid", required: true },
    clerkId: { type: String, required: true },
    type: { type: String, enum: ["buy", "sell"], required: true },
    optionKey: { type: String, enum: ["A", "B"], required: true },
    price: { type: Number, required: true, min: 0.5, max: 9.5 },
    quantity: { type: Number, required: true, min: 1 },
    isFilled: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.models.Order || model("Order", OrderSchema);
