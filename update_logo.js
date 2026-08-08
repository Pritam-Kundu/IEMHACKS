const fs = require('fs');
const glob = require('glob');

const replaceStr = `            <a href="/" class="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors">
                <i class="fa-solid fa-graduation-cap text-2xl"></i>
                <span class="font-mono text-2xl font-bold tracking-tight text-slate-900">EduSmart</span>
            </a>`;

const files = glob.sync('d:/EduSmart/views/**/dashboard.ejs');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    // Match the exact HTML for the logo
    const regex = /<div\s+class="flex items-center gap-2">\s*<div\s*class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xl">\s*E<\/div>\s*<span\s+class="text-xl font-bold text-slate-900">EduSmart<\/span>\s*<\/div>/g;
    
    if(regex.test(content)) {
        content = content.replace(regex, replaceStr.trim());
        fs.writeFileSync(file, content);
        console.log('Updated ' + file);
    } else {
        console.log('Logo pattern not found in ' + file);
    }
});
