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

    app.get("/jobs/:jobId", async (req, res) => {
      const jobId = req.params.jobId;
      const result = await jobCollection.findOne({ _id: new ObjectId(jobId) });
      console.log(result);
      res.send(result);
    })

    // /// Update the post job from the database

    app.get("/update-jobs/:id", async (req, res) => {
      const id = req.params.id;
      const result = await jobCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    })

    // get the my bid data from the database ***************************

    app.get("/my-post", async (req, res) => {
      const email = req.query.email;
      const result = await jobCollection.find({ 'employeInfo.email': email }).toArray();
      res.send(result);
    })
    // delete the my post data from the database ***************************

    app.delete("/delete-post/:id", async (req, res) => {
      const id = req.params.id;
      const result = await jobCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    })
    // delete the my post data from the database ***************************

    app.put("/update-post/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatePost = req.body;
      const updatedDoc = {
        $set: {
         job_title: updatePost.job_title,
         deadline: updatePost.deadline,
         category: updatePost.category,
         minPrice: updatePost.minPrice,
         maxPrice: updatePost.maxPrice,
         job_description: updatePost.job_description,
        },
      }
      const result = await jobCollection.updateOne(filter, updatedDoc, options);
      res.send(result);
    })

    /// post the bid-job data from the database

    app.post("/bid-job", async (req, res) => {
      const bidJob = req.body;
      const result = await bidCollection.insertOne(bidJob);
      res.send(result);
    })

    // get the my bid data from the database ***************************

    app.get("/my-bids", async (req, res) => {
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
