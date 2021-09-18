import express from 'express';
import bodyParser from 'body-parser';
import { MongoClient } from 'mongodb';
import path from 'path';

const app = express();

app.use(express.static(path.join(__dirname, '/build')));
app.use(bodyParser.json());

app.get('/hello', (req, res) => res.send('Hello!'));
app.get('/hello/:name', (req, res) => res.send(`Hello ${req.params.name}`));
app.post('/hello', (req, res) => res.send(`Hello ${req.body.name}!`));

const withDB = async (operations, res) => {
    try {
        const client = await MongoClient.connect("mongodb://localhost:27017", { useNewUrlParser: true });
        const db = client.db("my-blog");
        
        await operations(db);

        client.close();
    } catch (error) {
        res.status(500).json({ message:'Error connecting to db', error });
    }
};

app.get('/api/articles/:name', async (req, res) => {
    withDB( async (db) => {
        const name = req.params.name;
        const article = await db.collection("articles").findOne({ name });
        res.status(200).json(article);
    }, res);
});

app.post('/api/articles/:name/upvote', async (req, res) => {
    withDB( async (db) => {
        const name = req.params.name;
        const article = await db.collection("articles").findOne({ name });
        await db.collection("articles").updateOne({ name }, {
            '$set': {
                upvotes: article.upvotes + 1
            }
        });

        const updatedArticle = await db.collection("articles").findOne({ name });
        res.status(200).json(updatedArticle);
    }, res);
});

app.post('/api/articles/:name/add-comment', (req, res) => {
    const name = req.params.name;
    const { username, text } = req.body;
    withDB(async (db) => {
        const article = await db.collection("articles").findOne({ name });
        await db.collection("articles").updateOne({ name }, {
            "$set": {
                comments: article.comments.concat({ username, text })
            }
        });

        const updatedArticle = await db.collection("articles").findOne({ name });
        res.status(200).json(updatedArticle);
    }, res);
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '/build/index.html'));
});

app.listen(8000, () => console.log("Listening on port 8000"));