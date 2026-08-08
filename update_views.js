const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'views', 'parent');
const filesToUpdate = ['children.ejs', 'progress.ejs', 'assignments.ejs', 'achievements.ejs'];

const notificationUI = `
                    <!-- Notification Icon & Dropdown -->
                    <div class="relative" id="notificationDropdownContainer">
                        <button id="notificationBtn" class="relative text-slate-500 hover:text-emerald-600 transition-colors focus:outline-none">
                            <i class="fa-regular fa-bell text-xl"></i>
                            <span id="unreadBadge" class="hidden absolute -top-2 -right-2 text-[9px] font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5 border-2 border-white">0</span>
                        </button>
                        
                        <!-- Dropdown Panel -->
                        <div id="notificationPanel" class="hidden absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden transform origin-top-right transition-all">
                            <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <h3 class="font-bold text-slate-800">Notifications</h3>
                                <button id="markAllReadBtn" class="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hidden">Mark all as read</button>
                            </div>
                            <div id="notificationList" class="max-h-96 overflow-y-auto divide-y divide-slate-100">
                                <!-- Notifications will be injected here -->
                                <div class="p-4 text-center text-sm text-slate-500">Loading notifications...</div>
                            </div>
                        </div>
                    </div>`;

const notificationJS = `
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            // --- Notifications Logic ---
            const notificationBtn = document.getElementById('notificationBtn');
            const notificationPanel = document.getElementById('notificationPanel');
            const notificationList = document.getElementById('notificationList');
            const unreadBadge = document.getElementById('unreadBadge');
            const markAllReadBtn = document.getElementById('markAllReadBtn');
            
            let notificationsOpen = false;

            if (notificationBtn) {
                notificationBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    notificationsOpen = !notificationsOpen;
                    notificationPanel.classList.toggle('hidden', !notificationsOpen);
                    if (notificationsOpen) fetchNotifications();
                });
            }

            document.addEventListener('click', (e) => {
                if (notificationsOpen && !document.getElementById('notificationDropdownContainer').contains(e.target)) {
                    notificationsOpen = false;
                    notificationPanel.classList.add('hidden');
                }
            });

            if (notificationPanel) {
                notificationPanel.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }

            async function fetchNotifications() {
                try {
                    const res = await fetch('/parent/api/notifications?limit=10');
                    const data = await res.json();
                    
                    if (data.success) {
                        updateUnreadBadge(data.unreadCount);
                        renderNotifications(data.notifications);
                    }
                } catch (error) {
                    console.error('Failed to load notifications', error);
                    notificationList.innerHTML = '<div class="p-4 text-center text-sm text-red-500">Failed to load notifications. Please try again.</div>';
                }
            }

            function updateUnreadBadge(count) {
                if (count > 0) {
                    unreadBadge.textContent = count > 99 ? '99+' : count;
                    unreadBadge.classList.remove('hidden');
                    markAllReadBtn.classList.remove('hidden');
                } else {
                    unreadBadge.classList.add('hidden');
                    markAllReadBtn.classList.add('hidden');
                }
            }

            function renderNotifications(notifications) {
                if (!notifications || notifications.length === 0) {
                    notificationList.innerHTML = \`<div class="p-8 text-center flex flex-col items-center">
                        <div class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-3 text-xl">
                            <i class="fa-regular fa-bell-slash"></i>
                        </div>
                        <p class="text-sm text-slate-500">You're all caught up!</p>
                    </div>\`;
                    return;
                }

                notificationList.innerHTML = notifications.map(notif => {
                    const isUnread = !notif.isRead;
                    const bgColor = isUnread ? 'bg-emerald-50/50' : 'bg-white';
                    const iconColor = isUnread ? 'text-emerald-500' : 'text-slate-400';
                    const titleColor = isUnread ? 'text-slate-900 font-bold' : 'text-slate-700 font-semibold';
                    
                    const date = new Date(notif.createdAt);
                    const now = new Date();
                    const diffMs = now - date;
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHrs = Math.floor(diffMins / 60);
                    const diffDays = Math.floor(diffHrs / 24);
                    let timeStr = 'Just now';
                    if (diffDays > 0) timeStr = diffDays === 1 ? 'Yesterday' : \`\${diffDays}d ago\`;
                    else if (diffHrs > 0) timeStr = \`\${diffHrs}h ago\`;
                    else if (diffMins > 0) timeStr = \`\${diffMins}m ago\`;

                    let icon = 'fa-solid fa-bell';
                    if (notif.type === 'assignment_submitted') icon = 'fa-solid fa-file-arrow-up';
                    if (notif.type === 'assignment_reviewed') icon = 'fa-solid fa-check-double';
                    if (notif.type === 'quiz_completed') icon = 'fa-solid fa-spell-check';
                    if (notif.type === 'achievement_earned') icon = 'fa-solid fa-trophy text-yellow-500';

                    return \`
                        <div class="p-4 flex gap-3 hover:bg-slate-50 transition-colors cursor-pointer \${bgColor}" onclick="handleNotificationClick('\${notif._id}', '\${notif.link || ''}')">
                            <div class="shrink-0 w-8 h-8 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center \${iconColor} mt-1">
                                <i class="\${icon} text-xs"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm \${titleColor} truncate">\${notif.title}</p>
                                <p class="text-xs text-slate-500 mt-0.5 line-clamp-2">\${notif.message}</p>
                                <p class="text-[10px] font-medium text-slate-400 mt-1">\${timeStr}</p>
                            </div>
                            \${isUnread ? '<div class="shrink-0 w-2 h-2 rounded-full bg-emerald-500 mt-2"></div>' : ''}
                        </div>
                    \`;
                }).join('');
            }

            fetchNotifications();

            window.handleNotificationClick = async (id, link) => {
                try {
                    await fetch(\`/parent/api/notifications/\${id}/read\`, { method: 'PATCH' });
                    if (link && link !== 'null') {
                        window.location.href = link;
                    } else {
                        fetchNotifications();
                    }
                } catch (error) {
                    console.error('Failed to mark as read', error);
                }
            };

            if (markAllReadBtn) {
                markAllReadBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    try {
                        const res = await fetch('/parent/api/notifications/read-all', { method: 'PATCH' });
                        if (res.ok) fetchNotifications();
                    } catch (error) {
                        console.error('Failed to mark all as read', error);
                    }
                });
            }
        });
    </script>
</body>`;

for (const file of filesToUpdate) {
    const filePath = path.join(viewsDir, file);
    if (!fs.existsSync(filePath)) continue;
    
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove the Notifications sidebar block
    const sidebarRegex = /<a href="\/parent\/notifications"[\s\S]*?<\/a>\s*<\/nav>/g;
    content = content.replace(sidebarRegex, '</nav>');

    // Make sure we didn't miss it if there's no trailing </nav> in the match
    // Let's use a safer regex:
    content = content.replace(/<a href="\/parent\/notifications"[\s\S]*?<\/a>/g, '');

    // Add Notification Dropdown before the Profile link, ONLY if not already there
    if (!content.includes('id="notificationDropdownContainer"')) {
        content = content.replace(
            /<div class="flex items-center gap-5">\s*<a href="\/parent\/profile"/g, 
            '<div class="flex items-center gap-5">\n' + notificationUI + '\n                    <a href="/parent/profile"'
        );
    }

    // Add JS at the bottom, just before </body>, ONLY if not already there
    if (!content.includes('fetchNotifications()')) {
        content = content.replace(/<\/body>/g, notificationJS);
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + file);
}
