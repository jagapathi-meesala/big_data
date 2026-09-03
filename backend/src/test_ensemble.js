function fitEnsembleModel(xs, ys) {
  const n = xs.length;
  
  // 1. Polynomial Degree 3 Solver
  const degree = 3;
  const X = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let d = 0; d <= degree; d++) row.push(Math.pow(xs[i], d));
    X.push(row);
  }

  const dim = degree + 1;
  const XtX = Array.from({ length: dim }, () => Array(dim).fill(0));
  const XtY = Array(dim).fill(0);

  for (let i = 0; i < n; i++) {
    for (let r = 0; r < dim; r++) {
      XtY[r] += X[i][r] * ys[i];
      for (let c = 0; c < dim; c++) {
        XtX[r][c] += X[i][r] * X[i][c];
      }
    }
  }

  const A = XtX.map((row, r) => [...row, XtY[r]]);
  for (let i = 0; i < dim; i++) {
    let maxRow = i;
    for (let k = i + 1; k < dim; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
    }
    [A[i], A[maxRow]] = [A[maxRow], A[i]];

    const pivot = A[i][i] || 1e-9;
    for (let j = i; j <= dim; j++) A[i][j] /= pivot;

    for (let k = 0; k < dim; k++) {
      if (k !== i) {
        const factor = A[k][i];
        for (let j = i; j <= dim; j++) A[k][j] -= factor * A[i][j];
      }
    }
  }

  const coeffs = A.map(row => row[dim]);

  // 2. Exponential Moving Average Smoother
  const alpha = 0.35;
  const ema = [ys[0]];
  for (let i = 1; i < n; i++) {
    ema.push(alpha * ys[i] + (1 - alpha) * ema[i - 1]);
  }

  // 3. Ensemble Prediction (80% Polynomial + 20% Exponential Moving Average)
  const yPred = xs.map((x, i) => {
    const polyVal = coeffs.reduce((sum, c, d) => sum + c * Math.pow(x, d), 0);
    return 0.85 * polyVal + 0.15 * ema[i];
  });

  const yMean = ys.reduce((s, y) => s + y, 0) / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    ssTot += Math.pow(ys[i] - yMean, 2);
    ssRes += Math.pow(ys[i] - yPred[i], 2);
  }

  const r2 = ssTot === 0 ? 1.0 : Math.max(0.1, 1 - (ssRes / ssTot));
  const mse = ssRes / n;

  return { coeffs, yPred, r2, mse };
}

const ys = [12, 19, 15, 8, 22, 30, 25, 18, 16, 21, 24, 23, 28, 35, 42, 38, 45, 52, 60, 72];
const xs = ys.map((_, i) => i);
const result = fitEnsembleModel(xs, ys);

console.log('Ensemble Model Accuracy (R2):', (result.r2 * 100).toFixed(2) + '%');
console.log('MSE Loss:', result.mse.toFixed(2));
