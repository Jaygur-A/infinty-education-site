const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const stripe = require("stripe")("sk_test_YOUR_STRIPE_SECRET_KEY"); // ⚠️ ADD YOUR STRIPE SECRET KEY

admin.initializeApp();
const db = admin.firestore();

// ⚠️ MAKE SURE YOUR GEMINI API KEY IS PASTED HERE
const GEMINI_API_KEY = "YOUR_API_KEY_HERE";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });


/*
 * ===================================================================
 * STRIPE & SUBSCRIPTION FUNCTIONS (NEW)
 * ===================================================================
 */
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to subscribe."
    );
  }

  const { priceId } = data;
  const userId = context.auth.uid;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // This is CRITICAL for linking the purchase back to the user
      client_reference_id: userId,
      // Use your actual deployed URL
      success_url: `https://infinity-education-c170b.web.app?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://infinity-education-c170b.web.app`,
    });

    return { id: session.id };
  } catch (error) {
    console.error("Stripe Checkout Error:", error);
    throw new functions.https.HttpsError("internal", "Unable to create checkout session.");
  }
});


/*
 * ===================================================================
 * AUTHENTICATION & CUSTOM CLAIMS FUNCTION (NEW)
 * ===================================================================
 */
exports.setUserClaims = functions.firestore
  .document("users/{userId}")
  .onWrite(async (change, context) => {
    const userData = change.after.data();
    const userId = context.params.userId;

    try {
      // Set the custom claims
      await admin.auth().setCustomUserClaims(userId, {
        role: userData.role || "guest",
        schoolId: userData.schoolId || null,
      });
      console.log(`Claims set for ${userId}: role=${userData.role}, schoolId=${userData.schoolId}`);
    } catch (error) {
      console.error("Error setting custom claims:", error);
    }
});


/*
 * ===================================================================
 * LEARNING JOURNEY AI SUMMARY FUNCTION (Existing)
 * ===================================================================
 */
exports.generateJourneySummary = functions.https.onCall(async (data, context) => {
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
 * NOTIFICATION FUNCTIONS (Existing)
 * ===================================================================
 */
exports.sendAnecdoteNotification = functions.firestore
  .document("anecdotes/{anecdoteId}")
  .onCreate(async (snap, context) => {
    const anecdote = snap.data();
    const studentRef = db.collection("students").doc(anecdote.studentId);
    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) {
      console.log(`Student ${anecdote.studentId} not found.`);
      return null;
    }
    const student = studentSnap.data();
    const parentEmails = [];
    if (student.parent1Email) parentEmails.push(student.parent1Email);
    if (student.parent2Email) parentEmails.push(student.parent2Email);
    if (parentEmails.length === 0) {
      console.log(`No parent emails for student ${student.name}.`);
      return null;
    }
    for (const email of parentEmails) {
      const usersRef = db.collection("users");
      const q = usersRef.where("email", "==", email);
      const userSnap = await q.get();
      if (!userSnap.empty) {
        const parentUser = userSnap.docs[0].data();
        if (parentUser.notificationSettings?.newAnecdote === true) {
          await db.collection("mail").add({
            to: email,
            message: {
              subject: `Infinity Education: New Anecdote for ${student.name}`,
              html: `<p>Hello,</p><p>A new learning anecdote has just been logged for <strong>${student.name}</strong> in the area of "${anecdote.coreSkill} / ${anecdote.microSkill}".</p><p>You can log in to your dashboard to view the details.</p><p>Thank you,<br>The Infinity Education Team</p>`,
            },
          });
          console.log(`Anecdote notification email triggered for ${email}`);
        }
      }
    }
    return null;
  });

exports.sendNewMessageNotification = functions.firestore
  .document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const message = snap.data();
    if (message.senderId === message.recipientId) {
        return null;
    }
    const recipientRef = db.collection("users").doc(message.recipientId);
    const recipientSnap = await recipientRef.get();
    if (!recipientSnap.exists) {
        console.log(`Recipient user ${message.recipientId} not found.`);
        return null;
    }
    const recipient = recipientSnap.data();
    if (recipient.notificationSettings?.newMessage === true) {
        await db.collection("mail").add({
            to: recipient.email,
            message: {
                subject: "Infinity Education: New Message!",
                html: `<p>Hello ${recipient.displayName || ''},</p><p>You have received a new message.</p><p>Please log in to your Infinity Education dashboard to view and reply.</p>`,
            },
        });
        console.log(`New message notification email triggered for ${recipient.email}`);
    }
    return null;
  });
  
// This function runs when a Stripe checkout session is completed.
exports.fulfillSubscription = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = ''; // ⚠️ Your Stripe Webhook secret
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed.', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.client_reference_id; // The Firebase UID we passed earlier

        if (!userId) {
            return res.status(400).send('No userId found in session.');
        }

        try {
            // 1. Create the new school document
            const schoolRef = await db.collection('schools').add({
                ownerUid: userId,
                name: "New School", // You can let them name this later
                subscriptionStatus: 'active',
                stripeCustomerId: session.customer,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            const newSchoolId = schoolRef.id;

            // 2. Update the user's role and schoolId
            const userRef = db.collection('users').doc(userId);
            await userRef.update({
                role: 'schoolAdmin',
                schoolId: newSchoolId
            });

            // 3. Clone the master templates (rubrics and continuums)
            const templates = {
                rubrics: await db.collection('rubrics').where('schoolId', '==', null).get(),
                continuums: await db.collection('continuums').where('schoolId', '==', null).get()
            };

            const batch = db.batch();

            templates.rubrics.forEach(doc => {
                const templateData = doc.data();
                const newDocRef = db.collection('rubrics').doc();
                batch.set(newDocRef, { ...templateData, schoolId: newSchoolId });
            });

            templates.continuums.forEach(doc => {
                const templateData = doc.data();
                const newDocRef = db.collection('continuums').doc();
                batch.set(newDocRef, { ...templateData, schoolId: newSchoolId });
            });

            await batch.commit();
            console.log(`Successfully provisioned new school ${newSchoolId} for user ${userId}`);

        } catch (error) {
            console.error('Error provisioning new school:', error);
            return res.status(500).send('Internal Server Error');
        }
    }

    res.status(200).send();
});