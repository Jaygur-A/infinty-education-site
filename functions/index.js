require('dotenv').config();
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const { OpenAI } = require("openai");
const cors = require('cors')({origin: true});

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

        if (!userId) {
            console.error('No userId found in session.');
            return res.status(400).send('No userId found in session.');
        }

        try {
            // --- Step 1: Reliably Fetch Auth User Record (with retries) ---
            let authUser = null;
            let attempts = 0;
            const maxAttempts = 5;
            const retryDelay = 1500; // Increased delay slightly

            while (!authUser && attempts < maxAttempts) {
                attempts++;
                try {
                    console.log(`Attempt ${attempts} to fetch Auth user ${userId}...`);
                    authUser = await admin.auth().getUser(userId);
                    console.log(`Auth user ${userId} found on attempt ${attempts}.`);
                } catch (error) {
                    if (error.code === 'auth/user-not-found' && attempts < maxAttempts) {
                        console.log(`Auth user ${userId} not found yet, retrying in ${retryDelay}ms...`);
                        await delay(retryDelay);
                    } else {
                        console.error(`Failed to fetch Auth user ${userId} after ${attempts} attempts:`, error);
                        throw error; // Give up if persistent error or max attempts reached
                    }
                }
            }
            if (!authUser) {
                throw new Error(`Auth user ${userId} not found after retries.`);
            }

            // --- Step 2: Create the School Document ---
            const schoolRef = await db.collection('schools').add({
                ownerUid: userId,
                name: "New School", // User will name this in the next step
                subscriptionStatus: 'active',
                stripeCustomerId: session.customer,
                subscriptionId: session.subscription,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            const newSchoolId = schoolRef.id;
            console.log(`Created new school with ID: ${newSchoolId}`);

            // --- Step 3: Ensure Firestore User Document Exists and Set Role/School ---

            // --- Step 4: Clone Templates ---
            const templates = {
                rubrics: await db.collection('rubrics').where('schoolId', '==', null).get(),
                continuums: await db.collection('continuums').where('schoolId', '==', null).get()
            };
            console.log(`Found ${templates.rubrics.size} rubric templates and ${templates.continuums.size} continuum templates.`);

            const batch = db.batch();
            templates.rubrics.forEach(doc => { /* ... clone ... */ });
            templates.continuums.forEach(doc => { /* ... clone ... */ });
            await batch.commit();
            console.log(`Successfully cloned templates for new school ${newSchoolId}`);

        } catch (error) {
            console.error('Error provisioning new school:', error);
            // Consider adding more specific error handling/reporting here
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
	try {
		// 1. Update the school document name (Existing logic)
		const schoolRef = db.collection('schools').doc(schoolId);
		await schoolRef.update({ name: schoolName.trim() });
		console.log(`Updated school name for ${schoolId}`);

		// 2. NOW, update the user's role and schoolId
		const userId = context.auth.uid; // Get the UID from the authenticated context
		const userRef = db.collection('users').doc(userId);
		await userRef.update({ 
			role: 'schoolAdmin', 
			schoolId: schoolId // Assign the schoolId we got from the token
		});
		console.log(`Updated user ${userId} role to schoolAdmin for school ${schoolId}`);

		return { status: 'success', message: 'School setup complete.' };

	} catch (error) {
		console.error("Error finalizing school setup:", error);
		// Check if the error was updating the user, provide more specific feedback if needed
		if (error.message.includes("users")) {
			 throw new functions.https.HttpsError("internal", "Failed to update user role. School name was set.");
		} else {
			throw new functions.https.HttpsError("internal", "An error occurred during school setup.");
		}
	}

// Checks if a newly logged-in user's email matches a parent email in any student doc
const cors = require('cors')({origin: true}); // Add this line

exports.checkIfParent = functions.https.onRequest((req, res) => { // Change to onRequest
    cors(req, res, async () => { // Wrap with cors
        // --- Authentication Check (Manual for onRequest) ---
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
            console.error('No Firebase ID token was passed as a Bearer token in the Authorization header.');
            res.status(403).send('Unauthorized');
            return;
        }

        let idToken;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            idToken = req.headers.authorization.split('Bearer ')[1];
        } else {
            res.status(403).send('Unauthorized');
            return;
        }

        let decodedIdToken;
        try {
            decodedIdToken = await admin.auth().verifyIdToken(idToken);
        } catch (error) {
            console.error('Error while verifying Firebase ID token:', error);
            res.status(403).send('Unauthorized');
            return;
        }

        const userId = decodedIdToken.uid;
        const userEmail = decodedIdToken.email;
        // --- End Authentication Check ---


        if (!userEmail) {
             // Use res.status().json() for onRequest
             console.error("User email not found in token.");
             res.status(400).json({ error: { message: "User email not found in token." } });
             return;
        }

        try {
            const studentsRef = db.collection('students');
            const q1 = query(studentsRef, where("parent1Email", "==", userEmail));
            const q2 = query(studentsRef, where("parent2Email", "==", userEmail));

            console.log(`[checkIfParent] Checking students for parent email: ${userEmail}`);
            const [snapshot1, snapshot2] = await Promise.all([ q1.get(), q2.get() ]);

            const isParent = !snapshot1.empty || !snapshot2.empty;
            console.log(`[checkIfParent] Is user ${userEmail} a parent? ${isParent}`);

            if (isParent) {
                const userRef = db.collection('users').doc(userId);
                await userRef.update({ role: 'parent' });
                console.log(`[checkIfParent] Updated user ${userId} role to parent.`);
                res.status(200).json({ data: { isParent: true, role: 'parent' } }); // Send JSON response
            } else {
                 res.status(200).json({ data: { isParent: false, role: 'guest' } }); // Send JSON response
            }

        } catch (error) {
            console.error(`[checkIfParent] Error checking parent status for ${userEmail}:`, error);
            res.status(500).json({ error: { message: "Could not check parent status." } }); // Send JSON error
        }
    }); // Close cors wrapper
}); // Close onRequest handler

    // 1. Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
    }

    const userId = context.auth.uid;
    const userEmail = context.auth.token.email; // Get email from token

    if (!userEmail) {
        throw new functions.https.HttpsError("invalid-argument", "User email not found in token.");
    }

    try {
        // 2. Query students collection for matching parent email
        const studentsRef = db.collection('students');
        const q1 = query(studentsRef, where("parent1Email", "==", userEmail));
        const q2 = query(studentsRef, where("parent2Email", "==", userEmail));

        console.log(`[checkIfParent] Checking students for parent email: ${userEmail}`);
        const [snapshot1, snapshot2] = await Promise.all([
            q1.get(),
            q2.get()
        ]);

        const isParent = !snapshot1.empty || !snapshot2.empty;
        console.log(`[checkIfParent] Is user ${userEmail} a parent? ${isParent}`);

        // 3. If they are a parent, update their role in Firestore
        if (isParent) {
            const userRef = db.collection('users').doc(userId);
            await userRef.update({ role: 'parent' });
            console.log(`[checkIfParent] Updated user ${userId} role to parent.`);
            return { isParent: true, role: 'parent' };
        } else {
            return { isParent: false, role: 'guest' }; // Return current role if not parent
        }

    } catch (error) {
        console.error(`[checkIfParent] Error checking parent status for ${userEmail}:`, error);
        throw new functions.https.HttpsError("internal", "Could not check parent status.");
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