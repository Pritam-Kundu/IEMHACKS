const fs = require('fs');
const path = require('path');
const dir = path.join('c:/Users/ABHIK  PAUL/Desktop/EduSmart/views/student');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ejs'));

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix logo
    const logoRegex = /<span class=\"font-sans text-xs text-blue-600 ml-1 font-semibold uppercase tracking-normal\">Student<\/span>/g;
    content = content.replace(logoRegex, '<span class=\"text-xs text-indigo-600 ml-1 font-semibold uppercase font-sans tracking-normal\">Student</span>');
    
    // Replace old profile/language controls
    const oldHeaderRegex = /<!-- Language Switcher -->[\s\S]*?(?=<\/div>\s*<\/div>\s*<\/header>)/;
    
    const newHeader = `<!-- Language Switcher -->
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
                    `;
                    
    content = content.replace(oldHeaderRegex, newHeader);
    
    // Add script before </body>
    if (!content.includes('student-header-scripts')) {
        content = content.replace('</body>', '    <%- include(\'../partials/student-header-scripts\') %>\n</body>');
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + file);
}
