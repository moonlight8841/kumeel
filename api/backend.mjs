import {handleBackend} from './_shared/backend-bff.mjs'
import {nodeRoute} from './_shared/node-bff.mjs'
export const config={api:{bodyParser:false}}
export default nodeRoute(handleBackend,{maximum:50*1024*1024+65536})
