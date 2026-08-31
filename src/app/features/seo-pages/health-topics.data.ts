/**
 * Content source for the /health-topics pages.
 *
 * Deliberately a short, hand-written list rather than a generator. Thin
 * programmatically-expanded symptom pages are a well-known spam pattern and are
 * especially damaging in the health (YMYL) category — so a topic only belongs
 * here once there is enough genuinely useful, non-repetitive content to justify
 * its own URL.
 *
 * Every topic is general health information framed around a single practical
 * question: is this urgent, and who should I see? Nothing here diagnoses,
 * prescribes, or recommends a medicine or dose.
 */

export interface TopicSection {
  heading: string;
  /** Paragraphs rendered before the list, if any. */
  paragraphs?: string[];
  /** Rendered as <ul> unless `ordered` is set. */
  items?: string[];
  ordered?: boolean;
}

export interface HealthTopic {
  /** URL segment under /health-topics/. */
  slug: string;
  /** Page H1. */
  heading: string;
  /** Short human label for lists and breadcrumbs. */
  label: string;
  /** <title> for the route. */
  title: string;
  /** Meta description for the route. */
  description: string;
  /** Intro paragraph under the H1. */
  lede: string;
  /** Red-flag list — always rendered first, before any other content. */
  redFlags: string[];
  sections: TopicSection[];
  /** Which specialities commonly handle this, in plain language. */
  specialists: string[];
  /** Questions worth raising in a consultation. */
  askYourDoctor: string[];
  /** Slugs of related topics, for internal linking. */
  related: string[];
}

const EMERGENCY_NOTE =
  'This list is not exhaustive. Anything sudden, severe, or rapidly worsening needs immediate medical attention regardless of what any website says.';

export const HEALTH_TOPICS: HealthTopic[] = [
  {
    slug: 'headache',
    label: 'Headache',
    heading: 'Headache: causes, warning signs, and which doctor to see',
    title: 'Headache — Causes, Red Flags & Which Doctor | DoctoGuide',
    description:
      'Understand common headache patterns, the warning signs that need urgent care, and which specialist treats which kind of headache. Free AI guidance from DoctoGuide.',
    lede: 'Most headaches are not dangerous. A small number are, and they tend to announce themselves in recognisable ways. This page covers the difference and what to do about it.',
    redFlags: [
      'The worst headache of your life, arriving suddenly and peaking within seconds or a minute.',
      'Headache with fever and a stiff neck, or with a rash that does not fade under pressure.',
      'Headache with confusion, drowsiness, a seizure, or difficulty staying awake.',
      'Headache with weakness or numbness on one side, drooping face, or trouble speaking or seeing.',
      'Headache that began after a head injury, especially with vomiting or drowsiness.',
      'A new headache pattern if you are over 50, pregnant, recently pregnant, or immunocompromised.',
      'Headache that is consistently worse when lying down, coughing, or straining.',
      'Headache with scalp tenderness or jaw pain while chewing, in someone over 50.',
    ],
    sections: [
      {
        heading: 'What commonly causes a headache',
        paragraphs: [
          'The large majority of headaches are what clinicians call primary headaches — the headache is the condition itself, not a symptom of something else. The rest are secondary: a sign of something separate, ranging from dehydration to infection.',
        ],
        items: [
          'Tension-type headache — the most common kind. Usually both sides, a dull tightening or pressure, not made worse by activity.',
          'Migraine — often one side, throbbing, moderate to severe, frequently with nausea and sensitivity to light or sound. Movement typically makes it worse.',
          'Cluster headache — rare, severe, strictly one-sided around the eye, often with a watering eye or blocked nostril on the same side, in bouts.',
          'Medication-overuse headache — a headache that develops from frequent, long-term use of pain relief for headaches.',
          'Everyday triggers — poor sleep, skipped meals, dehydration, alcohol, caffeine withdrawal, eye strain, stress.',
          'Secondary causes — sinus infection, raised blood pressure, fever and viral illness, and less commonly conditions affecting the brain or its blood vessels.',
        ],
      },
      {
        heading: 'Patterns worth noticing',
        paragraphs: [
          'What helps a clinician most is not the pain score but the pattern. Before a consultation, try to answer: how quickly did it come on, where exactly is it, what does it feel like, how long does it last, what makes it better or worse, and what comes with it.',
        ],
        items: [
          'Sudden versus gradual onset — a headache that peaks almost instantly is treated very differently from one that builds over hours.',
          'New versus familiar — a headache unlike any you have had before deserves more attention than a familiar one.',
          'Frequency over time — headaches becoming more frequent or more severe over weeks is a pattern worth reporting.',
          'Time of day — headaches consistently present on waking, or that wake you from sleep, are worth mentioning specifically.',
        ],
      },
      {
        heading: 'When to see a doctor, without urgency',
        items: [
          'Headaches that recur often enough to interfere with work, study, or sleep.',
          'Headaches needing pain relief more than a couple of days a week.',
          'A clear change in your usual pattern, frequency, or severity.',
          'Headaches alongside new vision changes, even mild ones.',
          'Headaches during pregnancy, which are worth discussing rather than self-managing.',
        ],
      },
    ],
    specialists: [
      'General physician or family doctor — the right starting point for almost all headaches.',
      'Neurologist — for migraine that is not responding, cluster headache, or any headache with neurological symptoms.',
      'Ophthalmologist — where vision problems or eye strain seem to be driving it.',
      'ENT specialist — where sinus symptoms dominate.',
      'Emergency department — for any red flag above.',
    ],
    askYourDoctor: [
      'Does my pattern fit a primary headache, or should something else be ruled out?',
      'Do I need any imaging or tests, and if not, why not?',
      'How often is it safe to take the pain relief I am using?',
      'Could any medicine I already take be contributing?',
      'What change in my symptoms should bring me back sooner?',
    ],
    related: ['fever', 'stomach-pain'],
  },

  {
    slug: 'fever',
    label: 'Fever',
    heading: 'Fever: what it means, when to worry, and who to see',
    title: 'Fever — When to Worry & Which Doctor to See | DoctoGuide',
    description:
      'What a fever actually indicates, the warning signs that need urgent care in adults and children, and which doctor to see. Free AI health guidance from DoctoGuide.',
    lede: 'Fever is a response, not a disease. It tells you the body is fighting something — it does not tell you what. The useful questions are how high, how long, and what else is happening.',
    redFlags: [
      'Fever with a stiff neck, severe headache, or a rash that does not fade when pressed.',
      'Fever with difficulty breathing, chest pain, or rapid breathing.',
      'Fever with confusion, unusual drowsiness, or difficulty waking.',
      'Fever with a seizure.',
      'Any fever in an infant under three months old.',
      'A child who is floppy, unusually drowsy, refusing fluids, or has no wet nappies.',
      'Fever with severe abdominal pain, or vomiting that prevents keeping fluids down.',
      'Fever in someone on chemotherapy, immunosuppressants, or with a known immune condition.',
      'Fever that persists beyond about five days, or returns after settling.',
    ],
    sections: [
      {
        heading: 'What a fever is',
        paragraphs: [
          'A fever is a raised body temperature, generally taken as 38°C (100.4°F) or above. It is part of the immune response — most often to a viral or bacterial infection, but sometimes to inflammation, medication, or other causes.',
          'The height of a fever is a weaker guide than people expect. A high temperature in an otherwise alert person is often less concerning than a modest one in someone who is drowsy, breathless, or not drinking. How the person looks and behaves matters more than the number.',
        ],
      },
      {
        heading: 'Common causes',
        items: [
          'Viral infections — the most frequent cause by a wide margin, including colds, flu, and gastrointestinal infections.',
          'Bacterial infections — throat, ear, chest, urinary tract, or skin.',
          'Mosquito-borne illness — in India, dengue, malaria, and chikungunya are important considerations, especially seasonally or after travel.',
          'Typhoid and other food- or water-borne infections.',
          'Post-vaccination fever — usually mild and short-lived.',
          'Non-infectious causes — inflammatory conditions and some medicines.',
        ],
      },
      {
        heading: 'What to tell a doctor',
        items: [
          'How many days the fever has lasted, and whether it comes and goes.',
          'The highest reading you have measured and how you measured it.',
          'Everything accompanying it — rash, cough, urinary symptoms, diarrhoea, joint pain, headache.',
          'Recent travel, mosquito exposure, or contact with anyone unwell.',
          'Any medicines taken, including anything already used to bring the fever down.',
          'Existing conditions, pregnancy, and immune status.',
        ],
      },
      {
        heading: 'Staying safe while it runs its course',
        paragraphs: [
          'For a fever without red flags, the general principles are rest, steady fluids, and monitoring. Do not start or change any prescription medicine on your own, and do not use leftover antibiotics — most fevers are viral, where antibiotics do nothing and cause harm.',
        ],
      },
    ],
    specialists: [
      'General physician or family doctor — the right first stop for most fevers.',
      'Paediatrician — for any child, and urgently for infants.',
      'Infectious disease specialist — for prolonged, recurring, or unexplained fever.',
      'Emergency department — for any red flag above.',
    ],
    askYourDoctor: [
      'Do my symptoms suggest a viral or bacterial cause, and how would we tell?',
      'Do I need blood tests, and which ones — particularly for dengue, malaria, or typhoid?',
      'What temperature or symptom should bring me back immediately?',
      'How long is it reasonable for this fever to last before it needs review?',
      'Are any of my regular medicines affected while I have a fever?',
    ],
    related: ['cough', 'headache'],
  },

  {
    slug: 'cough',
    label: 'Cough',
    heading: 'Cough: how long is too long, and which doctor to see',
    title: 'Cough — Causes, Warning Signs & Which Doctor | DoctoGuide',
    description:
      'Why a cough lasts, which coughs need urgent care, what a three-week cough means, and which specialist to see. Free AI health guidance from DoctoGuide.',
    lede: 'A cough is a protective reflex, and after an infection it often outlasts the illness by weeks. Duration and what comes with it are what separate an ordinary cough from one that needs looking at.',
    redFlags: [
      'Coughing up blood, in any amount.',
      'Difficulty breathing, breathlessness at rest, or the sense of not getting enough air.',
      'Chest pain with breathing or coughing.',
      'Blue or grey lips or fingertips.',
      'Noisy, high-pitched breathing that came on suddenly, or any suspicion of an inhaled object.',
      'Cough with high fever and shaking chills.',
      'Unexplained weight loss, drenching night sweats, or a cough lasting more than three weeks.',
      'In an infant: rapid breathing, chest drawing in with each breath, or difficulty feeding.',
    ],
    sections: [
      {
        heading: 'Why length matters',
        paragraphs: [
          'Clinicians group coughs roughly by duration, because that changes what is likely. Acute means under three weeks and is usually infection. Subacute, three to eight weeks, is often the tail of an infection that has already resolved. Chronic, beyond eight weeks, usually has a different explanation and needs proper assessment.',
          'In India specifically, a cough lasting more than two to three weeks is a standard prompt to be assessed for tuberculosis. That is a routine, sensible check rather than cause for alarm.',
        ],
      },
      {
        heading: 'Common causes',
        items: [
          'Viral respiratory infection — the usual cause of a short-lived cough.',
          'Post-infectious cough — a dry cough persisting for weeks after the infection has cleared.',
          'Asthma — often dry, worse at night, after exercise, or in cold air.',
          'Post-nasal drip from allergy or sinus problems — a persistent need to clear the throat.',
          'Acid reflux — cough worse when lying down or after meals, often without heartburn.',
          'Smoking and air pollution — significant everyday contributors.',
          'Medication side effect — some blood pressure medicines cause a persistent dry cough.',
          'Tuberculosis — an important consideration for any cough beyond two to three weeks.',
        ],
      },
      {
        heading: 'What to notice before a consultation',
        items: [
          'How long it has lasted, as precisely as you can.',
          'Dry or productive, and if productive, what the sputum looks like.',
          'When it is worst — night, morning, after eating, on exertion, in cold air.',
          'What comes with it — fever, weight loss, night sweats, wheeze, heartburn, blocked nose.',
          'Smoking history, occupational dust or fume exposure, and any recent contact with someone who has TB.',
          'Every medicine you take, including recently started ones.',
        ],
      },
    ],
    specialists: [
      'General physician or family doctor — the right first stop for most coughs.',
      'Pulmonologist or chest physician — for a chronic cough, suspected asthma, or suspected TB.',
      'ENT specialist — where post-nasal drip or throat symptoms dominate.',
      'Gastroenterologist — where reflux appears to be the driver.',
      'Paediatrician — for any child, especially with breathing difficulty.',
      'Emergency department — for any red flag above.',
    ],
    askYourDoctor: [
      'Given how long this has lasted, do I need a chest X-ray or a TB test?',
      'Could any medicine I take be causing this cough?',
      'Might this be asthma or reflux rather than an infection?',
      'Do I actually need an antibiotic, or would it make no difference here?',
      'How long should I expect this to take to settle, and when should I come back?',
    ],
    related: ['fever', 'headache'],
  },

  {
    slug: 'stomach-pain',
    label: 'Stomach pain',
    heading: 'Stomach pain: where it hurts, what it suggests, and who to see',
    title: 'Stomach Pain — Causes, Red Flags & Which Doctor | DoctoGuide',
    description:
      'What the location and character of abdominal pain suggest, the warning signs needing urgent care, and which specialist to see. Free guidance from DoctoGuide.',
    lede: 'Abdominal pain covers everything from indigestion to a surgical emergency. Where it is, how it started, and what comes with it carry most of the information.',
    redFlags: [
      'Sudden, severe pain that came on within minutes.',
      'Pain with a rigid, board-like abdomen, or pain so severe you cannot move or stand straight.',
      'Pain starting near the navel and settling in the lower right, especially with fever and nausea.',
      'Vomiting blood, or vomit that looks like coffee grounds.',
      'Black tarry stools, or visible blood in the stool.',
      'Pain with a high fever and shaking chills.',
      'Inability to pass stool or gas, with a swollen abdomen and vomiting.',
      'Pain in anyone who is or could be pregnant, particularly with bleeding or shoulder-tip pain.',
      'Abdominal pain with chest pain, breathlessness, or sweating — this can be cardiac.',
      'Pain following an injury to the abdomen.',
    ],
    sections: [
      {
        heading: 'What location suggests',
        paragraphs: [
          'Location narrows the field considerably, though it never settles the question on its own. These are common associations, not conclusions.',
        ],
        items: [
          'Upper middle — acidity, gastritis, ulcers, and sometimes the pancreas. Cardiac pain can also present here.',
          'Upper right — gallbladder and liver.',
          'Upper left — stomach, spleen, and occasionally the pancreas.',
          'Around the navel — early appendicitis, small bowel problems, or non-specific pain.',
          'Lower right — appendicitis, and in women, ovarian causes.',
          'Lower left — large bowel conditions such as diverticulitis, and constipation.',
          'Lower middle — bladder, urinary infection, uterus, and menstrual causes.',
          'Pain spreading to the back — pancreas, kidney stones, or, rarely, a serious vascular problem.',
        ],
      },
      {
        heading: 'Common causes',
        items: [
          'Indigestion, acidity, and gastritis.',
          'Gastroenteritis — infection with diarrhoea and vomiting.',
          'Constipation, which can cause pain out of proportion to how minor it sounds.',
          'Irritable bowel syndrome — a recurring pattern tied to bowel habit, usually diagnosed after other causes are excluded.',
          'Urinary tract infection and kidney stones.',
          'Gallstones, typically after fatty meals.',
          'Menstrual pain, ovulation pain, and other gynaecological causes.',
          'Food intolerance, including lactose intolerance.',
        ],
      },
      {
        heading: 'What to notice before a consultation',
        items: [
          'Exactly where it hurts, and whether it moved from somewhere else.',
          'How it started — sudden or gradual — and how long it has lasted.',
          'What it feels like — cramping, burning, stabbing, dull ache — and whether it comes in waves.',
          'What makes it better or worse: eating, an empty stomach, passing stool, movement, position.',
          'What accompanies it — fever, vomiting, diarrhoea, constipation, urinary symptoms, bleeding.',
          'For anyone menstruating: the date of the last period, and whether pregnancy is possible.',
        ],
      },
      {
        heading: 'What not to do while waiting',
        paragraphs: [
          'Avoid strong painkillers before being assessed for severe abdominal pain — they can mask the very signs a clinician needs to feel. Anti-inflammatory painkillers can worsen gastritis and ulcers. If the pain is severe, do not eat or drink until you have been seen, in case a procedure is needed.',
        ],
      },
    ],
    specialists: [
      'General physician or family doctor — the right first stop for most abdominal pain.',
      'Gastroenterologist — for persistent or recurring digestive symptoms.',
      'General surgeon — where appendicitis, gallstones, or an obstruction is suspected.',
      'Gynaecologist — for lower abdominal pain related to periods, pregnancy, or ovarian causes.',
      'Urologist — for suspected stones or urinary causes.',
      'Emergency department — for any red flag above.',
    ],
    askYourDoctor: [
      'Does where and how this hurts point to anything specific?',
      'Do I need blood tests, a scan, or an ultrasound?',
      'Could this be related to a medicine I am taking?',
      'What should I eat or avoid until this settles?',
      'What change would mean I should come back immediately?',
    ],
    related: ['fever', 'headache'],
  },
];

export const EMERGENCY_DISCLAIMER = EMERGENCY_NOTE;

export function findTopic(slug: string | null): HealthTopic | undefined {
  return HEALTH_TOPICS.find((t) => t.slug === slug);
}
