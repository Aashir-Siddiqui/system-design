import express from "express"
import dotenv from "dotenv"
import connectdb from "./lib/db.js"
import User from "./models/user.model.js"
import Redis from "ioredis"
import rateLimitter from "./middleware/ratelimitter.js"
import emailQueue from "./queue.js"

dotenv.config()

const port = process.env.PORT || 5000

const app = express()

export const redis = new Redis(process.env.REDIS_URL)

app.use(express.json())

app.get("/", (req, res) => {
    return res.status(200).json({ "message": `Hello from ${process.env.SERVER_NAME}`  })
})

app.post("/create", async (req, res) => {
    try {
        const { name, email, password } = req.body
        await redis.del("user:all")
        const user = await User.create({
            name,
            email,
            password
        })
        await emailQueue.add("send-email", {email})
        return res.status(201).json({ success: true, data: user })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ success: false, error: error.message })
    }
})

app.get("/users", rateLimitter, async (req, res) => {
    const user = await User.find({})
    return res.status(200).json({ success: true, data: user })
})

app.get("/get-redis-users", async (req, res) => {
    const cached = await redis.get("user:all")
    if (cached) {
        const user = JSON.parse(cached)
        return res.status(200).json({ success: true, data: user })
    }
    const user = await User.find({})
    await redis.set("user:all", JSON.stringify(user))
    return res.status(200).json({ success: true, data: user })
})

app.post("/send-otp", async (req, res) => {
    const { email } = req.body
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    await redis.set(`otp:${email}`, otp, "EX", 30)
    return res.json({ otp })
})

app.post("/verify-otp", async (req, res) => {
    try {
        const { email, otp } = req.body
        const cachedOtp = await redis.get(`otp:${email}`)
        if (!cachedOtp) {
            return res.status(400).json({ "message": "OTP not found or has expired" })
        }
        if (cachedOtp !== otp.toString()) {
            return res.status(400).json({ "message": "Incorrect OTP" })
        }
        await redis.del(`otp:${email}`)
        return res.status(200).json({ "message": "OTP verified successfully!" })
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message })
    }
})

app.listen(port, () => {
    connectdb()
    console.log(`Server is running on http://localhost:${port}`);
})