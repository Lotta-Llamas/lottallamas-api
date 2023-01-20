import express from 'express';
import cors from 'cors';
const app = express()

import auth from './routes/auth.js';
import wallets from './routes/auth/wallets.js'
import content from './routes/auth/content.js'
import posts from './routes/auth/posts.js'
import comments from './routes/auth/comments.js'

const port = 3100

app.use(cors({
    origin: '*'
}));

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.use('/api', auth);
app.use('/api/wallets', wallets);
app.use('/api/content', content);
app.use('/api/posts', posts);
app.use('/api/comments', comments);

if (process.env.NODE_ENV !== 'test') {
	app.listen(port, () => {
		console.log(`Example app listening on port ${port}`)
	})
}

export default app;