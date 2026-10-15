import type {Content} from '../content'
export function sha256(text:string):Promise<string>
export function sourceText(content:Content,key:string):string
export function sourceDigest(content:Content,key:string):Promise<string>
