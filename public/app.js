// --- Handle Stripe Redirect Immediately ---
const urlParamsOnLoad = new URLSearchParams(window.location.search);
if (urlParamsOnLoad.has('session_id')) {
    console.log("Stripe session ID found in URL. Setting postCheckout flag.");
    sessionStorage.setItem('postCheckout', 'true');
    console.log("postCheckout flag SET to:", sessionStorage.getItem('postCheckout'));
    window.history.replaceState({}, document.title, window.location.pathname);
}

// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, getDocs, setDoc, collection, addDoc, query, onSnapshot, orderBy, serverTimestamp, where, collectionGroup, updateDoc, deleteDoc, deleteField } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";

// Firebase Config
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
window.auth = auth;
const db = getFirestore(app);
// Shared Google provider + popup guard
const googleProvider = new GoogleAuthProvider();
let isAuthPopupOpen = false;
const storage = getStorage(app);
// Explicitly set functions region to avoid mismatch
const functions = getFunctions(app, 'us-central1');

// --- DOM Elements (Complete List) ---
const loadingOverlay = document.getElementById('loading-overlay');
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const googleSignInBtn = document.getElementById('google-signin-btn');
const userEmailDisplay = document.getElementById('user-email-display');
const navSchoolLogo = document.getElementById('nav-school-logo');
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
// Track per-classroom student listeners when grouping by classroom on dashboard
let unsubscribeFromClassrooms = null;
const classroomStudentUnsubs = new Map();
const noStudentsMessage = document.getElementById('no-students-message');
const studentDetailName = document.getElementById('student-detail-name');
const addRecordBtn = document.getElementById('addRecordBtn');
const addRecordModal = document.getElementById('addRecordModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const addStudentForm = document.getElementById('addStudentForm');
// Teacher invitation elements
const addTeacherBtn = document.getElementById('addTeacherBtn');
const addTeacherModal = document.getElementById('addTeacherModal');
const closeAddTeacherModalBtn = document.getElementById('closeAddTeacherModalBtn');
const addTeacherForm = document.getElementById('addTeacherForm');
const teacherEmailInput = document.getElementById('teacherEmailInput');
const addAnecdoteBtn = document.getElementById('add-anecdote-btn');
// Bulk anecdote elements
const bulkAddAnecdoteBtn = document.getElementById('bulk-add-anecdote-btn');
const bulkAddAnecdoteModal = document.getElementById('bulkAddAnecdoteModal');
const closeBulkAnecdoteModalBtn = document.getElementById('closeBulkAnecdoteModalBtn');
const bulkAddAnecdoteForm = document.getElementById('bulkAddAnecdoteForm');
const bulkClassroomSelect = document.getElementById('bulkClassroomSelect');
const bulkStudentList = document.getElementById('bulk-student-list');
const bulkSelectAllStudents = document.getElementById('bulkSelectAllStudents');
const bulkCoreSkillSelect = document.getElementById('bulkCoreSkill');
const bulkMicroSkillSelect = document.getElementById('bulkMicroSkill');
const addAnecdoteModal = document.getElementById('addAnecdoteModal');
const closeAnecdoteModalBtn = document.getElementById('closeAnecdoteModalBtn');
const addAnecdoteForm = document.getElementById('addAnecdoteForm');
const assessmentTypeChartCanvas = document.getElementById('assessment-type-chart');
const contentTypeChartCanvas = document.getElementById('content-type-chart');
const coreSkillSelect = document.getElementById('coreSkill');
const microSkillSelect = document.getElementById('microSkill');
const anecdoteDisplayContainer = document.getElementById('anecdote-display-container');
const anecdoteListTitle = document.getElementById('anecdote-list-title');
const anecdoteChartCanvas = document.getElementById('anecdote-chart');
const closeAnecdoteDisplayBtn = document.getElementById('close-anecdote-display-btn');
const microSkillDetailView = document.getElementById('micro-skill-detail-view');
const microSkillTitle = document.getElementById('micro-skill-title');
// microSkillDescription removed as per your new `showMicroSkillDetailPage`
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
const downloadOptionsModal = document.getElementById('download-options-modal');
const downloadDocxBtn = document.getElementById('download-docx-btn');
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
const studentAssessmentTypeChartCanvas = document.getElementById('student-assessment-type-chart');
const parentCloseAnecdoteBtn = document.getElementById('parent-close-anecdote-display-btn');
const continuumView = document.getElementById('continuum-view');
const buildContinuumBtn = document.getElementById('build-continuum-btn');
const continuumTitle = document.getElementById('continuum-title');
const downloadContinuumBtn = document.getElementById('download-continuum-btn');
const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
const backToStudentFromContinuumBtn = document.getElementById('back-to-student-from-continuum-btn');
const buildJourneyBtn = document.getElementById('build-journey-btn');
const journeyBuilderView = document.getElementById('journey-builder-view');
const journeyStudentName = document.getElementById('journey-student-name');
const backToStudentFromJourneyBtn = document.getElementById('back-to-student-from-journey-btn');
const journeyAnecdoteSelectionList = document.getElementById('journey-anecdote-selection-list');
const journeySelectionCounter = document.getElementById('journey-selection-counter');
const generateJourneySummaryBtn = document.getElementById('generate-journey-summary-btn');
const journeyEditorView = document.getElementById('journey-editor-view');
const journeyEditorTitle = document.getElementById('journey-editor-title');
const journeyTitleInput = document.getElementById('journey-title-input');
const backToJourneyBuilderBtn = document.getElementById('back-to-journey-builder-btn');
const journeySummaryTextarea = document.getElementById('journey-summary-textarea');
const downloadJourneyPdfBtn = document.getElementById('download-journey-pdf-btn');
const downloadJourneyDocxBtn = document.getElementById('download-journey-docx-btn');
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
const superadminSchoolPicker = document.getElementById('superadmin-school-picker');
const superadminSchoolSelect = document.getElementById('superadmin-school-select');
const messageEmailsToggle = document.getElementById('message-emails-toggle');
const continuumTableContainer = document.getElementById('continuum-table-container');
const rubricView = document.getElementById('rubric-view');
const viewRubricBtn = document.getElementById('view-rubric-btn');
const backToAnecdotesBtn = document.getElementById('back-to-anecdotes-btn');
const downloadRubricBtn = document.getElementById('download-rubric-btn');
const rubricTitle = document.getElementById('rubric-title');
const editContinuumBtn = document.getElementById('edit-continuum-btn');
const saveContinuumBtn = document.getElementById('save-continuum-btn');
const cancelContinuumBtn = document.getElementById('cancel-continuum-btn');
const rubricTableContainer = document.getElementById('rubric-table-container');
const editRubricBtn = document.getElementById('edit-rubric-btn');
const saveRubricBtn = document.getElementById('save-rubric-btn');
const cancelRubricBtn = document.getElementById('cancel-rubric-btn');
const subscribeBtn = document.getElementById('subscribe-btn');
const subscriptionModal = document.getElementById('subscription-modal');
const closeSubscriptionModalBtn = document.getElementById('close-subscription-modal-btn');
const selectMonthlyPlanBtn = document.getElementById('select-monthly-plan-btn');
const selectYearlyPlanBtn = document.getElementById('select-yearly-plan-btn');
const subscriptionInactiveView = document.getElementById('subscription-inactive-view');
const resubscribeBtn = document.getElementById('resubscribe-btn');
const schoolNameModal = document.getElementById('school-name-modal');
const schoolNameForm = document.getElementById('school-name-form');
const schoolNameInput = document.getElementById('schoolNameInput');
const skillsView = document.getElementById('skills-view');
const skillsLink = document.getElementById('skills-link');
const skillsListContainer = document.getElementById('skills-list-container');
const addCoreSkillBtn = document.getElementById('add-core-skill-btn');
const getOriginalTemplateBtn = document.getElementById('get-original-template-btn');
const resetSkillsConfirmModal = document.getElementById('reset-skills-confirm-modal');
const confirmResetSkillsBtn = document.getElementById('confirm-reset-skills-btn');
const cancelResetSkillsBtn = document.getElementById('cancel-reset-skills-btn');
const editSkillModal = document.getElementById('edit-skill-modal');
const closeEditSkillModalBtn = document.getElementById('close-edit-skill-modal-btn');
const cancelEditSkillBtn = document.getElementById('cancel-edit-skill-btn');
const editSkillForm = document.getElementById('edit-skill-form');
const editSkillModalTitle = document.getElementById('edit-skill-modal-title');
const editSkillId = document.getElementById('editSkillId');
const coreSkillNameInput = document.getElementById('coreSkillNameInput');
const microSkillsContainer = document.getElementById('micro-skills-container');
const addMicroSkillBtn = document.getElementById('add-micro-skill-btn');
const deleteSkillConfirmModal = document.getElementById('delete-skill-confirm-modal');
const cancelDeleteSkillBtn = document.getElementById('cancel-delete-skill-btn');
const confirmDeleteSkillBtn = document.getElementById('confirm-delete-skill-btn');
const schoolLogoSettings = document.getElementById('school-logo-settings');
const schoolThemeSettings = document.getElementById('school-theme-settings');
const schoolLogoInput = document.getElementById('school-logo-input');
const uploadSchoolLogoBtn = document.getElementById('upload-school-logo-btn');
const schoolLogoPreviewContainer = document.getElementById('school-logo-preview-container');
const schoolLogoPreview = document.getElementById('school-logo-preview');
const customThemeControls = document.getElementById('custom-theme-controls');
const customBaseColorInput = document.getElementById('custom-base-color');
const customContrastColorInput = document.getElementById('custom-contrast-color');
const customNeutralColorInput = document.getElementById('custom-neutral-color');
const customThemeApplyBtn = document.getElementById('custom-theme-apply-btn');
const customThemePreview = document.getElementById('custom-theme-preview');
const customThemePreviewPrimary = customThemePreview ? customThemePreview.querySelector('[data-preview="primary"]') : null;
const customThemePreviewSecondary = customThemePreview ? customThemePreview.querySelector('[data-preview="secondary"]') : null;
const customThemePreviewTertiary = customThemePreview ? customThemePreview.querySelector('[data-preview="tertiary"]') : null;
const saveThemeSelectionBtn = document.getElementById('save-theme-selection-btn');
const dashboardLeftStudentGrid = document.getElementById('dashboard-left-student-grid');
const retroHeaderText = document.querySelector('.retro-header-text');

// App State
let currentStudentId = null,
    currentCoreSkill = null,
    currentMicroSkill = null;
let unsubscribeFromUsers, unsubscribeFromMessages, unsubscribeFromStudents, unsubscribeFromAnecdotes, unsubscribeFromMicroSkillAnecdotes, unsubscribeFromAllAnecdotes;
let anecdoteChart = null,
    allSkillsChart = null,
    messagesChart = null,
    assessmentTypeChart = null,
    studentAssessmentTypeChart = null,
    contentTypeChart = null;
let selectedJourneyAnecdotes = [];
let currentJourneyStudentName = '';

// --- Journey Selection Persistence ---
// Runtime mode: 'firestore' | 'local' (set to 'local' after first permission-denied)
window.__journeySelStoreMode = window.__journeySelStoreMode || 'firestore';
window.__journeySelWarnedRead = false;
window.__journeySelWarnedWrite = false;
async function getSavedJourneySelection(studentId) {
    const user = auth.currentUser;
    if (!user) return [];
    if (window.__journeySelStoreMode === 'local') {
        try {
            const key = `journeySel:${user.uid}:${studentId}`;
            const raw = localStorage.getItem(key);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (_) {}
        return [];
    }
    try {
        // Prefer per-user subcollection for safer rules
        const selRef = doc(db, 'users', user.uid, 'journeySelections', studentId);
        const snap = await getDoc(selRef);
        if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data.anecdoteIds)) return data.anecdoteIds;
        }
    } catch (e) {
        if (e && e.code === 'permission-denied') {
            if (!window.__journeySelWarnedRead) {
                console.warn('Saved journey selection not accessible by rules; using local storage.');
                window.__journeySelWarnedRead = true;
            }
            window.__journeySelStoreMode = 'local';
        } else {
            console.error('Error reading saved journey selection:', e);
        }
        // Fallback to localStorage if rules block Firestore access
        try {
            const key = `journeySel:${user.uid}:${studentId}`;
            const raw = localStorage.getItem(key);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (_) {}
    }
    return [];
}

async function saveJourneySelection(studentId, anecdoteIds) {
    const user = auth.currentUser;
    if (!user) return;
    if (window.__journeySelStoreMode === 'local') {
        try {
            const key = `journeySel:${user.uid}:${studentId}`;
            localStorage.setItem(key, JSON.stringify(Array.from(new Set(anecdoteIds))));
        } catch (_) {}
        return;
    }
    try {
        const selRef = doc(db, 'users', user.uid, 'journeySelections', studentId);
        await setDoc(selRef, {
            userId: user.uid,
            studentId,
            schoolId: currentUserSchoolId || null,
            anecdoteIds: Array.from(new Set(anecdoteIds)),
            updatedAt: serverTimestamp()
        }, { merge: true });
    } catch (e) {
        if (e && e.code === 'permission-denied') {
            if (!window.__journeySelWarnedWrite) {
                console.warn('Cannot save journey selection to Firestore due to rules; falling back to local storage.');
                window.__journeySelWarnedWrite = true;
            }
            window.__journeySelStoreMode = 'local';
        } else {
            console.error('Error saving journey selection:', e);
        }
        // Fallback to localStorage if rules block Firestore access
        try {
            const key = `journeySel:${user.uid}:${studentId}`;
            localStorage.setItem(key, JSON.stringify(Array.from(new Set(anecdoteIds))));
        } catch (_) {}
    }
}

// Debounced save to reduce Firestore channel churn
let _journeySelDebounceTimer = null;
function debouncedSaveJourneySelection(studentId, anecdoteIds, delayMs = 600) {
    try { if (_journeySelDebounceTimer) clearTimeout(_journeySelDebounceTimer); } catch (_) {}
    _journeySelDebounceTimer = setTimeout(() => {
        saveJourneySelection(studentId, anecdoteIds);
    }, delayMs);
}

// --- Helpers for Bulk Anecdotes ---
async function populateBulkClassroomSelect() {
    if (!bulkClassroomSelect) return;
    bulkClassroomSelect.innerHTML = '<option value="" disabled selected>Loading classrooms...</option>';
    if (!currentUserSchoolId) {
        bulkClassroomSelect.innerHTML = '<option value="" disabled>School ID not found</option>';
        return;
    }
    let options = [];
    if (currentUserRole === 'teacher') {
        if (!currentUserClassroomId) {
            bulkClassroomSelect.innerHTML = '<option value="" disabled>No classroom assigned</option>';
            return;
        }
        const classroomRef = doc(db, 'classrooms', currentUserClassroomId);
        const snap = await getDoc(classroomRef);
        if (snap.exists()) {
            options.push({ id: snap.id, name: (snap.data().className || 'My Classroom') });
        }
    } else if (currentUserRole === 'schoolAdmin') {
        const q = query(collection(db, 'classrooms'), where('schoolId', '==', currentUserSchoolId), orderBy('className'));
        const snapshot = await getDocs(q);
        snapshot.forEach(d => options.push({ id: d.id, name: (d.data().className || 'Unnamed Classroom') }));
    } else {
        bulkClassroomSelect.innerHTML = '<option value="" disabled>Not allowed</option>';
        return;
    }
    if (options.length === 0) {
        bulkClassroomSelect.innerHTML = '<option value="" disabled>No classrooms found</option>';
        return;
    }
    bulkClassroomSelect.innerHTML = '';
    options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.id; o.textContent = opt.name; bulkClassroomSelect.appendChild(o);
    });
    // Preselect teacher classroom
    if (currentUserRole === 'teacher' && currentUserClassroomId) {
        bulkClassroomSelect.value = currentUserClassroomId;
    }
}

async function loadBulkStudentsForClassroom(classroomId) {
    if (!bulkStudentList) return;
    bulkStudentList.innerHTML = '<p class="text-gray-500">Loading students...</p>';
    if (!classroomId || !currentUserSchoolId) {
        bulkStudentList.innerHTML = '<p class="text-gray-500">Select a classroom to see students.</p>';
        return;
    }
    const q = query(collection(db, 'students'), where('schoolId', '==', currentUserSchoolId), where('classroomId', '==', classroomId), orderBy('name'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        bulkStudentList.innerHTML = '<p class="text-gray-500">No students in this classroom.</p>';
        return;
    }
    const frag = document.createDocumentFragment();
    snapshot.forEach(d => {
        const s = d.data();
        const row = document.createElement('label');
        row.className = 'flex items-center space-x-2 py-1';
        row.innerHTML = `<input type="checkbox" class="bulk-student-checkbox rounded" data-id="${d.id}"><span>${s.name || 'Unnamed'}</span>`;
        frag.appendChild(row);
    });
    bulkStudentList.innerHTML = '';
    bulkStudentList.appendChild(frag);
}

function populateBulkCoreSkills() {
    if (!bulkCoreSkillSelect) return;
    bulkCoreSkillSelect.innerHTML = '<option value="" disabled selected>Select Core Skill</option>';
    (schoolCoreSkills || []).forEach(skill => {
        const option = document.createElement('option');
        option.value = skill.name;
        option.textContent = skill.name;
        bulkCoreSkillSelect.appendChild(option);
    });
    updateBulkMicroSkillsDropdown(bulkCoreSkillSelect.value);
}

function updateBulkMicroSkillsDropdown(selectedCoreSkill) {
    if (!bulkMicroSkillSelect) return;
    bulkMicroSkillSelect.innerHTML = '';
    const microSkills = (schoolMicroSkills || []).filter(ms => ms.coreSkillName === selectedCoreSkill).map(ms => ms.name);
    if (microSkills.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'No micro skills found';
        option.disabled = true;
        bulkMicroSkillSelect.appendChild(option);
        return;
    }
    microSkills.forEach(skill => {
        const option = document.createElement('option');
        option.value = skill;
        option.textContent = skill;
        bulkMicroSkillSelect.appendChild(option);
    });
}
let currentUserRole = null;
let currentUserClassroomId = null;
let currentUserSchoolId = null;
let selectedSchoolId = null; // SuperAdmin-selected school context

function getActiveSchoolId() {
    if (currentUserRole === 'superAdmin' && selectedSchoolId) return selectedSchoolId;
    return currentUserSchoolId;
}
let teachers = []; // Cache for teacher list
let schoolCoreSkills = [];
let schoolMicroSkills = [];
let isRubricEditMode = false;
let isContinuumEditMode = false;
let originalContinuumData = null;
let currentTheme = 'default';
let currentCustomTheme = null;
let themeControlsInitialized = false;
let savedTheme = 'default';
let savedCustomTheme = null;
let pendingThemeSelection = null;
let pendingCustomTheme = null;
let themeSaveInProgress = false;


// --- Helper Functions ---
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

const defaultCustomThemeConfig = {
    base: '#4f46e5',
    contrast: '#f97316',
    neutral: '#10b981'
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const normalizeHex = (hex, fallback = '#000000') => {
    if (typeof hex !== 'string') return fallback;
    let cleaned = hex.trim();
    if (!cleaned.startsWith('#')) cleaned = `#${cleaned}`;
    if (cleaned.length === 4) {
        cleaned = `#${cleaned[1]}${cleaned[1]}${cleaned[2]}${cleaned[2]}${cleaned[3]}${cleaned[3]}`;
    }
    return /^#([0-9A-Fa-f]{6})$/.test(cleaned) ? cleaned.toLowerCase() : fallback;
};

const hexToRgb = (hex) => {
    const normalized = normalizeHex(hex);
    const bigint = parseInt(normalized.slice(1), 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
};

const rgbToHex = (r, g, b) => {
    const toHex = (value) => value.toString(16).padStart(2, '0');
    return `#${toHex(clamp(Math.round(r), 0, 255))}${toHex(clamp(Math.round(g), 0, 255))}${toHex(clamp(Math.round(b), 0, 255))}`;
};

const hexToHsl = (hex) => {
    const { r, g, b } = hexToRgb(hex);
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    let h, s;
    const l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case rNorm:
                h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
                break;
            case gNorm:
                h = (bNorm - rNorm) / d + 2;
                break;
            default:
                h = (rNorm - gNorm) / d + 4;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
};

const hslToHex = (h, s, l) => {
    const hue = clamp(h, 0, 360) / 360;
    const saturation = clamp(s, 0, 100) / 100;
    const lightness = clamp(l, 0, 100) / 100;

    if (saturation === 0) {
        const gray = lightness * 255;
        return rgbToHex(gray, gray, gray);
    }

    const hueToRgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };

    const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
    const p = 2 * lightness - q;

    const r = hueToRgb(p, q, hue + 1 / 3);
    const g = hueToRgb(p, q, hue);
    const b = hueToRgb(p, q, hue - 1 / 3);

    return rgbToHex(r * 255, g * 255, b * 255);
};

const adjustLightness = (hex, delta) => {
    const { h, s, l } = hexToHsl(hex);
    return hslToHex(h, s, clamp(l + delta, 0, 100));
};

const shiftHue = (hex, delta) => {
    const { h, s, l } = hexToHsl(hex);
    const hue = (h + delta + 360) % 360;
    return hslToHex(hue, s, l);
};

const hexWithAlpha = (hex, alpha) => {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
};

const generateCustomPalette = ({ base, contrast, neutral }) => {
    const baseHex = normalizeHex(base, '#4f46e5');
    const contrastHex = normalizeHex(contrast, shiftHue(baseHex, 30));
    const neutralHex = normalizeHex(neutral, adjustLightness(baseHex, 25));

    const accentPrimary = baseHex;
    const accentPrimaryHover = adjustLightness(baseHex, -7);
    const accentSecondary = contrastHex;
    const accentSecondaryHover = adjustLightness(contrastHex, -7);
    const accentTertiary = neutralHex;
    const accentTertiaryHover = adjustLightness(neutralHex, -7);
    const chartColor1 = adjustLightness(baseHex, 10);
    const chartColor2 = adjustLightness(contrastHex, 5);
    const chartBorder2 = adjustLightness(baseHex, -15);
    const chartColor3 = hexWithAlpha(neutralHex, 0.4);
    const chartBorder3 = adjustLightness(neutralHex, -10);
    const borderSecondary = adjustLightness(baseHex, 35);

    return {
        accentPrimary,
        accentPrimaryHover,
        accentSecondary,
        accentSecondaryHover,
        accentTertiary,
        accentTertiaryHover,
        chartColor1,
        chartColor2,
        chartBorder2,
        chartColor3,
        chartBorder3,
        borderSecondary
    };
};

const applyCustomThemeVariables = (palette) => {
    if (!palette) return;
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--accent-primary', palette.accentPrimary);
    rootStyle.setProperty('--accent-primary-hover', palette.accentPrimaryHover);
    rootStyle.setProperty('--accent-secondary', palette.accentSecondary);
    rootStyle.setProperty('--accent-secondary-hover', palette.accentSecondaryHover);
    rootStyle.setProperty('--accent-tertiary', palette.accentTertiary);
    rootStyle.setProperty('--accent-tertiary-hover', palette.accentTertiaryHover);
    rootStyle.setProperty('--chart-color-1', palette.chartColor1);
    rootStyle.setProperty('--chart-color-2', palette.chartColor2);
    rootStyle.setProperty('--chart-border-2', palette.chartBorder2);
    rootStyle.setProperty('--chart-color-3', palette.chartColor3);
    rootStyle.setProperty('--chart-border-3', palette.chartBorder3);
    rootStyle.setProperty('--border-secondary', palette.borderSecondary);
};

const resetCustomThemeVariables = () => {
    const rootStyle = document.documentElement.style;
    ['--accent-primary', '--accent-primary-hover', '--accent-secondary', '--accent-secondary-hover', '--accent-tertiary', '--accent-tertiary-hover', '--chart-color-1', '--chart-color-2', '--chart-border-2', '--chart-color-3', '--chart-border-3', '--border-secondary'].forEach(variable => {
        rootStyle.removeProperty(variable);
    });
};

const defaultParsedColor = { r: 58, g: 46, b: 31, a: 1 };

const parseCssColor = (value) => {
    if (!value) return { ...defaultParsedColor };
    const trimmed = value.trim();
    if (trimmed.startsWith('#')) {
        const { r, g, b } = hexToRgb(trimmed);
        return { r, g, b, a: 1 };
    }
    const rgbaMatch = trimmed.match(/^rgba?\((.+)\)$/i);
    if (rgbaMatch) {
        const parts = rgbaMatch[1].split(',').map(part => part.trim());
        const r = parseFloat(parts[0]);
        const g = parseFloat(parts[1]);
        const b = parseFloat(parts[2]);
        const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
        if ([r, g, b].every(component => Number.isFinite(component))) {
            return {
                r: clamp(Math.round(r), 0, 255),
                g: clamp(Math.round(g), 0, 255),
                b: clamp(Math.round(b), 0, 255),
                a: clamp(Number.isNaN(a) ? 1 : a, 0, 1)
            };
        }
    }
    return { ...defaultParsedColor };
};

const rgbaString = ({ r, g, b, a = 1 }) => {
    const alpha = clamp(a, 0, 1);
    return `rgba(${clamp(Math.round(r), 0, 255)}, ${clamp(Math.round(g), 0, 255)}, ${clamp(Math.round(b), 0, 255)}, ${Math.round(alpha * 1000) / 1000})`;
};

const withAlpha = (color, alpha) => ({
    r: clamp(color.r, 0, 255),
    g: clamp(color.g, 0, 255),
    b: clamp(color.b, 0, 255),
    a: clamp(alpha, 0, 1)
});

const mixColors = (color, target, amount = 0.5) => ({
    r: clamp(color.r + (target.r - color.r) * amount, 0, 255),
    g: clamp(color.g + (target.g - color.g) * amount, 0, 255),
    b: clamp(color.b + (target.b - color.b) * amount, 0, 255),
    a: clamp(color.a + (target.a - color.a) * amount, 0, 1)
});

const lightenColor = (color, amount = 0.2) => mixColors(color, { r: 255, g: 255, b: 255, a: color.a }, amount);
const darkenColor = (color, amount = 0.2) => mixColors(color, { r: 0, g: 0, b: 0, a: color.a }, amount);

const createVerticalGradient = (ctx, baseColor) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height || 1);
    gradient.addColorStop(0, rgbaString(withAlpha(lightenColor(baseColor, 0.25), 0.95)));
    gradient.addColorStop(0.5, rgbaString(withAlpha(baseColor, Math.max(baseColor.a, 0.85))));
    gradient.addColorStop(1, rgbaString(withAlpha(darkenColor(baseColor, 0.2), Math.max(baseColor.a, 0.9))));
    return gradient;
};

const createBarVisuals = (ctx, colorValue) => {
    const baseColor = parseCssColor(colorValue);
    return {
        background: createVerticalGradient(ctx, baseColor),
        border: rgbaString(darkenColor(baseColor, 0.35)),
        hoverBackground: rgbaString(lightenColor(baseColor, 0.12)),
        hoverBorder: rgbaString(darkenColor(baseColor, 0.45))
    };
};

const getSuggestedYAxisMax = (values) => {
    if (!Array.isArray(values) || values.length === 0) return 4;
    const highest = Math.max(...values);
    if (!Number.isFinite(highest) || highest <= 0) return 4;
    if (highest <= 2) return 3;
    return highest + Math.ceil(highest * 0.25);
};

const createBaseBarOptions = (style) => {
    const textValue = style?.getPropertyValue('--text-dark')?.trim() || '#3a2e1f';
    const textColor = parseCssColor(textValue);
    const axisColor = rgbaString(darkenColor(textColor, 0.1));
    const gridColor = rgbaString(withAlpha(lightenColor(textColor, 0.75), 0.25));
    const tooltipBg = rgbaString(withAlpha(darkenColor(textColor, 0.45), 0.92));
    const tooltipBorder = rgbaString(withAlpha(lightenColor(textColor, 0.6), 0.4));

    return {
        responsive: true,
        animation: { duration: 750, easing: 'easeOutCubic' },
        layout: { padding: { top: 24, right: 20, bottom: 24, left: 20 } },
        scales: {
            x: {
                grid: { display: false, drawBorder: false },
                ticks: {
                    color: axisColor,
                    font: { size: 12, weight: '600', family: "'Inter', 'Segoe UI', sans-serif" },
                    maxRotation: 0,
                    autoSkipPadding: 16
                },
                border: { display: false }
            },
            y: {
                beginAtZero: true,
                grid: { color: gridColor, drawBorder: false, drawTicks: false },
                ticks: {
                    stepSize: 1,
                    precision: 0,
                    padding: 10,
                    color: axisColor,
                    font: { size: 12, weight: '500', family: "'Inter', 'Segoe UI', sans-serif" }
                },
                border: { display: false }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: tooltipBg,
                borderColor: tooltipBorder,
                borderWidth: 1,
                titleColor: '#ffffff',
                bodyColor: '#fdfaf5',
                displayColors: false,
                padding: 12,
                cornerRadius: 10,
                titleFont: { size: 14, weight: '700', family: "'Inter', 'Segoe UI', sans-serif" },
                bodyFont: { size: 12, weight: '500', family: "'Inter', 'Segoe UI', sans-serif" }
            },
            softShadow: {
                enable: true,
                color: rgbaString(withAlpha(darkenColor(textColor, 0.75), 0.18)),
                blur: 18,
                offsetX: 0,
                offsetY: 12
            },
            barValueLabels: {
                display: true,
                fontSize: 12,
                fontWeight: 600,
                color: axisColor,
                padding: 12
            }
        },
        interaction: { intersect: false, mode: 'index' }
    };
};

const softShadowPlugin = {
    id: 'softShadow',
    beforeDatasetsDraw(chart, _args, pluginOptions) {
        if (!pluginOptions || pluginOptions.enable === false) return;
        const { ctx } = chart;
        ctx.save();
        ctx.shadowColor = pluginOptions.color || 'rgba(15, 23, 42, 0.18)';
        ctx.shadowBlur = pluginOptions.blur ?? 18;
        ctx.shadowOffsetX = pluginOptions.offsetX ?? 0;
        ctx.shadowOffsetY = pluginOptions.offsetY ?? 12;
    },
    afterDatasetsDraw(chart, _args, pluginOptions) {
        if (!pluginOptions || pluginOptions.enable === false) return;
        chart.ctx.restore();
    }
};

const barValueLabelsPlugin = {
    id: 'barValueLabels',
    afterDatasetsDraw(chart, _args, pluginOptions) {
        if (chart.config.type !== 'bar') return;
        const opts = pluginOptions || {};
        if (opts.display === false) return;
        const datasetMeta = chart.getDatasetMeta(0);
        if (!datasetMeta) return;
        const data = chart.data.datasets[0]?.data || [];
        const { ctx } = chart;
        const fontSize = opts.fontSize ?? 12;
        const fontWeight = opts.fontWeight ?? 600;
        const fontFamily = opts.fontFamily ?? (Chart?.defaults?.font?.family || "'Inter', 'Segoe UI', sans-serif");
        const fillColor = opts.color ?? Chart?.defaults?.color ?? '#3a2e1f';
        const padding = opts.padding ?? 10;
        const showZero = opts.showZero ?? false;
        const formatter = typeof opts.formatter === 'function' ? opts.formatter : (value) => value;

        ctx.save();
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = fillColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        datasetMeta.data.forEach((element, index) => {
            if (!element || element.hidden) return;
            const value = data[index];
            if (value === undefined || value === null) return;
            if (!showZero && Number(value) === 0) return;
            const { x, y } = element.tooltipPosition();
            ctx.fillText(formatter(value, index, chart), x, y - padding);
        });

        ctx.restore();
    }
};

if (window.Chart) {
    Chart.register(softShadowPlugin, barValueLabelsPlugin);
    Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";
    Chart.defaults.font.weight = '500';
    Chart.defaults.color = '#3a2e1f';
    Chart.defaults.plugins.tooltip.bodySpacing = 4;
    Chart.defaults.plugins.tooltip.boxPadding = 6;
}

const destroyChartInstance = (chart) => {
    if (!chart) return;
    if (chart.$responsiveHandler) {
        window.removeEventListener('resize', chart.$responsiveHandler);
        delete chart.$responsiveHandler;
    }
    if (chart.canvas) {
        chart.canvas.style.height = '';
        chart.canvas.removeAttribute('height');
        if (chart.canvas.parentNode && chart.canvas.parentNode.style) {
            chart.canvas.parentNode.style.height = '';
        }
    }
    delete chart.$currentHeight;
    chart.destroy();
};

const resolveChartContainerWidth = (chart) => {
    const canvas = chart?.canvas;
    if (!canvas) return window.innerWidth || 0;
    const parent = canvas.parentNode;
    if (parent) {
        const width = parent.clientWidth;
        if (Number.isFinite(width) && width > 0) return width;
        const rectWidth = parent.getBoundingClientRect?.().width;
        if (Number.isFinite(rectWidth) && rectWidth > 0) return rectWidth;
    }
    if (Number.isFinite(chart?.width) && chart.width > 0) return chart.width;
    return window.innerWidth || 0;
};

const computeResponsiveChartHeight = (width) => {
    if (!Number.isFinite(width) || width <= 0) return 320;
    if (width <= 340) return 220;
    if (width <= 400) return 236;
    if (width <= 480) return 248;
    if (width <= 560) return 264;
    if (width <= 640) return 280;
    if (width <= 768) return 298;
    if (width <= 960) return 320;
    if (width <= 1200) return 348;
    if (width <= 1440) return 368;
    return 388;
};

const updateBarChartViewportOptions = (chart) => {
    if (!chart) return;
    const dataset = chart.data?.datasets?.[0];
    const options = chart.options;
    if (!dataset || !options || !options.scales || !options.scales.x || !options.scales.y) return;

    dataset.$baseMaxBarThickness = dataset.$baseMaxBarThickness ?? dataset.maxBarThickness ?? 60;
    dataset.$baseBarPercentage = dataset.$baseBarPercentage ?? dataset.barPercentage ?? 0.7;
    dataset.$baseCategoryPercentage = dataset.$baseCategoryPercentage ?? dataset.categoryPercentage ?? 0.58;
    dataset.$baseBorderRadius = dataset.$baseBorderRadius ?? dataset.borderRadius ?? 12;

    const containerWidth = resolveChartContainerWidth(chart);
    const targetHeight = computeResponsiveChartHeight(containerWidth);

    options.maintainAspectRatio = false;
    options.resizeDelay = 120;

    if (chart.canvas && Number.isFinite(targetHeight) && targetHeight > 0) {
        if (chart.$currentHeight !== targetHeight) {
            chart.$currentHeight = targetHeight;
            chart.canvas.style.height = `${targetHeight}px`;
            chart.canvas.removeAttribute('height');
            const parentEl = chart.canvas.parentNode;
            if (parentEl && parentEl.style) {
                parentEl.style.height = `${targetHeight}px`;
            }
        }
    }

    const labels = chart.data.labels || [];
    const values = Array.isArray(dataset.data) ? dataset.data : [];
    const hasValues = values.some(value => Number(value) > 0);
    const longLabels = labels.some(label => (label || '').length > 12);
    const labelCount = labels.length;

    const isTinyContainer = containerWidth <= 400;
    const isCompactContainer = containerWidth <= 640;
    const viewportSmall = window.matchMedia('(max-width: 640px)').matches;
    const viewportMedium = window.matchMedia('(max-width: 1024px)').matches;

    const isSmall = viewportSmall || isTinyContainer;
    const isMedium = !isSmall && (viewportMedium || isCompactContainer);

    const targetBuckets = isSmall ? 4 : isMedium ? 5 : 6;
    const suggestedMax = getSuggestedYAxisMax(values);
    const stepSize = values.length ? Math.max(1, Math.ceil(suggestedMax / targetBuckets)) : 1;

    options.layout = options.layout || {};
    options.layout.padding = isSmall
        ? { top: 14, right: 12, bottom: 18, left: 12 }
        : isMedium
            ? { top: 18, right: 16, bottom: 22, left: 16 }
            : { top: 24, right: 20, bottom: 24, left: 20 };

    const xTicks = options.scales.x.ticks;
    const yTicks = options.scales.y.ticks;

    xTicks.font = xTicks.font || {};
    yTicks.font = yTicks.font || {};

    xTicks.font.size = isSmall ? 10 : 12;
    yTicks.font.size = isSmall ? 10 : 12;
    yTicks.padding = isSmall ? 6 : 10;

    yTicks.stepSize = stepSize;
    yTicks.precision = 0;
    options.scales.y.suggestedMax = suggestedMax;
    options.scales.y.grace = '15%';

    const autoSkip = labelCount > (isSmall ? (isTinyContainer ? 3 : 4) : isMedium ? 9 : 12);
    const smallMaxTicks = isSmall ? (isTinyContainer ? 4 : 5) : undefined;
    xTicks.autoSkip = autoSkip;
    xTicks.maxTicksLimit = autoSkip
        ? Math.max(3, Math.min(isSmall ? smallMaxTicks : isMedium ? 7 : labelCount, labelCount))
        : undefined;
    xTicks.minRotation = 0;
    xTicks.maxRotation = longLabels
        ? (isSmall ? (isTinyContainer ? 55 : 50) : isMedium ? 30 : 25)
        : (autoSkip ? (isSmall ? (isTinyContainer ? 28 : 20) : 12) : 0);
    xTicks.padding = isSmall ? 6 : 8;

    const tooltipOpts = options.plugins?.tooltip;
    if (tooltipOpts) {
        tooltipOpts.padding = isSmall ? 10 : 12;
        tooltipOpts.titleFont = tooltipOpts.titleFont || {};
        tooltipOpts.bodyFont = tooltipOpts.bodyFont || {};
        tooltipOpts.titleFont.size = isSmall ? 12 : 14;
        tooltipOpts.bodyFont.size = isSmall ? 11 : 12;
    }

    const labelPlugin = options.plugins?.barValueLabels;
    if (labelPlugin) {
        labelPlugin.display = hasValues && !isSmall;
        labelPlugin.fontSize = isSmall ? 11 : 12;
        labelPlugin.padding = isSmall ? 8 : 12;
    }

    if (options.plugins?.softShadow) {
        options.plugins.softShadow.enable = hasValues;
    }

    const baseMax = dataset.$baseMaxBarThickness;
    const baseBarPct = dataset.$baseBarPercentage;
    const baseCategoryPct = dataset.$baseCategoryPercentage;
    const baseRadius = dataset.$baseBorderRadius;

    dataset.borderRadius = isSmall ? Math.min(baseRadius, 10) : baseRadius;
    dataset.maxBarThickness = isSmall
        ? Math.max(isTinyContainer ? 26 : 32, Math.round(baseMax * (isTinyContainer ? 0.6 : 0.68)))
        : isMedium
            ? Math.max(36, Math.round(baseMax * 0.85))
            : baseMax;
    dataset.barPercentage = isSmall
        ? Math.max(0.5, Math.min(isTinyContainer ? 0.68 : 0.72, Number((baseBarPct - (isTinyContainer ? 0.1 : 0.08)).toFixed(2))))
        : isMedium
            ? Math.max(0.54, Math.min(0.7, Number((baseBarPct - 0.04).toFixed(2))))
            : baseBarPct;
    dataset.categoryPercentage = isSmall
        ? Math.max(0.44, Math.min(isTinyContainer ? 0.6 : 0.64, Number((baseCategoryPct - (isTinyContainer ? 0.06 : 0.04)).toFixed(2))))
        : isMedium
            ? Math.max(0.5, Math.min(0.64, Number((baseCategoryPct - 0.02).toFixed(2))))
            : baseCategoryPct;
};

const attachResponsiveHandler = (chart) => {
    if (!chart) return;
    const handler = () => {
        window.requestAnimationFrame(() => {
            if (!chart || chart._destroyed) return;
            updateBarChartViewportOptions(chart);
            chart.update('none');
        });
    };
    updateBarChartViewportOptions(chart);
    chart.update('none');
    chart.$responsiveHandler = handler;
    window.addEventListener('resize', handler);
};

const updateCustomThemePreview = (customThemeConfig) => {
    if (!customThemePreviewPrimary || !customThemeConfig) return;
    const palette = generateCustomPalette(customThemeConfig);
    customThemePreviewPrimary.style.backgroundColor = palette.accentPrimary;
    if (customThemePreviewSecondary) customThemePreviewSecondary.style.backgroundColor = palette.accentSecondary;
    if (customThemePreviewTertiary) customThemePreviewTertiary.style.backgroundColor = palette.accentTertiary;
};

const toggleCustomThemeControls = (isVisible) => {
    if (!customThemeControls) return;
    if (isVisible) {
        customThemeControls.classList.remove('hidden');
        if (saveThemeSelectionBtn) {
            saveThemeSelectionBtn.classList.add('hidden');
            saveThemeSelectionBtn.disabled = true;
        }
    } else {
        customThemeControls.classList.add('hidden');
    }
    updateSaveButtonsState();
};

const getCustomThemeFromInputs = () => {
    if (!customBaseColorInput || !customContrastColorInput || !customNeutralColorInput) return null;
    return {
        base: customBaseColorInput.value,
        contrast: customContrastColorInput.value,
        neutral: customNeutralColorInput.value
    };
};

const setCustomThemeInputs = (customThemeConfig) => {
    if (!customThemeConfig || !customBaseColorInput) return;
    if (customThemeConfig.base) customBaseColorInput.value = normalizeHex(customThemeConfig.base);
    if (customThemeConfig.contrast) customContrastColorInput.value = normalizeHex(customThemeConfig.contrast);
    if (customThemeConfig.neutral) customNeutralColorInput.value = normalizeHex(customThemeConfig.neutral);
    updateCustomThemePreview(customThemeConfig);
};

const normalizeCustomThemeConfig = (config) => {
    if (!config) return null;
    return {
        base: normalizeHex(config.base, '#4f46e5'),
        contrast: normalizeHex(config.contrast, '#f97316'),
        neutral: normalizeHex(config.neutral, '#10b981')
    };
};

const areCustomThemesEqual = (a, b) => {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.base === b.base && a.contrast === b.contrast && a.neutral === b.neutral;
};

const setThemeSaveInProgress = (isSaving) => {
    themeSaveInProgress = isSaving;
    updateSaveButtonsState();
};

const updateSaveButtonsState = () => {
    if (saveThemeSelectionBtn) {
        const shouldShowPresetSave = pendingThemeSelection && pendingThemeSelection !== 'custom' && pendingThemeSelection !== savedTheme;
        if (shouldShowPresetSave) {
            saveThemeSelectionBtn.classList.remove('hidden');
            saveThemeSelectionBtn.disabled = themeSaveInProgress;
        } else {
            saveThemeSelectionBtn.classList.add('hidden');
            saveThemeSelectionBtn.disabled = true;
        }
    }

    if (customThemeApplyBtn) {
        if (currentTheme === 'custom') {
            const activeConfig = normalizeCustomThemeConfig(getCustomThemeFromInputs() || currentCustomTheme || pendingCustomTheme || savedCustomTheme || defaultCustomThemeConfig);
            const isMatchingSaved = savedTheme === 'custom' && areCustomThemesEqual(activeConfig, savedCustomTheme);
            customThemeApplyBtn.disabled = themeSaveInProgress || isMatchingSaved;
        } else {
            customThemeApplyBtn.disabled = true;
        }
    }
};

const initializeThemeControls = () => {
    if (themeControlsInitialized) return;
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const themeName = btn.dataset.theme;
            if (themeName === 'custom') {
                const currentInputs = getCustomThemeFromInputs();
                const fallbackConfig = normalizeCustomThemeConfig(currentCustomTheme || currentInputs || defaultCustomThemeConfig);
                currentCustomTheme = fallbackConfig;
                pendingThemeSelection = 'custom';
                pendingCustomTheme = fallbackConfig;
                setCustomThemeInputs(fallbackConfig);
                toggleCustomThemeControls(true);
                applyTheme('custom', fallbackConfig, { isPreview: true });
            } else {
                pendingThemeSelection = themeName;
                pendingCustomTheme = null;
                toggleCustomThemeControls(false);
                applyTheme(themeName, null, { isPreview: true });
            }
            updateSaveButtonsState();
        });
    });

    [customBaseColorInput, customContrastColorInput, customNeutralColorInput].forEach(input => {
        if (!input) return;
        input.addEventListener('input', () => {
            const config = normalizeCustomThemeConfig(getCustomThemeFromInputs());
            if (!config) return;
            pendingThemeSelection = 'custom';
            pendingCustomTheme = config;
            currentCustomTheme = config;
            updateCustomThemePreview(config);
            if (currentTheme === 'custom') {
                applyCustomThemeVariables(generateCustomPalette(config));
            }
            updateSaveButtonsState();
        });
    });

    if (customThemeApplyBtn) {
        customThemeApplyBtn.addEventListener('click', () => {
            const config = normalizeCustomThemeConfig(getCustomThemeFromInputs());
            if (!config) return;
            pendingThemeSelection = 'custom';
            pendingCustomTheme = config;
            saveThemePreference('custom', config);
        });
    }

    if (saveThemeSelectionBtn) {
        saveThemeSelectionBtn.addEventListener('click', () => {
            if (!pendingThemeSelection || pendingThemeSelection === 'custom') return;
            saveThemePreference(pendingThemeSelection);
        });
    }

    themeControlsInitialized = true;
    updateSaveButtonsState();
};

// --- UPDATED `showView` ---
const showView = (viewToShow) => {
    [dashboardView, parentDashboardView, messagesView, chatView, studentDetailView, microSkillDetailView, profileView, rubricView, continuumView, journeyBuilderView, journeyEditorView, usersView, classroomsView, settingsView, skillsView, subscriptionInactiveView].forEach(view => {
        if (view) view.classList.add('hidden');
    });
    if (viewToShow) viewToShow.classList.remove('hidden');
};

// Renders input fields for micro-skills in the edit modal
function renderMicroSkillInputs(microSkills = []) {
    microSkillsContainer.innerHTML = ''; // Clear existing inputs
    microSkills.forEach((ms, index) => {
        const div = document.createElement('div');
        div.className = 'flex items-center space-x-2';
        div.innerHTML = `
            <input type="text" value="${ms.name}" placeholder="Micro Skill Name" class="micro-skill-name flex-grow bg-gray-50 border border-gray-300 text-sm rounded-lg p-2">
            <input type="text" value="${ms.description}" placeholder="Description (Optional)" class="micro-skill-desc flex-grow bg-gray-50 border border-gray-300 text-sm rounded-lg p-2">
            <button type="button" class="remove-micro-skill-btn text-red-500 hover:text-red-700">&times;</button>
        `;
        microSkillsContainer.appendChild(div);
    });
}

// --- UPDATED `updateMicroSkillsDropdown` ---
const updateMicroSkillsDropdown = (selectedCoreSkill) => {
    microSkillSelect.innerHTML = '';
    const microSkills = schoolMicroSkills.filter(ms => ms.coreSkillName === selectedCoreSkill).map(ms => ms.name);
    if (microSkills.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'No micro skills found';
        option.disabled = true;
        microSkillSelect.appendChild(option);
        return;
    }
    microSkills.forEach(skill => {
        const option = document.createElement('option');
        option.value = skill;
        option.textContent = skill;
        microSkillSelect.appendChild(option);
    });
};


// --- UPDATED `onAuthStateChanged` ---
onAuthStateChanged(auth, async (user) => {
    console.log("onAuthStateChanged fired. User:", user ? user.email : "none");
    loadingOverlay.classList.remove('hidden');
    currentUserRole = null; currentUserClassroomId = null; currentUserSchoolId = null; selectedSchoolId = null;

    if (user) {
        // Step 1: Force Token Refresh
        console.log("Forcing token refresh...");
        await user.getIdToken(true);
        console.log("Token refreshed.");

        // Step 2: Create/Get User Profile
        const userSnap = await createUserProfileIfNeeded(user);
        const userData = userSnap.exists() ? userSnap.data() : {};
        currentUserRole = userData.role || 'guest';
        currentUserSchoolId = userData.schoolId || null;

        // Step 3: Check if Guest is Parent
        if (currentUserRole === 'guest' && user.email) {
            try {
                console.log("User is guest, checking if they are a parent...");
                const checkIfParent = httpsCallable(functions, 'checkIfParent');
                const result = await checkIfParent();
                currentUserRole = result.data.role;
                console.log("Parent check complete. Final role:", currentUserRole);
            } catch (error) {
                 console.error("Error calling checkIfParent function:", error);
                 currentUserRole = 'guest';
            }
        }
        // Step 3b: If still guest, check invited-teacher list (callable)
        if (currentUserRole === 'guest' && user.email) {
            try {
                const checkIfInvitedTeacher = httpsCallable(functions, 'checkIfInvitedTeacher');
                const result = await checkIfInvitedTeacher();
                if (result?.data?.isInvited && result?.data?.schoolId) {
                    currentUserRole = 'teacher';
                    currentUserSchoolId = result.data.schoolId;
                }
            } catch (err) {
                console.error('Error checking invited teacher status:', err);
            }
        }
        console.log(`User logged in. Final role: ${currentUserRole}, SchoolID: ${currentUserSchoolId}`);

		if (retroHeaderText) {
            // If teacher, show their name. If Admin, show "School Admin" or School Name
            if(currentUserRole === 'teacher') {
                retroHeaderText.textContent = userData.displayName || "Teacher";
            } else if (['schoolAdmin', 'superAdmin', 'admin'].includes(currentUserRole)) {
                retroHeaderText.textContent = "Administrator"; 
                // Or fetch school name if preferred:
                // retroHeaderText.textContent = schoolSnap.data().name; 
            } else {
                retroHeaderText.textContent = "Dashboard";
            }
        }
		
        // Step 4: App Setup
        document.body.classList.remove('login-background', 'bg-overlay');
        appContainer.classList.remove('hidden');
        authContainer.classList.add('hidden');
        userEmailDisplay.textContent = user.email;
        // Load and apply school logo to the header if available
        try {
            const url = await getSchoolLogoUrl();
            if (url && navSchoolLogo) {
                navSchoolLogo.src = url;
            } else if (navSchoolLogo) {
                navSchoolLogo.src = '/images/InfinityEducation.webp';
            }
        } catch (e) {
            if (navSchoolLogo) navSchoolLogo.src = '/images/InfinityEducation.webp';
        }

        // Step 5: Mandatory Onboarding / Inactive Check
        if ((currentUserRole === 'schoolAdmin' || currentUserRole === 'superAdmin') && getActiveSchoolId()) {
            const schoolRef = doc(db, "schools", getActiveSchoolId());
            const schoolSnap = await getDoc(schoolRef);
            if (schoolSnap.exists()) {
				const schoolData = schoolSnap.data();
				applyTheme(schoolData.theme, schoolData.customTheme);
                console.log("School name:", schoolSnap.data().name, "Status:", schoolSnap.data().subscriptionStatus);
                if (schoolSnap.data().name === "New School") {
                    console.log("School needs naming. Showing modal.");
                    schoolNameModal.classList.remove('hidden');
                    loadingOverlay.classList.add('hidden');
                    return;
                }
                if (schoolSnap.data().subscriptionStatus !== 'active') {
                    console.log("Subscription is inactive.");
                    showView(subscriptionInactiveView);
                    loadingOverlay.classList.add('hidden');
                    return;
                }
            }
        }

        // Step 6: Fetch Skills & Route
        // Only fetch school-scoped skills when we actually know the school.
        if (currentUserSchoolId) {
            await fetchSchoolSkills();
        } else {
            console.log("Skipping skills fetch: no schoolId (role:", currentUserRole, ")");
        }

        const isAdminType = ['admin', 'superAdmin', 'schoolAdmin'].includes(currentUserRole);
        usersLink.classList.toggle('hidden', !isAdminType);
        classroomsLink.classList.toggle('hidden', !isAdminType);
        skillsLink.classList.toggle('hidden', !isAdminType);

        const canAddRecord = ['admin', 'teacher', 'superAdmin', 'schoolAdmin'].includes(currentUserRole);
        addRecordBtn.classList.toggle('hidden', !canAddRecord);
        if (addTeacherBtn) {
            addTeacherBtn.classList.toggle('hidden', currentUserRole !== 'schoolAdmin');
        }
        // Bulk anecdote button visible to teachers and school admins
        if (bulkAddAnecdoteBtn) {
            const canBulkAnecdote = ['teacher', 'schoolAdmin'].includes(currentUserRole);
            bulkAddAnecdoteBtn.classList.toggle('hidden', !canBulkAnecdote);
        }
        messagesChartContainer.classList.toggle('hidden', !['admin', 'superAdmin', 'schoolAdmin', 'teacher'].includes(currentUserRole));

        if (canAddRecord) {
            showView(dashboardView);
            if (currentUserRole === 'teacher') {
                const q = query(collection(db, "classrooms"), where("teacherId", "==", user.uid));
                const classroomSnap = await getDocs(q);
                if (!classroomSnap.empty) currentUserClassroomId = classroomSnap.docs[0].id;
            }
            listenForStudentRecords();
            listenForAllAnecdotes();
            listenForAssessmentTypeDistribution();
            listenForContentTypeDistribution();
        } else if (currentUserRole === 'parent') {
            showView(parentDashboardView);
            const q1 = query(collection(db, "students"), where("parent1Email", "==", user.email));
            const q2 = query(collection(db, "students"), where("parent2Email", "==", user.email));
            const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
            const allStudentDocs = [...snap1.docs, ...snap2.docs];
            if (allStudentDocs.length > 0) {
                 renderParentStudentView(allStudentDocs[0].id, allStudentDocs[0].data().name);
            } else {
                 parentWelcomeMessage.classList.remove('hidden');
                 parentStudentView.classList.add('hidden');
                 parentWelcomeMessage.querySelector('p').textContent = 'No students are currently associated with this parent email.';
            }
        } else { // Guest
            if (sessionStorage.getItem('postCheckout') === 'true') {
                 sessionStorage.removeItem('postCheckout');
                 console.log("postCheckout was true. Waiting for webhook to update role...");
                 return;
			} else if (sessionStorage.getItem('isSubscribing') === 'true') {
                 sessionStorage.removeItem('isSubscribing');
                 subscriptionModal.classList.remove('hidden');
            } else {
                 showView(parentDashboardView);
                 parentStudentView.classList.add('hidden');
                 parentWelcomeMessage.classList.remove('hidden');
                 parentWelcomeMessage.querySelector('h2').textContent = 'Welcome to Infinity Academy!';
                 parentWelcomeMessage.querySelector('p').textContent = 'Create your own school or await an invitation to join an existing one.';
                 const subscribeBtnInWelcome = parentWelcomeMessage.querySelector('#subscribe-btn-welcome');
                 if (subscribeBtnInWelcome) subscribeBtnInWelcome.classList.remove('hidden');
            }
        }
    } else {
        // --- Logout Logic ---
        currentUserRole = null;
        currentUserSchoolId = null;
        // Reset cached logo and header image on logout
        try { schoolLogoUrlCache = null; } catch (_) {}
        if (navSchoolLogo) navSchoolLogo.src = '/images/InfinityEducation.webp';
        document.body.classList.add('login-background');
        document.body.classList.add('bg-overlay');
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

// --- UPDATED `createUserProfileIfNeeded` ---
async function createUserProfileIfNeeded(user) {
    const userRef = doc(db, "users", user.uid);
    let docSnap = await getDoc(userRef);
    if (!docSnap.exists()) {
        console.log(`Creating initial user profile for ${user.uid}`);
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL || `https://placehold.co/100x100?text=${user.email[0].toUpperCase()}`,
            createdAt: serverTimestamp(),
            role: 'guest'
            // notificationSettings: { newMessage: true }
        });
        docSnap = await getDoc(userRef); // Re-fetch
    }
    return docSnap;
}

// --- UPDATED `fetchSchoolSkills` ---
async function fetchSchoolSkills() {
    console.log("Fetching school skills for schoolId:", currentUserSchoolId);
    schoolCoreSkills = [];
    schoolMicroSkills = [];
    try {
        const continuumsRef = collection(db, "continuums");
        const allContinuumsSnap = await getDocs(continuumsRef);
        const rubricsRef = collection(db, "rubrics");
        const allRubricsSnap = await getDocs(rubricsRef);
        
        // Collect skills that belong to the current school or are templates
        const rawCoreSkills = allContinuumsSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(c => c.schoolId === currentUserSchoolId || c.schoolId === undefined || c.schoolId === null)
            .filter(c => c.name);

        // Deduplicate by name, preferring the school-owned copy over the template
        const byName = new Map();
        rawCoreSkills.forEach(s => {
            const key = (s.name || '').toLowerCase();
            const existing = byName.get(key);
            const isSchool = s.schoolId === currentUserSchoolId;
            if (!existing) {
                byName.set(key, s);
            } else {
                const existingIsSchool = existing.schoolId === currentUserSchoolId;
                if (isSchool && !existingIsSchool) {
                    byName.set(key, s);
                }
            }
        });
        schoolCoreSkills = Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
            
        const combinedRubrics = allRubricsSnap.docs
             .map(doc => ({ id: doc.id, ...doc.data() }))
             .filter(r => r.schoolId === currentUserSchoolId || r.schoolId === undefined || r.schoolId === null);
             
        const tempSkillMap = {
             'Vitality': ['Mindset', 'Emotional Energy Regulation', 'Physical Conditioning', 'Health', 'Connection'],
             'Integrity': ['Honesty & Accountability', 'Discipline', 'Courage', 'Respect'],
             'Curiosity': ['Questioning', 'Reflecting', 'Researching', 'Creating', 'Communicating'],
             'Critical Thinking': ['Analyzing Information', 'Evaluating Evidence', 'Problem Solving'],
             'Fields of Knowledge': ['Literacy', 'Math', 'Science', 'Social Studies', 'Arts']
         };
         
        schoolMicroSkills = combinedRubrics
            .filter(r => r.name)
            .map(rubricData => {
                let coreSkillName = "Unknown";
                for (const core in tempSkillMap) {
                    if (tempSkillMap[core].includes(rubricData.name)) {
                        coreSkillName = core;
                        break;
                    }
                }
                if (coreSkillName === "Unknown" && rubricData.coreSkillName) { coreSkillName = rubricData.coreSkillName; } // Fallback
                return { id: rubricData.id, name: rubricData.name, coreSkillName: coreSkillName };
            })
            .sort((a, b) => a.name.localeCompare(b.name));
            
        console.log("Fetched Core Skills:", schoolCoreSkills);
        console.log("Fetched Micro Skills:", schoolMicroSkills);
    } catch (error) {
        console.error("Error fetching school skills:", error);
        showMessage("Could not load the skills framework.");
    }
}

// Data Logic
function listenForStudentRecords() {
    // Cleanup existing listeners
    if (unsubscribeFromStudents) {
        unsubscribeFromStudents();
        unsubscribeFromStudents = null;
    }
    if (unsubscribeFromClassrooms) {
        unsubscribeFromClassrooms();
        unsubscribeFromClassrooms = null;
    }
    for (const [cid, unsub] of classroomStudentUnsubs.entries()) {
        try { unsub(); } catch (_) {}
        classroomStudentUnsubs.delete(cid);
    }

    // Helper to find the grid safely
    const getStudentGrid = () => document.getElementById('dashboard-left-student-grid');

    // We must have a schoolId to fetch school-specific data.
    if (!currentUserSchoolId) {
        const grid = getStudentGrid();
        if(grid) grid.innerHTML = '<p class="col-span-3 text-center text-gray-400 italic">School not identified.</p>';
        return;
    }

    const studentsRef = collection(db, "students");

    // Helper to render a single student card in Retro style
    const createRetroStudentCard = (student, docId) => {
        const div = document.createElement('div');
        div.className = 'student-grade-wrapper group'; 
        
        // Parse Grade: "Grade 5" -> "5", "K" -> "K"
        let gradeDisplay = student.grade ? student.grade.replace(/grade/i, '').trim() : '?';
        if(gradeDisplay === '') gradeDisplay = '?';

        div.innerHTML = `
            <div class="student-grade-circle group-hover:bg-red-700 transition-colors">
                ${gradeDisplay}
            </div>
            <span class="student-name-retro group-hover:text-red-800">${student.name || 'Unnamed'}</span>
        `;
        
        div.addEventListener('click', () => showStudentDetailPage(docId));
        return div;
    };

    // --- TEACHER VIEW ---
    if (currentUserRole === 'teacher' && currentUserClassroomId) {
        const q = query(
            studentsRef,
            where("schoolId", "==", currentUserSchoolId),
            where("classroomId", "==", currentUserClassroomId)
        );
        unsubscribeFromStudents = onSnapshot(q, (snapshot) => {
            const grid = getStudentGrid();
            if(grid) {
                grid.innerHTML = '';
                if (snapshot.empty) {
                    grid.innerHTML = '<p class="col-span-3 text-center text-gray-400 italic">No students found.</p>';
                } else {
                    snapshot.forEach(doc => {
                        grid.appendChild(createRetroStudentCard(doc.data(), doc.id));
                    });
                }
            }
        });
        return;
    }

    // --- ADMIN VIEW (Aggregated) ---
    if (['admin', 'superAdmin', 'schoolAdmin'].includes(currentUserRole)) {
        // Query ALL students in the school
        const q = query(studentsRef, where("schoolId", "==", currentUserSchoolId), orderBy("name"));
        
        unsubscribeFromStudents = onSnapshot(q, (snapshot) => {
             const grid = getStudentGrid();
             if(grid) {
                grid.innerHTML = '';
                if (snapshot.empty) {
                    grid.innerHTML = '<p class="col-span-3 text-center text-gray-400 italic">No students in school.</p>';
                } else {
                    snapshot.forEach(doc => {
                         grid.appendChild(createRetroStudentCard(doc.data(), doc.id));
                    });
                }
             }
        });
        return;
    }

    // Fallback
    const grid = getStudentGrid();
    if(grid) grid.innerHTML = '';
}

// --- UPDATED `showStudentDetailPage` ---
async function showStudentDetailPage(studentId) {
    currentStudentId = studentId;
    showView(studentDetailView);
    anecdoteDisplayContainer.classList.add('hidden'); // Added this line
    const studentRef = doc(db, "students", studentId);
    const docSnap = await getDoc(studentRef);
    studentDetailName.textContent = docSnap.exists() ? docSnap.data().name : "Student Not Found";

    const alignedSkillsGrid = document.getElementById('aligned-skills-grid');
    if (!alignedSkillsGrid) {
        console.error("CRITICAL: aligned-skills-grid element not found!");
        return;
    }
    alignedSkillsGrid.className = 'flex flex-col space-y-6';
    alignedSkillsGrid.innerHTML = '';
    
    if (schoolCoreSkills.length === 0) {
        alignedSkillsGrid.innerHTML = '<p class="text-gray-500 text-center italic">No skills framework found.</p>';
    } else {
        const retroSkillColors = {
            'Vitality': '#B5C4A1',
            'Integrity': '#A95C2E',
            'Curiosity': '#D9932E',
            'Critical Thinking': '#726A36',
            'Fields of Knowledge': '#9BADBF'
        };

        schoolCoreSkills.forEach(coreSkill => {
            const skillCard = document.createElement('div');
            const backgroundColor = retroSkillColors[coreSkill.name] || '#6B5E36';
            skillCard.className = 'w-full max-w-4xl mx-auto rounded-xl p-5 text-white uppercase font-bold italic text-center tracking-wide shadow-lg cursor-pointer transform transition-transform duration-150 hover:scale-[1.01]';
            skillCard.style.backgroundColor = backgroundColor;
            skillCard.dataset.skill = coreSkill.name;
            skillCard.textContent = coreSkill.name;
            skillCard.addEventListener('click', () => {
                 listenForAnecdotes(currentStudentId, coreSkill.name, anecdoteChartCanvas, anecdoteListTitle, anecdoteDisplayContainer);
            });
            alignedSkillsGrid.appendChild(skillCard);
        });
    }

    // Start/refresh the student assessment type chart listener
    listenForStudentAssessmentTypes(studentId);
}

// --- UPDATED `listenForAnecdotes` ---
function listenForAnecdotes(studentId, coreSkill, targetCanvas, targetTitle, targetContainer) {
    currentCoreSkill = coreSkill;
    if (unsubscribeFromAnecdotes) unsubscribeFromAnecdotes();
    targetTitle.textContent = `Anecdote Counts for ${coreSkill}`;
    targetContainer.classList.remove('hidden');
	if (buildContinuumBtn) {
		const isAdmin = ['admin', 'superAdmin', 'schoolAdmin'].includes(currentUserRole);
		buildContinuumBtn.classList.toggle('hidden', !isAdmin);
	}
	
	const microSkillsForCore = schoolMicroSkills
		.filter(ms => ms.coreSkillName === coreSkill)
		.map(ms => ms.name); // Get only the names
		
	if (microSkillsForCore.length === 0) {
		console.warn(`No micro skills found for core skill "${coreSkill}". Check Firestore data or temporary map.`);
		renderAnecdoteChart({}, targetCanvas, studentId, []); // Render empty chart
		return;
	}	
	
    const q = query(collection(db, "anecdotes"), where("studentId", "==", studentId), where("coreSkill", "==", coreSkill));
	
    unsubscribeFromAnecdotes = onSnapshot(q, (snapshot) => {
        const microSkillCounts = {};
        microSkillsForCore.forEach(skill => { microSkillCounts[skill] = 0; });
        snapshot.forEach(doc => {
            const anecdote = doc.data();
            if (microSkillCounts.hasOwnProperty(anecdote.microSkill)) {
                microSkillCounts[anecdote.microSkill]++;
            }
        });
        renderAnecdoteChart(microSkillCounts, targetCanvas, studentId, microSkillsForCore); // Pass labels
    }, (error) => { console.error("Error listening for anecdotes: ", error); });
}

// --- UPDATED `renderAnecdoteChart` ---
function renderAnecdoteChart(data, canvasElement, studentId, labels = []) {
    if (anecdoteChart) {
        destroyChartInstance(anecdoteChart);
        anecdoteChart = null;
    }
    if (!canvasElement) return;
    const chartLabels = labels.length > 0 ? labels : Object.keys(data);
    const chartData = chartLabels.map(label => data[label] || 0);
    const hasValues = chartData.some(value => value > 0);
    const ctx = canvasElement.getContext('2d');
    const style = getComputedStyle(document.body);
    const chartColor = style.getPropertyValue('--chart-color-2').trim();
    const visuals = createBarVisuals(ctx, chartColor);
    const options = createBaseBarOptions(style);
    const suggestedMax = getSuggestedYAxisMax(chartData);
    const valueStep = chartData.length ? Math.max(1, Math.ceil(suggestedMax / 6)) : 1;

    options.scales.y.suggestedMax = suggestedMax;
    options.scales.y.ticks.stepSize = valueStep;
    options.scales.y.ticks.precision = 0;
    options.scales.y.ticks.callback = (value) => Number.isInteger(value) ? value : '';
    options.scales.y.grace = '15%';

    if (chartLabels.some(label => label.length > 12)) {
        options.scales.x.ticks.maxRotation = 35;
        options.scales.x.ticks.minRotation = 0;
        options.scales.x.ticks.autoSkip = false;
    }

    options.plugins.tooltip.callbacks = {
        title: (items) => items[0]?.label || '',
        label: (context) => {
            const value = context.parsed.y || 0;
            if (value === 0) return 'No anecdotes yet';
            const suffix = value === 1 ? 'anecdote' : 'anecdotes';
            return `${value} ${suffix}`;
        }
    };
    options.plugins.tooltip.enabled = chartData.length > 0;

    options.plugins.softShadow.enable = hasValues;
    options.plugins.barValueLabels.display = hasValues;
    options.plugins.barValueLabels.showZero = false;
    options.plugins.barValueLabels.formatter = (value) => value;

    options.onClick = (event) => {
        const points = anecdoteChart?.getElementsAtEventForMode(event, 'index', { intersect: false }, true) || [];
        if (points.length) {
            const firstPoint = points[0];
            const label = anecdoteChart.data.labels[firstPoint.index];
            showMicroSkillDetailPage(studentId, currentCoreSkill, label);
        }
    };

    options.onHover = (event, chartElement) => {
        event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
    };

    anecdoteChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Anecdote Count',
                data: chartData,
                backgroundColor: visuals.background,
                borderColor: visuals.border,
                hoverBackgroundColor: visuals.hoverBackground,
                hoverBorderColor: visuals.hoverBorder,
                borderWidth: 2,
                borderRadius: 12,
                borderSkipped: false,
                maxBarThickness: 56,
                barPercentage: 0.7,
                categoryPercentage: 0.58
            }]
        },
        options
    });
}

// --- UPDATED `showMicroSkillDetailPage` ---
function showMicroSkillDetailPage(studentId, coreSkill, microSkill) {
    currentStudentId = studentId;
    currentMicroSkill = microSkill;
    showView(microSkillDetailView);
    microSkillTitle.textContent = `Anecdotes for ${microSkill}`;
	const rubricsAvailable = schoolMicroSkills.map(ms => ms.name);
    viewRubricBtn.classList.toggle('hidden', !rubricsAvailable.includes(microSkill));

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
            const isAdmin = ['admin', 'superAdmin', 'schoolAdmin'].includes(currentUserRole);
			if (isAdmin) {
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

// --- UPDATED `showRubricPage` (with copy-on-write logic) ---
async function showRubricPage(studentId, coreSkill, microSkill) {
    showView(rubricView);
    rubricTitle.textContent = `${microSkill} Rubric`;
    rubricTableContainer.innerHTML = '<p>Loading rubric...</p>';
    editRubricBtn.classList.add('hidden');
    downloadRubricBtn.classList.add('hidden');

    const rubricsRef = collection(db, "rubrics");
    let rubricDoc = null;
    let isMasterTemplate = false;

    try {
        if (currentUserSchoolId) {
            console.log(`Fetching school rubric: name="${microSkill}", schoolId="${currentUserSchoolId}"`);
            const schoolQuery = query(rubricsRef, where("name", "==", microSkill), where("schoolId", "==", currentUserSchoolId));
            const schoolSnap = await getDocs(schoolQuery);
            if (!schoolSnap.empty) {
                rubricDoc = schoolSnap.docs[0];
                isMasterTemplate = false;
                console.log("Found school rubric:", rubricDoc.id);
            }
        }
        if (!rubricDoc) {
             console.log(`Fetching master template rubric: name="${microSkill}"`);
             const allNameQuery = query(rubricsRef, where("name", "==", microSkill));
             const allNameSnap = await getDocs(allNameQuery);
             const templateDoc = allNameSnap.docs.find(doc => doc.data().schoolId == null || doc.data().schoolId === undefined);
             if (templateDoc) {
                 rubricDoc = templateDoc;
                 isMasterTemplate = true;
                 console.log("Found master template:", rubricDoc.id);
             }
        }
    } catch (error) {
         console.error("Error fetching rubric:", error);
         rubricTableContainer.innerHTML = `<p class="text-red-500">Error loading rubric. Please check console.</p>`;
         return;
    }

    if (!rubricDoc) {
        rubricTableContainer.innerHTML = `<p class="text-red-500">The rubric for "${microSkill}" could not be found.</p>`;
         editRubricBtn.classList.add('hidden');
         downloadRubricBtn.classList.add('hidden');
        return;
    }

    const rubricId = rubricDoc.id;
    const rubricData = rubricDoc.data();
    rubricView.dataset.editingDocId = rubricId;
    rubricView.dataset.isMasterTemplate = isMasterTemplate;

    // Build table HTML
    const tableClass = (rubricData.headers && rubricData.headers.length > 7) ? 'rubric-table-auto text-sm' : 'rubric-table text-sm';
    let tableHTML = `<table class="${tableClass}">`;
    
    // Build table header
    tableHTML += '<thead><tr>';
    tableHTML += `<th style="background-color: var(--accent-primary); color: var(--text-light);">Behavior</th>`; // First header
    if(rubricData.headers) {
        rubricData.headers.forEach(header => {
            tableHTML += `<th>${header}</th>`;
        });
    }
    tableHTML += '</tr></thead>';
    
    // Build table body
    tableHTML += '<tbody>';
    if(rubricData.rows) {
        rubricData.rows.forEach((rowData, rowIndex) => {
            tableHTML += '<tr>';
            tableHTML += `<td class="skill-label-cell">${(rowData.skillLabel || '').replace(/\n/g, '<br>')}</td>`; // Skill label
            if(rowData.levels) {
                rowData.levels.forEach((levelText, levelIndex) => {
                    const cellId = `${rubricId}-r${rowIndex}-c${levelIndex}`;
                    tableHTML += `<td id="${cellId}">${levelText}</td>`; // Level descriptions
                });
            }
            tableHTML += '</tr>';
        });
    }
    tableHTML += '</tbody></table>';
    rubricTableContainer.innerHTML = tableHTML;

    const isAdmin = ['admin', 'superAdmin', 'schoolAdmin'].includes(currentUserRole);
     if (isAdmin) {
         editRubricBtn.classList.toggle('hidden', isMasterTemplate && currentUserRole !== 'superAdmin');
         setRubricMode('highlight');
         // Load highlights...
        const highlightsRef = doc(db, `students/${currentStudentId}/rubricHighlights/${rubricId}`);
        const highlightsSnap = await getDoc(highlightsRef);
        if (highlightsSnap.exists()) {
            highlightsSnap.data().highlightedCells?.forEach(cellId => {
                const cell = document.getElementById(cellId);
                if (cell) cell.classList.add('admin-highlight');
            });
        }
     } else {
         editRubricBtn.classList.add('hidden');
         setRubricMode('view');
     }
     downloadRubricBtn.classList.remove('hidden');
}

async function saveRubricHighlights(microSkill) {
    const rubricId = rubricView.dataset.editingDocId; // Use the doc ID
    if (!rubricId) return;
    
    const highlightedCells = [];
    rubricTableContainer.querySelectorAll('.admin-highlight').forEach(cell => {
        highlightedCells.push(cell.id);
    });
    
    // Save highlights using the unique doc ID, not the microSkill name
    const highlightsRef = doc(db, `students/${currentStudentId}/rubricHighlights/${rubricId}`);
    await setDoc(highlightsRef, { highlightedCells });
}

// --- UPDATED `showContinuumPage` (with copy-on-write logic) ---
async function showContinuumPage(coreSkill) {
    showView(continuumView);
    continuumTitle.textContent = `${coreSkill} Continuum`;
    continuumTableContainer.innerHTML = '<p>Loading continuum...</p>';
    editContinuumBtn.classList.add('hidden');
    downloadContinuumBtn.classList.add('hidden');

    const continuumsRef = collection(db, "continuums");
    let continuumDoc = null;
    let isMasterTemplate = false;

    try {
        if (currentUserSchoolId) {
             console.log(`Fetching school continuum: name="${coreSkill}", schoolId="${currentUserSchoolId}"`);
             const schoolQuery = query(continuumsRef, where("name", "==", coreSkill), where("schoolId", "==", currentUserSchoolId));
             const schoolSnap = await getDocs(schoolQuery);
             if (!schoolSnap.empty) {
                 continuumDoc = schoolSnap.docs[0];
                 isMasterTemplate = false;
                 console.log("Found school continuum:", continuumDoc.id);
             }
        }
        if (!continuumDoc) {
             console.log(`Fetching master template continuum: name="${coreSkill}"`);
             const allNameQuery = query(continuumsRef, where("name", "==", coreSkill));
             const allNameSnap = await getDocs(allNameQuery);
             const templateDoc = allNameSnap.docs.find(doc => doc.data().schoolId == null || doc.data().schoolId === undefined);
             if (templateDoc) {
                 continuumDoc = templateDoc;
                 isMasterTemplate = true;
                 console.log("Found master template continuum:", continuumDoc.id);
             }
        }
    } catch (error) {
         console.error("Error fetching continuum:", error);
         continuumTableContainer.innerHTML = `<p class="text-red-500">Error loading continuum. Please check console.</p>`;
         return;
    }

    if (!continuumDoc) {
        continuumTableContainer.innerHTML = `<p class="text-red-500">The continuum for "${coreSkill}" could not be found.</p>`;
        editContinuumBtn.classList.add('hidden');
        downloadContinuumBtn.classList.add('hidden');
        return;
    }

    const continuumId = continuumDoc.id;
    originalContinuumData = continuumDoc.data();
    continuumView.dataset.editingDocId = continuumId;
    continuumView.dataset.isMasterTemplate = isMasterTemplate;
    
    let tableHTML = '<table class="rubric-table text-sm">';
    tableHTML += '<thead><tr>';
    // Normalize headers to an array in case data was saved as an object
    let headersArray = [];
    if (originalContinuumData.headers) {
        if (Array.isArray(originalContinuumData.headers)) {
            headersArray = originalContinuumData.headers;
        } else if (typeof originalContinuumData.headers === 'object') {
            headersArray = Object.keys(originalContinuumData.headers)
                .sort((a, b) => {
                    const na = parseInt(a, 10);
                    const nb = parseInt(b, 10);
                    if (!isNaN(na) && !isNaN(nb)) return na - nb;
                    return String(a).localeCompare(String(b));
                })
                .map(k => originalContinuumData.headers[k]);
        }
    }
    headersArray.forEach((header, index) => {
        const style = index === 0 ? 'style="background-color: var(--accent-primary); color: var(--text-light);"' : '';
        tableHTML += `<th ${style}>${header}</th>`;
    });
    tableHTML += '</tr></thead>';

    tableHTML += '<tbody>';
    // Normalize rows to an array in case data was saved as an object
    let rowsArray = [];
    if (originalContinuumData.rows) {
        if (Array.isArray(originalContinuumData.rows)) {
            rowsArray = originalContinuumData.rows;
        } else if (typeof originalContinuumData.rows === 'object') {
            rowsArray = Object.keys(originalContinuumData.rows)
                .sort((a, b) => {
                    const na = parseInt(a, 10);
                    const nb = parseInt(b, 10);
                    if (!isNaN(na) && !isNaN(nb)) return na - nb;
                    return String(a).localeCompare(String(b));
                })
                .map(k => originalContinuumData.rows[k]);
        }
    }

    rowsArray.forEach((rowData, rowIndex) => {
        tableHTML += '<tr>';
        tableHTML += `<td class="skill-label-cell">${(rowData?.skillLabel || '').replace(/\n/g, '<br>')}</td>`;
        // Normalize levels to an array as well
        let levelsArray = [];
        if (rowData && rowData.levels) {
            if (Array.isArray(rowData.levels)) {
                levelsArray = rowData.levels;
            } else if (typeof rowData.levels === 'object') {
                levelsArray = Object.keys(rowData.levels)
                    .sort((a, b) => {
                        const na = parseInt(a, 10);
                        const nb = parseInt(b, 10);
                        if (!isNaN(na) && !isNaN(nb)) return na - nb;
                        return String(a).localeCompare(String(b));
                    })
                    .map(k => rowData.levels[k]);
            }
        }
        levelsArray.forEach((levelText, levelIndex) => {
            const cellId = `${continuumId}-r${rowIndex}-c${levelIndex}`;
            tableHTML += `<td id="${cellId}">${levelText || ''}</td>`;
        });
        tableHTML += '</tr>';
    });
    tableHTML += '</tbody></table>';

    continuumTableContainer.innerHTML = tableHTML;

    const isAdmin = ['admin', 'superAdmin', 'schoolAdmin'].includes(currentUserRole);
    if (isAdmin) {
        editContinuumBtn.classList.toggle('hidden', isMasterTemplate && currentUserRole !== 'superAdmin');
        setContinuumMode('highlight');
        
        const highlightsRef = doc(db, `students/${currentStudentId}/continuumHighlights/${continuumId}`);
        const highlightsSnap = await getDoc(highlightsRef);
        if (highlightsSnap.exists()) {
            highlightsSnap.data().highlightedCells?.forEach(cellId => {
                const cell = document.getElementById(cellId);
                if (cell) cell.classList.add('admin-highlight');
            });
        }
    } else {
        editContinuumBtn.classList.add('hidden');
        setContinuumMode('view');
    }
    downloadContinuumBtn.classList.remove('hidden');
}

async function saveContinuumHighlights(coreSkill) {
    const continuumId = continuumView.dataset.editingDocId; // Use the doc ID
    if (!continuumId) return;

    const activeContainer = document.querySelector('#continuum-table-container');
    if (!activeContainer) return;
    
    const highlightedCells = [];
    activeContainer.querySelectorAll('.admin-highlight').forEach(cell => {
        highlightedCells.push(cell.id);
    });
    
    const highlightsRef = doc(db, `students/${currentStudentId}/continuumHighlights/${continuumId}`);
    await setDoc(highlightsRef, { highlightedCells }, { merge: true });
}

function listenForAllAnecdotes() {
    if (unsubscribeFromAllAnecdotes) unsubscribeFromAllAnecdotes();
    if (!currentUserSchoolId) return; // Guard clause
    
    const q = query(collection(db, "anecdotes"), where("schoolId", "==", currentUserSchoolId));
    unsubscribeFromAllAnecdotes = onSnapshot(q, (snapshot) => {
        // Use the dynamic core skills
        const coreSkillCounts = {};
        schoolCoreSkills.forEach(skill => {
            coreSkillCounts[skill.name] = 0;
        });

        snapshot.forEach(doc => {
            const anecdote = doc.data();
            if (coreSkillCounts.hasOwnProperty(anecdote.coreSkill)) {
                coreSkillCounts[anecdote.coreSkill]++;
            }
        });
        renderAllSkillsChart(coreSkillCounts);
    }, (error) => { console.error("Error listening for all anecdotes:", error); });
}

function renderAllSkillsChart(data) {
    if (allSkillsChart) {
        destroyChartInstance(allSkillsChart);
        allSkillsChart = null;
    }
    if (!allSkillsChartCanvas) return;
    const labels = Object.keys(data);
    const values = labels.map(label => data[label] || 0);
    const hasValues = values.some(value => value > 0);
    const ctx = allSkillsChartCanvas.getContext('2d');
    const style = getComputedStyle(document.body);
    const options = createBaseBarOptions(style);
    const suggestedMax = getSuggestedYAxisMax(values);
    const valueStep = values.length ? Math.max(1, Math.ceil(suggestedMax / 6)) : 1;
    const retroBarColor = '#93A2B9';

    options.scales.y.suggestedMax = suggestedMax;
    options.scales.y.ticks.stepSize = valueStep;
    options.scales.y.ticks.precision = 0;
    options.scales.y.ticks.callback = (value) => Number.isInteger(value) ? value : '';
    options.scales.y.grace = '15%';

    if (labels.length > 5 || labels.some(label => label.length > 12)) {
        options.scales.x.ticks.maxRotation = 30;
        options.scales.x.ticks.minRotation = 0;
        options.scales.x.ticks.autoSkip = false;
    }

    options.plugins.tooltip.callbacks = {
        title: (items) => items[0]?.label || '',
        label: (context) => {
            const value = context.parsed.y || 0;
            if (value === 0) return 'No anecdotes recorded';
            const suffix = value === 1 ? 'anecdote' : 'anecdotes';
            return `${value} ${suffix}`;
        }
    };
    options.plugins.tooltip.enabled = labels.length > 0;
    options.plugins.softShadow.enable = hasValues;
    options.plugins.barValueLabels.display = hasValues;
    options.plugins.barValueLabels.showZero = false;
    options.plugins.barValueLabels.formatter = (value) => value;

    allSkillsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Total Anecdotes',
                data: values,
                backgroundColor: retroBarColor,
                borderColor: retroBarColor,
                hoverBackgroundColor: retroBarColor,
                hoverBorderColor: retroBarColor,
                borderWidth: 2,
                borderRadius: 12,
                borderSkipped: false,
                maxBarThickness: 60,
                barPercentage: 0.68,
                categoryPercentage: 0.58
            }]
        },
        options
    });
}

// CHAT LOGIC
async function listenForUsers() {
    console.log("listenForUsers started. Role:", currentUserRole, "SchoolID:", currentUserSchoolId); // Debug log
    const currentUser = auth.currentUser;
    if (!currentUser) return; // Should not happen if view is accessible, but safety check
    if (unsubscribeFromUsers) unsubscribeFromUsers();
    userList.innerHTML = '<p class="text-gray-500 p-3">Loading users...</p>'; // Loading message

    const usersRef = collection(db, "users");
    let queryPromise;

    if (currentUserRole === 'superAdmin') {
        // SuperAdmin sees all users (excluding self)
        queryPromise = getDocs(query(usersRef, where("uid", "!=", currentUser.uid)));
        console.log("Fetching all users for superAdmin");
    } else if (currentUserRole === 'schoolAdmin' || currentUserRole === 'teacher') {
        // SchoolAdmin/Teacher sees users within their school (excluding self)
        if (!currentUserSchoolId) {
             console.error("SchoolAdmin/Teacher has no schoolId!");
             userList.innerHTML = '<p class="text-red-500 p-3">Error: Cannot determine your school.</p>';
             return;
        }
        queryPromise = getDocs(query(usersRef, where("schoolId", "==", currentUserSchoolId), where("uid", "!=", currentUser.uid)));
        console.log("Fetching users for school:", currentUserSchoolId);
    } else if (currentUserRole === 'parent') {
        // Parent sees users they have existing chats with
        console.log("Fetching chat partners for parent:", currentUser.uid);
        const chatsRef = collection(db, "chats");
        const q = query(chatsRef, where("participants", "array-contains", currentUser.uid));
        
        // Use onSnapshot for real-time updates of chat partners
        unsubscribeFromUsers = onSnapshot(q, async (snapshot) => {
            console.log(`Found ${snapshot.size} chats for parent.`);
            userList.innerHTML = ''; // Clear previous list
            if (snapshot.empty) {
                 noUsersMessage.classList.remove('hidden');
                 noUsersMessage.textContent = "No conversations started yet.";
                 return;
            }
             noUsersMessage.classList.add('hidden');

            let uniqueUserIds = new Set();
            snapshot.forEach(chatDoc => {
                const participants = chatDoc.data().participants;
                const otherUserId = participants.find(uid => uid !== currentUser.uid);
                if (otherUserId) uniqueUserIds.add(otherUserId);
            });

             if (uniqueUserIds.size === 0) {
                 noUsersMessage.classList.remove('hidden');
                 noUsersMessage.textContent = "No conversations found.";
                 return;
             }

            // Fetch profiles for the unique chat partners
            const userPromises = Array.from(uniqueUserIds).map(uid => getDoc(doc(db, "users", uid)));
            const userSnaps = await Promise.all(userPromises);

            userSnaps.forEach(userSnap => {
                if (userSnap.exists()) {
                    const data = userSnap.data();
                    // Ensure UID is present; fall back to document ID
                    renderUserCard({ ...data, uid: data.uid || userSnap.id });
                }
            });
        }, (error) => {
             console.error("Error fetching parent chats:", error);
             userList.innerHTML = '<p class="text-red-500 p-3">Error loading conversations.</p>';
        });
        return; // onSnapshot handles updates, so we exit here for parents

    } else { // Guest or unexpected role
        console.log("User role not permitted to view user list:", currentUserRole);
        userList.innerHTML = '<p class="text-gray-500 p-3">You do not have permission to view messages.</p>';
        return;
    }

    // --- Logic for Admin/Teacher (uses queryPromise) ---
    try {
        const snapshot = await queryPromise;
        userList.innerHTML = ''; // Clear loading
        noUsersMessage.classList.toggle('hidden', !snapshot.empty);
        if (snapshot.empty) {
             noUsersMessage.textContent = "No other users found.";
        }
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            // Ensure UID is present; fall back to document ID
            renderUserCard({ ...data, uid: data.uid || docSnap.id });
        });
    } catch (error) {
         console.error("Error fetching users:", error);
         userList.innerHTML = '<p class="text-red-500 p-3">Error loading user list.</p>';
    }
}

// Helper function to render a user card (to avoid duplication)
function renderUserCard(userData) {
    const userCard = document.createElement('div');
    userCard.className = 'p-3 border rounded-lg flex items-center justify-between cursor-pointer hover:bg-gray-100';
    userCard.innerHTML = `
        <div class="flex items-center space-x-3">
             <img src="${userData.photoURL || 'https://placehold.co/40x40?text=?'}" alt="User photo" class="w-8 h-8 rounded-full">
             <span>${userData.displayName || userData.email}</span>
             ${userData.role ? `<span class="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">${userData.role}</span>` : ''}
        </div>
        <button class="text-sm bg-green-500 text-white px-3 py-1 rounded">Message</button>
    `;
    userCard.addEventListener('click', () => openChat(userData));
    userList.appendChild(userCard);
}

async function openChat(recipient) {
    const recipientId = recipient.uid || recipient.id;
    if (!recipientId) {
        console.error('openChat called without a valid recipient UID');
        showMessage('Unable to start chat: invalid recipient.');
        return;
    }
    chatWithUser.textContent = `Chat with ${recipient.displayName || recipient.email}`;
    chatWithUser.dataset.recipientId = recipientId;
    showView(chatView);
    const currentUser = auth.currentUser;
    const chatID = [currentUser.uid, recipientId].sort().join('_');
    // Ensure the chat document exists before listening, so rules can validate participants
    try {
        const chatDocRef = doc(db, "chats", chatID);
        await setDoc(chatDocRef, {
            participants: [currentUser.uid, recipientId],
            lastUpdated: serverTimestamp()
        }, { merge: true });
    } catch (e) {
        console.error('Failed to initialize chat doc:', e);
        showMessage('Unable to open chat due to permissions.');
        return;
    }
    const messagesRef = collection(db, "chats", chatID, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));
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
        // Auto-scroll to bottom on new updates
        try {
            messageList.scrollTop = messageList.scrollHeight;
        } catch {}
    });
}

async function listenForAdminMessages() {
    const currentUser = auth.currentUser;
    // Show the messages chart for admin, superAdmin, schoolAdmin, and teacher
    if (!['admin', 'superAdmin', 'schoolAdmin', 'teacher'].includes(currentUserRole)) return;
    if (!currentUser) return; // Add safety check

    const { start, end } = getWeekDates();
    const options = { month: 'long', day: 'numeric' };
    const formattedStartDate = start.toLocaleDateString('en-US', options);
    const formattedEndDate = end.toLocaleDateString('en-US', options);
    const chartTitleEl = document.getElementById('messages-chart-title');
    if (chartTitleEl) {
        chartTitleEl.textContent = `Messages sent the week of ${formattedStartDate} - ${formattedEndDate}`;
    }
    try {
        // Query chats the current user participates in, then aggregate messages per day
        const chatsRef = collection(db, 'chats');
        const chatsQuery = query(chatsRef, where('participants', 'array-contains', currentUser.uid));
        const chatsSnap = await getDocs(chatsQuery);

        const dailyCounts = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 };
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // For each chat, fetch messages in the current week and count those sent by current user
        for (const chatDoc of chatsSnap.docs) {
            const messagesRef = collection(db, 'chats', chatDoc.id, 'messages');
            const msgQuery = query(
                messagesRef,
                where('timestamp', '>=', start),
                where('timestamp', '<=', end),
                orderBy('timestamp', 'asc')
            );
            const msgSnap = await getDocs(msgQuery);
            msgSnap.forEach((docSnap) => {
                const message = docSnap.data();
                if (message.senderId === currentUser.uid && message.timestamp) {
                    const date = message.timestamp.toDate();
                    const dayIndex = date.getDay();
                    const dayName = dayNames[dayIndex];
                    if (dayName) {
                        dailyCounts[dayName]++;
                    }
                }
            });
        }

        renderMessagesChart(dailyCounts);
    } catch (error) {
        console.error("Error fetching admin messages:", error);
        if (chartTitleEl) { chartTitleEl.textContent = 'Messages Sent This Week'; }
        showMessage("Could not load message chart. See console for details.");
    }
}

function renderMessagesChart(data) {
    if (messagesChart) {
        destroyChartInstance(messagesChart);
        messagesChart = null;
    }
    if (!messagesChartCanvas) return;
    const labels = Object.keys(data);
    const values = labels.map(label => data[label] || 0);
    const hasValues = values.some(value => value > 0);
    const ctx = messagesChartCanvas.getContext('2d');
    const style = getComputedStyle(document.body);
    const chartColor = style.getPropertyValue('--chart-color-3').trim();
    const visuals = createBarVisuals(ctx, chartColor);

    const suggestedMax = getSuggestedYAxisMax(values);
    const valueStep = values.length ? Math.max(1, Math.ceil(suggestedMax / 5)) : 1;

    const options = {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-color') || '#3a2e1f' }
            },
            y: {
                beginAtZero: true,
                suggestedMax: suggestedMax,
                grace: '15%',
                ticks: {
                    stepSize: valueStep,
                    precision: 0,
                    callback: (value) => Number.isInteger(value) ? value : ''
                },
                grid: { color: 'rgba(0,0,0,0.06)' }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: labels.length > 0,
                callbacks: {
                    title: (items) => items[0]?.label || '',
                    label: (context) => {
                        const value = context.parsed.y || 0;
                        if (value === 0) return 'No messages sent';
                        const suffix = value === 1 ? 'message' : 'messages';
                        return `${value} ${suffix}`;
                    }
                }
            },
            softShadow: { enable: hasValues },
            barValueLabels: {
                display: hasValues,
                showZero: false,
                formatter: (value) => value,
                padding: 14
            }
        },
        interaction: { intersect: false, mode: 'index' }
    };

    messagesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Messages Sent',
                data: values,
                backgroundColor: visuals.background,
                borderColor: visuals.border,
                hoverBackgroundColor: visuals.hoverBackground,
                hoverBorderColor: visuals.hoverBorder,
                borderWidth: 2,
                borderRadius: 12,
                borderSkipped: false,
                maxBarThickness: 48,
                barPercentage: 0.68,
                categoryPercentage: 0.6
            }]
        },
        options
    });
    // Intentionally do not attach custom responsive handler to avoid recursion
}

function renderParentStudentView(studentId, studentName) {
    parentWelcomeMessage.classList.add('hidden');
    parentStudentView.classList.remove('hidden');
    parentViewStudentName.textContent = studentName;
    parentViewSkillsGrid.innerHTML = '';
    schoolCoreSkills.forEach(skill => {
        const skillCard = document.createElement('div');
        skillCard.className = 'skill-card p-4 border rounded-lg cursor-pointer';
        skillCard.dataset.skill = skill.name;
        skillCard.innerHTML = `<h3 class="font-bold text-center">${skill.name}</h3>`;
        skillCard.addEventListener('click', () => {
            listenForAnecdotes(studentId, skill.name, parentAnecdoteChartCanvas, parentAnecdoteListTitle, parentAnecdoteContainer);
        });
        parentViewSkillsGrid.appendChild(skillCard);
    });
}

parentCloseAnecdoteBtn.addEventListener('click', () => {
    parentAnecdoteContainer.classList.add('hidden');
    if (anecdoteChart) {
        destroyChartInstance(anecdoteChart);
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

    // Load any previously saved selections for this user/student
    const previouslySelected = await getSavedJourneySelection(studentId);
    if (Array.isArray(previouslySelected) && previouslySelected.length) {
        selectedJourneyAnecdotes = previouslySelected.slice();
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
            const isPrev = selectedJourneyAnecdotes.includes(anecdote.id);
            const checkedAttr = isPrev ? 'checked' : '';
            const badge = isPrev ? '<span class="ml-2 text-xs px-2 py-0.5 rounded font-semibold" style="color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.12);">Previously chosen</span>' : '';
            const checkboxId = `journey-anecdote-${anecdote.id}`;
            const assessmentType = (anecdote.assessmentType || '').toString().toLowerCase();
            let bubbleColor = '#A85D26'; // Fallback Rust
            if (assessmentType === 'as') bubbleColor = '#D9932E';
            else if (assessmentType === 'of') bubbleColor = '#726A36';
            else if (assessmentType === 'for') bubbleColor = '#9BADBF';

            anecdoteEl.innerHTML = `
                <label for="${checkboxId}" class="block w-full cursor-pointer">
                    <input id="${checkboxId}" type="checkbox" ${checkedAttr} data-id="${anecdote.id}" class="journey-anecdote-checkbox peer sr-only" style="position:absolute; opacity:0; width:1px; height:1px;">
                    <div class="w-full rounded-xl p-5 mb-4 flex flex-col gap-2 transition transform hover:scale-[1.01] border-4 border-transparent peer-checked:border-white" style="background:${bubbleColor};">
                        <div class="flex items-start justify-between gap-3">
                            <p class="text-white font-bold italic leading-snug flex-1">${anecdote.text} ${badge}</p>
                            <span class="h-7 w-7 flex items-center justify-center rounded-full border-2 border-white text-white text-sm font-bold opacity-0 peer-checked:opacity-100 transition-opacity" style="border-color: rgba(255,255,255,0.6);">&#10003;</span>
                        </div>
                        <div class="flex justify-end">
                            <p class="text-xs text-white" style="opacity:0.8;">Logged on: ${date}</p>
                        </div>
                    </div>
                </label>
            `;
            groupContainer.appendChild(anecdoteEl);
        });
        journeyAnecdoteSelectionList.appendChild(groupContainer);
    }

    // Refresh counter in case we loaded previous selections
    updateJourneyCounter();
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
    // Use the broader check that includes schoolAdmin
    const canAccessDashboard = ['admin', 'teacher', 'superAdmin', 'schoolAdmin'].includes(currentUserRole);
    if (canAccessDashboard) {
        showView(dashboardView);
    } else {
        showView(parentDashboardView); // Default for parent/guest
    }
});

messagesBtn.addEventListener('click', () => {
    showView(messagesView);
    listenForUsers();
    if (['superAdmin', 'admin', 'schoolAdmin', 'teacher'].includes(currentUserRole)) {
        listenForAdminMessages();
    }
});

backToDashboardBtn.addEventListener('click', () => {
    // New check for any admin/teacher role
    const canAccessDashboard = ['admin', 'teacher', 'superAdmin', 'schoolAdmin'].includes(currentUserRole);
    if (canAccessDashboard) {
        showView(dashboardView);
    } else {
        showView(parentDashboardView); // Default for parent/guest
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

usersLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentUserRole === 'admin' || currentUserRole === 'superAdmin' || currentUserRole === 'schoolAdmin') {
        showUsersPage();
        profileDropdown.classList.add('hidden');
    }
});

classroomsLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentUserRole === 'admin' || currentUserRole === 'superAdmin' || currentUserRole === 'schoolAdmin') {
        showClassroomsPage();
        profileDropdown.classList.add('hidden');
    }
});

skillsLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentUserRole === 'admin' || currentUserRole === 'superAdmin' || currentUserRole === 'schoolAdmin') {
        showSkillsPage();
        profileDropdown.classList.add('hidden');
    }
});

let schoolLogoUrlCache = null; 
async function getSchoolLogoUrl() {
    if (schoolLogoUrlCache) return schoolLogoUrlCache; // Use cache if available
    const activeId = getActiveSchoolId();
    if (!activeId) return null;

    try {
        const schoolRef = doc(db, "schools", activeId);
        const schoolSnap = await getDoc(schoolRef);
        if (schoolSnap.exists() && schoolSnap.data().logoUrl) {
            schoolLogoUrlCache = schoolSnap.data().logoUrl; // Save to cache
            return schoolLogoUrlCache;
        }
        return null;
    } catch (error) {
        console.error("Error fetching school logo URL:", error);
        return null;
    }
}

async function fetchImageAsArrayBuffer(url) {
    try {
        const response = await fetch(url);
        return await response.arrayBuffer();
    } catch (error) {
        console.error("Error fetching image as array buffer:", error);
        return null;
    }
}

async function fetchImageAsDataURL(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error fetching image as data URL:", error);
        return null;
    }
}

// Helper function to create a DOCX table from an HTML table
function createTableForDocx(htmlTable) {
        const { Table, TableRow, TableCell, Paragraph, TextRun, ShadingType } = docx;
        const tableRows = [];

        // 1. Process Header
        const headerCells = [];
        const ths = htmlTable.querySelectorAll('thead th');
        ths.forEach(th => {
            headerCells.push(
                new TableCell({
                    children: [new Paragraph({
                        children: [new TextRun({ text: th.innerText, bold: true })]
                    })],
                    shading: {
                        fill: "D4C1A7", // From your --bg-secondary color
                        type: ShadingType.CLEAR,
                    },
                })
            );
        });
        tableRows.push(new TableRow({ children: headerCells }));

        // 2. Process Body
        const trs = htmlTable.querySelectorAll('tbody tr');
        trs.forEach(tr => {
            const bodyCells = [];
            tr.querySelectorAll('td').forEach((td, index) => {
                bodyCells.push(
                    new TableCell({
                        children: [new Paragraph(td.innerText)],
                        // Make the first column bold like in your UI
                        ...(index === 0 && { children: [new Paragraph({ children: [new TextRun({ text: td.innerText, bold: true })] })] }),
                    })
                );
            });
            tableRows.push(new TableRow({ children: bodyCells }));
        });

        return new Table({
            rows: tableRows,
            width: { size: 100, type: docx.WidthType.PERCENTAGE },
        });
    }

logoutLink.addEventListener('click', (e) => {
    e.preventDefault();
    sessionStorage.removeItem('isSubscribing');
    sessionStorage.removeItem('postCheckout'); // Also clear this flag
    signOut(auth).then(() => {
        window.location.reload();
    });
    profileDropdown.classList.add('hidden');
});

profileMenuBtn.addEventListener('click', () => {
    profileDropdown.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
    if (profileMenuBtn && !profileMenuBtn.contains(e.target) && profileDropdown && !profileDropdown.contains(e.target)) {
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

// Add Teacher modal handlers
if (addTeacherBtn) {
    addTeacherBtn.addEventListener('click', () => {
        if (currentUserRole !== 'schoolAdmin') return;
        addTeacherModal?.classList.remove('hidden');
    });
}

async function populateSuperadminSchoolSelect() {
    if (!superadminSchoolSelect) return;
    superadminSchoolSelect.innerHTML = '<option value="" disabled selected>Select a school…</option>';
    try {
        const schoolsSnap = await getDocs(collection(db, 'schools'));
        schoolsSnap.forEach(docSnap => {
            const data = docSnap.data() || {};
            const opt = document.createElement('option');
            opt.value = docSnap.id;
            opt.textContent = data.name || `(unnamed) ${docSnap.id}`;
            superadminSchoolSelect.appendChild(opt);
        });
    } catch (e) {
        console.error('Failed loading schools for superadmin:', e);
    }
}

if (superadminSchoolSelect) {
    superadminSchoolSelect.addEventListener('change', async (e) => {
        selectedSchoolId = e.target.value || null;
        schoolLogoUrlCache = null;
        if (selectedSchoolId) {
            try {
                const schoolSnap = await getDoc(doc(db, 'schools', selectedSchoolId));
                if (schoolSnap.exists()) {
                    const data = schoolSnap.data();
                    applyTheme(data.theme, data.customTheme);
                }
            } catch (err) {
                console.error('Error loading selected school theme:', err);
            }
        }
        // Update settings visibility based on selection
        showSettingsPage();
    });
}
if (closeAddTeacherModalBtn) {
    closeAddTeacherModalBtn.addEventListener('click', () => addTeacherModal.classList.add('hidden'));
}
if (addTeacherForm) {
    addTeacherForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = (teacherEmailInput?.value || '').trim().toLowerCase();
        if (!email) { showMessage('Please enter a teacher email.'); return; }
        if (!currentUserSchoolId) { showMessage('Cannot identify your school.'); return; }
        loadingOverlay.classList.remove('hidden');
        try {
            await addDoc(collection(db, 'schools', currentUserSchoolId, 'invitedTeachers'), {
                email,
                invitedBy: auth.currentUser?.uid || null,
                invitedAt: serverTimestamp(),
                status: 'pending'
            });
            showMessage('Teacher invited. They will gain access on next login.', false);
            addTeacherForm.reset();
            addTeacherModal.classList.add('hidden');
        } catch (err) {
            console.error('Error adding teacher invite:', err);
            showMessage('Failed to add teacher. Please try again.');
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    });
}

addAnecdoteBtn.addEventListener('click', () => {
    // Populate core skills dropdown
    coreSkillSelect.innerHTML = '<option value="" disabled selected>Select Core Skill</option>';
    schoolCoreSkills.forEach(skill => {
        const option = document.createElement('option');
        option.value = skill.name;
        option.textContent = skill.name;
        coreSkillSelect.appendChild(option);
    });
    
    updateMicroSkillsDropdown(coreSkillSelect.value); // Set initial state
    addAnecdoteModal.classList.remove('hidden');
});

// Bulk anecdote open handler
if (bulkAddAnecdoteBtn) {
    bulkAddAnecdoteBtn.addEventListener('click', async () => {
        await populateBulkClassroomSelect();
        // Load students for preselected (teacher) or first classroom
        const classroomId = bulkClassroomSelect.value || bulkClassroomSelect.options[0]?.value;
        if (classroomId) await loadBulkStudentsForClassroom(classroomId);
        populateBulkCoreSkills();
        bulkAddAnecdoteModal.classList.remove('hidden');
    });
}

// Listen for assessment type distribution across the school (dashboard pie chart)
function listenForAssessmentTypeDistribution() {
    if (!currentUserSchoolId || !assessmentTypeChartCanvas) return;
    const q = query(collection(db, 'anecdotes'), where('schoolId', '==', currentUserSchoolId));
    onSnapshot(q, (snapshot) => {
        const counts = { As: 0, Of: 0, For: 0 };
        snapshot.forEach(docSnap => {
            const t = docSnap.data().assessmentType;
            if (t && Object.prototype.hasOwnProperty.call(counts, t)) counts[t]++;
        });
        renderAssessmentTypeChart(assessmentTypeChartCanvas, counts, 'school');
    }, (error) => console.error('Error listening for assessment types:', error));
}

// Listen for assessment type distribution for a specific student (student detail pie chart)
function listenForStudentAssessmentTypes(studentId) {
    if (!studentId || !studentAssessmentTypeChartCanvas) return;
    const q = query(collection(db, 'anecdotes'), where('studentId', '==', studentId));
    onSnapshot(q, (snapshot) => {
        const counts = { As: 0, Of: 0, For: 0 };
        snapshot.forEach(docSnap => {
            const t = docSnap.data().assessmentType;
            if (t && Object.prototype.hasOwnProperty.call(counts, t)) counts[t]++;
        });
        renderAssessmentTypeChart(studentAssessmentTypeChartCanvas, counts, 'student');
    }, (error) => console.error('Error listening for student assessment types:', error));
}

function createPieColors(ctx, colorValue) {
    const base = parseCssColor(colorValue || '#4caf50');
    const c1 = rgbaString(withAlpha(lightenColor(base, 0.10), 0.95));
    const c2 = rgbaString(withAlpha(base, 0.95));
    const c3 = rgbaString(withAlpha(darkenColor(base, 0.18), 0.95));
    return [c1, c2, c3];
}

const RETRO_PIE_COLORS = ['#A85D26', '#93A2B9', '#7C8456'];

function renderAssessmentTypeChart(canvas, counts, scope) {
    if (!canvas) return;
    const labels = ['As', 'Of', 'For'];
    const data = labels.map(l => counts[l] || 0);
    const total = data.reduce((a, b) => a + b, 0);

    const ctx = canvas.getContext('2d');
    const colors = RETRO_PIE_COLORS;

    // Ensure a bounded height to prevent infinite growth
    try {
        const containerWidth = resolveChartContainerWidth({ canvas });
        const targetHeight = computeResponsiveChartHeight(containerWidth);
        const clamped = Math.max(260, Math.min(targetHeight, 420));
        canvas.style.height = `${clamped}px`;
        if (canvas.parentNode && canvas.parentNode.style) {
            canvas.parentNode.style.height = `${clamped}px`;
        }
    } catch (_) { /* ignore sizing errors */ }

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, position: 'bottom' },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const value = context.parsed || 0;
                        const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                        return `${context.label}: ${value} (${pct}%)`;
                    }
                }
            }
        }
    };

    // Destroy previous chart instance
    if (scope === 'school' && assessmentTypeChart) { destroyChartInstance(assessmentTypeChart); assessmentTypeChart = null; }
    if (scope === 'student' && studentAssessmentTypeChart) { destroyChartInstance(studentAssessmentTypeChart); studentAssessmentTypeChart = null; }

    const cfg = {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderColor: colors.map(() => 'rgba(0,0,0,0.08)'),
                borderWidth: 1
            }]
        },
        options
    };

    if (scope === 'school') {
        assessmentTypeChart = new Chart(ctx, cfg);
        attachResponsivePieHandler(assessmentTypeChart);
    } else {
        studentAssessmentTypeChart = new Chart(ctx, cfg);
        attachResponsivePieHandler(studentAssessmentTypeChart);
    }
}

// Listen for content type distribution across the school (dashboard pie chart)
function listenForContentTypeDistribution() {
    if (!currentUserSchoolId || !contentTypeChartCanvas) return;
    const q = query(collection(db, 'anecdotes'), where('schoolId', '==', currentUserSchoolId));
    onSnapshot(q, (snapshot) => {
        const counts = { picture: 0, product: 0, comment: 0 };
        snapshot.forEach(docSnap => {
            const t = (docSnap.data().contentType || '').toLowerCase();
            if (t && Object.prototype.hasOwnProperty.call(counts, t)) counts[t]++;
        });
        renderContentTypeChart(contentTypeChartCanvas, counts);
    }, (error) => console.error('Error listening for content types:', error));
}

function renderContentTypeChart(canvas, counts) {
    if (!canvas) return;
    const labels = ['picture', 'product', 'comment'];
    const data = labels.map(l => counts[l] || 0);
    const total = data.reduce((a, b) => a + b, 0);

    const ctx = canvas.getContext('2d');
    const colors = RETRO_PIE_COLORS;

    try {
        const containerWidth = resolveChartContainerWidth({ canvas });
        const targetHeight = computeResponsiveChartHeight(containerWidth);
        const clamped = Math.max(260, Math.min(targetHeight, 420));
        canvas.style.height = `${clamped}px`;
        if (canvas.parentNode && canvas.parentNode.style) {
            canvas.parentNode.style.height = `${clamped}px`;
        }
    } catch (_) { /* ignore sizing errors */ }

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, position: 'bottom' },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const value = context.parsed || 0;
                        const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                        return `${context.label}: ${value} (${pct}%)`;
                    }
                }
            }
        }
    };

    if (contentTypeChart) { destroyChartInstance(contentTypeChart); contentTypeChart = null; }

    const cfg = {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderColor: colors.map(() => 'rgba(0,0,0,0.08)'),
                borderWidth: 1
            }]
        },
        options
    };

    contentTypeChart = new Chart(ctx, cfg);
    attachResponsivePieHandler(contentTypeChart);
}

// Keep pie charts responsive but bounded, similar to bar charts
function attachResponsivePieHandler(chart) {
    if (!chart) return;
    const handler = () => {
        const canvas = chart.canvas;
        if (!canvas) return;
        try {
            const containerWidth = resolveChartContainerWidth(chart);
            const targetHeight = computeResponsiveChartHeight(containerWidth);
            const clamped = Math.max(260, Math.min(targetHeight, 420));
            canvas.style.height = `${clamped}px`;
            if (canvas.parentNode && canvas.parentNode.style) {
                canvas.parentNode.style.height = `${clamped}px`;
            }
            chart.update('none');
        } catch (_) { /* noop */ }
    };
    handler();
    chart.$responsiveHandler = handler;
    window.addEventListener('resize', handler);
}
// Returns intrinsic width/height for a given image data URL
async function getImageDimensionsFromDataURL(dataUrl) {
    return new Promise((resolve) => {
        try {
            const img = new Image();
            img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
            img.onerror = () => resolve({ width: 0, height: 0 });
            img.src = dataUrl;
        } catch (_) {
            resolve({ width: 0, height: 0 });
        }
    });
}

if (closeBulkAnecdoteModalBtn) {
    closeBulkAnecdoteModalBtn.addEventListener('click', () => {
        bulkAddAnecdoteModal.classList.add('hidden');
    });
}

if (bulkClassroomSelect) {
    bulkClassroomSelect.addEventListener('change', async (e) => {
        await loadBulkStudentsForClassroom(e.target.value);
        // Reset select-all on classroom change
        if (bulkSelectAllStudents) bulkSelectAllStudents.checked = false;
    });
}

if (bulkCoreSkillSelect) {
    bulkCoreSkillSelect.addEventListener('change', (e) => updateBulkMicroSkillsDropdown(e.target.value));
}

if (bulkSelectAllStudents) {
    bulkSelectAllStudents.addEventListener('change', (e) => {
        const checked = e.target.checked;
        bulkStudentList.querySelectorAll('.bulk-student-checkbox').forEach(cb => { cb.checked = checked; });
    });
}

if (bulkAddAnecdoteForm) {
    bulkAddAnecdoteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUserSchoolId) { showMessage('Cannot identify your school.'); return; }
        const classroomId = bulkClassroomSelect.value;
        if (!classroomId) { showMessage('Please select a classroom.'); return; }
        const coreSkill = bulkCoreSkillSelect.value;
        const microSkill = bulkMicroSkillSelect.value;
        if (!coreSkill || !microSkill) { showMessage('Please select a core and micro skill.'); return; }
        const text = document.getElementById('bulkAnecdoteText').value;
        const assessmentType = (document.getElementById('bulkAssessmentType')?.value || '').trim();
        if (!assessmentType) { showMessage('Please select a Type of Assessment.'); return; }
        const imageFile = document.getElementById('bulkAnecdoteImage').files[0];
        const selected = Array.from(bulkStudentList.querySelectorAll('.bulk-student-checkbox'))
            .filter(cb => cb.checked)
            .map(cb => cb.dataset.id);
        if (selected.length === 0) { showMessage('Please select at least one student.'); return; }

        loadingOverlay.classList.remove('hidden');
        try {
            let sharedImageUrl = null;
            if (imageFile) {
                const storageRefPath = `anecdotes/shared/${Date.now()}-${imageFile.name}`;
                const storageRefObj = ref(storage, storageRefPath);
                const uploadResult = await uploadBytes(storageRefObj, imageFile);
                sharedImageUrl = await getDownloadURL(uploadResult.ref);
            }
            const writes = selected.map(studentId => {
                const data = {
                    studentId,
                    coreSkill,
                    microSkill,
                    text,
                    assessmentType,
                    createdAt: serverTimestamp(),
                    createdBy: auth.currentUser.uid,
                    imageUrl: sharedImageUrl,
                    schoolId: currentUserSchoolId
                };
                return addDoc(collection(db, 'anecdotes'), data);
            });
            await Promise.all(writes);
            showMessage('Anecdote(s) saved successfully!', false);
            bulkAddAnecdoteForm.reset();
            bulkAddAnecdoteModal.classList.add('hidden');
        } catch (err) {
            console.error('Error adding bulk anecdotes:', err);
            showMessage('Failed to save anecdotes.');
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    });
}

if (coreSkillSelect) {
    coreSkillSelect.addEventListener('change', (e) => {
        updateMicroSkillsDropdown(e.target.value);
    });
}

closeAnecdoteModalBtn.addEventListener('click', () => addAnecdoteModal.classList.add('hidden'));

closeAnecdoteDisplayBtn.addEventListener('click', () => {
    anecdoteDisplayContainer.classList.add('hidden');
    if (anecdoteChart) {
        destroyChartInstance(anecdoteChart);
        anecdoteChart = null;
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
    if (!currentUserSchoolId) {
        showMessage("Error: Cannot identify your school. Please refresh.");
        return;
    }

	await addDoc(collection(db, "students"), {
		name: document.getElementById('studentName').value,
		grade: document.getElementById('studentGrade').value,
		classroomId: selectedClassroomId, 
		className: selectedClassroomName, 
		parent1Email: parent1Email,
		parent2Email: parent2Email,
		createdAt: serverTimestamp(),
		createdBy: auth.currentUser.uid,
		schoolId: currentUserSchoolId // Add this line
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
        assessmentType: (document.getElementById('assessmentType')?.value || '').trim(),
        contentType: (document.getElementById('contentType')?.value || '').trim(),
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser.uid,
        imageUrl: null,
        schoolId: currentUserSchoolId // Add schoolId
    };

    if(!anecdoteData.coreSkill || !anecdoteData.microSkill) {
        showMessage("Please select a core and micro skill.");
        loadingOverlay.classList.add('hidden');
        return;
    }
    if(!anecdoteData.assessmentType) {
        showMessage("Please select a Type of Assessment.");
        loadingOverlay.classList.add('hidden');
        return;
    }
    if(!anecdoteData.contentType) {
        showMessage("Please select a Content Type.");
        loadingOverlay.classList.add('hidden');
        return;
    }

    const imageFile = document.getElementById('anecdoteImage').files[0];
    console.log("Attempting to add anecdote with data:", anecdoteData);
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
            lastMessage: file ? (text || 'File sent') : text,
            lastUpdated: serverTimestamp() // Added for sorting chats
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

if (backToStudentFromContinuumBtn) {
	backToStudentFromContinuumBtn.addEventListener('click', () => {
		if (currentStudentId) {
			showStudentDetailPage(currentStudentId);
		}
	});
}

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
        // Auth state change will handle the reload
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

rubricView.addEventListener('click', (e) => {
    if (isRubricEditMode) return; 

    const isAdmin = ['admin', 'teacher', 'superAdmin', 'schoolAdmin'].includes(currentUserRole);
    if (isAdmin && e.target.tagName === 'TD' && e.target.id) {
        e.target.classList.toggle('admin-highlight');
        saveRubricHighlights(currentMicroSkill);
    }
});

continuumView.addEventListener('click', (e) => {
    if (isContinuumEditMode) return;

    const isAdmin = ['admin', 'superAdmin', 'schoolAdmin'].includes(currentUserRole);
	if (isAdmin && e.target.tagName === 'TD' && e.target.id) {
        e.target.classList.toggle('admin-highlight');
        saveContinuumHighlights(currentCoreSkill);
    }
});

downloadRubricBtn.addEventListener('click', () => downloadOptionsModal.classList.remove('hidden'));
downloadContinuumBtn.addEventListener('click', () => downloadOptionsModal.classList.remove('hidden'));
cancelDownloadBtn.addEventListener('click', () => downloadOptionsModal.classList.add('hidden'));

downloadDocxBtn.addEventListener('click', async () => {
        downloadOptionsModal.classList.add('hidden');
        loadingOverlay.classList.remove('hidden');
    
        let elementToCapture, fileName, titleText;
    
        if (continuumView && !continuumView.classList.contains('hidden')) {
            elementToCapture = document.querySelector('#continuum-table-container .rubric-table');
            titleText = continuumTitle.textContent;
            fileName = `${currentCoreSkill}-continuum.docx`;
        } else if (rubricView && !rubricView.classList.contains('hidden')) {
            elementToCapture = document.querySelector('#rubric-table-container table');
            titleText = rubricTitle.textContent;
            fileName = `${currentMicroSkill}-rubric.docx`;
        }
    
        if (!elementToCapture) {
            loadingOverlay.classList.add('hidden');
            showMessage("Could not find content to download.");
            return;
        }
    
        const { Document, Packer, Paragraph, HeadingLevel, ImageRun } = docx;
        try {
            const table = createTableForDocx(elementToCapture);
            const docChildren = [
                new Paragraph({ text: titleText, heading: HeadingLevel.HEADING_1 })
            ];

            // --- NEW LOGO LOGIC ---
            const logoUrl = await getSchoolLogoUrl();
            if (logoUrl) {
                const logoArrayBuffer = await fetchImageAsArrayBuffer(logoUrl);
                if (logoArrayBuffer) {
                    docChildren.unshift( // Add logo to the very top
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    data: logoArrayBuffer,
                                    transformation: { width: 150, height: 80 },
                                }),
                            ],
                            alignment: docx.AlignmentType.RIGHT,
                        })
                    );
                }
            }
            // --- END NEW LOGO LOGIC ---

            docChildren.push(new Paragraph(" ")); // Add a space
            docChildren.push(table); // Add the table

            const doc = new Document({
                sections: [{ children: docChildren }]
            });
    
            // Use Packer to generate the blob
            const blob = await Packer.toBlob(doc);
            // Use FileSaver.js to save the file
            saveAs(blob, fileName);
    
        } catch (error) {
            console.error("Error generating DOCX:", error);
            showMessage("Could not download as DOCX.");
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    });

downloadPdfBtn.addEventListener('click', async () => {
    downloadOptionsModal.classList.add('hidden');
    loadingOverlay.classList.remove('hidden');

    let elementToCapture, fileName;
    const studentNameText = studentDetailName.textContent.trim() || 'student';

    if (continuumView && !continuumView.classList.contains('hidden')) {
        elementToCapture = document.querySelector('#continuum-table-container .rubric-table');
        fileName = `${currentCoreSkill}-continuum-${studentNameText}.pdf`;
    } else if (rubricView && !rubricView.classList.contains('hidden')) {
        elementToCapture = document.querySelector('#rubric-table-container table');
        fileName = `${currentMicroSkill}-rubric-${studentNameText}.pdf`;
    }

    if (!elementToCapture) {
        loadingOverlay.classList.add('hidden');
        showMessage("Could not find content to download.");
        return;
    }
    
    // --- NEW LOGO LOGIC ---
    const logoUrl = await getSchoolLogoUrl();
    let logoImg = null;
    if (logoUrl) {
        logoImg = document.createElement('img');
        logoImg.src = logoUrl;
        logoImg.style = "position: absolute; top: 15px; right: 20px; max-height: 80px; max-width: 150px; z-index: 50;";
        // Prepend to make it part of the captured element
        elementToCapture.style.position = 'relative'; // Ensure parent is 'relative'
        elementToCapture.prepend(logoImg);
        
        // Give the image a moment to render
        await new Promise(r => setTimeout(r, 500)); 
    }
    // --- END NEW LOGO LOGIC ---
    
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
        loadingOverlay.classList.add('hidden');
        // --- NEW CLEANUP LOGIC ---
        if (logoImg) {
            logoImg.remove(); // Clean up the injected logo
            elementToCapture.style.position = '';
        }
        // --- END NEW CLEANUP LOGIC ---
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
        // Fetch current assessmentType from Firestore for accuracy
        (async () => {
            try {
                const snap = await getDoc(doc(db, 'anecdotes', anecdoteId));
                const data = snap.exists() ? snap.data() : {};
                const currentType = (data.assessmentType || 'As');
                const sel = document.getElementById('editAssessmentType');
                if (sel) sel.value = ['As','Of','For'].includes(currentType) ? currentType : 'As';
            } catch (_) { /* ignore */ }
            editAnecdoteModal.classList.remove('hidden');
        })();
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
    const newType = (document.getElementById('editAssessmentType')?.value || '').trim();
    if (!anecdoteId || !newText.trim()) return;
    loadingOverlay.classList.remove('hidden');
    const anecdoteRef = doc(db, "anecdotes", anecdoteId);
    try {
        const updatePayload = { text: newText, editedAt: serverTimestamp() };
        if (newType) updatePayload.assessmentType = newType;
        await updateDoc(anecdoteRef, updatePayload);
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
        // Persist selection opportunistically with debounce; ignore failures
        debouncedSaveJourneySelection(currentStudentId, selectedJourneyAnecdotes);
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
        // Persist current selection for this user and student
        await saveJourneySelection(currentStudentId, selectedJourneyAnecdotes);
        const generateSummary = httpsCallable(functions, 'generateJourneySummary');

        const result = await generateSummary({
            studentName: studentName,
            anecdoteIds: selectedJourneyAnecdotes
        });

        currentJourneyStudentName = studentName;
        journeyEditorTitle.textContent = `Learning Journey Draft for ${studentName}`;
        if (journeyTitleInput) {
            journeyTitleInput.value = `Learning Journey for ${studentName}`;
        }
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

downloadJourneyPdfBtn.addEventListener('click', async () => { // <-- Made async
    const title = (journeyTitleInput && journeyTitleInput.value ? journeyTitleInput.value.trim() : '') || `Learning Journey for ${currentJourneyStudentName}`;
    const summaryText = journeySummaryTextarea.value;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    // --- NEW LOGO LOGIC ---
    const logoUrl = await getSchoolLogoUrl();
    if (logoUrl) {
        try {
            const logoDataUrl = await fetchImageAsDataURL(logoUrl);
            if (logoDataUrl) {
                // Position at top-right: (x, y, width, height)
                pdf.addImage(logoDataUrl, 'PNG', 150, 5, 45, 15);
            }
        } catch (e) {
            console.error("Could not add logo to PDF:", e);
        }
    }
    // --- END NEW LOGO LOGIC ---

    const margin = 20;
    pdf.setFontSize(18);
    pdf.text(title, margin, 28);

    pdf.setFontSize(12);
    pdf.setLineHeightFactor(1.35);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const usableWidth = pageWidth - margin * 2;
    const bodyY = 40;

    // Prepare images from selected anecdotes (but do not include anecdote text)
    let images = [];
    try {
        if (selectedJourneyAnecdotes && selectedJourneyAnecdotes.length) {
            const snaps = await Promise.all(selectedJourneyAnecdotes.map(id => getDoc(doc(db, 'anecdotes', id))));
            const withUrls = snaps.filter(s => s.exists()).map(s => s.data()).filter(a => a && a.imageUrl);
            for (const a of withUrls) {
                try {
                    const dataUrl = await fetchImageAsDataURL(a.imageUrl);
                    if (!dataUrl) continue;
                    const dims = await getImageDimensionsFromDataURL(dataUrl);
                    if (!dims.width || !dims.height) continue;
                    images.push({ dataUrl, dims });
                } catch (_) { /* ignore */ }
            }
        }
    } catch (e) {
        console.error('Failed to prepare images for PDF:', e);
    }

    // Draw summary paragraphs, placing images beside the AI text
    const lineHeight = 6; // approx line height in mm
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgTargetW = Math.min(40, usableWidth * 0.35); // mm (smaller image)
    const gap = 5; // mm between text and image
    let y = bodyY;

    const paragraphs = summaryText
        .split(/\n\s*\n/) // split on blank lines into paragraphs
        .map(p => p.trim())
        .filter(p => p.length > 0);

    const safeParagraphs = paragraphs.length ? paragraphs : [summaryText.trim().length ? summaryText.trim() : ' '];

    for (const para of safeParagraphs) {
        // Page break if approaching bottom margin
        if (y > pageHeight - margin - lineHeight * 2) {
            pdf.addPage();
            y = margin;
        }

        let useImage = images.length > 0;
        let drawW = 0, drawH = 0, imgX = 0, imgY = 0, fmt = 'PNG';
        let textW = usableWidth;
        if (useImage) {
            const { dataUrl, dims } = images.shift();
            const scale = imgTargetW / dims.width;
            drawW = imgTargetW;
            drawH = dims.height * scale;
            imgX = margin + usableWidth - drawW;
            imgY = y;
            fmt = (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) ? 'JPEG' : 'PNG';

            // Ensure there's room for at least part of the block; if not, new page
            const blockMin = Math.max(drawH, lineHeight * 3);
            if (y + blockMin > pageHeight - margin) {
                pdf.addPage();
                y = margin;
                imgY = y;
            }

            // Draw image first
            pdf.addImage(dataUrl, fmt, imgX, imgY, drawW, drawH);
            textW = usableWidth - drawW - gap;
        }

        // Text beside image (if any)
        const lines = pdf.splitTextToSize(para, Math.max(30, textW));
        const maxBesideLines = useImage ? Math.max(0, Math.floor(drawH / lineHeight)) : 0;
        const firstLines = useImage ? lines.slice(0, maxBesideLines) : lines;
        const restLines = useImage ? lines.slice(maxBesideLines) : [];

        if (firstLines.length) {
            pdf.text(firstLines, margin, y + 4);
        }

        let cursorY = y + (useImage ? Math.max(drawH, lineHeight * Math.max(1, firstLines.length)) : lineHeight * Math.max(1, firstLines.length));
        cursorY += 4;

        // Remaining lines at full width
        if (restLines.length) {
            const remainingHeight = lineHeight * restLines.length;
            if (cursorY + remainingHeight > pageHeight - margin) {
                pdf.addPage();
                cursorY = margin;
            }
            pdf.text(restLines, margin, cursorY);
            cursorY += remainingHeight;
        }

        y = cursorY + 6; // spacing before next paragraph
    }

    const nameForFile = (currentJourneyStudentName && currentJourneyStudentName.trim()) ? currentJourneyStudentName : 'Student';
    pdf.save(`Learning-Journey-${nameForFile.replace(/\s+/g, '-')}.pdf`);
});

downloadJourneyDocxBtn.addEventListener('click', async () => {
        const { Document, Packer, Paragraph, HeadingLevel, ImageRun } = docx;

        const titleText = (journeyTitleInput && journeyTitleInput.value ? journeyTitleInput.value.trim() : '') || `Learning Journey for ${currentJourneyStudentName}`;
        const summaryText = journeySummaryTextarea.value;
        const nameForFile = (currentJourneyStudentName && currentJourneyStudentName.trim()) ? currentJourneyStudentName : 'Student';
        const fileName = `Learning-Journey-${nameForFile.replace(/\s+/g, '-')}.docx`;

        try {
            const docChildren = [
                new Paragraph({ text: titleText, heading: HeadingLevel.HEADING_1 }),
            ];

            // --- NEW LOGO LOGIC ---
            const logoUrl = await getSchoolLogoUrl();
            if (logoUrl) {
                const logoArrayBuffer = await fetchImageAsArrayBuffer(logoUrl);
                if (logoArrayBuffer) {
                    docChildren.unshift( // Add logo to the very top
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    data: logoArrayBuffer,
                                    transformation: { width: 150, height: 80 },
                                }),
                            ],
                            alignment: docx.AlignmentType.RIGHT,
                        })
                    );
                }
            }
            // --- END NEW LOGO LOGIC ---

            // Prepare images (bytes + dims) from selected anecdotes
            let images = [];
            if (selectedJourneyAnecdotes && selectedJourneyAnecdotes.length) {
                try {
                    const snaps = await Promise.all(
                        selectedJourneyAnecdotes.map(id => getDoc(doc(db, 'anecdotes', id)))
                    );
                    const withUrls = snaps
                        .filter(s => s.exists())
                        .map(s => s.data())
                        .filter(a => a && a.imageUrl);
                    for (const a of withUrls) {
                        try {
                            const dimsUrl = await fetchImageAsDataURL(a.imageUrl);
                            if (!dimsUrl) continue;
                            const dims = await getImageDimensionsFromDataURL(dimsUrl);
                            if (!dims.width || !dims.height) continue;
                            const bytes = await fetchImageAsArrayBuffer(a.imageUrl);
                            if (!bytes) continue;
                            images.push({ bytes, dims });
                        } catch (_) { /* ignore */ }
                    }
                } catch (e) {
                    console.error('Failed to prepare images for DOCX:', e);
                }
            }

            // Build AI summary paragraphs, floating one image (if available) beside each paragraph
            const paragraphs = summaryText
                .split(/\n\s*\n/)
                .map(p => p.trim())
                .filter(p => p.length > 0);
            const safeParagraphs = paragraphs.length ? paragraphs : [summaryText.trim().length ? summaryText.trim() : ' '];

            for (const p of safeParagraphs) {
                if (images.length) {
                    const { bytes, dims } = images.shift();
                    // target width to allow wrapping
                    const targetWidthPx = 140; // smaller image beside text
                    const scale = Math.min(targetWidthPx / dims.width, 1);
                    const outW = Math.max(1, Math.round(dims.width * scale));
                    const outH = Math.max(1, Math.round(dims.height * scale));

                    docChildren.push(new Paragraph({
                        children: [
                            new ImageRun({
                                data: bytes,
                                transformation: { width: outW, height: outH },
                                floating: {
                                    horizontalPosition: { align: docx.HorizontalPositionAlign.RIGHT },
                                    verticalPosition: { align: docx.VerticalPositionAlign.TOP },
                                    wrap: {
                                        type: docx.TextWrappingType.SQUARE,
                                        side: docx.TextWrappingSide.BOTH,
                                    },
                                },
                            }),
                            new docx.TextRun({ text: p })
                        ],
                        spacing: { after: 200 },
                    }));
                } else {
                    docChildren.push(new Paragraph({ text: p, spacing: { after: 200 } }));
                }
            }

            const doc = new Document({
                sections: [{ children: docChildren }]
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, fileName);

        } catch (error) {
            console.error("Error generating DOCX:", error);
            showMessage("Could not download as DOCX.");
        }
    });

// --- User Management ---
async function showUsersPage() {
    showView(usersView);
    usersListBody.innerHTML = '<tr><td colspan="2" class="text-center p-4">Loading users...</td></tr>';

    if (!currentUserSchoolId && currentUserRole !== 'superAdmin') {
        usersListBody.innerHTML = '<tr><td colspan="2" class="text-center p-4">Cannot determine your school.</td></tr>';
        return;
    }

    const usersRef = collection(db, "users");
    let q;

    // A superAdmin sees ALL users. A schoolAdmin only sees users from their school.
    if (currentUserRole === 'superAdmin') {
        q = query(usersRef);
    } else {
        q = query(usersRef, where("schoolId", "==", currentUserSchoolId));
    }
    
    try {
        const snapshot = await getDocs(q);
        usersListBody.innerHTML = '';
        if (snapshot.empty) {
             usersListBody.innerHTML = '<tr><td colspan="2" class="text-center p-4">No users found.</td></tr>';
             return;
        }
        
        snapshot.forEach(doc => {
            const raw = doc.data();
            const user = { ...raw, uid: raw.uid || doc.id };
            const tr = document.createElement('tr');

            const isSelf = (auth.currentUser && user.uid === auth.currentUser.uid);
            const selectDisabledAttr = isSelf ? 'disabled title="You cannot change your own role"' : '';

            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${user.displayName || user.email}</div>
                    <div class="text-sm text-gray-500">${user.email}${isSelf ? ' <span class="ml-2 text-xs text-gray-400">(you)</span>' : ''}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <select data-uid="${user.uid}" data-original-role="${user.role || ''}" class="role-select bg-gray-50 border border-gray-300 text-sm rounded-lg p-2" ${selectDisabledAttr}>
                        <option value="guest" ${user.role === 'guest' ? 'selected' : ''}>Guest</option>
                        <option value="parent" ${user.role === 'parent' ? 'selected' : ''}>Parent</option> 
                        <option value="teacher" ${user.role === 'teacher' ? 'selected' : ''}>Teacher</option>
                        <option value="schoolAdmin" ${user.role === 'schoolAdmin' ? 'selected' : ''}>School Admin</option>
                        ${currentUserRole === 'superAdmin' ? `<option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>` : ''}
                        ${currentUserRole === 'superAdmin' ? `<option value=\"superAdmin\" ${user.role === 'superAdmin' ? 'selected' : ''}>Super Admin</option>` : ''}
                    </select>
                </td>
            `;;
            usersListBody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        usersListBody.innerHTML = '<tr><td colspan="2" class="text-center p-4 text-red-500">Error loading users.</td></tr>';
    }
}

async function updateUserRole(userId, newRole) {
    // Prevent self-modification of role
    if (auth.currentUser && userId === auth.currentUser.uid) {
        showMessage("You cannot change your own role.");
        return;
    }
    // Simple client-side guard: only superAdmin may assign admin/superAdmin
    if (['admin','superAdmin'].includes(newRole) && currentUserRole !== 'superAdmin') {
        showMessage("Only Super Admin can assign admin roles.");
        return;
    }
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
        // If attempting to change own role, revert selection and block
        if (auth.currentUser && userId === auth.currentUser.uid) {
            const original = e.target.getAttribute('data-original-role') || '';
            if (original) e.target.value = original;
            showMessage("You cannot change your own role.");
            return;
        }
        if (userId && newRole) {
            updateUserRole(userId, newRole);
        }
    }
});

// --- CLASSROOM MANAGEMENT ---
async function populateTeacherDropdown(dropdownElement) {
    console.log("populateTeacherDropdown started."); // New Log
    dropdownElement.innerHTML = ''; // Clear existing options first
    dropdownElement.innerHTML = '<option value="">Select a teacher</option>';

    // Log the school ID being used for the query
    console.log("Querying teachers for schoolId:", getActiveSchoolId()); // New Log
    if (!getActiveSchoolId()) {
        console.error("Cannot populate teachers: currentUserSchoolId is missing."); // New Log
        dropdownElement.innerHTML = '<option value="">Could not find school ID</option>';
        return;
    }

    const usersRef = collection(db, "users");
    // Ensure this query includes 'schoolAdmin'
    const q = query(usersRef, where("schoolId", "==", getActiveSchoolId()), where("role", "in", ["teacher", "admin", "superAdmin", "schoolAdmin"]));

    try {
        const snapshot = await getDocs(q);
        console.log(`Found ${snapshot.size} potential teachers.`); // New Log

        teachers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (teachers.length === 0) {
            console.log("No users matched the teacher query."); // New Log
            dropdownElement.innerHTML = '<option value="">No teachers found</option>';
            return;
        }

        teachers.forEach(teacher => {
            const option = document.createElement('option');
            option.value = teacher.id;
            option.textContent = teacher.displayName || teacher.email;
            dropdownElement.appendChild(option);
        });
        console.log("Teacher dropdown populated."); // New Log
    } catch (error) {
        console.error("Error fetching teachers:", error); // New Log
        showMessage("Error loading teachers list. Check console.");
        dropdownElement.innerHTML = '<option value="">Error loading teachers</option>';
    }
}

async function populateClassroomDropdown() {
    studentClassSelect.innerHTML = '<option value="" disabled selected>Loading classrooms...</option>';
    
    if (!currentUserSchoolId) {
         studentClassSelect.innerHTML = '<option value="" disabled>School ID not found</option>';
         return;
    }

    const q = query(collection(db, "classrooms"), where("schoolId", "==", currentUserSchoolId), orderBy("className"));
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
	if (!currentUserSchoolId) return;
    const q = query(collection(db, "classrooms"), where("schoolId", "==", currentUserSchoolId), orderBy("className"));
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

// Main function to show the skills management page
function showSkillsPage() {
    showView(skillsView);
    renderSkillsList();
}

// Function to fetch skills from Firestore and render them to the page
async function renderSkillsList() {
    skillsListContainer.innerHTML = '<p class="text-gray-500">Loading skills...</p>';
    const isAdmin = ['admin', 'superAdmin', 'schoolAdmin'].includes(currentUserRole); // Check if user can edit
    if (getOriginalTemplateBtn) { getOriginalTemplateBtn.classList.toggle('hidden', !isAdmin); }

    try {
        // Fetch CONTINUUMS (Core Skills)
        const skillsRef = collection(db, "continuums");
        const allSkillsSnap = await getDocs(query(skillsRef, orderBy("name"))); // Fetch all, order by name

        console.log("Raw snapshot size:", allSkillsSnap.size);

        const filteredSkills = allSkillsSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() })) // Map to objects
            .filter(c => {
                // Keep if it belongs to the school OR if it's a template (no schoolId or schoolId is null)
                return c.schoolId === currentUserSchoolId || c.schoolId === undefined || c.schoolId === null;
            })
            .filter(c => c.name); // Ensure name exists before sorting/displaying

        console.log("Filtered skills count:", filteredSkills.length);

        // For schoolAdmins, prefer the school-owned version when both template and school copy exist
        let skillsToRender = filteredSkills;
        if (currentUserRole === 'schoolAdmin' && currentUserSchoolId) {
            const byName = new Map();
            filteredSkills.forEach(s => {
                const key = (s.name || '').toLowerCase();
                const isSchool = s.schoolId === currentUserSchoolId;
                const existing = byName.get(key);
                if (!existing) {
                    byName.set(key, s);
                } else {
                    const existingIsSchool = existing.schoolId === currentUserSchoolId;
                    if (isSchool && !existingIsSchool) {
                        byName.set(key, s);
                    }
                }
            });
            skillsToRender = Array.from(byName.values());
        }

        if (skillsToRender.length === 0) {
            skillsListContainer.innerHTML = '<p class="text-gray-500">No core skills found. Add a new skill to get started.</p>';
            skillsListContainer.className = 'space-y-6'; // Reset class if empty
            addCoreSkillBtn.classList.toggle('hidden', !isAdmin);
            if (getOriginalTemplateBtn) { getOriginalTemplateBtn.classList.toggle('hidden', !isAdmin); }
            return;
        }

        skillsListContainer.innerHTML = '';
        skillsListContainer.className = 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6';

        skillsToRender.forEach(skill => {
            const skillId = skill.id;
            const isMasterTemplate = skill.schoolId === null || skill.schoolId === undefined;

            const skillCard = document.createElement('div');
            skillCard.className = 'skill-card relative p-4 border rounded-lg text-center';
            skillCard.dataset.skill = skill.name;

            let adminButtons = '';
            if (isAdmin) {
                const showDelete = (!isMasterTemplate || currentUserRole === 'superAdmin');
                adminButtons = `
                    <div class="absolute top-2 right-2 flex space-x-1">
                        <button class="edit-skill-btn text-gray-400 hover:text-blue-600 p-1" data-id="${skillId}" title="${isMasterTemplate && currentUserRole !== 'superAdmin' ? 'Clone to your school and edit' : 'Edit Skill'}">
                           <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                        </button>
                        ${showDelete ? `
                        <button class="delete-skill-btn text-gray-400 hover:text-red-600 p-1" data-id="${skillId}" title="Delete Skill">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
                        </button>` : ''}
                    </div>
                `;
            }

            skillCard.innerHTML = `
                ${adminButtons}
                <h3 class="font-bold text-center mt-4">${skill.name}</h3>
            `;
            skillsListContainer.appendChild(skillCard);
        });

        addCoreSkillBtn.classList.toggle('hidden', !isAdmin);
        if (getOriginalTemplateBtn) { getOriginalTemplateBtn.classList.toggle('hidden', !isAdmin); }

    } catch (error) {
        console.error("Error rendering skills list:", error);
        skillsListContainer.innerHTML = '<p class="text-red-500">Error loading skills. Please check the console.</p>';
        skillsListContainer.className = 'space-y-6';
    }
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
            createdAt: serverTimestamp(),
			schoolId: currentUserSchoolId
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
        
        // Reuse the existing openChat function, ensure uid fallback to doc id
        openChat({ ...parentData, uid: parentData.uid || parentUserDoc.id });
        
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

function showSchoolLogoSettings() {
    const activeId = getActiveSchoolId();
    const canManageBranding = ['schoolAdmin', 'superAdmin'].includes(currentUserRole) && !!activeId;
    if (canManageBranding) {
        schoolLogoSettings.classList.remove('hidden');
        // Check if a logo already exists and show it
        const schoolRef = doc(db, "schools", activeId);
        getDoc(schoolRef).then(schoolSnap => {
            if (schoolSnap.exists() && schoolSnap.data().logoUrl) {
                schoolLogoPreview.src = schoolSnap.data().logoUrl;
                schoolLogoPreviewContainer.classList.remove('hidden');
            } else {
                schoolLogoPreviewContainer.classList.add('hidden');
            }
        });
    } else {
        schoolLogoSettings.classList.add('hidden');
    }
}

// --- NOTIFICATION SETTINGS ---
async function showSettingsPage() {
    showView(settingsView);
    const user = auth.currentUser;
    if (!user) return;

    // SuperAdmin school picker visibility
    if (superadminSchoolPicker) {
        superadminSchoolPicker.classList.toggle('hidden', currentUserRole !== 'superAdmin');
    }

    // Ensure School Theme section is visible for schoolAdmin and superAdmin when an active school is set
    if (schoolThemeSettings) {
        const canManageTheme = ['schoolAdmin', 'superAdmin'].includes(currentUserRole) && !!getActiveSchoolId();
        schoolThemeSettings.classList.toggle('hidden', !canManageTheme);
    }

    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists() && docSnap.data().notificationSettings) {
        const settings = docSnap.data().notificationSettings;
        // messageEmailsToggle.checked = settings.newMessage;
    }

    initializeThemeControls();
    // Also update branding panel visibility based on role and active school selection
    if (typeof showSchoolLogoSettings === 'function') {
        showSchoolLogoSettings();
    }

    if (currentTheme === 'custom') {
        const config = normalizeCustomThemeConfig(currentCustomTheme || getCustomThemeFromInputs() || savedCustomTheme || defaultCustomThemeConfig);
        if (config) {
            currentCustomTheme = config;
            setCustomThemeInputs(config);
            toggleCustomThemeControls(true);
            updateCustomThemePreview(config);
        } else {
            toggleCustomThemeControls(true);
        }
        const hasUnsavedCustom = savedTheme !== 'custom' || !areCustomThemesEqual(config, savedCustomTheme);
        if (hasUnsavedCustom) {
            pendingThemeSelection = 'custom';
            pendingCustomTheme = config;
        } else {
            pendingThemeSelection = null;
            pendingCustomTheme = null;
        }
    } else {
        toggleCustomThemeControls(false);
        pendingCustomTheme = null;
        pendingThemeSelection = currentTheme !== savedTheme ? currentTheme : null;
    }

    updateSaveButtonsState();
}

/**
 * Applies a color theme by setting a data-theme attribute on the <html> element.
 * @param {string} themeName - The name of the theme (e.g., "ocean", "forest")
 * @param {object|null} customThemeConfig - Custom theme configuration when themeName is "custom"
 * @param {object} options - Additional options (e.g., { isPreview: true })
 */
function applyTheme(themeName, customThemeConfig = null, options = {}) {
    if (!themeName) {
        themeName = "default"; // Fallback to default
    }

    const { isPreview = false } = options;
    currentTheme = themeName;
    const themeButtons = document.querySelectorAll('.theme-btn');

    if (themeName === 'custom') {
        const config = normalizeCustomThemeConfig(customThemeConfig || currentCustomTheme || getCustomThemeFromInputs() || defaultCustomThemeConfig);
        currentCustomTheme = config;
        applyCustomThemeVariables(generateCustomPalette(config));
        document.documentElement.dataset.theme = 'custom';
        toggleCustomThemeControls(true);
        setCustomThemeInputs(config);
        updateCustomThemePreview(config);
        if (!isPreview) {
            savedTheme = 'custom';
            savedCustomTheme = config;
            pendingThemeSelection = null;
            pendingCustomTheme = null;
        }
    } else {
        document.documentElement.dataset.theme = themeName;
        resetCustomThemeVariables();
        toggleCustomThemeControls(false);
        if (!isPreview) {
            savedTheme = themeName;
            savedCustomTheme = null;
            pendingThemeSelection = null;
            pendingCustomTheme = null;
        }
    }

    console.log(`Theme applied: ${themeName}${isPreview ? ' (preview)' : ''}`);
    
    // Update active state in settings
    themeButtons.forEach(btn => {
        if (btn.dataset.theme === themeName) {
            btn.style.borderColor = 'rgb(34 197 94)'; // Green border
        } else {
            btn.style.borderColor = 'rgb(209 213 219)'; // Gray border
        }
    });

    updateSaveButtonsState();
}

/**
 * Saves the admin's theme preference to the school's document in Firestore.
 * @param {string} themeName - The name of the theme to save
 */
async function saveThemePreference(themeName, customThemeConfig = null) {
    const canManageTheme = ['schoolAdmin', 'superAdmin'].includes(currentUserRole);
    const activeId = getActiveSchoolId();
    if (!activeId || !canManageTheme) {
        return;
    }
    if (!themeName) return;

    const normalizedConfig = themeName === 'custom'
        ? normalizeCustomThemeConfig(customThemeConfig || currentCustomTheme || getCustomThemeFromInputs())
        : null;

    if (themeName !== 'custom' && themeName === savedTheme) {
        updateSaveButtonsState();
        return;
    }

    if (themeName === 'custom' && areCustomThemesEqual(normalizedConfig, savedCustomTheme)) {
        updateSaveButtonsState();
        return;
    }
    
    setThemeSaveInProgress(true);
    loadingOverlay.classList.remove('hidden');
    try {
        const schoolRef = doc(db, "schools", activeId);
        const payload = themeName === 'custom'
            ? { theme: themeName, customTheme: normalizedConfig }
            : { theme: themeName, customTheme: deleteField() };

        await updateDoc(schoolRef, payload);
        applyTheme(themeName, normalizedConfig, { isPreview: false }); // Apply it immediately and mark as saved
        showMessage("Theme saved successfully!", false);
        pendingThemeSelection = null;
        pendingCustomTheme = null;
        updateSaveButtonsState();
    } catch (error) {
        console.error("Error saving theme:", error);
        // This is a Firestore rules error, we'll fix this next.
        if (error.code === 'permission-denied') {
            showMessage("Error: You do not have permission to change settings.");
        } else {
            showMessage("Could not save theme.");
        }
    } finally {
        loadingOverlay.classList.add('hidden');
        setThemeSaveInProgress(false);
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

messageEmailsToggle.addEventListener('change', (e) => {
    updateNotificationSetting('newMessage', e.target.checked);
});

// --- CONTINUUM EDITING AND HIGHLIGHTING ---
function setContinuumMode(mode) {
    const table = continuumTableContainer.querySelector('table');
    if (!table) return;

    isContinuumEditMode = (mode === 'edit');
    
    // Toggle button visibility
    editContinuumBtn.classList.toggle('hidden', mode === 'edit');
    saveContinuumBtn.classList.toggle('hidden', mode !== 'edit');
    cancelContinuumBtn.classList.toggle('hidden', mode !== 'edit');
    downloadContinuumBtn.classList.toggle('hidden', mode === 'edit');
	if (backToStudentFromContinuumBtn) {
		backToStudentFromContinuumBtn.classList.toggle('hidden', mode === 'edit'); // Hide back button in edit mode
	}

    // Make table cells editable OR just clickable for highlighting
    table.querySelectorAll('th, td').forEach(cell => {
        cell.contentEditable = (mode === 'edit');
        if(mode === 'edit') cell.classList.add('editing-cell');
        else cell.classList.remove('editing-cell');
    });
    table.classList.toggle('admin-clickable', mode === 'highlight');
    table.classList.toggle('edit-mode', mode === 'edit');
}

// --- UPDATED `saveContinuumChanges` (with copy-on-write logic) ---
async function saveContinuumChanges() {
    const table = continuumTableContainer.querySelector('table');
    if (!table) return;
    loadingOverlay.classList.remove('hidden');

    // Reconstruct the data object from the HTML table
    const newData = {
        name: currentCoreSkill,
        headers: [],
        rows: []
    };

    table.querySelectorAll('thead th').forEach(th => {
        newData.headers.push(th.innerText);
    });

    table.querySelectorAll('tbody tr').forEach(tr => {
        const rowData = { skillLabel: '', levels: [] };
        const cells = tr.querySelectorAll('td');
        if(cells.length > 0) {
            rowData.skillLabel = cells[0].innerHTML.replace(/<br\s*\/?>/gi, '\n'); // Convert <br> back to \n
            for (let i = 1; i < cells.length; i++) {
                rowData.levels.push(cells[i].innerText);
            }
            newData.rows.push(rowData);
        }
    });

    try {
        const editingDocId = continuumView.dataset.editingDocId;
        const isEditingMaster = continuumView.dataset.isMasterTemplate === 'true';
        if (!editingDocId) throw new Error("Document ID not found.");

        if (isEditingMaster && currentUserRole !== 'superAdmin') {
            console.log(`Copy-on-write for continuum template ${editingDocId}`);
            const templateRef = doc(db, "continuums", editingDocId);
            const templateSnap = await getDoc(templateRef);
            if (!templateSnap.exists()) throw new Error("Original template not found.");
            const fullTemplateData = templateSnap.data();
            
            const finalNewData = { ...fullTemplateData, ...newData, schoolId: currentUserSchoolId };
            
            const newContinuumRef = await addDoc(collection(db, "continuums"), finalNewData);
            continuumView.dataset.editingDocId = newContinuumRef.id;
            continuumView.dataset.isMasterTemplate = 'false';
        } else {
            console.log(`Updating existing continuum doc: ${editingDocId}`);
            const continuumRef = doc(db, "continuums", editingDocId);
            await setDoc(continuumRef, newData, { merge: true });
        }
        
        showMessage("Continuum saved successfully!", false);
        originalContinuumData = newData; // Update the 'cancel' data
        setContinuumMode('highlight'); // Exit edit mode
    } catch (error) {
        console.error("Error saving continuum:", error);
        showMessage("Failed to save continuum.");
    } finally {
        loadingOverlay.classList.add('hidden');
    }
}

// Add event listeners for the continuum buttons
editContinuumBtn.addEventListener('click', () => {
    setContinuumMode('edit');
});

cancelContinuumBtn.addEventListener('click', () => {
    // Re-fetch and re-render to discard changes
    showContinuumPage(currentCoreSkill);
    setContinuumMode('highlight'); // Go back to highlight mode
});

saveContinuumBtn.addEventListener('click', saveContinuumChanges);

// --- RUBRIC EDITING AND HIGHLIGHTING ---
function setRubricMode(mode) {
    const table = rubricTableContainer.querySelector('table');
    if (!table) return;

    isRubricEditMode = (mode === 'edit');
    
    // Toggle button visibility based on the current mode
    editRubricBtn.classList.toggle('hidden', mode === 'edit');
    saveRubricBtn.classList.toggle('hidden', mode !== 'edit');
    cancelRubricBtn.classList.toggle('hidden', mode !== 'edit');
    downloadRubricBtn.classList.toggle('hidden', mode === 'edit');
    backToAnecdotesBtn.classList.toggle('hidden', mode === 'edit');

    // Make table cells editable or just clickable for highlighting
    table.querySelectorAll('th, td').forEach(cell => {
        cell.contentEditable = (mode === 'edit');
        if(mode === 'edit') cell.classList.add('editing-cell');
        else cell.classList.remove('editing-cell');
    });
    table.classList.toggle('admin-clickable', mode === 'highlight');
    table.classList.toggle('edit-mode', mode === 'edit');
}

// --- UPDATED `saveRubricChanges` (with copy-on-write logic) ---
async function saveRubricChanges() {
    const table = rubricTableContainer.querySelector('table');
    if (!table) return;
    loadingOverlay.classList.remove('hidden');
    
    const newData = { name: currentMicroSkill, headers: [], rows: [] };

    // Reconstruct the data from the edited HTML table
    table.querySelectorAll('thead th').forEach((th, index) => {
        if (index > 0) newData.headers.push(th.innerText); // Skip the first "Behavior" header
    });

    table.querySelectorAll('tbody tr').forEach(tr => {
        const rowData = { skillLabel: '', levels: [] };
        const cells = tr.querySelectorAll('td');
        if(cells.length > 0) {
            rowData.skillLabel = cells[0].innerHTML.replace(/<br\s*\/?>/gi, '\n'); // Convert <br> back to \n
            for (let i = 1; i < cells.length; i++) {
                rowData.levels.push(cells[i].innerText);
            }
            newData.rows.push(rowData);
        }
    });

    try {
        const editingDocId = rubricView.dataset.editingDocId;
        const isEditingMaster = rubricView.dataset.isMasterTemplate === 'true';
        if (!editingDocId) throw new Error("Document ID not found.");

        if (isEditingMaster && currentUserRole !== 'superAdmin') {
            console.log(`Copy-on-write for rubric template ${editingDocId}`);
            const templateRef = doc(db, "rubrics", editingDocId);
            const templateSnap = await getDoc(templateRef);
            if (!templateSnap.exists()) throw new Error("Original template not found.");
            const fullTemplateData = templateSnap.data();
            
            const finalNewData = { ...fullTemplateData, ...newData, schoolId: currentUserSchoolId };

            const newRubricRef = await addDoc(collection(db, "rubrics"), finalNewData);
            rubricView.dataset.editingDocId = newRubricRef.id;
            rubricView.dataset.isMasterTemplate = 'false';
        } else {
            console.log(`Updating existing rubric doc: ${editingDocId}`);
            const rubricRef = doc(db, "rubrics", editingDocId);
            await setDoc(rubricRef, newData, { merge: true });
        }
        
        showMessage("Rubric saved successfully!", false);
        setRubricMode('highlight'); // Return to highlight mode after saving
    } catch (error) {
        console.error("Error saving rubric:", error);
        showMessage("Failed to save rubric.");
    } finally {
        loadingOverlay.classList.add('hidden');
    }
}

// Add the event listeners for the rubric buttons
editRubricBtn.addEventListener('click', () => setRubricMode('edit'));
saveRubricBtn.addEventListener('click', saveRubricChanges);
cancelRubricBtn.addEventListener('click', () => {
    // Re-fetch and re-render to discard changes
    showRubricPage(currentStudentId, currentCoreSkill, currentMicroSkill);
    setRubricMode('highlight'); // Go back to highlight mode
});

// --- SUBSCRIPTION & ONBOARDING ---
if (subscribeBtn) {
    subscribeBtn.addEventListener('click', () => {
        const user = auth.currentUser;
        if (user) {
            subscriptionModal.classList.remove('hidden');
        } else {
            sessionStorage.setItem('isSubscribing', 'true');
            showMessage("Please sign in with Google to subscribe.");
            if (!isAuthPopupOpen) { isAuthPopupOpen = true; signInWithPopup(auth, googleProvider).catch(err => { if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') { console.error('Sign-in popup error:', err); } }).finally(() => { isAuthPopupOpen = false; }); }
        }
    });
}

// Also attach listener to the button in the welcome message
const subscribeBtnInWelcome = parentWelcomeMessage.querySelector('#subscribe-btn-welcome');
if (subscribeBtnInWelcome) {
     subscribeBtnInWelcome.addEventListener('click', () => {
        const user = auth.currentUser;
        if (user) {
            subscriptionModal.classList.remove('hidden');
        } else {
            sessionStorage.setItem('isSubscribing', 'true');
            showMessage("Please sign in with Google to subscribe.");
            if (!isAuthPopupOpen) { isAuthPopupOpen = true; signInWithPopup(auth, googleProvider).catch(err => { if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') { console.error('Sign-in popup error:', err); } }).finally(() => { isAuthPopupOpen = false; }); }
        }
    });
}


function goToCheckout(priceId) {
    loadingOverlay.classList.remove('hidden');
    const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');

    createCheckoutSession({ priceId: priceId })
        .then(result => {
            const pk = (window.__CONFIG && window.__CONFIG.STRIPE_PUBLISHABLE_KEY) || 'pk_test_51NBdbQKlr4wm1W93LWadLvepbsPkXhRsEp9KauHIu3oZC9eDJHZOJrGxQPnoY9m9M9lUo9u2m4dc3h2YSNG9JIEp00IzlBS0pT';
            const stripe = Stripe(pk);
            return stripe.redirectToCheckout({ sessionId: result.data.id });
        })
        .catch(error => {
            console.error("Error redirecting to checkout:", error);
            // Surface more actionable context to help diagnose env mismatches
            const pk = (window.__CONFIG && window.__CONFIG.STRIPE_PUBLISHABLE_KEY) || '';
            const modeHint = pk.startsWith('pk_live_') ? 'live' : (pk.startsWith('pk_test_') ? 'test' : 'unknown');
            console.warn("Stripe publishable key mode:", modeHint, " priceId:", priceId);
            showMessage("Could not initiate subscription. Please try again or contact support.");
            loadingOverlay.classList.add('hidden');
        });
}

if (closeSubscriptionModalBtn) {
    closeSubscriptionModalBtn.addEventListener('click', () => {
        subscriptionModal.classList.add('hidden');
    });
}

if (selectMonthlyPlanBtn) {
    selectMonthlyPlanBtn.addEventListener('click', () => {
        const monthlyPriceId = (window.__CONFIG && window.__CONFIG.STRIPE_PRICE_MONTHLY) || 'price_1SGKkvKlr4wm1W93e1TWXgPH';
        goToCheckout(monthlyPriceId);
    });
}

if (selectYearlyPlanBtn) {
    selectYearlyPlanBtn.addEventListener('click', () => {
        const yearlyPriceId = (window.__CONFIG && window.__CONFIG.STRIPE_PRICE_YEARLY) || 'price_1SGkBFKlr4wm1W939grYlueR';
        goToCheckout(yearlyPriceId);
    });
}

if (resubscribeBtn) {
    resubscribeBtn.addEventListener('click', () => {
        subscriptionModal.classList.remove('hidden');
    });
}

if (schoolNameForm) {
    schoolNameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = schoolNameInput.value;
        if (!newName.trim()) {
            showMessage("Please enter a name for your school.");
            return;
        }

        loadingOverlay.classList.remove('hidden');
        const updateSchoolName = httpsCallable(functions, 'updateSchoolName');

        try {
			await updateSchoolName({ schoolName: newName });
			showMessage("School created successfully! Reloading dashboard...", false);
			schoolNameModal.classList.add('hidden');

			const user = auth.currentUser;
			if (user) {
				await user.getIdToken(true); // Force token refresh
			}
            window.location.reload(); 
        } catch (error) {
            console.error("Error setting school name:", error);
            showMessage("Could not save school name. Please try again.");
            loadingOverlay.classList.add('hidden');
        }
    });
}

// --- SKILLS MANAGEMENT MODAL LOGIC ---
addCoreSkillBtn.addEventListener('click', () => {
    editSkillModalTitle.textContent = 'Add New Core Skill';
    editSkillId.value = ''; // Clear ID for adding new
    coreSkillNameInput.value = '';
    // renderMicroSkillInputs([{ name: '', description: '' }]); // Simplified: We only edit Core Skill name
    microSkillsContainer.innerHTML = ''; // Hide micro-skills when adding/editing core skill name
    editSkillModal.classList.remove('hidden');
});

closeEditSkillModalBtn.addEventListener('click', () => editSkillModal.classList.add('hidden'));
cancelEditSkillBtn.addEventListener('click', () => editSkillModal.classList.add('hidden'));

// addMicroSkillBtn.addEventListener('click', () => { ... }); // Removed as per simplified form
// microSkillsContainer.addEventListener('click', (e) => { ... }); // Removed as per simplified form

editSkillForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const coreSkillName = coreSkillNameInput.value.trim();
    const continuumDocumentId = editSkillId.value;

    if (!coreSkillName) {
        showMessage("Core Skill Name cannot be empty.");
        return;
    }

    loadingOverlay.classList.remove('hidden');
    try {
        if (continuumDocumentId) {
            // Update existing continuum name
            const skillRef = doc(db, "continuums", continuumDocumentId);
            await updateDoc(skillRef, { name: coreSkillName });
            await fetchSchoolSkills();
			showMessage("Core Skill name updated successfully!", false);
        } else {
             // ADDING NEW CORE SKILL (Continuum)
             const defaultContinuumStructure = {
                 name: coreSkillName,
                 schoolId: currentUserSchoolId,
                 headers: ["Micro Skill", "Level 1", "Level 2", "Level 3"],
                 rows: [ { skillLabel: "Default Micro Skill", levels: ["Description 1", "Description 2", "Description 3"] } ]
             };
            await addDoc(collection(db, "continuums"), defaultContinuumStructure);
            showMessage("New Core Skill added successfully!", false);
        }
        editSkillModal.classList.add('hidden');
        renderSkillsList();
    } catch (error) {
        console.error("Error saving core skill:", error);
        showMessage("Failed to save core skill.");
    } finally {
        loadingOverlay.classList.add('hidden');
    }
});

// --- RESET SKILLS TO ORIGINAL TEMPLATE ---
async function performSkillsReset() {
    loadingOverlay.classList.remove('hidden');
    try {
        // Delete school-owned rubrics
        const rubricsRef = collection(db, 'rubrics');
        const rubricsSnap = await getDocs(query(rubricsRef, where('schoolId', '==', currentUserSchoolId)));
        for (const d of rubricsSnap.docs) {
            await deleteDoc(doc(db, 'rubrics', d.id));
        }

        // Delete school-owned continuums (core skills)
        const contRef = collection(db, 'continuums');
        const contSnap = await getDocs(query(contRef, where('schoolId', '==', currentUserSchoolId)));
        for (const d of contSnap.docs) {
            await deleteDoc(doc(db, 'continuums', d.id));
        }

        await fetchSchoolSkills();
        await renderSkillsList();
        showMessage('Skills restored to original template.', false);
    } catch (err) {
        console.error('Failed to reset to original template:', err);
        showMessage('Failed to restore original template.');
    } finally {
        loadingOverlay.classList.add('hidden');
    }
}

if (getOriginalTemplateBtn) {
    getOriginalTemplateBtn.addEventListener('click', () => {
        const isAdmin = ['admin', 'superAdmin', 'schoolAdmin'].includes(currentUserRole);
        if (!isAdmin) { showMessage('You do not have permission to perform this action.'); return; }
        if (!currentUserSchoolId) { showMessage('Cannot identify your school.'); return; }
        if (resetSkillsConfirmModal) resetSkillsConfirmModal.classList.remove('hidden');
    });
}

if (cancelResetSkillsBtn) {
    cancelResetSkillsBtn.addEventListener('click', () => {
        if (resetSkillsConfirmModal) resetSkillsConfirmModal.classList.add('hidden');
    });
}

if (confirmResetSkillsBtn) {
    confirmResetSkillsBtn.addEventListener('click', async () => {
        if (resetSkillsConfirmModal) resetSkillsConfirmModal.classList.add('hidden');
        const isAdmin = ['admin', 'superAdmin', 'schoolAdmin'].includes(currentUserRole);
        if (!isAdmin) { showMessage('You do not have permission to perform this action.'); return; }
        if (!currentUserSchoolId) { showMessage('Cannot identify your school.'); return; }
        await performSkillsReset();
    });
}

skillsListContainer.addEventListener('click', async (e) => {
    const editButton = e.target.closest('.edit-skill-btn');
    const deleteButton = e.target.closest('.delete-skill-btn');
    const skillId = editButton?.dataset.id || deleteButton?.dataset.id;

    if (!skillId) return;

    if (editButton) {
        loadingOverlay.classList.remove('hidden');
        try {
            const skillRef = doc(db, "continuums", skillId);
            const skillSnap = await getDoc(skillRef);
            if (skillSnap.exists()) {
                const skillData = skillSnap.data();
                const isMasterTemplate = skillData.schoolId === null || skillData.schoolId === undefined;
                let targetId = skillId;
                if (isMasterTemplate && currentUserRole !== 'superAdmin') {
                    // If a school-owned copy already exists for this name, use it
                    const existingQ = query(collection(db, "continuums"), where("name", "==", skillData.name), where("schoolId", "==", currentUserSchoolId));
                    const existingSnap = await getDocs(existingQ);
                    if (!existingSnap.empty) {
                        targetId = existingSnap.docs[0].id;
                    } else {
                        // Clone master template to this school, then edit the clone
                        const cloneData = { ...skillData, schoolId: currentUserSchoolId };
                        const newRef = await addDoc(collection(db, "continuums"), cloneData);
                        targetId = newRef.id;
                        showMessage("Copied template to your school. You can now edit.", false);
                    }
                    // Refresh list so the correct item appears
                    await renderSkillsList();
                }
                editSkillModalTitle.textContent = 'Edit Core Skill Name';
                editSkillId.value = targetId;
                coreSkillNameInput.value = skillData.name;
                microSkillsContainer.innerHTML = ''; // Hide micro-skills
                editSkillModal.classList.remove('hidden');
            } else { showMessage("Core Skill not found."); }
        } catch (error) {
            console.error("Error fetching skill for edit:", error);
            showMessage("Could not load skill details.");
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    } else if (deleteButton) {
        confirmDeleteSkillBtn.dataset.id = skillId;
        deleteSkillConfirmModal.classList.remove('hidden');
    }
});

cancelDeleteSkillBtn.addEventListener('click', () => deleteSkillConfirmModal.classList.add('hidden'));

confirmDeleteSkillBtn.addEventListener('click', async (e) => {
    const skillIdToDelete = e.target.dataset.id;
    if (!skillIdToDelete) return;

    loadingOverlay.classList.remove('hidden');
    deleteSkillConfirmModal.classList.add('hidden');
    try {
        // Before deleting, check if it's a template
        const skillRef = doc(db, "continuums", skillIdToDelete);
        const skillSnap = await getDoc(skillRef);
        if(skillSnap.exists()) {
            const skillData = skillSnap.data();
            const isMasterTemplate = skillData.schoolId === null || skillData.schoolId === undefined;
            if(isMasterTemplate && currentUserRole !== 'superAdmin') {
                showMessage("You do not have permission to delete a master template.");
                loadingOverlay.classList.add('hidden');
                return;
            }
        }
        
        await deleteDoc(skillRef);
        await fetchSchoolSkills(); // Re-fetch skills cache
        showMessage("Core skill deleted successfully.", false);
        renderSkillsList(); // Refresh the list
    } catch (error) {
        console.error("Error deleting skill:", error);
        showMessage("Failed to delete skill.");
    } finally {
        loadingOverlay.classList.add('hidden');
    }
});

uploadSchoolLogoBtn.addEventListener('click', async () => {
    const file = schoolLogoInput.files[0];
    if (!file) {
        showMessage("Please select an image file first.");
        return;
    }
    if (!getActiveSchoolId()) {
        showMessage("Could not find your school ID.");
        return;
    }

    loadingOverlay.classList.remove('hidden');
    try {
        // 1. Define storage path
        const storageRef = ref(storage, `schools/${getActiveSchoolId()}/logo/school-logo.${file.name.split('.').pop()}`);
        
        // 2. Upload the file
        const uploadResult = await uploadBytes(storageRef, file);
        
        // 3. Get the Download URL
        const downloadURL = await getDownloadURL(uploadResult.ref);
        
        // 4. Save URL to school's Firestore document
        const schoolRef = doc(db, "schools", getActiveSchoolId());
        await setDoc(schoolRef, { logoUrl: downloadURL }, { merge: true });
        schoolLogoUrlCache = downloadURL; // Ensure future exports use the new logo immediately
        if (navSchoolLogo) navSchoolLogo.src = downloadURL; // Update header logo immediately

        // 5. Show success
        schoolLogoPreview.src = downloadURL;
        schoolLogoPreviewContainer.classList.remove('hidden');
        showMessage("School logo updated successfully!", false);

    } catch (error) {
        console.error("Error uploading school logo:", error);
        showMessage("Failed to upload logo. See console for details.");
    } finally {
        loadingOverlay.classList.add('hidden');
    }
});


