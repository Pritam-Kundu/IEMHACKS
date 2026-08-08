const fs = require('fs');
let content = fs.readFileSync('controllers/studentController.js', 'utf8');

content = content.replace(
    'const progressRecords = await Promise.all(enrollments.map(async (enrollment) => {',
    'const progressRecordsRaw = await Promise.all(enrollments.map(async (enrollment) => {'
);

content = content.replace(
    'const course = enrollment.course;',
    'const course = enrollment.course;\n            if (!course) return null;'
);

content = content.replace(
    "res.render('student/progress', {",
    "const progressRecords = progressRecordsRaw.filter(Boolean);\n\n        res.render('student/progress', {"
);

fs.writeFileSync('controllers/studentController.js', content);
