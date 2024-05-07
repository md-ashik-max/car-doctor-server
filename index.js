const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// https://car-doctor-12f67.web.app
// middleware

app.use(cors({
    origin: [
        // 'http://localhost:5173',
        'https://car-doctor-12f67.web.app',
        'https://car-doctor-12f67.firebaseapp.com'
    ],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xnvb7mx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// middleware

const logger = (req, res, next) => {
    console.log('log:info', req.method, req.url)
    next();
}

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.send({ message: 'unauthorized access' })
        }
        req.user = decoded;
        next()
    })
}

const cookieOption = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const serviceCollection = client.db('carDoctor').collection('services');
        const bookingCollection = client.db('carDoctor').collection('booking');

        // auth Api related

        app.post('/jwt', logger, async (req, res) => {
            const user = req.body;
            console.log('user for token', user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.cookie('token', token, cookieOption)
                .send({ success: true })
        })


        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log('login out user', user)
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        })


        // service related
        app.get('/services', async (req, res) => {
            const cursor = serviceCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            // const options = {
            //     projection: {title: 1, price: 1, service_id:1, img:1 },
            //   };
            const result = await serviceCollection.findOne(query);
            res.send(result)
        });

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const options = {
                projection: { title: 1, price: 1, service_id: 1, img: 1 },
            };
            const result = await serviceCollection.findOne(query, options);
            console.log(result)
            res.send(result)
        })

        // Checkout related
        app.get('/booking', async (req, res) => {
            const cursor = bookingCollection.find();
            const result = await cursor.toArray();
            console.log(result)
            res.send(result)
        })

        app.get('/booking/:email', logger, verifyToken, async (req, res) => {
            const email = req.params.email;
            console.log('token owner', req.user)
            if (req.user.email !== email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email };
            const cursor = bookingCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })


        app.post('/booking', async (req, res) => {
            const service = req.body;
            const result = await bookingCollection.insertOne(service);
            res.send(result)
        })

        app.patch('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateBooking = req.body;
            console.log(updateBooking)
            const updateDoc = {
                $set: {
                    status: updateBooking.status
                },
            };
            const result = await bookingCollection.updateOne(filter, updateDoc)
            res.send(result)

        })

        app.delete('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.deleteOne(query)
            res.send(result)
        })


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('doctor is running')
});

app.listen(port, () => {
    console.log(`car doctor is running port on ${port}`)
})