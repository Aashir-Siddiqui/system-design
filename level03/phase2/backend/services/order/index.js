import express from "express"
import dotenv from "dotenv"

dotenv.config()

const port = process.env.PORT

const app = express()

app.get("/", (req, res) => {
    return res.status(200).json({ "message": "Hello world from order service." })
})

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
})