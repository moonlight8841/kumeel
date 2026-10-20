"""Require email confirmation and disable anonymous Auth signups."""
import json
import urllib.error
from importlib.util import module_from_spec, spec_from_file_location

spec = spec_from_file_location('admin', 'scripts/supabase-admin.py')
admin = module_from_spec(spec)
spec.loader.exec_module(admin)
if __name__ == '__main__':
    try:
        admin.request('/config/auth', {'mailer_autoconfirm': False, 'external_anonymous_users_enabled': False}, 'PATCH')
        config = admin.request('/config/auth')
        checks = {'email_confirmation_required': config.get('mailer_autoconfirm') is False,
                  'anonymous_signups_disabled': config.get('external_anonymous_users_enabled') is False}
        print(json.dumps(checks))
        raise SystemExit(0 if all(checks.values()) else 1)
    except urllib.error.HTTPError as error:
        print(json.dumps({'updated': False, 'http_status': error.code}))
        raise SystemExit(1)
    except (KeyError, OSError, ValueError):
        print(json.dumps({'updated': False, 'reason': 'Management credential or connection unavailable.'}))
        raise SystemExit(1)
