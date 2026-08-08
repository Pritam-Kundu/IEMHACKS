const fs = require('fs');
const glob = require('glob');
const path = require('path');

const replacement = `<div class="flex items-center gap-5">
                    
                    <!-- Language Switcher -->
                    <div class="relative group mr-2">
                        <button class="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors gap-1">
                            <i class="fa-solid fa-globe text-xl"></i>
                            <%= locals.language === 'bn' ? 'বাংলা' : 'English' %>
                        </button>
                        <div class="absolute right-0 mt-0 w-32 bg-white border border-slate-200 rounded-md shadow-lg hidden group-hover:block z-50 overflow-hidden">
                            <button onclick="changeLanguageImmediately('en')" class="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 <%= locals.language === 'en' ? 'font-bold' : '' %>">English</button>
                            <button onclick="changeLanguageImmediately('bn')" class="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 <%= locals.language === 'bn' ? 'font-bold' : '' %>">বাংলা</button>
                        </div>
                    </div>

                    <%- include('../partials/student-header-controls') %>
                </div>`;

const files = glob.sync('views/student/*.ejs');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Find the flex items-center gap-5 block inside header
    const regex = /<div class="flex items-center gap-5">[\s\S]*?<\/div>\s*<\/header>/g;
    
    if (content.match(regex)) {
        console.log('Replacing in', file);
        content = content.replace(regex, replacement + '\n            </div>\n        </header>');
        fs.writeFileSync(file, content);
    }
});
