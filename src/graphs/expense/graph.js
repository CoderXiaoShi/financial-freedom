import { StateGraph, END, START } from "@langchain/langgraph";
import { ExpenseState } from "./state.js";
import { receiveNode } from "./nodes/receive.js";
import { parseNode } from "./nodes/parse.js";
import { recordNode } from "./nodes/record.js";
import { checkNode } from "./nodes/check.js";
import { adviseNode } from "./nodes/advise.js";

function routeByRisk(state) {
  const ratio = state.remaining / state.monthlyBudget;
  if (ratio > 0.5) return "ok";
  if (ratio >= 0.2) return "warn";
  return "critical";
}

const expenseGraph = new StateGraph(ExpenseState)
  .addNode("receive", receiveNode)
  .addNode("parse", parseNode)
  .addNode("record", recordNode)
  .addNode("check", checkNode)
  .addNode("advise", adviseNode)

  .addEdge(START, "receive")
  .addEdge("receive", "parse")
  .addEdge("parse", "record")
  .addEdge("record", "check")

  .addConditionalEdges("check", routeByRisk, {
    ok: END,
    warn: "advise",
    critical: "advise",
  })
  .addEdge("advise", END)

  .compile();

export { expenseGraph };
