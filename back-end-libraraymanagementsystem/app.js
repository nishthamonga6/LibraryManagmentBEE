const express = require('express');
const bodyParser = require('body-parser');
const { engine } = require('express-handlebars');
const connectDB = require('./config/db');
const bookRoutes = require('./routes/bookRoutes');
const path = require('path');

const app = express();

// Handlebars Helpers
const hbsHelpers = {
    eq: function (a, b) {
        return a === b;
    },
    not: function (value) {
        return !value;
    },
    gt: function (a, b) {
        return a > b;
    },
    lt: function (a, b) {
        return a < b;
    },
    formatDate: function (date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
};

// Configure Handlebars
app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials'),
    helpers: hbsHelpers,
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true
    }
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.redirect('/books');
});

app.use('/books', bookRoutes);

// Error handling middleware
app.use((req, res, next) => {
    res.status(404).render('error', { 
        error: 'Page not found',
        message: 'The page you are looking for does not exist.'
    });
});

app.use((err, req, res, next) => {
    console.error('Application error:', err);
    res.status(500).render('error', { 
        error: 'Something went wrong!',
        message: err.message || 'An unexpected error occurred. Please try again.'
    });
});

const PORT = process.env.PORT || 3000;

// Initialize the application
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDB();

        // Start the server
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start the server:', error);
        process.exit(1);
    }
};

startServer();
