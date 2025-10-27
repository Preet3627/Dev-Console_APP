import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bodyParser from 'body-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

/*
 * Environment variables required for this server to run:
 * - DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE
 * - JWT_SECRET: A long, random, secret string for signing JWTs.
 * - GOOGLE_CLIENT_ID: Your Google OAuth Client ID.
 * - ADMIN_EMAIL (optional): Email for the default admin user on first run. Defaults to 'admin@example.com'.
 * - ADMIN_PASSWORD (optional): Password for the default admin user on first run. Defaults to a strong random password logged to console.
 * - SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM (optional): For sending verification emails.
 */
const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_DATABASE', 'JWT_SECRET', 'GOOGLE_CLIENT_ID'];
for (const envVar of requiredEnv) {
    if (!process.env[envVar]) {
        console.warn(`🚨 WARNING: Environment variable ${envVar} is not set!`);
    }
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
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
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

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
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
    await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255),
            is_verified BOOLEAN DEFAULT false,
            is_admin BOOLEAN DEFAULT false,
            verification_code VARCHAR(10),
            google_id VARCHAR(255) UNIQUE,
            registered_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    
    await connection.query(`
        CREATE TABLE IF NOT EXISTS app_settings (
            user_id INT PRIMARY KEY,
            settings_json TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS site_data (
            user_id INT PRIMARY KEY,
            site_data_encrypted TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);
};


const seedAdminUser = async () => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
        if (users[0].count === 0) {
            console.log('No users found. Seeding default admin account...');
            const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
            const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');
            
            if (!process.env.ADMIN_PASSWORD) {
                console.log('**************************************************************');
                console.log('*** NO ADMIN_PASSWORD ENV VAR SET. GENERATING RANDOM ONE:  ***');
                console.log(`*** Admin Email: ${adminEmail}`);
                console.log(`*** Admin Pass:  ${adminPassword}`);
                console.log('**************************************************************');
            }

            const password_hash = await bcrypt.hash(adminPassword, 10);
            
            const [insertResult] = await connection.query(
                'INSERT INTO users (email, password_hash, is_verified, is_admin) VALUES (?, ?, ?, ?)',
                [adminEmail, password_hash, true, true]
            );
            const adminUserId = insertResult.insertId;

            const defaultSettings = {
              "aiProvider": "gemini", "creditSaverEnabled": true, "geminiApiKey": "", "geminiModel": "gemini-2.5-flash",
              "openAiApiKey": "", "openAiModel": "gpt-4o", "claudeApiKey": "", "claudeModel": "claude-3-haiku-20240307",
              "groqApiKey": "", "perplexityApiKey": "", "pageSpeedApiKey": "",
              "googleClientId": process.env.GOOGLE_CLIENT_ID,
              "nextcloud": {"serverUrl": "","username": "","password": "","backupPath": "dev-console-backups"},
              "googleDrive": {"folderName": "Dev-Console Backups"}
            };

            await connection.query(
                'INSERT INTO app_settings (user_id, settings_json) VALUES (?, ?)',
                [adminUserId, JSON.stringify(defaultSettings)]
            );
            
            console.log(`Admin user '${adminEmail}' created successfully.`);
        }
    } catch (error) {
        console.error('Error during database seeding:', error);
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
        const [existingUsers] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'User with this email already exists.' });
        }

        const password_hash = await bcrypt.hash(password, 10);
        const verification_code = generateVerificationCode();
        
        await connection.query(
            'INSERT INTO users (email, password_hash, verification_code) VALUES (?, ?, ?)',
            [email, password_hash, verification_code]
        );

        await sendVerificationEmail(email, verification_code);
        const responseMessage = isSmtpConfigured ?
            'Registration successful. Please check your email for the verification code.' :
            'Registration successful. Please check the server console for the verification code.';

        res.status(201).json({ success: true, message: responseMessage });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error during registration.' });
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
        const [siteDataRows] = await connection.query('SELECT site_data_encrypted FROM site_data WHERE user_id = ?', [user.id]);

        const settings = settingsRows.length > 0 ? JSON.parse(settingsRows[0].settings_json) : {};
        const siteData = siteDataRows.length > 0 ? siteDataRows[0].site_data_encrypted : null;

        // FIX: Always inject the server's current Google Client ID into the settings object.
        // This ensures that the frontend has the correct ID even if it wasn't set when the user was created.
        settings.googleClientId = process.env.GOOGLE_CLIENT_ID;

        const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '1d' });

        res.json({ token, email: user.email, isAdmin: !!user.is_admin, settings, siteData });

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
    if (!isDbConfigured || !googleAuthClient) return res.status(403).json({ message: 'Database or Google Client ID not configured.' });

    const { token } = req.body;
    let connection;
    try {
        const ticket = await googleAuthClient.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { sub: google_id, email, email_verified } = payload;

        if (!email_verified) {
            return res.status(400).json({ message: 'Google account is not verified.' });
        }

        connection = await mysql.createConnection(dbConfig);
        
        try {
            await connection.beginTransaction();
            let [users] = await connection.query('SELECT * FROM users WHERE google_id = ? OR email = ?', [google_id, email]);
            let user;
            let isNewUser = false;

            if (users.length > 0) {
                user = users[0];
                if (!user.google_id) {
                    await connection.query('UPDATE users SET google_id = ?, is_verified = true WHERE id = ?', [google_id, user.id]);
                }
            } else {
                isNewUser = true;
                const [result] = await connection.query(
                    'INSERT INTO users (email, is_verified, is_admin, google_id) VALUES (?, ?, ?, ?)',
                    [email, true, false, google_id]
                );
                const [insertedUsers] = await connection.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
                user = insertedUsers[0];
            }

            const [settingsRows] = await connection.query('SELECT settings_json FROM app_settings WHERE user_id = ?', [user.id]);
            let settings = settingsRows.length > 0 ? JSON.parse(settingsRows[0].settings_json) : {};

            if (isNewUser) {
                 settings = {
                    "aiProvider": "gemini", "creditSaverEnabled": true, "geminiApiKey": "", "geminiModel": "gemini-2.5-flash",
                    "googleClientId": process.env.GOOGLE_CLIENT_ID,
                 };
                 await connection.query('INSERT INTO app_settings (user_id, settings_json) VALUES (?, ?)', [user.id, JSON.stringify(settings)]);
            }

            // FIX: Always inject the server's current Google Client ID into the settings object.
            settings.googleClientId = process.env.GOOGLE_CLIENT_ID;

            const [siteDataRows] = await connection.query('SELECT site_data_encrypted FROM site_data WHERE user_id = ?', [user.id]);
            const siteData = siteDataRows.length > 0 ? siteDataRows[0].site_data_encrypted : null;
            
            await connection.commit();
            
            const jwtToken = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '1d' });
            res.json({ token: jwtToken, email: user.email, isAdmin: !!user.is_admin, settings, siteData });
        } catch (innerError) {
            await connection.rollback();
            throw innerError;
        }
    } catch (error) {
        console.error('Google Sign-In error:', error);
        res.status(401).json({ message: 'Google Sign-In failed. Invalid token.' });
    } finally {
        if (connection) await connection.end();
    }
});


// SETTINGS & SITE DATA
apiV1Router.get('/site-data', authenticateToken, async (req, res) => {
    if (!isDbConfigured) return res.status(204).send();
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query('SELECT site_data_encrypted FROM site_data WHERE user_id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(204).send();
        res.json({ data: rows[0].site_data_encrypted });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch site data.' });
    } finally {
        if (connection) await connection.end();
    }
});

apiV1Router.post('/site-data', authenticateToken, async (req, res) => {
    if (!isDbConfigured) return res.sendStatus(204);
    const { data } = req.body;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.query(
            'INSERT INTO site_data (user_id, site_data_encrypted) VALUES (?, ?) ON DUPLICATE KEY UPDATE site_data_encrypted = ?',
            [req.user.id, data, data]
        );
        res.sendStatus(204);
    } catch (error) {
        res.status(500).json({ message: 'Failed to save site data.' });
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

// PLACEHOLDER for other services
apiV1Router.post('/nextcloud', authenticateToken, (req, res) => {
    console.log('Received Nextcloud proxy request:', req.body);
    res.status(501).json({ success: false, details: 'Nextcloud proxy not implemented in this backend.' });
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