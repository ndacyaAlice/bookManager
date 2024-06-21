import { v4 as uuidv4 } from 'uuid';
import { Server, StableBTreeMap, ic } from 'azle';
import express, { Request, Response } from 'express';

interface Book {
    BookId: string;
    Title: string;
    Description: string;
    Author: string;
    Price: number;
    status: string;
    createdAt: Date;
    updatedAt?: Date;
}

interface Box {
    BoxId: string;
    BoxName: string;
    Store: string[];
    createdAt: Date;
    updatedAt?: Date;
}

const BoxStorage = StableBTreeMap<string, Box>(0);
const BookStorage = StableBTreeMap<string, Book>(1);

const app = express();
app.use(express.json());

// Helper functions
const getCurrentDate = (): Date => {
    const timestamp = Number(ic.time());
    return new Date(timestamp.valueOf() / 1000_000);
};

const sendResponse = (res: Response, status: number, data: any) => {
    return res.status(status).json({ status, ...data });
};

const findBox = (id: string) => BoxStorage.get(id);
const findBook = (id: string) => BookStorage.get(id);

// Route handlers
app.post('/Box', (req: Request, res: Response) => {
    const { BoxName } = req.body;
    try {
        const NewBox: Box = {
            BoxId: uuidv4(),
            BoxName,
            Store: [],
            createdAt: getCurrentDate()
        };
        BoxStorage.insert(NewBox.BoxId, NewBox);
        return sendResponse(res, 201, { NewBox });
    } catch (error: any) {
        return sendResponse(res, 500, { error: error.message });
    }
});

app.get('/Box', (req: Request, res: Response) => {
    try {
        const AllBox = BoxStorage.values();
        return sendResponse(res, 200, { AllBox });
    } catch (error: any) {
        return sendResponse(res, 500, { error: error.message });
    }
});

app.put('/Box/:id', (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const { BoxName } = req.body;
        const BoxExist = findBox(id);
        if ('None' in BoxExist) {
            return sendResponse(res, 404, { error: "Box does not exist" });
        }
        const updatedBox: Box = {
            ...BoxExist.Some,
            BoxName,
            updatedAt: getCurrentDate()
        };
        BoxStorage.insert(BoxExist.Some.BoxId, updatedBox);
        return sendResponse(res, 200, { message: "Update successful" });
    } catch (error: any) {
        return sendResponse(res, 500, { error: error.message });
    }
});

app.get('/Box/:id', (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const BoxExist = findBox(id);
        if ('None' in BoxExist) {
            return sendResponse(res, 404, { error: "Box does not exist" });
        }
        return sendResponse(res, 200, { Box: BoxExist.Some });
    } catch (error: any) {
        return sendResponse(res, 500, { error: error.message });
    }
});

app.delete('/Box/:id', (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const BoxExist = findBox(id);
        if ('None' in BoxExist) {
            return sendResponse(res, 404, { error: "Box does not exist" });
        }
        if (BoxExist.Some.Store.length > 0) {
            return sendResponse(res, 400, { error: "Please empty your box before deleting" });
        }
        const deletedBox = BoxStorage.remove(id);
        if ('None' in deletedBox) {
            return sendResponse(res, 400, { error: `Could not delete box with id=${id}` });
        }
        return sendResponse(res, 200, { message: "Box deleted successfully" });
    } catch (error: any) {
        return sendResponse(res, 500, { error: error.message });
    }
});

app.post('/Box/:id/Book', (req: Request, res: Response) => {
    try {
        const boxid = req.params.id;
        const { Title, Description, Author, Price } = req.body;
        const BoxExist = findBox(boxid);
        if ('None' in BoxExist) {
            return sendResponse(res, 404, { error: "Box does not exist" });
        }
        if (BoxExist.Some.Store.length === 5) {
            return sendResponse(res, 400, { error: "Box is full, please find another box or create one" });
        }
        const NewBook: Book = {
            BookId: uuidv4(),
            Title,
            Description,
            Author,
            Price,
            status: "Stored",
            createdAt: getCurrentDate()
        };
        BookStorage.insert(NewBook.BookId, NewBook);
        BoxExist.Some.Store.push(NewBook.BookId);
        const updatedBox = {
            ...BoxExist.Some
        };
        BoxStorage.insert(BoxExist.Some.BoxId, updatedBox);
        return sendResponse(res, 201, { message: "Book created and stored successfully" });
    } catch (error: any) {
        return sendResponse(res, 500, { error: error.message });
    }
});

app.put('/Box/removeBook/:Bxid/Book/:Bkid', (req: Request, res: Response) => {
    try {
        const boxId = req.params.Bxid;
        const bookId = req.params.Bkid;
        const BoxExist = findBox(boxId);
        const BookExist = findBook(bookId);
        if ('None' in BookExist) {
            return sendResponse(res, 400, { error: "Book does not exist" });
        }
        if ('None' in BoxExist) {
            return sendResponse(res, 400, { error: "Box does not exist" });
        }
        if (!BoxExist.Some.Store.includes(bookId)) {
            return sendResponse(res, 400, { error: `Book with id=${bookId} is not stored in Box id=${boxId}` });
        }
        const NewStore = BoxExist.Some.Store.filter((item) => item !== bookId);
        const updatedBox: Box = {
            ...BoxExist.Some, Store: NewStore, updatedAt: getCurrentDate()
        };
        BoxStorage.insert(boxId, updatedBox);
        const updatedBook = {
            ...BookExist.Some, status: "Unstored", updatedAt: getCurrentDate()
        };
        BookStorage.insert(bookId, updatedBook);
        return sendResponse(res, 200, { message: "Book removed from store successfully" });
    } catch (error: any) {
        return sendResponse(res, 500, { error: error.message });
    }
});

app.put('/Box/addBook/:Bxid/Book/:Bkid', (req: Request, res: Response) => {
    try {
        const boxId = req.params.Bxid;
        const bookId = req.params.Bkid;
        const BoxExist = findBox(boxId);
        const BookExist = findBook(bookId);
        if ('None' in BookExist) {
            return sendResponse(res, 400, { error: "Book does not exist" });
        }
        if ('None' in BoxExist) {
            return sendResponse(res, 400, { error: "Box does not exist" });
        }
        if (BoxExist.Some.Store.includes(bookId)) {
            return sendResponse(res, 400, { error: `Book with id=${bookId} is already stored in Box id=${boxId}` });
        }
        if (BookExist.Some.status === "Stored") {
            return sendResponse(res, 400, { error: "Book is already stored in this or another box" });
        }
        const updatedBook: Book = {
            ...BookExist.Some, status: "Stored",
            updatedAt: getCurrentDate()
        };
        BookStorage.insert(updatedBook.BookId, updatedBook);
        BoxExist.Some.Store.push(updatedBook.BookId);
        const updatedBox = {
            ...BoxExist.Some
        };
        BoxStorage.insert(BoxExist.Some.BoxId, updatedBox);
        return sendResponse(res, 200, { message: "Book added successfully" });
    } catch (error: any) {
        return sendResponse(res, 500, { error: error.message });
    }
});

app.get('/Book', (req: Request, res: Response) => {
    try {
        const AllBooks = BookStorage.values();
        return sendResponse(res, 200, { AllBooks });
    } catch (error: any) {
        return sendResponse(res, 500, { error: error.message });
    }
});

app.get('/Book/:id', (req: Request, res: Response) => {
    try {
        const bookId = req.params.id;
        const BookExist = findBook(bookId);
        if ('None' in BookExist) {
            return sendResponse(res, 400, { error: "Book does not exist" });
        }
        return sendResponse(res, 200, { Book: BookExist.Some });
    } catch (error: any) {
        return sendResponse(res, 500, { error: error.message });
    }
});

app.delete('/Book/:id', (req: Request, res: Response) => {
    try {
        const bookId = req.params.id;
        const BookExist = findBook(bookId);
        if ('None' in BookExist) {
            return sendResponse(res, 400, { error: "Book does not exist" });
        }
        if (BookExist.Some.status === "Stored") {
            return sendResponse(res, 400, { error: "Please remove the book from the box to delete it" });
        }
        BookStorage.remove(bookId);
        return sendResponse(res, 200, { message: "Deleted successfully" });
    } catch (error: any) {
        return sendResponse(res, 500, { error: error.message });
    }
});

app.put('/Book/:id', (req: Request, res: Response) => {
    try {
        const bookId = req.params.id;
        const BookExist = findBook(bookId);
        if ('None' in BookExist) {
            return sendResponse(res, 400, { error: "Book does not exist" });
        }
        const updatedBook: Book = {
            ...BookExist.Some,
            ...req.body, updatedAt: getCurrentDate()
        };
        BookStorage.insert(bookId, updatedBook);
        return sendResponse(res, 200, { message: "Updated successfully" });
    } catch (error: any) {
        return sendResponse(res, 500, { error: error.message });
    }
});

app.post("/Book/search/:id", (req: Request, res: Response) => {
    try {
        const bookId = req.params.id;
        const bookExist = findBook(bookId);
        if ("None" in bookExist) {
            return sendResponse(res, 401, { error: "This book does not exist" });
        }
        if (bookExist.Some.status === "Unstored") {
            return sendResponse(res, 401, { error: "This book is not stored in any box" });
        }
        const allBox = BoxStorage.values();
        for (let i = 0; i < allBox.length; i++) {
            if (allBox[i].Store.includes(bookId)) {
                return sendResponse(res, 200, { message: `The book with id=${bookId} is stored in box with id=${allBox[i].BoxId}` });
            }
        }
        return sendResponse(res, 401, { error: "Could not find this book in any store" });
    } catch (error: any) {
        return sendResponse(res, 500, { error: error.message });
    }
});

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});