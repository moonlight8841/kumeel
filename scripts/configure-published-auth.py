"""Add the deployed origin without removing existing Auth redirect URLs."""
import json
import urllib.error
from importlib.util import spec_from_file_location, module_from_spec

spec = spec_from_file_location('admin', 'scripts/supabase-admin.py')
admin = module_from_spec(spec)
spec.loader.exec_module(admin)
origin = 'https://kumeelalnahab.com'
try:
    config = admin.request('/config/auth')
    urls = [item.strip() for item in (config.get('uri_allow_list') or '').split(',') if item.strip()]
    for target in [origin + '/admin', origin + '/admin?reset=1', origin + '/member']:
        if target not in urls:
            urls.append(target)
    admin.request('/config/auth', {'site_url': origin, 'uri_allow_list': ','.join(urls)}, 'PATCH')
    verified = admin.request('/config/auth')
    print(json.dumps({'updated': True, 'site_url_matches': verified.get('site_url') == origin, 'redirect_allowed': origin + '/admin' in verified.get('uri_allow_list', '')}))
except urllib.error.HTTPError as error:
    print(json.dumps({'updated': False, 'status': error.code}))
except KeyError:
    print(json.dumps({'updated': False, 'reason': 'Management credential is not configured locally.'}))
