import { Annotation } from "@langchain/langgraph";

const ExpenseState = Annotation.Root({
  rawInput: Annotation(),
  source: Annotation(),
  transaction: Annotation(),
  monthlyBudget: Annotation(),
  totalSpent: Annotation(),
  remaining: Annotation(),
  dailyBudget: Annotation(),
  remainingDays: Annotation(),
  riskLevel: Annotation(),
  advice: Annotation(),
  adviceOnly: Annotation(),
  error: Annotation(),
});

export { ExpenseState };
