import { db } from "../db/index";
import { users, posts, comments } from "../db/schema";
import { cacheGet, cacheSet, cacheDel } from "../utils/redis";
import { eq } from "drizzle-orm";

export const resolvers = {
  Query: {
    // User queries
    async user(_: any, { id }: { id: number }) {
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

    async users() {
      const cacheKey = "all:users";
      const cached = await cacheGet(cacheKey);
      if (cached) return cached;

      const allUsers = await db.select().from(users);

      await cacheSet(cacheKey, allUsers, 3600);
      return allUsers;
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

    async posts() {
      const cacheKey = "all:posts";
      const cached = await cacheGet(cacheKey);
      if (cached) return cached;

      const allPosts = await db.select().from(posts);

      await cacheSet(cacheKey, allPosts, 3600);
      return allPosts;
    },

    async postsByAuthor(_: any, { authorId }: { authorId: number }) {
      const cacheKey = `author:${authorId}:posts`;
      const cached = await cacheGet(cacheKey);
      if (cached) return cached;

      const authorPosts = await db.select().from(posts).where(eq(posts.authorId, authorId));

      await cacheSet(cacheKey, authorPosts, 3600);
      return authorPosts;
    },

    // Comment queries
    async commentsByPost(_: any, { postId }: { postId: number }) {
      const cacheKey = `post:${postId}:comments`;
      const cached = await cacheGet(cacheKey);
      if (cached) return cached;

      const postComments = await db.select().from(comments).where(eq(comments.postId, postId));

      await cacheSet(cacheKey, postComments, 3600);
      return postComments;
    },

    async comments() {
      const cacheKey = "all:comments";
      const cached = await cacheGet(cacheKey);
      if (cached) return cached;

      const allComments = await db.select().from(comments);

      await cacheSet(cacheKey, allComments, 3600);
      return allComments;
    },

    health: () => "Server is running!",
  },

  Mutation: {
    // User mutations
    async createUser(
      _: any,
      { name, email, password }: { name: string; email: string; password: string }
    ) {
      const newUser = await db.insert(users).values({ name, email, password }).returning();

      // Invalidate cache
      await cacheDel("all:users");

      return newUser[0];
    },

    async updateUser(_: any, { id, name, email }: { id: number; name?: string; email?: string }) {
      const updateData: any = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;

      const updated = await db.update(users).set(updateData).where(eq(users.id, id)).returning();

      // Invalidate cache
      await cacheDel(`user:${id}`);
      await cacheDel("all:users");

      return updated[0];
    },

    async deleteUser(_: any, { id }: { id: number }) {
      await db.delete(users).where(eq(users.id, id));

      // Invalidate cache
      await cacheDel(`user:${id}`);
      await cacheDel("all:users");

      return true;
    },

    // Post mutations
    async createPost(
      _: any,
      { title, content, authorId }: { title: string; content: string; authorId: number }
    ) {
      const newPost = await db.insert(posts).values({ title, content, authorId }).returning();

      // Invalidate cache
      await cacheDel("all:posts");
      await cacheDel(`author:${authorId}:posts`);

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

      // Invalidate cache
      await cacheDel(`post:${id}`);
      await cacheDel("all:posts");

      return updated[0];
    },

    async deletePost(_: any, { id }: { id: number }) {
      await db.delete(posts).where(eq(posts.id, id));

      // Invalidate cache
      await cacheDel(`post:${id}`);
      await cacheDel("all:posts");

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
      { content, authorId, postId }: { content: string; authorId: number; postId: number }
    ) {
      const newComment = await db
        .insert(comments)
        .values({ content, authorId, postId })
        .returning();

      // Invalidate cache
      await cacheDel(`post:${postId}:comments`);
      await cacheDel("all:comments");

      return newComment[0];
    },

    async updateComment(_: any, { id, content }: { id: number; content: string }) {
      const updated = await db
        .update(comments)
        .set({ content })
        .where(eq(comments.id, id))
        .returning();

      // Invalidate cache
      await cacheDel("all:comments");

      return updated[0];
    },

    async deleteComment(_: any, { id }: { id: number }) {
      await db.delete(comments).where(eq(comments.id, id));

      // Invalidate cache
      await cacheDel("all:comments");

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
