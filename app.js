const express = require('express')
const app = express()
const dotenv = require('dotenv');
const cors = require('cors')
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

  const collection = database.collection("users")
  collection.insert(user, (error, result) => {
    if (error) {
      return response.status(500).send(error)
    }
    response.send(user)
  })
})
app.get('/', (req, res) => {
  res.send('Hello World!')
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