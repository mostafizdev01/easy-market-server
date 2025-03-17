const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config()
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser');

const port = process.env.PORT || 9000
const app = express()
app.use(cookieParser());

const serverPermissionsData = {
  origin: ['http://localhost:5173'],
  credentials: true,
  optionalSuccessStatus: 200
}

app.use(cors(serverPermissionsData))
app.use(express.json())
app.use(cookieParser())  // cookie theke token er value ta niye ashbe 

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eywn0.mongodb.net/?retryWrites=true&w=majority&appName=Main`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

//// verify the token 

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if(!token) return res.status(401).send({ message: 'unauthorized access' });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).send({ message: 'invalid token' });
    req.user = decoded;  /// user name ekta property creata kora holo and tar value hishabe devoded set kora holo ----------->> decoded er mordhe user er email and other information gula ase
  });
  next()
}

async function run() {
  try {

    /// create the database collection ---------

    const db = client.db("solo-db");
    const jobCollection = db.collection("jobs");
    const bidCollection = db.collection("bids");

    // generate jwt token 
    app.post('/jwt', async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.JWT_SECRET, { expiresIn: '180d' });
      res.cookie("token", token, { // jwt token save the browser cookies
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      }).send({success: true})
    })

    // logOut || clearCookies form the browser 

    app.get('/logout', async(req, res) => {
      res.clearCookie("token", {
        maxAge: 0,  /// maxage na dile browser theke cookie clear korbe na.
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? 'none' : 'strict',
      }).send({ success: true })
    })

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
      // console.log(result);
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
      console.log(bidJob);

      /// if a user placed a bid already in this job 
      const query = { email: bidJob.email, jobId: bidJob.jobId }
      const bidExists = await bidCollection.findOne(query);
      console.log(bidExists, "tumi age ekbar bid korso ek kaj koibar korte chau tumi");

      if (bidExists) {
        return res.status(401).send({ message: 'A bid already exists for this job and user' });
      }

      const result = await bidCollection.insertOne(bidJob);
      res.send(result);

      /// update the bid-job count data from the database

      const bidCountFilter = { _id: new ObjectId(bidJob.jobId) };
      const bidCountUpdate = { $inc: { bids: 1 } };
      await jobCollection.updateOne(bidCountFilter, bidCountUpdate);

    })

    // get the my bid data from the database ***************************

    app.get("/my-bids/:email", verifyToken, async (req, res) => {
      const tokenEmail = req.user?.email
      const email = req.params.email;  // ja must lage and must pathabe and must pathabe tai holo params;
      const buyer = req.query.buyer;  // ja optional pathaite o pare na o pathaite o pare tai bolo query;
      console.log("my params email: " + email);
      console.log("my token email: " + tokenEmail);
      if(tokenEmail !== email){
        return res.status(401).send({ message: 'Unauthorized access' });  
      }
      
      const query = {};  /// ekhane query name ekta empty object rakha hoise. jar mordhe amra conditionality data rakhbo.
      if(buyer){ // buyer jodi thake tar mane query te click korbe. and database er mordhe buyer name property er mordhe query theke j email astese seita rekhe dibe then bidCollection data er mordhe query te j email ase sei email er sata match kore data send korbe.
        query.buyer = email  // ekhane buyer holo property and email holo tar value;
      }else{
        query.email = email   // ekhane email holo property and email holo tar value;
      }  /// ami ekhar buyer property er mordhe email value deye khuje j gula pabo sei gula nibo. and abar email property er mordhe email wala value j gual pabo sei gula nibo.
      const result = await bidCollection.find(query).toArray();
      res.send(result);
    })

    // update the bid status from the database ----------

    app.patch('/bid-status-update/:id', async (req, res)=>{
      const id = req.params.id;
      const {status} = req.body;
      const filter = { _id: new ObjectId(id)}
      const updateStatus = { 
        $set: { status },
      }
      const result = await bidCollection.updateOne(filter, updateStatus);
      res.send(result);
    })

    /// get the all job from the database 

    app.get("/all-jobs", async (req, res)=>{
      const filter = req.query.filter;
      const search = req.query.search;
      const sort = req.query.sort;
      let options = {}
      if(sort) options = { sort: { deadline: sort === 'asc' ? 1 : -1 }}
      let query = {}
        query.job_title = {  /// search korle job title er match kore data debe and fontend e show korbe.
          $regex: search,  // reagex keyword er mardhome database theke search kore data niye ashbe.
          $options: 'i',  /// case sensetive --------->> search er jaigai boro hat er or soto har er dile o lekha match korlei ta debe.
        }
      if(filter){
        query.category = filter  // category property er mordhe filter name data show korabe.
      }
      const allJobs = await jobCollection.find(query, options).toArray();
      res.send(allJobs);
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
