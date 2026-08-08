const fs = require('fs');
let content = fs.readFileSync('views/partials/navbar.ejs', 'utf8');

const replacements = {
    '>Product <i': '><%= t("nav.product") %> <i',
    '>Company <i': '><%= t("nav.company") %> <i',
    '>Pricing<': '><%= t("nav.pricing") %><',
    '>Website Builder<': '><%= t("nav.websiteBuilder") %><',
    '>Create responsive websites with ease<': '><%= t("nav.websiteBuilderDesc") %><',
    '>Cloud Platform<': '><%= t("nav.cloudPlatform") %><',
    '>Deploy and scale apps in the cloud<': '><%= t("nav.cloudPlatformDesc") %><',
    '>Deploy and scale apps<': '><%= t("nav.cloudPlatformDesc") %><',
    '>Team Collaboration<': '><%= t("nav.teamCollaboration") %><',
    '>Tools to help your teams work better<': '><%= t("nav.teamCollaborationDesc") %><',
    '</i> Analytics<': '</i> <%= t("nav.analytics") %><',
    '</i> Integrations<': '</i> <%= t("nav.integrations") %><',
    '</i> E-Commerce<': '</i> <%= t("nav.eCommerce") %><',
    '</i> Security<': '</i> <%= t("nav.security") %><',
    '</i> API<': '</i> <%= t("nav.api") %><',
    '>About Us<': '><%= t("nav.aboutUs") %><',
    '>Learn more about our story and team<': '><%= t("nav.aboutUsDesc") %><',
    '>Learn more about our story<': '><%= t("nav.aboutUsDesc") %><',
    '>Customer Stories<': '><%= t("nav.customerStories") %><',
    '>See how we\\'ve helped clients succeed<': '><%= t("nav.customerStoriesDesc") %><',
    '>See how we\\'ve helped clients<': '><%= t("nav.customerStoriesDesc") %><',
    '>Terms<': '><%= t("nav.terms") %><',
    '>Privacy<': '><%= t("nav.privacy") %><',
    '>Refund<': '><%= t("nav.refund") %><',
    '>Partnerships<': '><%= t("nav.partnerships") %><',
    '>Collaborate with us<': '><%= t("nav.partnershipsDesc") %><',
    '>Blog<': '><%= t("nav.blog") %><',
    '>Insights & news<': '><%= t("nav.blogDesc") %><',
    '>Help Center<': '><%= t("nav.helpCenter") %><',
    '>Find answers<': '><%= t("nav.helpCenterDesc") %><',
    '>Dashboard<': '><%= t("nav.dashboard") %><',
    '>Log out<': '><%= t("nav.logout") %><',
    '>Log in<': '><%= t("nav.login") %><',
    '>Get Started<': '><%= t("nav.getStarted") %><',
    'Product\n                <i': '<%= t("nav.product") %>\n                <i',
    'Company\n                <i': '<%= t("nav.company") %>\n                <i'
};

for (const [key, val] of Object.entries(replacements)) {
    content = content.split(key).join(val);
}

fs.writeFileSync('views/partials/navbar.ejs', content, 'utf8');
