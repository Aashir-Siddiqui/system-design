import express from "express"
import dotenv from "dotenv"
import { GoogleGenAI } from "@google/genai"
import { ChatGoogle } from "@langchain/google";
import { ChatGroq } from "@langchain/groq";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { PDFParse } from "pdf-parse"
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { QdrantVectorStore } from "@langchain/qdrant"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import fs from "fs"

dotenv.config()

const port = process.env.PORT

const app = express()

app.use(express.json())

const model = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0.1,
    maxTokens: 100,
    maxRetries: 2,
})

const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
    taskType: TaskType.RETRIEVAL_DOCUMENT,
    title: "Document title"
})

const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
    url: process.env.QDRANT_URL,
    collectionName: "grocery-store"
})

const upload = async () => {
    const path = './knowledge.pdf'
    const buffer = fs.readFileSync(path)
    const pdfResult = new PDFParse({ data: buffer })
    const result = await pdfResult.getText()
    const text = result.text
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 200
    })
    const docs = await splitter.createDocuments([text])
    await vectorStore.addDocuments(docs)
}

app.post("/ai", async (req, res) => {
    const {input} = req.body
    const docs = await vectorStore.similaritySearch(input, 5)
    const context = docs.map((d) => d.pageContent).join("/n")
    const response = await model.invoke([
        new SystemMessage(`
        You are a RAG AI assistant.
        STRICT RULES:
        - Answer ONLY from context
        - Do not use outside knowledge
        - If answer not found say:
        "I don't know from uploaded PDF."
        Context:
        ${context}`),
        new HumanMessage(input)
    ])
    console.log(response)
    return res.status(200).json({ai:response.content})
})

app.get("/", (req, res) => {
    return res.status(200).json({ "message": "Hello world" })
})

app.listen(port, () => {
    console.log("Server started")
})