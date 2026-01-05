const API_URL = '/api';

// State
let currentState = {
    teacher: null,
    students: [],
    allStudents: [],
    currentIndex: 0
};

// DOM Elements
let views = {};
let forms = {};
let elements = {};

// --- Initialization ---
function init() {
    setupDOM();
    setupEventListeners();
    checkSession();
}

function setupDOM() {
    views = {
        login: document.getElementById('login-view'),
        dashboard: document.getElementById('dashboard-view'),
        entry: document.getElementById('entry-view'),
        complete: document.getElementById('complete-view')
    };

    forms = {
        login: document.getElementById('login-form')
    };

    elements = {
        userInfo: document.getElementById('user-info'),
        teacherName: document.getElementById('teacher-name-display'),
        logoutBtn: document.getElementById('logout-btn'),
        classBreakdown: document.getElementById('class-breakdown'),
        startEntryBtn: document.getElementById('start-entry-btn'),

        // Entry View
        studentName: document.getElementById('student-name'),
        studentClass: document.getElementById('student-class'),
        studentRoll: document.getElementById('student-roll'),
        studentSubject: document.getElementById('student-subject'),
        marksInput: document.getElementById('marks-input'),
        maxMarks: document.getElementById('max-marks'),
        submitBtn: document.getElementById('submit-mark-btn'),
        currentCounter: document.getElementById('current-index'),
        totalCounter: document.getElementById('total-count'),
        viewDashboardBtn: document.getElementById('view-dashboard-btn'),

        // Complete View
        backHomeBtn: document.getElementById('back-home-btn')
    };
}

function setupEventListeners() {
    if (forms.login) forms.login.addEventListener('submit', handleLogin);
    if (elements.logoutBtn) elements.logoutBtn.addEventListener('click', handleLogout);
    if (elements.startEntryBtn) elements.startEntryBtn.addEventListener('click', startEntry);
    if (elements.submitBtn) elements.submitBtn.addEventListener('click', handleSubmitMark);
    if (elements.viewDashboardBtn) elements.viewDashboardBtn.addEventListener('click', () => switchView('dashboard'));
    if (elements.backHomeBtn) elements.backHomeBtn.addEventListener('click', () => switchView('dashboard'));

    // Focus improvement
    if (elements.marksInput) {
        elements.marksInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSubmitMark(e);
        });
    }
}

function checkSession() {
    const savedTeacher = localStorage.getItem('teacher');
    if (savedTeacher) {
        currentState.teacher = JSON.parse(savedTeacher);
        updateHeader();
        fetchStudents();
    } else {
        switchView('login');
    }
}

// --- Actions ---

async function handleLogin(e) {
    e.preventDefault();
    const id = document.getElementById('teacher-id').value;
    const pin = document.getElementById('pin').value;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teacherId: id, pin: pin })
        });
        const data = await res.json();

        if (data.success) {
            currentState.teacher = data.teacher;
            localStorage.setItem('teacher', JSON.stringify(data.teacher));
            updateHeader();
            fetchStudents();
        } else {
            showToast(data.message || 'Login failed', 'error');
        }
    } catch (err) {
        showToast('Connection Error', 'error');
    }
}

function handleLogout() {
    currentState.teacher = null;
    localStorage.removeItem('teacher');
    elements.userInfo.classList.add('hidden');
    switchView('login');
}

// function fetchStudents defined below

// ... existing code ...

async function fetchStudents() {
    try {
        const id = currentState.teacher.TeacherID;
        const res = await fetch(`${API_URL}/students?teacherId=${id}`);
        const data = await res.json();

        currentState.allStudents = data; // Store master list
        currentState.students = []; // Clear working list until class selection
        currentState.currentIndex = 0;

        updateDashboard();
        switchView('dashboard');
    } catch (err) {
        showToast('Failed to load students', 'error');
    }
}

function updateDashboard() {
    elements.classBreakdown.innerHTML = ''; // Clear

    if (currentState.allStudents.length === 0) {
        elements.classBreakdown.innerHTML = `
        <div class="stat">
            <span class="label">All Done</span>
            <span class="value">0</span>
        </div>`;
        return;
    }

    // Group by Class using allStudents
    const counts = {};
    currentState.allStudents.forEach(s => {
        const cls = s.Class || 'Unknown';
        counts[cls] = (counts[cls] || 0) + 1;
    });

    // Render
    Object.keys(counts).sort().forEach(cls => {
        const div = document.createElement('div');
        div.className = 'stat';
        div.innerHTML = `
            <span class="label">Class ${cls}</span>
            <span class="value">${counts[cls]}</span>
        `;
        // Add click handler
        div.onclick = () => startClassEntry(cls);
        elements.classBreakdown.appendChild(div);
    });
}

function startClassEntry(className) {
    // Filter students for the selected class
    currentState.students = currentState.allStudents.filter(s => (s.Class || 'Unknown') === className);

    if (currentState.students.length === 0) {
        showToast('No students in this class!', 'error');
        return;
    }

    currentState.currentIndex = 0;
    loadStudentIntoView();
    switchView('entry');
}

// startEntry function removed as it is no longer used


function loadStudentIntoView() {
    const student = currentState.students[currentState.currentIndex];
    if (!student) {
        // If no more students in current local array (rare if filtered correctly), refresh or finish
        if (currentState.students.length === 0) {
            switchView('complete');
        }
        return;
    }

    elements.studentName.innerText = student.StudentName;
    elements.studentClass.innerText = `Class: ${student.Class}`;
    elements.studentRoll.innerText = `Roll: ${student.RollNo}`;
    elements.studentSubject.innerText = student.Subject;
    elements.maxMarks.innerText = student.TotalMarks || 100;

    elements.currentCounter.innerText = currentState.currentIndex + 1;
    elements.totalCounter.innerText = currentState.students.length; // Dynamic list size

    elements.marksInput.value = '';
    elements.marksInput.focus();
}

async function handleSubmitMark(e) {
    if (e) e.preventDefault();
    console.log('handleSubmitMark called');

    const student = currentState.students[currentState.currentIndex];
    if (!student) {
        console.error('No student found at current index:', currentState.currentIndex);
        showToast('Error: No student selected', 'error');
        return;
    }

    const marksVal = elements.marksInput.value;
    const marks = parseFloat(marksVal);
    console.log(`Submitting marks for ${student.StudentName} (RowID: ${student.RowID}): ${marks}`);

    // Validation
    const max = student.TotalMarks || 100;
    if (marksVal === '' || isNaN(marks) || marks < 0 || marks > max) {
        showToast(`Please enter valid marks (0-${max})`, 'error');
        return;
    }

    // Submit
    try {
        elements.submitBtn.disabled = true;
        elements.submitBtn.innerText = 'Saving...';

        const res = await fetch(`${API_URL}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rowId: student.RowID, obtainedMarks: marks })
        });
        const result = await res.json();
        console.log('Submit response:', result);

        if (result.success) {
            showToast('Marks Saved', 'success');

            // Remove from local list
            console.log('Removing student from local list');
            currentState.students.splice(currentState.currentIndex, 1);

            // Remove from master list
            console.log('Removing student from master list');
            const masterIndex = currentState.allStudents.findIndex(s => s.RowID == student.RowID); // Loose match
            if (masterIndex !== -1) {
                currentState.allStudents.splice(masterIndex, 1);
            } else {
                console.warn('Student not found in master list for removal');
            }

            // Check completion
            if (currentState.students.length === 0) {
                console.log('Broadcasting completion');
                switchView('complete');
            } else {
                // Ensure index is valid
                if (currentState.currentIndex >= currentState.students.length) {
                    currentState.currentIndex = 0;
                }
                console.log('Loading next student at index:', currentState.currentIndex);
                loadStudentIntoView();
            }
        } else {
            showToast(result.message || 'Submission failed', 'error');
        }
    } catch (err) {
        console.error('Network error on submit:', err);
        showToast('Network error: ' + err.message, 'error');
    } finally {
        elements.submitBtn.disabled = false;
        elements.submitBtn.innerText = 'Submit & Next';
        // Refocus for next entry
        setTimeout(() => elements.marksInput.focus(), 100);
    }
}

// --- UI Utils ---

function switchView(viewName) {
    Object.values(views).forEach(el => {
        el.classList.remove('active');
        el.classList.add('hidden');
    });

    views[viewName].classList.remove('hidden');
    views[viewName].classList.add('active');
}

function updateHeader() {
    elements.teacherName.innerText = currentState.teacher.TeacherName;
    elements.userInfo.classList.remove('hidden');
}

function showToast(msg, type = 'success') {
    const area = document.getElementById('notification-area');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = msg;
    area.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Start
document.addEventListener('DOMContentLoaded', init);
