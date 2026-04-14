import express from 'express';
import Expense from '../models/expenses.js';
import { auth } from '../middlewares/auth.js';

const expenseRouter = express.Router();

expenseRouter.get('/expenses', auth, async(req, res) => {
    try {
        const expenses = await Expense.findOne({user: req.user._id});
        return res.send({expenses});
    }catch(error){
        return res.status(500).send({message: 'Error fetching expenses', error: error.message});
    }
});

expenseRouter.post('/expenses', auth, async(req, res) => {
    try{
        const expense = new Expense({ ...req.body, user: req.user._id,});
        await expense.save();

        const result = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          type: "expense"
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }
        }
      }
    ]);

    const totalSpent = result[0]?.total || 0;
    const budget = req.user.budget;

    let warning = null;

    if (budget > 0) {
    if (totalSpent > budget) {
        warning = "🚨 Budget exceeded!";
    } else if (totalSpent > budget * 0.8) {
        warning = "⚠️ You are close to your budget limit";
    }
    }

        return res.status(201).send({message: 'Expense created successfully', expense})
    }catch(error){ {
        return res.status(400).send({message: 'Error creating expense', error: error.message, warning, totalSpent, budget});
    }
}
});

expenseRouter.patch('/expenses/:id', auth, async(req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['type', 'amount', 'category', 'description', 'currency', 'date'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).send({message: 'Invalid updates'});
    }

    try {
        const expense = await Expense.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        { $set: req.body },
        {
            returnDocument: "after",
            runValidators: true
        }
        );
        if(!expense) {
            return res.status(404).send({ message: "Expense not found" });
        }
        return res.send({message: 'Expense updated successfully', expense});
    } catch (error) {
        return res.status(400).send({message: 'Error updating expense', error: error.message});
    }
});

expenseRouter.delete('/expenses/:id', auth, async(req, res) => {
    try {
        const expense = await Expense.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if(!expense) {
            return res.status(404).send({ message: "Expense not found" });
        }
        return res.send({message: 'Expense deleted successfully', expense});
    } catch (error) {
        return res.status(400).send({message: 'Error deleting expense', error: error.message});
    }
});


export {expenseRouter}