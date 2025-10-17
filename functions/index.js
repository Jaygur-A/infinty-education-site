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
	  success_url: `https://infinty-education-site-bdul9.kinsta.page/?session_id={CHECKOUT_SESSION_ID}`,
	  cancel_url: `https://infinty-education-site-bdul9.kinsta.page/`,
    });

    console.log("Stripe session created successfully:", session.id); // New log
    return { id: session.id };

  } catch (error) {
    console.error("Stripe Checkout Error:", error);
    throw new functions.https.HttpsError("internal", "Unable to create checkout session.");
  }
});

// Helper function to delay execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Listens for successful payments and provisions a new school
exports.fulfillSubscription = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; // Uses key from .env
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

        if (!userId) {
            console.error('No userId found in session.');
            return res.status(400).send('No userId found in session.');
        }

        try {
            // --- Retry logic for fetching Auth user ---
            let authUser = null;
            let attempts = 0;
            const maxAttempts = 5; // Try up to 5 times
            const retryDelay = 1000; // Wait 1 second between attempts

            while (!authUser && attempts < maxAttempts) {
                attempts++;
                try {
                    console.log(`Attempt ${attempts} to fetch Auth user ${userId}...`);
                    authUser = await admin.auth().getUser(userId);
                } catch (error) {
                    if (error.code === 'auth/user-not-found' && attempts < maxAttempts) {
                        console.log(`Auth user ${userId} not found yet, retrying in ${retryDelay}ms...`);
                        await delay(retryDelay); // Wait before retrying
                    } else {
                        console.error(`Failed to fetch Auth user ${userId} after ${attempts} attempts:`, error);
                        throw error; // Re-throw the error if it's not 'user-not-found' or if max attempts reached
                    }
                }
            }

            if (!authUser) {
                 console.error(`Could not find Auth user ${userId} after ${maxAttempts} attempts.`);
                 throw new Error(`Auth user ${userId} not found after retries.`);
            }
            // --- END of Retry logic ---


            // 1. Create the new school document
            const schoolRef = await db.collection('schools').add({
                ownerUid: userId,
                name: "New School", // User will name this in the next step
                subscriptionStatus: 'active',
                stripeCustomerId: session.customer,
                subscriptionId: session.subscription, // Important for managing cancellations
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            const newSchoolId = schoolRef.id;
            console.log(`Created new school with ID: ${newSchoolId}`);

            // 2. Update or Create the user's Firestore document
            const userRef = db.collection('users').doc(userId);
            const userSnap = await userRef.get(); // Attempt to get the document first

            if (userSnap.exists()) {
                // Document exists, update it
                await userRef.update({ role: 'schoolAdmin', schoolId: newSchoolId });
                console.log(`Updated existing user ${userId} to schoolAdmin for school ${newSchoolId}`);
            } else {
                // Document doesn't exist, create it with basic info + new role/schoolId
                await userRef.set({
                    uid: userId,
                    email: authUser.email, // Get email from Auth record
                    displayName: authUser.displayName || authUser.email.split('@')[0],
                    photoURL: authUser.photoURL || `https://placehold.co/100x100?text=${(authUser.email[0] || '?').toUpperCase()}`,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(), // Set creation time
                    role: 'schoolAdmin', // Set the correct role
                    schoolId: newSchoolId, // Set the correct school ID
                    notificationSettings: { // Add default settings
                        newAnecdote: true,
                        newMessage: true
                    }
                });
                console.log(`Created new user document for ${userId} as schoolAdmin for school ${newSchoolId}`);
            }

            // 3. Clone templates
            const templates = {
                rubrics: await db.collection('rubrics').where('schoolId', '==', null).get(),
                continuums: await db.collection('continuums').where('schoolId', '==', null).get()
                // Add skills cloning here if you use a separate skills collection
            };
            console.log(`Found ${templates.rubrics.size} rubric templates and ${templates.continuums.size} continuum templates to clone.`);

            const batch = db.batch();
            templates.rubrics.forEach(doc => {
                 const newDocRef = db.collection('rubrics').doc(); // Generate new ID
                 batch.set(newDocRef, { ...doc.data(), schoolId: newSchoolId }); // Set data + schoolId
            });
            templates.continuums.forEach(doc => {
                 const newDocRef = db.collection('continuums').doc(); // Generate new ID
                 batch.set(newDocRef, { ...doc.data(), schoolId: newSchoolId }); // Set data + schoolId
            });
            await batch.commit();
            console.log(`Successfully cloned templates for new school ${newSchoolId}`);

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

// Updates a newly created school's name during onboarding
exports.updateSchoolName = functions.https.onCall(async (data, context) => {
  // 1. Check for authentication and correct role
  if (!context.auth || context.auth.token.role !== 'schoolAdmin') {
    throw new functions.https.HttpsError("unauthenticated", "You must be a school administrator to perform this action.");
  }

  const { schoolName } = data;
  const schoolId = context.auth.token.schoolId;

  // 2. Validate the input
  if (!schoolName || schoolName.trim().length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "School name cannot be empty.");
  }
  if (!schoolId) {
    throw new functions.https.HttpsError("failed-precondition", "User does not have a school ID.");
  }

  // 3. Update the school document
  try {
    const schoolRef = db.collection('schools').doc(schoolId);
    await schoolRef.update({ name: schoolName.trim() });
    return { status: 'success', message: 'School name updated successfully.' };
  } catch (error) {
    console.error("Error updating school name:", error);
    throw new functions.https.HttpsError("internal", "An error occurred while updating the school name.");
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

/*
 * ===================================================================
 * STRIPE SUBSCRIPTION STATUS SYNC
 * ===================================================================
 */
exports.handleSubscriptionChange = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; 
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed.', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const subscription = event.data.object;
    const relevantEvents = new Set([
        'customer.subscription.updated',
        'customer.subscription.deleted',
    ]);

    if (relevantEvents.has(event.type)) {
        try {
            // Find the school document that corresponds to this subscription
            const schoolsRef = db.collection('schools');
            const q = schoolsRef.where('subscriptionId', '==', subscription.id).limit(1);
            const snapshot = await q.get();

            if (snapshot.empty) {
                console.log(`No school found for subscription ID: ${subscription.id}`);
                return res.status(200).send();
            }

            const schoolDoc = snapshot.docs[0];
            const newStatus = subscription.status === 'active' ? 'active' : 'inactive';

            await schoolDoc.ref.update({
                subscriptionStatus: newStatus
            });

            console.log(`Updated school ${schoolDoc.id} to status: ${newStatus}`);

        } catch (error) {
            console.error('Error updating subscription status:', error);
            return res.status(500).send('Internal Server Error');
        }
    }

    res.status(200).send();
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