const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
// require('crypto').randomBytes(64).toString('hex')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000


// middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6nxonq0.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyJWT = (req,res,next) => {
  // console.log(req.headers.authorization)
  const authorization = req.headers.authorization
  const token = authorization.split(' ')[1]
  // console.log(token)
  if(!authorization)
  {
    return res.status(401).send({error: true , message: 'Unauthorization Access'})
  }
  jwt.verify(token , process.env.ACCESS_TOKEN_SECRET , (error,decoded) => {
    if(error)
    {
      return res.status(403).send({error: true , message: 'Unauthorization Access'})
    }
    req.decoded = decoded
    next()
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const database = client.db("carDoctor");
    const servicesCollection = database.collection("services");
    const bookingCollection = database.collection("bookings")

    // JWT 
    app.post('/jwt', (req,res) =>{
      const user = req.body
      console.log(user)
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{ expiresIn: '1h' })
      res.send({token})
    })
    /// Services
    app.get('/services' , async(req,res) =>{
        const cursor = servicesCollection.find()
        const result = await cursor.toArray()
        res.send(result)
    })

    app.get('/services/:id', async(req,res) =>{
        const id = req.params.id
        const query = {_id : new ObjectId(id)}
        const result = await servicesCollection.findOne(query)
        res.send(result)
    })

    /// Bookings
    app.get('/bookings',verifyJWT, async(req,res) =>{
      const decoded = req.decoded
      console.log('after verify',decoded)

      if(decoded.email !== req.query.email)
      {
        return res.status(403).send({error: 1 , message: 'Forbidden Access'})
      }
      let query = {}
      if(req.query?.email)
      {
        query = {email : req.query.email}
      }
      const result = await bookingCollection.find(query).toArray()
      res.send(result)
    })

    app.post('/bookings' , async(req,res) => {
        const order = req.body
        const result = await bookingCollection.insertOne(order)
        res.send(result)
    })

    app.patch('/bookings/:id', async(req,res) =>{
      const id = req.params.id
      const filter = {_id : new ObjectId(id)}
      const UpdateBooking = req.body
      const UpdateDoc = {
        $set: {
          status : UpdateBooking.status
        }
      }

      const result = await bookingCollection.updateOne(filter, UpdateDoc)
      res.send(result)
    })

    app.delete('/bookings/:id' , async(req,res) =>{
      const id = req.params.id
      const query = {_id : new ObjectId(id)}
      const result = await bookingCollection.deleteOne(query)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res) =>{
    res.send('server is running')
})

app.listen(port, (req,res) =>{
    console.log(`server is running on port ${port}`)
})