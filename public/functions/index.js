const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();
const db = admin.firestore();

// PASTE YOUR GOOGLE AI API KEY HERE
const GEMINI_API_KEY = "";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

exports.generateJourneySummary = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated.",
    );
  }

  const { studentName, anecdoteIds } = data;
  if (!studentName || !anecdoteIds || anecdoteIds.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a studentName and an array of anecdoteIds.",
    );
  }

  // Fetch the anecdote documents from Firestore
  const anecdotePromises = anecdoteIds.map((id) =>
    db.collection("anecdotes").doc(id).get()
  );
  const anecdoteDocs = await Promise.all(anecdotePromises);

  let anecdoteTextForPrompt = "";
  anecdoteDocs.forEach((doc) => {
    if (doc.exists) {
      const anecdote = doc.data();
      anecdoteTextForPrompt += `- Skill: ${anecdote.coreSkill} / ${anecdote.microSkill}: '${anecdote.text}'\n`;
    }
  });

  const prompt = `You are an experienced educator writing a summary for a student's learning report. The student's name is ${studentName}. Based on the following teacher-logged anecdotes, write a cohesive, positive, and constructive narrative paragraph. Synthesize these points into a story of the student's growth, strengths, and areas for continued focus. Do not just list the anecdotes. Anecdotes:\n${anecdoteTextForPrompt}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summaryText = response.text();
    return { summary: summaryText };
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to generate summary.",
    );
  }
});