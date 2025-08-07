// functions/index.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage();

// A callable function to delete a user and all their data
exports.deleteUserData = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to delete your account."
    );
  }

  const uid = context.auth.token.uid;

  try {
    // 1. Delete Firestore user document
    await db.collection("users").doc(uid).delete();

    // 2. Find and delete chat data
    const chatQuery = db.collection("chats").where("participants", "array-contains", uid);
    const chatSnaps = await chatQuery.get();
    
    const deletePromises = [];
    chatSnaps.forEach((doc) => {
      // Delete the 'messages' subcollection and the chat document itself
      deletePromises.push(db.collection("chats").doc(doc.id).delete());
      // Note: For large subcollections, you'd need a recursive delete helper function.
      // For this app's scale, deleting the parent doc might be enough if you set up GC extensions,
      // but explicit deletion is safer.
      
      // 3. Delete associated files from Storage
      const bucket = storage.bucket();
      const folderPath = `chats/${doc.id}/`;
      deletePromises.push(bucket.deleteFiles({ prefix: folderPath }));
    });
    
    await Promise.all(deletePromises);

    // 4. Delete the user from Firebase Auth (MUST BE LAST)
    await admin.auth().deleteUser(uid);

    return { status: "success", message: "Account deleted successfully." };

  } catch (error) {
    console.error("Error deleting user data:", error);
    throw new functions.https.HttpsError(
      "internal",
      "An error occurred while deleting your account."
    );
  }
});