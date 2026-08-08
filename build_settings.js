const fs = require('fs');
const path = require('path');

const childrenEjsPath = path.join(__dirname, 'views', 'parent', 'children.ejs');
const settingsEjsPath = path.join(__dirname, 'views', 'parent', 'settings.ejs');

let content = fs.readFileSync(childrenEjsPath, 'utf8');

// 1. Change title
content = content.replace(/<title>.*?<\/title>/, '<title>Settings | EduSmart Family</title>');

// 2. Change sidebar active state
content = content.replace(
    /class="sidebar-item sidebar-active flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700"/,
    'class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600"'
);
content = content.replace(
    /<a href="\/parent\/settings" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600">/,
    '<a href="/parent/settings" class="sidebar-item sidebar-active flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700">'
);

// 3. Update Header Title
content = content.replace(
    /<h1 class="text-xl font-bold text-slate-800 hidden sm:block mr-6">My Children<\/h1>/,
    '<h1 class="text-xl font-bold text-slate-800 hidden sm:block mr-6">Settings</h1>'
);

// 4. Replace Content Area
const contentStart = content.indexOf('<!-- Content -->');
const scriptsStart = content.indexOf('<script>', contentStart);

const settingsContent = `
        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50">
            
            <div class="max-w-4xl mx-auto">
                <div class="mb-8">
                    <h2 class="text-2xl font-bold text-slate-800 mb-1">Account Settings</h2>
                    <p class="text-slate-500">Manage your profile, security, and notification preferences.</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    
                    <!-- Left Sidebar (Tabs) -->
                    <div class="md:col-span-1 space-y-2">
                        <button onclick="switchTab('profile')" id="tab-profile" class="w-full text-left px-4 py-3 rounded-xl font-semibold bg-emerald-50 text-emerald-700 transition-colors">
                            <i class="fa-regular fa-user w-6 text-center"></i> Profile
                        </button>
                        <button onclick="switchTab('security')" id="tab-security" class="w-full text-left px-4 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                            <i class="fa-solid fa-lock w-6 text-center"></i> Security
                        </button>
                        <button onclick="switchTab('notifications')" id="tab-notifications" class="w-full text-left px-4 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                            <i class="fa-regular fa-bell w-6 text-center"></i> Notifications
                        </button>
                        <div class="mt-8 p-4 bg-white border border-slate-200 rounded-xl">
                            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Account Info</p>
                            <div class="space-y-3">
                                <div>
                                    <p class="text-xs text-slate-500">Account Type</p>
                                    <p class="text-sm font-semibold text-slate-800 capitalize" id="infoRole">Loading...</p>
                                </div>
                                <div>
                                    <p class="text-xs text-slate-500">Member Since</p>
                                    <p class="text-sm font-semibold text-slate-800" id="infoDate">Loading...</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right Content Area -->
                    <div class="md:col-span-2">
                        
                        <!-- PROFILE TAB -->
                        <div id="section-profile" class="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
                            <h3 class="text-xl font-bold text-slate-800 mb-6">Profile Information</h3>
                            <form id="profileForm" class="space-y-5">
                                <div id="profileMsg" class="hidden p-3 rounded-lg text-sm font-medium"></div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                    <input type="text" id="profileName" required class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                    <input type="email" id="profileEmail" required class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-slate-700 mb-1">Phone Number <span class="text-slate-400 font-normal">(Optional)</span></label>
                                    <input type="tel" id="profilePhone" class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors">
                                </div>

                                <div class="pt-4 flex justify-end">
                                    <button type="submit" id="profileBtn" class="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2">
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>

                        <!-- SECURITY TAB -->
                        <div id="section-security" class="hidden bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
                            <h3 class="text-xl font-bold text-slate-800 mb-6">Change Password</h3>
                            <form id="passwordForm" class="space-y-5">
                                <div id="passwordMsg" class="hidden p-3 rounded-lg text-sm font-medium"></div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                                    <input type="password" id="currentPassword" required class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                                    <input type="password" id="newPassword" required minlength="8" class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors">
                                    <p class="text-xs text-slate-500 mt-1">Must be at least 8 characters long.</p>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                                    <input type="password" id="confirmPassword" required minlength="8" class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors">
                                </div>

                                <div class="pt-4 flex justify-end">
                                    <button type="submit" id="passwordBtn" class="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2">
                                        Update Password
                                    </button>
                                </div>
                            </form>
                        </div>

                        <!-- NOTIFICATIONS TAB -->
                        <div id="section-notifications" class="hidden bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
                            <h3 class="text-xl font-bold text-slate-800 mb-6">Notification Preferences</h3>
                            <form id="notificationsForm" class="space-y-6">
                                <div id="notificationsMsg" class="hidden p-3 rounded-lg text-sm font-medium mb-4"></div>
                                
                                <div class="flex items-center justify-between py-3 border-b border-slate-100">
                                    <div>
                                        <p class="font-semibold text-slate-800">Email Notifications</p>
                                        <p class="text-sm text-slate-500">Receive important updates via email</p>
                                    </div>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="prefEmail" class="sr-only peer">
                                        <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                    </label>
                                </div>

                                <div class="flex items-center justify-between py-3 border-b border-slate-100">
                                    <div>
                                        <p class="font-semibold text-slate-800">Assignment Notifications</p>
                                        <p class="text-sm text-slate-500">Alerts when assignments are due or graded</p>
                                    </div>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="prefAssignments" class="sr-only peer">
                                        <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                    </label>
                                </div>

                                <div class="flex items-center justify-between py-3 border-b border-slate-100">
                                    <div>
                                        <p class="font-semibold text-slate-800">Quiz Notifications</p>
                                        <p class="text-sm text-slate-500">Alerts for upcoming or completed quizzes</p>
                                    </div>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="prefQuizzes" class="sr-only peer">
                                        <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                    </label>
                                </div>

                                <div class="flex items-center justify-between py-3 border-b border-slate-100">
                                    <div>
                                        <p class="font-semibold text-slate-800">Achievement Notifications</p>
                                        <p class="text-sm text-slate-500">Alerts when your child earns a badge/trophy</p>
                                    </div>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="prefAchievements" class="sr-only peer">
                                        <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                    </label>
                                </div>

                                <div class="flex items-center justify-between py-3 border-b border-slate-100">
                                    <div>
                                        <p class="font-semibold text-slate-800">Course Updates</p>
                                        <p class="text-sm text-slate-500">Alerts for new lessons and materials</p>
                                    </div>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="prefCourseUpdates" class="sr-only peer">
                                        <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                    </label>
                                </div>

                                <div class="pt-4 flex justify-end">
                                    <button type="submit" id="notificationsBtn" class="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2">
                                        Save Preferences
                                    </button>
                                </div>
                            </form>
                        </div>

                    </div>
                </div>
            </div>
            
        </div>
    </main>

`;

const customJS = `
    <!-- Settings JS -->
    <script>
        function switchTab(tabId) {
            // Reset tabs
            ['profile', 'security', 'notifications'].forEach(id => {
                document.getElementById('tab-' + id).className = 'w-full text-left px-4 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors';
                document.getElementById('section-' + id).classList.add('hidden');
            });
            // Set active
            document.getElementById('tab-' + tabId).className = 'w-full text-left px-4 py-3 rounded-xl font-semibold bg-emerald-50 text-emerald-700 transition-colors';
            document.getElementById('section-' + tabId).classList.remove('hidden');
        }

        document.addEventListener('DOMContentLoaded', async () => {
            // Load initial settings
            try {
                const res = await fetch('/parent/api/settings');
                const data = await res.json();
                if(data.success) {
                    const user = data.user;
                    // Populate Profile
                    document.getElementById('profileName').value = user.name;
                    document.getElementById('profileEmail').value = user.email;
                    document.getElementById('profilePhone').value = user.phoneNumber || '';
                    
                    // Populate Info
                    document.getElementById('infoRole').textContent = user.role;
                    document.getElementById('infoDate').textContent = new Date(user.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

                    // Populate Notifications
                    const prefs = user.notificationPreferences || {};
                    document.getElementById('prefEmail').checked = prefs.email !== false;
                    document.getElementById('prefAssignments').checked = prefs.assignments !== false;
                    document.getElementById('prefQuizzes').checked = prefs.quizzes !== false;
                    document.getElementById('prefAchievements').checked = prefs.achievements !== false;
                    document.getElementById('prefCourseUpdates').checked = prefs.courseUpdates !== false;
                }
            } catch (error) {
                console.error('Failed to load settings');
            }

            // Message helper
            function showMessage(elementId, msg, type) {
                const el = document.getElementById(elementId);
                el.textContent = msg;
                el.className = \`p-3 rounded-lg text-sm font-medium mb-4 \${type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}\`;
                el.classList.remove('hidden');
                setTimeout(() => el.classList.add('hidden'), 5000);
            }

            // Update Profile
            document.getElementById('profileForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('profileBtn');
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
                btn.disabled = true;

                try {
                    const name = document.getElementById('profileName').value;
                    const email = document.getElementById('profileEmail').value;
                    const phoneNumber = document.getElementById('profilePhone').value;

                    const res = await fetch('/parent/api/settings/profile', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, email, phoneNumber })
                    });
                    const data = await res.json();
                    
                    if (data.success) {
                        showMessage('profileMsg', 'Profile updated successfully.', 'success');
                        // Update UI names if available
                        document.querySelectorAll('.font-semibold.text-slate-800').forEach(el => {
                            if(el.textContent !== 'Profile Information' && !el.closest('form')) {
                                el.textContent = name;
                            }
                        });
                    } else {
                        showMessage('profileMsg', data.message, 'error');
                    }
                } catch (error) {
                    showMessage('profileMsg', 'Unable to update profile. Please try again.', 'error');
                } finally {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
            });

            // Update Password
            document.getElementById('passwordForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('passwordBtn');
                const originalText = btn.innerHTML;
                
                const currentPassword = document.getElementById('currentPassword').value;
                const newPassword = document.getElementById('newPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;

                if(newPassword !== confirmPassword) {
                    showMessage('passwordMsg', 'New passwords do not match.', 'error');
                    return;
                }

                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
                btn.disabled = true;

                try {
                    const res = await fetch('/parent/api/settings/password', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
                    });
                    const data = await res.json();
                    
                    if (data.success) {
                        showMessage('passwordMsg', 'Password changed successfully.', 'success');
                        document.getElementById('passwordForm').reset();
                    } else {
                        showMessage('passwordMsg', data.message, 'error');
                    }
                } catch (error) {
                    showMessage('passwordMsg', 'Unable to save changes. Please try again.', 'error');
                } finally {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
            });

            // Update Notifications
            document.getElementById('notificationsForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('notificationsBtn');
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
                btn.disabled = true;

                try {
                    const preferences = {
                        email: document.getElementById('prefEmail').checked,
                        assignments: document.getElementById('prefAssignments').checked,
                        quizzes: document.getElementById('prefQuizzes').checked,
                        achievements: document.getElementById('prefAchievements').checked,
                        courseUpdates: document.getElementById('prefCourseUpdates').checked
                    };

                    const res = await fetch('/parent/api/settings/notifications', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ preferences })
                    });
                    const data = await res.json();
                    
                    if (data.success) {
                        showMessage('notificationsMsg', 'Preferences updated successfully.', 'success');
                    } else {
                        showMessage('notificationsMsg', data.message, 'error');
                    }
                } catch (error) {
                    showMessage('notificationsMsg', 'Unable to save changes. Please try again.', 'error');
                } finally {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
            });
        });
    </script>
`;

let newContent = content.substring(0, contentStart) + settingsContent + '\n' + customJS + '\n' + content.substring(scriptsStart);

fs.writeFileSync(settingsEjsPath, newContent, 'utf8');
console.log('Created settings.ejs successfully');
