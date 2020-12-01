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

app.get('/user', (request, response) => {
  const {
    firebaseId
  } = request.query

  const collection = database.collection("users")
  collection.findOne({firebaseId}, (error, result) => {
    if (error) {
      return response.send("Error")
    }
    return response.send(result)
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

app.post('/book', (request, response) => {
  const bookData = request.query
  const collection = database.collection("books")
  console.log({bookData})
  collection.find({
    bookId: bookData.bookId
  }, null).toArray((err, result) => {
    if (err) {
      return response.send(err)
    }
    if (result.length == 0) {
      collection.insert(bookData, (error, result2) => {
        if (error) {
          return response.status(500).send(error)
        }
        return response.send(bookData)
      })
    } else {
      return response.send(result[0])
    }
  })

})

app.get('/userbooks', (request, response) => {
  const {firebaseId} = request.query
  const userCollection = database.collection("users")
  userCollection.findOne({firebaseId}, (error, result) => {
    if (error) {
      return response.send("Error")
    }

    if (result == null) {
      return response.send("Error")
    }

    const {
      readingNow,
      planningToRead,
      booksRead
    } = result

    const bookIds = []

    if (readingNow) {
      readingNow.forEach(book => bookIds.push(book.bookId))
    }

    if (planningToRead) {
      planningToRead.forEach(book => bookIds.push(book.bookId))
    }

    if (booksRead) {
      booksRead.forEach(book => bookIds.push(book.bookId))
    }

    const bookCollection = database.collection("books")
    const query = {
      bookId: {$in: bookIds}
    }
    bookCollection.find(query, null).toArray((error, result) => {
      if (error) {
        return response.send(error)
      }
      return response.send(result)
    })

  })
  
})

app.post('/booksRead', (request, response) => {
  const {
    bookId,
    dateEnded,
    firebaseId
  } = request.query
  const collection = database.collection("users")
  collection.findOne({firebaseId}, (error, result) => {
    if (error) {
      return response.send("Error")
    }

    const {readingNow} = result

    let readBook = null

    readingNow.forEach((book) => {
      if (book.bookId == bookId) {
        readBook = book
      }
    })

    if (readBook == null) {
      return response.send("User is not reading that book")
    }

    readBook.dateEnded = dateEnded


    const removeBookQuery = {
      $pull: {
        readingNow: {
          bookId
        }
      }
    }

    collection.updateOne({firebaseId}, removeBookQuery, (error2, result2) => {
      if (error2) {
        return response.send(error2)
      }
      collection.updateOne({firebaseId}, {$push: {
        booksRead: readBook
      }}, (error3, result3) => {
        if (error3) {
          return response.send(error3)
        }
        return response.send("Book read")
      })
    })
  })


})


app.post('/readingNow', (request, response) => {
  const {
    bookId,
    dateStarted,
    currentPage,
    totalPages,
    firebaseId
  } = request.query

  const book = {
    bookId,
    dateStarted,
    currentPage: parseInt(currentPage),
    totalPages: parseInt(totalPages),
    firebaseId
  }

  const collection = database.collection("users")
  collection.updateOne({firebaseId}, {$push: {
    readingNow: book
  }}, (error, result) => {
    if (error) {
      return response.status(500).send(error)
    }
    response.send(book)
  })
})

app.post('/planningToRead', (request, response) => {
  const {
    bookId,
    firebaseId
  } = request.query

  const book = {
    bookId,
    firebaseId
  }

  const collection = database.collection("users")
  collection.updateOne({firebaseId}, {$push: {
    planningToRead: book
  }}, (error, result) => {
    if (error) {
      return response.status(500).send(error)
    }
    response.send(book)
  })
})

app.post('/user/book/updateCurrentPage', (request, response) => {
  const {
    firebaseId,
    bookId,
    currentPage
  } = request.query

  console.log({
    firebaseId,
    bookId,
    currentPage
  })

  const collection = database.collection("users")
  const newValues = {
    $set: {
      'readingNow.$.currentPage': parseInt(currentPage)
    }
  }
  collection.findOneAndUpdate(
    {
      firebaseId,
      'readingNow.bookId': bookId
    }, 
    newValues, 
    (error, result) => {
      if (error) {
        return response.status(500).send(error)
      }
      return response.send(result.value)
    })

})


app.post("/user/stats/pagesRead", (request, response) => {
  const {
    firebaseId,
    date,
    pages
  } = request.query

  const collection = database.collection("users")
  collection.updateOne({firebaseId}, {$set: {
    [`pagesRead.${date}`]: parseInt(pages)
  }}, (error, result) => {
    if (error) {
      return response.status(500).send(error)
    }
    console.log({result})
    response.send(result.result)
  })
})

app.get("/user/recommendations", (request, response) => {
  const {
    firebaseId
  } = request.query

  const collection = database.collection("users")
  collection.findOne({firebaseId}, (error, result) => {
    if (error) {
      return response.send("Error")
    }
    const {
      readingNow,
      planningToRead,
      booksRead
    } = result

    let bookReadIdsDict = {}
    let planningToReadIdsDict = {}
    let readingNowIdsDict = {}


    let booksReadIds = []
    let planningToReadIds = []
    let readingNowIds = []
    
    if (booksRead) {
      booksReadIds = booksRead.map(book => book.bookId)
    }

    if (planningToRead) {
      planningToReadIds = planningToRead.map(book => book.bookId)
    }

    if (readingNow) {
      readingNowIds = readingNow.map(book => book.bookId)
    }

    booksReadIds.forEach(id => {
      bookReadIdsDict[id] = true
    })

    planningToReadIds.forEach(id => {
      planningToReadIdsDict[id] = true
    })

    readingNowIds.forEach(id => {
      readingNowIdsDict[id] = true
    })

    const query = {
      'booksRead.bookId': {$in: booksReadIds}
    }
    collection.find(query).toArray((error2, result2) => {
      if (error2) {
        return response.send(error2)
      }

      const usersThatHaveReadTheSameBooks = result2
      const recommendedBookIds = {}
      
      usersThatHaveReadTheSameBooks.forEach(user => {
        const userBooksRead = user.booksRead
        const userBooksReadIds = userBooksRead.map(book => book.bookId)
        userBooksReadIds.forEach(id => {
          console.log(id)
          if (id in planningToReadIdsDict || id in readingNowIdsDict || id in bookReadIdsDict) {
            
          } else {
            recommendedBookIds[id] = true
          }
          
        })
      })
      let recommended = Object.keys(recommendedBookIds)
      return response.send({recommendedBookIds: recommended})
    })
  })
})

app.get("/books/recommended", (request, response) => {
  let {
    bookIds
  } = request.query

  bookIds = bookIds.replace('[', '').replace(']','').split(",")
  console.log({bookIds})
  const bookCollection = database.collection("books")
  const query = {
    bookId: {$in: bookIds}
  }
  bookCollection.find(query, null).toArray((error, result) => {
    if (error) {
      return response.send(error)
    }
    return response.send(result)
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