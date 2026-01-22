import { gql } from "graphql-tag";

export const typeDefs = gql`
  # Pagination metadata
  type PaginationInfo {
    total: Int!
    limit: Int!
    offset: Int!
    hasMore: Boolean!
  }

  # Paginated users response
  type PaginatedUsers {
    users: [User!]!
    total: Int!
  }

  # Paginated posts response
  type PaginatedPosts {
    data: [Post!]!
    pagination: PaginationInfo!
  }

  # Paginated comments response
  type PaginatedComments {
    data: [Comment!]!
    pagination: PaginationInfo!
  }

  # User type
  type User {
    id: ID!
    name: String!
    email: String!
    createdAt: String!
    updatedAt: String!
    posts: [Post!]!
    comments: [Comment!]!
  }

  # Post type
  type Post {
    id: Int!
    title: String!
    content: String!
    author: User!
    authorId: ID!
    views: Int!
    likes: Int!
    comments: [Comment!]!
    createdAt: String!
    updatedAt: String!
  }

  # Comment type
  type Comment {
    id: Int!
    content: String!
    author: User!
    authorId: Int!
    post: Post!
    postId: Int!
    createdAt: String!
    updatedAt: String!
  }

  # Query type
  type Query {
    # User queries
    user(id: ID!): User
    users(limit: Int = 10, offset: Int = 0): PaginatedUsers!
    userCount: Int!

    # Post queries
    post(id: Int!): Post
    posts(limit: Int = 10, offset: Int = 0): PaginatedPosts!
    postsByAuthor(authorId: ID!, limit: Int = 10, offset: Int = 0): PaginatedPosts!
    postCount: Int!

    # Comment queries
    commentsByPost(postId: Int!, limit: Int = 10, offset: Int = 0): PaginatedComments!
    comments(limit: Int = 10, offset: Int = 0): PaginatedComments!
    commentCount: Int!

    # Health check
    health: String!
  }

  # Mutation type
  type Mutation {
    # User mutations
    createUser(name: String!, email: String!, password: String!): User!
    updateUser(id: ID!, name: String, email: String): User
    deleteUser(id: ID!): Boolean!

    # Post mutations
    createPost(title: String!, content: String!, authorId: ID!): Post!
    updatePost(id: Int!, title: String, content: String): Post
    deletePost(id: Int!): Boolean!
    incrementPostViews(id: Int!): Post
    likePost(id: Int!): Post

    # Comment mutations
    createComment(content: String!, authorId: ID!, postId: Int!): Comment!
    updateComment(id: Int!, content: String!): Comment
    deleteComment(id: Int!): Boolean!
  }

  # Subscription type
  type Subscription {
    postCreated: Post!
    commentAdded(postId: Int!): Comment!
  }
`;
