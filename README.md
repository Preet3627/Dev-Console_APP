# Dev-Console

An advanced local WordPress management system that uses AI to generate, edit, and troubleshoot plugins and themes, and syncs changes directly to a live WordPress site via a connector plugin.

## ✨ Features

-   **AI-Powered Generation**: Create complete WordPress plugins and themes from a simple text description using Google's Gemini AI.
-   **Co-Pilot Chat**: An integrated AI assistant to help you manage your site, troubleshoot issues, and perform actions using natural language.
-   **Full Site Management**:
    -   **Asset Manager**: Activate, deactivate, and delete plugins and themes.
    -   **File Manager**: Browse and edit files in your WordPress root directory.
    -   **Database Manager**: View database tables and run safe, AI-assisted queries.
-   **Advanced Code Editor**:
    -   Edit plugin and theme files directly within the app.
    -   Automatic file backups on save.
    -   Restore files to previous versions.
-   **Diagnostics & Optimization**:
    -   **Security Scanner**: Check for common WordPress vulnerabilities.
    -   **Performance Optimizer**: Run Google PageSpeed audits and get AI-powered recommendations.
    -   **Debug Log Viewer**: View your `debug.log` and get AI analysis on errors.
-   **Backup & Restore**: Create backups of your `wp-content` directory and download them or upload them to cloud storage (Nextcloud, Google Drive).
-   **Secure Multi-User System**: Supports multiple users with a robust authentication system and an admin panel for user management.

## 🛠️ Tech Stack

-   **Frontend**: React, TypeScript, Vite, Tailwind CSS
-   **Backend**: Node.js, Express.js
-   **Database**: MySQL
-   **AI**: Google Gemini API (pluggable with other providers)
-   **Authentication**: JWT (JSON Web Tokens), Google OAuth

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your local machine:

-   [Node.js](https://nodejs.org/) (version 18 or newer)
-   A running [MySQL](https://www.mysql.com/) server (e.g., via XAMPP, MAMP, Docker).

## 🚀 Getting Started

Follow these steps to get the Dev-Console running locally.

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/dev-console.git
cd dev-console
```

### 2. Install Dependencies

This will install all the necessary packages for both the frontend and backend.

```bash
npm install
```

### 3. Configure Environment Variables

The backend server requires a `.env` file for configuration.

1.  Create a new file named `.env` in the root of the project.
2.  Copy the template from the "Backend Setup Required" screen (or the template below) into it.
3.  Fill in the required values, especially your database credentials and a strong `JWT_SECRET`.

#### `.env` Template

```env
# Database Configuration (replace with your values)
DB_HOST=127.0.0.1
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_DATABASE=dev_console

# Application Secrets (IMPORTANT: Use strong, random values)
JWT_SECRET=generate_a_strong_random_secret_here
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com

# Optional: Default Admin User (for first-time setup)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=a_strong_and_secure_password

# Optional: SMTP Email Configuration (for user verification emails)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM="Dev-Console" # The "From" name in emails. The email address will be your SMTP_USER.
```

**Note:** The server will automatically create the database (`dev_console`) and seed the initial admin user if they don't exist on the first run.

### 4. Run the Development Server

This command starts both the Vite frontend and the Node.js backend concurrently.

```bash
npm run dev
```

### 5. Open the Application

Once the servers are running, open your browser and navigate to:

**[http://localhost:5173](http://localhost:5173)**

You should see the login screen. You can log in with the admin credentials you set in the `.env` file or create a new account.

## 🌐 Production Deployment (Vercel - Recommended)

This project is pre-configured for easy deployment on [Vercel](https://vercel.com/), a modern platform designed for full-stack applications like this one.

### 1. Push to GitHub

Make sure your project code is in a GitHub repository.

### 2. Import Project on Vercel

1.  Sign up for a Vercel account and connect it to your GitHub.
2.  From your Vercel dashboard, click "Add New... -> Project".
3.  Select your GitHub repository. Vercel will automatically detect that it is a Vite project.

### 3. Add Environment Variables

This is the most important step. Vercel needs access to the same secrets as your local `.env` file.

1.  In your new Vercel project's settings, go to the **Environment Variables** section.
2.  Add all the variables from your `.env` file (e.g., `DB_HOST`, `DB_PASSWORD`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, etc.). **You must use your production database credentials here.**
3.  Save the variables.

### 4. Deploy

Click the **Deploy** button. Vercel will handle the rest. It will:
-   Build your React frontend and deploy it to a global CDN.
-   Deploy your `backend/index.js` Express server as a Serverless Function.
-   Use the `vercel.json` file in this repository to automatically route API requests from the frontend to the backend.

Your application will be live at the URL Vercel provides.

## 🔗 WordPress Connector Plugin

To connect the Dev-Console to a WordPress site, you must install the `dev-console-connector` plugin on that site.

1.  Log into the Dev-Console application.
2.  Click the "Connect" button in the header.
3.  Follow the instructions in the modal to download the plugin and install it on your WordPress site.
4.  Once activated, navigate to **Connector** in your WordPress admin dashboard menu to find the **Connector Key** and **API Key** required to complete the connection.