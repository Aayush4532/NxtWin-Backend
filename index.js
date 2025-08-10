const express = require('express');
require('dotenv').config();
const connectDB = require('./src/config/db');
const User = require('./src/models/userSchema');
const cors = require('cors');
const Bid = require('./src/models/BidSchema');

const app = express();
const PORT = process.env.PORT;

app.use(cors());

app.use(express.json());

app.post('/api/create/user', async (req, res) => {
    try {
        const { fullName, email, clerkId, role } = req.body;

        if (!fullName || !email || !clerkId) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const newUser = new User({
            fullName,
            email,
            clerkId,
            role : "user"
        });

        await newUser.save();
        res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



app.post('/api/create/bid', async(req, res) => {
    try {

        const { question, stocks, category, options, context, startTime, endTime, clerkId } = req.body;

        if (!question || !stocks || !category || !options || !context || !startTime || !endTime || !clerkId) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const clerk = await User.findOne({ clerkId });
        if (!clerk) {
            return res.status(404).json({ error: 'Clerk not found' });
        }

        if(clerk.role !== 'admin') {
            return res.status(403).json({ error: 'Only an admin can create bids' });
        }

        const newBid = new Bid({
            question,
            stocks,
            category,
            options,
            context,
            startTime,
            endTime
        });

        await newBid.save();
        res.status(201).json({ message: 'Bid created successfully', bid: newBid });
    } catch (error) {
        console.error('Error creating bid:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
})


app.get('/api/get/bids', async (req, res) => {
    try {
        const bids = await Bid.find().sort({ _id: -1 }).limit(20);
        res.status(200).json({ bids });
    } catch (error) {
        console.error('Error fetching bids:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.post('/api/get/bid/:bidid', async (req, res) => {
    try {
        const { bidid } = req.params;
        const bid = await Bid.findById(bidid);
        if (!bid) {
            return res.status(404).json({ error: 'Bid not found' });
        }
        res.status(200).json({ bid });
    } catch (error) {
        console.error('Error fetching bid:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.post('/api/buy/:bidid', async (req, res) => {
    try {
        const { clerkId, amount } = req.body;
        const { bidid } = req.params;

        if (!clerkId || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Clerk ID and amount are required' });
        }

        const user = await User.findOne({ clerkId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const bid = await Bid.findById(bidid);
        if (!bid) {
            return res.status(404).json({ error: 'Bid not found' });
        }

        if(bid.stocks <= 0) {
            return res.status(400).json({ error: 'Bid is no longer available' });
        }

        if (bid.stocks % amount != 0) {
            return res.status(400).json({ error: 'Give valid bid amount to buy per share' });
        }

        if(user.balance - amount < 0) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        user.balance -= amount;
        await user.save();

        res.status(200).json({ message: 'Bid purchased successfully' });

    } catch (error) {
        console.error('Error purchasing bid:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/get/user/:clerkId', async (req, res) => {
    try {
        const { clerkId } = req.params;
        const user = await User.findOne({ clerkId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ user });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});