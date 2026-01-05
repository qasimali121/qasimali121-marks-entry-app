const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const app = express();

/* 🔴 CHANGE #1: PORT must come from hosting provider */
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/* 🔴 CHANGE #2: Always use absolute path for public folder */
app.use(express.static(path.join(__dirname, 'public')));

/* 🔴 CHANGE #3: Ensure data directory exists (important for online hosting) */
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const TEACHERS_FILE = path.join(DATA_DIR, 'teachers.xlsx');
const MARKS_FILE = path.join(DATA_DIR, 'marks.xlsx');

/* ------------------ Utilities ------------------ */

// Read Excel
function readExcel(filePath, sheetName) {
    if (!fs.existsSync(filePath)) return [];
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet);
}

// Write Excel (safe retry)
function writeExcel(filePath, data, sheetName, retries = 3) {
    try {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Sheet1');
        XLSX.writeFile(workbook, filePath);
    } catch (err) {
        if (err.code === 'EBUSY' && retries > 0) {
            console.warn(`File busy, retrying... (${retries} left)`);
            const end = Date.now() + 1000;
            while (Date.now() < end) {}
            writeExcel(filePath, data, sheetName, retries - 1);
        } else {
            throw err;
        }
    }
}

/* ------------------ APIs ------------------ */

// 1️⃣ Login
app.post('/api/login', (req, res) => {
    const { teacherId, pin } = req.body;

    try {
        const teachers = readExcel(TEACHERS_FILE, 'Teachers');
        const teacher = teachers.find(
            t => String(t.TeacherID) === String(teacherId) &&
                 String(t.PIN) === String(pin)
        );

        if (!teacher) {
            return res.status(401).json({
                success: false,
                message: 'Invalid Credentials'
            });
        }

        res.json({
            success: true,
            teacher: {
                TeacherID: teacher.TeacherID,
                TeacherName: teacher.TeacherName
            }
        });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// 2️⃣ Get Pending Students (Teacher-wise)
app.get('/api/students', (req, res) => {
    const teacherId = req.query.teacherId;
    if (!teacherId) {
        return res.status(400).json({ message: 'Teacher ID required' });
    }

    try {
        const marksData = readExcel(MARKS_FILE, 'Marks');

        const pendingStudents = marksData.filter(row =>
            String(row.TeacherID) === String(teacherId) &&
            String(row.Submitted).toLowerCase() !== 'true'
        );

        res.json(pendingStudents);
    } catch (err) {
        console.error('Fetch Students Error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// 3️⃣ Submit Marks (One Time)
app.post('/api/submit', (req, res) => {
    const { rowId, obtainedMarks } = req.body;

    if (!rowId || obtainedMarks === undefined) {
        return res.status(400).json({ message: 'Missing RowID or Marks' });
    }

    try {
        if (!fs.existsSync(MARKS_FILE)) {
            return res.status(500).json({ message: 'Marks file missing' });
        }

        const marksData = readExcel(MARKS_FILE, 'Marks');
        const index = marksData.findIndex(row => row.RowID == rowId);

        if (index === -1) {
            return res.status(404).json({ message: 'Student record not found' });
        }

        if (String(marksData[index].Submitted).toLowerCase() === 'true') {
            return res.status(400).json({
                message: 'Marks already submitted for this student'
            });
        }

        marksData[index].ObtainedMarks = obtainedMarks;

        const total = marksData[index].TotalMarks || 100;
        marksData[index].Result =
            (obtainedMarks / total) >= 0.35 ? 'Pass' : 'Fail';

        marksData[index].Submitted = true;
        marksData[index].SubmittedAt = new Date().toISOString();

        writeExcel(MARKS_FILE, marksData, 'Marks');

        res.json({ success: true, message: 'Marks saved successfully' });

    } catch (err) {
        console.error('Submit Error:', err);
        res.status(500).json({
            message: 'Failed to save marks: ' + err.message
        });
    }
});

/* 🔴 CHANGE #4: Correct production listen */
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
