const express = require('express');
const { body, validationResult } = require('express-validator');
const { generateRecommendations } = require('../services/aiService');
const logger = require('../utils/logger');

const router = express.Router();

router.post(
  '/recommend',
  [
    body('title').trim().notEmpty().withMessage('Título é obrigatório'),
    body('discipline').trim().notEmpty().withMessage('Disciplina é obrigatória'),
    body('summary').trim().notEmpty().withMessage('Ementa/Resumo é obrigatória'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    try {
      const { title, discipline, summary } = req.body;
      const recommendations = await generateRecommendations({ title, discipline, summary });
      res.json({ data: recommendations });
    } catch (err) {
      logger.error('AI recommendation failed', { message: err.message });
      if (err.message.includes('parse') || err.message.includes('fields')) {
        return res.status(502).json({ error: { message: 'A IA retornou uma resposta inválida. Tente novamente.' } });
      }
      if (err.status === 429) {
        return res.status(429).json({ error: { message: 'Limite de requisições da IA atingido. Aguarde um momento.' } });
      }
      next(err);
    }
  },
);

module.exports = router;
