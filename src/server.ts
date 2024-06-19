import { v4 as uuidv4 } from 'uuid';
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Schema, model } from 'mongoose';

const app = express();
app.use(express.json());

// MongoDB Schemas and Models
const boxSchema = new Schema({
    BoxId: { type: String, required: true, unique: true },
    BoxName: { type: String, required: true },
    Store: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date }
});

const bookSchema = new Schema({
    BookId: { type: String, required: true, unique: true },
    Title: { type: String, required: true },
    Description: { type: String, required: true },
    Author: { type: String, required: true },
    Price: { type: Number, required: true },
    status: { type: String, default: "Unstored" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date }
});

const Box = model('Box', boxSchema);
const Book = model('Book', bookSchema);

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/boxbook', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Middleware for JWT authentication
const authenticateJWT = (req: Request, res: Response, next: Function) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(401).json({ status: 401, error: "Unauthorized" });

    jwt.verify(token, 'your_jwt_secret', (err: any, user: any) => {
        if (err) return res.status(403).json({ status: 403, error: "Forbidden" });
        req.user = user;
        next();
    });
};
// Create a box
app.post('/Box', authenticateJWT, async (req: Request, res: Response) => {
    const { BoxName } = req.body;
    try {
        const newBox = new Box({
            BoxId: uuidv4(),
            BoxName
        });
        await newBox.save();
        return res.status(201).json({ status: 201, newBox });
    } catch (error: any) {
        return res.status(500).json({ status: 500, error: error.message });
    }
});

// Get all boxes
app.get('/Box', authenticateJWT, async (req: Request, res: Response) => {
    try {
        const allBoxes = await Box.find();
        return res.status(200).json({ status: 200, allBoxes });
    } catch (error: any) {
        return res.status(500).json({ status: 500, error: error.message });
    }
});

// Update a box
app.put('/Box/:id', authenticateJWT, async (req: Request, res: Response) => {
    try {
        const { BoxName } = req.body;
        const box = await Box.findOneAndUpdate(
            { BoxId: req.params.id },
            { BoxName, updatedAt: new Date() },
            { new: true }
        );
        if (!box) return res.status(404).json({ status: 404, error: "Box does not exist" });
        return res.status(200).json({ status: 200, message: "Updated successfully", box });
    } catch (error: any) {
        return res.status(500).json({ status: 500, error: error.message });
    }
});

// Get one box
app.get('/Box/:id', authenticateJWT, async (req: Request, res: Response) => {
    try {
        const box = await Box.findOne({ BoxId: req.params.id });
        if (!box) return res.status(404).json({ status: 404, error: "Box does not exist" });
        return res.status(200).json({ status: 200, box });
    } catch (error: any) {
        return res.status(500).json({ status: 500, error: error.message });
    }
});

// Delete a box
app.delete('/Box/:id', authenticateJWT, async (req: Request, res: Response) => {
    try {
        const box = await Box.findOne({ BoxId: req.params.id });
        if (!box) return res.status(404).json({ status: 404, error: "Box does not exist" });
        if (box.Store.length > 0) {
            return res.status(400).json({ status: 400, error: "Please empty your box before you delete" });
        }
        await box.remove();
        return res.status(200).json({ status: 200, message: "Box deleted successfully" });
    } catch (error: any) {
        return res.status(500).json({ status: 500, error: error.message });
    }
});
// Create and add a book to a box
app.post('/Box/:id/Book', authenticateJWT, async (req: Request, res: Response) => {
    try {
        const { Title, Description, Author, Price } = req.body;
        const box = await Box.findOne({ BoxId: req.params.id });
        if (!box) return res.status(404).json({ status: 404, error: "Box does not exist" });

        if (box.Store.length >= 5) {
            return res.status(400).json({ status: 400, error: "Box is full. Please find another box or create one" });
        }

        const newBook = new Book({
            BookId: uuidv4(),
            Title,
            Description,
            Author,
            Price,
            status: "Stored"
        });

        await newBook.save();
        box.Store.push(newBook.BookId);
        box.updatedAt = new Date();
        await box.save();

        return res.status(201).json({ status: 201, message: "Book created and stored successfully", newBook });
    } catch (error: any) {
        return res.status(500).json({ status: 500, error: error.message });
    }
});

// Remove a book from a box
app.put('/Box/removeBook/:Bxid/Book/:Bkid', authenticateJWT, async (req: Request, res: Response) => {
    try {
        const box = await Box.findOne({ BoxId: req.params.Bxid });
        const book = await Book.findOne({ BookId: req.params.Bkid });

        if (!book) return res.status(400).json({ status: 400, error: "Book does not exist" });
        if (!box) return res.status(400).json({ status: 400, error: "Box does not exist" });
        if (!box.Store.includes(book.BookId)) {
            return res.status(400).json({ status: 400, error: `Book with id=${book.BookId} is not stored in Box id=${box.BoxId}` });
        }

        box.Store = box.Store.filter((id) => id !== book.BookId);
        box.updatedAt = new Date();
        await box.save();

        book.status = "Unstored";
        book.updatedAt = new Date();
        await book.save();

        return res.status(200).json({ status: 200, message: "Book removed from store successfully" });
    } catch (error: any) {
        return res.status(500).json({ status: 500, error: error.message });
    }
});

// Add an existing book to a box
app.put('/Box/addBook/:Bxid/Book/:Bkid', authenticateJWT, async (req: Request, res: Response) => {
    try {
        const box = await Box.findOne({ BoxId: req.params.Bxid });
        const book = await Book.findOne({ BookId: req.params.Bkid });

        if (!book) return res.status(400).json({ status: 400, error: "Book does not exist" });
        if (!box) return res.status(400).json({ status: 400, error: "Box does not exist" });

        if (box.Store.includes(book.BookId)) {
            return res.status(400).json({ status: 400, error: `Book with id=${book.BookId} already stored in Box id=${box.BoxId}` });
        }
        if (book.status === "Stored") {
            return res.status(400).json({ status: 400, error: `Book with id=${book.BookId} is already stored in another box` });
        }
        if (box.Store.length >= 5) {
            return res.status(400).json({ status: 400, error: "Box is full. Please find another box or create one" });
        }

        box.Store.push(book.BookId);
        box.updatedAt = new Date();
        await box.save();

        book.status = "Stored";
        book.updatedAt = new Date();
        await book.save();

        return res.status(200).json({ status: 200, message: "Book added to box successfully" });
    } catch (error: any) {
        return res.status(500).json({ status: 500, error: error.message });
    }
});
// Get all books
app.get('/Book', authenticateJWT, async (req: Request, res: Response) => {
    try {
        const allBooks = await Book.find();
        return res.status(200).json({ status: 200, allBooks });
    } catch (error: any) {
        return res.status(500).json({ status: 500, error: error.message });
    }
});

// Get a single book by ID
app.get('/Book/:id', authenticateJWT, async (req: Request, res: Response) => {
    try {
        const book = await Book.findOne({ BookId: req.params.id });
        if (!book) return res.status(404).json({ status: 404, error: "Book does not exist" });
        return res.status(200).json({ status: 200, book });
    } catch (error: any) {
        return res.status(500).json({ status: 500, error: error.message });
    }
});

// Search for a book across boxes
app.get('/Book/search/:id', authenticateJWT, async (req: Request, res: Response) => {
    try {
        const bookId = req.params.id;
        const boxes = await Box.find({ Store: bookId });

        if (boxes.length === 0) {
            return res.status(404).json({ status: 404, error: "Book not found in any box" });
        }

        return res.status(200).json({ status: 200, message: "Book found in boxes", boxes });
    } catch (error: any) {
        return res.status(500).json({ status: 500, error: error.message });
    }
});

// Delete a book by ID
app.delete('/Book/:id', authenticateJWT, async (req: Request, res: Response) => {
    try {
        const book = await Book.findOne({ BookId: req.params.id });
        if (!book) return res.status(404).json({ status: 404, error: "Book does not exist" });

        if (book.status === "Stored") {
            const boxes = await Box.find({ Store: book.BookId });
            for (const box of boxes) {
                box.Store = box.Store.filter((id) => id !== book.BookId);
                box.updatedAt = new Date();
                await box.save();
            }
        }

        await book.remove();
        return res.status(200).json({ status: 200, message: "Book deleted successfully" });
    } catch (error: any) {
        return res.status(500).json({ status: 500, error: error.message });
    }
});
const userSchema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['user', 'admin'] }
});

const User = model('User', userSchema);

// Register a new user
app.post('/register', async (req: Request, res: Response) => {
    const { username, password, role } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, role });
        await newUser.save();
        return res.status(201).json({ status: 201, message: "User registered successfully" });
    } catch (error: any) {
        return res.status(500).json({ status: 500, error: error.message });
    }
});

// User login
app.post('/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ status: 404, error: "User not found" });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ status: 401, error: "Invalid credentials" });

        const token = jwt.sign({ username: user.username, role: user.role }, 'your_jwt_secret', { expiresIn: '1h' });
        return res.status(200).json({ status: 200, token });
    } catch (error: any) {
        return res.status(500).json({ status: 500, error: error.message });
    }
});
// MongoDB Indexing for faster search
boxSchema.index({ 'Store': 1 });
bookSchema.index({ 'BookId': 1 });

// Centralized Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: Function) => {
    console.error(err.stack);
    res.status(500).json({ status: 500, error: "Something went wrong!" });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
