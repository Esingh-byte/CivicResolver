const Department = require('../models/Department');
const User = require('../models/User');

const departments = [
  {
    name: 'Public Works Department',
    code: 'PWD',
    description: 'Handles roads, bridges, and public infrastructure',
    categories: ['Road Damage', 'Pothole', 'Bridge Issue'],
    head: 'Chief Engineer',
    contactEmail: 'pwd@civicresolver.gov.in',
    contactPhone: '+91-9876543001'
  },
  {
    name: 'Sanitation Department',
    code: 'SAN',
    description: 'Handles garbage collection, drainage, and sewage',
    categories: ['Garbage', 'Drainage', 'Sewage', 'Sanitation'],
    head: 'Sanitation Officer',
    contactEmail: 'sanitation@civicresolver.gov.in',
    contactPhone: '+91-9876543002'
  },
  {
    name: 'Water Supply Department',
    code: 'WSD',
    description: 'Handles water supply, leakage, and pipeline issues',
    categories: ['Water Leakage', 'Pipeline Burst', 'Water Supply'],
    head: 'Water Engineer',
    contactEmail: 'water@civicresolver.gov.in',
    contactPhone: '+91-9876543003'
  },
  {
    name: 'Electricity Department',
    code: 'ELEC',
    description: 'Handles street lights, power outages, and electrical faults',
    categories: ['Street Light', 'Power Outage', 'Electricity Fault'],
    head: 'Electrical Engineer',
    contactEmail: 'electricity@civicresolver.gov.in',
    contactPhone: '+91-9876543004'
  },
  {
    name: 'Health Department',
    code: 'HEALTH',
    description: 'Handles hospital and medical emergency issues',
    categories: ['Hospital', 'Medical Emergency'],
    head: 'Chief Medical Officer',
    contactEmail: 'health@civicresolver.gov.in',
    contactPhone: '+91-9876543005'
  },
  {
    name: 'Transport Department',
    code: 'TRANS',
    description: 'Handles traffic management, parking, and public transport',
    categories: ['Traffic', 'Parking', 'Public Transport'],
    head: 'Transport Commissioner',
    contactEmail: 'transport@civicresolver.gov.in',
    contactPhone: '+91-9876543006'
  }
];

const seedDepartments = async () => {
  try {
    const count = await Department.countDocuments();
    if (count === 0) {
      await Department.insertMany(departments);
      console.log('✅ CivicResolver Departments seeded successfully');
    }

    const pwdDept = await Department.findOne({ code: 'PWD' });

    // Normalize any legacy users in the database
    const legacyUsers = await User.find({ role: { $in: ['citizen', 'officer', 'admin'] } });
    for (const u of legacyUsers) {
      u.role = User.normalizeRole(u.role);
      await u.save();
    }

    // Seed default accounts for development/testing if they don't already exist
    const defaultAccounts = [
      {
        name: 'System Administrator',
        email: process.env.ADMIN_EMAIL || 'admin@civicresolver.com',
        password: process.env.ADMIN_PASSWORD || 'Admin@123',
        role: 'SYSTEM_ADMIN',
        phone: '+91-9876500001'
      },
      {
        name: 'Super Administrator',
        email: 'superadmin@civicresolver.com',
        password: process.env.ADMIN_PASSWORD || 'Admin@123',
        role: 'SUPER_ADMIN',
        phone: '+91-9876500002'
      },
      {
        name: 'Rajesh Sharma (Municipal Officer)',
        email: 'officer@civicresolver.com',
        password: 'Officer@123',
        role: 'MUNICIPAL_OFFICER',
        department: pwdDept ? pwdDept._id : null,
        ward: 'Ward 12 - Central Zone',
        phone: '+91-9876500003'
      },
      {
        name: 'Vikram Patel (Field Worker)',
        email: 'worker@civicresolver.com',
        password: 'Worker@123',
        role: 'FIELD_WORKER',
        department: pwdDept ? pwdDept._id : null,
        ward: 'Ward 12 - Central Zone',
        phone: '+91-9876500004'
      }
    ];

    for (const acct of defaultAccounts) {
      const exists = await User.findOne({ email: acct.email });
      if (!exists) {
        await User.create(acct);
        console.log(`✅ Seeded ${acct.role}: ${acct.email}`);
      }
    }
  } catch (error) {
    console.error('Error seeding CivicResolver data:', error.message);
  }
};

module.exports = seedDepartments;
