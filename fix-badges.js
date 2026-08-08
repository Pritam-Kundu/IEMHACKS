const fs = require('fs');
let content = fs.readFileSync('views/student/badges.ejs', 'utf8');

content = content.replace(
    /const earnedBadgeIds = .*/,
    "const earnedBadgeIds = (typeof earnedBadges !== 'undefined' && earnedBadges) ? earnedBadges.map(eb => eb.badge ? eb.badge._id.toString() : '') : [];"
);

content = content.replace(
    /<% if \(allBadges && allBadges.length > 0\) { %>/g,
    "<% if (typeof allBadges !== 'undefined' && allBadges && allBadges.length > 0) { %>"
);

fs.writeFileSync('views/student/badges.ejs', content);
