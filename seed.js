const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, ".env") });

// Import schemas
const User = require("./src/models/userSchema");
const Bid = require("./src/models/BidSchema");
const Order = require("./src/models/OrderSchema");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

const sampleBids = [
  {
    question: "Will Trump meet Putin in 2025?",
    category: "Politics",
    options: [
      { key: "A", label: "Yes", currentPrice: 6.2 },
      { key: "B", label: "No", currentPrice: 3.8 },
    ],
    context:
      "Experts are speculating on a potential meeting between the two leaders next year.",
    startTime: new Date("2025-08-10T10:00:00Z"),
    endTime: new Date("2025-08-15T10:00:00Z"),
  },
  {
    question: "Claude 5 release before 2025 end?",
    category: "Tech",
    options: [
      { key: "A", label: "Yes", currentPrice: 4.8 },
      { key: "B", label: "No", currentPrice: 5.2 },
    ],
    context: "Anticipation builds for the next major release from Anthropic.",
    startTime: new Date("2025-08-08T10:00:00Z"),
    endTime: new Date("2025-08-18T10:00:00Z"),
  },
  {
    question: "Jeff Bezos to become richest man again?",
    category: "Finance",
    options: [
      { key: "A", label: "Yes", currentPrice: 3.9 },
      { key: "B", label: "No", currentPrice: 6.1 },
    ],
    context:
      "Competition for the top spot heats up as Amazon stock continues to fluctuate.",
    startTime: new Date("2025-08-10T10:00:00Z"),
    endTime: new Date("2025-08-20T10:00:00Z"),
  },
  {
    question: "Ethereum above $3800 on August 13?",
    category: "Crypto",
    options: [
      { key: "A", label: ">$3800", currentPrice: 2.2 },
      { key: "B", label: "<$3800", currentPrice: 7.8 },
    ],
    context:
      "The crypto market is highly volatile, with major price movements expected around the specified date.",
    startTime: new Date("2025-08-06T10:00:00Z"),
    endTime: new Date("2025-08-13T10:00:00Z"),
  },
];

const seedDB = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany({});
    await Bid.deleteMany({});
    await Order.deleteMany({});
    console.log("Existing data cleared.");

    // Create users
    const adminUser = new User({
      fullName: "Admin User",
      email: "admin@example.com",
      clerkId: "admin_clerk_id",
      role: "admin",
    });
    await adminUser.save();

    const regularUser = new User({
      fullName: "Regular User",
      email: "user@example.com",
      clerkId: "user_clerk_id",
      role: "user",
      balance: 1000,
    });
    await regularUser.save();

    console.log("Users created.");

    // Seed bids and orders
    for (const bidData of sampleBids) {
      // Create a new bid
      const newBid = new Bid({
        ...bidData,
        volume: 0,
        total_traded_quantity: { A: 0, B: 0 },
      });

      // Create some sample orders
      const orders = [
        // Buy orders for Option A (Yes)
        new Order({
          bidId: newBid._id,
          clerkId: regularUser.clerkId,
          type: "buy",
          optionKey: "A",
          price: 6.5,
          quantity: 5,
        }),
        new Order({
          bidId: newBid._id,
          clerkId: regularUser.clerkId,
          type: "buy",
          optionKey: "A",
          price: 6.2,
          quantity: 10,
        }),
        // Sell orders for Option A (Yes)
        new Order({
          bidId: newBid._id,
          clerkId: regularUser.clerkId,
          type: "sell",
          optionKey: "A",
          price: 6.8,
          quantity: 8,
        }),
        new Order({
          bidId: newBid._id,
          clerkId: regularUser.clerkId,
          type: "sell",
          optionKey: "A",
          price: 7.0,
          quantity: 15,
        }),
        // A matched pair of orders (buy A and sell B at complementary prices)
        new Order({
          bidId: newBid._id,
          clerkId: regularUser.clerkId,
          type: "buy",
          optionKey: "A",
          price: 5.5,
          quantity: 5,
          isFilled: true,
        }),
        new Order({
          bidId: newBid._id,
          clerkId: regularUser.clerkId,
          type: "sell",
          optionKey: "B",
          price: 4.5,
          quantity: 5,
          isFilled: true,
        }),
      ];

      // Save orders to the database
      const savedOrders = await Order.insertMany(orders);

      // Populate the bid's order book and trade history
      const buyOrdersA = savedOrders.filter(
        (o) => o.type === "buy" && o.optionKey === "A"
      );
      const sellOrdersA = savedOrders.filter(
        (o) => o.type === "sell" && o.optionKey === "A"
      );
      const buyOrdersB = savedOrders.filter(
        (o) => o.type === "buy" && o.optionKey === "B"
      );
      const sellOrdersB = savedOrders.filter(
        (o) => o.type === "sell" && o.optionKey === "B"
      );
      const filledOrders = savedOrders.filter((o) => o.isFilled);

      newBid.orderBook.buyOrdersA.push(...buyOrdersA.map((o) => o._id));
      newBid.orderBook.sellOrdersA.push(...sellOrdersA.map((o) => o._id));
      newBid.orderBook.buyOrdersB.push(...buyOrdersB.map((o) => o._id));
      newBid.orderBook.sellOrdersB.push(...sellOrdersB.map((o) => o._id));

      // Add a sample trade to the bid's history
      if (filledOrders.length >= 2) {
        const buyerOrder = filledOrders.find(
          (o) => o.type === "buy" && o.optionKey === "A"
        );
        const sellerOrder = filledOrders.find(
          (o) => o.type === "sell" && o.optionKey === "B"
        );
        if (buyerOrder && sellerOrder) {
          newBid.tradeHistory.push({
            price: buyerOrder.price,
            quantity: buyerOrder.quantity,
            buyerId: buyerOrder.clerkId,
            sellerId: sellerOrder.clerkId,
            optionKey: buyerOrder.optionKey,
            timestamp: new Date(),
          });
          newBid.volume += buyerOrder.price * buyerOrder.quantity;
          newBid.total_traded_quantity.A += buyerOrder.quantity;
        }
      }

      // Save the bid
      await newBid.save();

      console.log(`Bid "${newBid.question}" created with sample orders.`);
    }

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    mongoose.connection.close();
  }
};

seedDB();
