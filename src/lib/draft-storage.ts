type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>
export function ownerDraftKey(owner:string){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(owner)&&!(import.meta.env.DEV&&owner==='development-preview'))throw new Error('Invalid draft owner')
 return `kumeel-owner-draft-v2:${owner}`
}
export function readOwnerDraft(owner:string,storage:Store=sessionStorage):unknown{
 const raw=storage.getItem(ownerDraftKey(owner));return raw?JSON.parse(raw):null
}
export function writeOwnerDraft(owner:string,value:unknown,storage:Store=sessionStorage){storage.setItem(ownerDraftKey(owner),JSON.stringify(value))}
export function clearOwnerDraft(owner:string,storage:Store=sessionStorage){storage.removeItem(ownerDraftKey(owner));storage.removeItem(`kumeel-notebook-buffer-v2:${owner}`);storage.removeItem(`kumeel-idea-engine-v2:${owner}`)}
