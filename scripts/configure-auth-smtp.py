"""Configure Resend SMTP and recovery redirects. Never print credential values."""
import argparse
import json
import os
import urllib.error
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

spec = spec_from_file_location('admin', 'scripts/supabase-admin.py')
admin = module_from_spec(spec)
spec.loader.exec_module(admin)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Apply and read back the configuration')
    args = parser.parse_args()
    values = {}
    if Path('.env').exists():
        for line in Path('.env').read_text(encoding='utf-8-sig').splitlines():
            if '=' in line and not line.lstrip().startswith('#'):
                key, value = line.split('=', 1)
                values[key.strip()] = value.strip().strip('\"\'')
    missing = []
    try:
        admin.token()
    except KeyError:
        missing.append('SUPABASE_ACCESS_TOKEN')
    password = os.environ.get('RESEND_API_KEY') or values.get('RESEND_API_KEY')
    if not password:
        missing.append('RESEND_API_KEY')
    if missing:
        print(json.dumps({'applied': False, 'missing': missing}))
        return 1
    origin = 'https://kumeelalnahab.com'
    current = admin.request('/config/auth')
    urls = [url.strip() for url in (current.get('uri_allow_list') or '').split(',') if url.strip()]
    for host in [origin, 'https://www.kumeelalnahab.com']:
        for path in ['/admin', '/admin?reset=1', '/member']:
            if host + path not in urls:
                urls.append(host + path)
    expected = {
        'smtp_host': 'smtp.resend.com', 'smtp_port': '465', 'smtp_user': 'resend',
        'smtp_admin_email': 'noreply@mail.kumeelalnahab.com',
        'smtp_sender_name': 'كميل ال نهاب', 'site_url': origin,
        'uri_allow_list': ','.join(urls),
    }
    if not args.apply:
        print(json.dumps({'applied': False, 'ready': True, 'configuration': expected}))
        return 0
    admin.request('/config/auth', {**expected, 'smtp_pass': password}, 'PATCH')
    verified = admin.request('/config/auth')
    checks = {key: str(verified.get(key)) == str(value) for key, value in expected.items()}
    print(json.dumps({'applied': True, 'configuration_verified': all(checks.values()), 'checks': checks,
                      'email_delivery_verified': False}))
    return 0 if all(checks.values()) else 1


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except urllib.error.HTTPError as error:
        print(json.dumps({'applied': False, 'http_status': error.code}))
        raise SystemExit(1)
    except (OSError, ValueError):
        print(json.dumps({'applied': False, 'reason': 'Connection or configuration read failed.'}))
        raise SystemExit(1)
