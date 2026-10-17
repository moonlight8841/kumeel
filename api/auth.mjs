import {handleAuth} from './_shared/auth-bff.mjs'
import {nodeRoute} from './_shared/node-bff.mjs'
export default nodeRoute(handleAuth,{maximum:12000})
