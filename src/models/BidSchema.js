const mongoose = require('mongoose');

const { Schema, model } = mongoose;
const OptionSchema = new Schema(
  {
    key: { type: String, enum: ['A', 'B'], required: true },
    label: { type: String, required: true },
    currentPrice: { type: Number, required: true, min: 0, max: 10000 },
  },
  { _id: false }
);

const BidSchema = new Schema(
  {
    question: { type: String, required: true, trim: true, maxlength: 300 },

    stocks: { type: Number, required: true, min: 10, default: 100 },

    category: { type: String, required: true, trim: true, maxlength: 60 },

    options: {
      type: [OptionSchema],
      validate: v => Array.isArray(v) && v.length === 2,
      default: [
        { key: 'A', label: 'Option A', currentPrice: 5000 },
        { key: 'B', label: 'Option B', currentPrice: 5000 },
      ],
    },

    context: { type: String, required: true, trim: true, maxlength: 2000 },

    startTime: { type: Date, required: true, index: true },

    endTime: { type: Date, required: true, index: true },
    
    resultOptionKey: { type: String, enum: ['A', 'B', null], default: null },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.models.Bid || model('Bid', BidSchema);