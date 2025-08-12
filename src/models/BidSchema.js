const mongoose = require("mongoose");

const { Schema, model } = mongoose;

const BidSchema = new Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },

    yesPrice: {
      type: Number,
      required: true,
      min: 0.5,
      max: 9.5,
      default: 5.0,
    },

    volume: {
      type: Number,
      default: 0,
      min: 0,
    },

    endTime: {
      type: Date,
      required: true,
    },

    image: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.models.Bid || model("Bid", BidSchema);
