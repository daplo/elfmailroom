"""Export only public build settings on the VPS, or build the image on CI."""
import json
import subprocess
import sys

PUBLIC_BUILD_ARGS = (
    'VITE_SITE_URL', 'VITE_BUSINESS_NAME', 'VITE_BUSINESS_COUNTRY',
    'VITE_BUSINESS_ADDRESS', 'VITE_BUSINESS_ABN', 'VITE_SUPPORT_EMAIL',
    'VITE_PRIVACY_RETENTION', 'VITE_PRIVACY_PROVIDERS', 'VITE_GOOGLE_ANALYTICS_ID',
)
IMAGE = 'elfmailroom:production'


def export_config():
    # The resolved runtime environment is inspected only on the VPS, never exported.
    config = json.loads(subprocess.check_output([
        'docker', 'compose', '--env-file', '.env', '-f', 'compose.prod.yaml',
        'config', '--format', 'json',
    ], text=True))
    args = config['services']['app']['build']['args']
    platform = subprocess.check_output([
        'docker', 'version', '--format', '{{.Server.Os}}/{{.Server.Arch}}',
    ], text=True).strip()
    return {'platform': platform, 'args': {key: args.get(key) or '' for key in PUBLIC_BUILD_ARGS}}


def build_command(config, revision):
    if config['platform'] not in ('linux/amd64', 'linux/arm64'):
        raise ValueError('Unsupported production Docker architecture')
    if len(revision) != 40 or any(c not in '0123456789abcdef' for c in revision):
        raise ValueError('Expected a full tested commit SHA')
    if set(config['args']) != set(PUBLIC_BUILD_ARGS):
        raise ValueError('Unexpected public build arguments')
    command = ['docker', 'build', '--pull', '--platform', config['platform'],
               '--tag', IMAGE, '--label', 'org.opencontainers.image.revision=' + revision]
    for key in PUBLIC_BUILD_ARGS:
        value = config['args'][key]
        if not isinstance(value, str):
            raise ValueError('Build arguments must be strings')
        command.extend(['--build-arg', key + '=' + value])
    return command + ['.']


if __name__ == '__main__':
    if sys.argv[1] == 'export':
        print(json.dumps(export_config()))
    elif sys.argv[1] == 'build':
        with open(sys.argv[2], encoding='utf-8') as source:
            command = build_command(json.load(source), sys.argv[3])
        subprocess.run(command, check=True)
    else:
        raise ValueError('Expected export or build')
