import Redis from "ioredis";
import dotenv from "dotenv";
import { Worker } from "bullmq";
import sendEmail from "./lib/sendEmail.js";

dotenv.config()

const redisUrl = process.env.REDIS_URL

const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null
})

const worker = new Worker("emailQueue", async (job) => {
    console.log("Job started")
    const email = job.data.email
    await sendEmail(email)
    console.log("Job completed")
}, { connection })