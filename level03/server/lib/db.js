import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config()

const connectdb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL, {
            serverSelectionTimeoutMS: 5000, 
            socketTimeoutMS: 45000,
        })
        console.log("db connected successfully")
    } catch (error) {
        console.error("Database Connection Error:", error.message)
        process.exit(1) 
    }
}

export default connectdb