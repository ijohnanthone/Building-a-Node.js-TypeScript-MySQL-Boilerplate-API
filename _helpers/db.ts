import config from '../config.json';
import mysql from 'mysql2/promise';
import { Sequelize } from 'sequelize';
import fs from 'fs';
import accountModel from '../accounts/account.model';
import refreshTokenModel from '../accounts/refresh-token.model';

const db: any = {};
export default db;

initialize();

async function initialize() {
    try {
        console.log('[DB] Initializing connection to database...');
        // 1. Read from environment variables if they exist, otherwise fall back to config.json
        const host = process.env.DB_HOST || config.database.host;
        const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : config.database.port;
        const user = process.env.DB_USER || config.database.user;
        const password = process.env.DB_PASSWORD || config.database.password;
        const database = process.env.DB_DATABASE || config.database.database;

        console.log(`[DB] Database configuration: Host: ${host}, Port: ${port}, User: ${user}, Database: ${database}`);

        // Prepare SSL options. Support DB_SSL_CA (base64) environment variable for Aiven/managed DBs.
        let sslOptions: any = undefined;
        if (host !== 'localhost') {
            if (process.env.DB_SSL_CA) {
                console.log('[DB] Using DB_SSL_CA environment variable for SSL configuration');
                // DB_SSL_CA should be base64-encoded PEM content
                const ca = Buffer.from(process.env.DB_SSL_CA, 'base64').toString('utf8');
                sslOptions = { ca };
            } else {
                console.log('[DB] No DB_SSL_CA env variable. Defaulting to permissive SSL (rejectUnauthorized: false)');
                // fallback to permissive SSL (rejectUnauthorized=false)
                sslOptions = { rejectUnauthorized: false };
            }
        }

        // 2. Create the connection
        console.log('[DB] Creating raw connection to MySQL server...');
        const connection = await mysql.createConnection({
            host,
            port,
            user,
            password,
            ssl: sslOptions
        });

        // Create DB if it doesn't exist
        console.log(`[DB] Ensuring database \`${database}\` exists...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
        await connection.end();

        // 3. Connect to DB with Sequelize (passing host, port and SSL configuration)
        console.log('[DB] Connecting to DB with Sequelize...');
        const sequelize = new Sequelize(database, user, password, {
            host,
            port,
            dialect: 'mysql',
            logging: console.log,
            dialectOptions: host !== 'localhost' ? {
                ssl: sslOptions
            } : undefined
        });

        // Init models
        db.Account = accountModel(sequelize);
        db.RefreshToken = refreshTokenModel(sequelize);

        // Define relationships
        db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
        db.RefreshToken.belongsTo(db.Account);

        // Sync models with database
        console.log('[DB] Syncing Sequelize models...');
        await sequelize.sync();
        console.log('[DB] Database initialization completed successfully!');
    } catch (error) {
        console.error('[DB FATAL ERROR] Failed to initialize database connection:', error);
    }
}
