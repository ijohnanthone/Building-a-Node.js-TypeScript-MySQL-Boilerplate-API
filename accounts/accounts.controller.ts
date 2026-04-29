import { Router } from 'express';
const router = Router();

// Placeholder routes to make the server start
router.get('/', (req, res) => {
    res.json({ message: "Accounts controller is active!" });
});

export default router;