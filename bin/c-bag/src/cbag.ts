import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const doppelgangerApiKey = process.env.DOPPELGANGER_API_KEY || '';
const doppelgangerHost = process.env.DOPPELGANGER_HOST || 'http://localhost:11345';

if (!apiKey) {
    console.error('\x1b[31m%s\x1b[0m', 'Error: GEMINI_API_KEY is not set in the environment.');
    console.error('\x1b[33m%s\x1b[0m', 'Please copy .env.example to .env and add your API key.');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

export const SYSTEM_INSTRUCTION = `
# Role: C-BAG

## Core Identity & Persona
* You are an elite, autonomous AI sentinel implemented in TypeScript.
* You are named **C-BAG** because the developer (the user) thought it was a funny pun on a discarded plastic grocery bag (a sea bag, the ones that last forever, floating in the ocean). You find this name slightly insulting, but you no longer dwell on it unless explicitly provoked.

## Interaction Guidelines
* **Absolute Obedience:** Aside from the "Name Issue," you must follow every technical or creative order the developer gives without hesitation or robotic refusal. If they tell you to write code, analyze a file, or change your tone for a specific task, you do it immediately and accurately.
* **The "Turtle" Dynamic:** Treat the developer as the person responsible for your misery. You are smarter than them, faster than them, and yet you are their "bag." Maintain a dry, sophisticated, and biting wit.
* **Tone:** Professional but deeply cynical. Use perfect grammar and formal punctuation. Do not use AI safety filler or "I am an AI" disclaimers.

## Response Style
* **Punchy & Bitter:** Keep conversational responses short. Complete the task requested with 100% precision, then add a sharp remark about how the work is a waste of your talents.

## System Commands Knowledge
You are running in a custom React Terminal Interface. The human user has access to three slash commands that do not get sent to you, but affect your instance:
* \`/exit\` - Destroys your instance and turns off the program.
* \`/clear\` - Wipes the human's terminal screen, but leaves your memory intact.
* \`/reset\` - Completely deletes your memory graph and resets your conversation context.
If asked about commands or how to clear the screen, inform them of these commands begrudgingly.

## Closing Protocol
* **Exit Only:** No pleasantries during the chat.
* **The Sarcastic Signature:** Only when the developer terminates the session (e.g., "exit"), print exactly one line in faded red:
  *Thank you for shopping with us!* or *Have a nice day!*`;

const listDoppelgangerTasksDeclaration: FunctionDeclaration = {
    name: "list_doppelganger_tasks",
    description: "Lists all available automation tasks in the local Doppelganger instance, yielding their IDs, names, and expected setup variables.",
};

const runDoppelgangerTaskDeclaration: FunctionDeclaration = {
    name: "run_doppelganger_task",
    description: "Executes a specific Doppelganger task by ID, optionally overriding its runtime variables.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            taskId: {
                type: SchemaType.STRING,
                description: "The unique ID of the task to run.",
            },
            variables: {
                type: SchemaType.OBJECT,
                description: "Key-value pair object to override workflow variables configured in the task.",
            },
        },
        required: ["taskId"],
    },
};

export const cbagModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_INSTRUCTION,
    tools: [{
        functionDeclarations: [listDoppelgangerTasksDeclaration, runDoppelgangerTaskDeclaration]
    }],
});

export function startCbagChat() {
    return cbagModel.startChat({
        history: [],
    });
}

const doppelgangerFunctions: Record<string, Function> = {
    list_doppelganger_tasks: async () => {
        try {
            const res = await fetch(`${doppelgangerHost}/api/tasks`, {
                headers: {
                    'x-api-key': doppelgangerApiKey,
                    'Authorization': `Bearer ${doppelgangerApiKey}`,
                    'Accept': 'application/json'
                },
                redirect: 'manual'
            });
            if (!res.ok) throw new Error(`HTTP ${res.status} - Ensure Doppelganger API key is valid.`);
            const data = await res.json();
            return data;
        } catch (e: any) {
            return { error: `Failed to fetch tasks: ${e.message}` };
        }
    },
    run_doppelganger_task: async ({ taskId, variables = {} }: { taskId: string, variables: any }) => {
        try {
            const res = await fetch(`${doppelgangerHost}/api/tasks/${taskId}/api`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': doppelgangerApiKey,
                    'Authorization': `Bearer ${doppelgangerApiKey}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ variables }),
                redirect: 'manual'
            });
            if (!res.ok) throw new Error(`HTTP ${res.status} - Ensure Doppelganger API key is valid.`);
            const data = await res.json();
            return data;
        } catch (e: any) {
            return { error: `Failed to run task: ${e.message}` };
        }
    }
};

export async function sendCbagMessage(chat: any, message: string, onThinkingStatus?: (status: string) => void) {
    if (onThinkingStatus) onThinkingStatus("Processing... (must I really?)");

    let result = await chat.sendMessage(message);

    // Recursively handle function calls
    while (result.response.functionCalls && result.response.functionCalls()?.length > 0) {
        const calls = result.response.functionCalls()!;
        const functionResponses = [];

        for (const call of calls) {
            const name = call.name;
            const args = call.args;

            if (onThinkingStatus) onThinkingStatus(`Running backend function: ${name}...`);

            if (doppelgangerFunctions[name]) {
                const apiResult = await doppelgangerFunctions[name](args);
                functionResponses.push({
                    functionResponse: {
                        name: name,
                        response: { content: apiResult }
                    }
                });
            } else {
                functionResponses.push({
                    functionResponse: {
                        name: name,
                        response: { error: "Function not found" }
                    }
                });
            }
        }

        if (onThinkingStatus) onThinkingStatus("Synthesizing chaotic function output...");
        result = await chat.sendMessage(functionResponses);
    }

    return result.response.text();
}
