import axios from "axios";

class PrResponse {
    constructor() {
        this.baseURL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
        this.model = process.env.OLLAMA_MODEL_CODER || "deepseek-coder-v2:lite";
    }

    async analyzePRBehavior(prContext) {

        const prompt = `
You are a Senior Backend Engineer reviewing changes in a GitHub Pull Request.

Your task is to describe ONLY what has changed in system behavior
in clear, simple English that a non-developer can understand.

Focus on WHAT has changed, not HOW it was implemented.

ABSOLUTE RULES:
- Do NOT mention code, variables, patterns, conditions, or technical terms.
- Do NOT mention tests, test cases, or test methods.
- Do NOT explain implementation details.
- Do NOT use technical language.
- Describe behavior in plain English using proper reasoning.
- Each change must describe a single observable change in behavior.

Think in terms of:
- What inputs were accepted earlier but are now rejected
- What inputs were rejected earlier but are now accepted
- What outcomes have changed (for example: value cleared, value ignored, value accepted)

If a test file changed, infer ONLY the behavior that change reveals,
not anything about the test itself.

Do NOT summarize broadly.
Do NOT combine multiple changes into one sentence.

INPUT CONTEXT

<PULL_REQUEST_CONTEXT_JSON>
${JSON.stringify(prContext, null, 2)}
</PULL_REQUEST_CONTEXT_JSON>

OUTPUT FORMAT (STRICT – JSON ONLY)

{
  "codeChangeContextSummary": [
    {
      "file": "<file_name>",
      "changeType": "Added | Modified | Removed | No Behavioral Change",
      "changes": [
        "<simple English description of what changed>"
      ]
    }
  ]
}

RULES FOR OUTPUT:
- Use simple, non-technical English.
- Do NOT use words like regex, logic, validation, pattern, method, function.
- Each item in "changes" must describe one clear behavior change.
- If no behavior changed in a file, set:
  ["No behavioral change observed"]
`;

        let response;
        try {
            response = await axios.post(
                `${this.baseURL}/api/generate`,
                {
                    model: this.model,
                    prompt,
                    stream: false,
                    options: {
                        temperature: 0.2,
                        top_p: 0.9,
                        num_predict: 2048
                    }
                }
            );
        } catch (err) {
            console.error("OLLAMA: Request failed -", err.message);
            throw new Error("Failed to call Ollama model");
        }

        const rawText = response?.data?.response;
        if (!rawText) {
            throw new Error("Ollama returned an empty response");
        }

        try {
            const parsed = JSON.parse(rawText);
            return parsed;
        } catch (err) {
            console.error("OLLAMA: JSON parsing failed. Response:", rawText.substring(0, 500));
            throw new Error("Model did not return valid JSON");
        }
    }
}

export default new PrResponse();
