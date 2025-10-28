





import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bodyParser from 'body-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { pluginSourceCode } from '../plugin-source.js';

/*
 * Environment variables required for this server to run:
 * - DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE
 * - JWT_SECRET: A long, random, secret string for signing JWTs.
 * - GOOGLE_CLIENT_ID: Your Google OAuth Client ID.
 * - ADMIN_EMAIL (optional): Email for the default admin user on first run. Defaults to 'admin@example.com'.
 * - ADMIN_PASSWORD (optional): Password for the default admin user on first run. Defaults to a strong random password logged to console.
 * - SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM (optional): For sending verification emails.
 */
const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_DATABASE', 'JWT_SECRET'];
for (const envVar of requiredEnv) {
    if (!process.env[envVar]) {
        console.warn(`🚨 WARNING: Environment variable ${envVar} is not set!`);
    }
}
// FIX: Check for GOOGLE_CLIENT_ID separately as it's critical for Google sign-in.
if (!process.env.GOOGLE_CLIENT_ID) {
    console.warn(`🚨 WARNING: Environment variable GOOGLE_CLIENT_ID is not set!`);
}

const optionalSmtpEnv = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
for (const envVar of optionalSmtpEnv) {
    if (!process.env[envVar]) {
        console.warn(`🟡 WARNING: Optional SMTP environment variable ${envVar} is not set. Email features will be disabled.`);
    }
}

const isDbConfigured = process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_DATABASE;
const isSmtpConfigured = process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM;

const app = express();
const PORT = 3001;
const apiV1Router = express.Router();

// --- Configuration from Environment Variables ---
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    // Add connection timeout for serverless environments
    connectTimeout: 10000 
};
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-for-demo-mode';
// FIX: Use the user-provided Client ID directly to fix "invalid token" / "audience mismatch" errors.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '59869142203-8qna4rfo93rrv9uiok3bes28pfu5k1l1.apps.googleusercontent.com';
const googleAuthClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// --- Nodemailer Transporter ---
let transporter = null;
if (isSmtpConfigured) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
    console.log('✅ SMTP is configured. Email services are enabled.');
} else {
    console.warn('🟡 SMTP is not configured. Verification codes will be logged to the console.');
}

// --- Middleware ---
app.use(cors());
app.use(bodyParser.json());

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid or expired token' });
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (!req.user.is_admin) {
        return res.status(403).json({ message: 'Forbidden: Admins only' });
    }
    next();
};

// --- Helper Functions ---
const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendVerificationEmail = async (email, code) => {
    if (transporter) {
        try {
            const fromName = process.env.SMTP_FROM || 'Dev-Console';
            const fromEmail = process.env.SMTP_USER; // Use SMTP_USER as the sender email address

            await transporter.sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to: email,
                subject: 'Your Dev-Console Verification Code',
                text: `Your verification code is: ${code}`,
                html: `<p>Your verification code is: <strong>${code}</strong></p>`,
            });
            console.log(`Verification email sent to ${email}`);
        } catch (error) {
            console.error(`Failed to send verification email to ${email}:`, error);
            // Fallback to console for dev environments if email fails
            console.log(`FALLBACK: Verification code for ${email} is ${code}`);
        }
    } else {
        console.log(`(SMTP not configured) Verification code for ${email}: ${code}`);
    }
};

const createTables = async (connection) => {
    // FIX: Added display_name and profile_picture_url to the users table schema.
    await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255),
            display_name VARCHAR(255),
            profile_picture_url TEXT,
            is_verified BOOLEAN DEFAULT false,
            is_admin BOOLEAN DEFAULT false,
            verification_code VARCHAR(10),
            google_id VARCHAR(255) UNIQUE,
            registered_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // FIX: Check for and add missing columns for backward compatibility. This makes the update non-destructive.
    const [columns] = await connection.query("SHOW COLUMNS FROM users");
    const columnNames = columns.map(c => c.Field);

    if (!columnNames.includes('display_name')) {
        await connection.query('ALTER TABLE users ADD COLUMN display_name VARCHAR(255) AFTER password_hash');
        console.log('✅ Migrated database: Added `display_name` column to `users` table.');
    }
    if (!columnNames.includes('profile_picture_url')) {
        await connection.query('ALTER TABLE users ADD COLUMN profile_picture_url TEXT AFTER display_name');
        console.log('✅ Migrated database: Added `profile_picture_url` column to `users` table.');
    }
    
    await connection.query(`
        CREATE TABLE IF NOT EXISTS app_settings (
            user_id INT PRIMARY KEY,
            settings_json TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS user_sites (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            site_data_encrypted TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);

    // FIX: Add a table to store the application's own SEO settings for public-facing deployments.
    await connection.query(`
        CREATE TABLE IF NOT EXISTS app_seo_settings (
            id INT PRIMARY KEY DEFAULT 1,
            meta_title VARCHAR(255) DEFAULT '',
            meta_description TEXT,
            meta_keywords TEXT
        );
    `);

    // Drop the old single-site table if it exists
    await connection.query('DROP TABLE IF EXISTS site_data;');
};

// ADD: Helper function to recursively create directories via WebDAV for Nextcloud.
const ensureDavPathExists = async (baseDavUrl, path, authHeader) => {
    const parts = path.split('/').filter(p => p && p !== '.');
    let currentPath = '';
    for (const part of parts) {
        currentPath += (currentPath ? '/' : '') + part;
        const checkResponse = await fetch(`${baseDavUrl}/${currentPath}`, {
            method: 'PROPFIND',
            headers: { 'Authorization': authHeader, 'Depth': '0' },
        });

        if (checkResponse.status === 404) {
            const mkcolResponse = await fetch(`${baseDavUrl}/${currentPath}`, {
                method: 'MKCOL',
                headers: { 'Authorization': authHeader },
            });
            // A 405 Method Not Allowed can happen if the directory was created by another process
            // between our PROPFIND and MKCOL calls. We can safely ignore it and continue.
            if (mkcolResponse.status !== 201 && mkcolResponse.status !== 405) { 
                throw new Error(`Failed to create directory '${currentPath}'. Status: ${mkcolResponse.status}`);
            }
        } else if (!checkResponse.ok && checkResponse.status !== 207) { // 207 is success for PROPFIND
             throw new Error(`Failed to check directory '${currentPath}'. Status: ${checkResponse.status}`);
        }
    }
};


const seedAdminUser = async () => {
    // Only proceed if ADMIN_EMAIL is explicitly set in the environment.
    if (!process.env.ADMIN_EMAIL) {
        let connection;
        try {
            connection = await mysql.createConnection(dbConfig);
            const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
            if (users[0].count === 0) {
                 console.log('🟡 ADMIN_EMAIL not set in .env. No default admin will be created.');
                 console.log('🟡 The first user to register will become a regular user.');
            }
        } catch (error) {
            // This might fail if DB isn't ready, which is fine. We'll catch it on the main status check.
        } finally {
            if (connection) await connection.end();
        }
        return;
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');
    
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [existingUsers] = await connection.query('SELECT id FROM users WHERE email = ?', [adminEmail]);
        const password_hash = await bcrypt.hash(adminPassword, 10);

        if (existingUsers.length > 0) {
            // User exists, ensure they are a verified admin with the correct password.
            const adminId = existingUsers[0].id;
            await connection.query(
                'UPDATE users SET password_hash = ?, is_verified = true, is_admin = true WHERE id = ?',
                [password_hash, adminId]
            );
            console.log(`✅ Admin user '${adminEmail}' exists. Synced password and permissions from .env.`);
        } else {
            // User does not exist, create them as a verified admin.
            console.log(`Seeding new admin user '${adminEmail}' from .env configuration...`);
            if (!process.env.ADMIN_PASSWORD) {
                console.log('**************************************************************');
                console.log(`*** Admin Email: ${adminEmail}`);
                console.log(`*** Generated Pass:  ${adminPassword} (set ADMIN_PASSWORD to control this)`);
                console.log('**************************************************************');
            }
            const displayName = adminEmail.split('@')[0];
            const [insertResult] = await connection.query(
                'INSERT INTO users (email, password_hash, display_name, is_verified, is_admin) VALUES (?, ?, ?, ?, ?)',
                [adminEmail, password_hash, displayName, true, true]
            );
            const adminUserId = insertResult.insertId;

            // Also create default settings for this new admin
            const defaultSettings = {
              "googleClientId": GOOGLE_CLIENT_ID,
              "aiProvider": "gemini", 
              "creditSaverEnabled": true,
            };
            await connection.query(
                'INSERT INTO app_settings (user_id, settings_json) VALUES (?, ?)',
                [adminUserId, JSON.stringify(defaultSettings)]
            );
            console.log(`✅ Admin user '${adminEmail}' created successfully.`);
        }
    } catch (error) {
        console.error('🚨 Error during database admin seeding:', error.message);
    } finally {
        if (connection) await connection.end();
    }
};

// --- API Routes ---

// --- STATUS CHECK ENDPOINT ---
apiV1Router.get('/status', async (req, res) => {
    if (!isDbConfigured) {
        // Return 503 Service Unavailable, which signals the frontend that setup is required.
        return res.status(503).json({
            backend: 'ok',
            database: 'unconfigured',
            message: 'Database is not configured. Please create a .env file in the project root and restart the server.'
        });
    }
    
    const status = {
        backend: 'ok',
        database: 'checking'
    };
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.query('SELECT 1');
        status.database = 'ok';
        res.json(status);
    } catch (error) {
        status.database = 'error';
        status.message = error.message;
        res.status(500).json(status);
    } finally {
        if (connection) await connection.end();
    }
});

// --- PUBLIC CONFIG ENDPOINT ---
apiV1Router.get('/public-config', (req, res) => {
    if (!GOOGLE_CLIENT_ID) {
        console.warn('GET /public-config: GOOGLE_CLIENT_ID is not set on the backend.');
    }
    res.json({
        googleClientId: GOOGLE_CLIENT_ID,
    });
});


// USER AUTHENTICATION
apiV1Router.post('/register', async (req, res) => {
    if (!isDbConfigured) {
        return res.status(503).json({ message: 'Service unavailable: Database is not configured.' });
    }

    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [existingUsers] = await connection.query('SELECT id, is_verified FROM users WHERE email = ?', [email]);
        
        // FIX: Handle cases where the user exists but is not verified.
        if (existingUsers.length > 0) {
            const existingUser = existingUsers[0];
            if (existingUser.is_verified) {
                return res.status(409).json({ message: 'A user with this email already exists and is verified.' });
            } else {
                // User exists but is not verified, treat as a "resend code" request.
                const verification_code = generateVerificationCode();
                await connection.query('UPDATE users SET verification_code = ? WHERE id = ?', [verification_code, existingUser.id]);
                await sendVerificationEmail(email, verification_code);
                const responseMessage = isSmtpConfigured ?
                    'You already have an account. A new verification code has been sent to your email.' :
                    'You already have an account. A new verification code has been generated. Please check the server console.';
                return res.status(200).json({ success: true, needs_verification: true, message: responseMessage });
            }
        }

        const password_hash = await bcrypt.hash(password, 10);
        const verification_code = generateVerificationCode();
        const displayName = email.split('@')[0];
        
        await connection.query(
            'INSERT INTO users (email, password_hash, verification_code, display_name) VALUES (?, ?, ?, ?)',
            [email, password_hash, verification_code, displayName]
        );

        await sendVerificationEmail(email, verification_code);
        const responseMessage = isSmtpConfigured ?
            'Registration successful. Please check your email for the verification code.' :
            'Registration successful. Please check the server console for the verification code.';

        res.status(201).json({ success: true, message: responseMessage });

    } catch (error) {
        console.error('Registration error:', error);
        // Provide a more specific error if it's a known database issue
        if (error.code && error.code.startsWith('ER_')) {
            res.status(500).json({ message: 'A database error occurred during registration. Please ensure the database is running and configured correctly.' });
        } else {
            res.status(500).json({ message: 'An internal server error occurred during registration.' });
        }
    } finally {
        if (connection) await connection.end();
    }
});

apiV1Router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!isDbConfigured) {
        return res.status(503).json({ message: 'Service unavailable: Database is not configured.' });
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [users] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ message: 'Invalid credentials.' });

        const user = users[0];
        if (!user.is_verified) {
             return res.status(403).json({ code: 'account_not_verified', message: 'Account not verified. Please verify your account.' });
        }

        if (!user.password_hash) {
            return res.status(401).json({ message: 'Invalid credentials. Try signing in with Google.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

        const [settingsRows] = await connection.query('SELECT settings_json FROM app_settings WHERE user_id = ?', [user.id]);
        const [sitesRows] = await connection.query('SELECT id, name, site_data_encrypted FROM user_sites WHERE user_id = ?', [user.id]);

        const settings = settingsRows.length > 0 ? JSON.parse(settingsRows[0].settings_json) : {};
        const sites = sitesRows; // Already an array of objects

        // FIX: Always inject the server's current Google Client ID into the settings object.
        settings.googleClientId = GOOGLE_CLIENT_ID;

        const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '1d' });

        res.json({ 
            token, 
            email: user.email, 
            isAdmin: !!user.is_admin, 
            settings, 
            sites,
            displayName: user.display_name,
            profilePictureUrl: user.profile_picture_url
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    } finally {
        if (connection) await connection.end();
    }
});

apiV1Router.post('/verify', async (req, res) => {
    if (!isDbConfigured) return res.status(403).json({ message: 'Database not configured.' });
    const { email, code } = req.body;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [users] = await connection.query('SELECT id, verification_code FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found.' });
        
        const user = users[0];
        if (user.verification_code !== code) return res.status(400).json({ message: 'Invalid verification code.' });

        await connection.query('UPDATE users SET is_verified = true, verification_code = NULL WHERE id = ?', [user.id]);
        res.json({ success: true, message: 'Account verified successfully. You can now log in.' });

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    } finally {
        if (connection) await connection.end();
    }
});

apiV1Router.post('/resend-verification', async (req, res) => {
    if (!isDbConfigured) return res.status(403).json({ message: 'Database not configured.' });
    const { email } = req.body;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const verification_code = generateVerificationCode();
        const [result] = await connection.query('UPDATE users SET verification_code = ? WHERE email = ? AND is_verified = false', [verification_code, email]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found or already verified.' });
        }
        
        await sendVerificationEmail(email, verification_code);
        const responseMessage = isSmtpConfigured ?
            'A new verification code has been sent to your email.' :
            'A new verification code has been generated. Please check the server console.';

        res.json({ success: true, message: responseMessage });
    } catch(error) {
        console.error('Resend code error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    } finally {
        if (connection) await connection.end();
    }
});

apiV1Router.post('/google-signin', async (req, res) => {
    if (!isDbConfigured || !googleAuthClient) {
        return res.status(503).json({ message: 'Service unavailable: Database or Google Client ID not configured.' });
    }

    const { token } = req.body;
    let payload;

    // Step 1: Verify the Google token first.
    try {
        const ticket = await googleAuthClient.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
        if (!payload) {
            // This case should be rare if verifyIdToken succeeds, but it's good practice.
            throw new Error("Invalid token payload received from Google.");
        }
    } catch (error) {
        console.error('Google Sign-In Token Verification Error:', error);
        if (error.message && error.message.toLowerCase().includes('audience')) {
             return res.status(401).json({ message: 'Google Sign-In failed due to an audience mismatch. Ensure your GOOGLE_CLIENT_ID is correct in the .env file.' });
        }
        return res.status(401).json({ message: 'Google Sign-In failed. The provided token is invalid, expired, or could not be verified.' });
    }
    
    // Step 2: Handle database operations now that the token is verified.
    const { sub: google_id, email, email_verified, name, picture } = payload;

    if (!email_verified) {
        return res.status(400).json({ message: 'Google account is not verified.' });
    }
    
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.beginTransaction();
        
        let [users] = await connection.query('SELECT * FROM users WHERE google_id = ? OR email = ?', [google_id, email]);
        let user;
        let isNewUser = false;

        if (users.length > 0) {
            user = users[0];
            await connection.query(
                'UPDATE users SET google_id = ?, display_name = ?, profile_picture_url = ?, is_verified = true WHERE id = ?',
                [google_id, name, picture, user.id]
            );
        } else {
            isNewUser = true;
            const displayName = name || email.split('@')[0];
            const [result] = await connection.query(
                'INSERT INTO users (email, display_name, profile_picture_url, is_verified, is_admin, google_id) VALUES (?, ?, ?, ?, ?, ?)',
                [email, displayName, picture, true, false, google_id]
            );
            const [insertedUsers] = await connection.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
            user = insertedUsers[0];
        }

        const [refreshedUsers] = await connection.query('SELECT * FROM users WHERE id = ?', [user.id]);
        user = refreshedUsers[0];

        const [settingsRows] = await connection.query('SELECT settings_json FROM app_settings WHERE user_id = ?', [user.id]);
        let settings = settingsRows.length > 0 ? JSON.parse(settingsRows[0].settings_json) : {};

        if (isNewUser) {
             settings = {
                "aiProvider": "gemini", "creditSaverEnabled": true, "geminiApiKey": "", "geminiModel": "gemini-2.5-flash",
                "googleClientId": GOOGLE_CLIENT_ID,
             };
             await connection.query('INSERT INTO app_settings (user_id, settings_json) VALUES (?, ?)', [user.id, JSON.stringify(settings)]);
        }

        settings.googleClientId = GOOGLE_CLIENT_ID;

        const [sitesRows] = await connection.query('SELECT id, name, site_data_encrypted FROM user_sites WHERE user_id = ?', [user.id]);
        const sites = sitesRows;
        
        await connection.commit();
        
        const jwtToken = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ 
            token: jwtToken, 
            email: user.email, 
            isAdmin: !!user.is_admin, 
            settings, 
            sites,
            displayName: user.display_name,
            profilePictureUrl: user.profile_picture_url
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Google Sign-In Database/Logic Error:', error);
        res.status(500).json({ message: 'A server error occurred after authenticating with Google. Please check the server logs.' });
    } finally {
        if (connection) await connection.end();
    }
});


// SETTINGS & SITE DATA
apiV1Router.get('/sites', authenticateToken, async (req, res) => {
    if (!isDbConfigured) return res.json([]);
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query('SELECT id, name, site_data_encrypted FROM user_sites WHERE user_id = ?', [req.user.id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch sites.' });
    } finally {
        if (connection) await connection.end();
    }
});

apiV1Router.post('/sites', authenticateToken, async (req, res) => {
    if (!isDbConfigured) return res.status(503).json({ message: 'Database not configured.' });
    const { name, site_data_encrypted } = req.body;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.query(
            'INSERT INTO user_sites (user_id, name, site_data_encrypted) VALUES (?, ?, ?)',
            [req.user.id, name, site_data_encrypted]
        );
        res.status(201).json({ id: result.insertId, name, site_data_encrypted });
    } catch (error) {
        res.status(500).json({ message: 'Failed to save site.' });
    } finally {
        if (connection) await connection.end();
    }
});

apiV1Router.delete('/sites/:id', authenticateToken, async (req, res) => {
    if (!isDbConfigured) return res.sendStatus(204);
    const { id } = req.params;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        // Ensure user can only delete their own sites
        await connection.query('DELETE FROM user_sites WHERE id = ? AND user_id = ?', [id, req.user.id]);
        res.sendStatus(204);
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete site.' });
    } finally {
        if (connection) await connection.end();
    }
});

apiV1Router.post('/settings', authenticateToken, async (req, res) => {
    if (!isDbConfigured) return res.sendStatus(204);
    const settings = req.body;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.query(
            'INSERT INTO app_settings (user_id, settings_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE settings_json = ?',
            [req.user.id, JSON.stringify(settings), JSON.stringify(settings)]
        );
        res.sendStatus(204);
    } catch (error) {
        res.status(500).json({ message: 'Failed to save settings.' });
    } finally {
        if (connection) await connection.end();
    }
});

apiV1Router.post('/profile', authenticateToken, async (req, res) => {
    if (!isDbConfigured) return res.status(503).json({ message: 'Database not configured.' });
    const { displayName, profilePictureUrl } = req.body;

    if (!displayName || displayName.trim().length === 0) {
        return res.status(400).json({ message: 'Display name cannot be empty.' });
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        // FIX: Coalesce an empty string for profilePictureUrl to NULL to handle cases where the user clears the field.
        await connection.query(
            'UPDATE users SET display_name = ?, profile_picture_url = ? WHERE id = ?',
            [displayName, profilePictureUrl || null, req.user.id]
        );
        res.json({ success: true, message: 'Profile updated successfully.' });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ message: 'Failed to update profile.' });
    } finally {
        if (connection) await connection.end();
    }
});

// FIX: Add admin-only routes to get and save application-wide SEO settings.
apiV1Router.get('/app-seo', authenticateToken, isAdmin, async (req, res) => {
    if (!isDbConfigured) return res.json({ meta_title: '', meta_description: '', meta_keywords: '' });
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query('SELECT meta_title, meta_description, meta_keywords FROM app_seo_settings WHERE id = 1');
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            // If no row exists, create one with defaults and return that.
            const defaultSeo = { meta_title: 'Dev-Console', meta_description: 'AI-powered WordPress management suite.', meta_keywords: 'wordpress, ai, developer, management' };
            await connection.query('INSERT INTO app_seo_settings (id, meta_title, meta_description, meta_keywords) VALUES (1, ?, ?, ?)', [defaultSeo.meta_title, defaultSeo.meta_description, defaultSeo.meta_keywords]);
            res.json(defaultSeo);
        }
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch app SEO settings.' });
    } finally {
        if (connection) await connection.end();
    }
});

apiV1Router.post('/app-seo', authenticateToken, isAdmin, async (req, res) => {
    if (!isDbConfigured) return res.sendStatus(204);
    const { meta_title, meta_description, meta_keywords } = req.body;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.query(
            `INSERT INTO app_seo_settings (id, meta_title, meta_description, meta_keywords) 
             VALUES (1, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE meta_title = VALUES(meta_title), meta_description = VALUES(meta_description), meta_keywords = VALUES(meta_keywords)`,
            [meta_title, meta_description, meta_keywords]
        );
        res.sendStatus(204);
    } catch (error) {
        res.status(500).json({ message: 'Failed to save app SEO settings.' });
    } finally {
        if (connection) await connection.end();
    }
});


// --- PLUGIN UPDATER ---
apiV1Router.get('/connector-plugin/latest', authenticateToken, (req, res) => {
    try {
        // FIX: Corrected regex to properly parse the version number from the plugin header.
        const versionMatch = pluginSourceCode.match(/Version:\s*([0-9.]+)/);
        const version = versionMatch ? versionMatch[1].trim() : '0.0.0';
        res.json({
            version: version,
            source: pluginSourceCode
        });
    } catch (error) {
        res.status(500).json({ message: 'Could not retrieve latest plugin source.' });
    }
});


// ADMIN
apiV1Router.get('/users', authenticateToken, isAdmin, async (req, res) => {
    if (!isDbConfigured) return res.json([]);
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [users] = await connection.query('SELECT id, email, registered_date FROM users ORDER BY registered_date DESC');
        const usersWithSiteData = users.map(u => ({...u, site_url: 'N/A'}));
        res.json(usersWithSiteData);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch users.' });
    } finally {
        if (connection) await connection.end();
    }
});

apiV1Router.delete('/users', authenticateToken, isAdmin, async (req, res) => {
    if (!isDbConfigured) return res.json({ success: true });
    const { email } = req.body;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.query('DELETE FROM users WHERE email = ?', [email]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete user.' });
    } finally {
        if (connection) await connection.end();
    }
});

apiV1Router.get('/backend-config-status', authenticateToken, isAdmin, async (req, res) => {
    if (!isDbConfigured) {
        return res.status(503).json({ message: 'Database is not configured.' });
    }

    let dbStatus = 'error';
    let dbError = '';
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.query('SELECT 1');
        dbStatus = 'ok';
    } catch (e) {
        dbError = e.message;
    } finally {
        if (connection) await connection.end();
    }

    let smtpStatus = 'not configured';
    let smtpError = '';
    if (transporter) {
        try {
            await transporter.verify();
            smtpStatus = 'ok';
        } catch (e) {
            smtpStatus = 'error';
            smtpError = e.message;
        }
    }

    const configStatus = {
        database: {
            DB_HOST: process.env.DB_HOST || 'Not Set',
            DB_USER: process.env.DB_USER || 'Not Set',
            DB_DATABASE: process.env.DB_DATABASE || 'Not Set',
            DB_PASSWORD: process.env.DB_PASSWORD ? '********' : 'Not Set',
            connectionStatus: dbStatus,
            connectionError: dbError,
        },
        secrets: {
            JWT_SECRET: process.env.JWT_SECRET && process.env.JWT_SECRET !== 'default-secret-for-demo-mode' ? '********' : 'Not Set or Default',
        },
        google: {
            GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID || 'Not Set',
        },
        smtp: {
            SMTP_HOST: process.env.SMTP_HOST || 'Not Set',
            SMTP_PORT: process.env.SMTP_PORT || 'Not Set',
            SMTP_USER: process.env.SMTP_USER || 'Not Set',
            SMTP_PASS: process.env.SMTP_PASS ? '********' : 'Not Set',
            SMTP_FROM: process.env.SMTP_FROM || 'Not Set',
            SMTP_SECURE: process.env.SMTP_SECURE || 'Not Set',
            connectionStatus: smtpStatus,
            connectionError: smtpError,
        }
    };

    res.json(configStatus);
});


// NEXTCLOUD PROXY
apiV1Router.post('/nextcloud', authenticateToken, async (req, res) => {
    const { action, payload } = req.body;
    const userId = req.user.id;
    
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [settingsRows] = await connection.query('SELECT settings_json FROM app_settings WHERE user_id = ?', [userId]);

        if (settingsRows.length === 0) {
            return res.status(404).json({ success: false, details: 'Nextcloud settings not found.' });
        }

        const settings = JSON.parse(settingsRows[0].settings_json);
        const { serverUrl, username, password, backupPath } = settings.nextcloud || {};

        if (!serverUrl || !username || !password) {
            return res.status(400).json({ success: false, details: 'Nextcloud credentials are not fully configured.' });
        }

        const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
        const davUrl = `${serverUrl.replace(/\/$/, '')}/remote.php/dav/files/${username}`;

        if (action === 'verify') {
            const response = await fetch(davUrl, {
                method: 'PROPFIND',
                headers: { 'Authorization': authHeader, 'Depth': '0' },
            });
            
            if (response.status === 207 || response.status === 200) { // 207 Multi-Status is success for PROPFIND
                res.json({ success: true });
            } else {
                res.status(response.status).json({ success: false, details: `Connection failed with status: ${response.status}. Check URL and credentials.` });
            }

        } else if (action === 'upload_backup') {
            const { siteUrl, fileName, content } = payload; // content is base64
            if (!fileName || !content || !siteUrl) {
                return res.status(400).json({ success: false, details: 'Missing fileName, content, or siteUrl for upload.' });
            }

            const buffer = Buffer.from(content, 'base64');
            const rootBackupPath = backupPath || 'dev-console-backups';
            const siteFolderName = siteUrl.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9.-]/g, '_');
            const fullPath = `${rootBackupPath}/${siteFolderName}`;

            // FIX: Use the robust `ensureDavPathExists` helper to create the full directory structure.
            await ensureDavPathExists(davUrl, fullPath, authHeader);

            const uploadResponse = await fetch(`${davUrl}/${fullPath}/${fileName}`, {
                method: 'PUT',
                headers: { 'Authorization': authHeader },
                body: buffer,
            });

            if (uploadResponse.status === 201 || uploadResponse.status === 204) { // 201 Created or 204 No Content
                res.json({ success: true });
            } else {
                res.status(uploadResponse.status).json({ success: false, details: `Upload failed with status: ${uploadResponse.status}.` });
            }

        } else {
            res.status(400).json({ success: false, details: 'Invalid Nextcloud action.' });
        }
    } catch (error) {
        console.error('Nextcloud proxy error:', error);
        res.status(500).json({ success: false, details: `Internal server error: ${error.message}` });
    } finally {
        if (connection) await connection.end();
    }
});


apiV1Router.post('/request-reset', (req, res) => {
     res.status(501).json({ message: 'Password reset not fully implemented in this backend.' });
});

// Mount the API router with the consistent prefix
app.use('/dev-console-api/v1', apiV1Router);


const initializeAndStartServer = async () => {
    console.log('🚀 Dev-Console backend server starting...');

    if (isDbConfigured) {
        let tempConnection;
        try {
            const { host, user, password, database } = dbConfig;
            tempConnection = await mysql.createConnection({ host, user, password });
            await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
            console.log(`✅ Database "${database}" is present.`);
            await tempConnection.end();

            tempConnection = await mysql.createConnection(dbConfig);
            await createTables(tempConnection);
            console.log('✅ Tables are present.');
            await tempConnection.end();
            
            await seedAdminUser();
            
            console.log('✅ Database setup complete.');

        } catch (error) {
            if (tempConnection) await tempConnection.end();
            console.error('🚨 FAILED TO INITIALIZE DATABASE CONNECTION:');
            console.error(`🚨 DB Host: ${dbConfig.host}`);
            console.error(`🚨 DB User: ${dbConfig.user}`);
            console.error(`🚨 Error: ${error.message}`);
            console.warn('🟡 The server will start, but all database operations will fail until the connection is resolved.');
            console.warn('🟡 Please ensure your MySQL server is running and the following environment variables are set correctly:');
            console.warn('🟡 DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE');
        }
    } else {
        console.warn('🟡 No database configured. Running in local-only/demo mode.');
        console.warn('🟡 To enable database features, create a .env file with DB_HOST, DB_USER, DB_PASSWORD, and DB_DATABASE.');
    }

    // In a serverless environment like Vercel, app.listen() is not needed.
    // The framework handles invoking the express app.
    // We only listen in a local environment.
    if (!process.env.VERCEL) {
      app.listen(PORT, '0.0.0.0', () => {
          console.log(`✅ Backend server is listening on all interfaces, port ${PORT}`);
          console.log(`   - Local:   http://localhost:${PORT}`);
      });
    }
};

initializeAndStartServer();

// Export the app for Vercel
export default app;