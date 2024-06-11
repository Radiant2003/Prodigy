import Replicate from "replicate";
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server";

import { increaseApiLimit, checkApiLimit } from "@/lib/api-limit";
import { checkSubscription } from "@/lib/subscription";

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN
});

export async function POST(
    req: Request
) {
    try {
        const { userId } = auth();
        const body = await req.json();
        const { messages }= body;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (!messages) {
            return new NextResponse("Messages are required", { status: 400 });
        }

        const freeTrial = await checkApiLimit();
        const isPro = await checkSubscription();

        if (!freeTrial && !isPro) {
            return new NextResponse("Free trial has expired", { status: 403 });
        }

        const input = {
            prompt: messages
        };
        
        const response = await replicate.run("tomasmcm/prometheus-13b-v1.0:be4dc158ce79a70ab5d447ca360b693439c44afc59a4d0bac56a4cc0a83b23ab", { input });

        if (!isPro) {
            await increaseApiLimit();
        }

        return NextResponse.json(response);
    } catch (error) {
        console.log("[CONVERSATION_ERROR]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}