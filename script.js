(() => {
  const $ = s => document.querySelector(s);
  const form = $('#bmi-form'), out = $('#results'), errBox = $('#error');

  // ---------- Category definitions ----------
  const WHO = [
    { k: 'under',  max: 18.5, name: 'Underweight',      color: '#4a7fb5' },
    { k: 'normal', max: 25,   name: 'Healthy weight',   color: '#2e9e6b' },
    { k: 'over',   max: 30,   name: 'Overweight',       color: '#d9a21f' },
    { k: 'ob1',    max: 35,   name: 'Obese, class I',   color: '#e2742b' },
    { k: 'ob2',    max: 40,   name: 'Obese, class II',  color: '#cc4a3a' },
    { k: 'ob3',    max: Infinity, name: 'Obese, class III', color: '#9e2b3f' }
  ];
  const ASIA = [
    { k: 'under',  max: 18.5, name: 'Underweight',      color: '#4a7fb5' },
    { k: 'normal', max: 23,   name: 'Healthy weight',   color: '#2e9e6b' },
    { k: 'over',   max: 25,   name: 'Overweight (at risk)', color: '#d9a21f' },
    { k: 'ob1',    max: 30,   name: 'Obese, class I',   color: '#e2742b' },
    { k: 'ob2',    max: Infinity, name: 'Obese, class II', color: '#cc4a3a' }
  ];

  const INFO = {
    under: {
      body: 'Lean build. Your weight is below the range linked to the best health outcomes, so the aim is to add nourishment and muscle, not to lose anything.',
      level: 'Moderate', pips: 2,
      risks: ['Nutrient deficiencies and anaemia', 'Weaker immunity and slower recovery from illness', 'Lower bone density and higher fracture risk', 'Fatigue, hormonal changes and fertility problems'],
      tips: ['Eat 3 meals plus 2 or 3 nutrient-dense snacks: nuts, eggs, dairy, legumes, banana with peanut butter.', 'Add calories with healthy foods such as olive oil, whole grains, avocado and full-fat yoghurt.', 'Do strength training 2 or 3 times a week so the extra weight is muscle.', 'See a doctor to rule out thyroid, digestive or other causes of unexplained low weight.']
    },
    normal: {
      body: 'Balanced build. Your weight sits in the range associated with the lowest risk of weight-related disease.',
      level: 'Low', pips: 1,
      risks: ['Lowest overall risk of weight-related conditions', 'Risk can still rise with inactivity, smoking, poor diet or belly fat, so waist size is worth tracking'],
      tips: ['Fill half your plate with vegetables and fruit, a quarter with protein, a quarter with whole grains.', 'Aim for 150 minutes of moderate activity a week plus 2 strength sessions.', 'Sleep 7 to 9 hours and keep stress in check; both affect weight and appetite.', 'Re-check your weight and waist every few months to catch drift early.']
    },
    over: {
      body: 'Carrying some extra weight. This is the easiest stage to reverse, and small steady changes work well.',
      level: 'Increased', pips: 3,
      risks: ['Higher blood pressure and cholesterol', 'Raised risk of type 2 diabetes', 'Extra strain on knees, hips and back', 'Fatty liver and sleep apnoea'],
      tips: ['Aim for gradual loss of about 0.25 to 0.5 kg a week with a modest daily calorie deficit.', 'Cut sugary drinks and ultra-processed snacks first; this gives the biggest return.', 'Walk 30 minutes or more on most days and add 2 strength sessions weekly.', 'Include protein and fibre at every meal to stay full for longer.']
    },
    ob1: {
      body: 'Significant excess weight. Health risk is now clearly raised, but losing even 5 to 10% of body weight brings measurable benefits.',
      level: 'High', pips: 4,
      risks: ['Type 2 diabetes and insulin resistance', 'High blood pressure and heart disease', 'Fatty liver, gallstones and sleep apnoea', 'Osteoarthritis and reduced mobility'],
      tips: ['Set a first goal of 5 to 10% weight loss; it improves blood pressure, blood sugar and cholesterol.', 'Book a check-up: blood pressure, fasting glucose or HbA1c, lipid profile and liver tests.', 'Build activity slowly with joint-friendly options: walking, swimming, cycling.', 'Consider a dietitian-guided plan and track food for a few weeks to spot easy changes.']
    },
    ob2: {
      body: 'Substantial excess weight. Risk of serious conditions is very high, and medical guidance will make changes safer and more effective.',
      level: 'Very high', pips: 5,
      risks: ['Much higher risk of heart disease and stroke', 'Type 2 diabetes, often hard to control', 'Severe sleep apnoea and breathing difficulty', 'Joint damage, fatty liver and some cancers'],
      tips: ['See a doctor soon for a full metabolic check and a supervised weight plan.', 'Start with low-impact movement for 10 to 15 minutes a few times a day and build up.', 'Work with a dietitian on a sustainable calorie target rather than crash dieting.', 'Ask your doctor about medical or surgical options if lifestyle change alone is not enough.']
    },
    ob3: {
      body: 'Severe excess weight. Risk is extremely high, and professional medical care is the right next step.',
      level: 'Extremely high', pips: 5,
      risks: ['Very high risk of heart failure, stroke and diabetes complications', 'Serious breathing and sleep problems', 'Major strain on joints and reduced mobility', 'Reduced life expectancy if untreated'],
      tips: ['Make an appointment with a doctor now; do not wait for the next routine check.', 'Ask about a specialist weight-management programme, medication and bariatric options.', 'Begin with gentle daily movement such as short walks or chair exercises.', 'Get support from a dietitian, family or a group; steady help matters more than willpower.']
    }
  };

  // ---------- Unit toggle ----------
  function syncUnits() {
    const imp = form.unit.value === 'imperial';
    $('#h-metric').hidden = imp;
    $('#h-imperial').hidden = !imp;
    $('#wt-label').textContent = imp ? 'Weight (lb)' : 'Weight (kg)';
    $('#waist-label').textContent = imp ? 'Waist (in)' : 'Waist (cm)';
    $('#wt').placeholder = imp ? '150' : '68';
    $('#waist').placeholder = imp ? '32' : '80';
  }
  form.querySelectorAll('input[name=unit]').forEach(r => r.addEventListener('change', syncUnits));

  // ---------- Calculation ----------
  const num = id => { const v = parseFloat($(id).value); return isNaN(v) ? null : v; };
  const f1 = n => n.toFixed(1);
  const kgText = (kg, imp) => imp ? `${(kg * 2.20462).toFixed(1)} lb` : `${kg.toFixed(1)} kg`;

  function showError(msg) { errBox.textContent = msg; errBox.hidden = false; out.hidden = true; }

  form.addEventListener('submit', e => {
    e.preventDefault();
    errBox.hidden = true;
    const imp = form.unit.value === 'imperial';

    let hCm, wKg, waistCm = null;
    if (imp) {
      const ft = num('#ft') ?? 0, inch = num('#in') ?? 0;
      hCm = (ft * 12 + inch) * 2.54;
      wKg = num('#wt') !== null ? num('#wt') / 2.20462 : null;
      if (num('#waist') !== null) waistCm = num('#waist') * 2.54;
    } else {
      hCm = num('#cm');
      wKg = num('#wt');
      waistCm = num('#waist');
    }
    const age = num('#age'), sex = $('#sex').value;

    if (!hCm || hCm < 90 || hCm > 250) return showError('Enter a height between 90 and 250 cm (about 3 ft to 8 ft 2 in).');
    if (!wKg || wKg < 20 || wKg > 350) return showError('Enter a weight between 20 and 350 kg (about 44 to 770 lb).');
    if (age !== null && age < 18) return showError('BMI categories on this page are for adults aged 18 and over. For children and teens, a doctor compares BMI with age-based growth charts.');

    render(hCm, wKg, waistCm, age, sex, imp, $('#asian').checked);
  });

  // ---------- Rendering ----------
  function render(hCm, wKg, waistCm, age, sex, imp, asian) {
    const h = hCm / 100;
    const bmi = wKg / (h * h);
    const cats = asian ? ASIA : WHO;
    const cat = cats.find(c => bmi < c.max);
    const info = INFO[cat.k];
    const normal = cats[1];
    const loW = 18.5 * h * h, hiW = (normal.max - 0.1) * h * h;

    // distance to healthy range
    let delta;
    if (wKg > hiW) delta = ['To reach healthy range', `Lose ${kgText(wKg - hiW, imp)}`, `down to ${kgText(hiW, imp)}`];
    else if (wKg < loW) delta = ['To reach healthy range', `Gain ${kgText(loW - wKg, imp)}`, `up to ${kgText(loW, imp)}`];
    else delta = ['Distance from healthy range', 'None', 'You are within it'];

    const stats = [
      ['Healthy weight for your height', `${kgText(loW, imp)} to ${kgText(hiW, imp)}`, `BMI 18.5 to ${f1(normal.max - 0.1)}`],
      delta
    ];

    const inches = hCm / 2.54;
    if (sex && inches > 60) {
      const ideal = (sex === 'm' ? 50 : 45.5) + 2.3 * (inches - 60);
      stats.push(['Ideal weight (Devine formula)', kgText(ideal, imp), 'a rough reference only']);
    }
    if (age !== null && sex) {
      const bf = 1.2 * bmi + 0.23 * age - 10.8 * (sex === 'm' ? 1 : 0) - 5.4;
      stats.push(['Estimated body fat', `${Math.max(bf, 3).toFixed(0)}%`, 'estimated from BMI, age and sex']);
    }
    if (waistCm) {
      const r = waistCm / hCm;
      const lbl = r < 0.5 ? 'Healthy' : r < 0.6 ? 'Raised risk' : 'High risk';
      stats.push(['Waist-to-height ratio', r.toFixed(2), `${lbl} (aim for under 0.50)`]);
    }
    stats.push(['Ponderal index', `${(wKg / (h ** 3)).toFixed(1)} kg/m³`, 'typical adult range 11 to 14']);

    // gauge
    const MIN = 12, MAX = 44;
    const edges = [MIN, ...cats.filter(c => isFinite(c.max)).map(c => c.max), MAX];
    const pct = v => Math.min(100, Math.max(0, (v - MIN) / (MAX - MIN) * 100));
    const segs = cats.map((c, i) => `<i style="width:${pct(edges[i + 1]) - pct(edges[i])}%;background:${c.color}" title="${c.name}"></i>`).join('');
    const ticks = edges.slice(1, -1).map(v => `<span style="left:${pct(v)}%">${v}</span>`).join('');

    const waistNote = waistCm && waistCm / hCm >= 0.5
      ? '<li>Your waist-to-height ratio suggests extra fat around the middle, which carries its own heart and diabetes risk. Walking after meals and cutting refined carbs and sugary drinks target it well.</li>' : '';
    const cut = asian ? 'Asian cut-offs are used because South and East Asian bodies tend to carry more fat at a lower BMI.' : 'Standard WHO adult cut-offs are used.';

    out.innerHTML = `
      <div class="hero">
        <div class="hero-row">
          <div class="bmi-num"><small>Your BMI</small>${f1(bmi)}</div>
          <div><span class="chip" style="background:${cat.color}">${cat.name}</span></div>
        </div>
        <div class="gauge">
          <div class="pin" id="pin"><b>${f1(bmi)}</b></div>
          <div class="bar">${segs}</div>
          <div class="ticks">${ticks}</div>
        </div>
        <p>${info.body}</p>
      </div>

      <div class="stats">${stats.map(s => `<div class="stat"><span>${s[0]}</span><strong>${s[1]}</strong><em>${s[2]}</em></div>`).join('')}</div>

      <div class="cols">
        <div class="block">
          <h2>Risk factors</h2>
          <div class="level"><span class="pips">${[1,2,3,4,5].map(n => `<i style="${n <= info.pips ? `background:${cat.color}` : ''}"></i>`).join('')}</span>${info.level} health risk</div>
          <ul>${info.risks.map(r => `<li>${r}</li>`).join('')}</ul>
        </div>
        <div class="block">
          <h2>How to improve</h2>
          <ul>${info.tips.map(t => `<li>${t}</li>`).join('')}${waistNote}</ul>
        </div>
      </div>

      <p class="note">${cut} BMI does not separate muscle from fat, so athletes and very muscular people may read high, and older adults who have lost muscle may read lower than their real body fat. This tool is informational and not a diagnosis; talk to a doctor before making major changes.</p>`;

    out.hidden = false;
    const pin = $('#pin');
    requestAnimationFrame(() => requestAnimationFrame(() => { pin.style.left = pct(bmi) + '%'; }));
    if (window.matchMedia('(max-width:820px)').matches) out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  syncUnits();
})();
