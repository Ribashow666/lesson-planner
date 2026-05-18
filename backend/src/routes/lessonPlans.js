const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const logger = require('../utils/logger');

const router = express.Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
  }
  next();
}

const planValidators = [
  body('title').trim().notEmpty().withMessage('Título é obrigatório').isLength({ max: 200 }),
  body('objective').trim().notEmpty().withMessage('Objetivo é obrigatório'),
  body('summary').trim().notEmpty().withMessage('Ementa/Resumo é obrigatória'),
  body('scheduled_date').isISO8601().withMessage('Data prevista inválida'),
  body('discipline').trim().notEmpty().withMessage('Disciplina é obrigatória').isLength({ max: 100 }),
  body('contents').optional().trim(),
  body('support_resources').optional().trim(),
  body('tags').optional().isArray().withMessage('Tags devem ser um array'),
];

// GET /api/lesson-plans
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('discipline').optional().trim(),
    query('tag').optional().trim(),
    query('date_from').optional().isISO8601(),
    query('date_to').optional().isISO8601(),
    query('search').optional().trim(),
    query('sort_by').optional().isIn(['title', 'created_at', 'scheduled_date']),
    query('sort_order').optional().isIn(['asc', 'desc']),
  ],
  validate,
  (req, res, next) => {
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 10;
      const offset = (page - 1) * limit;
      const allowedSorts = ['title', 'created_at', 'scheduled_date'];
      const sortBy = allowedSorts.includes(req.query.sort_by) ? req.query.sort_by : 'created_at';
      const sortOrder = req.query.sort_order === 'asc' ? 'ASC' : 'DESC';

      let whereClauses = [];
      let params = [];

      if (req.query.discipline) {
        whereClauses.push('LOWER(discipline) = LOWER(?)');
        params.push(req.query.discipline);
      }
      if (req.query.tag) {
        whereClauses.push('tags LIKE ?');
        params.push(`%${req.query.tag}%`);
      }
      if (req.query.date_from) {
        whereClauses.push('scheduled_date >= ?');
        params.push(req.query.date_from);
      }
      if (req.query.date_to) {
        whereClauses.push('scheduled_date <= ?');
        params.push(req.query.date_to);
      }
      if (req.query.search) {
        whereClauses.push('LOWER(title) LIKE LOWER(?)');
        params.push(`%${req.query.search}%`);
      }

      const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const total = db.count(`SELECT COUNT(*) as c FROM lesson_plans ${where}`, params);
      const rows = db.all(
        `SELECT * FROM lesson_plans ${where} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      );

      const plans = rows.map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') }));
      logger.info('Lesson plans listed', { total, page, limit });

      res.json({
        data: plans,
        pagination: { total, page, limit, total_pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/lesson-plans/:id
router.get('/:id', [param('id').isUUID()], validate, (req, res, next) => {
  try {
    const plan = db.get('SELECT * FROM lesson_plans WHERE id = ?', [req.params.id]);
    if (!plan) return res.status(404).json({ error: { message: 'Plano de aula não encontrado' } });
    res.json({ data: { ...plan, tags: JSON.parse(plan.tags || '[]') } });
  } catch (err) { next(err); }
});

// POST /api/lesson-plans
router.post('/', planValidators, validate, (req, res, next) => {
  try {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { title, objective, summary, scheduled_date, discipline, contents = '', support_resources = '', tags = [] } = req.body;

    db.run(
      'INSERT INTO lesson_plans (id,title,objective,summary,scheduled_date,discipline,contents,support_resources,tags,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [id, title, objective, summary, scheduled_date, discipline, contents, support_resources, JSON.stringify(tags), now, now],
    );

    const plan = db.get('SELECT * FROM lesson_plans WHERE id = ?', [id]);
    logger.info('Lesson plan created', { id, title, discipline });
    res.status(201).json({ data: { ...plan, tags: JSON.parse(plan.tags) } });
  } catch (err) { next(err); }
});

// PUT /api/lesson-plans/:id
router.put('/:id', [param('id').isUUID(), ...planValidators], validate, (req, res, next) => {
  try {
    const existing = db.get('SELECT id FROM lesson_plans WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: { message: 'Plano de aula não encontrado' } });

    const { title, objective, summary, scheduled_date, discipline, contents = '', support_resources = '', tags = [] } = req.body;
    const now = new Date().toISOString();

    db.run(
      'UPDATE lesson_plans SET title=?,objective=?,summary=?,scheduled_date=?,discipline=?,contents=?,support_resources=?,tags=?,updated_at=? WHERE id=?',
      [title, objective, summary, scheduled_date, discipline, contents, support_resources, JSON.stringify(tags), now, req.params.id],
    );

    const plan = db.get('SELECT * FROM lesson_plans WHERE id = ?', [req.params.id]);
    logger.info('Lesson plan updated', { id: req.params.id, title });
    res.json({ data: { ...plan, tags: JSON.parse(plan.tags) } });
  } catch (err) { next(err); }
});

// DELETE /api/lesson-plans/:id
router.delete('/:id', [param('id').isUUID()], validate, (req, res, next) => {
  try {
    const existing = db.get('SELECT id, title FROM lesson_plans WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: { message: 'Plano de aula não encontrado' } });

    db.run('DELETE FROM lesson_plans WHERE id = ?', [req.params.id]);
    logger.info('Lesson plan deleted', { id: req.params.id, title: existing.title });
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
