const mongoose = require("mongoose");

const { Schema, model } = mongoose;
const OptionSchema = new Schema(
  {
    key: { type: String, enum: ["Yes", "No"], required: true },
    label: { type: String, required: true },
    currentPrice: { type: Number, required: true, min: 0, max: 10000 },
  },
  { _id: false }
);

const BidSchema = new Schema(
  {
    // Original fields
    question: { type: String, required: true, trim: true, maxlength: 300 },
    category: { type: String, required: true, trim: true, maxlength: 60 },
    options: {
      type: [OptionSchema],
      validate: (v) => Array.isArray(v) && v.length === 2,
      default: [
        { key: "Yes", label: "Option Yes", currentPrice: 5 },
        { key: "No", label: "Option No", currentPrice: 5 },
      ],
    },
    volume: { type: String }, // Can be string like "1.1L", "47,800"
    context: { type: String, required: true, trim: true, maxlength: 2000 },
    participants: { type: Number, min: 0, default: 0 },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true, index: true },
    resultOptionKey: { type: String, enum: ["A", "B", null], default: null },

    // Additional fields from your sample data
    yesShare: { type: Number, min: 0, max: 100 }, // Percentage
    amount: { type: Number, min: 0 }, // Total amount/volume
    date: { type: Date },
    image: { type: String, trim: true },
  },
  { timestamps: true, versionKey: false }
);

// Add a virtual field to get either question or title
BidSchema.virtual("displayTitle").get(function () {
  return this.title || this.question;
});

module.exports = mongoose.models.Bid || model("Bid", BidSchema);
