const express = require("express");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const connectDB = require("./src/config/db");
const Bid = require("./src/models/BidSchema");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();
const PORT = process.env.PORT || 5500;
const User = require("./src/models/userSchema");

app.use(cors());
app.use(express.json());

// Routes to get Bids data
app.get("/api/get/bids", async (req, res) => {
  try {
    const bids = await Bid.find().limit(20);
    res.status(200).json({ bids });
  } catch (error) {
    console.error("Error fetching bids:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/get/bid/:bidid", async (req, res) => {
  try {
    const { bidid } = req.params;
    const bid = await Bid.findById(bidid);
    if (!bid) {
      return res.status(404).json({ error: "Bid not found" });
    }
    res.status(200).json({ bid });
  } catch (error) {
    console.error("Error fetching bid:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// User Related

app.post("/api/create-user", async (req, res) => {
  try {
    const { user_id, name, email } = req.body;

    let existingUser = await User.findOne({ user_id });

    if (existingUser) {
      return res
        .status(200)
        .json({ message: "User already exists", user: existingUser });
    }

    const newUser = new User({
      user_id, // Clerk's ID
      name,
      email,
      balance: 0,
    });

    await newUser.save();
    res.status(201).json({ message: "User created", user: newUser });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/get/user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ user_id: id });

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
