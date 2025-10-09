require('dotenv').config();
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const { OpenAI } = require("openai");

admin.initializeApp();
const db = admin.firestore();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

/*
 * ===================================================================
 * STRIPE & SUBSCRIPTION FUNCTIONS
 * ===================================================================
 */

// Creates a Stripe Checkout session for a new subscription
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  console.log("Function started. Received data:", data); // New log

  if (!context.auth) {
    console.error("Authentication check failed."); // New log
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in to subscribe.");
  }

  const { priceId } = data;
  const userId = context.auth.uid;

  console.log(`User ID: ${userId}, Price ID: ${priceId}`); // New log

  if (!priceId) {
    console.error("No Price ID received from client."); // New log
    throw new functions.https.HttpsError("invalid-argument", "No priceId was provided.");
  }

  try {
    console.log("Creating Stripe session..."); // New log
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      success_url: `https://infinity-education-c170b.web.app?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://infinity-education-c170b.web.app`,
    });

    console.log("Stripe session created successfully:", session.id); // New log
    return { id: session.id };

  } catch (error) {
    console.error("Stripe Checkout Error:", error);
    throw new functions.https.HttpsError("internal", "Unable to create checkout session.");
  }
});

// Listens for successful payments and provisions a new school
exports.fulfillSubscription = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    // ⚠️ ADD YOUR STRIPE WEBHOOK SECRET to your .env file (e.g., STRIPE_WEBHOOK_SECRET=whsec_...)
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; 
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed.', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.client_reference_id;

        if (!userId) { return res.status(400).send('No userId found in session.'); }

        try {
            const schoolRef = await db.collection('schools').add({
                ownerUid: userId,
                name: "New School",
                subscriptionStatus: 'active',
                stripeCustomerId: session.customer,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            const newSchoolId = schoolRef.id;

            const userRef = db.collection('users').doc(userId);
            await userRef.update({ role: 'schoolAdmin', schoolId: newSchoolId });

            const templates = {
                rubrics: await db.collection('rubrics').where('schoolId', '==', null).get(),
                continuums: await db.collection('continuums').where('schoolId', '==', null).get()
            };

            const batch = db.batch();
            templates.rubrics.forEach(doc => {
                const newDocRef = db.collection('rubrics').doc();
                batch.set(newDocRef, { ...doc.data(), schoolId: newSchoolId });
            });
            templates.continuums.forEach(doc => {
                const newDocRef = db.collection('continuums').doc();
                batch.set(newDocRef, { ...doc.data(), schoolId: newSchoolId });
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

/*
 * ===================================================================
 * AUTHENTICATION & USER DATA FUNCTIONS
 * ===================================================================
 */

// Sets custom claims (role, schoolId) on a user's token when their user doc changes
exports.setUserClaims = functions.firestore.document("users/{userId}").onWrite(async (change, context) => {
    const userData = change.after.data();
    const userId = context.params.userId;
    try {
      await admin.auth().setCustomUserClaims(userId, {
        role: userData.role || "guest",
        schoolId: userData.schoolId || null,
      });
      console.log(`Claims set for ${userId}: role=${userData.role}, schoolId=${userData.schoolId}`);
    } catch (error) {
      console.error("Error setting custom claims:", error);
    }
});

// Deletes a user and all their associated data
exports.deleteUserData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in to delete your account.");
  }
  const uid = context.auth.token.uid;
  try {
    await db.collection("users").doc(uid).delete();
    // You may need to add more cleanup logic here for other user data
    await admin.auth().deleteUser(uid);
    return { status: "success", message: "Account deleted successfully." };
  } catch (error) {
    console.error("Error deleting user data:", error);
    throw new functions.https.HttpsError("internal", "An error occurred while deleting your account.");
  }
});


/*
 * ===================================================================
 * LEARNING JOURNEY AI SUMMARY FUNCTION
 * ===================================================================
 */
exports.generateJourneySummary = functions.https.onCall(async (data, context) => {
  if (!context.auth) { throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated."); }
  const { studentName, anecdoteIds } = data;
  if (!studentName || !anecdoteIds || !Array.isArray(anecdoteIds) || anecdoteIds.length === 0) { throw new functions.https.HttpsError("invalid-argument", "The function must be called with a studentName and an array of anecdoteIds."); }
  
  const anecdotePromises = anecdoteIds.map((id) => db.collection("anecdotes").doc(id).get());
  const anecdoteDocs = await Promise.all(anecdotePromises);

  let anecdoteTextForPrompt = "";
  anecdoteDocs.forEach((doc) => {
    if (doc.exists) {
      anecdoteTextForPrompt += `- Skill: ${doc.data().coreSkill} / ${doc.data().microSkill}: '${doc.data().text}'\n`;
    }
  });

  if (anecdoteTextForPrompt === "") { throw new functions.https.HttpsError("not-found", "None of the provided anecdote IDs were found."); }

  const systemPrompt = `You are an experienced educator writing a summary for a student's learning report. Synthesize the provided points into a cohesive, positive, and constructive narrative paragraph that tells a story of the student's growth, strengths, and areas for continued focus. Do not just list the anecdotes.`;
  const userPrompt = `Student's Name: ${studentName}\n\nTeacher-Logged Anecdotes:\n${anecdoteTextForPrompt}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    const summaryText = completion.choices[0].message.content;
    return { summary: summaryText };
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw new functions.https.HttpsError("internal", "Failed to generate summary from OpenAI.");
  }
});


/*
 * ===================================================================
 * NOTIFICATION FUNCTIONS
 * ===================================================================
 */
exports.sendAnecdoteNotification = functions.firestore.document("anecdotes/{anecdoteId}").onCreate(async (snap, context) => {
    const anecdote = snap.data();
    const studentSnap = await db.collection("students").doc(anecdote.studentId).get();
    if (!studentSnap.exists) { return null; }
    
    const student = studentSnap.data();
    const parentEmails = [student.parent1Email, student.parent2Email].filter(Boolean);
    if (parentEmails.length === 0) { return null; }

    for (const email of parentEmails) {
        const userSnap = await db.collection("users").where("email", "==", email).get();
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
            }
        }
    }
    return null;
});

exports.sendNewMessageNotification = functions.firestore.document("chats/{chatId}/messages/{messageId}").onCreate(async (snap, context) => {
    const message = snap.data();
    if (message.senderId === message.recipientId) { return null; }
    
    const recipientSnap = await db.collection("users").doc(message.recipientId).get();
    if (!recipientSnap.exists) { return null; }
    
    const recipient = recipientSnap.data();
    if (recipient.notificationSettings?.newMessage === true) {
        await db.collection("mail").add({
            to: recipient.email,
            message: {
                subject: "Infinity Education: New Message!",
                html: `<p>Hello ${recipient.displayName || ''},</p><p>You have received a new message.</p><p>Please log in to your Infinity Education dashboard to view and reply.</p>`,
            },
        });
    }
    return null;
});