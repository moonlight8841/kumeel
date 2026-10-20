"""Enable Google OAuth using local credentials; never print secrets."""
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
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    values = {}
    for line in Path('.env').read_text(encoding='utf-8-sig').splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            key, value = line.split('=', 1)
            values[key.strip()] = value.strip().strip('\"\'')
    client = os.environ.get('GOOGLE_CLIENT_ID') or values.get('GOOGLE_CLIENT_ID')
    secret = os.environ.get('GOOGLE_CLIENT_SECRET') or values.get('GOOGLE_CLIENT_SECRET')
    if not client or not secret:
        print(json.dumps({'applied': False, 'missing': [key for key, value in [('GOOGLE_CLIENT_ID', client), ('GOOGLE_CLIENT_SECRET', secret)] if not value]}))
        return 1
    if not client.endswith('.apps.googleusercontent.com'):
        print(json.dumps({'applied': False, 'reason': 'Invalid Google Web OAuth client ID format.'}))
        return 1
    config = admin.request('/config/auth')
    urls = [url.strip() for url in (config.get('uri_allow_list') or '').split(',') if url.strip()]
    for origin in ['https://kumeelalnahab.com', 'https://www.kumeelalnahab.com']:
        if origin + '/member' not in urls:
            urls.append(origin + '/member')
    if not args.apply:
        print(json.dumps({'ready': True, 'applied': False}))
        return 0
    admin.request('/config/auth', {'external_google_enabled': True, 'external_google_client_id': client,
                                 'external_google_secret': secret, 'uri_allow_list': ','.join(urls)}, 'PATCH')
    verified = admin.request('/config/auth')
    ok = verified.get('external_google_enabled') is True and verified.get('external_google_client_id') == client
    print(json.dumps({'applied': True, 'configuration_verified': ok, 'interactive_sign_in_verified': False}))
    return 0 if ok else 1


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except urllib.error.HTTPError as error:
        print(json.dumps({'applied': False, 'http_status': error.code}))
        raise SystemExit(1)
    except (KeyError, OSError, ValueError):
        print(json.dumps({'applied': False, 'reason': 'Missing management credential or configuration connection failed.'}))
        raise SystemExit(1)
