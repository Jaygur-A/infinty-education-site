import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, getDocs, setDoc, collection, addDoc, query, onSnapshot, orderBy, serverTimestamp, where, collectionGroup, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";

const firebaseConfig = {
    apiKey: "AIzaSyCSHcp39QCEyDbpGWn8y4rDxXA6erEDo7Q",
    authDomain: "infinity-education-c170b.firebaseapp.com",
    projectId: "infinity-education-c170b",
    storageBucket: "infinity-education-c170b.firebasestorage.app",
    messagingSenderId: "312781945568",
    appId: "1:312781945568:web:04104d51e968dff9fa2e85",
    measurementId: "G-FSGELW7P1Z"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
window.auth = auth; // Expose auth for debugging
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// ===================================================================
// DATA STRUCTURES
// ===================================================================
const skillMap = {
    'Vitality': ['Mindset', 'Emotional Energy Regulation', 'Physical Conditioning', 'Health', 'Connection'],
    'Integrity': ['Honesty & Accountability', 'Discipline', 'Courage', 'Respect'],
    'Curiosity': ['Questioning', 'Reflecting', 'Researching', 'Creating', 'Communicating'],
    'Critical Thinking': ['Analyzing Information', 'Evaluating Evidence', 'Making Informed Judgments'],
    'Fields of Knowledge': ['Literacy', 'Math', 'Science', 'Social Studies', 'Arts']
};

const skillDescriptions = {
    'Mindset': 'Confidence, Risk Taking, Resilience, Open Mindedness',
    'Emotional Energy Regulation': 'Self-Awareness of Emotions, Regulation Strategies, Social Awareness & Energy',
    'Physical Conditioning': 'Locomotor Skills, Non-locomotor Skills, Manipulation, Cognitive & Strategy Skills',
    'Health': 'Nutrition, Body Systems, Lifestyle Inputs',
    'Connection': 'Connection with Others, Connections with Self, Connection with Community, Connection with Nature',
    'Honesty & Accountability': 'Owning Actions, Following Through, Making it Right',
    'Discipline': 'Self-Control & Focus, Consistency, Goal Setting, Responsibility',
    'Courage': 'Embracing discomfort, Speaking up, Being true to myself',
    'Respect': 'Listening, Kindness & Compassion, Caring for the environment, Manners',
    'Questioning': 'Formulating Clear Questions, Asking Deeper Questions',
    'Reflecting': 'Asking questions, Adjusting, Connecting Ideas, Metacognition',
    'Researching': 'Finding Sources, Research Methods, Organizing Information',
    'Creating': 'Generating Ideas, Organizing Ideas, Using Tools & Techniques, Problem-Solving & Iterating',
    'Communicating': 'Writing - Choosing Format, Organizing Content, Using Language and Visuals. Speaking - Voice Control, Body Language, Clarity & Structure, Audience Awareness',
    'Analyzing Information': 'Identifying Key Details, Recognizing Patterns and Relationships, Breaking Down Complex Ideas, Differentiating Fact from Opinion',
    'Evaluating Evidence': 'Checking the Source, Identifying Bias or Agenda, Judging Relevance, Comparing Multiple Sources & Perspectives & Weighing Evidence',
    'Making Informed Judgments': 'Problem Solving, Cause & Effect, Justifying a Decision',
    'Literacy': 'Oral & Non Verbal Communication, Reading & Writing, Foundations, Comprehension, Composition',
    'Math': 'Number Sense, Patterns, Coding, Data & Probability, Spatial Sense, Financial Literacy & Entrepreneurship',
    'Science': 'Life Systems, Structures',
    'Social Studies': 'Place, Past, People, Culture',
    'Arts': 'Visual Art, Drama, Music'
};

// ===================================================================
// AUTHORIZATION CONFIGURATION
// ===================================================================
const ADMIN_UID = "qogikivAnTej3fWMPHhBrjsfbQu2";

// DOM Elements
const loadingOverlay = document.getElementById('loading-overlay');
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const googleSignInBtn = document.getElementById('google-signin-btn');
const userEmailDisplay = document.getElementById('user-email-display');
const dashboardBtn = document.getElementById('dashboard-btn');
const messagesBtn = document.getElementById('messages-btn');
const dashboardView = document.getElementById('dashboard-view');
const parentDashboardView = document.getElementById('parent-dashboard-view');
const profileView = document.getElementById('profile-view');
const messagesView = document.getElementById('messages-view');
const chatView = document.getElementById('chat-view');
const studentDetailView = document.getElementById('student-detail-view');
const userList = document.getElementById('user-list');
const noUsersMessage = document.getElementById('no-users-message');
const chatWithUser = document.getElementById('chat-with-user');
const backToMessagesBtn = document.getElementById('back-to-messages-btn');
const messageList = document.getElementById('message-list');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const studentGrid = document.getElementById('student-grid');
const noStudentsMessage = document.getElementById('no-students-message');
const studentDetailName = document.getElementById('student-detail-name');
const addRecordBtn = document.getElementById('addRecordBtn');
const addRecordModal = document.getElementById('addRecordModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const addStudentForm = document.getElementById('addStudentForm');
const addAnecdoteBtn = document.getElementById('add-anecdote-btn');
const addAnecdoteModal = document.getElementById('addAnecdoteModal');
const closeAnecdoteModalBtn = document.getElementById('closeAnecdoteModalBtn');
const addAnecdoteForm = document.getElementById('addAnecdoteForm');
const coreSkillSelect = document.getElementById('coreSkill');
const microSkillSelect = document.getElementById('microSkill');
const alignedSkillsGrid = document.getElementById('aligned-skills-grid');
const anecdoteDisplayContainer = document.getElementById('anecdote-display-container');
const anecdoteListTitle = document.getElementById('anecdote-list-title');
const anecdoteChartCanvas = document.getElementById('anecdote-chart');
const closeAnecdoteDisplayBtn = document.getElementById('close-anecdote-display-btn');
const microSkillDetailView = document.getElementById('micro-skill-detail-view');
const microSkillTitle = document.getElementById('micro-skill-title');
const microSkillDescription = document.getElementById('micro-skill-description');
const microSkillAnecdoteList = document.getElementById('micro-skill-anecdote-list');
const noMicroSkillAnecdotesMessage = document.getElementById('no-micro-skill-anecdotes-message');
const backToStudentDetailBtn = document.getElementById('back-to-student-detail-btn');
const allSkillsChartCanvas = document.getElementById('all-skills-chart');
const attachFileBtn = document.getElementById('attach-file-btn');
const fileInput = document.getElementById('file-input');
const imageModal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const closeImageModalBtn = document.getElementById('close-image-modal-btn');
const filePreviewContainer = document.getElementById('file-preview-container');
const filePreviewImage = document.getElementById('file-preview-image');
const filePreviewName = document.getElementById('file-preview-name');
const removeFileBtn = document.getElementById('remove-file-btn');
const messagesChartCanvas = document.getElementById('messages-chart');
const messagesChartContainer = document.getElementById('messages-chart-container');
const deleteAccountBtn = document.getElementById('delete-account-btn');
const deleteConfirmModal = document.getElementById('delete-confirm-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const profileMenuBtn = document.getElementById('profile-menu-btn');
const profileDropdown = document.getElementById('profile-dropdown');
const profileLink = document.getElementById('profile-link');
const logoutLink = document.getElementById('logout-link');
const profileName = document.getElementById('profile-name');
const profileEmail = document.getElementById('profile-email');
const rubricView = document.getElementById('rubric-view');
const viewRubricBtn = document.getElementById('view-rubric-btn');
const backToAnecdotesBtn = document.getElementById('back-to-anecdotes-btn');
const downloadRubricBtn = document.getElementById('download-rubric-btn');
const rubricTitle = document.getElementById('rubric-title');
const downloadOptionsModal = document.getElementById('download-options-modal');
const downloadPngBtn = document.getElementById('download-png-btn');
const downloadPdfBtn = document.getElementById('download-pdf-btn');
const cancelDownloadBtn = document.getElementById('cancel-download-btn');
const editAnecdoteModal = document.getElementById('editAnecdoteModal');
const closeEditAnecdoteModalBtn = document.getElementById('closeEditAnecdoteModalBtn');
const editAnecdoteForm = document.getElementById('editAnecdoteForm');
const deleteAnecdoteConfirmModal = document.getElementById('deleteAnecdoteConfirmModal');
const cancelDeleteAnecdoteBtn = document.getElementById('cancel-delete-anecdote-btn');
const confirmDeleteAnecdoteBtn = document.getElementById('confirm-delete-anecdote-btn');
const parentWelcomeMessage = document.getElementById('parent-welcome-message');
const parentStudentView = document.getElementById('parent-student-view');
const parentViewStudentName = document.getElementById('parent-view-student-name');
const parentViewSkillsGrid = document.getElementById('parent-view-skills-grid');
const parentAnecdoteContainer = document.getElementById('parent-view-anecdote-container');
const parentAnecdoteListTitle = document.getElementById('parent-anecdote-list-title');
const parentAnecdoteChartCanvas = document.getElementById('parent-anecdote-chart');
const parentCloseAnecdoteBtn = document.getElementById('parent-close-anecdote-display-btn');
const continuumView = document.getElementById('continuum-view');
const buildContinuumBtn = document.getElementById('build-continuum-btn');
const continuumTitle = document.getElementById('continuum-title');
const backToStudentDetailFromContinuumBtn = document.getElementById('back-to-student-detail-from-continuum-btn');
const downloadContinuumBtn = document.getElementById('download-continuum-btn');
const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
const buildJourneyBtn = document.getElementById('build-journey-btn');
const journeyBuilderView = document.getElementById('journey-builder-view');
const journeyStudentName = document.getElementById('journey-student-name');
const backToStudentFromJourneyBtn = document.getElementById('back-to-student-from-journey-btn');
const journeyAnecdoteSelectionList = document.getElementById('journey-anecdote-selection-list');
const journeySelectionCounter = document.getElementById('journey-selection-counter');
const generateJourneySummaryBtn = document.getElementById('generate-journey-summary-btn');
const journeyEditorView = document.getElementById('journey-editor-view');
const journeyEditorTitle = document.getElementById('journey-editor-title');
const backToJourneyBuilderBtn = document.getElementById('back-to-journey-builder-btn');
const journeySummaryTextarea = document.getElementById('journey-summary-textarea');
const downloadJourneyPdfBtn = document.getElementById('download-journey-pdf-btn');
const usersView = document.getElementById('users-view');
const usersLink = document.getElementById('users-link');
const usersListBody = document.getElementById('users-list-body');
const classroomsLink = document.getElementById('classrooms-link');
const classroomsView = document.getElementById('classrooms-view');
const createClassroomForm = document.getElementById('create-classroom-form');
const newClassroomName = document.getElementById('new-classroom-name');
const teacherSelectDropdown = document.getElementById('teacher-select-dropdown');
const classroomsList = document.getElementById('classrooms-list');
const editClassroomModal = document.getElementById('edit-classroom-modal');
const closeEditClassroomModalBtn = document.getElementById('close-edit-classroom-modal-btn');
const editClassroomForm = document.getElementById('edit-classroom-form');
const editClassroomName = document.getElementById('edit-classroom-name');
const editTeacherSelect = document.getElementById('edit-teacher-select');
const studentClassSelect = document.getElementById('studentClassSelect');
const contactParentsBtn = document.getElementById('contact-parents-btn');
const messageParentsModal = document.getElementById('message-parents-modal');
const closeMessageParentsModalBtn = document.getElementById('close-message-parents-modal-btn');
const messageModalStudentName = document.getElementById('message-modal-student-name');
const messageOptionsContainer = document.getElementById('message-options-container');
const settingsLink = document.getElementById('settings-link');
const settingsView = document.getElementById('settings-view');
const anecdoteEmailsToggle = document.getElementById('anecdote-emails-toggle');
const messageEmailsToggle = document.getElementById('message-emails-toggle');
const continuumTableContainer = document.getElementById('continuum-table-container');


// App State
let currentStudentId = null,
    currentCoreSkill = null,
    currentMicroSkill = null;
let unsubscribeFromUsers, unsubscribeFromMessages, unsubscribeFromStudents, unsubscribeFromAnecdotes, unsubscribeFromMicroSkillAnecdotes, unsubscribeFromAllAnecdotes;
let anecdoteChart = null,
    allSkillsChart = null,
    messagesChart = null;
let selectedJourneyAnecdotes = [];
let currentUserRole = null;
let currentUserClassroomId = null;
let teachers = []; // Cache for teacher list

// Helper Functions
const showMessage = (message, isError = true) => {
    const messageBox = document.getElementById('message-box');
    const messageText = document.getElementById('message-text');
    messageText.textContent = message;
    messageBox.className = `fixed top-5 right-5 text-white py-3 px-5 rounded-lg shadow-lg z-50 ${isError ? 'bg-red-500' : 'bg-green-500'}`;
    messageBox.classList.remove('hidden');
    setTimeout(() => messageBox.classList.add('hidden'), 5000);
};

const getWeekDates = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(today.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return { start: startOfWeek, end: endOfWeek };
};

const updateMicroSkillsDropdown = (selectedCoreSkill) => {
    microSkillSelect.innerHTML = '';
    const microSkills = skillMap[selectedCoreSkill] || [];
    microSkills.forEach(skill => {
        const option = document.createElement('option');
        option.value = skill;
        option.textContent = skill;
        microSkillSelect.appendChild(option);
    });
};

const showView = (viewToShow) => {
    [dashboardView, parentDashboardView, messagesView, chatView, studentDetailView, microSkillDetailView, profileView, rubricView, continuumView, journeyBuilderView, journeyEditorView, usersView, classroomsView, settingsView].forEach(view => view.classList.add('hidden'));
    viewToShow.classList.remove('hidden');
};

// Auth Logic
onAuthStateChanged(auth, async (user) => {
    loadingOverlay.classList.remove('hidden');
    // Reset state on auth change
    currentUserRole = null;
    currentUserClassroomId = null;

    if (user) {
        document.body.classList.remove('login-background');
        await createUserProfileIfNeeded(user);
        
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        
        let role = docSnap.exists() && docSnap.data().role ? docSnap.data().role : 'guest';
        
        if (role === 'guest') {
            const studentsRef = collection(db, "students");
            const q1 = query(studentsRef, where("parent1Email", "==", user.email));
            const q2 = query(studentsRef, where("parent2Email", "==", user.email));
            const [querySnapshot1, querySnapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
            
            if (querySnapshot1.docs.length > 0 || querySnapshot2.docs.length > 0) {
                role = 'parent';
                await updateDoc(userRef, { role: 'parent' });
            }
        }
        
        currentUserRole = role;
        
        console.log(`User logged in. Final role for routing: ${currentUserRole}`);

        appContainer.classList.remove('hidden');
        authContainer.classList.add('hidden');
        
        usersLink.classList.toggle('hidden', currentUserRole !== 'admin');
        classroomsLink.classList.toggle('hidden', currentUserRole !== 'admin');
        const isTeacherOrAdmin = currentUserRole === 'admin' || currentUserRole === 'teacher';
        addRecordBtn.classList.toggle('hidden', !isTeacherOrAdmin);
        messagesChartContainer.classList.toggle('hidden', currentUserRole !== 'admin');
        
        if (isTeacherOrAdmin) {
            showView(dashboardView);
            if (currentUserRole === 'teacher') {
                const classroomsRef = collection(db, "classrooms");
                const q = query(classroomsRef, where("teacherId", "==", user.uid));
                const classroomSnap = await getDocs(q);
                if (!classroomSnap.empty) {
                    currentUserClassroomId = classroomSnap.docs[0].id;
                }
            }
            listenForStudentRecords();
            listenForAllAnecdotes();
        } else if (currentUserRole === 'parent') { 
            showView(parentDashboardView);
            const studentsRef = collection(db, "students");
            const q1 = query(studentsRef, where("parent1Email", "==", user.email));
            const q2 = query(studentsRef, where("parent2Email", "==", user.email));
            const [querySnapshot1, querySnapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
            const allStudentDocs = [...querySnapshot1.docs, ...querySnapshot2.docs];
            if (allStudentDocs.length > 0) {
                const studentDoc = allStudentDocs[0];
                renderParentStudentView(studentDoc.id, studentDoc.data().name);
            } else {
                parentWelcomeMessage.classList.remove('hidden');
                parentStudentView.classList.add('hidden');
            }
        } else { // This is a Guest
            showView(parentDashboardView);
            parentWelcomeMessage.classList.remove('hidden');
            parentWelcomeMessage.querySelector('h2').textContent = 'Welcome!';
            parentWelcomeMessage.querySelector('p').textContent = 'Your account is currently under review for access to student records.';
            parentStudentView.classList.add('hidden');
        }
        userEmailDisplay.textContent = user.email;
    } else {
        currentUserRole = null;
        document.body.classList.add('login-background');
        appContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
        if (unsubscribeFromUsers) unsubscribeFromUsers();
        if (unsubscribeFromMessages) unsubscribeFromMessages();
        if (unsubscribeFromStudents) unsubscribeFromStudents();
        if (unsubscribeFromAnecdotes) unsubscribeFromAnecdotes();
        if (unsubscribeFromMicroSkillAnecdotes) unsubscribeFromMicroSkillAnecdotes();
        if (unsubscribeFromAllAnecdotes) unsubscribeFromAllAnecdotes();
    }
    loadingOverlay.classList.add('hidden');
});

async function createUserProfileIfNeeded(user) {
    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);
    if (!docSnap.exists()) {
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL || `https://placehold.co/100x100?text=${user.email[0].toUpperCase()}`,
            createdAt: serverTimestamp(),
            role: 'guest',
            // ADD THIS NEW OBJECT
            notificationSettings: {
                newAnecdote: true,
                newMessage: true
            }
        });
    }
}

// Data Logic
function listenForStudentRecords() {
    if (unsubscribeFromStudents) unsubscribeFromStudents();
    
    let q;
    const studentsRef = collection(db, "students");

    // If the user is a teacher and has a classroom, filter by their classroom ID
    if (currentUserRole === 'teacher' && currentUserClassroomId) {
        q = query(studentsRef, where("classroomId", "==", currentUserClassroomId));
    } else if (currentUserRole === 'admin') {
        // Admin sees all students
        q = query(studentsRef);
    } else {
        // If not admin or a teacher with a class, show nothing.
        studentGrid.innerHTML = '';
        noStudentsMessage.classList.remove('hidden');
        return;
    }

    unsubscribeFromStudents = onSnapshot(q, (snapshot) => {
        studentGrid.innerHTML = '';
        noStudentsMessage.classList.toggle('hidden', !snapshot.empty);
        snapshot.forEach(doc => {
            const student = doc.data();
            const studentCard = document.createElement('div');
            studentCard.className = 'flex flex-col items-center text-center cursor-pointer group';
            studentCard.innerHTML = `<div class="w-16 h-16 student-avatar-bg rounded-full flex items-center justify-center mb-2 border-2 border-transparent group-hover:border-green-500 transition-all"><span class="text-2xl student-avatar-text">${student.name ? student.name.charAt(0).toUpperCase() : '?'}</span></div><p class="font-medium text-gray-700 group-hover:text-green-600">${student.name || 'Unnamed'}</p>`;
            studentCard.addEventListener('click', () => showStudentDetailPage(doc.id));
            studentGrid.appendChild(studentCard);
        });
    });
}

async function showStudentDetailPage(studentId) {
    currentStudentId = studentId;
    showView(studentDetailView);
    anecdoteDisplayContainer.classList.add('hidden');
    const studentRef = doc(db, "students", studentId);
    const docSnap = await getDoc(studentRef);
    studentDetailName.textContent = docSnap.exists() ? docSnap.data().name : "Student Not Found";
}

function listenForAnecdotes(studentId, coreSkill, targetCanvas, targetTitle, targetContainer) {
    currentCoreSkill = coreSkill;
    if (unsubscribeFromAnecdotes) unsubscribeFromAnecdotes();
    targetTitle.textContent = `Anecdote Counts for ${coreSkill}`;
    targetContainer.classList.remove('hidden');
	if (buildContinuumBtn) {
        const user = auth.currentUser;
			if (currentUserRole === 'admin') {
				buildContinuumBtn.classList.remove('hidden');
			}	 else {
				buildContinuumBtn.classList.add('hidden');
			}
    }
    const q = query(collection(db, "anecdotes"), where("studentId", "==", studentId), where("coreSkill", "==", coreSkill));
    unsubscribeFromAnecdotes = onSnapshot(q, (snapshot) => {
        const microSkillsForCore = skillMap[coreSkill] || [];
        const microSkillCounts = {};
        microSkillsForCore.forEach(skill => {
            microSkillCounts[skill] = 0;
        });
        snapshot.forEach(doc => {
            const anecdote = doc.data();
            if (microSkillCounts.hasOwnProperty(anecdote.microSkill)) {
                microSkillCounts[anecdote.microSkill]++;
            }
        });
        renderAnecdoteChart(microSkillCounts, targetCanvas, studentId);
    }, (error) => {
        console.error("Error fetching anecdotes: ", error);
    });
}

function renderAnecdoteChart(data, canvasElement, studentId) {
    if (anecdoteChart) anecdoteChart.destroy();
    const ctx = canvasElement.getContext('2d');
    anecdoteChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: 'Anecdote Count',
                data: Object.values(data),
                backgroundColor: '#a7c7e7',
                borderColor: '#6b93b9',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            onClick: (e) => {
                const points = anecdoteChart.getElementsAtEventForMode(e, 'index', { intersect: false }, true);
                if (points.length) {
                    const firstPoint = points[0];
                    const label = anecdoteChart.data.labels[firstPoint.index];
                    showMicroSkillDetailPage(studentId, currentCoreSkill, label);
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        precision: 0
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            },
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
            }
        }
    });
}

function showMicroSkillDetailPage(studentId, coreSkill, microSkill) {
    currentStudentId = studentId;
    currentMicroSkill = microSkill;
    showView(microSkillDetailView);
    microSkillTitle.textContent = `Anecdotes for ${microSkill}`;
    microSkillDescription.textContent = skillDescriptions[microSkill] || '';
    const rubricsAvailable = ['Mindset', 'Emotional Energy Regulation', 'Physical Conditioning', 'Health', 'Connection', 'Honesty & Accountability', 'Discipline', 'Courage', 'Respect', 'Questioning', 'Reflecting', 'Researching', 'Creating', 'Communicating', 'Analyzing Information', 'Evaluating Evidence', 'Making Informed Judgments'];
    if (rubricsAvailable.includes(microSkill)) {
        viewRubricBtn.classList.remove('hidden');
    } else {
        viewRubricBtn.classList.add('hidden');
    }
    if (unsubscribeFromMicroSkillAnecdotes) unsubscribeFromMicroSkillAnecdotes();
    const q = query(collection(db, "anecdotes"), where("studentId", "==", studentId), where("coreSkill", "==", coreSkill), where("microSkill", "==", microSkill));
    unsubscribeFromMicroSkillAnecdotes = onSnapshot(q, (snapshot) => {
        microSkillAnecdoteList.innerHTML = '';
        noMicroSkillAnecdotesMessage.classList.toggle('hidden', !snapshot.empty);
        noMicroSkillAnecdotesMessage.textContent = `There are currently no Anecdotes in ${microSkill}`;
        snapshot.forEach(doc => {
            const anecdote = doc.data();
            const anecdoteId = doc.id;
            const anecdoteCard = document.createElement('div');
            anecdoteCard.className = 'anecdote-card relative p-4 border rounded-lg bg-gray-50';
            let adminButtons = '';
            if (auth.currentUser && auth.currentUser.uid === ADMIN_UID) {
                adminButtons = `
                    <div class="absolute top-2 right-2 flex space-x-2">
                        <button class="edit-anecdote-btn text-gray-500 hover:text-blue-600" data-id="${anecdoteId}" title="Edit">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                        </button>
                        <button class="delete-anecdote-btn text-gray-500 hover:text-red-600" data-id="${anecdoteId}" title="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
                        </button>
                    </div>`;
            }
            const date = anecdote.createdAt?.toDate ? anecdote.createdAt.toDate() : new Date();
            let timestampHTML = `<p class="text-xs text-gray-400 mt-2">Logged on: ${date.toLocaleDateString()}</p>`;
            if (anecdote.editedAt) {
                const editedDate = anecdote.editedAt.toDate();
                timestampHTML += `<p class="text-xs text-gray-400 mt-1 italic">Edited on: ${editedDate.toLocaleDateString()}</p>`;
            }
            const imageHtml = anecdote.imageUrl ? `<img src="${anecdote.imageUrl}" alt="Anecdote Image" class="mt-2 rounded-lg max-w-full h-auto max-h-96">` : '';
            anecdoteCard.innerHTML = `
                ${adminButtons}
                <p class="anecdote-text-content text-gray-600 pr-12">${anecdote.text}</p>
                ${imageHtml}
                ${timestampHTML}`;
            microSkillAnecdoteList.appendChild(anecdoteCard);
        });
    });
}

async function showRubricPage(studentId, coreSkill, microSkill) {
    showView(rubricView);
    rubricTitle.textContent = `${microSkill} Rubric`;
    document.querySelectorAll('.rubric-container').forEach(container => container.classList.add('hidden'));
    let activeTable;
    const rubricMap = {
        'Mindset': document.getElementById('mindset-rubric-container'),
        'Emotional Energy Regulation': document.getElementById('emotional-regulation-rubric-container'),
        'Physical Conditioning': document.getElementById('physical-conditioning-rubric-container'),
        'Health': document.getElementById('health-rubric-container'),
        'Connection': document.getElementById('connection-rubric-container'),
        'Honesty & Accountability': document.getElementById('honesty-accountability-rubric-container'),
        'Discipline': document.getElementById('discipline-rubric-container'),
        'Courage': document.getElementById('courage-rubric-container'),
        'Respect': document.getElementById('respect-rubric-container'),
        'Questioning': document.getElementById('questioning-rubric-container'),
        'Reflecting': document.getElementById('reflecting-rubric-container'),
        'Researching': document.getElementById('researching-rubric-container'),
        'Creating': document.getElementById('creating-rubric-container'),
        'Communicating': document.getElementById('communicating-rubric-container'),
        'Analyzing Information': document.getElementById('analyzing-information-rubric-container'),
        'Evaluating Evidence': document.getElementById('evaluating-evidence-rubric-container'),
        'Making Informed Judgments': document.getElementById('making-informed-judgments-rubric-container')
    };
    const container = rubricMap[microSkill];
    if (container) {
        container.classList.remove('hidden');
        activeTable = container.querySelector('table');
    }
    if (!activeTable) return;
    const user = auth.currentUser;
    const isAdmin = user && user.uid === ADMIN_UID;
    downloadRubricBtn.style.display = isAdmin ? 'block' : 'none';
    activeTable.classList.toggle('admin-clickable', isAdmin);
    activeTable.querySelectorAll('td').forEach(cell => {
        cell.classList.remove('admin-highlight');
    });
    const highlightsRef = doc(db, `students/${studentId}/rubricHighlights/${microSkill.toLowerCase().replace(/\s+/g, '-')}`);
    const highlightsSnap = await getDoc(highlightsRef);
    if (highlightsSnap.exists()) {
        const data = highlightsSnap.data();
        data.highlightedCells?.forEach(cellId => {
            const cell = document.getElementById(cellId);
            if (cell) {
                cell.classList.add('admin-highlight');
            }
        });
    }
}

async function saveRubricHighlights(microSkill) {
    const activeContainer = document.querySelector('.rubric-container:not(.hidden)');
    if (!activeContainer) return;
    const highlightedCells = [];
    activeContainer.querySelectorAll('.admin-highlight').forEach(cell => {
        highlightedCells.push(cell.id);
    });
    const highlightsRef = doc(db, `students/${currentStudentId}/rubricHighlights/${microSkill.toLowerCase().replace(/\s+/g, '-')}`);
    await setDoc(highlightsRef, { highlightedCells });
}

async function showContinuumPage(coreSkill) {
    showView(continuumView);
    continuumTitle.textContent = `${coreSkill} Continuum`;
    continuumTableContainer.innerHTML = '<p class="text-gray-500">Loading continuum...</p>';

    // Generate document ID from the core skill name (e.g., "Critical Thinking" -> "critical-thinking")
    const continuumId = coreSkill.toLowerCase().replace(/\s+/g, '-');
    const continuumRef = doc(db, "continuums", continuumId);
    const continuumSnap = await getDoc(continuumRef);

    if (!continuumSnap.exists()) {
        continuumTableContainer.innerHTML = `<p class="text-red-500">The continuum for "${coreSkill}" has not been created in the database yet.</p>`;
        return;
    }

    const continuumData = continuumSnap.data();
    
    // Start building the table HTML as a string
    let tableHTML = '<table class="rubric-table text-sm">';
    
    // Build the table header row from the 'headers' array in the database
    tableHTML += '<thead><tr>';
    continuumData.headers.forEach((header, index) => {
        const style = index === 0 ? 'style="background-color: var(--accent-primary); color: var(--text-light);"' : '';
        const thClass = index === 0 ? 'skill-label-cell' : '';
        tableHTML += `<th class="${thClass}" ${style}>${header}</th>`;
    });
    tableHTML += '</tr></thead>';

    // Build the table body rows from the 'rows' array in the database
    tableHTML += '<tbody>';
    continuumData.rows.forEach(rowData => {
        tableHTML += '<tr>';
        // First cell is the skill label
        tableHTML += `<td class="skill-label-cell">${rowData.skillLabel.replace(/\n/g, '<br>')}</td>`;
        // The rest of the cells are the level descriptions
        rowData.levels.forEach(levelText => {
            tableHTML += `<td>${levelText}</td>`;
        });
        tableHTML += '</tr>';
    });
    tableHTML += '</tbody></table>';

    // Inject the finished HTML table into the container
    continuumTableContainer.innerHTML = tableHTML;

    // We will re-implement the highlighting logic in a later step
    const activeTable = continuumTableContainer.querySelector('table');
    if (activeTable && currentUserRole === 'admin') {
        activeTable.classList.add('admin-clickable');
    }
}

async function saveContinuumHighlights(coreSkill) {
    const activeContainer = document.querySelector('.continuum-rubric-container:not(.hidden)');
    if (!activeContainer) return;
    const highlightedCells = [];
    activeContainer.querySelectorAll('.admin-highlight').forEach(cell => {
        highlightedCells.push(cell.id);
    });
    const highlightsRef = doc(db, `students/${currentStudentId}/continuumHighlights/${coreSkill.toLowerCase().replace(/\s+/g, '-')}`);
    await setDoc(highlightsRef, { highlightedCells }, { merge: true });
}

function listenForAllAnecdotes() {
    if (unsubscribeFromAllAnecdotes) unsubscribeFromAllAnecdotes();
    const q = query(collection(db, "anecdotes"));
    unsubscribeFromAllAnecdotes = onSnapshot(q, (snapshot) => {
        const coreSkillCounts = { 'Vitality': 0, 'Integrity': 0, 'Curiosity': 0, 'Critical Thinking': 0, 'Fields of Knowledge': 0 };
        snapshot.forEach(doc => {
            const anecdote = doc.data();
            if (coreSkillCounts.hasOwnProperty(anecdote.coreSkill)) {
                coreSkillCounts[anecdote.coreSkill]++;
            }
        });
        renderAllSkillsChart(coreSkillCounts);
    });
}

function renderAllSkillsChart(data) {
    if (allSkillsChart) allSkillsChart.destroy();
    const ctx = allSkillsChartCanvas.getContext('2d');
    allSkillsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: 'Total Anecdotes',
                data: Object.values(data),
                backgroundColor: '#9cb8d9',
                borderWidth: 0
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        precision: 0
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// CHAT LOGIC
async function listenForUsers() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    if (unsubscribeFromUsers) unsubscribeFromUsers();
    userList.innerHTML = '';
    if (currentUser.uid === ADMIN_UID) {
        const usersRef = collection(db, "users");
        unsubscribeFromUsers = onSnapshot(usersRef, (snapshot) => {
            userList.innerHTML = '';
            snapshot.forEach(doc => {
                const userData = doc.data();
                if (userData.uid === currentUser.uid) return;
                const userCard = document.createElement('div');
                userCard.className = 'p-3 border rounded-lg flex items-center justify-between cursor-pointer hover:bg-gray-100';
                userCard.innerHTML = `<span>${userData.displayName || userData.email}</span><button class="text-sm bg-green-500 text-white px-3 py-1 rounded">Message</button>`;
                userCard.addEventListener('click', () => openChat(userData));
                userList.appendChild(userCard);
            });
        });
    } else {
        const chatsRef = collection(db, "chats");
        const q = query(chatsRef, where("participants", "array-contains", currentUser.uid));
        unsubscribeFromUsers = onSnapshot(q, async (snapshot) => {
            userList.innerHTML = '';
            noUsersMessage.classList.toggle('hidden', snapshot.empty);
            for (const chatDoc of snapshot.docs) {
                const participants = chatDoc.data().participants;
                const otherUserId = participants.find(uid => uid !== currentUser.uid);
                if (otherUserId) {
                    const userRef = doc(db, "users", otherUserId);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        const userCard = document.createElement('div');
                        userCard.className = 'p-3 border rounded-lg flex items-center justify-between cursor-pointer hover:bg-gray-100';
                        userCard.innerHTML = `<span>${userData.displayName || userData.email}</span><button class="text-sm bg-green-500 text-white px-3 py-1 rounded">Message</button>`;
                        userCard.addEventListener('click', () => openChat(userData));
                        userList.appendChild(userCard);
                    }
                }
            }
        });
    }
}

function openChat(recipient) {
    chatWithUser.textContent = `Chat with ${recipient.displayName || recipient.email}`;
    chatWithUser.dataset.recipientId = recipient.uid;
    showView(chatView);
    const currentUser = auth.currentUser;
    const chatID = [currentUser.uid, recipient.uid].sort().join('_');
    const messagesRef = collection(db, "chats", chatID, "messages");
    const q = query(messagesRef, orderBy("timestamp", "desc"));
    if (unsubscribeFromMessages) unsubscribeFromMessages();
    unsubscribeFromMessages = onSnapshot(q, (snapshot) => {
        messageList.innerHTML = '';
        snapshot.forEach(doc => {
            const msg = doc.data();
            const isSender = msg.senderId === currentUser.uid;
            const messageEl = document.createElement('div');
            messageEl.className = `p-3 rounded-lg max-w-xs mb-2 break-words ${isSender ? 'bg-green-200 self-end' : 'bg-gray-200 self-start'}`;
            let contentHTML = '';
            if (msg.fileUrl && msg.fileType && msg.fileType.startsWith('image/')) {
                contentHTML += `<img src="${msg.fileUrl}" alt="Image preview" class="chat-image-preview rounded-lg max-w-full h-auto cursor-pointer mb-2">`;
            }
            if (msg.text) {
                contentHTML += `<p>${msg.text}</p>`;
            }
            messageEl.innerHTML = contentHTML;
            messageList.appendChild(messageEl);
        });
    });
}

function listenForAdminMessages() {
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== ADMIN_UID) return;
    const { start, end } = getWeekDates();
    const options = { month: 'long', day: 'numeric' };
    const formattedStartDate = start.toLocaleDateString('en-US', options);
    const formattedEndDate = end.toLocaleDateString('en-US', options);
    const chartTitleEl = document.getElementById('messages-chart-title');
    if (chartTitleEl) {
        chartTitleEl.textContent = `Messages sent the week of ${formattedStartDate} - ${formattedEndDate}`;
    }
    const messagesCollectionGroup = collectionGroup(db, 'messages');
    const q = query(messagesCollectionGroup, where("senderId", "==", ADMIN_UID), where("timestamp", ">=", start), where("timestamp", "<=", end), orderBy("timestamp", "asc"));
    onSnapshot(q, (snapshot) => {
        const dailyCounts = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 };
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        snapshot.forEach(doc => {
            const message = doc.data();
            if (message.timestamp) {
                const date = message.timestamp.toDate();
                const dayIndex = date.getDay();
                const dayName = dayNames[dayIndex];
                if (dayName) {
                    dailyCounts[dayName]++;
                }
            }
        });
        renderMessagesChart(dailyCounts);
    }, (error) => {
        console.error("Error fetching admin messages:", error);
        if (chartTitleEl) { chartTitleEl.textContent = 'Messages Sent This Week'; }
        showMessage("Could not load message chart. See console for details.");
    });
}

function renderMessagesChart(data) {
    if (messagesChart) messagesChart.destroy();
    const ctx = messagesChartCanvas.getContext('2d');
    messagesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: 'Messages Sent',
                data: Object.values(data),
                backgroundColor: 'rgba(52, 211, 153, 0.5)',
                borderColor: 'rgba(5, 150, 105, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function renderParentStudentView(studentId, studentName) {
    parentWelcomeMessage.classList.add('hidden');
    parentStudentView.classList.remove('hidden');
    parentViewStudentName.textContent = studentName;
    parentViewSkillsGrid.innerHTML = '';
    const coreSkills = ['Vitality', 'Integrity', 'Curiosity', 'Critical Thinking', 'Fields of Knowledge'];
    coreSkills.forEach(skill => {
        const skillCard = document.createElement('div');
        skillCard.className = 'skill-card p-4 border rounded-lg cursor-pointer';
        skillCard.dataset.skill = skill;
        skillCard.innerHTML = `<h3 class="font-bold text-center">${skill}</h3>`;
        skillCard.addEventListener('click', () => {
            listenForAnecdotes(studentId, skill, parentAnecdoteChartCanvas, parentAnecdoteListTitle, parentAnecdoteContainer);
        });
        parentViewSkillsGrid.appendChild(skillCard);
    });
}

parentCloseAnecdoteBtn.addEventListener('click', () => {
    parentAnecdoteContainer.classList.add('hidden');
    if (anecdoteChart) {
        anecdoteChart.destroy();
        anecdoteChart = null;
    }
});

async function showJourneyBuilderPage(studentId) {
    selectedJourneyAnecdotes = []; // Reset selections
    showView(journeyBuilderView);
    journeyAnecdoteSelectionList.innerHTML = '<p class="text-gray-500">Loading anecdotes...</p>';
    updateJourneyCounter();

    // Fetch student name
    const studentRef = doc(db, "students", studentId);
    const studentSnap = await getDoc(studentRef);
    if (studentSnap.exists()) {
        journeyStudentName.textContent = `Learning Journey for ${studentSnap.data().name}`;
    }

    // Fetch all anecdotes for this student
    const anecdotesRef = collection(db, "anecdotes");
    const q = query(anecdotesRef, where("studentId", "==", studentId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    journeyAnecdoteSelectionList.innerHTML = '';
    if (querySnapshot.empty) {
        journeyAnecdoteSelectionList.innerHTML = '<p class="text-gray-500">No anecdotes have been recorded for this student yet.</p>';
        return;
    }

    const anecdotesBySkill = {};
    querySnapshot.forEach(doc => {
        const anecdote = { id: doc.id, ...doc.data() };
        const key = `${anecdote.coreSkill} > ${anecdote.microSkill}`;
        if (!anecdotesBySkill[key]) {
            anecdotesBySkill[key] = [];
        }
        anecdotesBySkill[key].push(anecdote);
    });

    for (const skillGroup in anecdotesBySkill) {
        const groupContainer = document.createElement('div');
        groupContainer.innerHTML = `<h3 class="font-bold text-lg text-gray-700 mb-2 border-b pb-2">${skillGroup}</h3>`;
        
        anecdotesBySkill[skillGroup].forEach(anecdote => {
            const date = anecdote.createdAt?.toDate ? anecdote.createdAt.toDate().toLocaleDateString() : 'N/A';
            const anecdoteEl = document.createElement('div');
            anecdoteEl.className = 'flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50';
            anecdoteEl.innerHTML = `
                <input type="checkbox" data-id="${anecdote.id}" class="journey-anecdote-checkbox mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500">
                <label for="anecdote-${anecdote.id}" class="flex-1">
                    <p class="text-gray-800">${anecdote.text}</p>
                    <p class="text-xs text-gray-400 mt-1">Logged on: ${date}</p>
                </label>
            `;
            groupContainer.appendChild(anecdoteEl);
        });
        journeyAnecdoteSelectionList.appendChild(groupContainer);
    }
}

function updateJourneyCounter() {
    const count = selectedJourneyAnecdotes.length;
    journeySelectionCounter.textContent = `${count} anecdote${count !== 1 ? 's' : ''} selected`;
    if (count > 0) {
        generateJourneySummaryBtn.disabled = false;
        generateJourneySummaryBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        generateJourneySummaryBtn.disabled = true;
        generateJourneySummaryBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

// Event Listeners
dashboardBtn.addEventListener('click', () => {
    const isTeacherOrAdmin = currentUserRole === 'admin' || currentUserRole === 'teacher';
    if (isTeacherOrAdmin) {
        showView(dashboardView);
    } else {
        showView(parentDashboardView);
    }
});

messagesBtn.addEventListener('click', () => {
    showView(messagesView);
    listenForUsers();
    if (auth.currentUser.uid === ADMIN_UID) {
        listenForAdminMessages();
    }
});

backToDashboardBtn.addEventListener('click', () => {
    if (auth.currentUser && auth.currentUser.uid === ADMIN_UID) {
        showView(dashboardView);
    } else {
        showView(parentDashboardView);
    }
});

profileLink.addEventListener('click', (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (user) {
        profileName.textContent = user.displayName || 'Not available';
        profileEmail.textContent = user.email;
        showView(profileView);
        profileDropdown.classList.add('hidden');
    }
});

logoutLink.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth);
    profileDropdown.classList.add('hidden');
});

profileMenuBtn.addEventListener('click', () => {
    profileDropdown.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
    if (!document.getElementById('profile-menu-container').contains(e.target)) {
        profileDropdown.classList.add('hidden');
    }
});

backToMessagesBtn.addEventListener('click', () => showView(messagesView));

googleSignInBtn.addEventListener('click', () => signInWithPopup(auth, new GoogleAuthProvider()));

addRecordBtn.addEventListener('click', () => {
    populateClassroomDropdown(); // Populate the dropdown first
    addRecordModal.classList.remove('hidden');
});
closeModalBtn.addEventListener('click', () => addRecordModal.classList.add('hidden'));

addAnecdoteBtn.addEventListener('click', () => {
    updateMicroSkillsDropdown(coreSkillSelect.value);
    addAnecdoteModal.classList.remove('hidden');
});

coreSkillSelect.addEventListener('change', (e) => {
    updateMicroSkillsDropdown(e.target.value);
});

closeAnecdoteModalBtn.addEventListener('click', () => addAnecdoteModal.classList.add('hidden'));

closeAnecdoteDisplayBtn.addEventListener('click', () => {
    anecdoteDisplayContainer.classList.add('hidden');
    if (anecdoteChart) {
        anecdoteChart.destroy();
        anecdoteChart = null;
    }
});

alignedSkillsGrid.addEventListener('click', (e) => {
    const skillCard = e.target.closest('.skill-card');
    if (skillCard) {
        listenForAnecdotes(currentStudentId, skillCard.dataset.skill, anecdoteChartCanvas, anecdoteListTitle, anecdoteDisplayContainer);
        setTimeout(() => {
            anecdoteDisplayContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
});

addStudentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const parent1Email = document.getElementById('parent1Email').value.trim();
    const parent2Email = document.getElementById('parent2Email').value.trim();
    const selectedClassroomId = studentClassSelect.value;
    const selectedClassroomName = studentClassSelect.options[studentClassSelect.selectedIndex].text;

    if (!selectedClassroomId) {
        showMessage("Please select a classroom.");
        return;
    }

    // Save the new student to the database
    await addDoc(collection(db, "students"), {
        name: document.getElementById('studentName').value,
        grade: document.getElementById('studentGrade').value,
        classroomId: selectedClassroomId, // Save the Classroom ID
        className: selectedClassroomName, // Save the Classroom Name for easy display
        parent1Email: parent1Email,
        parent2Email: parent2Email,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser.uid
    });

    addStudentForm.reset();
    addRecordModal.classList.add('hidden');
});

addAnecdoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loadingOverlay.classList.remove('hidden');
    const anecdoteData = {
        studentId: currentStudentId,
        coreSkill: coreSkillSelect.value,
        microSkill: microSkillSelect.value,
        text: document.getElementById('anecdoteText').value,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser.uid,
        imageUrl: null
    };
    const imageFile = document.getElementById('anecdoteImage').files[0];
    try {
        if (imageFile) {
            const storageRef = ref(storage, `anecdotes/${currentStudentId}/${Date.now()}-${imageFile.name}`);
            const uploadResult = await uploadBytes(storageRef, imageFile);
            anecdoteData.imageUrl = await getDownloadURL(uploadResult.ref);
        }
        await addDoc(collection(db, "anecdotes"), anecdoteData);
        showMessage("Anecdote saved successfully!", false);
        addAnecdoteForm.reset();
        addAnecdoteModal.classList.add('hidden');
    } catch (error) {
        console.error("Error adding anecdote:", error);
        showMessage("Failed to save anecdote. Check permissions and try again.");
    } finally {
        loadingOverlay.classList.add('hidden');
    }
});

attachFileBtn.addEventListener('click', () => fileInput.click());

messageList.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('chat-image-preview')) {
        modalImage.src = e.target.src;
        imageModal.classList.remove('hidden');
    }
});

closeImageModalBtn.addEventListener('click', () => imageModal.classList.add('hidden'));

imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) {
        imageModal.classList.add('hidden');
    }
});

fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
        filePreviewName.textContent = file.name;
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => { filePreviewImage.src = e.target.result; };
            reader.readAsDataURL(file);
        } else {
            filePreviewImage.src = 'https://placehold.co/100x100/E2E8F0/4A5568?text=FILE';
        }
        filePreviewContainer.classList.remove('hidden');
    }
});

removeFileBtn.addEventListener('click', () => {
    fileInput.value = '';
    filePreviewContainer.classList.add('hidden');
});

messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value;
    const file = fileInput.files[0];
    if (!text.trim() && !file) return;
    loadingOverlay.classList.remove('hidden');
    const recipientId = chatWithUser.dataset.recipientId;
    if (!recipientId) return;
    const currentUser = auth.currentUser;
    const chatID = [currentUser.uid, recipientId].sort().join('_');
    const messagesRef = collection(db, "chats", chatID, "messages");
    const chatDocRef = doc(db, "chats", chatID);
    try {
        let fileUrl = null,
            fileName = null,
            fileType = null;
        if (file) {
            const storageRef = ref(storage, `chats/${chatID}/${Date.now()}-${file.name}`);
            const uploadResult = await uploadBytes(storageRef, file);
            fileUrl = await getDownloadURL(uploadResult.ref);
            fileName = file.name;
            fileType = file.type;
        }
        await addDoc(messagesRef, {
            text: text,
            senderId: currentUser.uid,
            recipientId: recipientId,
            timestamp: serverTimestamp(),
            fileUrl,
            fileName,
            fileType
        });
        await setDoc(chatDocRef, {
            participants: [currentUser.uid, recipientId],
            lastMessage: file ? (text || 'File sent') : text
        }, { merge: true });
        messageInput.value = '';
        fileInput.value = '';
        filePreviewContainer.classList.add('hidden');
    } catch (error) {
        console.error("Error sending message: ", error);
        showMessage("Failed to send message.");
    } finally {
        loadingOverlay.classList.add('hidden');
    }
});

backToStudentDetailBtn.addEventListener('click', () => showStudentDetailPage(currentStudentId));

deleteAccountBtn.addEventListener('click', () => {
    deleteConfirmModal.classList.remove('hidden');
});

cancelDeleteBtn.addEventListener('click', () => {
    deleteConfirmModal.classList.add('hidden');
});

confirmDeleteBtn.addEventListener('click', async () => {
    loadingOverlay.classList.remove('hidden');
    deleteConfirmModal.classList.add('hidden');
    const deleteUserData = httpsCallable(functions, 'deleteUserData');
    try {
        const result = await deleteUserData();
        console.log(result.data.message);
        showMessage("Your account has been successfully deleted.", false);
    } catch (error) {
        console.error("Deletion failed:", error);
        showMessage("Could not delete your account. Please try again.");
        loadingOverlay.classList.add('hidden');
    }
});

viewRubricBtn.addEventListener('click', () => {
    showRubricPage(currentStudentId, currentCoreSkill, currentMicroSkill);
});

backToAnecdotesBtn.addEventListener('click', () => {
    showMicroSkillDetailPage(currentStudentId, currentCoreSkill, currentMicroSkill);
});

buildContinuumBtn.addEventListener('click', () => {
    showContinuumPage(currentCoreSkill);
});

backToStudentDetailFromContinuumBtn.addEventListener('click', () => {
    showStudentDetailPage(currentStudentId);
});

rubricView.addEventListener('click', (e) => {
    const user = auth.currentUser;
    if (user && user.uid === ADMIN_UID && e.target.tagName === 'TD' && e.target.id) {
        e.target.classList.toggle('admin-highlight');
        saveRubricHighlights(currentMicroSkill);
    }
});

continuumView.addEventListener('click', (e) => {
    const user = auth.currentUser;
    if (user && user.uid === ADMIN_UID && e.target.tagName === 'TD' && e.target.id) {
        e.target.classList.toggle('admin-highlight');
        saveContinuumHighlights(currentCoreSkill);
    }
});

downloadRubricBtn.addEventListener('click', () => downloadOptionsModal.classList.remove('hidden'));
downloadContinuumBtn.addEventListener('click', () => downloadOptionsModal.classList.remove('hidden'));
cancelDownloadBtn.addEventListener('click', () => downloadOptionsModal.classList.add('hidden'));

downloadPngBtn.addEventListener('click', async () => {
    downloadOptionsModal.classList.add('hidden');
    loadingOverlay.classList.remove('hidden');
    let elementToCapture, fileName;
    if (!rubricView.classList.contains('hidden')) {
        elementToCapture = document.querySelector('.rubric-container:not(.hidden) .rubric-table');
        const studentNameText = studentDetailName.textContent.trim() || 'student';
        fileName = `${currentMicroSkill}-rubric-${studentNameText}.png`;
    } else if (!continuumView.classList.contains('hidden')) {
        elementToCapture = document.querySelector('.continuum-rubric-container:not(.hidden) .rubric-table');
        const studentNameText = studentDetailName.textContent.trim() || 'student';
        fileName = `${currentCoreSkill}-continuum-${studentNameText}.png`;
    }
    if (!elementToCapture) {
        loadingOverlay.classList.add('hidden');
        return;
    }
    elementToCapture.style.border = 'none';
    elementToCapture.querySelectorAll('th, td').forEach(el => el.style.border = '');
    try {
        const canvas = await html2canvas(elementToCapture, { scale: 2 });
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = fileName;
        link.click();
    } catch (error) {
        console.error("Error generating PNG:", error);
        showMessage("Could not download as PNG.");
    } finally {
        elementToCapture.style.border = '';
        elementToCapture.querySelectorAll('th, td').forEach(el => el.style.border = '');
        loadingOverlay.classList.add('hidden');
    }
});

downloadPdfBtn.addEventListener('click', async () => {
    downloadOptionsModal.classList.add('hidden');
    loadingOverlay.classList.remove('hidden');
    let elementToCapture, fileName;
    if (!rubricView.classList.contains('hidden')) {
        elementToCapture = document.querySelector('.rubric-container:not(.hidden) .rubric-table');
        const studentNameText = studentDetailName.textContent.trim() || 'student';
        fileName = `${currentMicroSkill}-rubric-${studentNameText}.pdf`;
    } else if (!continuumView.classList.contains('hidden')) {
        elementToCapture = document.querySelector('.continuum-rubric-container:not(.hidden) .rubric-table');
        const studentNameText = studentDetailName.textContent.trim() || 'student';
        fileName = `${currentCoreSkill}-continuum-${studentNameText}.pdf`;
    }
    if (!elementToCapture) {
        loadingOverlay.classList.add('hidden');
        return;
    }
    elementToCapture.style.border = 'none';
    elementToCapture.querySelectorAll('th, td').forEach(el => el.style.border = 'none');
    const { jsPDF } = window.jspdf;
    try {
        const canvas = await html2canvas(elementToCapture, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(fileName);
    } catch (error) {
        console.error("Error generating PDF:", error);
        showMessage("Could not download as PDF.");
    } finally {
        elementToCapture.style.border = '';
        elementToCapture.querySelectorAll('th, td').forEach(el => el.style.border = '');
        loadingOverlay.classList.add('hidden');
    }
});

microSkillAnecdoteList.addEventListener('click', (e) => {
    const editButton = e.target.closest('.edit-anecdote-btn');
    const deleteButton = e.target.closest('.delete-anecdote-btn');
    if (editButton) {
        const anecdoteId = editButton.dataset.id;
        const anecdoteCard = editButton.closest('.anecdote-card');
        const anecdoteText = anecdoteCard.querySelector('.anecdote-text-content').textContent;
        document.getElementById('editAnecdoteText').value = anecdoteText;
        editAnecdoteModal.dataset.id = anecdoteId;
        editAnecdoteModal.classList.remove('hidden');
    }
    if (deleteButton) {
        const anecdoteId = deleteButton.dataset.id;
        deleteAnecdoteConfirmModal.dataset.id = anecdoteId;
        deleteAnecdoteConfirmModal.classList.remove('hidden');
    }
});

closeEditAnecdoteModalBtn.addEventListener('click', () => {
    editAnecdoteModal.classList.add('hidden');
});

editAnecdoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const anecdoteId = editAnecdoteModal.dataset.id;
    const newText = document.getElementById('editAnecdoteText').value;
    if (!anecdoteId || !newText.trim()) return;
    loadingOverlay.classList.remove('hidden');
    const anecdoteRef = doc(db, "anecdotes", anecdoteId);
    try {
        await updateDoc(anecdoteRef, {
            text: newText,
            editedAt: serverTimestamp()
        });
        showMessage("Anecdote updated successfully!", false);
        editAnecdoteModal.classList.add('hidden');
    } catch (error) {
        console.error("Error updating anecdote:", error);
        showMessage("Failed to update anecdote.");
    } finally {
        loadingOverlay.classList.add('hidden');
    }
});

cancelDeleteAnecdoteBtn.addEventListener('click', () => {
    deleteAnecdoteConfirmModal.classList.add('hidden');
});

confirmDeleteAnecdoteBtn.addEventListener('click', async () => {
    const anecdoteId = deleteAnecdoteConfirmModal.dataset.id;
    if (!anecdoteId) return;
    loadingOverlay.classList.remove('hidden');
    const anecdoteRef = doc(db, "anecdotes", anecdoteId);
    try {
        await deleteDoc(anecdoteRef);
        showMessage("Anecdote deleted successfully.", false);
        deleteAnecdoteConfirmModal.classList.add('hidden');
    } catch (error) {
        console.error("Error deleting anecdote:", error);
        showMessage("Failed to delete anecdote.");
    } finally {
        loadingOverlay.classList.add('hidden');
    }
});

buildJourneyBtn.addEventListener('click', () => {
    if (currentStudentId) {
        showJourneyBuilderPage(currentStudentId);
    }
});

backToStudentFromJourneyBtn.addEventListener('click', () => {
    if (currentStudentId) {
        showStudentDetailPage(currentStudentId);
    }
});

journeyAnecdoteSelectionList.addEventListener('click', (e) => {
    if (e.target.classList.contains('journey-anecdote-checkbox')) {
        const anecdoteId = e.target.dataset.id;
        if (e.target.checked) {
            if (!selectedJourneyAnecdotes.includes(anecdoteId)) {
                selectedJourneyAnecdotes.push(anecdoteId);
            }
        } else {
            selectedJourneyAnecdotes = selectedJourneyAnecdotes.filter(id => id !== anecdoteId);
        }
        updateJourneyCounter();
    }
});

generateJourneySummaryBtn.addEventListener('click', async () => {
    if (selectedJourneyAnecdotes.length === 0) {
        showMessage("Please select at least one anecdote.");
        return;
    }

    loadingOverlay.classList.remove('hidden');

    try {
        const studentName = journeyStudentName.textContent.replace('Learning Journey for ', '');
        const generateSummary = httpsCallable(functions, 'generateJourneySummary');

        const result = await generateSummary({
            studentName: studentName,
            anecdoteIds: selectedJourneyAnecdotes
        });

        journeyEditorTitle.textContent = `Learning Journey Draft for ${studentName}`;
        journeySummaryTextarea.value = result.data.summary;
        showView(journeyEditorView);

    } catch (error) {
        console.error("Error generating summary:", error);
        showMessage("Could not generate summary. Please check the function logs and try again.");
    } finally {
        loadingOverlay.classList.add('hidden');
    }
});

backToJourneyBuilderBtn.addEventListener('click', () => {
    showView(journeyBuilderView);
});

downloadJourneyPdfBtn.addEventListener('click', () => {
    const studentName = journeyEditorTitle.textContent.replace('Learning Journey Draft for ', '');
    const summaryText = journeySummaryTextarea.value;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    pdf.setFontSize(18);
    pdf.text(`Learning Journey for ${studentName}`, 14, 22);

    pdf.setFontSize(12);
    const splitText = pdf.splitTextToSize(summaryText, 180); // Split text to fit page width
    pdf.text(splitText, 14, 32);

    pdf.save(`Learning-Journey-${studentName.replace(/\s+/g, '-')}.pdf`);
});

// Add these to the end of app.js

async function showUsersPage() {
    showView(usersView);
    usersListBody.innerHTML = '<tr><td colspan="2" class="text-center p-4">Loading users...</td></tr>';
    
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);

    usersListBody.innerHTML = '';
    snapshot.forEach(doc => {
        const user = doc.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `
			<td class="px-6 py-4 whitespace-nowrap">
				<div class="text-sm text-gray-900">${user.displayName || user.email}</div>
				<div class="text-sm text-gray-500">${user.email}</div>
			</td>
			<td class="px-6 py-4 whitespace-nowrap">
				<select data-uid="${user.uid}" class="role-select bg-gray-50 border border-gray-300 text-sm rounded-lg p-2">
					<option value="guest" ${user.role === 'guest' ? 'selected' : ''}>Guest</option>
					<option value="parent" ${user.role === 'parent' ? 'selected' : ''}>Parent</option> 
					<option value="teacher" ${user.role === 'teacher' ? 'selected' : ''}>Teacher</option>
					<option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
				</select>
			</td>
		`;;
        usersListBody.appendChild(tr);
    });
}

async function updateUserRole(userId, newRole) {
    const userRef = doc(db, "users", userId);
    try {
        await updateDoc(userRef, { role: newRole });
        showMessage("User role updated successfully!", false);
    } catch (error) {
        console.error("Error updating user role:", error);
        showMessage("Failed to update user role.");
    }
}

usersListBody.addEventListener('change', (e) => {
    if (e.target.classList.contains('role-select')) {
        const userId = e.target.dataset.uid;
        const newRole = e.target.value;
        if (userId && newRole) {
            updateUserRole(userId, newRole);
        }
    }
});

// --- CLASSROOM MANAGEMENT ---

let teachers = []; // Cache for teacher list

async function populateTeacherDropdown(dropdownElement) {
    dropdownElement.innerHTML = '<option value="">Select a teacher</option>';
    
    // Fetch all users with the 'teacher' role
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("role", "==", "teacher"));
    const snapshot = await getDocs(q);
    
    teachers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (teachers.length === 0) {
        dropdownElement.innerHTML = '<option value="">No teachers found</option>';
        return;
    }

    teachers.forEach(teacher => {
        const option = document.createElement('option');
        option.value = teacher.id;
        option.textContent = teacher.displayName || teacher.email;
        dropdownElement.appendChild(option);
    });
}

async function populateClassroomDropdown() {
    studentClassSelect.innerHTML = '<option value="" disabled selected>Loading classrooms...</option>';
    
    const q = query(collection(db, "classrooms"), orderBy("className"));
    const snapshot = await getDocs(q);

    studentClassSelect.innerHTML = '<option value="" disabled selected>Select a classroom</option>'; // Reset after loading

    if (snapshot.empty) {
        studentClassSelect.innerHTML = '<option value="" disabled>No classrooms found</option>';
        return;
    }

    snapshot.forEach(doc => {
        const classroom = doc.data();
        const option = document.createElement('option');
        option.value = doc.id; // The value is the unique Classroom ID
        option.textContent = classroom.className; // The text is the classroom name
        studentClassSelect.appendChild(option);
    });
}

function listenForClassrooms() {
    const q = query(collection(db, "classrooms"));
    onSnapshot(q, (snapshot) => {
        classroomsList.innerHTML = '';
        if (snapshot.empty) {
            classroomsList.innerHTML = '<p class="text-gray-500">No classrooms created yet.</p>';
            return;
        }
        snapshot.forEach(doc => {
            const classroom = doc.data();
            const classroomId = doc.id;
            const card = document.createElement('div');
            card.className = 'p-4 border rounded-lg flex justify-between items-center';
            card.innerHTML = `
                <div>
                    <p class="font-bold text-lg">${classroom.className}</p>
                    <p class="text-sm text-gray-500">Teacher: ${classroom.teacherName}</p>
                </div>
                <div class="space-x-2">
                    <button class="edit-classroom-btn text-sm text-blue-600 hover:underline" data-id="${classroomId}">Edit</button>
                    <button class="delete-classroom-btn text-sm text-red-600 hover:underline" data-id="${classroomId}">Delete</button>
                </div>
            `;
            classroomsList.appendChild(card);
        });
    });
}

async function showClassroomsPage() {
    showView(classroomsView);
    await populateTeacherDropdown(teacherSelectDropdown);
    listenForClassrooms();
}

async function deleteClassroom(classroomId) {
    if (confirm('Are you sure you want to delete this classroom? This cannot be undone.')) {
        try {
            await deleteDoc(doc(db, "classrooms", classroomId));
            showMessage("Classroom deleted successfully.", false);
        } catch (error) {
            console.error("Error deleting classroom: ", error);
            showMessage("Failed to delete classroom.");
        }
    }
}

// --- Event Listeners for Classroom Management ---

classroomsLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentUserRole === 'admin') {
        showClassroomsPage();
        profileDropdown.classList.add('hidden');
    }
});

createClassroomForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const selectedTeacherId = teacherSelectDropdown.value;
    const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

    if (!selectedTeacher) {
        showMessage("Please select a valid teacher.");
        return;
    }
    
    try {
        await addDoc(collection(db, "classrooms"), {
            className: newClassroomName.value,
            teacherId: selectedTeacher.id,
            teacherName: selectedTeacher.displayName || selectedTeacher.email,
            createdAt: serverTimestamp()
        });
        showMessage("Classroom created successfully!", false);
        createClassroomForm.reset();
    } catch (error) {
        console.error("Error creating classroom: ", error);
        showMessage("Failed to create classroom.");
    }
});

classroomsList.addEventListener('click', async (e) => {
    const classroomId = e.target.dataset.id;
    if (e.target.classList.contains('delete-classroom-btn')) {
        deleteClassroom(classroomId);
    }
    if (e.target.classList.contains('edit-classroom-btn')) {
        const classroomRef = doc(db, "classrooms", classroomId);
        const classroomSnap = await getDoc(classroomRef);
        if (classroomSnap.exists()) {
            const classroom = classroomSnap.data();
            editClassroomName.value = classroom.className;
            await populateTeacherDropdown(editTeacherSelect);
            editTeacherSelect.value = classroom.teacherId;
            editClassroomModal.dataset.id = classroomId;
            editClassroomModal.classList.remove('hidden');
        }
    }
});

closeEditClassroomModalBtn.addEventListener('click', () => {
    editClassroomModal.classList.add('hidden');
});

editClassroomForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const classroomId = editClassroomModal.dataset.id;
    const selectedTeacherId = editTeacherSelect.value;
    const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

    if (!classroomId || !selectedTeacher) {
        showMessage("An error occurred. Please try again.");
        return;
    }

    const classroomRef = doc(db, "classrooms", classroomId);
    try {
        await updateDoc(classroomRef, {
            className: editClassroomName.value,
            teacherId: selectedTeacher.id,
            teacherName: selectedTeacher.displayName || selectedTeacher.email
        });
        showMessage("Classroom updated successfully!", false);
        editClassroomModal.classList.add('hidden');
    } catch (error) {
        console.error("Error updating classroom: ", error);
        showMessage("Failed to update classroom.");
    }
});

// --- PARENT MESSAGING FUNCTIONS ---

async function showParentMessageModal() {
    messageOptionsContainer.innerHTML = '<p class="text-gray-500">Loading parent info...</p>';
    messageParentsModal.classList.remove('hidden');

    const studentRef = doc(db, "students", currentStudentId);
    const studentSnap = await getDoc(studentRef);

    if (!studentSnap.exists()) {
        messageOptionsContainer.innerHTML = '<p class="text-red-500">Could not find student record.</p>';
        return;
    }

    const student = studentSnap.data();
    messageModalStudentName.textContent = `Message Parents of ${student.name}`;
    messageOptionsContainer.innerHTML = ''; // Clear loading message

    let parentEmailsFound = false;

    if (student.parent1Email) {
        parentEmailsFound = true;
        const btn = document.createElement('button');
        btn.className = 'w-full btn btn-secondary message-parent-btn';
        btn.textContent = `Message Parent 1 (${student.parent1Email})`;
        btn.dataset.email = student.parent1Email;
        messageOptionsContainer.appendChild(btn);
    }

    if (student.parent2Email) {
        parentEmailsFound = true;
        const btn = document.createElement('button');
        btn.className = 'w-full btn btn-secondary message-parent-btn';
        btn.textContent = `Message Parent 2 (${student.parent2Email})`;
        btn.dataset.email = student.parent2Email;
        messageOptionsContainer.appendChild(btn);
    }

    if (!parentEmailsFound) {
        messageOptionsContainer.innerHTML = '<p class="text-gray-500">No parent emails are on file for this student.</p>';
    }
}

async function initiateChatWithParent(parentEmail) {
    loadingOverlay.classList.remove('hidden');
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", parentEmail));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            showMessage("This parent has not created an account on the platform yet.");
            return;
        }

        const parentUserDoc = snapshot.docs[0];
        const parentData = parentUserDoc.data();
        
        // Reuse the existing openChat function
        openChat(parentData);
        
        // Close the modal after initiating the chat
        messageParentsModal.classList.add('hidden');

    } catch (error) {
        console.error("Error finding parent user:", error);
        showMessage("Could not start chat. Please see console for details.");
    } finally {
        loadingOverlay.classList.add('hidden');
    }
}

// --- Parent Messaging Listeners ---

contactParentsBtn.addEventListener('click', () => {
    if (currentStudentId) {
        showParentMessageModal();
    }
});

closeMessageParentsModalBtn.addEventListener('click', () => {
    messageParentsModal.classList.add('hidden');
});

messageOptionsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('message-parent-btn')) {
        const parentEmail = e.target.dataset.email;
        if (parentEmail) {
            initiateChatWithParent(parentEmail);
        }
    }
});

// --- NOTIFICATION SETTINGS ---

async function showSettingsPage() {
    showView(settingsView);
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists() && docSnap.data().notificationSettings) {
        const settings = docSnap.data().notificationSettings;
        anecdoteEmailsToggle.checked = settings.newAnecdote;
        messageEmailsToggle.checked = settings.newMessage;
    }
}

async function updateNotificationSetting(settingName, value) {
    const user = auth.currentUser;
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    try {
        // Use dot notation to update a field within a map
        await updateDoc(userRef, {
            [`notificationSettings.${settingName}`]: value
        });
        showMessage("Settings saved!", false);
    } catch (error) {
        console.error("Error updating settings:", error);
        showMessage("Could not save settings.");
    }
}

settingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    showSettingsPage();
    profileDropdown.classList.add('hidden');
});

anecdoteEmailsToggle.addEventListener('change', (e) => {
    updateNotificationSetting('newAnecdote', e.target.checked);
});

messageEmailsToggle.addEventListener('change', (e) => {
    updateNotificationSetting('newMessage', e.target.checked);
});