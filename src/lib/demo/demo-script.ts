/**
 * Clockwork Canvas Demo Script
 * 
 * 13 monster entities flow through the Business Model Canvas.
 * Interleaved timing creates a "living" canvas with entities at different stages.
 */

export interface DemoEvent {
  delay: number;
  endpoint: string;
  payload: Record<string, unknown>;
  description: string;
}

// All 13 monsters with their journeys
const MONSTERS = [
  { name: 'Werewolf', email: 'werewolf@monsters.io', emoji: '🐺' },
  { name: 'Zombie', email: 'zombie@monsters.io', emoji: '🧟' },
  { name: 'Skeleton', email: 'skeleton@monsters.io', emoji: '💀' },
  { name: 'Goblin', email: 'goblin@monsters.io', emoji: '👹' },
  { name: 'Vampire', email: 'vampire@monsters.io', emoji: '🧛' },
  { name: 'Mummy', email: 'mummy@monsters.io', emoji: '🧌' },
  { name: 'Ghost', email: 'ghost@monsters.io', emoji: '👻' },
  { name: 'Witch', email: 'witch@monsters.io', emoji: '🧙' },
  { name: 'Dracula', email: 'dracula@monsters.io', emoji: '🦇' },
  { name: 'Frankenstein', email: 'frankenstein@monsters.io', emoji: '🧟‍♂️' },
  { name: 'Banshee', email: 'banshee@monsters.io', emoji: '👺' },
  { name: 'Phantom', email: 'phantom@monsters.io', emoji: '🎭' },
  { name: 'Kraken', email: 'kraken@monsters.io', emoji: '🦑' },
];

// Marketing sources
const MARKETING = [
  { endpoint: '/api/webhooks/clockwork/linkedin-lead', action: 'clicked LinkedIn Ad' },
  { endpoint: '/api/webhooks/clockwork/youtube-signup', action: 'subscribed from YouTube' },
  { endpoint: '/api/webhooks/clockwork/seo-form', action: 'found us via Google' },
];

// Subscription plans
const PLANS = [
  { endpoint: '/api/webhooks/clockwork/stripe-subscription-basic', plan: 'Basic', amount: '$29/mo' },
  { endpoint: '/api/webhooks/clockwork/stripe-subscription-pro', plan: 'Pro', amount: '$99/mo' },
  { endpoint: '/api/webhooks/clockwork/stripe-subscription-enterprise', plan: 'Enterprise', amount: '$499/mo' },
];

export const CLOCKWORK_DEMO_SCRIPT: DemoEvent[] = [];

// Build interleaved script - entities arrive and progress at different rates
// This creates a "living" canvas where you see entities at all stages

const TICK = 2500; // 2.5 seconds between events
let t = 0;

// Wave 1: First 3 arrive quickly
[0, 1, 2].forEach((i) => {
  const m = MONSTERS[i];
  const src = MARKETING[i % 3];
  CLOCKWORK_DEMO_SCRIPT.push({
    delay: t,
    endpoint: src.endpoint,
    payload: { name: m.name, email: m.email },
    description: `${m.emoji} ${m.name} ${src.action}`,
  });
  t += TICK;
});

// First entity books demo while others arrive
CLOCKWORK_DEMO_SCRIPT.push({
  delay: t,
  endpoint: '/api/webhooks/clockwork/calendly-demo',
  payload: { name: MONSTERS[0].name, email: MONSTERS[0].email },
  description: `${MONSTERS[0].emoji} ${MONSTERS[0].name} booked a demo call`,
});
t += TICK;

// Wave 2: More arrivals
[3, 4, 5].forEach((i) => {
  const m = MONSTERS[i];
  const src = MARKETING[i % 3];
  CLOCKWORK_DEMO_SCRIPT.push({
    delay: t,
    endpoint: src.endpoint,
    payload: { name: m.name, email: m.email },
    description: `${m.emoji} ${m.name} ${src.action}`,
  });
  t += TICK;
});

// Second entity books demo
CLOCKWORK_DEMO_SCRIPT.push({
  delay: t,
  endpoint: '/api/webhooks/clockwork/calendly-demo',
  payload: { name: MONSTERS[1].name, email: MONSTERS[1].email },
  description: `${MONSTERS[1].emoji} ${MONSTERS[1].name} booked a demo call`,
});
t += TICK;

// First entity starts trial!
CLOCKWORK_DEMO_SCRIPT.push({
  delay: t,
  endpoint: '/api/webhooks/clockwork/stripe-trial',
  payload: { name: MONSTERS[0].name, email: MONSTERS[0].email },
  description: `${MONSTERS[0].emoji} ${MONSTERS[0].name} started free trial`,
});
t += TICK;

// Wave 3: More arrivals
[6, 7].forEach((i) => {
  const m = MONSTERS[i];
  const src = MARKETING[i % 3];
  CLOCKWORK_DEMO_SCRIPT.push({
    delay: t,
    endpoint: src.endpoint,
    payload: { name: m.name, email: m.email },
    description: `${m.emoji} ${m.name} ${src.action}`,
  });
  t += TICK;
});

// Third entity books demo
CLOCKWORK_DEMO_SCRIPT.push({
  delay: t,
  endpoint: '/api/webhooks/clockwork/calendly-demo',
  payload: { name: MONSTERS[2].name, email: MONSTERS[2].email },
  description: `${MONSTERS[2].emoji} ${MONSTERS[2].name} booked a demo call`,
});
t += TICK;

// Second entity starts trial
CLOCKWORK_DEMO_SCRIPT.push({
  delay: t,
  endpoint: '/api/webhooks/clockwork/stripe-trial',
  payload: { name: MONSTERS[1].name, email: MONSTERS[1].email },
  description: `${MONSTERS[1].emoji} ${MONSTERS[1].name} started free trial`,
});
t += TICK;

// FIRST CONVERSION! 🎉
const plan0 = PLANS[1]; // Pro
CLOCKWORK_DEMO_SCRIPT.push({
  delay: t,
  endpoint: plan0.endpoint,
  payload: { name: MONSTERS[0].name, email: MONSTERS[0].email, plan: plan0.plan.toLowerCase() },
  description: `${MONSTERS[0].emoji} ${MONSTERS[0].name} purchased ${plan0.plan} (${plan0.amount})`,
});
t += TICK;

// More arrivals
[8, 9].forEach((i) => {
  const m = MONSTERS[i];
  const src = MARKETING[i % 3];
  CLOCKWORK_DEMO_SCRIPT.push({
    delay: t,
    endpoint: src.endpoint,
    payload: { name: m.name, email: m.email },
    description: `${m.emoji} ${m.name} ${src.action}`,
  });
  t += TICK;
});

// Fourth and fifth book demos
[3, 4].forEach((i) => {
  CLOCKWORK_DEMO_SCRIPT.push({
    delay: t,
    endpoint: '/api/webhooks/clockwork/calendly-demo',
    payload: { name: MONSTERS[i].name, email: MONSTERS[i].email },
    description: `${MONSTERS[i].emoji} ${MONSTERS[i].name} booked a demo call`,
  });
  t += TICK;
});

// Third starts trial
CLOCKWORK_DEMO_SCRIPT.push({
  delay: t,
  endpoint: '/api/webhooks/clockwork/stripe-trial',
  payload: { name: MONSTERS[2].name, email: MONSTERS[2].email },
  description: `${MONSTERS[2].emoji} ${MONSTERS[2].name} started free trial`,
});
t += TICK;

// Second conversion
const plan1 = PLANS[0]; // Basic
CLOCKWORK_DEMO_SCRIPT.push({
  delay: t,
  endpoint: plan1.endpoint,
  payload: { name: MONSTERS[1].name, email: MONSTERS[1].email, plan: plan1.plan.toLowerCase() },
  description: `${MONSTERS[1].emoji} ${MONSTERS[1].name} purchased ${plan1.plan} (${plan1.amount})`,
});
t += TICK;

// Last arrivals
[10, 11, 12].forEach((i) => {
  const m = MONSTERS[i];
  const src = MARKETING[i % 3];
  CLOCKWORK_DEMO_SCRIPT.push({
    delay: t,
    endpoint: src.endpoint,
    payload: { name: m.name, email: m.email },
    description: `${m.emoji} ${m.name} ${src.action}`,
  });
  t += TICK;
});

// More demos booked
[5, 6].forEach((i) => {
  CLOCKWORK_DEMO_SCRIPT.push({
    delay: t,
    endpoint: '/api/webhooks/clockwork/calendly-demo',
    payload: { name: MONSTERS[i].name, email: MONSTERS[i].email },
    description: `${MONSTERS[i].emoji} ${MONSTERS[i].name} booked a demo call`,
  });
  t += TICK;
});

// More trials
[3, 4].forEach((i) => {
  CLOCKWORK_DEMO_SCRIPT.push({
    delay: t,
    endpoint: '/api/webhooks/clockwork/stripe-trial',
    payload: { name: MONSTERS[i].name, email: MONSTERS[i].email },
    description: `${MONSTERS[i].emoji} ${MONSTERS[i].name} started free trial`,
  });
  t += TICK;
});

// Third conversion - Enterprise!
const plan2 = PLANS[2];
CLOCKWORK_DEMO_SCRIPT.push({
  delay: t,
  endpoint: plan2.endpoint,
  payload: { name: MONSTERS[2].name, email: MONSTERS[2].email, plan: plan2.plan.toLowerCase() },
  description: `${MONSTERS[2].emoji} ${MONSTERS[2].name} purchased ${plan2.plan} (${plan2.amount})`,
});
t += TICK;

// More demos
[7, 8].forEach((i) => {
  CLOCKWORK_DEMO_SCRIPT.push({
    delay: t,
    endpoint: '/api/webhooks/clockwork/calendly-demo',
    payload: { name: MONSTERS[i].name, email: MONSTERS[i].email },
    description: `${MONSTERS[i].emoji} ${MONSTERS[i].name} booked a demo call`,
  });
  t += TICK;
});

// More trials
[5, 6].forEach((i) => {
  CLOCKWORK_DEMO_SCRIPT.push({
    delay: t,
    endpoint: '/api/webhooks/clockwork/stripe-trial',
    payload: { name: MONSTERS[i].name, email: MONSTERS[i].email },
    description: `${MONSTERS[i].emoji} ${MONSTERS[i].name} started free trial`,
  });
  t += TICK;
});

// Fourth conversion
const plan3 = PLANS[1];
CLOCKWORK_DEMO_SCRIPT.push({
  delay: t,
  endpoint: plan3.endpoint,
  payload: { name: MONSTERS[3].name, email: MONSTERS[3].email, plan: plan3.plan.toLowerCase() },
  description: `${MONSTERS[3].emoji} ${MONSTERS[3].name} purchased ${plan3.plan} (${plan3.amount})`,
});
t += TICK;

// Fifth conversion
const plan4 = PLANS[0];
CLOCKWORK_DEMO_SCRIPT.push({
  delay: t,
  endpoint: plan4.endpoint,
  payload: { name: MONSTERS[4].name, email: MONSTERS[4].email, plan: plan4.plan.toLowerCase() },
  description: `${MONSTERS[4].emoji} ${MONSTERS[4].name} purchased ${plan4.plan} (${plan4.amount})`,
});

export function getDemoScriptDuration(): number {
  if (CLOCKWORK_DEMO_SCRIPT.length === 0) return 0;
  return Math.max(...CLOCKWORK_DEMO_SCRIPT.map(e => e.delay)) + 10000;
}

export function getDemoScriptEventCount(): number {
  return CLOCKWORK_DEMO_SCRIPT.length;
}
