export const PRIVATE_DATA_CLEARED='kumeel-private-data-cleared'
// Only app-owned tab data is removed; legacy persistent drafts require explicit import/export.
export function clearPrivateTabData(storage:Storage=sessionStorage){
 const remove:string[]=[]
 for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key&&(key.startsWith('kumeel-notebook-buffer-v2:')||key.startsWith('kumeel-owner-draft-v2:')||key.startsWith('kumeel-idea-engine-v2:')||['kumeel-reader-chat','kumeel-reader-question'].includes(key)))remove.push(key)}
 for(const key of remove)storage.removeItem(key)
}
