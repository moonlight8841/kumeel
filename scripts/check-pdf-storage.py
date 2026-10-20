"""Service transport smoke test; SQL tests separately verify user/MFA policies.
Uploads only a generated fixture, downloads it, then removes that exact fixture.
"""
import json
import uuid
import urllib.request
from pathlib import Path

values = {}
for line in Path('.env').read_text(encoding='utf-8-sig').splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        key, value = line.split('=', 1)
        values[key.strip()] = value.strip().strip('\"\'')
key = values['SUPABASE_SECRET_KEY']
base = 'https://jigypvbqiuakdatkzoul.supabase.co/storage/v1'
headers = {'apikey': key, 'Authorization': 'Bearer ' + key}
path = 'books/00000000-0000-0000-0000-000000000000/' + str(uuid.uuid4()) + '.pdf'
# A valid one-page blank PDF, with computed cross-reference offsets.
parts = [b'%PDF-1.4\n']
objects = [b'<< /Type /Catalog /Pages 2 0 R >>',
           b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
           b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>',
           b'<< /Length 0 >>\nstream\n\nendstream']
offsets = [0]
for index, body in enumerate(objects, 1):
    offsets.append(sum(map(len, parts)))
    parts.append(str(index).encode() + b' 0 obj\n' + body + b'\nendobj\n')
xref = sum(map(len, parts))
parts.append(b'xref\n0 5\n0000000000 65535 f \n' + b''.join(f'{n:010d} 00000 n \n'.encode() for n in offsets[1:]))
parts.append(f'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode())
pdf = b''.join(parts)
uploaded = False
result = {'uses_service_key': True, 'tests_user_authorization': False}
try:
    request = urllib.request.Request(base + '/object/kumeel-books/' + path, data=pdf,
                                    headers={**headers, 'Content-Type': 'application/pdf', 'x-upsert': 'false'}, method='POST')
    with urllib.request.urlopen(request, timeout=30) as response:
        result['upload_status'] = response.status
    uploaded = True
    with urllib.request.urlopen(base + '/object/public/kumeel-books/' + path, timeout=30) as response:
        result['download_status'] = response.status
        result['bytes_match'] = response.read() == pdf
        result['mime'] = response.headers.get('Content-Type')
finally:
    if uploaded:
        request = urllib.request.Request(base + '/object/kumeel-books', data=json.dumps({'prefixes': [path]}).encode(),
                                        headers={**headers, 'Content-Type': 'application/json'}, method='DELETE')
        with urllib.request.urlopen(request, timeout=30) as response:
            result['cleanup_status'] = response.status
    print(json.dumps(result))
if not result.get('bytes_match'):
    raise SystemExit(1)
