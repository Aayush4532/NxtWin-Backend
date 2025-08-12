function cost(qYes, qNo, b) {
  const a = Math.exp(qYes / b);
  const c = Math.exp(qNo / b);
  return b * Math.log(a + c);
}

function price(qYes, qNo, b) {
  const ey = Math.exp(qYes / b);
  const en = Math.exp(qNo / b);
  const denom = ey + en;
  const pYes = ey / denom;
  const pNo = en / denom;
  return { yes: pYes, no: pNo };
}

function costToBuyShares(qYes, qNo, b, deltaShares, side = "yes") {
  // For buying deltaShares of 'yes' or 'no'
  if (deltaShares <= 0) return 0;
  if (side === "yes") {
    const before = cost(qYes, qNo, b);
    const after = cost(qYes + deltaShares, qNo, b);
    return after - before;
  } else {
    const before = cost(qYes, qNo, b);
    const after = cost(qYes, qNo + deltaShares, b);
    return after - before;
  }
}

function buyShares(state, b, deltaShares, side = "yes") {
  // state is object { qYes, qNo }
  const qy = state.qYes;
  const qn = state.qNo;
  const cost = costToBuyShares(qy, qn, b, deltaShares, side);
  // update state (caller can persist)
  if (side === "yes") state.qYes += deltaShares;
  else state.qNo += deltaShares;
  const p = price(state.qYes, state.qNo, b);
  return { cost, newPrice: p, state };
}

// Inverse: given a budget, find how many shares (delta) you can buy of 'side'.
// Binary search for delta such that costToBuyShares(...) <= budget
function buyWithBudget(state, b, budget, side = "yes", opts = {}) {
  const maxIter = opts.maxIter || 60;
  const tol = opts.tol || 1e-9;

  // quick check: cost for a tiny eps shares
  if (budget <= 0) return { deltaShares: 0, cost: 0 };

  // Upper bound for binary search: increase exponentially until cost > budget
  let lo = 0;
  let hi = 1;
  while (costToBuyShares(state.qYes, state.qNo, b, hi, side) <= budget) {
    hi *= 2;
    if (hi > 1e12) break; // safety cap
  }

  // binary search [lo, hi]
  let mid = hi;
  let costMid = costToBuyShares(state.qYes, state.qNo, b, mid, side);
  for (let i = 0; i < maxIter; i++) {
    mid = (lo + hi) / 2;
    costMid = costToBuyShares(state.qYes, state.qNo, b, mid, side);
    if (Math.abs(costMid - budget) <= tol) break;
    if (costMid > budget) hi = mid;
    else lo = mid;
  }

  // return the deltaShare we found and actual cost (may be <= budget)
  return { deltaShares: mid, cost: costMid };
}

// Simple example runner that demonstrates usage
function exampleRun() {
  const b = 10; // liquidity param
  const state = { qYes: 0, qNo: 0 };

  console.log("initial price", price(state.qYes, state.qNo, b));

  // Someone buys 5 YES shares
  const buy1 = buyShares(state, b, 5, "yes");
  console.log(
    "Bought 5 YES, cost:",
    buy1.cost.toFixed(6),
    "new price:",
    buy1.newPrice
  );

  // Someone buys 10 NO shares
  const buy2 = buyShares(state, b, 10, "no");
  console.log(
    "Bought 10 NO, cost:",
    buy2.cost.toFixed(6),
    "new price:",
    buy2.newPrice
  );

  // Someone wants to spend budget 2.5 currency units on YES; find shares they can buy
  const budget = 2.5;
  const { deltaShares, cost } = buyWithBudget(state, b, budget, "yes");
  console.log(
    `With budget ${budget}, can buy ~${deltaShares.toFixed(
      6
    )} YES for cost ${cost.toFixed(6)}`
  );

  // apply that buy
  const buy3 = buyShares(state, b, deltaShares, "yes");
  console.log("Applied that buy, new price:", buy3.newPrice);

  return state;
}

// Exported API
module.exports = {
  cost,
  price,
  costToBuyShares,
  buyShares,
  buyWithBudget,
  exampleRun,
};
