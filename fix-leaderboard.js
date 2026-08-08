const fs = require('fs');
let content = fs.readFileSync('views/student/leaderboard.ejs', 'utf8');

content = content.replace(
    /<% const isCurrentUser = student\._id\.toString\(\) === user\._id\.toString\(\); %>/g,
    '<% const isCurrentUser = student.user && student.user._id.toString() === user._id.toString(); %>'
);

content = content.replace(
    /<%= student\.user\.profilePicture \|\| '\/images\/default-avatar\.png' %>/g,
    "<%= (student.user && student.user.profilePicture) || '/images/default-avatar.png' %>"
);

content = content.replace(
    /<%= student\.user\.name %>/g,
    "<%= student.user ? student.user.name : 'Unknown User' %>"
);

fs.writeFileSync('views/student/leaderboard.ejs', content);
