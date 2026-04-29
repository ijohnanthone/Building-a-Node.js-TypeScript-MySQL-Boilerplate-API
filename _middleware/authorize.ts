import { expressjwt } from 'express-jwt';
import config from '../config.json';
import db from '../_helpers/db';

const { secret } = config;

export default function authorize(roles: any = []) {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return [
        expressjwt({ secret, algorithms: ['HS256'] }),
        async (req: any, res: any, next: any) => {
            // Note: express-jwt now puts the decoded payload in req.auth instead of req.user
            // If you encounter issues accessing req.user.id, try req.auth.id
            const account = await db.Account.findByPk(req.auth.id);

            if (!account || (roles.length && !roles.includes(account.role))) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            req.user = req.auth; // Maintaining compatibility if other parts of your code expect req.user
            req.user.role = account.role;
            const refreshTokens = await account.getRefreshTokens();
            req.user.ownsToken = (token: any) => !!refreshTokens.find((x: any) => x.token === token);
            next();
        }
    ];
}