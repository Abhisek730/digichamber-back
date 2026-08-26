// Run with: npm run seed
// Wipes and recreates a demo workspace so the backend mirrors the frontend's old "Try Demo Mode".
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const Case = require('../models/Case');
const Hearing = require('../models/Hearing');
const Task = require('../models/Task');
const Reminder = require('../models/Reminder');
const FileRecord = require('../models/FileRecord');
const Activity = require('../models/Activity');
const Conversation = require('../models/Conversation');
const ClientChat = require('../models/ClientChat');
const Consent = require('../models/Consent');
const PrivacySettings = require('../models/PrivacySettings');

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

async function seed() {
  await connectDB();

  const demoEmail = 'demo@digichamber.in';
  console.log('Clearing any existing demo workspace...');
  const existing = await User.findOne({ email: demoEmail });
  if (existing) {
    const workspaceId = existing._id;
    await Promise.all([
      Case.deleteMany({ workspace: workspaceId }),
      Hearing.deleteMany({ workspace: workspaceId }),
      Task.deleteMany({ workspace: workspaceId }),
      Reminder.deleteMany({ workspace: workspaceId }),
      FileRecord.deleteMany({ workspace: workspaceId }),
      Activity.deleteMany({ workspace: workspaceId }),
      Conversation.deleteMany({ workspace: workspaceId }),
      ClientChat.deleteMany({ workspace: workspaceId }),
      Consent.deleteMany({ workspace: workspaceId }),
      PrivacySettings.deleteMany({ workspace: workspaceId }),
      User.deleteMany({ workspaceOwner: workspaceId }),
      User.deleteOne({ _id: workspaceId })
    ]);
  }

  console.log('Creating demo advocate...');
  const owner = await User.create({
    firstName: 'Arjun', lastName: 'Sharma',
    email: demoEmail, password: 'demo',
    bar: 'DL/2018/12345', role: 'advocate', plan: 'chamber', subscriptionPlan: 499
  });

  await Consent.create({ workspace: owner._id, user: owner._id });
  await PrivacySettings.create({ workspace: owner._id, dpoName: '' });

  console.log('Creating demo employees...');
  const priya = await User.create({
    firstName: 'Priya', lastName: 'Verma', dcId: 'EMP-DM01', password: 'demo123',
    role: 'employee', employeeRole: 'Paralegal', access: 'full', workspaceOwner: owner._id
  });
  const rohan = await User.create({
    firstName: 'Rohan', lastName: 'Mehta', dcId: 'EMP-DM02', password: 'demo456',
    role: 'employee', employeeRole: 'Junior Associate', access: 'full', workspaceOwner: owner._id
  });

  console.log('Creating demo cases...');
  const case1 = await Case.create({
    workspace: owner._id, createdBy: owner._id,
    number: 'CS/2026/001', year: 2026, title: 'Agarwal Properties vs. State', client: 'Agarwal Properties',
    clientEmail: 'contact@agarwalproperties.in', clientPhone: '+91 98765 43210',
    court: 'Delhi High Court', type: 'Civil', status: 'active', priority: 'high',
    notes: 'Property dispute case, next hearing pending.'
  });
  const case2 = await Case.create({
    workspace: owner._id, createdBy: owner._id,
    number: 'CS/2026/002', year: 2026, title: 'State vs. Sharma', client: 'Rakesh Sharma',
    clientEmail: 'rakesh.sharma@example.com', clientPhone: '+91 91234 56789',
    court: 'Tis Hazari Court', type: 'Criminal', status: 'active', priority: 'medium',
    notes: 'Bail application filed, awaiting hearing date.'
  });

  console.log('Creating demo hearings, tasks, reminders...');
  await Hearing.create({
    workspace: owner._id, createdBy: owner._id, caseId: case1._id, caseTitle: case1.title, caseNumber: case1.number,
    date: daysAgo(-1), time: '10:30', courtRoom: 'Court No. 5', judge: 'Justice R. Mehta', purpose: 'Arguments'
  });
  await Hearing.create({
    workspace: owner._id, createdBy: owner._id, caseId: case2._id, caseTitle: case2.title, caseNumber: case2.number,
    date: daysAgo(-3), time: '11:00', courtRoom: 'Court No. 2', judge: 'Justice S. Rao', purpose: 'Bail hearing'
  });

  await Task.create({ workspace: owner._id, createdBy: owner._id, title: 'Prepare arguments for Agarwal case', priority: 'high', caseId: case1._id, due: daysAgo(-1) });
  await Task.create({ workspace: owner._id, createdBy: owner._id, title: 'File bail application documents', priority: 'medium', caseId: case2._id, due: daysAgo(-2) });

  await Reminder.create({ workspace: owner._id, createdBy: owner._id, title: 'Weekly case review meeting', date: daysAgo(-1), type: 'meeting', desc: 'Team sync at 4 PM' });

  console.log('Creating demo activity, chat, client chat...');
  await Activity.create({ workspace: owner._id, user: owner._id, text: 'New case added: ' + case1.title });
  await Activity.create({ workspace: owner._id, user: owner._id, text: 'New case added: ' + case2.title });

  const group = await Conversation.create({
    workspace: owner._id, type: 'group', participants: [owner._id, priya._id, rohan._id],
    messages: [
      { sender: owner._id, senderName: 'Arjun Sharma (Admin)', text: 'Welcome to the team chat, everyone!', time: new Date(daysAgo(-3)) },
      { sender: priya._id, senderName: 'Priya Verma', text: 'Thanks! Looking forward to working with everyone.', time: new Date(daysAgo(-3)) }
    ]
  });
  await Conversation.create({
    workspace: owner._id, type: 'direct', participants: [owner._id, priya._id],
    messages: [
      { sender: priya._id, senderName: 'Priya Verma', text: 'Could you grant me access to the Agarwal case?', time: new Date(daysAgo(-3)) },
      { sender: owner._id, senderName: 'Arjun Sharma (Admin)', text: 'Done — check your Cases tab.', time: new Date(daysAgo(-3)) }
    ]
  });

  await ClientChat.create({
    workspace: owner._id, clientName: case1.client, caseId: case1._id,
    messages: [
      { sender: 'client', text: 'Good morning, any update on the hearing date?', time: new Date() },
      { sender: 'advocate', text: 'Yes, scheduled for tomorrow at 10:30 AM in Court No. 5.', time: new Date() }
    ]
  });

  console.log('\nDemo workspace ready:');
  console.log('  Advocate login  -> email: demo@digichamber.in / password: demo');
  console.log('  Employee login  -> DC ID: EMP-DM01 / password: demo123 (Priya Verma)');
  console.log('  Employee login  -> DC ID: EMP-DM02 / password: demo456 (Rohan Mehta)');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
