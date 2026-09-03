import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import User, { UserRole, UserStatus } from '../models/User';
import Incident, { IncidentStatus, SeverityLevel, DisasterType } from '../models/Incident';
import Resource, { ResourceType, ResourceStatus } from '../models/Resource';
import Allocation from '../models/Allocation';
import { sequelize } from './db';

function parseCSV(filePath: string): string[][] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const result: string[][] = [];
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    
    const row: string[] = [];
    let insideQuote = false;
    let current = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        row.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current);
    result.push(row.map(val => val.replace(/^"|"$/g, '').trim()));
  }
  return result;
}

// Parse "02-Mar" diagnosed date formats into real Date objects
function parseDiagnosedDate(dateStr: string): Date {
  try {
    const parts = dateStr.split('-');
    if (parts.length < 2) return new Date();
    
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1].toLowerCase();
    
    const months: { [key: string]: number } = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    
    const month = months[monthStr.substring(0, 3)] ?? 2; // Default to March
    const originalDate = new Date(2026, month, day);

    // Shift date dynamically so that the dataset's final date (March 26, 2026) aligns with the current date
    const targetEndDate = new Date();
    targetEndDate.setHours(12, 0, 0, 0); // Normalize time
    const sourceEndDate = new Date(2026, 2, 26, 12, 0, 0, 0);
    
    const timeDiff = targetEndDate.getTime() - sourceEndDate.getTime();
    return new Date(originalDate.getTime() + timeDiff);
  } catch {
    return new Date();
  }
}

export const seedDatabase = async () => {
  try {
    console.log('Clearing existing database records for fresh datasets seed...');
    // Clear allocations first to respect foreign keys
    await Allocation.destroy({ where: {} });
    await Incident.destroy({ where: {} });
    await Resource.destroy({ where: {} });
    await User.destroy({ where: {} });

    console.log('Seeding database with AP & Telangana records from local datasets...');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password', salt);

    // 1. Seed standard role accounts
    const admin = await User.create({
      firstName: 'Jagapathi',
      lastName: 'Babu',
      email: 'jagapathi@aid-dras.gov',
      passwordHash,
      phoneNumber: '+919876543210',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      district: 'Hyderabad',
      state: 'Telangana',
    });

    const volunteer = await User.create({
      firstName: 'Ravi',
      lastName: 'Teja',
      email: 'ravi.vol@aid-dras.gov',
      passwordHash,
      phoneNumber: '+919998887770',
      role: UserRole.VOLUNTEER,
      status: UserStatus.ACTIVE,
      availability: 'AVAILABLE',
      district: 'Warangal',
      state: 'Telangana',
    });

    const hospitalAdmin = await User.create({
      firstName: 'Dr. Srinivas',
      lastName: 'Rao',
      email: 'srinivas.hosp@aid-dras.gov',
      passwordHash,
      phoneNumber: '+918887776660',
      role: UserRole.HOSPITAL,
      status: UserStatus.ACTIVE,
      district: 'Visakhapatnam',
      state: 'Andhra Pradesh',
    });

    const citizen = await User.create({
      firstName: 'Kalyan',
      lastName: 'Ram',
      email: 'kalyan.cit@aid-dras.gov',
      passwordHash,
      phoneNumber: '+917776665550',
      role: UserRole.CITIZEN,
      status: UserStatus.ACTIVE,
      district: 'Guntur',
      state: 'Andhra Pradesh',
    });

    const officer = await User.create({
      firstName: 'Kalyan',
      lastName: 'Officer',
      email: 'officer@aid-dras.gov',
      passwordHash,
      phoneNumber: '+917776665551',
      role: UserRole.DISASTER_OFFICER,
      status: UserStatus.ACTIVE,
      district: 'Hyderabad',
      state: 'Telangana',
    });

    console.log('User roles seeded.');

    // Extract raw IDs safely
    const adminId = admin.id || admin.dataValues?.id;
    const hospitalAdminId = hospitalAdmin.id || hospitalAdmin.dataValues?.id;
    const citizenId = citizen.id || citizen.dataValues?.id;

    // 2. Seed Hospitals from hospitals.csv
    const hospitalsCSVPath = path.resolve(__dirname, '../../../datasets/hospitals.csv');
    let hospitalCount = 0;
    if (fs.existsSync(hospitalsCSVPath)) {
      const rows = parseCSV(hospitalsCSVPath);
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 10) continue;
        const name = row[1];
        const district = row[3] || 'Hyderabad';
        const state = row[9] || 'Telangana';
        const lat = parseFloat(row[5]);
        const lon = parseFloat(row[6]);
        
        // Skip NaN and placeholder (0,0) coordinates
        if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) continue;
        
        try {
          await Resource.create({
            ownerId: hospitalAdminId,
            owner_id: hospitalAdminId,
            type: ResourceType.HOSPITAL_BED,
            quantity: Math.floor(Math.random() * 200) + 100,
            status: ResourceStatus.AVAILABLE,
            geom: {
              type: 'Point',
              coordinates: [lon, lat],
            },
            name: name,
            icuBeds: Math.floor(Math.random() * 30) + 10,
            doctorsCount: Math.floor(Math.random() * 50) + 20,
            ambulancesCount: Math.floor(Math.random() * 8) + 2,
            occupancy: Math.floor(Math.random() * 50) + 20,
            district: district,
            state: state,
          });
          hospitalCount++;
        } catch (e: any) {
          throw new Error(`Failed to create Hospital Resource at row ${i} (${name}): ${e.message}. hospitalAdminId = ${hospitalAdminId}`);
        }
      }
    }

    // Supplement hospitals list dynamically to show multiple hospitals in major regions
    if (hospitalCount < 40) {
      const extraHospitals = [
        { name: 'KIMS Hospital', district: 'Secunderabad', state: 'Telangana', lat: 17.4334, lon: 78.4871 },
        { name: 'Yashoda Hospital', district: 'Somajiguda', state: 'Telangana', lat: 17.4212, lon: 78.4582 },
        { name: 'Care Hospital', district: 'Banjara Hills', state: 'Telangana', lat: 17.4143, lon: 78.4484 },
        { name: 'Rainbow Childrens Hospital', district: 'Banjara Hills', state: 'Telangana', lat: 17.4190, lon: 78.4475 },
        { name: 'Continental Hospital', district: 'Gachibowli', state: 'Telangana', lat: 17.4234, lon: 78.3489 },
        { name: 'Medicover Hospital', district: 'Madhapur', state: 'Telangana', lat: 17.4475, lon: 78.3814 },
        { name: 'KIMS ICU Center', district: 'Secunderabad', state: 'Telangana', lat: 17.4390, lon: 78.4980 },
        { name: 'Apollo Trauma Hospital', district: 'Jubilee Hills', state: 'Telangana', lat: 17.4150, lon: 78.4062 },
        { name: 'NIMS Emergency Annex', district: 'Punjagutta', state: 'Telangana', lat: 17.4260, lon: 78.4530 },
        { name: 'Osmania General Wing B', district: 'Hyderabad', state: 'Telangana', lat: 17.3800, lon: 78.4800 },
        { name: 'Vijayawada Trauma Care', district: 'Vijayawada', state: 'Andhra Pradesh', lat: 16.5062, lon: 80.6480 },
        { name: 'Guntur General Hospital', district: 'Guntur', state: 'Andhra Pradesh', lat: 16.3067, lon: 80.4365 },
        { name: 'Vizag Emergency Center', district: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lon: 83.2185 },
        { name: 'King George Hospital', district: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.7124, lon: 83.3156 },
        { name: 'Tirupati General ER', district: 'Chittoor', state: 'Andhra Pradesh', lat: 13.6284, lon: 79.4192 },
        { name: 'Nellore Trauma Center', district: 'Nellore', state: 'Andhra Pradesh', lat: 14.4426, lon: 79.9865 },
        { name: 'Warangal Multi-specialty', district: 'Warangal', state: 'Telangana', lat: 17.9689, lon: 79.5941 },
        { name: 'Nizamabad Hospital', district: 'Nizamabad', state: 'Telangana', lat: 18.6725, lon: 78.0941 },
        { name: 'Khammam ER Unit', district: 'Khammam', state: 'Telangana', lat: 17.2473, lon: 80.1514 },
        { name: 'Karimnagar District Hospital', district: 'Karimnagar', state: 'Telangana', lat: 18.4386, lon: 79.1288 }
      ];

      for (const hosp of extraHospitals) {
        try {
          await Resource.create({
            ownerId: hospitalAdminId,
            owner_id: hospitalAdminId,
            type: ResourceType.HOSPITAL_BED,
            quantity: Math.floor(Math.random() * 200) + 100,
            status: ResourceStatus.AVAILABLE,
            geom: {
              type: 'Point',
              coordinates: [hosp.lon, hosp.lat],
            },
            name: hosp.name,
            icuBeds: Math.floor(Math.random() * 30) + 10,
            doctorsCount: Math.floor(Math.random() * 50) + 20,
            ambulancesCount: Math.floor(Math.random() * 8) + 2,
            occupancy: Math.floor(Math.random() * 50) + 20,
            district: hosp.district,
            state: hosp.state,
          });
          hospitalCount++;
        } catch (e: any) {
          console.error(`Failed to create extra hospital ${hosp.name}:`, e.message);
        }
      }
    }
    console.log(`Seeded ${hospitalCount} hospitals from dataset.`);

    // 3. Seed Incidents from patients_data.csv
    const patientsCSVPath = path.resolve(__dirname, '../../../datasets/patients_data.csv');
    let incidentCount = 0;
    if (fs.existsSync(patientsCSVPath)) {
      const rows = parseCSV(patientsCSVPath);
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 11) continue;
        const diagnosedDate = row[1] || '15-Mar';
        const notes = row[8] || 'Emergency incident reported.';
        const city = row[4] || 'Hyderabad';
        const state = row[5] || 'Telangana';
        let lat = parseFloat(row[9]);
        let lon = parseFloat(row[10]);
        
        // Correct Pakistan coordinate lookup mistake in the patients dataset (25.38, 68.37 is Pakistan, not India)
        if (city === 'Hyderabad' && state === 'Telangana' && lat > 24 && lat < 26 && lon > 67 && lon < 69) {
          lat = 17.3850 + (Math.random() - 0.5) * 0.08;
          lon = 78.4867 + (Math.random() - 0.5) * 0.08;
        }

        // Correct bad coordinates in the patients dataset (e.g. Krishna has [19.03, 18.03] which is in Africa)
        if (city === 'Krishna' || lat < 8.0 || lat > 38.0 || lon < 68.0 || lon > 98.0) {
          if (city === 'Krishna') {
            lat = 16.5062 + (Math.random() - 0.5) * 0.05;
            lon = 80.6480 + (Math.random() - 0.5) * 0.05;
          } else {
            lat = 17.3850 + (Math.random() - 0.5) * 0.1;
            lon = 78.4867 + (Math.random() - 0.5) * 0.1;
          }
        }

        // Skip NaN and placeholder (0,0) coordinates
        if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) continue;
        
        const severities = [SeverityLevel.LOW, SeverityLevel.MEDIUM, SeverityLevel.HIGH, SeverityLevel.CRITICAL];
        const severity = severities[Math.floor(Math.random() * severities.length)];
        
        const statuses = [IncidentStatus.REPORTED, IncidentStatus.VERIFIED, IncidentStatus.DISPATCHED];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        const incidentDate = parseDiagnosedDate(diagnosedDate);
        
        try {
          await Incident.create({
            reporterId: citizenId,
            reporter_id: citizenId,
            title: `Health Alert - ${city}`,
            description: notes,
            severity: severity,
            status: status,
            disasterType: DisasterType.OTHER,
            geom: {
              type: 'Point',
              coordinates: [lon, lat],
            },
            district: city,
            state: state,
            assignedHospital: 'SVIMS Tirupati',
            assignedVolunteer: 'Ravi Teja',
            estimatedDamage: Math.floor(Math.random() * 500000) + 50000,
            createdAt: incidentDate,
            updatedAt: incidentDate,
          });
          incidentCount++;
        } catch (e: any) {
          throw new Error(`Failed to create Incident at row ${i} (${city}): ${e.message}. citizenId = ${citizenId}`);
        }
      }
    }
    console.log(`Seeded ${incidentCount} incidents from dataset.`);

    // 4. Seed Shelters & Resources from india_places.csv
    const placesCSVPath = path.resolve(__dirname, '../../../datasets/india_places.csv');
    let shelterCount = 0;
    let resourceCount = 0;
    if (fs.existsSync(placesCSVPath)) {
      const rows = parseCSV(placesCSVPath);
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 7) continue;
        const state = row[0] || 'Telangana';
        const district = row[1] || 'Hyderabad';
        const city = row[2] || 'Hyderabad';
        const lat = parseFloat(row[5]);
        const lon = parseFloat(row[6]);
        
        // Skip NaN and placeholder (0,0) coordinates
        if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) continue;
        
        try {
          await Resource.create({
            ownerId: adminId,
            owner_id: adminId,
            type: ResourceType.SHELTER_CAPACITY,
            quantity: Math.floor(Math.random() * 400) + 200,
            status: ResourceStatus.AVAILABLE,
            geom: {
              type: 'Point',
              coordinates: [lon, lat],
            },
            name: `${city} Emergency Shelter`,
            icuBeds: 0,
            doctorsCount: Math.floor(Math.random() * 4) + 1,
            ambulancesCount: Math.floor(Math.random() * 2) + 1,
            occupancy: Math.floor(Math.random() * 80) + 20,
            electricityStatus: 'CONNECTED',
            medicalFacilityStatus: 'FUNCTIONAL',
            district: district === '-' ? city : district,
            state: state,
          });
          shelterCount++;
        } catch (e: any) {
          throw new Error(`Failed to create Shelter Resource at row ${i} (${city}): ${e.message}. adminId = ${adminId}`);
        }

        if (i % 3 === 0) {
          const resourceTypes = [ResourceType.FOOD, ResourceType.WATER, ResourceType.MEDICINE, ResourceType.AMBULANCE, ResourceType.FIRE_TRUCK];
          const type = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
          const names = {
            [ResourceType.FOOD]: `${city} Food Supplies Depot`,
            [ResourceType.WATER]: `${city} Clean Water Station`,
            [ResourceType.MEDICINE]: `${city} Medical Storehouse`,
            [ResourceType.AMBULANCE]: `${city} Ambulance Unit`,
            [ResourceType.FIRE_TRUCK]: `${city} Fire Station Unit`
          };
          
          try {
            await Resource.create({
              ownerId: adminId,
              owner_id: adminId,
              type: type,
              quantity: (type === ResourceType.AMBULANCE || type === ResourceType.FIRE_TRUCK) ? Math.floor(Math.random() * 5) + 2 : Math.floor(Math.random() * 1000) + 500,
              status: ResourceStatus.AVAILABLE,
              geom: {
                type: 'Point',
                coordinates: [lon, lat],
              },
              name: names[type],
              district: district === '-' ? city : district,
              state: state,
            });
            resourceCount++;
          } catch (e: any) {
            throw new Error(`Failed to create Depot Resource at row ${i} (${city}): ${e.message}. adminId = ${adminId}`);
          }
        }
      }
    }
    console.log(`Seeded ${shelterCount} shelters and ${resourceCount} supply depots from places dataset.`);
    
    // 5. Seed System Notifications
    console.log('Seeding system notifications table...');
    await sequelize.query(`DROP TABLE IF EXISTS system_notifications;`);
    await sequelize.query(`
      CREATE TABLE system_notifications (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        type VARCHAR(50) DEFAULT 'INFO',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);
    
    // Clear notifications log to allow real-time events to build up naturally
    await sequelize.query(`TRUNCATE TABLE system_notifications;`);
    console.log('System notifications seeded.');
    console.log('All dataset-driven database records seeded successfully.');
  } catch (error) {
    console.error('Seeder execution failed:', error);
    throw error;
  }
};
