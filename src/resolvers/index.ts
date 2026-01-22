import { db } from "../db/index.js";
import { users, posts, comments } from "../db/schema.js";
import { cacheGet, cacheSet, cacheDel } from "../utils/redis.js";
import { eq, sql } from "drizzle-orm";
type PaginatedUsersCache = {
  users: any[]; // or User[]
  total: number;
};
export const resolvers = {
  Query: {
    // User queries
    async user(_: any, { id }: { id: string }) {
      const cacheKey = `user:${id}`;
      const cached = await cacheGet(cacheKey);
      if (cached) return cached;

      const user = await db.select().from(users).where(eq(users.id, id)).limit(1);

      if (user.length > 0) {
        await cacheSet(cacheKey, user[0], 3600);
        return user[0];
      }

      return null;
    },

    async users(_: any, { limit = 10, offset = 0 }: { limit?: number; offset?: number }) {
      const cacheKey = `users:paginated:${limit}:${offset}`;
      const cachedCountKey = `users:count`;

      const cached = (await cacheGet(cacheKey)) as PaginatedUsersCache | null;

      if (cached && Array.isArray(cached.users)) {
        console.log(`✅ USERS PAGE (${offset}-${offset + limit}) FROM CACHE`);

        return {
          users: cached.users ?? [],
          total: Number(cached.total) || 0,
        };
      }

      console.log(`🟡 USERS PAGE (${offset}-${offset + limit}) FROM DATABASE`);

      // 2️⃣ Total count (whole DB)
      let totalCount = Number(await cacheGet(cachedCountKey));

      if (!totalCount) {
        const countResult = await db.select({ count: sql<number>`count(*)` }).from(users);

        totalCount = Number(countResult[0]?.count || 0);
        await cacheSet(cachedCountKey, totalCount, 3600);
      }

      // 3️⃣ Paginated users (always an array)
      const allUsers = await db.select().from(users).limit(limit).offset(offset);

      const response = {
        users: allUsers ?? [], // 👈 NEVER null
        total: totalCount ?? 0, // 👈 NEVER null
      };

      await cacheSet(cacheKey, response, 3600);
      return response;
    },

    async userCount() {
      const cachedCount = "users:count";
      const cached = await cacheGet(cachedCount);

      if (cached) {
        console.log("✅ USER COUNT FROM CACHE");
        return cached;
      }

      console.log("🟡 USER COUNT FROM DATABASE");
      const result = await db.select().from(users);
      const count = result.length;

      await cacheSet(cachedCount, count, 3600);
      return count;
    },

    // Post queries
    async post(_: any, { id }: { id: number }) {
      const cacheKey = `post:${id}`;
      const cached = await cacheGet(cacheKey);
      if (cached) return cached;

      const post = await db.select().from(posts).where(eq(posts.id, id)).limit(1);

      if (post.length > 0) {
        await cacheSet(cacheKey, post[0], 3600);
        return post[0];
      }

      return null;
    },

    async posts(_: any, { limit = 10, offset = 0 }: { limit?: number; offset?: number }) {
      const cacheKey = `posts:paginated:${limit}:${offset}`;
      const cachedCount = `posts:count`;

      const cached = await cacheGet(cacheKey);
      if (cached) {
        console.log(`✅ POSTS PAGE (${offset}-${offset + limit}) FROM CACHE`);
        return cached;
      }

      console.log(`🟡 POSTS PAGE (${offset}-${offset + limit}) FROM DATABASE`);

      let totalCount = (await cacheGet(cachedCount)) as number;
      if (!totalCount) {
        const result = await db.select().from(posts);
        totalCount = result.length;
        await cacheSet(cachedCount, totalCount, 3600);
      }

      const allPosts = await db.select().from(posts).limit(limit).offset(offset);

      const response = {
        data: allPosts,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      };

      await cacheSet(cacheKey, response, 3600);
      return response;
    },

    async postCount() {
      const cachedCount = "posts:count";
      const cached = await cacheGet(cachedCount);

      if (cached) {
        console.log("✅ POST COUNT FROM CACHE");
        return cached;
      }

      console.log("🟡 POST COUNT FROM DATABASE");
      const result = await db.select().from(posts);
      const count = result.length;

      await cacheSet(cachedCount, count, 3600);
      return count;
    },

    async postsByAuthor(
      _: any,
      { authorId, limit = 10, offset = 0 }: { authorId: string; limit?: number; offset?: number }
    ) {
      const cacheKey = `author:${authorId}:posts:${limit}:${offset}`;
      const countKey = `author:${authorId}:posts:count`;

      const cached = await cacheGet(cacheKey);
      if (cached) {
        console.log(`✅ POSTS BY AUTHOR (${offset}-${offset + limit}) FROM CACHE`);
        return cached;
      }

      console.log(`🟡 POSTS BY AUTHOR (${offset}-${offset + limit}) FROM DATABASE`);

      let totalCount = (await cacheGet(countKey)) as number;
      if (!totalCount) {
        const result = await db.select().from(posts).where(eq(posts.authorId, authorId));
        totalCount = result.length;
        await cacheSet(countKey, totalCount, 3600);
      }

      const authorPosts = await db
        .select()
        .from(posts)
        .where(eq(posts.authorId, authorId))
        .limit(limit)
        .offset(offset);

      const response = {
        data: authorPosts,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      };

      await cacheSet(cacheKey, response, 3600);
      return response;
    },

    // Comment queries
    async commentsByPost(
      _: any,
      { postId, limit = 10, offset = 0 }: { postId: number; limit?: number; offset?: number }
    ) {
      const cacheKey = `post:${postId}:comments:${limit}:${offset}`;
      const countKey = `post:${postId}:comments:count`;

      const cached = await cacheGet(cacheKey);
      if (cached) {
        console.log(`✅ COMMENTS FOR POST (${offset}-${offset + limit}) FROM CACHE`);
        return cached;
      }

      console.log(`🟡 COMMENTS FOR POST (${offset}-${offset + limit}) FROM DATABASE`);

      let totalCount = (await cacheGet(countKey)) as number;
      if (!totalCount) {
        const result = await db.select().from(comments).where(eq(comments.postId, postId));
        totalCount = result.length;
        await cacheSet(countKey, totalCount, 3600);
      }

      const postComments = await db
        .select()
        .from(comments)
        .where(eq(comments.postId, postId))
        .limit(limit)
        .offset(offset);

      const response = {
        data: postComments,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      };

      await cacheSet(cacheKey, response, 3600);
      return response;
    },

    async comments(_: any, { limit = 10, offset = 0 }: { limit?: number; offset?: number }) {
      const cacheKey = `comments:paginated:${limit}:${offset}`;
      const cachedCount = `comments:count`;

      const cached = await cacheGet(cacheKey);
      if (cached) {
        console.log(`✅ COMMENTS PAGE (${offset}-${offset + limit}) FROM CACHE`);
        return cached;
      }

      console.log(`🟡 COMMENTS PAGE (${offset}-${offset + limit}) FROM DATABASE`);

      let totalCount = (await cacheGet(cachedCount)) as number;
      if (!totalCount) {
        const result = await db.select().from(comments);
        totalCount = result.length;
        await cacheSet(cachedCount, totalCount, 3600);
      }

      const allComments = await db.select().from(comments).limit(limit).offset(offset);

      const response = {
        data: allComments,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      };

      await cacheSet(cacheKey, response, 3600);
      return response;
    },

    async commentCount() {
      const cachedCount = "comments:count";
      const cached = await cacheGet(cachedCount);

      if (cached) {
        console.log("✅ COMMENT COUNT FROM CACHE");
        return cached;
      }

      console.log("🟡 COMMENT COUNT FROM DATABASE");
      const result = await db.select().from(comments);
      const count = result.length;

      await cacheSet(cachedCount, count, 3600);
      return count;
    },

    health: () => "Server is running!",
  },

  Mutation: {
    // User mutations
    async createUser(
      _: any,
      { name, email, password }: { name: string; email: string; password: string }
    ) {
      try {
        const newUser = await db.insert(users).values({ name, email, password }).returning();

        // Invalidate all user-related caches
        await cacheDel("users:count");
        // Clear all user pagination caches (simplified - in production use Redis pattern matching)
        for (let i = 0; i < 10; i++) {
          for (let j = 0; j < 100; j += 10) {
            await cacheDel(`users:paginated:${i}:${j}`);
          }
        }

        return newUser[0];
      } catch (error: any) {
        console.error("Error creating user:", error);

        // Check for unique constraint violation
        if (error.code === "23505" || error.message?.includes("unique")) {
          throw new Error(`A user with email "${email}" already exists`);
        }

        throw new Error(`Failed to create user: ${error.message}`);
      }
    },

    async updateUser(_: any, { id, name, email }: { id: string; name?: string; email?: string }) {
      const updateData: any = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;

      const updated = await db.update(users).set(updateData).where(eq(users.id, id)).returning();

      // Invalidate caches
      await cacheDel(`user:${id}`);
      await cacheDel("users:count");
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 100; j += 10) {
          await cacheDel(`users:paginated:${i}:${j}`);
        }
      }

      return updated[0];
    },

    async deleteUser(_: any, { id }: { id: string }) {
      await db.delete(users).where(eq(users.id, id));

      // Invalidate caches
      await cacheDel(`user:${id}`);
      await cacheDel("users:count");
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 100; j += 10) {
          await cacheDel(`users:paginated:${i}:${j}`);
        }
      }

      return true;
    },

    // Post mutations
    async createPost(
      _: any,
      { title, content, authorId }: { title: string; content: string; authorId: string }
    ) {
      const newPost = await db.insert(posts).values({ title, content, authorId }).returning();
      // connsole.log("check this new post:", newPost);
      console.log("New Post Created:", newPost);
      console.log(`Title: ${title}, Author ID: ${authorId}`);

      // Invalidate caches
      await cacheDel("posts:count");
      await cacheDel(`author:${authorId}:posts:count`);
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 100; j += 10) {
          await cacheDel(`posts:paginated:${i}:${j}`);
          await cacheDel(`author:${authorId}:posts:${i}:${j}`);
        }
      }

      return newPost[0];
    },

    async updatePost(
      _: any,
      { id, title, content }: { id: number; title?: string; content?: string }
    ) {
      const updateData: any = {};
      if (title) updateData.title = title;
      if (content) updateData.content = content;

      const updated = await db.update(posts).set(updateData).where(eq(posts.id, id)).returning();

      // Invalidate caches
      await cacheDel(`post:${id}`);
      await cacheDel("posts:count");
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 100; j += 10) {
          await cacheDel(`posts:paginated:${i}:${j}`);
        }
      }

      return updated[0];
    },

    async deletePost(_: any, { id }: { id: number }) {
      await db.delete(posts).where(eq(posts.id, id));

      // Invalidate caches
      await cacheDel(`post:${id}`);
      await cacheDel("posts:count");
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 100; j += 10) {
          await cacheDel(`posts:paginated:${i}:${j}`);
        }
      }

      return true;
    },

    async incrementPostViews(_: any, { id }: { id: number }) {
      const post = await db.query.posts.findFirst({
        where: eq(posts.id, id),
      });

      if (!post) return null;

      const updated = await db
        .update(posts)
        .set({ views: (post.views || 0) + 1 })
        .where(eq(posts.id, id))
        .returning();

      // Invalidate cache
      await cacheDel(`post:${id}`);

      return updated[0];
    },

    async likePost(_: any, { id }: { id: number }) {
      const post = await db.query.posts.findFirst({
        where: eq(posts.id, id),
      });

      if (!post) return null;

      const updated = await db
        .update(posts)
        .set({ likes: (post.likes || 0) + 1 })
        .where(eq(posts.id, id))
        .returning();

      // Invalidate cache
      await cacheDel(`post:${id}`);

      return updated[0];
    },

    // Comment mutations
    async createComment(
      _: any,
      { content, authorId, postId }: { content: string; authorId: string; postId: number }
    ) {
      const newComment = await db
        .insert(comments)
        .values({ content, authorId, postId })
        .returning();

      // Invalidate caches
      await cacheDel(`post:${postId}:comments:count`);
      await cacheDel("comments:count");
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 100; j += 10) {
          await cacheDel(`post:${postId}:comments:${i}:${j}`);
          await cacheDel(`comments:paginated:${i}:${j}`);
        }
      }

      return newComment[0];
    },

    async updateComment(_: any, { id, content }: { id: number; content: string }) {
      const updated = await db
        .update(comments)
        .set({ content })
        .where(eq(comments.id, id))
        .returning();

      // Invalidate caches
      await cacheDel("comments:count");
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 100; j += 10) {
          await cacheDel(`comments:paginated:${i}:${j}`);
        }
      }

      return updated[0];
    },

    async deleteComment(_: any, { id }: { id: number }) {
      await db.delete(comments).where(eq(comments.id, id));

      // Invalidate caches
      await cacheDel("comments:count");
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 100; j += 10) {
          await cacheDel(`comments:paginated:${i}:${j}`);
        }
      }

      return true;
    },
  },

  User: {
    posts: async (parent: any) => {
      return await db.query.posts.findMany({
        where: eq(posts.authorId, parent.id),
      });
    },
    comments: async (parent: any) => {
      return await db.query.comments.findMany({
        where: eq(comments.authorId, parent.id),
      });
    },
  },

  Post: {
    author: async (parent: any) => {
      return await db.query.users.findFirst({
        where: eq(users.id, parent.authorId),
      });
    },
    comments: async (parent: any) => {
      return await db.query.comments.findMany({
        where: eq(comments.postId, parent.id),
      });
    },
  },

  Comment: {
    author: async (parent: any) => {
      return await db.query.users.findFirst({
        where: eq(users.id, parent.authorId),
      });
    },
    post: async (parent: any) => {
      return await db.query.posts.findFirst({
        where: eq(posts.id, parent.postId),
      });
    },
  },
};
