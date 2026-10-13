// Assumption Lab domain model: schema, migration, reducer and reasoning checks.
// Pure and framework-free so every rule can be unit tested and reused.

export const LAB_VERSION=2
export const LIMITS={text:3000,assumptions:6,evidence:10,history:12}
export const STORAGE={current:'kumeel-assumption-lab-v2',history:'kumeel-assumption-lab-history-v2',legacyCurrent:'kumeel-thought-lab',legacyHistory:'kumeel-lab-history'}

export type ClaimKind='empirical'|'causal'|'value'|'conceptual'
export type Level='low'|'medium'|'high'
export type Criticality='collapses'|'weakens'|'minor'
export type EvidenceDirection='for'|'against'
export type EvidenceType='personal'|'testimony'|'example'|'argument'|'data'
export type BiasKey='confirmation'|'authority'|'popularity'|'interest'|'anecdote'|'identity'

export type Assumption={id:string;text:string;confidence:Level;criticality:Criticality}
export type Evidence={id:string;text:string;direction:EvidenceDirection;type:EvidenceType;strength:Level;testsFocus:boolean}
export type Exercise={
 version:typeof LAB_VERSION;id:string;startedAt:string;completedAt?:string
 claim:string;scope:string;kind:ClaimKind;kindReviewed:boolean;before:number
 assumptions:Assumption[];focusId:string
 objection:string;objectionFair:boolean
 evidence:Evidence[];evidenceNotes:string;noCounterEvidence:boolean
 criterion:string;biases:BiasKey[];biasReflection:string
 conclusion:string;after:number
 source?:{ideaId?:string;title:string;question:string;counterpoint:string}
}

export const kinds:Record<ClaimKind,{label:string;prompt:string;evidenceLabel:string;evidenceHint:string}>={
 empirical:{label:'وصف للواقع قابل للملاحظة',prompt:'ما الذي يمكن ملاحظته أو قياسه؟ ومن أي عيّنة يأتي التعميم؟',evidenceLabel:'ملاحظات وبيانات',evidenceHint:'مصدر يمكن فحصه أو تجربة ممكنة. انتبه لحجم العيّنة ومن جمعها.'},
 causal:{label:'علاقة سبب ونتيجة',prompt:'هل يسبق السبب النتيجة؟ وهل هناك عامل ثالث يفسّر الاثنين معًا؟',evidenceLabel:'شواهد على السببية',evidenceHint:'التلازم وحده لا يثبت السبب. ابحث عن مقارنة أو تجربة أو آلية مفسّرة.'},
 value:{label:'حكم قيمي أو أخلاقي',prompt:'ما القيمة التي يستند إليها الحكم؟ وأي قيمة أخرى قد تتعارض معها؟',evidenceLabel:'حجج وحالات اختبار',evidenceHint:'قدّم حالة مضادة أو تعارضًا بين قيمتين. الشعور وحده لا يُلزم الآخرين.'},
 conceptual:{label:'تعريف أو معنى مفهوم',prompt:'ما التعريف الذي تستخدمه؟ وهل يغيّر تعريفٌ آخر معقول النتيجة؟',evidenceLabel:'حجج وأمثلة حدّية',evidenceHint:'اختبر التعريف بحالات على الحدود: ما الذي يدخل فيه وما يخرج منه؟'},
}
export const levelLabels:Record<Level,string>={low:'منخفضة',medium:'متوسطة',high:'مرتفعة'}
export const criticalityLabels:Record<Criticality,string>={collapses:'يسقط الادعاء',weakens:'يضعف الادعاء',minor:'أثر محدود'}
export const evidenceTypes:Record<EvidenceType,{label:string;weight:number}>={
 personal:{label:'تجربة شخصية',weight:1},
 testimony:{label:'شهادة أو رأي خبير',weight:1.5},
 example:{label:'مثال أو حالة',weight:1.5},
 argument:{label:'حجة منطقية',weight:2},
 data:{label:'دراسة أو بيانات',weight:3},
}
const strengthFactor:Record<Level,number>={low:.5,medium:1,high:1.5}
export const biases:Record<BiasKey,{label:string;question:string}>={
 confirmation:{label:'الانحياز التأكيدي',question:'هل بحثت عمّا يؤيدني أكثر مما بحثت عمّا يعارضني؟'},
 authority:{label:'سلطة القائل',question:'هل أقبل الفكرة لأن قائلها موثوق عندي لا لأن حجتها قوية؟'},
 popularity:{label:'الشيوع والألفة',question:'هل تبدو صحيحة لأنها مألوفة أو منتشرة؟'},
 interest:{label:'المصلحة أو الرغبة',question:'هل يريحني أن تكون صحيحة، أو أخسر شيئًا إن كانت خاطئة؟'},
 anecdote:{label:'التعميم من حالة',question:'هل أعمّم من تجربة واحدة أو قصة مؤثرة؟'},
 identity:{label:'الانتماء والهوية',question:'هل يمسّ الادعاء جماعة أنتمي إليها فأدافع عنه تلقائيًا؟'},
}

export const steps=[
 {key:'claim',label:'الادعاء'},
 {key:'kind',label:'نوع الادعاء'},
 {key:'assumptions',label:'الافتراضات الخفية'},
 {key:'objection',label:'أقوى اعتراض'},
 {key:'evidence',label:'ميزان الأدلة'},
 {key:'criterion',label:'معيار المراجعة'},
 {key:'biases',label:'فحص التحيّزات'},
 {key:'conclusion',label:'الخلاصة'},
] as const
export type StepKey=typeof steps[number]['key']

const randomId=()=>typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():`id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`

export function emptyExercise(now=new Date(),id=randomId()):Exercise{
 return {version:LAB_VERSION,id,startedAt:now.toISOString(),claim:'',scope:'',kind:'value',kindReviewed:false,before:50,assumptions:[],focusId:'',objection:'',objectionFair:false,evidence:[],evidenceNotes:'',noCounterEvidence:false,criterion:'',biases:[],biasReflection:'',conclusion:'',after:50}
}
export function exerciseFromIdea(idea:{id?:string;title:string;text:string;question:string;counterpoint?:string},now=new Date(),id=randomId()):Exercise{
 const clip=(v:string)=>v.slice(0,LIMITS.text)
 return {...emptyExercise(now,id),claim:clip(idea.text.split('\n\n')[0]??''),source:{ideaId:idea.id,title:clip(idea.title),question:clip(idea.question),counterpoint:clip(idea.counterpoint??'')}}
}

// ---------- Validation & migration ----------
const isObj=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v)
const str=(v:unknown,max=LIMITS.text)=>typeof v==='string'&&v.length<=max
const oneOf=<T extends string>(v:unknown,list:readonly T[]):v is T=>typeof v==='string'&&(list as readonly string[]).includes(v)
const percent=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100
const levelList=['low','medium','high'] as const

function validAssumption(v:unknown):v is Assumption{return isObj(v)&&str(v.id,80)&&str(v.text)&&oneOf(v.confidence,levelList)&&oneOf(v.criticality,['collapses','weakens','minor'] as const)}
function validEvidence(v:unknown):v is Evidence{return isObj(v)&&str(v.id,80)&&str(v.text)&&oneOf(v.direction,['for','against'] as const)&&oneOf(v.type,Object.keys(evidenceTypes) as EvidenceType[])&&oneOf(v.strength,levelList)&&typeof v.testsFocus==='boolean'}

export function validExercise(v:unknown):v is Exercise{
 if(!isObj(v)||v.version!==LAB_VERSION)return false
 const texts=['claim','scope','objection','evidenceNotes','criterion','biasReflection','conclusion'] as const
 if(!str(v.id,80)||!str(v.startedAt,40)||(v.completedAt!==undefined&&!str(v.completedAt,40))||!texts.every(k=>str(v[k])))return false
 if(!oneOf(v.kind,Object.keys(kinds) as ClaimKind[])||!percent(v.before)||!percent(v.after))return false
 if(![v.kindReviewed,v.objectionFair,v.noCounterEvidence].every(b=>typeof b==='boolean')||!str(v.focusId,80))return false
 if(!Array.isArray(v.assumptions)||v.assumptions.length>LIMITS.assumptions||!v.assumptions.every(validAssumption))return false
 if(!Array.isArray(v.evidence)||v.evidence.length>LIMITS.evidence||!v.evidence.every(validEvidence))return false
 if(!Array.isArray(v.biases)||!v.biases.every(b=>oneOf(b,Object.keys(biases) as BiasKey[]))||new Set(v.biases).size!==v.biases.length)return false
 if(v.source!==undefined){const s=v.source;if(!isObj(s)||!str(s.title)||!str(s.question)||!str(s.counterpoint)||(s.ideaId!==undefined&&!str(s.ideaId,200)))return false}
 return true
}

// v1 stored flat strings (claim/alternative/evidence/…) with a two-value kind.
export function migrate(v:unknown,now=new Date()):Exercise|null{
 if(validExercise(v))return v
 if(!isObj(v)||v.version!==undefined)return null
 const text=(k:string)=>typeof v[k]==='string'?(v[k] as string).slice(0,LIMITS.text):''
 if(!text('claim').trim())return null
 const base=emptyExercise(now)
 const next:Exercise={...base,claim:text('claim'),kind:v.kind==='empirical'?'empirical':'value',kindReviewed:v.kindReviewed===true,
  before:percent(v.before)?v.before as number:50,after:percent(v.after)?v.after as number:50,
  objection:text('alternative'),evidenceNotes:text('evidence'),criterion:text('criterion'),conclusion:text('conclusion'),
  ...(text('sourceTitle')?{source:{title:text('sourceTitle'),question:text('sourceQuestion'),counterpoint:text('sourceCounterpoint')}}:{})}
 return validExercise(next)?next:null
}

// ---------- Reducer ----------
export type LabAction=
 |{type:'set';patch:Partial<Omit<Exercise,'version'|'id'|'assumptions'|'evidence'>>}
 |{type:'addAssumption';id?:string}
 |{type:'updateAssumption';id:string;patch:Partial<Omit<Assumption,'id'>>}
 |{type:'removeAssumption';id:string}
 |{type:'addEvidence';direction:EvidenceDirection;id?:string}
 |{type:'updateEvidence';id:string;patch:Partial<Omit<Evidence,'id'>>}
 |{type:'removeEvidence';id:string}
 |{type:'toggleBias';bias:BiasKey}
 |{type:'complete';at:string}
 |{type:'load';exercise:Exercise}

const clipText=<T extends Record<string,unknown>>(patch:T):T=>Object.fromEntries(Object.entries(patch).map(([k,v])=>[k,typeof v==='string'?v.slice(0,LIMITS.text):v])) as T

export function labReducer(state:Exercise,action:LabAction):Exercise{
 const edited:Exercise={...state,completedAt:undefined}
 switch(action.type){
  case 'set':{const patch=clipText(action.patch);return {...edited,...patch,...('kind' in patch?{kindReviewed:true}:{})}}
  case 'addAssumption':{if(state.assumptions.length>=LIMITS.assumptions)return state;return {...edited,assumptions:[...state.assumptions,{id:action.id??randomId(),text:'',confidence:'medium',criticality:'weakens'}]}}
  case 'updateAssumption':return {...edited,assumptions:state.assumptions.map(a=>a.id===action.id?{...a,...clipText(action.patch)}:a)}
  case 'removeAssumption':return {...edited,assumptions:state.assumptions.filter(a=>a.id!==action.id),focusId:state.focusId===action.id?'':state.focusId}
  case 'addEvidence':{if(state.evidence.length>=LIMITS.evidence)return state;return {...edited,evidence:[...state.evidence,{id:action.id??randomId(),text:'',direction:action.direction,type:'argument',strength:'medium',testsFocus:false}],...(action.direction==='against'?{noCounterEvidence:false}:{})}}
  case 'updateEvidence':return {...edited,evidence:state.evidence.map(e=>e.id===action.id?{...e,...clipText(action.patch)}:e)}
  case 'removeEvidence':return {...edited,evidence:state.evidence.filter(e=>e.id!==action.id)}
  case 'toggleBias':return {...edited,biases:state.biases.includes(action.bias)?state.biases.filter(b=>b!==action.bias):[...state.biases,action.bias]}
  case 'complete':return {...state,completedAt:action.at}
  case 'load':return action.exercise
 }
}

// ---------- Reasoning checks ----------
export type Signal={tone:'caution'|'tip'|'good';text:string}
// Strip harakat and tatweel so detection is not defeated by diacritics.
export const normalizeArabic=(v:string)=>v.replace(/[ً-ْٰـ]/g,'').replace(/[أإآ]/g,'ا')
const word=(list:string)=>new RegExp(`(^|[\\s،,.؛:!؟?(«"])(?:[وفب]?)(${list})(?=$|[\\s،,.؛:!؟?)»"])`)
const absolutes=word('كل|جميع|الجميع|دائما|ابدا|مطلقا|لا احد|حتما|قطعا|يستحيل|مستحيل|بالتاكيد|بلا شك')
const dismissive=word('سخيف|سخيفة|غبي|غبية|تافه|تافهة|ساذج|ساذجة|جاهل|جهلة|حمقى|احمق')

export function claimSignals(claim:string):Signal[]{
 const t=normalizeArabic(claim.trim())
 if(!t)return []
 const out:Signal[]=[]
 if(/[؟?]\s*$/.test(t))out.push({tone:'caution',text:'صيغت كسؤال. اكتب الجواب الذي تميل إليه كعبارة يمكن أن تكون صحيحة أو خاطئة.'})
 if(absolutes.test(t))out.push({tone:'tip',text:'فيها تعميم مطلق (كل، دائمًا، أبدًا…). حالة مضادة واحدة تكفي لنقضه؛ هل تقصد «غالبًا» أو «في سياق محدد»؟'})
 // Arabic attaches pronouns: لأنه، لأنها، لأنهم، بسببه…
 if(/(^|\s)(لان|بسبب)(ه|ها|هم|هن|ني|نا|ك|كم)?(\s|$)/.test(t))out.push({tone:'tip',text:'تضمّ سببًا («لأن»). افصل السبب وضعه في ميزان الأدلة؛ الادعاء وحده أوضح للاختبار.'})
 if(t.length<20)out.push({tone:'caution',text:'قصير جدًا ليُختبر. أضف من أو ماذا أو متى.'})
 else if(t.length>400)out.push({tone:'caution',text:'طويل وقد يجمع أكثر من ادعاء. اختر واحدًا تختبره الآن.'})
 if(!out.length)out.push({tone:'good',text:'صياغة محددة يمكن اختبارها.'})
 return out
}

export function objectionSignals(objection:string):Signal[]{
 const t=normalizeArabic(objection.trim())
 if(!t)return []
 const out:Signal[]=[]
 if(dismissive.test(t))out.push({tone:'caution',text:'الصياغة تحمل حكمًا على صاحب الاعتراض. الاعتراض المنصف يناقش الفكرة لا الشخص.'})
 if(t.length<40)out.push({tone:'tip',text:'اعتراض قصير غالبًا نسخة ضعيفة. اكتب حجته كما يكتبها أفضل مدافع عنه.'})
 return out
}

export function criterionSignals(criterion:string):Signal[]{
 const t=normalizeArabic(criterion.trim())
 if(!t)return []
 if(/(لا شيء|لن (اغير|يغير)|لا يمكن ان (اغير|يتغير)|مستحيل ان|لا يوجد ما)/.test(t))return [{tone:'caution',text:'المعيار يقول إن لا شيء سيغيّر الموقف. الموقف الذي لا يمكن مراجعته يصبح عقيدة لا فرضية.'}]
 if(!/(^|\s)(اذا|لو|ان|متى|حين|عندما|في حال)(\s|$)/.test(t))return [{tone:'tip',text:'صغه كشرط: «إذا ظهر… فسأراجع…». الشرط الواضح يمكن التحقق منه.'}]
 return [{tone:'good',text:'شرط واضح قابل للتحقق.'}]
}

const levelValue:Record<Level,number>={low:0,medium:.5,high:1}
const criticalValue:Record<Criticality,number>={collapses:1,weakens:.6,minor:.2}
// Risk = how much the claim depends on it × how unsure you are of it.
export const assumptionRisk=(a:Assumption)=>Math.round(criticalValue[a.criticality]*(1-levelValue[a.confidence]*.8)*100)/100
export function rankedAssumptions(list:Assumption[]){return list.filter(a=>a.text.trim()).map(a=>({...a,risk:assumptionRisk(a)})).sort((x,y)=>y.risk-x.risk)}
export function focusAssumption(e:Exercise){const filled=e.assumptions.filter(a=>a.text.trim());return filled.find(a=>a.id===e.focusId)??rankedAssumptions(filled)[0]}

export const evidenceWeight=(e:Evidence)=>evidenceTypes[e.type].weight*strengthFactor[e.strength]
export type Balance={support:number;oppose:number;score:number;label:string;lean:'support'|'oppose'|'even'|'none'}
export function evidenceBalance(list:Evidence[]):Balance{
 const filled=list.filter(e=>e.text.trim())
 const support=filled.filter(e=>e.direction==='for').reduce((s,e)=>s+evidenceWeight(e),0)
 const oppose=filled.filter(e=>e.direction==='against').reduce((s,e)=>s+evidenceWeight(e),0)
 const total=support+oppose
 if(!total)return {support,oppose,score:0,label:'لا أدلة بعد',lean:'none'}
 const score=Math.round((support-oppose)/total*100)/100
 const label=score>.4?'يميل بوضوح إلى التأييد':score>.15?'يميل إلى التأييد':score<-.4?'يميل بوضوح إلى المعارضة':score<-.15?'يميل إلى المعارضة':'متوازن تقريبًا'
 return {support,oppose,score,label,lean:score>.15?'support':score<-.15?'oppose':'even'}
}

// Cross-step checks: does the final confidence follow from the work done?
export function consistencyNotes(e:Exercise):Signal[]{
 const n=(v:number)=>v.toLocaleString('ar-SA')
 const out:Signal[]=[]
 const balance=evidenceBalance(e.evidence)
 const delta=e.after-e.before
 const against=e.evidence.some(x=>x.direction==='against'&&x.text.trim())
 const focus=focusAssumption(e)
 if(delta>=15&&balance.lean==='oppose')out.push({tone:'caution',text:`ارتفع اقتناعك ${n(delta)} نقطة بينما الميزان ${balance.label}. ما الذي رجّح موقفك غير الأدلة المدوّنة؟`})
 if(delta<=-15&&balance.lean==='support')out.push({tone:'caution',text:`انخفض اقتناعك ${n(Math.abs(delta))} نقطة بينما الميزان ${balance.label}. هل غيّرك الاعتراض أكثر من الأدلة؟ دوّنه في الخلاصة.`})
 if(Math.abs(delta)<5&&Math.abs(balance.score)>.6)out.push({tone:'tip',text:'الميزان واضح الاتجاه لكن اقتناعك لم يتحرك تقريبًا. هل هذا مقصود؟'})
 if(!against&&e.after>=80)out.push({tone:'caution',text:'اقتناع مرتفع دون أي دليل معارض مدوّن. اليقين يقوى حين يصمد أمام المعارضة لا حين يغيب عنها.'})
 if(e.after>=95)out.push({tone:'tip',text:'اقتناع شبه مطلق. نادرًا ما تبرّر حجةٌ واحدة يقينًا كاملًا؛ ما الذي يبقى مفتوحًا؟'})
 if(focus&&assumptionRisk(focus)>=.5&&!e.evidence.some(x=>x.testsFocus&&x.text.trim()))out.push({tone:'tip',text:`الافتراض المحوري «${focus.text.slice(0,80)}» عالي الخطورة ولم يختبره أي دليل.`})
 if(criterionSignals(e.criterion).some(s=>s.tone==='caution'))out.push({tone:'caution',text:'معيار المراجعة لا يسمح بأي تغيير؛ راجعه قبل اعتماد الخلاصة.'})
 if(e.biases.length>=3)out.push({tone:'tip',text:`أشرت إلى ${n(e.biases.length)} تحيّزات محتملة. هل ينعكس ذلك على درجة اقتناعك النهائية؟`})
 if(!out.length)out.push({tone:'good',text:'الخلاصة متسقة مع ما دوّنته في المراحل السابقة.'})
 return out
}

// ---------- Step completion ----------
export function stepComplete(e:Exercise,key:StepKey):boolean{
 switch(key){
  case 'claim':return e.claim.trim().length>=10
  case 'kind':return e.kindReviewed
  case 'assumptions':return e.assumptions.filter(a=>a.text.trim()).length>=1
  case 'objection':return e.objection.trim().length>=20&&e.objectionFair
  case 'evidence':return e.evidence.some(x=>x.direction==='for'&&x.text.trim())&&(e.evidence.some(x=>x.direction==='against'&&x.text.trim())||e.noCounterEvidence)
  case 'criterion':return e.criterion.trim().length>=10
  case 'biases':return e.biases.length>0||e.biasReflection.trim().length>=10
  case 'conclusion':return e.conclusion.trim().length>=10
 }
}
export const stepRequirement:Record<StepKey,string>={
 claim:'اكتب ادعاءً من عشرة أحرف على الأقل.',
 kind:'اختر نوع الادعاء أو أكّد النوع الحالي.',
 assumptions:'أضف افتراضًا واحدًا على الأقل يقوم عليه الادعاء.',
 objection:'اكتب اعتراضًا واضحًا وأكّد أنك صغته بإنصاف.',
 evidence:'أضف دليلًا مؤيدًا، ودليلًا معارضًا أو أقرّ بأنك لم تجد.',
 criterion:'حدّد شرطًا تراجع عنده موقفك.',
 biases:'اختر تحيّزًا محتملًا أو اكتب لماذا لا ترى أيًا منها.',
 conclusion:'اكتب موقفك الآن وسببه.',
}
export const completedSteps=(e:Exercise)=>steps.filter(s=>stepComplete(e,s.key)).length
// Users may revisit any completed step and the first incomplete one, never skip ahead.
export function reachableStep(e:Exercise){const i=steps.findIndex(s=>!stepComplete(e,s.key));return i<0?steps.length-1:i}

// ---------- History & report ----------
export function addToHistory(history:Exercise[],e:Exercise):Exercise[]{return [e,...history.filter(h=>h.id!==e.id)].slice(0,LIMITS.history)}
export function restoreHistory(v:unknown):Exercise[]{if(!Array.isArray(v))return [];const seen=new Set<string>();return v.map(x=>migrate(x)).filter((x):x is Exercise=>Boolean(x)&&!seen.has(x!.id)&&Boolean(seen.add(x!.id))).slice(0,LIMITS.history)}

export function reportText(e:Exercise):string{
 const balance=evidenceBalance(e.evidence)
 const focus=focusAssumption(e)
 const lines=[`تقرير مختبر الافتراضات — ${e.completedAt?new Date(e.completedAt).toLocaleDateString('ar-SA',{calendar:'gregory'}):'مسودة'}`,'',
  ...(e.source?[`الفكرة: ${e.source.title}`,'']:[]),
  `الادعاء: ${e.claim}`,...(e.scope.trim()?[`النطاق: ${e.scope}`]:[]),`النوع: ${kinds[e.kind].label}`,'',
  'الافتراضات (الأعلى خطورة أولًا):',...rankedAssumptions(e.assumptions).map(a=>`- ${a.text} — ثقة ${levelLabels[a.confidence]}، إن سقط: ${criticalityLabels[a.criticality]}${focus?.id===a.id?' ← محوري':''}`),'',
  `أقوى اعتراض: ${e.objection}`,'',
  `ميزان الأدلة: ${balance.label}`,...e.evidence.filter(x=>x.text.trim()).map(x=>`- [${x.direction==='for'?'يؤيد':'يعارض'} · ${evidenceTypes[x.type].label} · ${levelLabels[x.strength]}] ${x.text}`),
  ...(e.noCounterEvidence?['- لم أجد دليلًا معارضًا بعد البحث.']:[]),...(e.evidenceNotes.trim()?[`ملاحظات: ${e.evidenceNotes}`]:[]),'',
  `معيار المراجعة: ${e.criterion}`,'',
  `تحيّزات محتملة: ${e.biases.length?e.biases.map(b=>biases[b].label).join('، '):'لم أحدّد'}`,...(e.biasReflection.trim()?[e.biasReflection]:[]),'',
  `الخلاصة: ${e.conclusion}`,`الاقتناع: ${e.before}٪ ← ${e.after}٪`,'',
  'ملاحظات الاتساق:',...consistencyNotes(e).map(s=>`- ${s.text}`)]
 return lines.join('\n')
}
