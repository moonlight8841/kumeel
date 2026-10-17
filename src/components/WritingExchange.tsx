import {styleLabel,type ExchangeRound} from '../lib/exchange'
export function WritingExchange({rounds}:{rounds:ExchangeRound[]}){
 return <section className="publication-exchange" aria-labelledby="exchange-title"><h2 id="exchange-title">اعتراض وجواب</h2>
  {rounds.map((r,i)=><article key={i}><h3>اعتراض صاغه محاور آلي ونشره الكاتب <small>· {styleLabel[r.style]}</small></h3><p className="preserve-lines">{r.objection}</p><h3>جواب الكاتب</h3><p className="preserve-lines">{r.reply}</p></article>)}
 </section>
}
