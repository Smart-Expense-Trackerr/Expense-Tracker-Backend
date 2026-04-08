import express from 'express';
import {router}  from './routes/user.js'
import connectDB from './db/mongoose.js';
import dotenv from 'dotenv';

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use(router);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});