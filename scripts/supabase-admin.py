"""Local administrative helper. Reads credentials from .env; never prints keys."""
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

PROJECT = 'ktwugokiznarbnsvohzq'

def token():
    values = dict(line.split('=', 1) for line in Path('.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
    return values['supabase'].strip().strip('\"\'')

def request(path, body=None, method=None):
    headers = {'Authorization': 'Bearer ' + token(), 'User-Agent': 'kumeel-deployment', 'Content-Type': 'application/json'}
    req = urllib.request.Request('https://api.supabase.com/v1/projects/' + PROJECT + path, headers=headers, data=json.dumps(body).encode() if body is not None else None, method=method)
    with urllib.request.urlopen(req, timeout=30) as response:
        raw = response.read()
        return json.loads(raw) if raw else {}

def query(sql, read_only=False):
    return request('/database/query', {'query': sql, 'read_only': read_only})

if __name__ == '__main__':
    action = sys.argv[1]
    if action == 'apply':
        sql = Path('supabase/schema.sql').read_text()
        request('/database/migrations', {'name': 'kumeel_personal_space', 'query': sql})
        migrations = query("select version,name from supabase_migrations.schema_migrations where name='kumeel_personal_space'", True)
        folder = Path('supabase/migrations'); folder.mkdir(exist_ok=True)
        for migration in migrations:
            (folder / (migration['version'] + '_kumeel_personal_space.sql')).write_text(sql)
        print('Applied migration:', migrations)
    elif action == 'query':
        print(json.dumps(query(sys.stdin.read(), '--read-only' in sys.argv), ensure_ascii=False))
    elif action == 'advisors':
        notices = request('/advisors/security')
        print(json.dumps(notices))
    else:
        raise SystemExit('Supported commands: apply, query, advisors')
