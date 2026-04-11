import express from 'express';
import Expense from '../models/expenses.js';
import { auth } from '../middlewares/auth.js';

const controllerRouter = express.Router();

controllerRouter.get("/expenses/summary", auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage = {
      user: req.user._id,
    };

    if (startDate || endDate) {
      matchStage.date = {};

      if (startDate) {
        matchStage.date.$gte = new Date(startDate);
      }

      if (endDate) {
        matchStage.date.$lte = new Date(endDate);
      }
    }

    const result = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]);

    let totalIncome = 0;
    let totalExpense = 0;

    result.forEach((item) => {
      if (item._id === "income") totalIncome = item.total;
      if (item._id === "expense") totalExpense = item.total;
    });

    const balance = totalIncome - totalExpense;

    res.send({ totalIncome, totalExpense, balance });

  } catch (error) {
    res.status(500).send({
      message: "Error generating summary",
      error: error.message,
    });
  }
});

controllerRouter.get("/expenses/category-summary", auth, async (req, res) => {
  try {
    const result = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          type: "expense"
        }
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" }
        }
      }
    ]);

    const totalAmount = result.reduce((sum, item) => sum + item.total, 0);

    const formatted = result.map(item => ({
      category: item._id,
      total: item.total,
      percentage: ((item.total / totalAmount) * 100).toFixed(1) + "%"
    }));

    res.send(formatted);

  } catch (error) {
    res.status(500).send({
      message: "Error generating category summary",
      error: error.message
    });
  }
});

controllerRouter.get("/expenses/monthly-trends", auth, async (req, res) => {
  try {
    const result = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          type: "expense"
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" }
          },
          totalExpense: { $sum: "$amount" }
        }
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1
        }
      }
    ]);

    // format output
    const formatted = result.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
      totalExpense: item.totalExpense
    }));

    res.send(formatted);

  } catch (error) {
    res.status(500).send({
      message: "Error generating monthly trends",
      error: error.message
    });
  }
});

controllerRouter.get("/expenses/weekly-comparison", auth, async (req, res) => {
  try {
    const now = new Date();

    // start of this week (Sunday)
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);

    const endOfThisWeek = new Date(startOfThisWeek);
    endOfThisWeek.setDate(startOfThisWeek.getDate() + 7);

    // last week
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

    const endOfLastWeek = new Date(startOfThisWeek);

    // aggregation
    const [thisWeekData, lastWeekData] = await Promise.all([
      Expense.aggregate([
        {
          $match: {
            user: req.user._id,
            type: "expense",
            date: {
              $gte: startOfThisWeek,
              $lt: endOfThisWeek
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" }
          }
        }
      ]),

      Expense.aggregate([
        {
          $match: {
            user: req.user._id,
            type: "expense",
            date: {
              $gte: startOfLastWeek,
              $lt: endOfLastWeek
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" }
          }
        }
      ])
    ]);

    const thisWeek = thisWeekData[0]?.total || 0;
    const lastWeek = lastWeekData[0]?.total || 0;

    let message = "No spending data";

    if (thisWeek > lastWeek) {
      message = "You spent more this week than last week";
    } else if (thisWeek < lastWeek) {
      message = "You spent less this week than last week";
    } else if (thisWeek === lastWeek && thisWeek !== 0) {
      message = "Your spending is the same as last week";
    }

    res.send({
      thisWeek,
      lastWeek,
      message
    });

  } catch (error) {
    res.status(500).send({
      message: "Error generating weekly comparison",
      error: error.message
    });
  }
});

export { controllerRouter };