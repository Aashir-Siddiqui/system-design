import express from "express"
import dotenv from "dotenv"
import { GoogleGenAI } from "@google/genai"
import { ChatGoogle } from "@langchain/google";
import { ChatGroq } from "@langchain/groq";
import { Annotation, MemorySaver, MessagesAnnotation, StateGraph } from "@langchain/langgraph"
import { ToolNode } from "@langchain/langgraph/prebuilt"
import { TavilySearch } from "@langchain/tavily";

dotenv.config()

const port = process.env.PORT

const app = express()

app.use(express.json())

// without langchain

// const ai = new GoogleGenAI({
//     apiKey: process.env.GEMINI_API_KEY
// });

// app.post("/ai", async (req, res) => {
//     const { input } = req.body
//     const response = await ai.models.generateContent({
//         model: "gemini-3.5-flash",
//         contents: [
//             {
//                 role: "system",
//                 parts: [{ text: "You are a assistance your name is NestoBot and build by nestologies. If you don't know the answer then don't give incorrect answer." }]
//             },
//             {
//                 role: "user",
//                 parts: [{ text: input }]
//             }
//         ],
//     })
//     return res.status(200).json({ "ai": response.text })
// })

// with langchain and langgraph

// const model = new ChatGoogle("gemini-3.5-flash")

// app.post("/ai", async (req, res) => {
//     const { input } = req.body
//     const response = model.invoke(input)
//     return res.status(200).json({ "ai": (await response).content })
// })

const tool = new TavilySearch({
    maxResults: 5,
    topic: "general",
})

const checkPointer = new MemorySaver()

const tools = [tool]
const toolNode = new ToolNode(tools)

const model = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0.1,
    maxTokens: 100,
    maxRetries: 2,
}).bindTools(tools)

const callModel = async (state) => {
    console.log("state", state)
    const response = await model.invoke([
        {
            role: "system",
            content: `You are a assistance your name is NestoBot and build by nestologies. If you don't know the answer then don't give incorrect answer.
            Use conversation memory first.
            Only use tools when the answer requires
            external real-time information like:
            weather, news, web search, stock prices etc.
            Do NOT call tools for simple conversation,
            memory-based questions, greetings,
            or personal context`
        },
        ...state.messages
    ])
    return { messages: [response] }
}

const shouldContinue = async (state) => {
    const lastMessage = state.messages[state.messages.length - 1]
    if (lastMessage.tool_calls?.length > 0) {
        return "tools"
    } else {
        return "__end__"
    }
}

const graph = new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addEdge("tools", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .compile({ checkpointer: checkPointer })

app.post("/ai", async (req, res) => {
    try {
        const { input } = req.body
        if (!input) return res.status(400).json({ error: "Input is required" })

        const response = await graph.invoke({
            messages: [
                {
                    role: "user",
                    content: input
                }
            ]
        },
            { configurable: { thread_id: "user123" } }
        )
        console.log(response.messages)
        return res.status(200).json({ "ai:": response.messages[response.messages.length - 1].content })
    } catch (error) {
        console.error("Error:", error)
        return res.status(500).json({ error: error.message })
    }
})

app.get("/", (req, res) => {
    return res.status(200).json({ "message": "Hello world" })
})

app.listen(port, () => {
    console.log("Server started")
})