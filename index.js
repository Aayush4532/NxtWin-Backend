const express = require("express");
require("dotenv").config();
const connectDB = require("./src/config/db");
const User = require("./src/models/userSchema");
const Bid = require("./src/models/BidSchema");
const Order = require("./src/models/OrderSchema");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

// Match a new order against existing complementary orders in the order book
const matchOrders = async (newOrder, bid) => {
  let remainingQuantity = newOrder.quantity;
  let complementaryOrderBook;
  let trades = [];
  const transactionSession = await mongoose.startSession();
  transactionSession.startTransaction();

  try {
    // Determine the complementary order book based on the new order's option key
    const complementaryOptionKey = newOrder.optionKey === "A" ? "B" : "A";
    complementaryOrderBook =
      bid.orderBook[
        `${
          newOrder.type === "buy" ? "sell" : "buy"
        }Orders${complementaryOptionKey}`
      ];

    // Sort the complementary orders by price for matching
    const sortedComplementaryOrders = await Order.find({
      _id: { $in: complementaryOrderBook },
      isFilled: false,
    })
      .sort({ price: newOrder.type === "buy" ? 1 : -1 }) // Ascending for buy, descending for sell
      .session(transactionSession);

    for (const complementaryOrder of sortedComplementaryOrders) {
      if (remainingQuantity > 0) {
        let tradePrice;
        let tradeQuantity;

        // Check for complementary price match (price_A + price_B = 10)
        if (newOrder.price + complementaryOrder.price === 10) {
          tradePrice = newOrder.price; // or complementaryOrder.price, they are complementary
        } else {
          continue; // No match
        }

        tradeQuantity = Math.min(
          remainingQuantity,
          complementaryOrder.quantity
        );

        const buyerId =
          newOrder.type === "buy"
            ? newOrder.clerkId
            : complementaryOrder.clerkId;
        const sellerId =
          newOrder.type === "buy"
            ? complementaryOrder.clerkId
            : newOrder.clerkId;

        trades.push({
          price: tradePrice,
          quantity: tradeQuantity,
          buyerId,
          sellerId,
          optionKey: newOrder.optionKey,
        });

        // Update quantities
        remainingQuantity -= tradeQuantity;
        complementaryOrder.quantity -= tradeQuantity;
        if (complementaryOrder.quantity === 0) {
          complementaryOrder.isFilled = true;
        }
        await complementaryOrder.save({ session: transactionSession });

        // Update user balances and history
        await Promise.all([
          User.findOneAndUpdate(
            { clerkId: buyerId },
            {
              $inc: { balance: -(tradePrice * tradeQuantity) },
              $push: {
                bidsHistory: {
                  bidId: bid._id,
                  orderId: newOrder._id,
                  price: tradePrice,
                  quantity: tradeQuantity,
                  type: "buy",
                  optionKey: newOrder.optionKey,
                },
              },
            },
            { session: transactionSession }
          ),
          User.findOneAndUpdate(
            { clerkId: sellerId },
            {
              $inc: { balance: tradePrice * tradeQuantity },
              $push: {
                bidsHistory: {
                  bidId: bid._id,
                  orderId: complementaryOrder._id,
                  price: tradePrice,
                  quantity: tradeQuantity,
                  type: "sell",
                  optionKey: newOrder.optionKey,
                },
              },
            },
            { session: transactionSession }
          ),
        ]);

        // Update the bid's current price and total traded quantity and volume
        const optionIndex = bid.options.findIndex(
          (opt) => opt.key === newOrder.optionKey
        );
        if (optionIndex !== -1) {
          bid.options[optionIndex].currentPrice = tradePrice;
        }
        if (newOrder.optionKey === "A") {
          bid.total_traded_quantity.A += tradeQuantity;
        } else {
          bid.total_traded_quantity.B += tradeQuantity;
        }
        bid.volume += tradePrice * tradeQuantity;
      }
    }

    // If there's a remaining quantity, add it to the order book
    if (remainingQuantity > 0) {
      newOrder.quantity = remainingQuantity;
      if (newOrder.type === "buy" && newOrder.optionKey === "A") {
        bid.orderBook.buyOrdersA.push(newOrder._id);
      } else if (newOrder.type === "sell" && newOrder.optionKey === "A") {
        bid.orderBook.sellOrdersA.push(newOrder._id);
      } else if (newOrder.type === "buy" && newOrder.optionKey === "B") {
        bid.orderBook.buyOrdersB.push(newOrder._id);
      } else if (newOrder.type === "sell" && newOrder.optionKey === "B") {
        bid.orderBook.sellOrdersB.push(newOrder._id);
      }
      await newOrder.save({ session: transactionSession });
    } else {
      newOrder.isFilled = true;
      await newOrder.save({ session: transactionSession });
    }

    // Add trades to the bid's history
    bid.tradeHistory.push(...trades);
    await bid.save({ session: transactionSession });

    await transactionSession.commitTransaction();
    transactionSession.endSession();
  } catch (error) {
    await transactionSession.abortTransaction();
    transactionSession.endSession();
    throw error;
  }
};

// Route to create a new user
app.post("/api/create/user", async (req, res) => {
  try {
    const { fullName, email, clerkId } = req.body;
    if (!fullName || !email || !clerkId) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const newUser = new User({
      fullName,
      email,
      clerkId,
      role: "user",
    });
    await newUser.save();
    res
      .status(201)
      .json({ message: "User created successfully", user: newUser });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route for admin to create a new bid
app.post("/api/create/bid", async (req, res) => {
  try {
    const {
      question,
      category,
      options,
      context,
      startTime,
      endTime,
      clerkId,
    } = req.body;
    if (
      !question ||
      !category ||
      !options ||
      !context ||
      !startTime ||
      !endTime ||
      !clerkId
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const clerk = await User.findOne({ clerkId });
    if (!clerk) {
      return res.status(404).json({ error: "Clerk not found" });
    }
    if (clerk.role !== "admin") {
      return res.status(403).json({ error: "Only an admin can create bids" });
    }
    const newBid = new Bid({
      question,
      category,
      options,
      context,
      startTime,
      endTime,
    });
    await newBid.save();
    res.status(201).json({ message: "Bid created successfully", bid: newBid });
  } catch (error) {
    console.error("Error creating bid:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route for user to place a buy or sell order
app.post("/api/place/order/:bidid", async (req, res) => {
  try {
    const { clerkId, type, optionKey, price, quantity } = req.body;
    const { bidid } = req.params;

    // Basic validation
    if (!clerkId || !type || !optionKey || !price || !quantity) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (price < 0.5 || price > 9.5) {
      return res
        .status(400)
        .json({ error: "Price must be between 0.5 and 9.5" });
    }
    if (!["A", "B"].includes(optionKey)) {
      return res.status(400).json({ error: "Invalid option key" });
    }

    const user = await User.findOne({ clerkId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const bid = await Bid.findById(bidid);
    if (!bid) {
      return res.status(404).json({ error: "Bid not found" });
    }

    const totalCost = price * quantity;
    if (type === "buy" && user.balance < totalCost) {
      return res
        .status(400)
        .json({ error: "Insufficient balance to place this order" });
    }

    // Create the new order
    const newOrder = new Order({
      bidId,
      clerkId,
      type,
      optionKey,
      price,
      quantity,
    });

    // Match the order against the order book
    await matchOrders(newOrder, bid);

    res
      .status(200)
      .json({ message: "Order placed successfully", order: newOrder });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route to get a specific bid with its order book
app.get("/api/get/bid/:bidid", async (req, res) => {
  try {
    const { bidid } = req.params;
    const bid = await Bid.findById(bidid).populate(
      "orderBook.buyOrdersA orderBook.sellOrdersA orderBook.buyOrdersB orderBook.sellOrdersB"
    );
    if (!bid) {
      return res.status(404).json({ error: "Bid not found" });
    }
    res.status(200).json({ bid });
  } catch (error) {
    console.error("Error fetching bid:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route to get all bids
app.get("/api/get/bids", async (req, res) => {
  try {
    const bids = await Bid.find().sort({ _id: -1 }).limit(20);
    res.status(200).json({ bids });
  } catch (error) {
    console.error("Error fetching bids:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route to get a user by Clerk ID
app.get("/api/get/user/:clerkId", async (req, res) => {
  try {
    const { clerkId } = req.params;
    const user = await User.findOne({ clerkId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
