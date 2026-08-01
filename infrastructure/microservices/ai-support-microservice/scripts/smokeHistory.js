const baseUrl = process.env.AI_TEST_URL || "http://localhost:5017/api/v1";
const userId = `smoke-${Date.now()}`;

async function main() {
  const response = await fetch(`${baseUrl}/ai/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, question: "Kako da postavim novi oglas?" }),
  });
  if (!response.ok) throw new Error(`Stream returned ${response.status}: ${await response.text()}`);
  const streamText = await response.text();
  const doneLine = streamText.split("\n").find((line, index, lines) => lines[index - 1] === "event: done" && line.startsWith("data:"));
  if (!doneLine) throw new Error("Stream did not return a done event.");
  const done = JSON.parse(doneLine.slice(5));
  const conversations = await fetch(`${baseUrl}/ai/users/${userId}/conversations`).then((item) => item.json());
  const messages = await fetch(`${baseUrl}/ai/conversations/${done.conversationId}/messages?userId=${userId}`).then((item) => item.json());
  if (conversations.length !== 1 || messages.length !== 2) throw new Error("Conversation history was not persisted.");
  const feedback = await fetch(`${baseUrl}/ai/messages/${done.assistantMessageId}/feedback`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, helpful: true }),
  });
  if (!feedback.ok) throw new Error(`Feedback returned ${feedback.status}.`);
  const updated = await fetch(`${baseUrl}/ai/conversations/${done.conversationId}/messages?userId=${userId}`).then((item) => item.json());
  if (updated[1].helpful !== true) throw new Error("Feedback was not persisted.");
  console.log(`OK: ${conversations.length} conversation, ${messages.length} messages, feedback saved.`);
}

main().catch((error) => { console.error(error.message); process.exit(1); });
