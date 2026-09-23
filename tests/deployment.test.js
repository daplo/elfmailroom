import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

test('deployment exports only public settings and builds with literal arguments for the VPS architecture',()=>{
 const result=spawnSync('python3',['-c',String.raw`
import json, runpy
from unittest.mock import patch
module=runpy.run_path('scripts/deploy-image.py')
keys=module['PUBLIC_BUILD_ARGS']
values={key:'' for key in keys}
values['VITE_SITE_URL']='https://example.com'
values['VITE_BUSINESS_NAME']='A "quoted" name; $(echo not-executed)\nsecond line'
config={'services':{'app':{'build':{'args':{**values,'PRIVATE_TOKEN':'never-export-this'}},'environment':{'OPENAI_API_KEY':'never-export-this'}}}}
with patch('subprocess.check_output',side_effect=[json.dumps(config),'linux/amd64\n']):
 exported=module['export_config']()
assert exported=={'platform':'linux/amd64','args':values}
revision='a'*40
command=module['build_command'](exported,revision)
assert values['VITE_BUSINESS_NAME'] in [arg.split('=',1)[1] for arg in command if arg.startswith('VITE_BUSINESS_NAME=')]
assert command[command.index('--platform')+1]=='linux/amd64'
assert command[command.index('--label')+1].endswith(revision)
for bad in [dict(exported,platform='linux/unknown'),dict(exported,args={**values,'PRIVATE_TOKEN':'secret'})]:
 try: module['build_command'](bad,revision)
 except ValueError: pass
 else: raise AssertionError('Invalid build configuration accepted')
try: module['build_command'](exported,'main; echo bad')
except ValueError: pass
else: raise AssertionError('Invalid revision accepted')
print(json.dumps({'config':exported,'keys':keys}))
`],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 assert(!result.stdout.includes('never-export-this'));
 const{keys}=JSON.parse(result.stdout);
 const dockerfile=readFileSync(new URL('../Dockerfile',import.meta.url),'utf8');
 assert.deepEqual(keys,[...dockerfile.matchAll(/^ARG (VITE_\w+)/gm)].map(match=>match[1]));
});
