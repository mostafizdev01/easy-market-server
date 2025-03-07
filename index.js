const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config()

const port = process.env.PORT || 9000
const app = express()

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eywn0.mongodb.net/?retryWrites=true&w=majority&appName=Main`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

async function run() {
  try {

    /// create the database collection ---------

    const db = client.db("solo-db");
    const jobCollection = db.collection("jobs");
    const bidCollection = db.collection("bids");

    // post the job from the database 

    app.post("/add-job", async (req, res) => {
      const newJob = req.body;
      const result = await jobCollection.insertOne(newJob);
      res.send(result);
    })

    // get the all jobs from the database 

    app.get("/jobs", async (req, res) => {
      const allJobs = await jobCollection.find().toArray();
      res.send(allJobs);
    })

    /// get the single job from the database

    app.get("/jobs/:jobId", async (req, res) =>{
      const jobId = req.params.jobId;
      const result = await jobCollection.findOne({ _id: new ObjectId(jobId) });
      res.send(result);
    })

    /// post the bid-job data from the database

    app.post("/bid-job", async(req, res) => {
      const bidJob = req.body;
      const result = await bidCollection.insertOne(bidJob);
      res.send(result);
    })

       // my posted bid data get the database ***************************

       app.get("/my-post", async (req, res) => {
        const email = req.query.email;
        const result = await bidCollection.find({ email: email }).toArray();
        res.send(result);
      })

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)
app.get('/', (req, res) => {
  res.send('Hello from SoloSphere Server....')
})

app.listen(port, () => console.log(`Server running on port ${port}`))
