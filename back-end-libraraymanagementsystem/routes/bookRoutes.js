const express = require('express');
const router = express.Router();
const Book = require('../models/Book');

// Helper function to get book statistics
async function getBookStats(books) {
    const totalBooks = books.length;
    const borrowedBooks = books.reduce((acc, book) => acc + (book.quantity - book.availableQuantity), 0);
    const availableBooks = books.reduce((acc, book) => acc + book.availableQuantity, 0);
    return { totalBooks, borrowedBooks, availableBooks };
}

// Books listing with sorting (Dashboard)
router.get('/', async (req, res) => {
    try {
        const { sort } = req.query;
        let sortOption = {};

        if (sort) {
            switch (sort) {
                case 'title':
                    sortOption.title = 1;
                    break;
                case 'author':
                    sortOption.author = 1;
                    break;
                case 'available':
                    sortOption.availableQuantity = -1;
                    break;
                case 'added':
                    sortOption.createdAt = -1;
                    break;
                default:
                    sortOption.title = 1;
            }
        } else {
            sortOption.title = 1;
        }

        const books = await Book.find().sort(sortOption);
        const stats = await getBookStats(books);
        
        res.render('books', { 
            books,
            ...stats,
            selectedSort: sort
        });
    } catch (error) {
        console.error('Error in book listing:', error);
        res.status(500).render('error', { error: 'Error fetching books' });
    }
});

// Search books
router.get('/search', async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.redirect('/books');
        }

        const searchRegex = new RegExp(query, 'i');
        const books = await Book.find({
            $or: [
                { title: searchRegex },
                { author: searchRegex },
                { isbn: searchRegex },
                { summary: searchRegex }
            ]
        });

        const stats = await getBookStats(books);

        res.render('books', { 
            books,
            ...stats,
            searchQuery: query
        });
    } catch (error) {
        console.error('Error in book search:', error);
        res.status(500).render('error', { 
            error: 'Error searching books. Please try again.' 
        });
    }
});

// Render add book form
router.get('/add', (req, res) => {
    res.render('addBook');
});

// Add Book
router.post('/add', async (req, res) => {
    try {
        const { title, author, isbn, quantity, summary } = req.body;
        
        const newBook = new Book({
            title,
            author,
            isbn,
            quantity,
            summary,
            availableQuantity: quantity
        });
        await newBook.save();
        res.redirect('/books');
    } catch (error) {
        console.error('Error adding book:', error);
        res.status(500).render('error', { error: 'Error adding book. Please try again.' });
    }
});

// Render borrow book form
router.get('/borrow/:id', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).render('error', { error: 'Book not found' });
        }
        if (book.availableQuantity <= 0) {
            return res.status(400).render('error', { 
                error: 'This book is not available for borrowing at the moment.' 
            });
        }
        res.render('borrowBook', { book });
    } catch (error) {
        console.error('Error fetching book:', error);
        res.status(500).render('error', { error: 'Error fetching book details' });
    }
});

// Borrow Book
router.post('/borrow/:id', async (req, res) => {
    try {
        const { borrowerName } = req.body;
        if (!borrowerName || typeof borrowerName !== 'string' || borrowerName.trim().length < 2) {
            return res.status(400).render('error', {
                error: 'Invalid borrower name',
                message: 'Please provide a valid borrower name (at least 2 characters).'
            });
        }
        const cleanName = borrowerName.trim();
        if (!/^[A-Za-z\s]+$/.test(cleanName)) {
            return res.status(400).render('error', {
                error: 'Invalid name format',
                message: 'Name can only contain letters and spaces.'
            });
        }
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).render('error', {
                error: 'Book not found',
                message: 'The requested book could not be found.'
            });
        }
        if (book.availableQuantity <= 0) {
            return res.status(400).render('error', {
                error: 'Book not available',
                message: 'This book is not available for borrowing at the moment.'
            });
        }
        if (book.borrowedBy) {
            return res.status(400).render('error', {
                error: 'Book already borrowed',
                message: `This book is currently borrowed by ${book.borrowedBy}.`
            });
        }
        // Only allow borrow if availableQuantity > 0 and not already borrowed
        book.availableQuantity = Math.max(0, book.availableQuantity - 1);
        book.borrowedBy = cleanName;
        try {
            await book.save();
            res.redirect('/books');
        } catch (saveError) {
            console.error('Error saving book:', saveError, '\nBook:', book);
            return res.status(500).render('error', {
                error: 'Database error',
                message: 'Failed to update the book status. Please try again. ' + (saveError.message || '')
            });
        }
    } catch (error) {
        console.error('Error in borrow process:', error);
        res.status(500).render('error', {
            error: 'System error',
            message: 'An unexpected error occurred. Please try again later. ' + (error.message || '')
        });
    }
});

// Return Book
router.post('/return/:id', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).render('error', {
                error: 'Book not found',
                message: 'The requested book could not be found.'
            });
        }
        if (!book.borrowedBy) {
            return res.status(400).render('error', {
                error: 'Book is not borrowed',
                message: 'This book is not currently borrowed.'
            });
        }
        // Only allow return if borrowedBy is not null
        book.availableQuantity = Math.min(book.quantity, book.availableQuantity + 1);
        book.borrowedBy = null;
        try {
            await book.save();
            res.redirect('/books');
        } catch (saveError) {
            console.error('Error saving book:', saveError, '\nBook:', book);
            return res.status(500).render('error', {
                error: 'Database error',
                message: 'Failed to update the book status. Please try again. ' + (saveError.message || '')
            });
        }
    } catch (error) {
        console.error('Error in return process:', error);
        res.status(500).render('error', {
            error: 'System error',
            message: 'An unexpected error occurred. Please try again later. ' + (error.message || '')
        });
    }
});

module.exports = router;

