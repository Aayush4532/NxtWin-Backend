const express = require('express');
require('dotenv').config();
const connectDB = require('./src/config/db');
const User = require('./src/models/userSchema');
const Bid = require('./src/models/BidSchema');

const app = express();
const PORT = process.env.PORT;


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







connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});