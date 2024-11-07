const pgp = require('pg-promise')();
require('dotenv').config();


class Database {
    constructor() {
        if (!Database.instance) {
            // Construct the connection string
            const dbConnectionString = `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
            // Create a PostgreSQL database instance
            this.db = pgp(dbConnectionString);

            Database.instance = this;
        }

        return Database.instance;
    }

    getDB() {
        return this.db;
    }
}

const db = new Database();

module.exports = db.getDB();
