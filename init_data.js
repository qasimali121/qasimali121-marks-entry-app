const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// 1. Create Teachers Data
const teachers = [
    { TeacherID: 'T001', TeacherName: 'John Doe', PIN: '1234', AssignedSubjects: 'Math,Physics' },
    { TeacherID: 'T002', TeacherName: 'Jane Smith', PIN: '5678', AssignedSubjects: 'English' }
];

const wbTeachers = XLSX.utils.book_new();
const wsTeachers = XLSX.utils.json_to_sheet(teachers);
XLSX.utils.book_append_sheet(wbTeachers, wsTeachers, 'Teachers');
XLSX.writeFile(wbTeachers, path.join(dataDir, 'teachers.xlsx'));
console.log('teachers.xlsx created.');

// 2. Create Marks Data
const marks = [
    { RowID: 1, Class: '10A', Subject: 'Math', PaperType: 'MidTerm', RollNo: '101', StudentName: 'Alice', TotalMarks: 100, TeacherID: 'T001', ObtainedMarks: null, Result: '', Submitted: false, SubmittedAt: '' },
    { RowID: 2, Class: '10A', Subject: 'Math', PaperType: 'MidTerm', RollNo: '102', StudentName: 'Bob', TotalMarks: 100, TeacherID: 'T001', ObtainedMarks: null, Result: '', Submitted: false, SubmittedAt: '' },
    { RowID: 3, Class: '10A', Subject: 'Math', PaperType: 'MidTerm', RollNo: '103', StudentName: 'Charlie', TotalMarks: 100, TeacherID: 'T001', ObtainedMarks: null, Result: '', Submitted: false, SubmittedAt: '' },
    { RowID: 4, Class: '10A', Subject: 'Physics', PaperType: 'MidTerm', RollNo: '101', StudentName: 'Alice', TotalMarks: 100, TeacherID: 'T001', ObtainedMarks: null, Result: '', Submitted: false, SubmittedAt: '' },
    { RowID: 5, Class: '10B', Subject: 'English', PaperType: 'MidTerm', RollNo: '201', StudentName: 'Dave', TotalMarks: 100, TeacherID: 'T002', ObtainedMarks: null, Result: '', Submitted: false, SubmittedAt: '' }
];

const wbMarks = XLSX.utils.book_new();
const wsMarks = XLSX.utils.json_to_sheet(marks);
XLSX.utils.book_append_sheet(wbMarks, wsMarks, 'Marks');
XLSX.writeFile(wbMarks, path.join(dataDir, 'marks.xlsx'));
console.log('marks.xlsx created.');
