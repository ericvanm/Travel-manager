const router = require('express').Router()
const { ExpenseCategory } = require('../models/DBmodels')

// GET all expense categories
router.get('/', async (req, res) => {
  const expenseCategories = await ExpenseCategory.findAll()
  res.json(expenseCategories)
})

// POST new expense category
router.post('/', async (req, res) => {
  const expenseCategory = await ExpenseCategory.create(req.body)
  res.json(expenseCategory)
})

// PUT update expense category
router.put('/:id', async (req, res) => {
  const expenseCategory = await ExpenseCategory.findByPk(req.params.id)
  if (expenseCategory) {
    await expenseCategory.update(req.body)
    res.json(expenseCategory)
  } else {
    res.status(404).json({ error: 'Expense category not found' })
  }
})

// DELETE expense category
router.delete('/:id', async (req, res) => {
  const expenseCategory = await ExpenseCategory.findByPk(req.params.id)
  if (expenseCategory) {
    await expenseCategory.destroy()
    res.status(204).end()
  } else {
    res.status(404).json({ error: 'Expense category not found' })
  }
})

module.exports = router