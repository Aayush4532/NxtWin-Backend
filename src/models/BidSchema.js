const mongoose = require("mongoose");

const { Schema, model } = mongoose;
const OptionSchema = new Schema(
  {
    key: { type: String, enum: ["A", "B"], required: true },
    label: { type: String, required: true },
    currentPrice: { type: Number, required: true, min: 0.5, max: 9.5 },
  },
  { _id: false }
);

const BidSchema = new Schema(
  {
    question: { type: String, required: true, trim: true, maxlength: 300 },

    volume: { type: Number, required: true, default: 0, min: 0 },

    category: { type: String, required: true, trim: true, maxlength: 60 },

    options: {
      type: [OptionSchema],
      validate: (v) => Array.isArray(v) && v.length === 2,
      default: [
        { key: "A", label: "Yes", currentPrice: 5 },
        { key: "B", label: "No", currentPrice: 5 },
      ],
    },

    context: { type: String, required: true, trim: true, maxlength: 2000 },

    startTime: { type: Date, required: true, index: true },

    endTime: { type: Date, required: true, index: true },

    resultOptionKey: { type: String, enum: ["A", "B", null], default: null },

    orderBook: {
      buyOrdersA: [{ type: Schema.Types.ObjectId, ref: "Order" }],
      sellOrdersA: [{ type: Schema.Types.ObjectId, ref: "Order" }],
      buyOrdersB: [{ type: Schema.Types.ObjectId, ref: "Order" }],
      sellOrdersB: [{ type: Schema.Types.ObjectId, ref: "Order" }],
    },

    tradeHistory: [
      {
        price: Number,
        quantity: Number,
        buyerId: String,
        sellerId: String,
        optionKey: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    total_traded_quantity: {
      A: { type: Number, default: 0 },
      B: { type: Number, default: 0 },
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.models.Bid || model("Bid", BidSchema);
