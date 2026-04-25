import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User", 
    },

    type: {
        type: String,
        required: true,
        enum: ["income", "expense", "asset"],
    },

    amount: {
        type: Number,
        required: true,
        min: 0,
    },

    category: {
        type: String,
        required: true,
        enum: ["food", "transport", "bills", "airtime", "shopping", "others"],
    },

    description: {
        type: String,
        trim: true,
    },

    currency: {
        type: String,
        default: "NGN",
        enum: ["NGN", "USD", "EUR"],
    },

    date: {
        type: Date,
        default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Expense = mongoose.model("Expense", expenseSchema);

export default Expense;