const express = require('express')
const app = express()
const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://diazhector98:Govosin98!@cluster0.oqgjb.mongodb.net/librostec?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true });
const port = 3000

client.connect(err => {
  const collection = client.db("librostec").collection("users")
  collection.findOne({}, function(err, result) {
    if (err) throw err;
    console.log(result);
  });;
  // perform actions on the collection object
  client.close();
});


app.use(express.static("public"))


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(process.env.PORT || 3000, 
	() => console.log("Server is running..."));