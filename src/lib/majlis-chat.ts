// Members-only live chat (Stream). The token comes from /api/stream-chat; nothing secret lives here.
export type MajlisSession={apiKey:string;userId:string;name:string;token:string;channel:{type:string;id:string}}
export const NAME_KEY='kumeel-majlis-name'

export async function joinMajlis(accessToken:string,name:string):Promise<MajlisSession>{
 const response=await fetch('/api/stream-chat',{method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({name})})
 const body=await response.json().catch(()=>null) as {success?:boolean;error?:string;data?:MajlisSession}|null
 if(!response.ok||!body?.success||!body.data)throw new Error(body?.error||'تعذّر الانضمام إلى المجلس. أعد المحاولة لاحقًا.')
 return body.data
}

// Partial Arabic for the most visible Stream UI strings; anything missing falls back to English.
export const arabicChat:Record<string,string>={
 'Send a message':'اكتب رسالتك…',
 'Send':'إرسال',
 'Send a message to start the conversation':'ابدأ الحديث برسالة',
 'Nothing yet...':'لا رسائل بعد…',
 'Load more':'تحميل المزيد',
 'Thread':'سلسلة الردود',
 'Thread Reply':'رد في السلسلة',
 'Reply':'رد',
 'Reply to Message':'الرد على الرسالة',
 'Quote Reply':'رد مع اقتباس',
 'replyCount_one':'رد واحد',
 'replyCount_other':'{{ count }} ردود',
 'Also send in channel':'أرسل في المجلس أيضًا',
 'Edit':'تعديل',
 'Edit Message':'تعديل الرسالة',
 'Edited':'معدّلة',
 'Delete':'حذف',
 'Delete message':'حذف الرسالة',
 'Message deleted':'حُذفت الرسالة',
 'Copy Message':'نسخ الرسالة',
 'Flag':'إبلاغ',
 'Message has been successfully flagged':'وصل البلاغ، شكرًا لك.',
 'Mute':'كتم',
 'Unmute':'إلغاء الكتم',
 'Pin':'تثبيت',
 'Unpin':'إلغاء التثبيت',
 'Mark as unread':'تعليم كغير مقروءة',
 'Unread messages':'رسائل غير مقروءة',
 'New Messages!':'رسائل جديدة',
 'Cancel':'إلغاء',
 'Save':'حفظ',
 'Close':'إغلاق',
 'Attach files':'إرفاق ملفات',
 'Only visible to you':'تظهر لك وحدك',
 'Message failed to send':'تعذّر إرسال الرسالة',
 'Connection failure, reconnecting now...':'انقطع الاتصال، نعيد المحاولة…',
 'Error connecting to chat, refresh the page to try again.':'تعذّر الاتصال بالدردشة. حدّث الصفحة وأعد المحاولة.',
 '{{ user }} is typing...':'{{ user }} يكتب…',
 '{{ users }} and {{ user }} are typing...':'{{ users }} و{{ user }} يكتبون…',
 '{{ users }} and more are typing...':'{{ users }} وآخرون يكتبون…',
}
