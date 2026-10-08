(function (global) {
  'use strict';

  const DEFAULT_SETTINGS = {
    hourlyRate: 43.777,
    otherTaxablePay: 0,

    traditional401kType: 'Percent',
    traditional401kValue: 0.01,
    roth401kType: 'Percent',
    roth401kValue: 0.04,

    federalAdjustment: 0,
    paIncomeTaxRate: 0.0307,
    localIncomeTaxRate: 0.019,
    paUnemploymentRate: 0.0007,
    socialSecurityRate: 0.062,
    medicareRate: 0.0145,

    deductions: {
      medical: 135.42,
      add: 0,
      childLife: 0.54,
      dental: 4.78,
      employeeLife: 0,
      longTermDisability: 10.90,
      localServicesTax: 1,
      spousalLife: 2.62,
      shortTermDisability: 9.60,
      vision: 4.42,
      other: 0
    },

    federalExamples: [
      { grossPay: 1976.06, federalWithheld: 153.40 },
      { grossPay: 1751.06, federalWithheld: 126.67 },
      { grossPay: 1488.40, federalWithheld: 95.47 }
    ]
  };

  function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  function numeric(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function contributionAmount(type, value, grossPay) {
    const enteredValue = Math.max(0, numeric(value));

    if (type === 'Percent') {
      return roundMoney(grossPay * enteredValue);
    }

    return roundMoney(enteredValue);
  }

  function calculateRegression(examples) {
    const valid = examples
      .map((example) => ({
        x: numeric(example.grossPay, NaN),
        y: numeric(example.federalWithheld, NaN)
      }))
      .filter((example) =>
  Number.isFinite(example.x) &&
  Number.isFinite(example.y) &&
  example.x > 0 &&
  example.y >= 0
);

    if (valid.length < 2) {
      return { slope: 0, intercept: 0 };
    }

    const averageX =
      valid.reduce((total, example) => total + example.x, 0) / valid.length;

    const averageY =
      valid.reduce((total, example) => total + example.y, 0) / valid.length;

    let numerator = 0;
    let denominator = 0;

    valid.forEach((example) => {
      numerator +=
        (example.x - averageX) * (example.y - averageY);

      denominator +=
        (example.x - averageX) * (example.x - averageX);
    });

    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = averageY - slope * averageX;

    return { slope, intercept };
  }

  function calculatePaycheck(hours, suppliedSettings = {}) {
    const settings = {
      ...DEFAULT_SETTINGS,
      ...suppliedSettings,
      deductions: {
        ...DEFAULT_SETTINGS.deductions,
        ...(suppliedSettings.deductions || {})
      },
      federalExamples:
        suppliedSettings.federalExamples ||
        DEFAULT_SETTINGS.federalExamples
    };

    const regularHours = Math.max(0, numeric(hours));
    const hourlyRate = Math.max(0, numeric(settings.hourlyRate));
    const otherTaxablePay = numeric(settings.otherTaxablePay);

    const grossPay = roundMoney(
      hourlyRate * regularHours + otherTaxablePay
    );

    const traditional401k = contributionAmount(
      settings.traditional401kType,
      settings.traditional401kValue,
      grossPay
    );

    const roth401k = contributionAmount(
      settings.roth401kType,
      settings.roth401kValue,
      grossPay
    );

    const deductions = settings.deductions;

    const preTaxBenefits =
      numeric(deductions.medical) +
      numeric(deductions.dental) +
      numeric(deductions.vision);

    const taxablePay = Math.max(
      0,
      roundMoney(grossPay - preTaxBenefits)
    );

    const socialSecurity = roundMoney(
      taxablePay * numeric(settings.socialSecurityRate)
    );

    const medicare = roundMoney(
      taxablePay * numeric(settings.medicareRate)
    );

    const regression = calculateRegression(
      settings.federalExamples
    );

    const federalWithholding = roundMoney(
      Math.max(
        0,
        regression.slope * grossPay +
          regression.intercept +
          numeric(settings.federalAdjustment)
      )
    );

    const paIncomeTax = roundMoney(
      taxablePay * numeric(settings.paIncomeTaxRate)
    );

    const localIncomeTax = roundMoney(
      taxablePay * numeric(settings.localIncomeTaxRate)
    );

    const paUnemployment = roundMoney(
      grossPay * numeric(settings.paUnemploymentRate)
    );

    const fixedDeductions = roundMoney(
      Object.values(deductions).reduce(
        (total, amount) => total + numeric(amount),
        0
      )
    );

    const totalDeductions = roundMoney(
      traditional401k +
      roth401k +
      socialSecurity +
      medicare +
      federalWithholding +
      paIncomeTax +
      localIncomeTax +
      paUnemployment +
      fixedDeductions
    );

    const takeHomePay = roundMoney(
      grossPay - totalDeductions
    );

    return {
      hours: regularHours,
      grossPay,
      takeHomePay,
      totalDeductions,
      traditional401k,
      roth401k,
      taxablePay,
      socialSecurity,
      medicare,
      federalWithholding,
      paIncomeTax,
      localIncomeTax,
      paUnemployment,
      fixedDeductions
    };
  }

  global.PaycheckCalculatorCore = {
    DEFAULT_SETTINGS,
    calculatePaycheck,
    calculateRegression,
    roundMoney
  };
})(globalThis);
