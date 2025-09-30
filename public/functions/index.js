const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();
const db = admin.firestore();

// Make sure your Google AI API Key is pasted here
const GEMINI_API_KEY = "YOUR_API_KEY_HERE";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

/*
 * ===================================================================
 * LEARNING JOURNEY AI SUMMARY FUNCTION (Existing)
 * ===================================================================
 */
exports.generateJourneySummary = functions.https.onCall(async (data, context) => {
  // ... (your existing generateJourneySummary function code is here)
  if (!context.auth) { throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated."); }
  const { studentName, anecdoteIds } = data;
  if (!studentName || !anecdoteIds || anecdoteIds.length === 0) { throw new functions.https.HttpsError("invalid-argument", "The function must be called with a studentName and an array of anecdoteIds."); }
  const anecdotePromises = anecdoteIds.map((id) => db.collection("anecdotes").doc(id).get());
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
    throw new functions.https.HttpsError("internal", "Failed to generate summary.");
  }
});


/*
 * ===================================================================
 * NEW NOTIFICATION FUNCTIONS
 * ===================================================================
 */

// Function to send an email when a NEW ANECDOTE is created
exports.sendAnecdoteNotification = functions.firestore
  .document("anecdotes/{anecdoteId}")
  .onCreate(async (snap, context) => {
    const anecdote = snap.data();

    // 1. Get the student document to find parent emails
    const studentRef = db.collection("students").doc(anecdote.studentId);
    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) {
      console.log(`Student ${anecdote.studentId} not found.`);
      return null;
    }
    const student = studentSnap.data();

    // 2. Create a list of parent emails to notify
    const parentEmails = [];
    if (student.parent1Email) parentEmails.push(student.parent1Email);
    if (student.parent2Email) parentEmails.push(student.parent2Email);

    if (parentEmails.length === 0) {
      console.log(`No parent emails for student ${student.name}.`);
      return null;
    }

    // 3. For each parent, check their notification settings and send the email
    for (const email of parentEmails) {
      const usersRef = db.collection("users");
      const q = usersRef.where("email", "==", email);
      const userSnap = await q.get();

      if (!userSnap.empty) {
        const parentUser = userSnap.docs[0].data();
        // Check if the parent wants this type of email
        if (parentUser.notificationSettings?.newAnecdote === true) {
          // 4. Add a document to the 'mail' collection to trigger the email extension
          await db.collection("mail").add({
            to: email,
            message: {
              subject: `Infinity Education: New Anecdote for ${student.name}`,
              html: `
                <p>Hello,</p>
                <p>A new learning anecdote has just been logged for <strong>${student.name}</strong> in the area of "${anecdote.coreSkill} / ${anecdote.microSkill}".</p>
                <p>You can log in to your dashboard to view the details.</p>
                <p>Thank you,<br>The Infinity Education Team</p>
              `,
            },
          });
          console.log(`Anecdote notification email triggered for ${email}`);
        }
      }
    }
    return null;
  });


// Function to send an email when a NEW CHAT MESSAGE is created
exports.sendNewMessageNotification = functions.firestore
  .document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const message = snap.data();
    
    // Don't send a notification if the user sent a message to themselves
    if (message.senderId === message.recipientId) {
        return null;
    }

    // 1. Get the recipient's user document
    const recipientRef = db.collection("users").doc(message.recipientId);
    const recipientSnap = await recipientRef.get();

    if (!recipientSnap.exists) {
        console.log(`Recipient user ${message.recipientId} not found.`);
        return null;
    }

    const recipient = recipientSnap.data();

    // 2. Check if the recipient wants this type of email
    if (recipient.notificationSettings?.newMessage === true) {
        // 3. Add a document to the 'mail' collection
        await db.collection("mail").add({
            to: recipient.email,
            message: {
                subject: "Infinity Education: New Message!",
                html: `
                  <p>Hello ${recipient.displayName || ''},</p>
                  <p>You have received a new message.</p>
                  <p>Please log in to your Infinity Education dashboard to view and reply.</p>
                `,
            },
        });
        console.log(`New message notification email triggered for ${recipient.email}`);
    }
    return null;
  });