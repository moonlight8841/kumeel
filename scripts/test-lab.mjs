import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const lab = await server.ssrLoadModule('/src/lib/assumption-lab.ts')
  const { render } = await server.ssrLoadModule('/src/entry-server.tsx')
  const { initialContent } = await server.ssrLoadModule('/src/content.ts')
  const fixed = new Date('2026-10-01T00:00:00Z')
  const base = () => lab.emptyExercise(fixed, 'ex-1')
  const reduce = (state, ...actions) => actions.reduce(lab.labReducer, state)

  await test('Lab: v1 exercises migrate to v2 without losing text; garbage is rejected', () => {
    const v1 = { claim: 'القراءة تحسّن التركيز', kind: 'empirical', before: 40, after: 70, alternative: 'اعتراض', evidence: 'دراسة', criterion: 'إذا…', conclusion: 'خلاصة', sourceTitle: 'فكرة', sourceQuestion: 'سؤال', sourceCounterpoint: '', kindReviewed: true }
    const v2 = lab.migrate(v1, fixed)
    assert.equal(v2.version, 2)
    assert.equal(v2.objection, 'اعتراض')
    assert.equal(v2.evidenceNotes, 'دراسة')
    assert.equal(v2.source.title, 'فكرة')
    assert.equal(lab.validExercise(v2), true)
    for (const bad of [null, [], { claim: '' }, { claim: 'x', before: 500 }, { ...base(), kind: 'magic' }, { ...base(), biases: ['confirmation', 'confirmation'] }, { ...base(), assumptions: Array(7).fill({ id: 'a', text: '', confidence: 'low', criticality: 'minor' }) }]) {
      const result = lab.migrate(bad, fixed)
      assert.ok(result === null || lab.validExercise(result))
    }
    assert.equal(lab.validExercise({ ...base(), claim: 'x'.repeat(3001) }), false)
    assert.equal(lab.restoreHistory([v1, v1, 'junk']).length, 2)
  })

  await test('Lab: reducer enforces limits, clears completion on edit and drops a removed focus', () => {
    let s = base()
    for (let i = 0; i < 8; i++) s = lab.labReducer(s, { type: 'addAssumption', id: `a${i}` })
    assert.equal(s.assumptions.length, lab.LIMITS.assumptions)
    s = reduce(s, { type: 'set', patch: { focusId: 'a1' } }, { type: 'removeAssumption', id: 'a1' })
    assert.equal(s.focusId, '')
    s = reduce(s, { type: 'set', patch: { claim: 'y'.repeat(5000) } })
    assert.equal(s.claim.length, lab.LIMITS.text)
    s = reduce(s, { type: 'complete', at: fixed.toISOString() })
    assert.ok(s.completedAt)
    assert.equal(reduce(s, { type: 'toggleBias', bias: 'authority' }).completedAt, undefined)
    assert.equal(reduce(base(), { type: 'set', patch: { kind: 'causal' } }).kindReviewed, true)
  })

  await test('Lab: claim, objection and criterion signals read Arabic with or without diacritics', () => {
    const tones = list => list.map(s => s.tone)
    assert.ok(lab.claimSignals('هل القراءة مفيدة؟').some(s => s.text.includes('سؤال')))
    assert.ok(lab.claimSignals('كلُّ الناس يحبّون القراءة دائمًا في حياتهم').some(s => s.text.includes('تعميم')))
    assert.ok(lab.claimSignals('القراءة مفيدة لأنها توسّع الخيال عند الأطفال').some(s => s.text.includes('لأن')))
    assert.deepEqual(tones(lab.claimSignals('القراءة اليومية تحسّن التركيز لدى أغلب البالغين')), ['good'])
    assert.ok(lab.objectionSignals('هذا رأي سخيف').some(s => s.tone === 'caution'))
    assert.equal(lab.criterionSignals('لا شيء سيغيّر رأيي')[0].tone, 'caution')
    assert.equal(lab.criterionSignals('إذا ظهرت دراسة كبيرة تنفي الأثر فسأراجع')[0].tone, 'good')
    assert.equal(lab.criterionSignals('سأراجع بعد سنة')[0].tone, 'tip')
  })

  await test('Lab: assumption risk and evidence balance follow the documented weights', () => {
    const risky = { id: 'r', text: 'افتراض', confidence: 'low', criticality: 'collapses' }
    const safe = { id: 's', text: 'آخر', confidence: 'high', criticality: 'minor' }
    assert.ok(lab.assumptionRisk(risky) > lab.assumptionRisk(safe))
    assert.equal(lab.rankedAssumptions([safe, risky])[0].id, 'r')
    assert.equal(lab.focusAssumption({ ...base(), assumptions: [safe, risky] }).id, 'r')
    assert.equal(lab.focusAssumption({ ...base(), assumptions: [safe, risky], focusId: 's' }).id, 's')
    const ev = (direction, type, strength) => ({ id: direction + type + strength, text: 'x', direction, type, strength, testsFocus: false })
    assert.equal(lab.evidenceBalance([]).lean, 'none')
    assert.equal(lab.evidenceBalance([ev('for', 'data', 'high'), ev('against', 'personal', 'low')]).lean, 'support')
    assert.equal(lab.evidenceBalance([ev('for', 'argument', 'medium'), ev('against', 'argument', 'medium')]).lean, 'even')
    assert.equal(lab.evidenceBalance([{ ...ev('for', 'data', 'high'), text: '  ' }]).lean, 'none')
  })

  await test('Lab: consistency checks flag confidence that contradicts the evidence', () => {
    const ev = (direction, type) => ({ id: direction, text: 'x', direction, type, strength: 'high', testsFocus: false })
    const rising = { ...base(), before: 40, after: 80, evidence: [ev('for', 'personal'), ev('against', 'data')] }
    assert.ok(lab.consistencyNotes(rising).some(s => s.tone === 'caution' && s.text.includes('ارتفع')))
    const certain = { ...base(), before: 90, after: 98, evidence: [ev('for', 'data')] }
    assert.ok(lab.consistencyNotes(certain).some(s => s.text.includes('دون أي دليل معارض')))
    const calm = { ...base(), before: 50, after: 60, criterion: 'إذا ظهر دليل فسأراجع', evidence: [ev('for', 'argument'), ev('against', 'argument')] }
    assert.deepEqual(lab.consistencyNotes(calm).map(s => s.tone), ['good'])
  })

  await test('Lab: steps unlock in order and completion requires both sides of the evidence', () => {
    let s = base()
    assert.equal(lab.reachableStep(s), 0)
    s = reduce(s, { type: 'set', patch: { claim: 'القراءة اليومية تحسّن التركيز', kindReviewed: true } }, { type: 'addAssumption', id: 'a' }, { type: 'updateAssumption', id: 'a', patch: { text: 'التركيز قابل للقياس' } })
    assert.equal(lab.reachableStep(s), 3)
    s = reduce(s, { type: 'set', patch: { objection: 'قد يكون القرّاء أكثر تركيزًا من البداية', objectionFair: true } }, { type: 'addEvidence', direction: 'for', id: 'e' }, { type: 'updateEvidence', id: 'e', patch: { text: 'دراسة' } })
    assert.equal(lab.stepComplete(s, 'evidence'), false)
    s = reduce(s, { type: 'set', patch: { noCounterEvidence: true } })
    assert.equal(lab.stepComplete(s, 'evidence'), true)
    s = reduce(s, { type: 'addEvidence', direction: 'against', id: 'f' })
    assert.equal(s.noCounterEvidence, false)
    const text = lab.reportText({ ...s, biases: ['confirmation'], conclusion: 'موقف أوضح', criterion: 'إذا…' })
    assert.ok(text.includes('الانحياز التأكيدي') && text.includes('القراءة اليومية'))
  })

  await test('Lab: observatory SSR renders the lab shell; home stays without it', () => {
    const html = render(initialContent, '/observatory')
    assert.ok(html.includes('id="assumption-lab"'))
    assert.ok(html.includes('الافتراضات الخفية'))
    assert.ok(!render(initialContent, '/').includes('id="assumption-lab"'))
  })
} finally {
  await server.close()
}
