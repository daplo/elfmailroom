import readline from 'node:readline';
import {Writable} from 'node:stream';
import {passwordHash} from './admin.js';
if(!process.stdin.isTTY){console.error('Run this command in an interactive terminal.');process.exit(1);}
process.stdout.write('Choose an admin password (at least 16 characters; input is hidden): ');
const output=new Writable({write(chunk,encoding,callback){callback();}});
const reader=readline.createInterface({input:process.stdin,output,terminal:true});
reader.question('',value=>{reader.close();process.stdout.write('\n');if(value.length<16){console.error('Use at least 16 characters.');process.exitCode=1;return;}console.log('Put this in your root .env:\nADMIN_PASSWORD_HASH='+passwordHash(value));});
