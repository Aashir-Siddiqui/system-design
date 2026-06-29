import express from "express"
import dotenv from "dotenv"
import proxy from "express-http-proxy"

dotenv.config()

const port = process.env.PORT
const authUrl = process.env.AUTH_URL
const orderUrl = process.env.ORDER_URL
const productUrl = process.env.PRODUCT_URL

const app = express()

app.get("/", (req, res) => {
    return res.status(200).json({ "message": `Hello world from backend or gateway ${process.env.SERVER_NAME}` })
})

app.use("/auth", proxy(authUrl))
app.use("/order", proxy(orderUrl))
app.use("/product", proxy(productUrl))

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
})