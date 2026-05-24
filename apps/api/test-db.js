"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./src/modules/auth/entities/user.entity");
const bcrypt = __importStar(require("bcrypt"));
const dotenv = __importStar(require("dotenv"));
// Load env from workspace root
dotenv.config({ path: '../../.env' });
async function test() {
    console.log('Connecting with details:', {
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
        user: process.env.POSTGRES_USER,
        database: process.env.POSTGRES_DB,
    });
    const ds = new typeorm_1.DataSource({
        type: 'postgres',
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        username: process.env.POSTGRES_USER || 'hotel_user',
        password: process.env.POSTGRES_PASSWORD || 'hotel_secret',
        database: process.env.POSTGRES_DB || 'hotel_db',
        entities: [user_entity_1.User],
    });
    await ds.initialize();
    console.log('DB connected successfully.');
    const userRepo = ds.getRepository(user_entity_1.User);
    const users = await userRepo.find();
    console.log('Users in DB:', users.map(u => ({ id: u.id, email: u.email, role: u.role, passwordHash: u.passwordHash })));
    for (const user of users) {
        const isPassword123 = await bcrypt.compare('password123', user.passwordHash);
        console.log(`User ${user.email}: is password123?`, isPassword123);
    }
    await ds.destroy();
}
test().catch(console.error);
