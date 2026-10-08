const STORAGE_KEY = 'phoenix-paycheck-calculator-v1';
const API_URL = '/api/paycheck-calculator';

const defaults = PaycheckCalculatorCore.DEFAULT_SETTINGS;

const hoursInput = document.querySelector('#hours');
const takeHomeOutput = document.querySelector('#take-home');
const grossPayOutput = document.querySelector('#gross-pay');
const totalDeductionsOutput =
  document.querySelector('#total-deductions');
const syncStatus = document.querySelector('#sync-status');

const fields = {
  hourlyRate: document.querySelector('#hourly-rate'),
  otherTaxablePay: document.querySelector('#other-taxable-pay'),

  traditional401kType:
    document.querySelector('#traditional-401k-type'),
  traditional401kValue:
    document.querySelector('#traditional-401k-value'),

  roth401kType:
    document.querySelector('#roth-401k-type'),
  roth401kValue:
    document.querySelector('#roth-401k-value'),

  paIncomeTaxRate:
    document.querySelector('#pa-income-tax-rate'),
  localIncomeTaxRate:
    document.querySelector('#local-income-tax-rate'),
  paUnemploymentRate:
    document.querySelector('#pa-unemployment-rate'),
  socialSecurityRate:
    document.querySelector('#social-security-rate'),
  medicareRate:
    document.querySelector('#medicare-rate'),

  medical: document.querySelector('#medical'),
  add: document.querySelector('#add'),
  childLife: document.querySelector('#child-life'),
  dental: document.querySelector('#dental'),
  employeeLife: document.querySelector('#employee-life'),
  longTermDisability:
    document.querySelector('#long-term-disability'),
  localServicesTax:
    document.querySelector('#local-services-tax'),
  spousalLife: document.querySelector('#spousal-life'),
  shortTermDisability:
    document.querySelector('#short-term-disability'),
  vision: document.querySelector('#vision'),
  other: document.querySelector('#other-deductions')
};

const exampleFields = [1, 2, 3, 4, 5, 6].map(
  (number) => ({
    grossPay: document.querySelector(
      `#example-${number}-gross`
    ),

    federalWithheld: document.querySelector(
      `#example-${number}-federal`
    )
  })
);

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

let settings = loadLocalSettings();
let saveTimer;

function numberValue(input, fallback = 0) {
  const value = Number(input.value);

  return Number.isFinite(value) ? value : fallback;
}

function normalizeSettings(value) {
  if (!value || typeof value !== 'object') {
    return structuredClone(defaults);
  }

  const examples =
    Array.isArray(value.federalExamples) &&
    value.federalExamples.length >= 2
      ? value.federalExamples
      : defaults.federalExamples;

  return {
    ...structuredClone(defaults),
    ...value,

    deductions: {
      ...defaults.deductions,
      ...(value.deductions || {})
    },

    federalExamples: examples.map((example) => ({
      grossPay: Number(example.grossPay) || 0,
      federalWithheld:
        Number(example.federalWithheld) || 0
    }))
  };
}

function loadLocalSettings() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY)
    );

    if (saved) {
      if (Number.isFinite(Number(saved.hours))) {
        hoursInput.value = saved.hours;
      }

      return normalizeSettings(saved.settings);
    }
  } catch (error) {
    console.warn(
      'Could not load saved paycheck settings.',
      error
    );
  }

  return structuredClone(defaults);
}

function saveLocalSettings() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      hours: numberValue(hoursInput, 40),
      settings
    })
  );
}

function setSyncStatus(message, stateName) {
  syncStatus.textContent = message;
  syncStatus.dataset.state = stateName;
}

function displayPercent(value) {
  return Number(
    (Number(value || 0) * 100).toFixed(4)
  );
}

function contributionDisplayValue(type, value) {
  if (type === 'Percent') {
    return displayPercent(value);
  }

  return Number(value || 0);
}

function fillSettingsForm() {
  fields.hourlyRate.value = settings.hourlyRate;
  fields.otherTaxablePay.value =
    settings.otherTaxablePay;

  fields.traditional401kType.value =
    settings.traditional401kType;

  fields.traditional401kValue.value =
    contributionDisplayValue(
      settings.traditional401kType,
      settings.traditional401kValue
    );

  fields.roth401kType.value =
    settings.roth401kType;

  fields.roth401kValue.value =
    contributionDisplayValue(
      settings.roth401kType,
      settings.roth401kValue
    );

  fields.paIncomeTaxRate.value =
    displayPercent(settings.paIncomeTaxRate);

  fields.localIncomeTaxRate.value =
    displayPercent(settings.localIncomeTaxRate);

  fields.paUnemploymentRate.value =
    displayPercent(settings.paUnemploymentRate);

  fields.socialSecurityRate.value =
    displayPercent(settings.socialSecurityRate);

  fields.medicareRate.value =
    displayPercent(settings.medicareRate);

  Object.keys(settings.deductions).forEach((key) => {
    if (fields[key]) {
      fields[key].value = settings.deductions[key];
    }
  });

  exampleFields.forEach((fieldPair, index) => {
    const example = settings.federalExamples[index];

    if (!example || !Number(example.grossPay)) {
      fieldPair.grossPay.value = '';
      fieldPair.federalWithheld.value = '';
      return;
    }

    fieldPair.grossPay.value = example.grossPay;
    fieldPair.federalWithheld.value =
      example.federalWithheld;
  });
}

function contributionInputValue(type, input) {
  const value = Math.max(0, numberValue(input));

  if (type === 'Percent') {
    return value / 100;
  }

  return value;
}

function readSettingsForm() {
  const traditionalType =
    fields.traditional401kType.value;

  const rothType = fields.roth401kType.value;

  settings = normalizeSettings({
    hourlyRate:
      Math.max(0, numberValue(fields.hourlyRate)),

    otherTaxablePay:
      numberValue(fields.otherTaxablePay),

    traditional401kType: traditionalType,

    traditional401kValue:
      contributionInputValue(
        traditionalType,
        fields.traditional401kValue
      ),

    roth401kType: rothType,

    roth401kValue:
      contributionInputValue(
        rothType,
        fields.roth401kValue
      ),

    federalAdjustment:
      Number(settings.federalAdjustment) || 0,

    paIncomeTaxRate:
      Math.max(
        0,
        numberValue(fields.paIncomeTaxRate)
      ) / 100,

    localIncomeTaxRate:
      Math.max(
        0,
        numberValue(fields.localIncomeTaxRate)
      ) / 100,

    paUnemploymentRate:
      Math.max(
        0,
        numberValue(fields.paUnemploymentRate)
      ) / 100,

    socialSecurityRate:
      Math.max(
        0,
        numberValue(fields.socialSecurityRate)
      ) / 100,

    medicareRate:
      Math.max(
        0,
        numberValue(fields.medicareRate)
      ) / 100,

    deductions: {
      medical:
        Math.max(0, numberValue(fields.medical)),

      add:
        Math.max(0, numberValue(fields.add)),

      childLife:
        Math.max(0, numberValue(fields.childLife)),

      dental:
        Math.max(0, numberValue(fields.dental)),

      employeeLife:
        Math.max(
          0,
          numberValue(fields.employeeLife)
        ),

      longTermDisability:
        Math.max(
          0,
          numberValue(fields.longTermDisability)
        ),

      localServicesTax:
        Math.max(
          0,
          numberValue(fields.localServicesTax)
        ),

      spousalLife:
        Math.max(
          0,
          numberValue(fields.spousalLife)
        ),

      shortTermDisability:
        Math.max(
          0,
          numberValue(fields.shortTermDisability)
        ),

      vision:
        Math.max(0, numberValue(fields.vision)),

      other:
        Math.max(0, numberValue(fields.other))
    },

    federalExamples: exampleFields.map(
      (fieldPair) => ({
        grossPay:
          Math.max(
            0,
            numberValue(fieldPair.grossPay)
          ),

        federalWithheld:
          Math.max(
            0,
            numberValue(fieldPair.federalWithheld)
          )
      })
    )
  });
}

function renderCalculation() {
  const hours = Math.max(
    0,
    numberValue(hoursInput)
  );

  const result =
    PaycheckCalculatorCore.calculatePaycheck(
      hours,
      settings
    );

  takeHomeOutput.textContent =
    currencyFormatter.format(result.takeHomePay);

  grossPayOutput.textContent =
    currencyFormatter.format(result.grossPay);

  totalDeductionsOutput.textContent =
    currencyFormatter.format(
      result.totalDeductions
    );
}

async function syncSettings() {
  setSyncStatus(
    'Saving shared settings...',
    'working'
  );

  try {
    const response = await fetch(API_URL, {
      method: 'PUT',

      headers: {
        'Content-Type': 'application/json'
      },

      body: JSON.stringify(settings)
    });

    if (!response.ok) {
      throw new Error(
        `Save failed with status ${response.status}`
      );
    }

    setSyncStatus(
      'Settings synced across devices',
      'synced'
    );
  } catch (error) {
    console.warn(
      'Could not sync paycheck settings.',
      error
    );

    setSyncStatus(
      'Saved in this browser; cloud sync unavailable',
      'offline'
    );
  }
}

function scheduleSync() {
  clearTimeout(saveTimer);

  saveTimer = setTimeout(() => {
    void syncSettings();
  }, 600);
}

function settingsChanged() {
  readSettingsForm();
  saveLocalSettings();
  renderCalculation();
  scheduleSync();
}

async function loadSharedSettings() {
  setSyncStatus(
    'Loading shared settings...',
    'working'
  );

  try {
    const response = await fetch(API_URL, {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(
        `Load failed with status ${response.status}`
      );
    }

    const sharedSettings = await response.json();

    settings = normalizeSettings(sharedSettings);

    fillSettingsForm();
    saveLocalSettings();
    renderCalculation();

    setSyncStatus(
      'Settings synced across devices',
      'synced'
    );
  } catch (error) {
    console.warn(
      'Could not load shared paycheck settings.',
      error
    );

    setSyncStatus(
      'Saved in this browser; cloud sync unavailable',
      'offline'
    );
  }
}

hoursInput.addEventListener('input', () => {
  saveLocalSettings();
  renderCalculation();
});

Object.values(fields).forEach((field) => {
  field.addEventListener(
    'input',
    settingsChanged
  );

  field.addEventListener(
    'change',
    settingsChanged
  );
});

exampleFields.forEach((fieldPair) => {
  fieldPair.grossPay.addEventListener(
    'input',
    settingsChanged
  );

  fieldPair.federalWithheld.addEventListener(
    'input',
    settingsChanged
  );
});

fillSettingsForm();
renderCalculation();
void loadSharedSettings();
