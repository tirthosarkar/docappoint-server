const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

/* ================= MIDDLEWARE ================= */

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

/* ================= MONGODB ================= */

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

/* ================= LOGGER ================= */

const logger = (req, res, next) => {
  console.log(`${req.method} | ${req.url}`);
  next();
};

/* ================= AUTH MIDDLEWARE (FIXED) ================= */

const verifyToken = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).send({
        success: false,
        message: 'Unauthorized Access',
      });
    }

    const JWKS = createRemoteJWKSet(
      new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
    );

    const { payload } = await jwtVerify(token, JWKS);

    req.user = payload;

    next();
  } catch (error) {
    return res.status(401).send({
      success: false,
      message: 'Invalid Token',
    });
  }
};

/* ================= RUN ================= */

async function run() {
  try {
    const db = client.db('docappointdb');

    const appointmentCollection = db.collection('appointment');
    const bookingCollection = db.collection('bookings');
    const reviewCollection = db.collection('reviews');

    /* ================= GET ALL DOCTORS ================= */

    app.get('/appointment', async (req, res) => {
      const { search } = req.query;

      let query = {};

      if (search) {
        query = {
          name: { $regex: search, $options: 'i' },
        };
      }

      const result = await appointmentCollection.find(query).toArray();
      res.send(result);
    });

    /* ================= FEATURED ================= */

    app.get('/featured', async (req, res) => {
      const result = await appointmentCollection
        .find()
        .sort({ rating: -1 })
        .limit(3)
        .toArray();

      res.send(result);
    });

    /* ================= SINGLE DOCTOR (PROTECTED) ================= */

    app.get(
      '/appointment/:appointmentId',
      logger,
      verifyToken,
      async (req, res) => {
        try {
          const { appointmentId } = req.params;

          const result = await appointmentCollection.findOne({
            _id: new ObjectId(appointmentId),
          });

          if (!result) {
            return res.status(404).send({
              success: false,
              message: 'Doctor not found',
            });
          }

          res.send(result);
        } catch (error) {
          res.status(500).send({
            success: false,
            message: 'Failed to fetch doctor',
          });
        }
      },
    );

    /* ================= BOOK APPOINTMENT ================= */

    app.post('/bookings', verifyToken, async (req, res) => {
      const result = await bookingCollection.insertOne({
        ...req.body,
        createdAt: new Date(),
      });

      res.send(result);
    });

    /* ================= GET USER BOOKINGS ================= */

    app.get('/bookings/:email', verifyToken, async (req, res) => {
      const result = await bookingCollection
        .find({ userEmail: req.params.email })
        .toArray();

      res.send(result);
    });

    /* ================= UPDATE BOOKING ================= */

    app.patch('/bookings/:id', verifyToken, async (req, res) => {
      const result = await bookingCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        {
          $set: req.body,
        },
      );

      res.send(result);
    });

    /* ================= DELETE BOOKING ================= */

    app.delete('/bookings/:id', verifyToken, async (req, res) => {
      const result = await bookingCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });

      res.send(result);
    });

    /* ================= REVIEWS ================= */

    app.post('/reviews', verifyToken, async (req, res) => {
      const result = await reviewCollection.insertOne({
        ...req.body,
        createdAt: new Date(),
      });

      res.send(result);
    });

    app.get('/reviews/:doctorName', async (req, res) => {
      const result = await reviewCollection
        .find({ doctorName: req.params.doctorName })
        .toArray();

      res.send(result);
    });

    /* ================= ROOT ================= */

    app.get('/', (req, res) => {
      res.send('DocAppoint Server Running');
    });

    // await client.db("admin").command({ ping: 1 });

    console.log('MongoDB Connected Successfully');
  } catch (err) {
    console.log(err);
  }
}

run();

/* ================= SERVER ================= */

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
