import { db } from "./db";
import { users, profiles, photos } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const sampleProfiles = [
  // Women (6)
  {
    firstName: "Sofia",
    lastName: "Martinez",
    email: "sofia.martinez@fallonyou.demo",
    bio: "Amante de la música latina y los viajes. Buscando alguien con quien bailar salsa bajo las estrellas.",
    age: 26,
    gender: "female",
    preference: "men",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80",
    location: "Madrid, España"
  },
  {
    firstName: "Emma",
    lastName: "Johnson",
    email: "emma.johnson@fallonyou.demo",
    bio: "Coffee lover, book worm, and adventure seeker. Looking for someone to explore the world with.",
    age: 28,
    gender: "female",
    preference: "men",
    photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&auto=format&fit=crop&q=80",
    location: "New York, USA"
  },
  {
    firstName: "Camille",
    lastName: "Dubois",
    email: "camille.dubois@fallonyou.demo",
    bio: "Artiste passionnée, j'adore le vin et les conversations profondes. Cherche quelqu'un d'authentique.",
    age: 24,
    gender: "female",
    preference: "men",
    photo: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80",
    location: "Paris, France"
  },
  {
    firstName: "Isabella",
    lastName: "Rossi",
    email: "isabella.rossi@fallonyou.demo",
    bio: "Yoga instructor and wellness enthusiast. Looking for positive vibes and genuine connections.",
    age: 29,
    gender: "female",
    preference: "everyone",
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
    location: "Barcelona, España"
  },
  {
    firstName: "Luna",
    lastName: "García",
    email: "luna.garcia@fallonyou.demo",
    bio: "Fotógrafa profesional. Me encanta capturar momentos únicos. ¿Quieres ser parte de mi próxima aventura?",
    age: 25,
    gender: "female",
    preference: "men",
    photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
    location: "México City, México"
  },
  {
    firstName: "Olivia",
    lastName: "Smith",
    email: "olivia.smith@fallonyou.demo",
    bio: "Tech entrepreneur by day, salsa dancer by night. Looking for someone who can keep up!",
    age: 27,
    gender: "female",
    preference: "men",
    photo: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600&auto=format&fit=crop&q=80",
    location: "Los Angeles, USA"
  },
  // Men (6)
  {
    firstName: "Carlos",
    lastName: "Rodriguez",
    email: "carlos.rodriguez@fallonyou.demo",
    bio: "Chef profesional con pasión por la cocina mediterránea. Busco a alguien para compartir cenas románticas.",
    age: 30,
    gender: "male",
    preference: "women",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
    location: "Valencia, España"
  },
  {
    firstName: "James",
    lastName: "Williams",
    email: "james.williams@fallonyou.demo",
    bio: "Musician and songwriter. Looking for someone who appreciates good music and spontaneous adventures.",
    age: 28,
    gender: "male",
    preference: "women",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80",
    location: "London, UK"
  },
  {
    firstName: "Pierre",
    lastName: "Laurent",
    email: "pierre.laurent@fallonyou.demo",
    bio: "Architecte passionné par le design. J'aime les voyages culturels et les bonnes conversations.",
    age: 32,
    gender: "male",
    preference: "women",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&auto=format&fit=crop&q=80",
    location: "Lyon, France"
  },
  {
    firstName: "Marco",
    lastName: "Bianchi",
    email: "marco.bianchi@fallonyou.demo",
    bio: "Fitness coach and outdoor enthusiast. Looking for someone to share hiking trails and healthy meals.",
    age: 29,
    gender: "male",
    preference: "women",
    photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&auto=format&fit=crop&q=80",
    location: "Rome, Italy"
  },
  {
    firstName: "Diego",
    lastName: "López",
    email: "diego.lopez@fallonyou.demo",
    bio: "Ingeniero de software y amante de los videojuegos. Busco alguien divertida para compartir risas.",
    age: 26,
    gender: "male",
    preference: "women",
    photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80",
    location: "Buenos Aires, Argentina"
  },
  {
    firstName: "Alexander",
    lastName: "Brown",
    email: "alexander.brown@fallonyou.demo",
    bio: "Travel photographer capturing life's beautiful moments. Let's create memories together.",
    age: 31,
    gender: "male",
    preference: "everyone",
    photo: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=600&auto=format&fit=crop&q=80",
    location: "Sydney, Australia"
  }
];

export async function seedProfiles() {
  console.log("Starting to seed profiles...");
  
  const hashedPassword = await bcrypt.hash("demo123456", 10);
  
  for (const profile of sampleProfiles) {
    try {
      // Check if user already exists
      const existingUsers = await db.select().from(users).where(
        eq(users.email, profile.email)
      );
      
      if (existingUsers.length > 0) {
        console.log(`User ${profile.email} already exists, skipping...`);
        continue;
      }
      
      // Create user
      const [newUser] = await db.insert(users).values({
        email: profile.email,
        password: hashedPassword,
        firstName: profile.firstName,
        lastName: profile.lastName,
        profileImageUrl: profile.photo,
        location: profile.location,
        isVerified: "true",
      }).returning();
      
      console.log(`Created user: ${newUser.firstName} ${newUser.lastName}`);
      
      // Create profile
      await db.insert(profiles).values({
        userId: newUser.id,
        bio: profile.bio,
        age: profile.age,
        gender: profile.gender,
        preference: profile.preference,
      });
      
      console.log(`Created profile for: ${newUser.firstName}`);
      
      // Create photo
      await db.insert(photos).values({
        userId: newUser.id,
        url: profile.photo,
        type: "image",
      });
      
      console.log(`Created photo for: ${newUser.firstName}`);
      
    } catch (error) {
      console.error(`Error creating profile for ${profile.email}:`, error);
    }
  }
  
  console.log("Finished seeding profiles!");
}

// Run immediately when imported as main
seedProfiles().then(() => {
  console.log("Seed complete!");
  process.exit(0);
}).catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
