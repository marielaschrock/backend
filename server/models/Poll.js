const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
    name: { // e.g., 'gender', 'strictParent', 'babyWeight'
        type: String,
        required: true,
        unique: true
    },
    counts: { // Stores counts for radio button polls or vote counts for text input polls
        type: Map,
        of: Number,
        default: {}
    },
    voterRecords: { // Stores which voter voted for which option
        type: Map,
        of: String, // Value will be the chosen option (for radio) or the entered text (for text input)
        default: {}
    }
}, { timestamps: true }); // Adds createdAt and updatedAt fields

module.exports = mongoose.model('Poll', pollSchema);