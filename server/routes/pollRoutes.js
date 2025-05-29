const express = require('express');
const router = express.Router();
const Poll = require('../models/Poll');

// Get all polls
router.get('/', async (req, res) => {
    try {
        const polls = await Poll.find({});
        res.json(polls);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get a single poll by name
router.get('/:name', async (req, res) => {
    try {
        const poll = await Poll.findOne({ name: req.params.name });
        if (!poll) {
            return res.status(404).json({ message: 'Poll not found' });
        }
        res.json(poll);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create/Initialize a poll (usually done once for each poll type)
router.post('/', async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Poll name is required' });
    }

    try {
        let poll = await Poll.findOne({ name });
        if (poll) {
            return res.status(409).json({ message: 'Poll with this name already exists' });
        }

        poll = new Poll({ name });
        const newPoll = await poll.save();
        res.status(201).json(newPoll);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Vote on a poll (update poll counts and voter records)
router.post('/:name/vote', async (req, res) => {
    const { option, voterName } = req.body;
    const pollName = req.params.name;
    const io = req.io; // Get the Socket.io instance from the request

    if (!option || !voterName) {
        return res.status(400).json({ message: 'Option and voter name are required' });
    }

    try {
        const poll = await Poll.findOne({ name: pollName });
        if (!poll) {
            return res.status(404).json({ message: 'Poll not found' });
        }

        // Check if the voter has already voted for this specific poll
        if (poll.voterRecords.has(voterName)) {
            return res.status(409).json({ message: `You (${voterName}) have already voted on this poll.` });
        }

        // Update counts for the chosen option
        const currentCount = poll.counts.get(option) || 0;
        poll.counts.set(option, currentCount + 1);

        // Record voter's choice
        poll.voterRecords.set(voterName, option);
        // IMPORTANT: Mark the Map as modified for Mongoose to detect and save changes
        poll.markModified('voterRecords'); // <--- THIS LINE IS THE KEY!

        const updatedPoll = await poll.save();

        // Emit real-time update to all connected clients
        io.emit('pollUpdate', updatedPoll); // Emit the full updated poll object

        res.json(updatedPoll);
    } catch (err) {
        console.error('Error voting on poll:', err); // Log the error for debugging
        res.status(500).json({ message: err.message });
    }
});

// Remove a voter's bet from a poll
router.delete('/:name/vote/:voterName', async (req, res) => {
    const { name: pollName, voterName } = req.params;
    const io = req.io; // Get the Socket.io instance

    try {
        const poll = await Poll.findOne({ name: pollName });
        if (!poll) {
            return res.status(404).json({ message: 'Poll not found' });
        }

        // Check if the voter exists in records
        if (!poll.voterRecords.has(voterName)) {
            return res.status(404).json({ message: `Voter '${voterName}' not found for this poll.` });
        }

        // Get the option the voter chose before removing their record
        const votedOption = poll.voterRecords.get(voterName);

        // Remove the voter's record
        poll.voterRecords.delete(voterName);
        poll.markModified('voterRecords'); // IMPORTANT: Mark Map as modified

        // Decrement the count for the option they voted for
        if (poll.counts.has(votedOption)) {
            const currentCount = poll.counts.get(votedOption);
            if (currentCount > 0) {
                poll.counts.set(votedOption, currentCount - 1);
            }
            poll.markModified('counts'); // IMPORTANT: Mark Map as modified
        }

        const updatedPoll = await poll.save();

        // Emit real-time update to all connected clients
        io.emit('pollUpdate', updatedPoll);

        res.json({ message: `Vote for '${voterName}' on poll '${pollName}' removed successfully.`, updatedPoll });

    } catch (err) {
        console.error('Error removing vote:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;