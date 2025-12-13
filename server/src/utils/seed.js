import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import Faculty from '../models/Faculty.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminEmail = process.env.ADMIN_SEED_EMAIL || 'admin@multaqa.mr';
    const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'admin123';
    const adminUsername = process.env.ADMIN_SEED_USERNAME || 'admin';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const admin = await User.create({
        email: adminEmail,
        passwordHash,
        username: adminUsername,
        role: 'admin',
        emailVerified: true
      });

      await Profile.create({
        userId: admin._id,
        displayName: 'Administrator'
      });

      console.log('Admin user created successfully');
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
    } else {
      console.log('Admin user already exists');
    }

    const facultyCount = await Faculty.countDocuments();
    if (facultyCount === 0) {
      const faculties = [
        { nameAr: 'كلية العلوم', nameFr: 'Faculté des Sciences' },
        { nameAr: 'كلية الآداب والعلوم الإنسانية', nameFr: 'Faculté des Lettres et Sciences Humaines' },
        { nameAr: 'كلية العلوم القانونية والاقتصادية', nameFr: 'Faculté des Sciences Juridiques et Économiques' },
        { nameAr: 'كلية الطب', nameFr: 'Faculté de Médecine' },
        { nameAr: 'المدرسة العليا للتعليم', nameFr: 'École Normale Supérieure' },
        { nameAr: 'كلية علوم وتقنيات الهندسة', nameFr: 'Faculté des Sciences et Techniques' }
      ];

      await Faculty.insertMany(faculties);
      console.log('Faculties seeded successfully');
    } else {
      console.log('Faculties already exist');
    }

    console.log('Database seeding completed');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
