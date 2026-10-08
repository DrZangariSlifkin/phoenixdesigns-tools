const ACTIVITY_STATE_KEY = 'activity-picker-state';
const PAYCHECK_SETTINGS_KEY = 'paycheck-calculator-settings';

const DEFAULT_ACTIVITIES = [
  { id: 'ps5', name: 'Play PS5' },
  { id: 'read', name: 'Read' },
  { id: 'paint', name: 'Paint' },
  { id: 'computer', name: 'Computer stuff' }
];

const DEFAULT_PAYCHECK_SETTINGS = {
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
    {
      grossPay: 1976.06,
      federalWithheld: 153.40
    },
    {
      grossPay: 1751.06,
      federalWithheld: 126.67
    },
    {
      grossPay: 1488.40,
      federalWithheld: 95.47
    }
  ]
};

function defaultState() {
  return {
    activities: DEFAULT_ACTIVITIES,
    remainingIds: DEFAULT_ACTIVITIES.map(
      (activity) => activity.id
    ),
    currentId: null,
    lastPickedId: null
  };
}

function defaultPaycheckSettings() {
  return structuredClone(DEFAULT_PAYCHECK_SETTINGS);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,

    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function validateState(value) {
  if (
    !value ||
    !Array.isArray(value.activities) ||
    !Array.isArray(value.remainingIds)
  ) {
    return null;
  }

  if (value.activities.length > 100) {
    return null;
  }

  const activities = [];
  const ids = new Set();

  for (const item of value.activities) {
    if (
      typeof item?.id !== 'string' ||
      typeof item?.name !== 'string'
    ) {
      return null;
    }

    const id = item.id.trim();
    const name = item.name.trim();

    if (
      !id ||
      id.length > 100 ||
      !name ||
      name.length > 80 ||
      ids.has(id)
    ) {
      return null;
    }

    ids.add(id);
    activities.push({ id, name });
  }

  const remainingIds = value.remainingIds.filter(
    (id, index, all) =>
      typeof id === 'string' &&
      ids.has(id) &&
      all.indexOf(id) === index
  );

  const currentId = ids.has(value.currentId)
    ? value.currentId
    : null;

  const lastPickedId = ids.has(value.lastPickedId)
    ? value.lastPickedId
    : null;

  return {
    activities,
    remainingIds,
    currentId,
    lastPickedId
  };
}

function validNumber(
  value,
  minimum = -1000000,
  maximum = 1000000
) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function validatePaycheckSettings(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const contributionTypes = new Set([
    'Percent',
    'Fixed'
  ]);

  if (
    !contributionTypes.has(
      value.traditional401kType
    ) ||
    !contributionTypes.has(value.roth401kType)
  ) {
    return null;
  }

  if (
    !validNumber(value.hourlyRate, 0, 10000) ||
    !validNumber(
      value.otherTaxablePay,
      -100000,
      100000
    ) ||
    !validNumber(
      value.traditional401kValue,
      0,
      100000
    ) ||
    !validNumber(
      value.roth401kValue,
      0,
      100000
    ) ||
    !validNumber(
      value.federalAdjustment,
      -100000,
      100000
    ) ||
    !validNumber(value.paIncomeTaxRate, 0, 1) ||
    !validNumber(value.localIncomeTaxRate, 0, 1) ||
    !validNumber(value.paUnemploymentRate, 0, 1) ||
    !validNumber(value.socialSecurityRate, 0, 1) ||
    !validNumber(value.medicareRate, 0, 1)
  ) {
    return null;
  }

  const deductionKeys = [
    'medical',
    'add',
    'childLife',
    'dental',
    'employeeLife',
    'longTermDisability',
    'localServicesTax',
    'spousalLife',
    'shortTermDisability',
    'vision',
    'other'
  ];

  if (
    !value.deductions ||
    typeof value.deductions !== 'object'
  ) {
    return null;
  }

  const deductions = {};

  for (const key of deductionKeys) {
    const amount = value.deductions[key];

    if (!validNumber(amount, 0, 100000)) {
      return null;
    }

    deductions[key] = amount;
  }

  if (
    !Array.isArray(value.federalExamples) ||
    value.federalExamples.length < 2 ||
    value.federalExamples.length > 10
  ) {
    return null;
  }

  const federalExamples = [];

  for (const example of value.federalExamples) {
    if (
      !example ||
      !validNumber(example.grossPay, 0, 1000000) ||
      !validNumber(
        example.federalWithheld,
        0,
        1000000
      )
    ) {
      return null;
    }

    federalExamples.push({
      grossPay: example.grossPay,
      federalWithheld: example.federalWithheld
    });
  }

  return {
    hourlyRate: value.hourlyRate,
    otherTaxablePay: value.otherTaxablePay,

    traditional401kType:
      value.traditional401kType,
    traditional401kValue:
      value.traditional401kValue,

    roth401kType: value.roth401kType,
    roth401kValue: value.roth401kValue,

    federalAdjustment: value.federalAdjustment,
    paIncomeTaxRate: value.paIncomeTaxRate,
    localIncomeTaxRate: value.localIncomeTaxRate,
    paUnemploymentRate:
      value.paUnemploymentRate,
    socialSecurityRate: value.socialSecurityRate,
    medicareRate: value.medicareRate,

    deductions,
    federalExamples
  };
}

async function readJsonBody(request) {
  const contentLength = Number(
    request.headers.get('Content-Length') || 0
  );

  if (contentLength > 50000) {
    return {
      error: json(
        { error: 'Request is too large.' },
        413
      )
    };
  }

  try {
    return {
      body: await request.json()
    };
  } catch {
    return {
      error: json(
        { error: 'Request body must be JSON.' },
        400
      )
    };
  }
}

async function handleActivityPicker(request, env) {
  if (request.method === 'GET') {
    const state = await env.ACTIVITY_PICKER.get(
      ACTIVITY_STATE_KEY,
      'json'
    );

    return json(validateState(state) || defaultState());
  }

  if (request.method === 'PUT') {
    const parsed = await readJsonBody(request);

    if (parsed.error) {
      return parsed.error;
    }

    const state = validateState(parsed.body);

    if (!state) {
      return json(
        { error: 'Activity data is invalid.' },
        400
      );
    }

    await env.ACTIVITY_PICKER.put(
      ACTIVITY_STATE_KEY,
      JSON.stringify(state)
    );

    return json(state);
  }

  return new Response('Method not allowed', {
    status: 405,
    headers: {
      Allow: 'GET, PUT'
    }
  });
}

async function handlePaycheckCalculator(request, env) {
  if (request.method === 'GET') {
    const settings = await env.ACTIVITY_PICKER.get(
      PAYCHECK_SETTINGS_KEY,
      'json'
    );

    return json(
      validatePaycheckSettings(settings) ||
        defaultPaycheckSettings()
    );
  }

  if (request.method === 'PUT') {
    const parsed = await readJsonBody(request);

    if (parsed.error) {
      return parsed.error;
    }

    const settings =
      validatePaycheckSettings(parsed.body);

    if (!settings) {
      return json(
        { error: 'Paycheck settings are invalid.' },
        400
      );
    }

    await env.ACTIVITY_PICKER.put(
      PAYCHECK_SETTINGS_KEY,
      JSON.stringify(settings)
    );

    return json(settings);
  }

  return new Response('Method not allowed', {
    status: 405,
    headers: {
      Allow: 'GET, PUT'
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/activity-picker') {
      return handleActivityPicker(request, env);
    }

    if (url.pathname === '/api/paycheck-calculator') {
      return handlePaycheckCalculator(request, env);
    }

    return new Response('Not found', {
      status: 404
    });
  }
};

export {
  defaultState,
  defaultPaycheckSettings,
  validateState,
  validatePaycheckSettings
};
