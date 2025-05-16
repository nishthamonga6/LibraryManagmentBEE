const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    studentId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    borrowedBooks: [{
        bookId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Book'
        },
        borrowDate: {
            type: Date,
            default: Date.now
        },
        returnDate: {
            type: Date,
            required: true
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Method to find user by student ID
userSchema.statics.findByStudentId = function(studentId) {
    return this.findOne({ studentId: studentId.toUpperCase() });
};

const User = mongoose.model('User', userSchema);

// Create default user if none exists
async function createDefaultUser() {
    try {
        const existingUser = await User.findOne({ studentId: 'TEST001' });
        if (!existingUser) {
            const defaultUser = new User({
                name: 'Test User',
                email: 'test@example.com',
                studentId: 'TEST001'
            });
            await defaultUser.save();
            console.log('Default user created successfully:', defaultUser);
        } else {
            console.log('Default user already exists:', existingUser);
        }
    } catch (error) {
        console.error('Error managing default user:', error);
    }
}

// Call createDefaultUser after the connection is established
mongoose.connection.once('connected', () => {
    createDefaultUser();
});

module.exports = User;
