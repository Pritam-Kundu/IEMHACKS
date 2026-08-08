const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'views');

function traverseAndReplace(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverseAndReplace(fullPath);
        } else if (fullPath.endsWith('.ejs') && !fullPath.includes('partials')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Student pattern
            const studentPattern = /<div class="flex items-center gap-2">\s*<div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xl">E<\/div>\s*<span class="text-xl font-bold text-slate-900">EduSmart<\/span>\s*<\/div>/g;
            
            if (studentPattern.test(content)) {
                content = content.replace(studentPattern, `<a href="/student/dashboard" class="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors">
                <i class="fa-solid fa-graduation-cap text-2xl"></i>
                <span class="font-mono text-xl font-bold tracking-tight text-slate-900">EduSmart</span>
            </a>`);
                modified = true;
            }

            // Teacher pattern
            const teacherPattern = /<div class="flex items-center gap-2">\s*<div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xl">E<\/div>\s*<span class="text-xl font-bold text-slate-900">EduSmart <span class="text-xs text-indigo-600 ml-1 font-semibold uppercase">Pro<\/span><\/span>\s*<\/div>/g;
            if (teacherPattern.test(content)) {
                content = content.replace(teacherPattern, `<a href="/teacher/dashboard" class="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors">
                <i class="fa-solid fa-graduation-cap text-2xl"></i>
                <span class="font-mono text-xl font-bold tracking-tight text-slate-900">EduSmart <span class="font-sans text-xs text-indigo-600 ml-1 font-semibold uppercase tracking-normal">Pro</span></span>
            </a>`);
                modified = true;
            }

            // Parent pattern
            const parentPattern = /<div class="flex items-center gap-2">\s*<div class="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-xl">E<\/div>\s*<span class="text-xl font-bold text-slate-900">EduSmart <span class="text-xs text-emerald-600 ml-1 font-semibold uppercase">Family<\/span><\/span>\s*<\/div>/g;
            if (parentPattern.test(content)) {
                content = content.replace(parentPattern, `<a href="/parent/dashboard" class="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 transition-colors">
                <i class="fa-solid fa-graduation-cap text-2xl"></i>
                <span class="font-mono text-xl font-bold tracking-tight text-slate-900">EduSmart <span class="font-sans text-xs text-emerald-600 ml-1 font-semibold uppercase tracking-normal">Family</span></span>
            </a>`);
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated logo in ${fullPath}`);
            }
        }
    });
}

traverseAndReplace(viewsDir);
console.log('Done!');
