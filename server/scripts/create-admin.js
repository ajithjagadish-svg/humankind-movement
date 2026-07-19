// One-time (or reusable, to reset a password) script to create/update the
// single admin account. Not exposed as a route - run it locally or via
// `doctl apps run` against the deployed environment when needed.
//
// Usage:
//   node scripts/create-admin.js you@example.com "your password"
// or, without args, it prompts for both interactively.

require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const AdminUser = require('../models/AdminUser');

function prompt(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (!hidden) {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
      return;
    }
    // Minimal masked input, no extra dependency.
    const stdin = process.stdin;
    process.stdout.write(question);
    let value = '';
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (char) => {
      if (char === '\n' || char === '\r' || char === '') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        rl.close();
        resolve(value.trim());
      } else if (char === '') {
        process.exit(1);
      } else if (char === '') {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  const [, , argEmail, argPassword] = process.argv;

  const email = (argEmail || (await prompt('Admin email: '))).trim().toLowerCase();
  const password = argPassword || (await prompt('Admin password: ', { hidden: true }));

  if (!email || !password || password.length < 8) {
    console.error('Email and a password of at least 8 characters are required.');
    process.exit(1);
  }

  await connectDB();

  const passwordHash = await AdminUser.hashPassword(password);
  const user = await AdminUser.findOneAndUpdate(
    { email },
    { email, passwordHash },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`Admin user ready: ${user.email}`);
  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
