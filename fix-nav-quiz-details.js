const fs = require('fs');

const replacement = `<nav class="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            <a href="/student/dashboard" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600">
                <i class="fa-solid fa-house w-5 text-center"></i>
                <span>Dashboard</span>
            </a>
            <a href="/student/courses" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600">
                <i class="fa-solid fa-book-open w-5 text-center"></i>
                <span>My Courses</span>
            </a>
            <a href="/student/quizzes" class="sidebar-item sidebar-active flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700">
                <i class="fa-solid fa-clipboard-question w-5 text-center"></i>
                <span>Quizzes</span>
            </a>
            <a href="/student/ai-tutor" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600">
                <i class="fa-solid fa-robot w-5 text-center"></i>
                <span>AI Tutor</span>
            </a>
            <a href="/student/progress" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600">
                <i class="fa-solid fa-chart-line w-5 text-center"></i>
                <span>Progress</span>
            </a>
            <a href="/student/leaderboard" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600">
                <i class="fa-solid fa-trophy w-5 text-center"></i>
                <span>Leaderboard</span>
            </a>
            <a href="/student/badges" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600">
                <i class="fa-solid fa-medal w-5 text-center"></i>
                <span>Badges</span>
            </a>
            <a href="/student/offline-videos" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600">
                <i class="fa-solid fa-download w-5 text-center"></i>
                <span>Offline Videos</span>
            </a>
        </nav>`;

let content = fs.readFileSync('views/student/quiz-details.ejs', 'utf8');
const searchRegex = /<nav class="flex-1 px-4 py-4 space-y-1 overflow-y-auto">[\s\S]*?<\/nav>/;
content = content.replace(searchRegex, replacement);
fs.writeFileSync('views/student/quiz-details.ejs', content);
console.log('Fixed quiz-details.ejs');
