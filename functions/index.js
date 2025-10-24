require('dotenv').config(); // Loads .env file
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require("stripe")(process.env.STRIPE_SECRET); // Uses key from .env
const { OpenAI } = require("openai");

admin.initializeApp();
const db = admin.firestore();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY, // Uses key from .env
});

// Helper function to delay execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/*
 * ===================================================================
 * STRIPE & SUBSCRIPTION FUNCTIONS
 * ===================================================================
 */

// Creates a Stripe Checkout session (onCall)
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  console.log("createCheckoutSession started. Data:", data);
  if (!context.auth) {
    console.error("Authentication check failed.");
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in to subscribe.");
  }
  const { priceId } = data;
  const userId = context.auth.uid;
  if (!priceId) {
    console.error("No Price ID received.");
    throw new functions.https.HttpsError("invalid-argument", "No priceId was provided.");
  }
  console.log(`User: ${userId}, Price: ${priceId}`);
  try {
    console.log("Creating Stripe session...");
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      success_url: `https://infinty-education-site-bdul9.kinsta.page/?session_id={CHECKOUT_SESSION_ID}`, // Correct Kinsta URL
      cancel_url: `https://infinty-education-site-bdul9.kinsta.page/`, // Correct Kinsta URL
    });
    console.log("Stripe session created:", session.id);
    return { id: session.id };
  } catch (error) {
    console.error("Stripe Checkout Error:", error);
    throw new functions.https.HttpsError("internal", "Unable to create checkout session.");
  }
});

// Provisions a new school after successful payment (Webhook - onRequest)
exports.fulfillSubscription = functions.https.onRequest(async (req, res) => {
    console.log("[fulfillSubscription] Webhook received.");
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
        console.log("[fulfillSubscription] Webhook signature verified.");
    } catch (err) {
        console.error('[fulfillSubscription] Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.client_reference_id;
        console.log(`[fulfillSubscription] Processing checkout.session.completed for user: ${userId}`);

        if (!userId) {
            console.error('[fulfillSubscription] No userId found in session.');
            return res.status(400).send('No userId found in session.');
        }

        try {
            // --- Step 1: Create the School Document ---
            const schoolRef = await db.collection('schools').add({
                ownerUid: userId,
                name: "New School", // User names this in onboarding
                subscriptionStatus: 'active',
                stripeCustomerId: session.customer,
                subscriptionId: session.subscription,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            const newSchoolId = schoolRef.id;
            console.log(`[fulfillSubscription] Created new school with ID: ${newSchoolId} for user ${userId}`);

            // --- Step 2: Set (Merge) user's schoolId in Firestore ---
            // Role promotion happens later in updateSchoolName
            const userRef = db.collection('users').doc(userId);
			try {
				const userSnap = await userRef.get();
				if (!userSnap.exists) {
				   let authUser = null;
				   let attempts = 0;
				   while (!authUser && attempts < 3) {
					   attempts++;
					   try { authUser = await admin.auth().getUser(userId); }
					   catch (e) { if (e.code === 'auth/user-not-found') await delay(1000); else throw e; }
				   }
				   if (!authUser) throw new Error("Auth user still not found after retries in fulfillSubscription.");
					await userRef.set({
						uid: userId, email: authUser.email,
						displayName: authUser.displayName || authUser.email.split('@')[0],
						photoURL: authUser.photoURL || `https://placehold.co/100x100?text=${(authUser.email[0] || '?').toUpperCase()}`,
						createdAt: admin.firestore.FieldValue.serverTimestamp(),
						role: 'schoolAdmin',
						schoolId: newSchoolId,
						notificationSettings: { newMessage: true }
					});
					console.log(`[fulfillSubscription] Created user doc and set schoolId ${newSchoolId} for user ${userId}`);
				} else {
				   await userRef.set({ 
				   schoolId: newSchoolId, 
				   role: 'schoolAdmin'
				   }, { merge: true });
				   console.log(`[fulfillSubscription] Set schoolId ${newSchoolId} for user ${userId} (merged)`);
				}
			 } catch (dbError) {
			   console.error(`[fulfillSubscription] Error SETTING/MERGING schoolId for user ${userId}:`, dbError);
			 }

        } catch (error) {
            console.error('[fulfillSubscription] Error provisioning new school:', error);
            return res.status(500).send('Internal Server Error');
        }
    } else {
         console.log(`[fulfillSubscription] Received unhandled event type: ${event.type}`);
    }
    res.status(200).send();
});

// Updates subscription status in Firestore based on Stripe events (Webhook - onRequest)
exports.handleSubscriptionChange = functions.https.onRequest(async (req, res) => {
    console.log("[handleSubscriptionChange] Webhook received.");
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        console.error('[handleSubscriptionChange] Webhook signature verification failed.', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    const subscription = event.data.object;
    const relevantEvents = new Set(['customer.subscription.updated', 'customer.subscription.deleted', 'invoice.payment_failed']);
    if (relevantEvents.has(event.type)) {
        try {
            const schoolsRef = db.collection('schools');
            const q = schoolsRef.where('subscriptionId', '==', subscription.id).limit(1);
            const snapshot = await q.get();
            if (snapshot.empty) {
                console.log(`[handleSubscriptionChange] No school found for subscription ID: ${subscription.id}`);
                return res.status(200).send();
            }
            const schoolDoc = snapshot.docs[0];
            const isActive = ['active', 'trialing'].includes(subscription.status);
            const newStatus = isActive ? 'active' : 'inactive';
            await schoolDoc.ref.update({ subscriptionStatus: newStatus });
            console.log(`[handleSubscriptionChange] Updated school ${schoolDoc.id} to status: ${newStatus}`);
        } catch (error) {
            console.error('[handleSubscriptionChange] Error updating subscription status:', error);
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

// Sets custom claims (role, schoolId) on a user's token when their user doc changes (Firestore Trigger)
exports.setUserClaims = functions.firestore.document("users/{userId}").onWrite(async (change, context) => {
    const userId = context.params.userId;
    const afterData = change.after.exists ? change.after.data() : null;
    if (!afterData) {
        console.log(`[setUserClaims] User doc for ${userId} deleted. No claims to set.`);
        return;
    }
    console.log(`[setUserClaims] Triggered for user: ${userId}. Setting claims: role=${afterData.role}, schoolId=${afterData.schoolId}`);
    try {
      await admin.auth().setCustomUserClaims(userId, {
        role: afterData.role || "guest",
        schoolId: afterData.schoolId || null,
      });
      console.log(`[setUserClaims] Successfully set claims for ${userId}.`);
    } catch (error) {
      console.error(`[setUserClaims] Error setting custom claims for ${userId}:`, error);
    }
});

// Deletes a user and their data (Callable)
exports.deleteUserData = functions.https.onCall(async (data, context) => {
    if (!context.auth) { throw new functions.https.HttpsError("unauthenticated", "You must be logged in to delete your account."); }
    const uid = context.auth.uid;
    try {
        await db.collection("users").doc(uid).delete();
        await admin.auth().deleteUser(uid);
        return { status: "success", message: "Account deleted successfully." };
    } catch (error) {
        console.error("Error deleting user data:", error);
        throw new functions.https.HttpsError("internal", "An error occurred while deleting your account.");
    }
});

// Updates school name AND promotes user role during onboarding (Callable)
exports.updateSchoolName = functions.https.onCall(async (data, context) => {
    console.log("[updateSchoolName] Function called. Data:", data);
    if (!context.auth) { throw new functions.https.HttpsError("unauthenticated", "Authentication required."); }
    const { schoolName } = data;
    const userId = context.auth.uid;
    const callingUserRef = db.collection('users').doc(userId);
    const callingUserSnap = await callingUserRef.get();
    if (!callingUserSnap.exists) { throw new functions.https.HttpsError("not-found", "User profile not found."); }
    const schoolId = callingUserSnap.data().schoolId;
    if (!schoolName || schoolName.trim().length === 0) { throw new functions.https.HttpsError("invalid-argument", "School name cannot be empty."); }
    if (!schoolId) { throw new functions.https.HttpsError("failed-precondition", "User has no associated school ID."); }
    try {
        const schoolRef = db.collection('schools').doc(schoolId);
        await schoolRef.update({ name: schoolName.trim() });
        console.log(`[updateSchoolName] Updated school name for ${schoolId}`);
        return { status: 'success', message: 'School setup complete.' };
    } catch (error) {
        console.error("[updateSchoolName] Error finalizing school setup:", error);
        throw new functions.https.HttpsError("internal", "An error occurred during school setup.");
    }
});

// Checks if a user's email matches a parent email (Callable)
exports.checkIfParent = functions.https.onCall(async (data, context) => {
    console.log('[checkIfParent] Function called.');
    if (!context.auth) { throw new functions.https.HttpsError("unauthenticated", "Authentication required."); }
    const userId = context.auth.uid;
    const userEmail = context.auth.token.email;
    if (!userEmail) { throw new functions.https.HttpsError("invalid-argument", "User email not found in token."); }
    try {
        const studentsRef = db.collection('students');
        const q1 = studentsRef.where("parent1Email", "==", userEmail);
        const q2 = studentsRef.where("parent2Email", "==", userEmail);
        const [snapshot1, snapshot2] = await Promise.all([q1.get(), q2.get()]);
        const isParent = !snapshot1.empty || !snapshot2.empty;
        console.log(`[checkIfParent] Is user ${userEmail} a parent? ${isParent}`);
        if (isParent) {
            const userRef = db.collection('users').doc(userId);
            try {
                await userRef.update({ role: 'parent' });
                console.log(`[checkIfParent] Updated user ${userId} role to parent.`);
                return { isParent: true, role: 'parent' };
            } catch (updateError) {
                 console.error(`[checkIfParent] Failed to UPDATE user ${userId} role:`, updateError);
                 return { isParent: true, role: 'parent' };
            }
        } else {
            return { isParent: false, role: 'guest' };
        }
    } catch (error) {
        console.error(`[checkIfParent] Error checking parent status for ${userEmail}:`, error);
        throw new functions.https.HttpsError("internal", "Could not check parent status.");
    }
});

/*
 * ===================================================================
 * LEARNING JOURNEY AI SUMMARY FUNCTION (Callable)
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
 * NOTIFICATION FUNCTIONS (Firestore Triggers)
 * ===================================================================
 */

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