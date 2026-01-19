import { db } from "./db/index";
import { users, posts, comments } from "./db/schema";

async function seedDatabase() {
  try {
    console.log("🌱 Starting database seeding...");

    // Clear existing data
    await db.delete(comments);
    await db.delete(posts);
    await db.delete(users);

    // Create sample users
    const createdUsers = await db
      .insert(users)
      .values([
        {
          name: "Alice Johnson",
          email: "alice@example.com",
          password: "hashed_password_1",
        },
        {
          name: "Bob Smith",
          email: "bob@example.com",
          password: "hashed_password_2",
        },
        {
          name: "Charlie Brown",
          email: "charlie@example.com",
          password: "hashed_password_3",
        },
      ])
      .returning();

    console.log(`✅ Created ${createdUsers.length} users`);

    // Create sample posts
    const createdPosts = await db
      .insert(posts)
      .values([
        {
          title: "Getting Started with Apollo Server",
          content:
            "Learn how to build GraphQL APIs with Apollo Server. This is a comprehensive guide for beginners.",
          authorId: createdUsers[0].id,
          views: 150,
          likes: 45,
        },
        {
          title: "Drizzle ORM Tutorial",
          content:
            "Drizzle ORM provides type-safe SQL queries. Discover how to use it effectively in your projects.",
          authorId: createdUsers[0].id,
          views: 200,
          likes: 67,
        },
        {
          title: "Redis Caching Best Practices",
          content:
            "Learn how to implement efficient caching strategies using Redis in your applications.",
          authorId: createdUsers[1].id,
          views: 300,
          likes: 89,
        },
        {
          title: "GraphQL Schema Design",
          content:
            "Best practices for designing scalable GraphQL schemas that grow with your application.",
          authorId: createdUsers[1].id,
          views: 250,
          likes: 76,
        },
        {
          title: "Full Stack Development with TypeScript",
          content:
            "Build entire applications with TypeScript for better type safety and developer experience.",
          authorId: createdUsers[2].id,
          views: 180,
          likes: 52,
        },
      ])
      .returning();

    console.log(`✅ Created ${createdPosts.length} posts`);

    // Create sample comments
    const createdComments = await db
      .insert(comments)
      .values([
        {
          content: "Great tutorial! Very helpful for getting started.",
          authorId: createdUsers[1].id,
          postId: createdPosts[0].id,
        },
        {
          content: "I love the examples provided in this post.",
          authorId: createdUsers[2].id,
          postId: createdPosts[0].id,
        },
        {
          content: "Can you explain more about error handling?",
          authorId: createdUsers[0].id,
          postId: createdPosts[2].id,
        },
        {
          content: "This changed how I think about caching.",
          authorId: createdUsers[1].id,
          postId: createdPosts[2].id,
        },
        {
          content: "TypeScript is definitely worth learning!",
          authorId: createdUsers[2].id,
          postId: createdPosts[4].id,
        },
      ])
      .returning();

    console.log(`✅ Created ${createdComments.length} comments`);
    console.log("🎉 Database seeding completed successfully!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seedDatabase();
