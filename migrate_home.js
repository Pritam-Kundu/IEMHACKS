const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, 'locales', 'en.json');
const bnPath = path.join(__dirname, 'locales', 'bn.json');
const homePath = path.join(__dirname, 'views', 'home.ejs');

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const bnData = JSON.parse(fs.readFileSync(bnPath, 'utf8'));

if (!enData.home) enData.home = {};
if (!bnData.home) bnData.home = {};

const translations = {
  "heroTitle": {
    "en": "Smart Learning",
    "bn": "স্মার্ট লার্নিং"
  },
  "heroTitleSpan": {
    "en": "for Every Student",
    "bn": "প্রতিটি শিক্ষার্থীর জন্য"
  },
  "heroDesc": {
    "en": "Personalized lessons, adaptive assessments, and AI-powered tutoring — all in one beautiful, accessible platform.",
    "bn": "ব্যক্তিগতকৃত পাঠ, অভিযোজিত মূল্যায়ন এবং এআই-চালিত টিউটরিং — সবকিছুই একটি সুন্দর, অ্যাক্সেসযোগ্য প্ল্যাটফর্মে।"
  },
  "startLearningFree": {
    "en": "Start Learning Free",
    "bn": "বিনামূল্যে শেখা শুরু করুন"
  },
  "watchDemo": {
    "en": "Watch Demo",
    "bn": "ডেমো দেখুন"
  },
  "securePrivate": {
    "en": "Secure & Private",
    "bn": "নিরাপদ ও ব্যক্তিগত"
  },
  "worksOffline": {
    "en": "Works Offline",
    "bn": "অফলাইনে কাজ করে"
  },
  "multiLanguage": {
    "en": "Multi-language",
    "bn": "বহু-ভাষা"
  },
  "progress": {
    "en": "Progress",
    "bn": "অগ্রগতি"
  },
  "aiTutor": {
    "en": "AI Tutor",
    "bn": "এআই টিউটর"
  },
  "aiTutorExample": {
    "en": "\"A <strong>for-loop</strong> iterates over a sequence one element at a time…\"",
    "bn": "\"একটি <strong>for-loop</strong> একটি সিকোয়েন্সের উপর একবারে একটি এলিমেন্টে পুনরাবৃত্তি করে…\""
  },
  "streak": {
    "en": "Streak",
    "bn": "ধারাবাহিকতা"
  },
  "days": {
    "en": "days",
    "bn": "দিন"
  },
  "quizMaster": {
    "en": "Quiz Master",
    "bn": "কুইজ মাস্টার"
  },
  "badgeUnlocked": {
    "en": "Badge Unlocked",
    "bn": "ব্যাজ আনলক করা হয়েছে"
  },
  "featuresHeader": {
    "en": "Features",
    "bn": "বৈশিষ্ট্য"
  },
  "featuresTitle": {
    "en": "A Complete Learning Ecosystem",
    "bn": "একটি সম্পূর্ণ লার্নিং ইকোসিস্টেম"
  },
  "featuresDesc": {
    "en": "Everything you need to succeed, built into one seamless, accessible platform.",
    "bn": "আপনার সফল হওয়ার জন্য যা কিছু প্রয়োজন, তা একটি নির্বিঘ্ন, অ্যাক্সেসযোগ্য প্ল্যাটফর্মে তৈরি।"
  },
  "adaptiveLearning": {
    "en": "Adaptive Learning",
    "bn": "অভিযোজিত শিক্ষা"
  },
  "adaptiveLearningDesc": {
    "en": "Lessons and quizzes adjust dynamically to your individual learning level.",
    "bn": "পাঠ এবং কুইজগুলি আপনার ব্যক্তিগত শেখার স্তরের সাথে গতিশীলভাবে সামঞ্জস্য করে।"
  },
  "aiTutorDesc": {
    "en": "Get instant help, detailed explanations, and 24/7 assistance whenever you need it.",
    "bn": "যখনই আপনার প্রয়োজন হবে তাৎক্ষণিক সাহায্য, বিশদ ব্যাখ্যা এবং ২৪/৭ সহায়তা পান।"
  },
  "gamification": {
    "en": "Gamification",
    "bn": "গ্যামিফিকেশন"
  },
  "gamificationDesc": {
    "en": "Earn XP, unlock badges, and climb the leaderboard while learning.",
    "bn": "শেখার সময় এক্সপি অর্জন করুন, ব্যাজ আনলক করুন এবং লিডারবোর্ডে আরোহণ করুন।"
  },
  "offlineLearning": {
    "en": "Offline Learning",
    "bn": "অফলাইন লার্নিং"
  },
  "offlineLearningDesc": {
    "en": "Continue learning downloaded content even when you're disconnected.",
    "bn": "আপনি সংযোগ বিচ্ছিন্ন থাকলেও ডাউনলোড করা কন্টেন্ট শেখা চালিয়ে যান।"
  },
  "analyticsProgress": {
    "en": "Analytics & Progress",
    "bn": "অ্যানালিটিক্স এবং অগ্রগতি"
  },
  "analyticsProgressDesc": {
    "en": "Track your learning progress and performance with visual insights.",
    "bn": "ভিজ্যুয়াল অন্তর্দৃষ্টি সহ আপনার শেখার অগ্রগতি এবং পারফরম্যান্স ট্র্যাক করুন।"
  },
  "multiLanguageDesc": {
    "en": "Learn comfortably with comprehensive support for multiple languages.",
    "bn": "একাধিক ভাষার জন্য ব্যাপক সমর্থন সহ স্বাচ্ছন্দ্যে শিখুন।"
  },
  "textToSpeech": {
    "en": "Text-to-Speech",
    "bn": "টেক্সট-টু-স্পিচ"
  },
  "textToSpeechDesc": {
    "en": "Listen to lessons and improve accessibility with native speech tools.",
    "bn": "পাঠ শুনুন এবং নেটিভ স্পিচ সরঞ্জামগুলির সাহায্যে অ্যাক্সেসযোগ্যতা উন্নত করুন।"
  },
  "secureScalable": {
    "en": "Secure & Scalable",
    "bn": "নিরাপদ ও স্কেলেবল"
  },
  "secureScalableDesc": {
    "en": "Built with robust authentication and a scalable cloud architecture.",
    "bn": "শক্তিশালী প্রমাণীকরণ এবং একটি স্কেলেবল ক্লাউড আর্কিটেকচার দিয়ে নির্মিত।"
  },
  "adaptsToYou": {
    "en": "Learning that Adapts to You",
    "bn": "আপনার সাথে খাপ খাইয়ে নেওয়া শিক্ষা"
  },
  "adaptsToYouDesc": {
    "en": "Our intelligent algorithm constantly monitors your performance, adjusting the difficulty of questions to keep you perfectly challenged—neither bored nor overwhelmed.",
    "bn": "আমাদের বুদ্ধিমান অ্যালগরিদম ক্রমাগত আপনার পারফরম্যান্স পর্যবেক্ষণ করে, আপনাকে নিখুঁতভাবে চ্যালেঞ্জের মধ্যে রাখতে প্রশ্নের অসুবিধা সামঞ্জস্য করে—না একঘেয়েমি, না অতিমাত্রায় অভিভূত।"
  },
  "step1Learn": {
    "en": "1. Learn",
    "bn": "১. শিখুন"
  },
  "step1Desc": {
    "en": "Consume bite-sized lessons.",
    "bn": "ছোট আকারের পাঠ গ্রহণ করুন।"
  },
  "step2Quiz": {
    "en": "2. Take Quiz",
    "bn": "২. কুইজ দিন"
  },
  "step2Desc": {
    "en": "Test your knowledge immediately.",
    "bn": "আপনার জ্ঞান অবিলম্বে পরীক্ষা করুন।"
  },
  "step3Analyze": {
    "en": "3. Analyze",
    "bn": "৩. বিশ্লেষণ করুন"
  },
  "step3Desc": {
    "en": "System evaluates your performance.",
    "bn": "সিস্টেম আপনার কর্মক্ষমতা মূল্যায়ন করে।"
  },
  "step4Adjust": {
    "en": "4. Adjust",
    "bn": "৪. সামঞ্জস্য করুন"
  },
  "step4Desc": {
    "en": "Difficulty scales to your needs.",
    "bn": "অসুবিধা আপনার প্রয়োজন অনুযায়ী স্কেল করে।"
  },
  "adjustingDifficulty": {
    "en": "Adjusting Difficulty",
    "bn": "কঠিনতা সামঞ্জস্য করা হচ্ছে"
  },
  "generatingContent": {
    "en": "Generating appropriate content...",
    "bn": "উপযুক্ত বিষয়বস্তু তৈরি করা হচ্ছে..."
  },
  "alwaysOnline": {
    "en": "Always Online",
    "bn": "সর্বদা অনলাইন"
  },
  "meetAiTutor": {
    "en": "Meet Your Personal AI Tutor",
    "bn": "আপনার ব্যক্তিগত এআই টিউটরের সাথে দেখা করুন"
  },
  "meetAiTutorDesc": {
    "en": "Stuck on a difficult concept? The EduSmart AI Tutor is here 24/7 to provide context-aware hints, detailed explanations, and step-by-step guidance without just giving away the answer.",
    "bn": "একটি কঠিন ধারণায় আটকে আছেন? EduSmart এআই টিউটর শুধুমাত্র উত্তর না দিয়ে প্রসঙ্গ-সচেতন ইঙ্গিত, বিশদ ব্যাখ্যা এবং ধাপে ধাপে নির্দেশনা প্রদানের জন্য ২৪/৭ এখানে রয়েছে।"
  },
  "askAiTutor": {
    "en": "Ask AI Tutor",
    "bn": "এআই টিউটরকে জিজ্ঞাসা করুন"
  },
  "aiExampleQ": {
    "en": "Can you explain how a for-loop works in Python?",
    "bn": "আপনি কি পাইথনে for-loop কীভাবে কাজ করে তা ব্যাখ্যা করতে পারেন?"
  },
  "aiExampleA": {
    "en": "Of course! Think of a <code class=\"bg-gray-100 px-1 rounded text-xs\">for</code> loop as a way to say: \"For every item in this collection, do something.\" <br><br>For example, if you have a list of numbers, a for-loop will look at each number one by one.",
    "bn": "অবশ্যই! একটি <code class=\"bg-gray-100 px-1 rounded text-xs\">for</code> লুপকে বলার একটি উপায় হিসাবে ভাবুন: \"এই সংগ্রহে প্রতিটি আইটেমের জন্য, কিছু করুন।\" <br><br>উদাহরণস্বরূপ, আপনার কাছে সংখ্যাগুলির একটি তালিকা থাকলে, একটি for-loop একে একে প্রতিটি সংখ্যা দেখবে।"
  },
  "typeMessage": {
    "en": "Type a message...",
    "bn": "একটি বার্তা টাইপ করুন..."
  },
  "gamificationHighlightDesc": {
    "en": "Learning is more fun with rewards. Maintain learning streaks, earn experience points (XP), and unlock badges.",
    "bn": "পুরষ্কারের সাথে শেখা আরও মজাদার। শেখার ধারাবাহিকতা বজায় রাখুন, এক্সপেরিয়েন্স পয়েন্ট (XP) অর্জন করুন এবং ব্যাজ আনলক করুন।"
  },
  "currentStreak": {
    "en": "Current Streak",
    "bn": "বর্তমান ধারাবাহিকতা"
  },
  "totalXp": {
    "en": "Total XP",
    "bn": "মোট এক্সপি"
  },
  "offlineHighlightDesc": {
    "en": "No internet? No problem. Access selected cached lessons and notes securely via your browser's local storage.",
    "bn": "ইন্টারনেট নেই? কোন সমস্যা নেই। আপনার ব্রাউজারের স্থানীয় স্টোরেজের মাধ্যমে নির্বাচিত ক্যাশ করা পাঠ এবং নোটগুলি নিরাপদে অ্যাক্সেস করুন।"
  },
  "availableOffline": {
    "en": "Available Offline",
    "bn": "অফলাইনে উপলব্ধ"
  },
  "richAnalytics": {
    "en": "Rich Analytics",
    "bn": "সমৃদ্ধ অ্যানালিটিক্স"
  },
  "richAnalyticsDesc": {
    "en": "Understand learning patterns. Track quiz scores, time spent, and identify weak areas across subjects.",
    "bn": "শেখার ধরণ বুঝুন। কুইজ স্কোর, ব্যয় করা সময় ট্র্যাক করুন এবং বিষয় জুড়ে দুর্বল দিকগুলি চিহ্নিত করুন।"
  },
  "howItWorks": {
    "en": "How It Works",
    "bn": "কিভাবে এটি কাজ করে"
  },
  "howItWorksDesc": {
    "en": "Your path to smarter learning in 4 simple steps.",
    "bn": "৪টি সহজ ধাপে আপনার আরও স্মার্ট শেখার পথ।"
  },
  "createAccount": {
    "en": "Create Account",
    "bn": "একাউন্ট তৈরি করুন"
  },
  "createAccountDesc": {
    "en": "Sign up securely and choose your platform role.",
    "bn": "নিরাপদে সাইন আপ করুন এবং আপনার প্ল্যাটফর্মের ভূমিকা বেছে নিন।"
  },
  "choosePath": {
    "en": "Choose Path",
    "bn": "পথ বেছে নিন"
  },
  "choosePathDesc": {
    "en": "Enroll in courses tailored to your specific needs.",
    "bn": "আপনার নির্দিষ্ট চাহিদা অনুযায়ী তৈরি কোর্সে ভর্তি হোন।"
  },
  "learnPractice": {
    "en": "Learn & Practice",
    "bn": "শিখুন এবং অনুশীলন করুন"
  },
  "learnPracticeDesc": {
    "en": "Engage with lessons, take quizzes, and consult the AI tutor.",
    "bn": "পাঠগুলিতে নিযুক্ত হন, কুইজ নিন এবং এআই টিউটরের সাথে পরামর্শ করুন।"
  },
  "trackProgress": {
    "en": "Track Progress",
    "bn": "অগ্রগতি ট্র্যাক করুন"
  },
  "trackProgressDesc": {
    "en": "View comprehensive analytics and earn achievements.",
    "bn": "বিস্তৃত অ্যানালিটিক্স দেখুন এবং অর্জনগুলি লাভ করুন।"
  },
  "platformForEveryone": {
    "en": "A Platform for Everyone",
    "bn": "সবার জন্য একটি প্ল্যাটফর্ম"
  },
  "platformDesc": {
    "en": "Custom dashboards designed for every participant in the educational journey.",
    "bn": "শিক্ষাগত যাত্রায় প্রতিটি অংশগ্রহণকারীর জন্য ডিজাইন করা কাস্টম ড্যাশবোর্ড।"
  },
  "students": {
    "en": "Students",
    "bn": "শিক্ষার্থী"
  },
  "studentsL1": {
    "en": "Learn interactively",
    "bn": "ইন্টারেক্টিভভাবে শিখুন"
  },
  "studentsL2": {
    "en": "Practice with adaptive quizzes",
    "bn": "অভিযোজিত কুইজের সাথে অনুশীলন করুন"
  },
  "studentsL3": {
    "en": "Track personal progress",
    "bn": "ব্যক্তিগত অগ্রগতি ট্র্যাক করুন"
  },
  "teachers": {
    "en": "Teachers",
    "bn": "শিক্ষক"
  },
  "teachersL1": {
    "en": "Create rich courses",
    "bn": "সমৃদ্ধ কোর্স তৈরি করুন"
  },
  "teachersL2": {
    "en": "Manage structured lessons",
    "bn": "কাঠামোগত পাঠ পরিচালনা করুন"
  },
  "teachersL3": {
    "en": "Analyze class performance",
    "bn": "ক্লাস পারফরম্যান্স বিশ্লেষণ করুন"
  },
  "parents": {
    "en": "Parents",
    "bn": "অভিভাবক"
  },
  "parentsL1": {
    "en": "Monitor child's progress",
    "bn": "সন্তানের অগ্রগতি নিরীক্ষণ করুন"
  },
  "parentsL2": {
    "en": "View subject performance",
    "bn": "বিষয় পারফরম্যান্স দেখুন"
  },
  "parentsL3": {
    "en": "Receive automated updates",
    "bn": "স্বয়ংক্রিয় আপডেট পান"
  },
  "ctaTitle": {
    "en": "Ready to transform your education?",
    "bn": "আপনার শিক্ষাকে রূপান্তর করতে প্রস্তুত?"
  },
  "ctaDesc": {
    "en": "Start Your Smarter Learning Journey today.",
    "bn": "আজই আপনার স্মার্ট শেখার যাত্রা শুরু করুন।"
  },
  "getStartedCTA": {
    "en": "Get Started",
    "bn": "শুরু করুন"
  }
};

for (const [key, value] of Object.entries(translations)) {
  enData.home[key] = value.en;
  bnData.home[key] = value.bn;
}

fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), 'utf8');
fs.writeFileSync(bnPath, JSON.stringify(bnData, null, 2), 'utf8');

// Now replace in home.ejs
let homeContent = fs.readFileSync(homePath, 'utf8');

const replacements = [
  ["Smart Learning", "<%= t('home.heroTitle') %>"],
  ["for Every Student", "<%= t('home.heroTitleSpan') %>"],
  ["Personalized lessons, adaptive assessments, and AI-powered tutoring — all in one beautiful, accessible platform.", "<%= t('home.heroDesc') %>"],
  ["Start Learning Free", "<%= t('home.startLearningFree') %>"],
  ["Watch Demo", "<%= t('home.watchDemo') %>"],
  ["Secure & Private", "<%= t('home.securePrivate') %>"],
  ["Works Offline", "<%= t('home.worksOffline') %>"],
  ["Multi-language", "<%= t('home.multiLanguage') %>"],
  [">Progress<", "><%= t('home.progress') %><"], // Using angle brackets to avoid matching classes
  ["uppercase tracking-wider\">AI Tutor</span>", "uppercase tracking-wider\"><%= t('home.aiTutor') %></span>"],
  ["\"A <strong>for-loop</strong> iterates over a sequence one element at a time…\"", "<%- t('home.aiTutorExample') %>"], // Use <%- %> for HTML
  [">Streak<", "><%= t('home.streak') %><"],
  [">days<", "><%= t('home.days') %><"],
  [">Quiz Master<", "><%= t('home.quizMaster') %><"],
  [">Badge Unlocked<", "><%= t('home.badgeUnlocked') %><"],
  [">Features<", "><%= t('home.featuresHeader') %><"],
  ["A Complete Learning Ecosystem", "<%= t('home.featuresTitle') %>"],
  ["Everything you need to succeed, built into one seamless, accessible platform.", "<%= t('home.featuresDesc') %>"],
  [">Adaptive Learning<", "><%= t('home.adaptiveLearning') %><"],
  ["Lessons and quizzes adjust dynamically to your individual learning level.", "<%= t('home.adaptiveLearningDesc') %>"],
  ["mb-1.5\">AI Tutor</h3>", "mb-1.5\"><%= t('home.aiTutor') %></h3>"],
  ["Get instant help, detailed explanations, and 24/7 assistance whenever you need it.", "<%= t('home.aiTutorDesc') %>"],
  [">Gamification<", "><%= t('home.gamification') %><"],
  ["Earn XP, unlock badges, and climb the leaderboard while learning.", "<%= t('home.gamificationDesc') %>"],
  [">Offline Learning<", "><%= t('home.offlineLearning') %><"],
  ["Continue learning downloaded content even when you're disconnected.", "<%= t('home.offlineLearningDesc') %>"],
  [">Analytics & Progress<", "><%= t('home.analyticsProgress') %><"],
  ["Track your learning progress and performance with visual insights.", "<%= t('home.analyticsProgressDesc') %>"],
  ["mb-1.5\">Multi-language</h3>", "mb-1.5\"><%= t('home.multiLanguage') %></h3>"],
  ["Learn comfortably with comprehensive support for multiple languages.", "<%= t('home.multiLanguageDesc') %>"],
  [">Text-to-Speech<", "><%= t('home.textToSpeech') %><"],
  ["Listen to lessons and improve accessibility with native speech tools.", "<%= t('home.textToSpeechDesc') %>"],
  [">Secure & Scalable<", "><%= t('home.secureScalable') %><"],
  ["Built with robust authentication and a scalable cloud architecture.", "<%= t('home.secureScalableDesc') %>"],
  ["Learning that Adapts to You", "<%= t('home.adaptsToYou') %>"],
  ["Our intelligent algorithm constantly monitors your performance, adjusting the difficulty of questions to keep you perfectly challenged—neither bored nor overwhelmed.", "<%= t('home.adaptsToYouDesc') %>"],
  ["1. Learn", "<%= t('home.step1Learn') %>"],
  ["Consume bite-sized lessons.", "<%= t('home.step1Desc') %>"],
  ["2. Take Quiz", "<%= t('home.step2Quiz') %>"],
  ["Test your knowledge immediately.", "<%= t('home.step2Desc') %>"],
  ["3. Analyze", "<%= t('home.step3Analyze') %>"],
  ["System evaluates your performance.", "<%= t('home.step3Desc') %>"],
  ["4. Adjust", "<%= t('home.step4Adjust') %>"],
  ["Difficulty scales to your needs.", "<%= t('home.step4Desc') %>"],
  [">Adjusting Difficulty<", "><%= t('home.adjustingDifficulty') %><"],
  ["Generating appropriate content...", "<%= t('home.generatingContent') %>"],
  [">Always Online<", "><%= t('home.alwaysOnline') %><"],
  ["Meet Your Personal AI Tutor", "<%= t('home.meetAiTutor') %>"],
  ["Stuck on a difficult concept? The EduSmart AI Tutor is here 24/7 to provide context-aware hints, detailed explanations, and step-by-step guidance without just giving away the answer.", "<%= t('home.meetAiTutorDesc') %>"],
  ["Ask AI Tutor", "<%= t('home.askAiTutor') %>"],
  ["Can you explain how a for-loop works in Python?", "<%= t('home.aiExampleQ') %>"],
  ["Of course! Think of a <code class=\"bg-gray-100 px-1 rounded text-xs\">for</code> loop as a way to say: \"For every item in this collection, do something.\" <br><br>For example, if you have a list of numbers, a for-loop will look at each number one by one.", "<%- t('home.aiExampleA') %>"],
  ["placeholder=\"Type a message...\"", "placeholder=\"<%= t('home.typeMessage') %>\""],
  ["Learning is more fun with rewards. Maintain learning streaks, earn experience points (XP), and unlock badges.", "<%= t('home.gamificationHighlightDesc') %>"],
  [">Current Streak<", "><%= t('home.currentStreak') %><"],
  [">Total XP<", "><%= t('home.totalXp') %><"],
  ["No internet? No problem. Access selected cached lessons and notes securely via your browser's local storage.", "<%= t('home.offlineHighlightDesc') %>"],
  ["Available Offline", "<%= t('home.availableOffline') %>"],
  [">Rich Analytics<", "><%= t('home.richAnalytics') %><"],
  ["Understand learning patterns. Track quiz scores, time spent, and identify weak areas across subjects.", "<%= t('home.richAnalyticsDesc') %>"],
  [">How It Works<", "><%= t('home.howItWorks') %><"],
  ["Your path to smarter learning in 4 simple steps.", "<%= t('home.howItWorksDesc') %>"],
  [">Create Account<", "><%= t('home.createAccount') %><"],
  ["Sign up securely and choose your platform role.", "<%= t('home.createAccountDesc') %>"],
  [">Choose Path<", "><%= t('home.choosePath') %><"],
  ["Enroll in courses tailored to your specific needs.", "<%= t('home.choosePathDesc') %>"],
  ["Learn & Practice", "<%= t('home.learnPractice') %>"],
  ["Engage with lessons, take quizzes, and consult the AI tutor.", "<%= t('home.learnPracticeDesc') %>"],
  ["mb-2\">Track Progress</h3>", "mb-2\"><%= t('home.trackProgress') %></h3>"],
  ["View comprehensive analytics and earn achievements.", "<%= t('home.trackProgressDesc') %>"],
  ["A Platform for Everyone", "<%= t('home.platformForEveryone') %>"],
  ["Custom dashboards designed for every participant in the educational journey.", "<%= t('home.platformDesc') %>"],
  ["mb-4\">Students</h3>", "mb-4\"><%= t('home.students') %></h3>"],
  ["Learn interactively", "<%= t('home.studentsL1') %>"],
  ["Practice with adaptive quizzes", "<%= t('home.studentsL2') %>"],
  ["Track personal progress", "<%= t('home.studentsL3') %>"],
  ["mb-4\">Teachers</h3>", "mb-4\"><%= t('home.teachers') %></h3>"],
  ["Create rich courses", "<%= t('home.teachersL1') %>"],
  ["Manage structured lessons", "<%= t('home.teachersL2') %>"],
  ["Analyze class performance", "<%= t('home.teachersL3') %>"],
  ["mb-4\">Parents</h3>", "mb-4\"><%= t('home.parents') %></h3>"],
  ["Monitor child's progress", "<%= t('home.parentsL1') %>"],
  ["View subject performance", "<%= t('home.parentsL2') %>"],
  ["Receive automated updates", "<%= t('home.parentsL3') %>"],
  ["Ready to transform your education?", "<%= t('home.ctaTitle') %>"],
  ["Start Your Smarter Learning Journey today.", "<%= t('home.ctaDesc') %>"],
  ["Get Started", "<%= t('home.getStartedCTA') %>"],
];

for (const [search, replace] of replacements) {
  homeContent = homeContent.replace(search, replace);
}

fs.writeFileSync(homePath, homeContent, 'utf8');

console.log("Migration complete.");
