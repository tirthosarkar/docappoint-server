const express = require('express');
const dotenv = require('dotenv');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
dotenv.config();

const port = process.env.PORT;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URL;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();

    const db = client.db('docappointdb');
    const appointmentCollection = db.collection('appointment');

    app.get('/appointment', async (req, res) => {
      const cursor = appointmentCollection.find();
      const result = await cursor.toArray();
      //console.log(result);
      res.send(result);
    });

 app.get('/featured', async (req, res) => {
   const cursor = appointmentCollection.find().limit(3);
   const result = await cursor.toArray();
   res.send(result);
 }); 

    app.get('/appointment/:appintId', async (req, res) => {
      const { appintId } = req.params;
      const query = { _id: new ObjectId(appintId) };
      const result = await appointmentCollection.findOne(query);
      res.send(result);
    });

    await client.db('admin').command({ ping: 1 });

    console.log('Connected to MongoDB');
  } catch (error) {
    console.log(error);
  }
}

run();

app.get('/', (req, res) => {
  res.send('docappoint server is serving');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
