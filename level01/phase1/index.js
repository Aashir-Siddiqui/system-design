import express from "express"
import dotenv from "dotenv"

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

app.get("/", (req, res) => {
    return res.status(200).json({"message":"Backend running"})
})

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
})