import { v4 as uuidv4 } from 'uuid';
import {  Server, StableBTreeMap, ic } from 'azle';
import express, { Request, Response } from 'express';

interface Book {
    BookId: string;
    Title: string;
    Description : string;
    Author: string;
    Price: number;
    status: string;
    createdAt: Date;
    updatedAt?:Date     
}

interface Box {
     BoxId: string;
     BoxName: string;
     Store: string[];
     createdAt: Date;
     updatedAt?:Date  
}

const BoxStorage = StableBTreeMap<string, Box>(0)
const BookStorage = StableBTreeMap<string,Book>(1)

export default Server(()=>{
 const app = express();
 app.use(express.json);


 //Create a box 
app.post('/Box',(req: Request, res: Response)=>{
    const { BoxName } = req.body;
    try{
      
        const NewBox: Box ={
            BoxId: uuidv4(),
            BoxName,
            Store: [],
            createdAt: getCurrentDate()
        } 
        BoxStorage.insert(NewBox.BoxId,NewBox)
        return res.status(201).json({status: 201, NewBox})
    }catch(error:any){
        return res.status(500).json({status: 500, error: error.message})
    }
})

//Get all box
app.get('/Box',(req:Request, res:Response)=>{
    try{
        const AllBox = BoxStorage.values();
        return res.status(200).json({status: 200, AllBox})
    }catch(error: any){
        return res.status(500).json({status: 500, error: error.message})
    }  
})

// updating box
app.put('/Box/:id',(req:Request,res:Response)=>{
    try{
        const id = req.params.id;
        const { BoxName } = req.body;
        const BoxExist = BoxStorage.get(id);
      if('None' in BoxExist){
        return res.status(404).json({status:404, error:"Box Does not exist"})
      }else {
        const updatedBox:Box= {
            ...BoxExist.Some,
            BoxName, 
            updatedAt: getCurrentDate()
       }

        BoxStorage.insert(BoxExist.Some.BoxId,updatedBox);
        return res.status(200).json({status: 200, message: "updated successful"})
      }
      
         
    }catch(error:any){
        return res.status(500).json({status: 500, error: error.message})
    }
   
})

// get one box 
app.get('/Box/:id', (req:Request, res:Response)=>{
   try{
        const id = req.params.id;
        const BoxExist = BoxStorage.get(id);
        
        if('None' in BoxExist){
        return res.status(404).json({status:404, error:"Box Does not exist"})
        }else {
            const Box = BoxExist.Some
            return res.status(200).json({status:200, Box})
        }
   }catch(error:any){
    return res.status(500).json({status: 500, error: error.message})
   }
})

// delete  box
app.delete('/Box/:id',(req:Request,res:Response)=>{
  try{
    const id = req.params.id;
  const BoxExist = BoxStorage.get(id);
  if('None' in BoxExist){
    return res.status(400).json({status: 404, error: "Box does not exist"})
  }else if(BoxExist.Some.Store.length > 0){
    return res.status(400).json({status:404, error:"Please empty your box before you delete"})
  }else{
    const deletedBox = BoxStorage.remove(id);
    if('None' in deletedBox){
     return res.status(400).json({status: 400, error: `We couldn't delete box with id=${id}`})
    }else{
        return res.status(200).json({status:200,message:"Box deleted successfully"})
    }
  }  

  }catch(error:any){
    return res.status(500).json({status: 500, error: error.message})
  }
  
})

// Create and Add  book in store
app.post('/Box/:id/Book',(req:Request, res:Response)=>{
   try{ 
    const boxid = req.params.id;
    const { 
        Title,
        Description,
        Author,
        Price, 
    } = req.body;
    const BoxExist = BoxStorage.get(boxid);
    if('None' in BoxExist){
      return res.status(400).json({status: 404, error: "Box does not exist"})
    }

    if(BoxExist.Some.Store.length === 5){
        return res.status(400).json({status: 404, error: "Box is full please find other box or create one"})
    }
   const NewBook: Book= {
       BookId: uuidv4(),
       Title,
       Description,
       Author,
       Price,
       status: "Stored",
       createdAt: getCurrentDate()
   }

   BookStorage.insert(NewBook.BookId,NewBook);
   BoxExist.Some.Store.push(NewBook.BookId)
   const updatedBox = {
    ...BoxExist.Some,
   }
   BoxStorage.insert(BoxExist.Some.BoxId,updatedBox)
   return res.status(201).json({status:201,message:"Box Created and stored successfully"})

   }catch(error: any){
    return res.status(500).json({status: 500, error: error.message})
   }
}
)
// Remove exist book in  box
app.put('/Box/removeBook/:Bxid/Book/:Bkid', (req:Request, res:Response)=>{
   
  try{
    const boxId = req.params.Bxid;
    const bookId = req.params.Bkid;
    const BoxExist = BoxStorage.get(boxId);
    const BookExist = BookStorage.get(bookId)
 
    if('None' in BookExist){
     return res.status(400).json({status: 400, error: "Book does not exist"})
    }
 
    if('None' in BoxExist){
      return res.status(400).json({status: 400, error: "Box does not exist"})
    }
 
    if(!BoxExist.Some.Store.includes(bookId)){
     return res.status(400).json({status: 400, error: `Book with id=${bookId} is not stored in Box id=${boxId}`})
    }
    const NewStore = BoxExist.Some.Store.filter((item)=>item !=bookId)
    
    const updatedBox:Box={
     ...BoxExist.Some, Store:NewStore,updatedAt: getCurrentDate()
    }
 
    BoxStorage.insert(boxId, updatedBox);
    const updatedBook={
      ...BookExist.Some,status: "Unstored", updatedAt:getCurrentDate()
    }
 
    BookStorage.insert(bookId,updatedBook)
 
    return res.status(200).json({status:200, message:"Book removed from store successfully"})

  }catch(error: any){
    return res.status(500).json({status: 500, error: error.message})
  }
})
// add existing book in store
app.put('/Box/addBook/:Bxid/Book/:Bkid',(req:Request,res:Response)=>{
  
    try{
      const boxId = req.params.Bxid;
      const bookId = req.params.Bkid;
      const BoxExist = BoxStorage.get(boxId);
      const BookExist = BookStorage.get(bookId)
   
      if('None' in BookExist){
       return res.status(400).json({status: 400, error: "Book does not exist"})
      }
      if('None' in BoxExist){
        return res.status(400).json({status: 400, error: "Box does not exist"})
      }
  
      if(BoxExist.Some.Store.includes(bookId)){
          return res.status(400).json({status: 400, error: `Book with id=${bookId} already stored in Box id=${boxId}`})
      }
      if(BookExist.Some.status==="Stored"){
          return res.status(400).json({status: 400,error:"Book is stored in this or other box"})
      }
      const updatedBook: Book= {
           ...BookExist.Some,status: "stored",
          updatedAt: getCurrentDate()
      }
   
      BookStorage.insert(updatedBook.BookId,updatedBook);
      BoxExist.Some.Store.push(updatedBook.BookId)
      const updatedBox = {
       ...BoxExist.Some,
      }
      BoxStorage.insert(BoxExist.Some.BoxId,updatedBox)
  
      return res.status(200).json({status:200, message:"Book added successfully"})
    }catch(error:any){
        return res.status(500).json({status: 500, error: error.message})
    }
})

// GET all book
app.get('/Book',(req:Request,res:Response)=>{
  try{
    const AllBox = BookStorage.values();
    return res.status(200).json({status:200, AllBox})  
}catch(error:any){
    return res.status(500).json({status: 500, error: error.message})
  }
})


// get one book
app.get('/Book/:id',(req:Request,res:Response)=>{
  try{
    const bookId= req.params.id;
    const BookExist = BookStorage.get(bookId);

    if('None' in BookExist){
     return res.status(400).json({status: 400, error: "Book does not exist"})
    }
    
    return res.status(200).json({status: 200, Book:BookExist.Some })
  }catch(error:any){
    return res.status(500).json({status: 500, error: error.message})
  }
})
// Delete exist book 
app.delete('/Book/:id',(req:Request,res:Response)=>{
    try{
        const bookId= req.params.id;
       const BookExist = BookStorage.get(bookId);

    if('None' in BookExist){
     return res.status(400).json({status: 400, error: "Book does not exist"})
    }

    if(BookExist.Some.status ==="stored"){
      return res.status(400).json({status:400, error:"Please remove the book in box to delete it"})
    }
    
    BookStorage.remove(bookId)
    return res.status(200).json({status:200, message:"deleted Successfully"})
   
    }catch(error: any){
      return res.status(500).json({status: 500, error: error.message})
    }
})
// edit exist book
app.put('/Book/:id',(req:Request,res:Response)=>{
    try{
        const bookId= req.params.id;
       const BookExist = BookStorage.get(bookId);

      if('None' in BookExist){
     return res.status(400).json({status: 400, error: "Book does not exist"})
     }
     const updatedBook:Book ={
        ...BookExist.Some,
        ...req.body, updatedAt: getCurrentDate()
     }
    
    BookStorage.insert(bookId,updatedBook)
    return res.status(200).json({status:200, message:"updated Successfully"})
   
    }catch(error: any){
        return res.status(500).json({status: 500, error: error.message})
    }
})
// search the book in the box
app.post("/Book/search/:id",(req:Request,res:Response)=>{
   try{
    const bookId= req.params.id;
    const bookExist = BookStorage.get(bookId);
 
    if("None" in bookExist){
     return res.status(401).json({status:401, error:"this book does not exist"})
    }
 
    if(bookExist.Some.status === "unstored"){
     return res.status(401).json({status:401, error:"This book seem not be stored in box"});
    }
 
    const allBox = BoxStorage.values();
    for(let i=0; i < allBox.length;i++){
     if(allBox[i].Store.includes(bookId)){
       return res.status(200).json({status: 200,message: `The book with id=${bookId} is stored in box with id=${allBox[i].BoxId}`})
     }
 
     return res.status(401).json({status: 401, error: "sorry please we couldn't find this book in any store"})
    }
   }catch(error:any){
    return res.status(500).json({status: 500, error: error.message})
   }

})


const PORT = 4000
return app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`)
})

})


const getCurrentDate=()=>{
    const timestamp = new Number(ic.time());
    return new Date(timestamp.valueOf() / 1000_000);
}

