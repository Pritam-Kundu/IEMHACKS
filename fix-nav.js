const fs = require('fs');
const badgesEjs = 'views/student/badges.ejs';
let content = fs.readFileSync(badgesEjs, 'utf8');

// The messed up part starts at the Progress link. Let's find it.
const startMarker = '<a href="/student/progress" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600">';
const endMarker = '<!-- Using existing logout flow -->';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const replacement = `<a href="/student/progress" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600">
                <i class="fa-solid fa-chart-line w-5 text-center"></i>
                <span>Progress</span>
            </a>
            <a href="/student/leaderboard" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600">
                <i class="fa-solid fa-trophy w-5 text-center"></i>
                <span>Leaderboard</span>
            </a>
            <a href="/student/badges" class="sidebar-item sidebar-active flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700">
                <i class="fa-solid fa-medal w-5 text-center"></i>
                <span>Badges</span>
            </a>
            <a href="/student/offline-videos" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600">
                <i class="fa-solid fa-download w-5 text-center"></i>
                <span>Offline Videos</span>
            </a>
        </nav>

        <div class="p-4 border-t border-slate-200">
            <a href="/student/settings" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600">
                <i class="fa-solid fa-gear w-5 text-center"></i>
                <span>Settings</span>
            </a>
            `;

    content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
    fs.writeFileSync(badgesEjs, content);
    console.log("Fixed badges sidebar successfully");
} else {
    console.log("Could not find markers in badges.ejs");
}
