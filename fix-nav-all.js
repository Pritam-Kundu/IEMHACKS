const fs = require('fs');
const filesToFix = ['views/student/ai-tutor.ejs', 'views/student/course-details.ejs', 'views/student/quiz-details.ejs'];

const replacement = `            <a href="/student/badges" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600">
                <i class="fa-solid fa-medal w-5 text-center"></i>
                <span>Badges</span>
            </a>
            <a href="/student/offline-videos" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600">
                <i class="fa-solid fa-download w-5 text-center"></i>
                <span>Offline Videos</span>
            </a>`;

filesToFix.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Check if it already has offline-videos
    if (!content.includes('/student/offline-videos')) {
        // Find the badges link to replace
        const searchRegex = /<a href="\/student\/badges"[^>]*>[\s\S]*?<\/span>\s*<\/a>/;
        
        if (searchRegex.test(content)) {
            content = content.replace(searchRegex, replacement);
            fs.writeFileSync(file, content);
            console.log(`Fixed ${file}`);
        } else {
            console.log(`Could not find badges link in ${file}`);
        }
    } else {
        console.log(`${file} already has offline-videos`);
    }
});
