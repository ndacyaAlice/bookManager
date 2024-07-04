# BOOK Manager

BookManager is designed to help users organize their books efficiently. It provides features to store books in boxes, retrieve them easily, and find them at any time. Additionally, BookManager offers recommendations on the most effective ways to store your books

## Features

 -> Create box and book
 -> Add books to and delete from the box
 -> perfom CRUD operations on Books and Boxes
 -> Search for the book

 # Installation 
  `
  - Clone the repository
  - install dependencies using `npm install`
  - Run the project using `dfx start --host 127.0.0.1:8000 --clean --background`
  - deploy locally `dfx deploy
    
  
  `

# Usage and endpoints
 
 - ` POST  /Box`: create the Box

    - example: ` { BoxName: "Fiction" }`

 - ` GET /Box`: Get all box
 - ` PUT /Box/{id}`: updating the box

     - example: ` { BoxName: "Fiction" }`

 - ` GET /Box/{id}`: get single box
 - ` DELETE /Box/{id}:`: delete single box
 - ` POST /Box/{id}/Book`: create and add book in box simultanously 

 example : 
 ``` 
 { 
    Title: "The 48 laws of power",
    Description: "This book illustrate the 48 laws to have power"
    Author: "Robert greene",
    Price: 45


 }
 
 ```

 -` PUT /Book/removeBook/{Bxid}/Book/:BKid`:Remove existing book in box
 - ` PUT /Box/addBook/:Bxid/Book/:Bkid`: Add existing book in box
 - `GET /Book`: get all books
 - `GET /Book/{id} `:get one book
 - `DELETE /Book/:id `: DELETE EXISTING BOOK
 - `PUT /Book/{id}`: edit existing book 
 - `POST /Book/search/{id}`: search the book in the box 

