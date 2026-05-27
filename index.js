const express = require('express');
const dotenv = require('dotenv');
const app = express();
const cors = require('cors');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
dotenv.config();

const port = process.env.PORT;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const logger = (req, res, next) => {
  console.log(req.params, 'from second');
  console.log(`${req.method} | ${req.url}`);
  next();
};

const verifyToken = async (req, res, next) => {
  const { authorization } = req.headers;
  // console.log(req.headers, 'from verify token');
  const token = authorization?.split(' ')[1];
  //console.log(token);

  if (!token) {
    return res.status(401).json({ message: 'Unauthorize' });
  }

  try {
    const JWKS = createRemoteJWKSet(
      new URL('http://localhost:3000/api/auth/jwks'),
    );
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;

    next();
  } catch (error) {
    console.error('Token validation failed:', error);
    return res.status(401).json({ message: 'Unauthorize' });
  }
};

async function run() {
  try {
    //await client.connect();

    const db = client.db('docappointdb');
    const appointmentCollection = db.collection('appointment');

    app.get('/appointment', async (req, res) => {
      const { search } = req.query;

      // let cursor;
      // if(search){
      //    cursor = appointmentCollection.find({name: search });

      // }else {
      //   cursor = appointmentCollection.find();
      // }

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

    app.get('/appointment/:appintId', logger, verifyToken, async (req, res) => {
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
