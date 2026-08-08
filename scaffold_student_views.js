const fs = require('fs');
const path = require('path');

const studentDir = path.join(__dirname, 'views', 'student');
const dashboardFile = path.join(studentDir, 'dashboard.ejs');

const dashboardContent = fs.readFileSync(dashboardFile, 'utf8');

// Find the start of Dashboard Content and end of Dashboard Content
const contentStartTag = '<!-- Dashboard Content -->';
const contentEndTag = '<!-- Page Specific Scripts -->';

const startIndex = dashboardContent.indexOf(contentStartTag);
const endIndex = dashboardContent.indexOf(contentEndTag);

if (startIndex === -1 || endIndex === -1) {
    console.error("Tags not found in dashboard.ejs");
    process.exit(1);
}

const headerPart = dashboardContent.substring(0, startIndex);
const footerPart = dashboardContent.substring(endIndex);

const views = [
    {
        name: 'courses.ejs',
        title: 'My Courses',
        content: `
        <div class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <h2 class="text-2xl font-bold text-slate-800 mb-6">My Courses</h2>
            
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
                <h3 class="text-lg font-semibold text-slate-800 mb-4">Enrolled Courses</h3>
                <% if (enrollments && enrollments.length > 0) { %>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <% enrollments.forEach(enrollment => { %>
                            <div class="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <h4 class="font-bold text-indigo-700"><%= enrollment.course.title %></h4>
                                <p class="text-sm text-slate-500 mb-4"><%= enrollment.course.subject.name %></p>
                                <div class="w-full bg-slate-200 rounded-full h-2 mb-2">
                                    <div class="bg-indigo-600 h-2 rounded-full" style="width: <%= enrollment.progress || 0 %>%"></div>
                                </div>
                                <span class="text-xs text-slate-500"><%= enrollment.progress || 0 %>% completed</span>
                                <a href="/student/courses/<%= enrollment.course._id %>" class="mt-4 block text-center bg-indigo-50 text-indigo-700 py-2 rounded font-medium hover:bg-indigo-100 transition-colors">Continue Learning</a>
                            </div>
                        <% }) %>
                    </div>
                <% } else { %>
                    <p class="text-slate-500">You haven't enrolled in any courses yet.</p>
                <% } %>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 class="text-lg font-semibold text-slate-800 mb-4">Available Courses</h3>
                <% if (availableCourses && availableCourses.length > 0) { %>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <% availableCourses.forEach(course => { %>
                            <div class="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <h4 class="font-bold text-slate-800"><%= course.title %></h4>
                                <p class="text-sm text-slate-500 mb-4"><%= course.subject.name %></p>
                                <p class="text-sm text-slate-600 line-clamp-2 mb-4"><%= course.description %></p>
                                <form action="/api/enroll" method="POST">
                                    <input type="hidden" name="courseId" value="<%= course._id %>">
                                    <button type="submit" class="w-full bg-indigo-600 text-white py-2 rounded font-medium hover:bg-indigo-700 transition-colors">Enroll Now</button>
                                </form>
                            </div>
                        <% }) %>
                    </div>
                <% } else { %>
                    <p class="text-slate-500">No new courses available to enroll right now.</p>
                <% } %>
            </div>
        </div>
        `
    },
    {
        name: 'quizzes.ejs',
        title: 'Quizzes',
        content: `
        <div class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <h2 class="text-2xl font-bold text-slate-800 mb-6">My Quizzes</h2>
            
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 class="text-lg font-semibold text-slate-800 mb-4">Recent Quiz Attempts</h3>
                <% if (quizAttempts && quizAttempts.length > 0) { %>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50 text-slate-600 text-sm border-y border-slate-200">
                                    <th class="py-3 px-4 font-medium">Quiz / Course</th>
                                    <th class="py-3 px-4 font-medium">Date</th>
                                    <th class="py-3 px-4 font-medium">Score</th>
                                    <th class="py-3 px-4 font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <% quizAttempts.forEach(attempt => { %>
                                    <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td class="py-3 px-4">
                                            <p class="font-medium text-slate-800"><%= attempt.quiz ? attempt.quiz.title : 'Deleted Quiz' %></p>
                                            <p class="text-xs text-slate-500"><%= attempt.quiz && attempt.quiz.course ? attempt.quiz.course.title : '' %></p>
                                        </td>
                                        <td class="py-3 px-4 text-sm text-slate-600">
                                            <%= new Date(attempt.createdAt).toLocaleDateString() %>
                                        </td>
                                        <td class="py-3 px-4">
                                            <span class="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold <%= attempt.score >= 80 ? 'bg-emerald-100 text-emerald-700' : attempt.score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700' %>">
                                                <%= attempt.score %>%
                                            </span>
                                        </td>
                                        <td class="py-3 px-4">
                                            <button class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Review</button>
                                        </td>
                                    </tr>
                                <% }) %>
                            </tbody>
                        </table>
                    </div>
                <% } else { %>
                    <div class="text-center py-12">
                        <div class="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-400">
                            <i class="fa-solid fa-clipboard-question text-2xl"></i>
                        </div>
                        <p class="text-slate-500 font-medium">You haven't attempted any quizzes yet.</p>
                        <p class="text-sm text-slate-400 mt-1">Enroll in a course to access its quizzes.</p>
                    </div>
                <% } %>
            </div>
        </div>
        `
    },
    {
        name: 'ai-tutor.ejs',
        title: 'AI Tutor',
        content: `
        <div class="flex-1 flex flex-col overflow-hidden p-4 sm:p-6 lg:p-8 h-full">
            <div class="flex items-center justify-between mb-6">
                <h2 class="text-2xl font-bold text-slate-800">EduSmart AI Tutor</h2>
                <div class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold border border-purple-200">
                    <i class="fa-solid fa-bolt mr-1"></i> Gemini Powered
                </div>
            </div>
            
            <div class="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative min-h-[400px]">
                <!-- Chat History Area -->
                <div class="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50" id="chatContainer">
                    
                    <!-- AI Welcome Message -->
                    <div class="flex items-start gap-4 max-w-3xl">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
                            <i class="fa-solid fa-robot"></i>
                        </div>
                        <div class="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm">
                            <p class="text-slate-700 font-medium mb-1">EduSmart Tutor</p>
                            <p class="text-slate-600 leading-relaxed">Hello <%= user.name %>! 👋 I'm your personal AI tutor. I can help you understand difficult concepts, explain math problems, or prepare for your upcoming quizzes. What would you like to learn today?</p>
                        </div>
                    </div>
                    
                </div>
                
                <!-- Chat Input Area -->
                <div class="p-4 bg-white border-t border-slate-200">
                    <form id="aiTutorForm" class="flex items-end gap-3 max-w-4xl mx-auto">
                        <div class="flex-1 relative">
                            <textarea id="promptInput" rows="1" class="w-full bg-slate-100 border-0 rounded-2xl py-3 pl-4 pr-12 focus:ring-2 focus:ring-indigo-500 resize-none max-h-32" placeholder="Ask a question about your courses..."></textarea>
                            <button type="button" class="absolute right-3 bottom-3 text-slate-400 hover:text-indigo-600 transition-colors">
                                <i class="fa-solid fa-paperclip"></i>
                            </button>
                        </div>
                        <button type="submit" class="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-md transition-colors shrink-0">
                            <i class="fa-solid fa-paper-plane"></i>
                        </button>
                    </form>
                </div>
            </div>
        </div>
        `
    },
    {
        name: 'progress.ejs',
        title: 'Progress',
        content: `
        <div class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <h2 class="text-2xl font-bold text-slate-800 mb-6">My Progress</h2>
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
                <div class="w-24 h-24 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                    <i class="fa-solid fa-chart-line"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-700 mb-2">Detailed Analytics Coming Soon</h3>
                <p class="text-slate-500 max-w-md mx-auto">We are working on bringing you detailed charts and analytics to track your learning journey across all your subjects.</p>
                <a href="/student/dashboard" class="mt-6 inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">Return to Dashboard</a>
            </div>
        </div>
        `
    },
    {
        name: 'leaderboard.ejs',
        title: 'Leaderboard',
        content: `
        <div class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <h2 class="text-2xl font-bold text-slate-800 mb-6">Global Leaderboard</h2>
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
                <div class="w-24 h-24 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                    <i class="fa-solid fa-trophy"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-700 mb-2">Compete with your Peers</h3>
                <p class="text-slate-500 max-w-md mx-auto">The leaderboard feature is currently being finalized. Soon you'll be able to see how your scores compare with other students!</p>
                <a href="/student/dashboard" class="mt-6 inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">Return to Dashboard</a>
            </div>
        </div>
        `
    },
    {
        name: 'badges.ejs',
        title: 'Badges',
        content: `
        <div class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <h2 class="text-2xl font-bold text-slate-800 mb-6">My Achievements</h2>
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
                <div class="flex justify-center gap-4 mb-6">
                    <div class="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-3xl shadow-sm"><i class="fa-solid fa-medal"></i></div>
                    <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl shadow-sm"><i class="fa-solid fa-star"></i></div>
                    <div class="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-3xl shadow-sm"><i class="fa-solid fa-trophy"></i></div>
                </div>
                <h3 class="text-xl font-bold text-slate-700 mb-2">Achievement System Updating</h3>
                <p class="text-slate-500 max-w-md mx-auto">We are adding hundreds of new badges to unlock based on your learning activity. Check back soon!</p>
            </div>
        </div>
        `
    },
    {
        name: 'settings.ejs',
        title: 'Settings',
        content: `
        <div class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <h2 class="text-2xl font-bold text-slate-800 mb-6">Account Settings</h2>
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-2xl">
                <form class="space-y-6">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Profile Picture</label>
                        <div class="flex items-center gap-4">
                            <img src="<%= user.profilePicture || '/images/default-avatar.png' %>" class="w-16 h-16 rounded-full object-cover border-2 border-slate-200">
                            <button type="button" class="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Change Picture</button>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                            <input type="text" value="<%= user.name %>" class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors">
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                        <input type="email" value="<%= user.email %>" readonly class="w-full px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 outline-none cursor-not-allowed">
                        <p class="text-xs text-slate-400 mt-1">Email cannot be changed.</p>
                    </div>
                    
                    <div class="pt-4 border-t border-slate-200 flex justify-end">
                        <button type="button" class="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
        `
    }
];

views.forEach(view => {
    // Replace the active state in the sidebar for the specific view
    // By default, 'dashboard' is active in the headerPart string.
    let updatedHeader = headerPart;
    
    // Remove active class from dashboard
    updatedHeader = updatedHeader.replace('sidebar-item sidebar-active flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700', 'sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600');

    // Add active class to the current view
    const hrefTarget = '/student/' + view.name.replace('.ejs', '');
    // The link might be text-slate-600, so we replace it with sidebar-active and text-slate-700
    const regex = new RegExp('<a href="' + hrefTarget + '" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600"', 'g');
    updatedHeader = updatedHeader.replace(regex, '<a href="' + hrefTarget + '" class="sidebar-item sidebar-active flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700"');

    // Replace the title
    updatedHeader = updatedHeader.replace(/<h1 class="text-xl font-bold text-slate-800 hidden sm:block mr-6">.*<\/h1>/, '<h1 class="text-xl font-bold text-slate-800 hidden sm:block mr-6">' + view.title + '</h1>');

    const finalContent = updatedHeader + '\n        <!-- Dashboard Content -->\n' + view.content + '\n        <!-- Page Specific Scripts -->\n' + footerPart;
    
    const outPath = path.join(studentDir, view.name);
    fs.writeFileSync(outPath, finalContent);
    console.log('Created ' + view.name);
});
