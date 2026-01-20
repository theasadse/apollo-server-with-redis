import { db } from "./db/index.js";
import { users } from "./db/schema.js";

async function seed1000Users() {
  try {
    console.log("🌱 Starting to seed 1000 users...");
    console.log("⏳ This may take a moment...\n");

    // Generate 1000 users with unique emails
    const usersToInsert = Array.from({ length: 1000 }, (_, i) => {
      const num = i + 1;
      const randomDomain = ["demo", "example", "test", "user", "account"][
        Math.floor(Math.random() * 5)
      ];
      const randomSuffix = Math.random().toString(36).substring(2, 8);

      return {
        name: `User ${num}`,
        email: `user${num}.${randomDomain}${randomSuffix}@${randomDomain}.com`,
        password: `password_${num}`,
      };
    });

    // Insert in batches of 10 to avoid overwhelming the database
    const batchSize = 10;
    let insertedCount = 0;

    for (let i = 0; i < usersToInsert.length; i += batchSize) {
      const batch = usersToInsert.slice(i, i + batchSize);
      const result = await db.insert(users).values(batch).returning();
      insertedCount += result.length;

      const progress = Math.round((insertedCount / usersToInsert.length) * 100);
      if (progress % 10 === 0 || progress === 100) {
        console.log(`✅ Inserted ${insertedCount}/1000 users (${progress}%)`);
      }
    }

    console.log("\n🎉 Successfully seeded 1000 users!");
    console.log("📊 Sample emails generated:");
    usersToInsert.slice(0, 5).forEach((user) => {
      console.log(`   • ${user.email}`);
    });
    console.log("   ...");
    usersToInsert.slice(-5).forEach((user) => {
      console.log(`   • ${user.email}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding users:", error);
    process.exit(1);
  }
}

seed1000Users();
