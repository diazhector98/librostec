const express = require('express')
const app = express()
const dotenv = require('dotenv');
const axios = require('axios')
const cors = require('cors');
const { default: Axios } = require('axios');
const { response } = require('express');
const MongoClient = require('mongodb').MongoClient;

dotenv.config();

const uri = process.env.MONGO_URI
const DATABASE_NAME = process.env.DATABASE
let database = null
const port = 3000


app.use(express.static("public"))
app.use(cors())

app.post('/user', (request, response) => {
  const {
    firebaseId,
    name,
    email
  } = request.query

  const user = {
    firebaseId,
    name,
    email
  }

  //Nombre del autor, categoría, fechas de publicación,imagen
  const collection = database.collection("users")
  collection.insert(user, (error, result) => {
    if (error) {
      return response.status(500).send(error)
    }
    response.send(user)
  })
})

// https://developers.google.com/books/docs/v1/getting_started
// AIzaSyBG1fVsps6ZrjXH2liIVThgAU-Zt5qv5qk
app.get('/books', (request, response) => {
  const {
    textQuery
  } = request.query

  const apiKey = "AIzaSyBG1fVsps6ZrjXH2liIVThgAU-Zt5qv5qk"
  const maxResults = 40
  const searchBooksEndpoint = `https://www.googleapis.com/books/v1/volumes?q=${textQuery.split(" ").join("+")}&key=${apiKey}&maxResults=${maxResults}`
  axios.get(searchBooksEndpoint).then((result) => {
    const {totalItems, items} = result.data
    let filteredItems = []
    let bookIndex = 0;

    let bookKeys = {}
    let categoriesKeys = {}
    let authorsKeys = {}

    while (bookIndex < maxResults) {
      
      const item = items[bookIndex]
      console.log({item})
      if (!item) {
        bookIndex++
        continue
      } 
      const id = item.id
      const volumeInfo = item.volumeInfo
      const {
        title,
        subtitle,
        authors,
        publishedDate,
        description,
        pageCount,
        categories,
        imageLinks,
        averageRating
      } = volumeInfo


      const bookKey = title.toLowerCase() + "#" + (subtitle ? subtitle.toLowerCase() : "")
      if (bookKeys[bookKey]) {
        bookIndex++
        continue
      }

      bookKeys[bookKey] = true

      if (categories) {
        categories.forEach(category => {
          categoriesKeys[category] = true
        })
      }

      if (authors) {
        authors.forEach(author => {
          authorsKeys[author] = true
        })
      }
      

      filteredItems.push({
        id,
        title,
        subtitle,
        authors,
        publishedDate,
        description,
        pageCount,
        categories,
        imageLinks,
        averageRating
      })
      bookIndex++
    }

    response.send({
      totalItemsFetched: totalItems,
      itemsReturned: filteredItems.length,
      authors: Object.keys(authorsKeys),
      categories: Object.keys(categoriesKeys),
      books: filteredItems,
    })

  })

})

app.get('/book', (request, response) => {
  const {
    bookId
  } = request.query

  const endpoint = `https://www.googleapis.com/books/v1/volumes/${bookId}`
  axios.get(endpoint).then((result) => {
    const item = result.data
    const volumeInfo = item.volumeInfo
    const {
      title,
      subtitle,
      authors,
      publishedDate,
      description,
      pageCount,
      categories,
      imageLinks,
      averageRating
    } = volumeInfo

    response.send({
      id: item.id,
      title,
      subtitle,
      authors,
      publishedDate,
      description,
      pageCount,
      categories,
      imageLinks,
      averageRating
    })
  })
})


app.post('/readingNow', (request, response) => {
  const {
    bookId,
    firebaseId
  } = request.query

  const collection = database.collection("users")
  collection.updateOne({firebaseId}, {$push: {
    readingNow: bookId
  }}, (error, result) => {
    if (error) {
      return response.status(500).send(error)
    }
    response.send({
      bookId,
      firebaseId
    })
  })
})

app.listen(process.env.PORT || 3000, 
() => {
  console.log(`Listening on port ${process.env.PORT || 3000}`)
  MongoClient.connect(uri, {useNewUrlParser: true, useUnifiedTopology: true}, (error, client) => {
    if (error){
      throw error
    }
    database = client.db(DATABASE_NAME)
  })
});