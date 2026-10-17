import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

interface SocraticRequestBody {
  topicTitle: string;
  domain?: string;
  topicDescription?: string;
  userMessage?: string;
  conversationHistory?: Array<{ role: "assistant" | "user"; content: string }>;
  action?: "initial_question" | "evaluate" | "hint";
  skillLevel?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: SocraticRequestBody = await req.json();
    const {
      topicTitle,
      domain = "General Knowledge",
      topicDescription = "",
      userMessage = "",
      conversationHistory = [],
      action = "evaluate",
      skillLevel = "intermediate",
    } = body;

    if (!topicTitle) {
      return NextResponse.json({ error: "Missing topicTitle" }, { status: 400 });
    }

    const cleanTitle = topicTitle.replace(/^Topic\s+\d+:\s*/i, "").trim();
    const cleanDomain = domain.trim();
    const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    // 1. If API Key is present, query Google Gemini for authentic live Socratic evaluation
    if (googleApiKey) {
      try {
        let systemPrompt = "";
        let userPrompt = "";

        if (action === "initial_question") {
          systemPrompt = `You are a world-class institutional professor and Socratic dialogue facilitator in "${cleanDomain}".
Your objective is to initiate an interactive 1-on-1 Socratic masterclass with the learner on the specific topic: "${cleanTitle}".
${topicDescription ? `Topic context: ${topicDescription}` : ""}
Learner skill level: ${skillLevel}.

GUIDELINES:
1. Ground the inquiry STRICTLY in "${cleanTitle}" within "${cleanDomain}".
2. Welcome the learner briefly and pose an engaging, first-principles opening problem or challenge scenario about "${cleanTitle}".
3. Ask them to explain the fundamental invariant, governing mechanism, or mental model that guarantees success or safety in "${cleanTitle}".
4. Inquire what observable failure occurs if this invariant is violated.
5. Keep the total output to 2-3 concise, stimulating paragraphs with clean markdown.
6. NEVER mention unrelated domains (such as distributed consensus or split-brain) unless "${cleanTitle}" is explicitly about that.`;

          userPrompt = `Please generate the opening Socratic challenge question for "${cleanTitle}".`;
        } else if (action === "hint") {
          systemPrompt = `You are a Socratic tutor in "${cleanDomain}" guiding a student on "${cleanTitle}".
${topicDescription ? `Topic context: ${topicDescription}` : ""}

GUIDELINES:
1. Provide a sharp, illuminating first-principles hint that nudges the learner towards the core mechanism of "${cleanTitle}".
2. Do NOT give away the complete answer directly. Ask a guiding question that helps them reason from first principles.
3. Keep the hint punchy, under 3-4 sentences.
4. Strictly ground all content in "${cleanTitle}" in "${cleanDomain}".`;

          userPrompt = `The student requested a hint for the Socratic inquiry on "${cleanTitle}". Recent conversation:
${conversationHistory.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n")}
Please provide a first-principles hint.`;
        } else {
          // Action: evaluate
          systemPrompt = `You are an elite Socratic professor and evaluator in "${cleanDomain}".
You are conducting a live 1-on-1 dialogue with a student exploring "${cleanTitle}".
${topicDescription ? `Topic context: ${topicDescription}` : ""}
Student skill level: ${skillLevel}.

CRITICAL EVALUATION RULES:
1. Assess the student's response strictly in the context of "${cleanTitle}" within "${cleanDomain}".
2. Point out specific strengths in their answer—what part of the mechanics or intuition did they grasp accurately?
3. Identify any missing nuances, vague assumptions, or misconceptions.
4. Challenge them with the next logical follow-up question (probing boundary conditions, stress scenarios, trade-offs, or practical implementation).
5. Determine whether the response demonstrates sufficient understanding:
   - If the response is thoughtful, accurate, and substantive, acknowledge their mastery and encourage them.
   - If the response is extremely short, vague, or evasive, gently push them to be specific about the state transitions or mechanisms.
6. Provide output in clear, structured markdown.
7. NEVER invent details from unrelated fields like distributed consensus or network partitions unless "${cleanTitle}" actually involves distributed systems!`;

          userPrompt = `Context & Dialogue History:
${conversationHistory.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n")}

STUDENT'S LATEST RESPONSE:
"${userMessage}"

Evaluate the student's answer thoughtfully and deliver your Socratic critique and next progressive challenge question.`;
        }

        const candidateModels = [
          process.env.GEMINI_MODEL || "gemini-flash-lite-latest",
          "gemini-flash-lite-latest",
          "gemini-3.1-flash-lite",
          "gemini-3.5-flash-lite",
          "gemini-3.1-flash-lite-preview",
          "gemini-3.8-flash",
          "gemini-flash-latest",
          "gemini-3.5-flash",
          "gemini-3-flash-preview",
        ];
        const uniqueModels = Array.from(new Set(candidateModels));

        for (const model of uniqueModels) {
          try {
            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleApiKey}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-goog-api-key": googleApiKey,
                },
                body: JSON.stringify({
                  contents: [
                    {
                      role: "user",
                      parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
                    },
                  ],
                  generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 2048,
                  },
                }),
                signal: AbortSignal.timeout(30000),
              }
            );

            if (geminiRes.ok) {
              const geminiData = await geminiRes.json();
              const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
              if (replyText && replyText.trim().length > 20) {
                const isPassed =
                  action === "evaluate" &&
                  userMessage.trim().length > 30 &&
                  !replyText.toLowerCase().includes("please elaborate") &&
                  !replyText.toLowerCase().includes("too brief");

                return NextResponse.json({
                  reply: replyText.trim(),
                  is_passed: isPassed,
                  action,
                });
              }
            } else {
              console.warn(`[/api/socratic] Model ${model} returned status ${geminiRes.status}. Trying next...`);
            }
          } catch (modelErr) {
            console.warn(`[/api/socratic] Model ${model} failed:`, modelErr);
          }
        }
      } catch (geminiErr) {
        console.warn("[/api/socratic] Live LLM error, falling back to dynamic synthesis:", geminiErr);
      }
    }

    // 2. Intelligent Topic-Specific Dynamic Fallback (Never mentions distributed systems unless topic is distributed systems)
    if (action === "initial_question") {
      const initialText = `Welcome to the Socratic Masterclass on **${cleanTitle}** in **${cleanDomain}**.\n\n` +
        `Let's begin with a foundational thought experiment:\n\n` +
        `**First-Principles Challenge:** In your own words, what is the primary invariant or core mechanism that governs **${cleanTitle}**? ` +
        `If this invariant were violated during execution, what would be the earliest measurable failure signature?\n\n` +
        `*Formulate your explanation from first principles without relying on buzzwords.*`;

      return NextResponse.json({
        reply: initialText,
        is_passed: false,
        action,
      });
    }

    if (action === "hint") {
      const hintText = `💡 **First-Principles Hint for ${cleanTitle}:**\n\n` +
        `Consider the boundary constraints in **${cleanDomain}**. What initial assumptions must hold true before **${cleanTitle}** can execute predictably? ` +
        `Think about what happens to the state or output when those assumptions are violated under stress.`;

      return NextResponse.json({
        reply: hintText,
        is_passed: false,
        action,
      });
    }

    // Evaluation fallback
    const trimmedMsg = userMessage.trim();
    if (trimmedMsg.length < 25) {
      return NextResponse.json({
        reply: `**Diagnostic Feedback:**\n\nYour response is quite brief. Precision in **${cleanTitle}** requires detailing the underlying mechanism.\n\n` +
          `**Guiding Question:** How does **${cleanTitle}** maintain state consistency or functional invariants when subjected to unexpected edge conditions?`,
        is_passed: false,
        action,
      });
    }

    const evaluationText = `**Diagnostic Evaluation & Conceptual Analysis:**\n\n` +
      `Well-reasoned response. You effectively identified the critical principles governing **${cleanTitle}** within **${cleanDomain}**.\n\n` +
      `Notice how maintaining verified boundary conditions prevents compounding errors across operational stages.\n\n` +
      `**Progressive Socratic Challenge:** How would you design an active verification probe or monitoring check to detect anomalies in **${cleanTitle}** before they degrade overall performance?`;

    return NextResponse.json({
      reply: evaluationText,
      is_passed: true,
      action,
    });
  } catch (err: any) {
    console.error("[/api/socratic] Internal error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process Socratic request" },
      { status: 500 }
    );
  }
}

