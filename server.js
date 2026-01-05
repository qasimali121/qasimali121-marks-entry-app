const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const DATA_DIR = path.join(__dirname, 'data');
const TEACHERS_FILE = path.join(DATA_DIR, 'teachers.xlsx');
const MARKS_FILE = path.join(DATA_DIR, 'marks.xlsx');

// Utility to read Excel
function readExcel(filePath, sheetName) {
    if (!fs.existsSync(filePath)) return [];
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet);
}

// Utility to write Excel (preserves structure)
// Utility to write Excel (preserves structure)
function writeExcel(filePath, data, sheetName, retries = 3) {
    try {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Sheet1');
        XLSX.writeFile(workbook, filePath);
    } catch (err) {
        if (err.code === 'EBUSY' && retries > 0) {
            console.warn(`File busy, retrying write to ${filePath}... (${retries} left)`);
            const end = Date.now() + 1000;
            while (Date.now() < end) { } // Busy wait valid for sync simple server
            writeExcel(filePath, data, sheetName, retries - 1);
        } else {
            throw err;
        }
    }
}

// --- APIs ---

// 1. Login
app.post('/api/login', (req, res) => {
    const { teacherId, pin } = req.body;
    try {
        const teachers = readExcel(TEACHERS_FILE, 'Teachers');
        const teacher = teachers.find(t => t.TeacherID === teacherId && String(t.PIN) === String(pin));

        if (teacher) {
            res.json({ success: true, teacher: { TeacherID: teacher.TeacherID, TeacherName: teacher.TeacherName } });
        } else {
            res.status(401).json({ success: false, message: 'Invalid Credentials' });
        }
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// 2. Get Pending Students for Teacher
app.get('/api/students', (req, res) => {
    const teacherId = req.query.teacherId;
    if (!teacherId) return res.status(400).json({ message: 'Teacher ID required' });

    try {
        const marksData = readExcel(MARKS_FILE, 'Marks');

        // Filter: Match TeacherID AND Submitted is FALSE (or falsy)
        const pendingStudents = marksData.filter(row =>
            row.TeacherID === teacherId &&
            (String(row.Submitted).toLowerCase() !== 'true')
        );

        res.json(pendingStudents);
    } catch (error) {
        console.error("Fetch Students Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// 3. Submit Mark (One Time Only)
app.post('/api/submit', (req, res) => {
    console.log('Received submit request:', req.body);
    const { rowId, obtainedMarks } = req.body;

    if (!rowId || obtainedMarks === undefined) {
        console.error('Missing RowID or Marks');
        return res.status(400).json({ message: 'Missing RowID or Marks' });
    }

    try {
        console.log(`Reading marks file from: ${MARKS_FILE}`);
        if (!fs.existsSync(MARKS_FILE)) {
            console.error('Marks file not found!');
            return res.status(500).json({ message: 'Database file missing' });
        }

        const marksData = readExcel(MARKS_FILE, 'Marks');
        // Loose comparison for RowID to handle string/number differences
        const index = marksData.findIndex(row => row.RowID == rowId);

        if (index === -1) {
            console.error(`RowID ${rowId} not found in marks file. Available IDs sample:`, marksData.slice(0, 3).map(r => r.RowID));
            return res.status(404).json({ message: 'Student record not found' });
        }

        console.log(`Found student at index ${index}:`, marksData[index]);

        if (String(marksData[index].Submitted).toLowerCase() === 'true') {
            console.warn(`Student ${rowId} already submitted.`);
            return res.status(400).json({ message: 'Marks already submitted for this student.' });
        }

        // Update Data
        marksData[index].ObtainedMarks = obtainedMarks;

        // Calculate Pass/Fail status
        const total = marksData[index].TotalMarks || 100;
        marksData[index].Result = (obtainedMarks / total) >= 0.35 ? 'Pass' : 'Fail';

        marksData[index].Submitted = true;
        marksData[index].SubmittedAt = new Date().toISOString();

        // Write back to file
        console.log('Writing back to marks file...');
        writeExcel(MARKS_FILE, marksData, 'Marks');
        console.log('Write successful.');

        res.json({ success: true, message: 'Marks saved successfully.' });

    } catch (error) {
        console.error("Submit Error:", error);
        if (error.code === 'EBUSY') {
            return res.status(500).json({ message: 'File is open in another program. Please close it.' });
        }
        res.status(500).json({ message: 'Failed to save marks: ' + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
