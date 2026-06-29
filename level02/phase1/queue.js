import Redis from "ioredis";
import dotenv from "dotenv";
import { Queue } from "bullmq";

dotenv.config()

const redisUrl = process.env.REDIS_URL

const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null
})

const emailQueue = new Queue("emailQueue", { connection })

export default emailQueue