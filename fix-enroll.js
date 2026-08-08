const fs = require('fs');
const file = 'views/student/explore.ejs';
let content = fs.readFileSync(file, 'utf8');

// Replace standard enroll form
content = content.replace(
    /<form action="\/api\/enroll" method="POST">[\s\S]*?<input type="hidden" name="courseId" value="<%= course._id %>">/g, 
    '<form action="/student/courses/<%= course._id %>/enroll" method="POST">'
);

fs.writeFileSync(file, content);
