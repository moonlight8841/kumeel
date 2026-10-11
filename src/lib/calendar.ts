import type { Session } from '../content'

const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')
const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
export function sessionCalendar(session: Session, now = new Date()): string {
  const start = new Date(session.startsAt)
  const end = new Date(start.getTime() + session.durationMinutes * 60000)
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kumeel//Ideas Salon//AR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${encodeURIComponent(session.id)}@kumeel`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${escape(`${session.title} | كميل ال نهاب`)}`, `DESCRIPTION:${escape(`${session.question}\n${session.notes || ''}\n${session.joinUrl}`)}`, `URL:${session.joinUrl}`, 'END:VEVENT', 'END:VCALENDAR']
  // Fold by UTF-8 byte length so Arabic descriptions remain valid in calendar clients.
  return lines.flatMap(line => {
    const folded: string[] = []
    let part = ''
    for (const char of line) {
      if (new TextEncoder().encode(part + char).length > 75) { folded.push(part); part = ' ' }
      part += char
    }
    folded.push(part)
    return folded
  }).join('\r\n') + '\r\n'
}
export function downloadCalendar(session: Session) {
  const url = URL.createObjectURL(new Blob([sessionCalendar(session)], { type: 'text/calendar;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url; link.download = 'kumeel-salon.ics'; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
