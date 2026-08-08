# EdTech Web Application

A robust, full-stack MVC EdTech platform built with Node.js, Express, EJS, and Tailwind CSS. It supports multiple roles including Student, Teacher, and Parent, and uses MongoDB and Firebase for data and authentication.

## Tech Stack
- **Frontend:** EJS, Tailwind CSS, Vanilla JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose)
- **Authentication:** Firebase Authentication
- **Offline Capabilities:** IndexedDB

## Folder Structure
- `config/` - App configurations (DB, Firebase, etc.)
- `controllers/` - Route logic and request handling
- `models/` - Mongoose database schemas
- `routes/` - Express route definitions
- `services/` - Business logic and database queries
- `middleware/` - Custom express middlewares (auth, roles, errors)
- `views/` - EJS templates (pages, partials, layouts)
- `public/` - Static assets (CSS, JS, images)
- `utils/` - Utility/helper functions

## Getting Started

1. Clone the repository
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill in your credentials
4. Run `npm run dev` to start the server in development mode.
