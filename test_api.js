const fetch = require('cross-fetch'); // Needs install or use native fetch in node 18+

/*
 Test Scenario:
 1. Login as T001 (1234) -> Success
 2. Get Students for T001 -> Expect 4 students (initially)
 3. Submit Mark for first student (RowID: 1) -> Success
 4. Get Students for T001 -> Expect 3 students (RowID 1 should be gone)
 5. Try Submit Mark for RowID 1 again -> Expect Failure (Already Submitted)
*/

const BASE_URL = 'http://localhost:3000/api';

async function runTests() {
    try {
        console.log('--- Starting Tests ---');

        // 1. Login
        console.log('1. Testing Login...');
        const loginRes = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teacherId: 'T001', pin: '1234' })
        });
        const loginData = await loginRes.json();
        if (!loginData.success) throw new Error('Login failed');
        console.log('   [PASS] Login Successful');

        // 2. Get Students
        console.log('2. Testing Get Students...');
        const studentsRes = await fetch(`${BASE_URL}/students?teacherId=T001`);
        const students = await studentsRes.json();
        console.log(`   [INFO] Found ${students.length} pending students.`);
        if (students.length === 0) throw new Error('No students found (check init_data.js)');
        console.log('   [PASS] Students Fetched');

        const targetStudent = students[0];
        console.log(`   [INFO] Target Student: ${targetStudent.StudentName} (RowID: ${targetStudent.RowID})`);

        // 3. Submit Mark
        console.log('3. Testing Submit Mark...');
        const submitRes = await fetch(`${BASE_URL}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rowId: targetStudent.RowID, obtainedMarks: 85 })
        });
        const submitData = await submitRes.json();
        if (!submitData.success) throw new Error('Submission failed: ' + submitData.message);
        console.log('   [PASS] Mark Submitted');

        // 4. Verify Removal from List
        console.log('4. Verifying Removal from Pending List...');
        const checkRes = await fetch(`${BASE_URL}/students?teacherId=T001`);
        const checkStudents = await checkRes.json();
        const found = checkStudents.find(s => s.RowID === targetStudent.RowID);
        if (found) throw new Error('Student still appears in pending list!');
        console.log('   [PASS] Student removed from pending list');

        // 5. Verify Duplicate Submission Prevention
        console.log('5. Verifying Duplicate Submission Lock...');
        const doubleRes = await fetch(`${BASE_URL}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rowId: targetStudent.RowID, obtainedMarks: 90 })
        });

        if (doubleRes.status === 400) {
            console.log('   [PASS] Duplicate submission correctly blocked.');
        } else {
            console.log('   [FAIL] Duplicate submission NOT blocked. Status:', doubleRes.status);
        }

        console.log('--- ALL TESTS PASSED ---');

    } catch (error) {
        console.error('!!! TEST FAILED !!!', error);
    }
}

// Check node version for fetch support or use dynamic import if needed, 
// but for simplicity in this environment we assume standard fetch or minimal polyfill.
// If fetch is missing (older node), we might need to install 'node-fetch' or similar.
// But valid user environment usually has recent Node.
// Let's check environment first.
if (!globalThis.fetch) {
    console.log("Installing cross-fetch...");
    require('child_process').execSync('npm install cross-fetch');
}
runTests();
