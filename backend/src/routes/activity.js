import express from 'express';
import { getClient } from '../services/pbService.js';
import { buildFilter } from '../middleware/companyScope.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();

const esc = v => String(v ?? '').replace(/"/g, '');

router.get('/', requireAuth, async (req, res) => {
  try {
    const pb = await getClient();
    const { page=1, perPage=30, action='' } = req.query;
    const extra = action ? [`action = "${esc(action)}"`] : [];
    const filter = buildFilter(req.companyId, extra);
    const result = await pb.collection('activity_logs').getList(
      Number(page), Number(perPage),
      { sort:'-created', filter, requestKey:null }
    );
    res.json(result);
  } catch (err) {
    console.error('[activity] GET error:', err.message);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

router.post('/', async (req, res) => {
  try {
    const pb    = await getClient();
    const { action, actor, detail } = req.body;
    if (!action) return res.status(400).json({ error: 'action is required' });
    const entry = await pb.collection('activity_logs').create(
      { action, actor: actor??'', detail: detail??'', company_id: req.companyId||'' },
      { requestKey:null }
    );
    res.json(entry);
  } catch (err) {
    console.error('[activity] POST error:', err.message);
    res.status(500).json({ error: 'Failed to write activity log' });
  }
});

export default router;
